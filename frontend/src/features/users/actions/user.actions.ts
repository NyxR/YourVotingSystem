'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { authorize, can, runAction, type ActionResult } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSiteUrl } from '@/lib/site-url';
import { getI18n } from '@/i18n/server';
import { translateValidation } from '@/i18n/validation';
import type { Messages } from '@/i18n/messages/en';
import { toE164 } from '@/lib/phone';
import { normalizeResponsibilities } from '@/lib/responsibilities';
import { isManager, normalizeRole } from '@/lib/roles';
import { listAuthUsers } from '../queries';
import {
  inviteUserSchema,
  profileSchema,
  updateUserSchema,
  type TInviteUser,
  type TProfile,
  type TUpdateUser,
} from '../schemas/user.schema';

/** A failed result with a translated error message. */
async function fail(key: keyof Messages['errors']): Promise<ActionResult> {
  const { t } = await getI18n();
  return { success: false, message: t.errors[key] };
}

/** A failed result for a schema validation error. */
async function invalid(message: string | undefined): Promise<ActionResult> {
  const { t } = await getI18n();
  return { success: false, message: translateValidation(t, message) };
}

/** Empty -> null; otherwise the validated number in E.164. */
const storedPhone = (phone: string) => (phone ? toE164(phone) : null);

const setPasswordRedirect = async () => `${await getSiteUrl()}/auth/confirm?next=/set-password`;

/**
 * Sends a Supabase invite email and returns the auth user id. If the email
 * already has a Supabase account (e.g. created in the dashboard), that
 * account is reused and a password-reset email is sent instead.
 */
async function sendInvite(email: string, username: string): Promise<string> {
  const admin = createAdminClient();
  const redirectTo = await setPasswordRedirect();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { username },
  });
  if (!error) return data.user.id;

  if (error.code === 'email_exists' || /already been registered/i.test(error.message)) {
    const existing = (await listAuthUsers()).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!existing) throw error;
    await sendPasswordEmail(email);
    return existing.id;
  }
  throw error;
}

async function sendPasswordEmail(email: string) {
  const { error } = await createAdminClient().auth.resetPasswordForEmail(email, {
    redirectTo: await setPasswordRedirect(),
  });
  if (error) throw error;
}

export async function inviteUser(values: TInviteUser): Promise<ActionResult> {
  return runAction(async () => {
    await authorize(can.manageUsers);
    const parsed = inviteUserSchema.safeParse(values);
    if (!parsed.success) {
      return invalid(parsed.error.issues[0]?.message);
    }
    const { email, username, role, memberType } = parsed.data;
    const phone = storedPhone(parsed.data.phone);
    const responsibilities = normalizeResponsibilities(parsed.data.responsibilities);

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing?.authId) {
      return fail('userExists');
    }

    const authId = await sendInvite(email, username);
    try {
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { authId, username, role, memberType, phone, responsibilities },
        });
      } else {
        await prisma.user.create({
          data: { authId, email, username, role, memberType, phone, responsibilities },
        });
      }
    } catch (e) {
      // Don't leave an orphaned login behind.
      await createAdminClient().auth.admin.deleteUser(authId);
      throw e;
    }
    revalidatePath('/main/users');
  }, 'userInvite');
}

/** Re-sends the invite (never signed in) or a password-reset email. */
export async function resendAccessEmail(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    await authorize(can.manageUsers);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return fail('userNotFound');

    if (!user.authId) {
      const authId = await sendInvite(user.email, user.username);
      await prisma.user.update({ where: { id: user.id }, data: { authId } });
    } else {
      await sendPasswordEmail(user.email);
    }
    revalidatePath('/main/users');
  }, 'userEmail');
}

/**
 * Lets any signed-in user update their own contact number. Responsibilities
 * are deliberately not accepted here: they grant forum access (Diakona/Birao),
 * so only admins change them (updateUser).
 */
export async function updateMyProfile(values: TProfile): Promise<ActionResult> {
  return runAction(async () => {
    const me = await authorize();
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    await prisma.user.update({
      where: { id: me.id },
      data: { phone: storedPhone(parsed.data.phone) },
    });
    revalidatePath('/main', 'layout');
  }, 'userUpdate');
}

/** People other than `excludeId` who can still manage users. */
async function countOtherManagers(excludeId: string) {
  return prisma.user.count({
    where: { role: { in: ['admin', 'treasurer'] }, id: { not: excludeId } },
  });
}

export async function updateUser(userId: string, values: TUpdateUser): Promise<ActionResult> {
  return runAction(async () => {
    await authorize(can.manageUsers);
    const parsed = updateUserSchema.safeParse(values);
    if (!parsed.success) {
      return invalid(parsed.error.issues[0]?.message);
    }
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return fail('userNotFound');

    if (
      isManager(normalizeRole(target.role)) &&
      !isManager(parsed.data.role) &&
      (await countOtherManagers(userId)) === 0
    ) {
      return fail('lastAdmin');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...parsed.data,
        phone: storedPhone(parsed.data.phone),
        responsibilities: normalizeResponsibilities(parsed.data.responsibilities),
      },
    });
    revalidatePath('/main', 'layout');
  }, 'userUpdate');
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await authorize(can.manageUsers);
    if (me.id === userId) {
      return fail('deleteSelf');
    }
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return fail('userNotFound');
    if (isManager(normalizeRole(target.role)) && (await countOtherManagers(userId)) === 0) {
      return fail('lastAdmin');
    }

    if (target.authId) {
      const { error } = await createAdminClient().auth.admin.deleteUser(target.authId);
      // Already gone from Supabase is fine; anything else should stop us.
      if (error && error.status !== 404) throw error;
    }
    // Their transactions stay; "recorded by" becomes empty (FK SET NULL).
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/main/users');
  }, 'userDelete');
}
