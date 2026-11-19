import type { Metadata } from 'next';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = { title: 'Sign in' };

const ERRORS: Record<string, string> = {
  link: 'That link is invalid or has expired. Request a new one.',
  'no-access':
    'Your account has no access to the app. Ask an administrator to invite you.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      title='Welcome back'
      description='Sign in with your email and password'
    >
      <LoginForm initialError={error ? ERRORS[error] : undefined} />
    </AuthShell>
  );
}
