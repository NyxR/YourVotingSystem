'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { authorize, can, runAction, type ActionResult } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSiteUrl } from '@/lib/site-url';
import { listAuthUsers } from '../queries';
import {
  inviteUserSchema,
  updateUserSchema,
  type TInviteUser,
  type TUpdateUser,
} from '../schemas/user.schema';

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
      return { success: false, message: parsed.error.issues[0].message };
    }
    const { email, username, role } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing?.authId) {
      return { success: false, message: 'A user with this email already exists.' };
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
  }, 'Failed to invite the user. Check that email sending is configured in Supabase.');
}

/** Re-sends the invite (never signed in) or a password-reset email. */
export async function resendAccessEmail(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    await authorize(can.manageUsers);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, message: 'User not found.' };

    if (!user.authId) {
      const authId = await sendInvite(user.email, user.username);
      await prisma.user.update({ where: { id: user.id }, data: { authId } });
    } else {
      await sendPasswordEmail(user.email);
    }
    revalidatePath('/main/users');
  }, 'Failed to send the email. Supabase may be rate-limiting; try again in a minute.');
}

async function countOtherAdmins(excludeId: string) {
  return prisma.user.count({ where: { role: 'admin', id: { not: excludeId } } });
}

export async function updateUser(userId: string, values: TUpdateUser): Promise<ActionResult> {
  return runAction(async () => {
    await authorize(can.manageUsers);
    const parsed = updateUserSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return { success: false, message: 'User not found.' };

    if (target.role === 'admin' && parsed.data.role !== 'admin' && (await countOtherAdmins(userId)) === 0) {
      return { success: false, message: 'There must always be at least one admin.' };
    }

    await prisma.user.update({ where: { id: userId }, data: parsed.data });
    revalidatePath('/main', 'layout');
  }, 'Failed to update the user.');
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await authorize(can.manageUsers);
    if (me.id === userId) {
      return { success: false, message: "You can't remove your own account." };
    }
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return { success: false, message: 'User not found.' };
    if (target.role === 'admin' && (await countOtherAdmins(userId)) === 0) {
      return { success: false, message: 'There must always be at least one admin.' };
    }

    if (target.authId) {
      const { error } = await createAdminClient().auth.admin.deleteUser(target.authId);
      // Already gone from Supabase is fine; anything else should stop us.
      if (error && error.status !== 404) throw error;
    }
    // Their transactions stay; "recorded by" becomes empty (FK SET NULL).
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/main/users');
  }, 'Failed to remove the user.');
}
