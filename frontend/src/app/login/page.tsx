import type { Metadata } from 'next';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { LoginForm } from '@/features/auth/components/login-form';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.signIn };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { t } = await getI18n();
  const errors: Record<string, string> = {
    link: t.auth.errorLink,
    'no-access': t.auth.errorNoAccess,
  };

  return (
    <AuthShell title={t.auth.welcomeBack} description={t.auth.signInDescription}>
      <LoginForm initialError={error ? errors[error] : undefined} />
    </AuthShell>
  );
}
