'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { authorize, can, runAction, type ActionResult } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSiteUrl } from '@/lib/site-url';
import { getI18n } from '@/i18n/server';
import { translateValidation } from '@/i18n/validation';
import type { Messages } from '@/i18n/messages/en';
import { listAuthUsers } from '../queries';
import {
  inviteUserSchema,
  updateUserSchema,
  type TInviteUser,
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

const setPasswordRedirect = async () =>
  `${await getSiteUrl()}/auth/confirm?next=/set-password`;

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
    const { email, username, role } = parsed.data;

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
          data: { authId, username, role },
        });
      } else {
        await prisma.user.create({ data: { authId, email, username, role } });
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

async function countOtherAdmins(excludeId: string) {
  return prisma.user.count({ where: { role: 'admin', id: { not: excludeId } } });
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

    if (target.role === 'admin' && parsed.data.role !== 'admin' && (await countOtherAdmins(userId)) === 0) {
      return fail('lastAdmin');
    }

    await prisma.user.update({ where: { id: userId }, data: parsed.data });
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
    if (target.role === 'admin' && (await countOtherAdmins(userId)) === 0) {
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
