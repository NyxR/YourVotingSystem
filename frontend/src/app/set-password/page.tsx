import type { Metadata } from 'next';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { SetPasswordForm } from '@/features/auth/components/set-password-form';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Choose a password' };

export default async function SetPasswordPage() {
  const user = await requireUser();

  return (
    <AuthShell
      title='Choose a password'
      description={`You'll use it with ${user.email} to sign in.`}
    >
      <SetPasswordForm />
    </AuthShell>
  );
}
