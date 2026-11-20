import { NextResponse, type NextRequest } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';

/**
 * Clears the session and returns to the login page with a reason. Used when a
 * valid Supabase session has no app profile (e.g. the user was removed), so
 * the proxy doesn't keep redirecting them away from /login.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();

  const reason = request.nextUrl.searchParams.get('reason');
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  if (reason === 'no-access') url.searchParams.set('error', 'no-access');
  return NextResponse.redirect(url);
}
