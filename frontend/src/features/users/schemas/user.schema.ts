import { z } from 'zod';
import { ROLES, type Role } from '@/lib/roles';
import type { ValidationKey } from '@/i18n/validation';

// Error messages are keys of t.validation, translated where they are shown.

export const inviteUserSchema = z.object({
  username: z.string().trim().min(1, 'nameRequired' satisfies ValidationKey).max(80, 'personNameTooLong' satisfies ValidationKey),
  email: z.email('emailInvalid' satisfies ValidationKey).trim().toLowerCase(),
  role: z.enum(ROLES),
});
export type TInviteUser = z.infer<typeof inviteUserSchema>;

export const updateUserSchema = z.object({
  username: z.string().trim().min(1, 'nameRequired' satisfies ValidationKey).max(80, 'personNameTooLong' satisfies ValidationKey),
  role: z.enum(ROLES),
});
export type TUpdateUser = z.infer<typeof updateUserSchema>;

/**
 * - not_invited: profile exists (e.g. from before Supabase Auth) but no login yet
 * - invited: invite sent, the person hasn't signed in yet
 * - active: has signed in at least once
 */
export type UserStatus = 'not_invited' | 'invited' | 'active';

export type UserRow = {
  id: string;
  username: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastSignInAt: string | null;
  createdAt: string;
};
