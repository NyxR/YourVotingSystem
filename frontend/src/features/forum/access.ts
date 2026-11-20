// Forum access rules. Shared by server and client code; the server always
// re-checks them (queries filter by visibility, actions authorize).

import { isManager, type Role } from '@/lib/roles';
import type { Responsibility } from '@/lib/responsibilities';

/** Mirrors the ForumVisibility enum in schema.prisma. */
export const FORUM_VISIBILITIES = ['EVERYONE', 'DIAKONA', 'BIRAO'] as const;
export type ForumVisibility = (typeof FORUM_VISIBILITIES)[number];

type ForumUser = { id: string; role: Role; responsibilities: Responsibility[] };

/**
 * The visibilities this person can see. Admins and treasurers see everything; Birao is the
 * higher level, so Birao also see Diakona topics (not the other way round).
 */
export function visibleTo(user: Pick<ForumUser, 'role' | 'responsibilities'>): ForumVisibility[] {
  if (isManager(user.role)) return [...FORUM_VISIBILITIES];
  const result: ForumVisibility[] = ['EVERYONE'];
  const birao = user.responsibilities.includes('BIRAO');
  if (birao || user.responsibilities.includes('DIAKONA')) result.push('DIAKONA');
  if (birao) result.push('BIRAO');
  return result;
}

export function canSee(
  user: Pick<ForumUser, 'role' | 'responsibilities'>,
  visibility: ForumVisibility,
): boolean {
  return visibleTo(user).includes(visibility);
}

/** Pin, lock, manage categories, and edit/delete anyone's posts. */
export const canModerate = (user: Pick<ForumUser, 'role'>) => isManager(user.role);

/** Authors edit/delete their own posts; admins and treasurers any post. */
export const canEditPost = (user: Pick<ForumUser, 'id' | 'role'>, authorId: string | null) =>
  canModerate(user) || (!!authorId && authorId === user.id);
