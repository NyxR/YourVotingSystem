import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';

/**
 * Landing point for links in Supabase auth emails (invite, password reset).
 * Supports both the token_hash links from the recommended email templates
 * and PKCE `?code=` links. On success the visitor has a session and is sent
 * on to `next` (usually /set-password).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  // No token in the query string: the tokens may be in the #fragment (default
  // Supabase templates). Browsers keep the fragment across redirects, so hand
  // over to the client-side callback page.
  if (!tokenHash && !code) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    url.search = `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(url);
  }

  const supabase = await createSessionClient();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const url = request.nextUrl.clone();
  url.search = '';
  if (ok) {
    url.pathname = next;
  } else {
    url.pathname = '/login';
    url.searchParams.set('error', 'link');
  }
  return NextResponse.redirect(url);
}

/** Only allow same-site relative paths, to avoid open redirects. */
function safeNextPath(next: string | null) {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/set-password';
}
