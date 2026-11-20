import { z } from 'zod';
import { canHoldRole, ROLES, type Role } from '@/lib/roles';
import { MEMBER_TYPES, type MemberType } from '@/lib/member-types';
import { isValidPhone } from '@/lib/phone';
import {
  RESPONSIBILITIES,
  responsibilityProblem,
  type Responsibility,
} from '@/lib/responsibilities';
import type { ValidationKey } from '@/i18n/validation';

// Error messages are keys of t.validation, translated where they are shown.

/** Optional contact number: empty, or a valid Canada/US number in any format. */
export const phoneField = z
  .string()
  .trim()
  .refine((v) => v === '' || isValidPhone(v), { message: 'phoneInvalid' satisfies ValidationKey });

export const responsibilitiesField = z.array(z.enum(RESPONSIBILITIES));

/**
 * Mpandray → Diakona → Birao, and Admin/Treasurer are reserved for Birao.
 */
const biraoForManagers = (
  v: { role: Role; memberType: MemberType; responsibilities: Responsibility[] },
  ctx: z.RefinementCtx,
) => {
  const problem = responsibilityProblem(v.memberType, v.responsibilities);
  if (problem) {
    ctx.addIssue({
      code: 'custom',
      path: ['responsibilities'],
      message: problem satisfies ValidationKey,
    });
  }
  if (!canHoldRole(v.role, v.responsibilities)) {
    ctx.addIssue({
      code: 'custom',
      path: ['role'],
      message: 'managerNeedsBirao' satisfies ValidationKey,
    });
  }
};

export const inviteUserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, 'nameRequired' satisfies ValidationKey)
      .max(80, 'personNameTooLong' satisfies ValidationKey),
    email: z
      .email('emailInvalid' satisfies ValidationKey)
      .trim()
      .toLowerCase(),
    role: z.enum(ROLES),
    memberType: z.enum(MEMBER_TYPES),
    phone: phoneField,
    responsibilities: responsibilitiesField,
  })
  .superRefine(biraoForManagers);
export type TInviteUser = z.infer<typeof inviteUserSchema>;

export const updateUserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, 'nameRequired' satisfies ValidationKey)
      .max(80, 'personNameTooLong' satisfies ValidationKey),
    role: z.enum(ROLES),
    memberType: z.enum(MEMBER_TYPES),
    phone: phoneField,
    responsibilities: responsibilitiesField,
  })
  .superRefine(biraoForManagers);
export type TUpdateUser = z.infer<typeof updateUserSchema>;

/** My profile: only the contact number (responsibilities are admin-only). */
export const profileSchema = z.object({
  phone: phoneField,
});
export type TProfile = z.infer<typeof profileSchema>;

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
  memberType: MemberType;
  /** E.164, or null when not provided. */
  phone: string | null;
  responsibilities: Responsibility[];
  status: UserStatus;
  lastSignInAt: string | null;
  createdAt: string;
};
