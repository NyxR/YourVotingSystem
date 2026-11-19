import type { Metadata } from 'next';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.resetTitle };
}

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();
  return (
    <AuthShell title={t.auth.resetTitle} description={t.auth.resetDescription}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
