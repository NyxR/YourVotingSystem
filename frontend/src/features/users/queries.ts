// Server-only reads for the users page (not a 'use server' module on purpose).

import type { User as AuthUser } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import { normalizeRole } from '@/lib/roles';
import { normalizeResponsibilities } from '@/lib/responsibilities';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRow } from './schemas/user.schema';

/** All Supabase Auth users (pages through the admin API). */
export async function listAuthUsers(): Promise<AuthUser[]> {
  const admin = createAdminClient();
  const all: AuthUser[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) return all;
  }
}

export async function getUsers(): Promise<UserRow[]> {
  const [profiles, authUsers] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
    listAuthUsers(),
  ]);
  const authById = new Map(authUsers.map((u) => [u.id, u]));

  return profiles.map((p) => {
    const auth = p.authId ? authById.get(p.authId) : undefined;
    return {
      id: p.id,
      username: p.username,
      email: p.email,
      role: normalizeRole(p.role),
      memberType: p.memberType,
      phone: p.phone,
      responsibilities: normalizeResponsibilities(p.responsibilities),
      status: !auth ? 'not_invited' : auth.last_sign_in_at ? 'active' : 'invited',
      lastSignInAt: auth?.last_sign_in_at ?? null,
      createdAt: p.createdAt.toISOString(),
    };
  });
}
