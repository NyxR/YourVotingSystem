import { z } from 'zod';
import type { ValidationKey } from '@/i18n/validation';
import { FORUM_COLORS, type ForumColor } from './colors';
import { FORUM_VISIBILITIES, type ForumVisibility } from './access';

const msg = (key: ValidationKey) => ({ message: key });

export const TITLE_MAX = 150;
export const BODY_MAX = 20_000;

const bodyField = z.string().trim().min(1, msg('postRequired')).max(BODY_MAX, msg('postTooLong'));

export const topicFormSchema = z.object({
  categoryId: z.string().min(1, msg('forumCategoryRequired')),
  title: z.string().trim().min(3, msg('titleRequired')).max(TITLE_MAX, msg('titleTooLong')),
  body: bodyField,
});
export type TopicFormValues = z.infer<typeof topicFormSchema>;

export const commentFormSchema = z.object({ body: bodyField });
export type CommentFormValues = z.infer<typeof commentFormSchema>;

export const forumCategorySchema = z.object({
  name: z.string().trim().min(1, msg('nameRequired')).max(60, msg('categoryNameTooLong')),
  description: z.string().trim().max(200, msg('forumDescriptionTooLong')),
  color: z.enum(FORUM_COLORS),
  visibility: z.enum(FORUM_VISIBILITIES),
});
export type ForumCategoryFormValues = z.infer<typeof forumCategorySchema>;

// ─── Images ────────────────────────────────────────────────────

export const IMAGE_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function validateImage(file: File): ValidationKey | null {
  if (!(file.type in IMAGE_MIME_TYPES)) return 'imageType';
  if (file.size > IMAGE_MAX_BYTES) return 'imageSize';
  return null;
}

/** Where an uploaded image is served (access-checked route). */
export const imageUrl = (id: string) => `/main/forum/images/${id}`;

const IMAGE_ID = /\/main\/forum\/images\/([0-9a-f-]{36})/g;

/** Ids of our uploaded images referenced in a Markdown body. */
export function extractImageIds(body: string): string[] {
  return [...new Set([...body.matchAll(IMAGE_ID)].map((m) => m[1]))];
}

// ─── Rows sent to the client ───────────────────────────────────

export type ForumCategoryItem = {
  id: string;
  name: string;
  description: string | null;
  color: ForumColor;
  visibility: ForumVisibility;
  topicCount: number;
};

export type Person = { id: string; name: string } | null;

export type TopicListItem = {
  id: string;
  title: string;
  category: Pick<ForumCategoryItem, 'id' | 'name' | 'color' | 'visibility'>;
  author: Person;
  pinned: boolean;
  locked: boolean;
  commentCount: number;
  likeCount: number;
  createdAt: string;
  lastActivityAt: string;
  /** Never opened by this user (and not theirs). */
  isNew: boolean;
  /** Comments by others since this user last opened it. */
  newComments: number;
};

export type Post = {
  id: string;
  body: string;
  author: Person;
  createdAt: string;
  editedAt: string | null;
  likeCount: number;
  likedByMe: boolean;
  canEdit: boolean;
};

export type CommentItem = Post & {
  replyTo: { id: string; authorName: string | null } | null;
};

export type TopicDetail = Post & {
  title: string;
  category: Pick<ForumCategoryItem, 'id' | 'name' | 'color' | 'visibility'>;
  pinned: boolean;
  locked: boolean;
  comments: CommentItem[];
  /** First comment by someone else since the previous visit, if any. */
  firstUnreadId: string | null;
};
