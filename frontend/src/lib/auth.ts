import { cache } from 'react';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { createSessionClient } from '@/lib/supabase/server';
import { normalizeRole, type Role } from '@/lib/roles';

export type CurrentUser = {
  id: string;
  authId: string;
  email: string;
  username: string;
  role: Role;
};

export const can = {
  manageUsers: (u: Pick<CurrentUser, 'role'>) => u.role === 'admin',
  editFinance: (u: Pick<CurrentUser, 'role'>) =>
    u.role === 'admin' || u.role === 'treasurer',
};

/**
 * The signed-in user's profile, or null. Verifies the session with Supabase
 * (not just the cookie). Memoised per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return findProfileForAuthUser(user);
});

/**
 * Maps a Supabase auth user to the app profile. A profile created before
 * Supabase Auth was wired in (no authId yet) is linked by email the first
 * time that person signs in.
 */
export async function findProfileForAuthUser(user: {
  id: string;
  email?: string;
}): Promise<CurrentUser | null> {
  let profile = await prisma.user.findUnique({ where: { authId: user.id } });

  if (!profile && user.email) {
    const byEmail = await prisma.user.findFirst({
      where: {
        email: { equals: user.email, mode: 'insensitive' },
        authId: null,
      },
    });
    if (byEmail) {
      profile = await prisma.user.update({
        where: { id: byEmail.id },
        data: { authId: user.id },
      });
    }
  }

  if (!profile) return null;

  return {
    id: profile.id,
    authId: user.id,
    email: profile.email,
    username: profile.username,
    role: normalizeRole(profile.role),
  };
}

/** For pages/layouts: the current user, or a redirect to the login page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    // A Supabase session without an app profile ends up here too; the
    // sign-out route clears it so the proxy doesn't bounce back from /login.
    redirect('/auth/signout?reason=no-access');
  }
  return user;
}

/** For pages: like requireUser, but sends users lacking `check` home. */
export async function requirePageAccess(
  check: (u: CurrentUser) => boolean,
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!check(user)) redirect('/main/finance');
  return user;
}

export class AuthError extends Error {}

/** For server actions: throws AuthError unless the user passes `check`. */
export async function authorize(
  check: (u: CurrentUser) => boolean = () => true,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('You are not signed in.');
  if (!check(user)) {
    throw new AuthError('You do not have permission to do this.');
  }
  return user;
}

export type ActionResult =
  | { success: true }
  | { success: false; message: string };

/** Runs a server-action body, turning thrown errors into a result object. */
export async function runAction(
  fn: () => Promise<ActionResult | void>,
  fallbackMessage: string,
): Promise<ActionResult> {
  try {
    return (await fn()) ?? { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, message: error.message };
    }
    console.error(fallbackMessage, error);
    return { success: false, message: fallbackMessage };
  }
}
