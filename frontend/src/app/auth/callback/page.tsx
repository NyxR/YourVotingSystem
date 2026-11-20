'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { useI18n } from '@/i18n/client';

/**
 * Fallback for auth emails that still use Supabase's default templates: those
 * put the session tokens in the URL #fragment, which the server never sees.
 * We read them here, store the session in cookies, then continue to `next`.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    const nextParam = query.get('next');
    const next = nextParam?.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/set-password';

    if (!accessToken || !refreshToken) {
      router.replace('/login?error=link');
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) setFailed(true);
        else router.replace(next);
      });
  }, [router]);

  return (
    <AuthShell
      title={failed ? t.auth.linkInvalidTitle : t.auth.signingInEllipsis}
      description={failed ? t.auth.linkInvalidDescription : undefined}
    >
      {failed && (
        <div className='flex flex-col gap-2 text-center text-sm'>
          <Link href='/forgot-password' className='underline-offset-4 hover:underline'>
            {t.auth.resetMyPassword}
          </Link>
          <Link href='/login' className='underline-offset-4 hover:underline'>
            {t.auth.backToSignIn}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
