import type { Metadata } from 'next';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { SetPasswordForm } from '@/features/auth/components/set-password-form';
import { requireUser } from '@/lib/auth';
import { fmt } from '@/i18n/config';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.choosePassword };
}

export default async function SetPasswordPage() {
  const user = await requireUser();
  const { t } = await getI18n();

  return (
    <AuthShell
      title={t.auth.choosePassword}
      description={fmt(t.auth.choosePasswordDescription, { email: user.email })}
    >
      <SetPasswordForm />
    </AuthShell>
  );
}
