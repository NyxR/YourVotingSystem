'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSessionClient } from '@/lib/supabase/server';
import { findProfileForAuthUser } from '@/lib/auth';
import { getSiteUrl } from '@/lib/site-url';

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
  const email = String(formData.get('email') ?? '').trim();
  const parsed = signInSchema.safeParse({
    email,
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: 'Enter a valid email and your password.', email };
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: 'Invalid email or password.', email };
  }

  const profile = await findProfileForAuthUser(data.user);
  if (!profile) {
    await supabase.auth.signOut();
    return {
      error:
        'This account has no access to the app. Ask an administrator to invite you.',
      email,
    };
  }

  redirect('/main/finance');
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!z.email().safeParse(email).success) {
    return { error: 'Enter a valid email address.', email };
  }

  const supabase = await createSessionClient();
  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/set-password`,
  });
  if (error && error.status === 429) {
    return {
      error: 'Too many requests. Please wait a minute and try again.',
      email,
    };
  }

  // Same answer whether or not the account exists, so emails can't be probed.
  return {
    message:
      'If an account exists for this email, a link to reset your password is on its way.',
  };
}

const setPasswordSchema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'The passwords do not match.',
  });

export async function setPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = setPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid password.' };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      error:
        error.code === 'same_password'
          ? 'Choose a password different from your current one.'
          : error.message,
    };
  }

  redirect('/main/finance');
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect('/login');
}
