import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. Bypasses Row Level Security, so only call it
 * from server code *after* checking the caller's role (see `@/lib/auth`).
 * Never import this from a client component.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export const RECEIPTS_BUCKET = 'receipts';
export const FORUM_BUCKET = 'forum';
