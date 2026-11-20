// Server-only read helpers for the forum. Every query is filtered by what
// the given user may see (category visibility), so pages can't leak topics.

import prisma from '@/lib/prisma';
import type { CurrentUser } from '@/lib/auth';
import { canEditPost, visibleTo } from './access';
import { toForumColor } from './colors';
import type { CommentItem, ForumCategoryItem, Person, TopicDetail, TopicListItem } from './schemas';
import { avatarUrl } from '@/lib/avatar';

type Viewer = Pick<CurrentUser, 'id' | 'role' | 'responsibilities'>;

export const TOPICS_PER_PAGE = 25;

const person = (u: { id: string; username: string; avatarPath: string | null } | null): Person =>
  u ? { id: u.id, name: u.username, avatarUrl: avatarUrl(u.avatarPath) } : null;

const personSelect = { id: true, username: true, avatarPath: true } as const;

const categorySelect = {
  id: true,
  name: true,
  color: true,
  visibility: true,
} as const;

function toCategoryRef(c: {
  id: string;
  name: string;
  color: string;
  visibility: ForumCategoryItem['visibility'];
}) {
  return {
    id: c.id,
    name: c.name,
    color: toForumColor(c.color),
    visibility: c.visibility,
  };
}

/** Categories this user can see, in display order, with topic counts. */
export async function getForumCategories(user: Viewer): Promise<ForumCategoryItem[]> {
  const rows = await prisma.forumCategory.findMany({
    where: { visibility: { in: visibleTo(user) } },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { topics: true } } },
  });
  return rows.map((c) => ({
    ...toCategoryRef(c),
    description: c.description,
    topicCount: c._count.topics,
  }));
}

/** Comments by others since this user's last visit, per topic. */
async function newCommentCounts(userId: string, topicIds: string[]) {
  if (topicIds.length === 0) return new Map<string, number>();
  const rows = await prisma.$queryRaw<{ topicId: string; n: number }[]>`
    SELECT m."topicId", COUNT(*)::int AS n
    FROM "ForumComment" m
    JOIN "ForumRead" r ON r."topicId" = m."topicId" AND r."userId" = ${userId}
    WHERE m."topicId" = ANY(${topicIds})
      AND m."createdAt" > r."lastReadAt"
      AND m."authorId" IS DISTINCT FROM ${userId}
    GROUP BY m."topicId"`;
  return new Map(rows.map((r) => [r.topicId, r.n]));
}

/**
 * One page of topics (pinned first, then most recent activity), optionally
 * within one category. Returns null for `categoryId` the user can't see.
 */
export async function getTopics(
  user: Viewer,
  { categoryId, page }: { categoryId?: string; page: number },
): Promise<{ topics: TopicListItem[]; total: number } | null> {
  const visibilities = visibleTo(user);
  if (categoryId) {
    const category = await prisma.forumCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category || !visibilities.includes(category.visibility)) return null;
  }
  const where = {
    category: { visibility: { in: visibilities } },
    ...(categoryId ? { categoryId } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.forumTopic.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { lastActivityAt: 'desc' }],
      skip: (page - 1) * TOPICS_PER_PAGE,
      take: TOPICS_PER_PAGE,
      include: {
        category: { select: categorySelect },
        author: { select: personSelect },
        reads: { where: { userId: user.id }, select: { lastReadAt: true } },
        _count: { select: { likes: true } },
      },
    }),
    prisma.forumTopic.count({ where }),
  ]);

  const counts = await newCommentCounts(
    user.id,
    rows.filter((t) => t.reads.length > 0).map((t) => t.id),
  );

  return {
    total,
    topics: rows.map((t) => ({
      id: t.id,
      title: t.title,
      category: toCategoryRef(t.category),
      author: person(t.author),
      pinned: t.pinned,
      locked: t.locked,
      commentCount: t.commentCount,
      likeCount: t._count.likes,
      createdAt: t.createdAt.toISOString(),
      lastActivityAt: t.lastActivityAt.toISOString(),
      isNew: t.reads.length === 0 && t.authorId !== user.id,
      newComments: counts.get(t.id) ?? 0,
    })),
  };
}

/** Number of visible topics with something unread (sidebar badge). */
export async function getUnreadTopicCount(user: Viewer): Promise<number> {
  const visibilities: string[] = visibleTo(user);
  const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n
    FROM "ForumTopic" t
    JOIN "ForumCategory" c ON c."id" = t."categoryId"
    LEFT JOIN "ForumRead" r ON r."topicId" = t."id" AND r."userId" = ${user.id}
    WHERE c."visibility"::text = ANY(${visibilities})
      AND (
        (r."topicId" IS NULL AND t."authorId" IS DISTINCT FROM ${user.id})
        OR EXISTS (
          SELECT 1 FROM "ForumComment" m
          WHERE m."topicId" = t."id"
            AND m."createdAt" > r."lastReadAt"
            AND m."authorId" IS DISTINCT FROM ${user.id}
        )
      )`;
  return n;
}

/** A topic with its comments, or null when missing or not visible. */
export async function getTopic(user: Viewer, id: string): Promise<TopicDetail | null> {
  const t = await prisma.forumTopic.findUnique({
    where: { id },
    include: {
      category: { select: categorySelect },
      author: { select: personSelect },
      reads: { where: { userId: user.id }, select: { lastReadAt: true } },
      likes: { where: { userId: user.id }, select: { id: true } },
      _count: { select: { likes: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: personSelect },
          replyTo: {
            select: { id: true, author: { select: { username: true } } },
          },
          likes: { where: { userId: user.id }, select: { id: true } },
          _count: { select: { likes: true } },
        },
      },
    },
  });
  if (!t || !visibleTo(user).includes(t.category.visibility)) return null;

  const lastReadAt = t.reads[0]?.lastReadAt ?? null;
  const comments: CommentItem[] = t.comments.map((c) => ({
    id: c.id,
    body: c.body,
    author: person(c.author),
    createdAt: c.createdAt.toISOString(),
    editedAt: c.editedAt?.toISOString() ?? null,
    likeCount: c._count.likes,
    likedByMe: c.likes.length > 0,
    canEdit: canEditPost(user, c.authorId),
    replyTo: c.replyTo
      ? { id: c.replyTo.id, authorName: c.replyTo.author?.username ?? null }
      : null,
  }));
  const firstUnread = lastReadAt
    ? t.comments.find((c) => c.createdAt > lastReadAt && c.authorId !== user.id)
    : undefined;

  return {
    id: t.id,
    title: t.title,
    body: t.body,
    category: toCategoryRef(t.category),
    author: person(t.author),
    pinned: t.pinned,
    locked: t.locked,
    createdAt: t.createdAt.toISOString(),
    editedAt: t.editedAt?.toISOString() ?? null,
    likeCount: t._count.likes,
    likedByMe: t.likes.length > 0,
    canEdit: canEditPost(user, t.authorId),
    comments,
    firstUnreadId: firstUnread?.id ?? null,
  };
}

/** Every category with full details, for the admin management page. */
export async function getAllForumCategories(): Promise<ForumCategoryItem[]> {
  const rows = await prisma.forumCategory.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { topics: true } } },
  });
  return rows.map((c) => ({
    ...toCategoryRef(c),
    description: c.description,
    topicCount: c._count.topics,
  }));
}
