'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import {
  AuthError,
  authorize,
  getCurrentUser,
  runAction,
  type ActionResult,
  type CurrentUser,
} from '@/lib/auth';
import { createAdminClient, FORUM_BUCKET } from '@/lib/supabase/admin';
import { getI18n } from '@/i18n/server';
import { translateValidation } from '@/i18n/validation';
import type { Messages } from '@/i18n/messages/en';
import { canEditPost, canModerate, canSee } from '../access';
import { notifyForum } from '../notify';
import { getUnreadTopicCount } from '../queries';
import {
  commentFormSchema,
  extractImageIds,
  forumCategorySchema,
  IMAGE_MIME_TYPES,
  imageUrl,
  topicFormSchema,
  validateImage,
  type ForumCategoryFormValues,
  type TopicFormValues,
} from '../schemas';

type ErrorKey = keyof Messages['errors'];
type WithResult<T> = ({ success: true } & T) | { success: false; message: string };

/** Like runAction, for actions that return data on success. */
async function runWithResult<T>(
  fn: () => Promise<WithResult<T>>,
  fallback: ErrorKey,
): Promise<WithResult<T>> {
  try {
    return await fn();
  } catch (error) {
    const { t } = await getI18n();
    if (error instanceof AuthError) return { success: false, message: t.errors[error.key] };
    console.error(fallback, error);
    return { success: false, message: t.errors[fallback] };
  }
}

/** Thrown for a known, translatable failure. */
class ForumError extends Error {
  constructor(public readonly key: ErrorKey) {
    super(key);
  }
}

async function fail(
  error: unknown,
  fallback: ErrorKey,
): Promise<{ success: false; message: string }> {
  const { t } = await getI18n();
  if (error instanceof ForumError || error instanceof AuthError) {
    return { success: false, message: t.errors[error.key] };
  }
  throw error ?? new Error(fallback);
}

const refresh = () => revalidatePath('/main', 'layout');

/** A topic the user can see (with its category), else ForumError. */
async function visibleTopic(user: CurrentUser, id: string) {
  const topic = await prisma.forumTopic.findUnique({
    where: { id },
    include: { category: { select: { visibility: true } } },
  });
  if (!topic || !canSee(user, topic.category.visibility)) throw new ForumError('forumGone');
  return topic;
}

/** A category the user can see and post in, else ForumError. */
async function visibleCategory(user: CurrentUser, id: string) {
  const category = await prisma.forumCategory.findUnique({ where: { id } });
  if (!category || !canSee(user, category.visibility)) throw new ForumError('forumCategoryGone');
  return category;
}

/** Links images the user uploaded (and referenced in `body`) to the topic. */
async function attachImages(user: CurrentUser, topicId: string, body: string) {
  const ids = extractImageIds(body);
  if (ids.length === 0) return;
  await prisma.forumImage.updateMany({
    where: { id: { in: ids }, uploaderId: user.id, topicId: null },
    data: { topicId },
  });
}

async function markRead(userId: string, topicId: string) {
  const now = new Date();
  await prisma.forumRead.upsert({
    where: { userId_topicId: { userId, topicId } },
    create: { userId, topicId, lastReadAt: now },
    update: { lastReadAt: now },
  });
}

// ─── Topics ───────────────────────────────────────────────────

/**
 * Creates a topic, then redirects to the forum. The redirect happens here on
 * the server (not with router.push in the browser): the forum page comes back
 * in the same response, so the navigation can't be dropped by the router
 * refreshing for this action or by other forum activity arriving meanwhile.
 * On failure it returns the error message instead.
 */
export async function createTopic(values: TopicFormValues): Promise<WithResult<{ id: string }>> {
  const result = await saveNewTopic(values);
  // Outside any try/catch: redirect() works by throwing.
  if (result.success) redirect('/main/forum');
  return result;
}

async function saveNewTopic(values: TopicFormValues): Promise<WithResult<{ id: string }>> {
  return runWithResult<{ id: string }>(async () => {
    const user = await authorize();
    const { t } = await getI18n();
    const parsed = topicFormSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        message: translateValidation(t, parsed.error.issues[0]?.message),
      };
    }
    try {
      await visibleCategory(user, parsed.data.categoryId);
    } catch (error) {
      return fail(error, 'forumSave');
    }
    const topic = await prisma.forumTopic.create({
      data: { ...parsed.data, authorId: user.id },
    });
    await Promise.all([markRead(user.id, topic.id), attachImages(user, topic.id, topic.body)]);
    refresh();
    await notifyForum({});
    return { success: true, id: topic.id };
  }, 'forumSave');
}

export async function updateTopic(id: string, values: TopicFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize();
    const { t } = await getI18n();
    const parsed = topicFormSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        message: translateValidation(t, parsed.error.issues[0]?.message),
      };
    }
    try {
      const topic = await visibleTopic(user, id);
      if (!canEditPost(user, topic.authorId)) throw new AuthError('forbidden');
      await visibleCategory(user, parsed.data.categoryId);
    } catch (error) {
      return fail(error, 'forumSave');
    }
    await prisma.forumTopic.update({
      where: { id },
      data: { ...parsed.data, editedAt: new Date() },
    });
    await attachImages(user, id, parsed.data.body);
    refresh();
    await notifyForum({ topicId: id });
  }, 'forumSave');
}

/**
 * Deletes a topic, then redirects to the forum filtered to its category (on
 * the server, for the same reason as createTopic). Returns only on failure.
 */
export async function deleteTopic(id: string): Promise<ActionResult> {
  const deleted = { categoryId: '' };
  const result = await removeTopic(id, deleted);
  // Outside any try/catch: redirect() works by throwing.
  if (result.success) {
    redirect(
      deleted.categoryId
        ? `/main/forum?category=${encodeURIComponent(deleted.categoryId)}`
        : '/main/forum',
    );
  }
  return result;
}

async function removeTopic(id: string, deleted: { categoryId: string }): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize();
    try {
      const topic = await visibleTopic(user, id);
      if (!canEditPost(user, topic.authorId)) throw new AuthError('forbidden');
      deleted.categoryId = topic.categoryId;
    } catch (error) {
      return fail(error, 'forumDelete');
    }
    const images = await prisma.forumImage.findMany({
      where: { topicId: id },
      select: { path: true },
    });
    await prisma.forumTopic.delete({ where: { id } });
    if (images.length > 0) {
      await createAdminClient()
        .storage.from(FORUM_BUCKET)
        .remove(images.map((i) => i.path));
    }
    refresh();
    await notifyForum({ topicId: id, event: 'deleted' });
  }, 'forumDelete');
}

/** Admins: pin a topic to the top, or lock it against new comments. */
export async function setTopicFlag(
  id: string,
  flag: 'pinned' | 'locked',
  value: boolean,
): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(canModerate);
    try {
      await visibleTopic(user, id);
    } catch (error) {
      return fail(error, 'forumSave');
    }
    await prisma.forumTopic.update({ where: { id }, data: { [flag]: value } });
    refresh();
    await notifyForum({ topicId: id });
  }, 'forumSave');
}

/** Records that the user has now seen everything in the topic. */
export async function markTopicRead(topicId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize();
    try {
      await visibleTopic(user, topicId);
    } catch (error) {
      return fail(error, 'forumGone');
    }
    await markRead(user.id, topicId);
    refresh();
  }, 'forumGone');
}

// ─── Comments ─────────────────────────────────────────────────

export async function createComment(
  topicId: string,
  body: string,
  replyToId: string | null,
): Promise<WithResult<{ id: string }>> {
  return runWithResult<{ id: string }>(async () => {
    const user = await authorize();
    const { t } = await getI18n();
    const parsed = commentFormSchema.safeParse({ body });
    if (!parsed.success) {
      return {
        success: false,
        message: translateValidation(t, parsed.error.issues[0]?.message),
      };
    }
    try {
      const topic = await visibleTopic(user, topicId);
      if (topic.locked) throw new ForumError('forumLocked');
    } catch (error) {
      return fail(error, 'forumSave');
    }
    const replyTo = replyToId
      ? await prisma.forumComment.findFirst({
          where: { id: replyToId, topicId },
          select: { id: true },
        })
      : null;

    const now = new Date();
    const [comment] = await prisma.$transaction([
      prisma.forumComment.create({
        data: {
          topicId,
          body: parsed.data.body,
          authorId: user.id,
          replyToId: replyTo?.id ?? null,
        },
      }),
      prisma.forumTopic.update({
        where: { id: topicId },
        data: { commentCount: { increment: 1 }, lastActivityAt: now },
      }),
    ]);
    await Promise.all([markRead(user.id, topicId), attachImages(user, topicId, parsed.data.body)]);
    refresh();
    await notifyForum({ topicId });
    return { success: true, id: comment.id };
  }, 'forumSave');
}

async function editableComment(user: CurrentUser, id: string) {
  const comment = await prisma.forumComment.findUnique({ where: { id } });
  if (!comment) throw new ForumError('forumGone');
  await visibleTopic(user, comment.topicId);
  if (!canEditPost(user, comment.authorId)) throw new AuthError('forbidden');
  return comment;
}

export async function updateComment(id: string, body: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize();
    const { t } = await getI18n();
    const parsed = commentFormSchema.safeParse({ body });
    if (!parsed.success) {
      return {
        success: false,
        message: translateValidation(t, parsed.error.issues[0]?.message),
      };
    }
    let topicId: string;
    try {
      topicId = (await editableComment(user, id)).topicId;
    } catch (error) {
      return fail(error, 'forumSave');
    }
    await prisma.forumComment.update({
      where: { id },
      data: { body: parsed.data.body, editedAt: new Date() },
    });
    await attachImages(user, topicId, parsed.data.body);
    refresh();
    await notifyForum({ topicId, activity: false });
  }, 'forumSave');
}

export async function deleteComment(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize();
    let topicId: string;
    try {
      topicId = (await editableComment(user, id)).topicId;
    } catch (error) {
      return fail(error, 'forumDelete');
    }
    await prisma.$transaction([
      prisma.forumComment.delete({ where: { id } }),
      prisma.forumTopic.update({
        where: { id: topicId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);
    refresh();
    await notifyForum({ topicId });
  }, 'forumDelete');
}

// ─── Likes ────────────────────────────────────────────────────

/** Likes or unlikes a topic's opening post or a comment (not your own). */
export async function toggleLike(
  target: { topicId: string } | { commentId: string },
): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize();
    let topicId: string;
    try {
      let authorId: string | null;
      if ('topicId' in target) {
        topicId = target.topicId;
        authorId = (await visibleTopic(user, target.topicId)).authorId;
      } else {
        const comment = await prisma.forumComment.findUnique({
          where: { id: target.commentId },
        });
        if (!comment) throw new ForumError('forumGone');
        await visibleTopic(user, comment.topicId);
        topicId = comment.topicId;
        authorId = comment.authorId;
      }
      if (authorId === user.id) throw new AuthError('forbidden');
    } catch (error) {
      return fail(error, 'forumLike');
    }
    const where =
      'topicId' in target
        ? { userId: user.id, topicId: target.topicId }
        : { userId: user.id, commentId: target.commentId };
    const existing = await prisma.forumLike.findFirst({ where });
    if (existing) await prisma.forumLike.delete({ where: { id: existing.id } });
    else await prisma.forumLike.create({ data: { ...where } });
    refresh();
    // Topic likes show in the list; reply likes only on the topic page.
    await notifyForum({ topicId, activity: 'topicId' in target });
  }, 'forumLike');
}

// ─── Images ───────────────────────────────────────────────────

/**
 * Uploads an image for a post being written. Only the uploader can see it
 * until the post is saved; then it follows the topic's visibility.
 */
export async function uploadForumImage(formData: FormData): Promise<WithResult<{ url: string }>> {
  return runWithResult<{ url: string }>(async () => {
    const user = await authorize();
    const { t } = await getI18n();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, message: t.validation.imageType };
    }
    const problem = validateImage(file);
    if (problem) return { success: false, message: t.validation[problem] };

    const id = crypto.randomUUID();
    const path = `${new Date().getUTCFullYear()}/${id}.${IMAGE_MIME_TYPES[file.type]}`;
    const storage = createAdminClient().storage.from(FORUM_BUCKET);
    const { error } = await storage.upload(path, file, {
      contentType: file.type,
    });
    if (error) {
      console.error('Forum image upload failed', error);
      return { success: false, message: t.errors.forumImageUpload };
    }
    try {
      await prisma.forumImage.create({
        data: { id, path, uploaderId: user.id },
      });
    } catch (dbError) {
      await storage.remove([path]);
      throw dbError;
    }
    return { success: true, url: imageUrl(id) };
  }, 'forumImageUpload');
}

// ─── Categories (admins) ──────────────────────────────────────

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

export async function saveForumCategory(
  id: string | null,
  values: ForumCategoryFormValues,
): Promise<ActionResult> {
  return runAction(async () => {
    await authorize(canModerate);
    const { t } = await getI18n();
    const parsed = forumCategorySchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        message: translateValidation(t, parsed.error.issues[0]?.message),
      };
    }
    const data = {
      ...parsed.data,
      description: parsed.data.description || null,
    };
    try {
      if (id) {
        await prisma.forumCategory.update({ where: { id }, data });
      } else {
        const last = await prisma.forumCategory.aggregate({
          _max: { position: true },
        });
        await prisma.forumCategory.create({
          data: { ...data, position: (last._max.position ?? -1) + 1 },
        });
      }
    } catch (error) {
      if (isUniqueViolation(error))
        return { success: false, message: t.errors.forumCategoryDuplicate };
      throw error;
    }
    refresh();
    await notifyForum({});
  }, 'forumCategorySave');
}

export async function deleteForumCategory(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await authorize(canModerate);
    const topics = await prisma.forumTopic.count({ where: { categoryId: id } });
    if (topics > 0) {
      const { t } = await getI18n();
      return { success: false, message: t.errors.forumCategoryNotEmpty };
    }
    await prisma.forumCategory.delete({ where: { id } });
    refresh();
    await notifyForum({});
  }, 'forumCategoryDelete');
}

/** Swaps a category with its neighbour above (-1) or below (+1). */
export async function moveForumCategory(id: string, direction: -1 | 1): Promise<ActionResult> {
  return runAction(async () => {
    await authorize(canModerate);
    const all = await prisma.forumCategory.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: { id: true },
    });
    const from = all.findIndex((c) => c.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= all.length) return;
    [all[from], all[to]] = [all[to], all[from]];
    await prisma.$transaction(
      all.map((c, position) =>
        prisma.forumCategory.update({
          where: { id: c.id },
          data: { position },
        }),
      ),
    );
    refresh();
    await notifyForum({});
  }, 'forumCategorySave');
}

/** Unread topic count for the sidebar badge (refetched on live updates). */
export async function fetchUnreadTopicCount(): Promise<number> {
  const user = await getCurrentUser();
  return user ? getUnreadTopicCount(user) : 0;
}
