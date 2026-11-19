'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSessionClient } from '@/lib/supabase/server';
import { findProfileForAuthUser } from '@/lib/auth';
import { getSiteUrl } from '@/lib/site-url';
import { getI18n } from '@/i18n/server';

export type AuthFormState = {
  error?: string;
  message?: string;
  email?: string;
};

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { t } = await getI18n();
  const email = String(formData.get('email') ?? '').trim();
  const parsed = signInSchema.safeParse({
    email,
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: t.auth.errorCredentials, email };
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: t.auth.errorInvalidLogin, email };
  }

  const profile = await findProfileForAuthUser(data.user);
  if (!profile) {
    await supabase.auth.signOut();
    return { error: t.auth.errorNoProfile, email };
  }

  redirect('/main/finance');
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { t } = await getI18n();
  const email = String(formData.get('email') ?? '').trim();
  if (!z.email().safeParse(email).success) {
    return { error: t.auth.errorEmail, email };
  }

  const supabase = await createSessionClient();
  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/set-password`,
  });
  if (error && error.status === 429) {
    return { error: t.auth.errorRateLimit, email };
  }

  // Same answer whether or not the account exists, so emails can't be probed.
  return { message: t.auth.resetSent };
}

export async function setPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { t } = await getI18n();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) return { error: t.auth.errorPasswordLength };
  if (password !== confirm) return { error: t.auth.errorPasswordMatch };

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error: error.code === 'same_password' ? t.auth.errorSamePassword : error.message,
    };
  }

  redirect('/main/finance');
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect('/login');
}
