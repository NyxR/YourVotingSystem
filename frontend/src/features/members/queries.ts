// Server-only read for the Members page (not a 'use server' module on purpose).

import prisma from '@/lib/prisma';
import type { MemberType } from '@/lib/member-types';
import { normalizeResponsibilities, type Responsibility } from '@/lib/responsibilities';

export type MemberRow = {
  id: string;
  username: string;
  email: string;
  memberType: MemberType;
  /** E.164 or null. Omitted entirely for viewers (see getMembers). */
  phone?: string | null;
  responsibilities: Responsibility[];
  /** When the account was created, as an ISO timestamp. */
  createdAt: string;
  /** When the account was last changed (name, role, type…), as an ISO timestamp. */
  updatedAt: string;
};

/**
 * Everyone with an app account, alphabetically. Visible to any signed-in user;
 * contact numbers are only selected when `includePhone` is true, so they never
 * reach viewers' browsers.
 */
export async function getMembers({ includePhone }: { includePhone: boolean }): Promise<MemberRow[]> {
  const rows = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      memberType: true,
      phone: includePhone,
      responsibilities: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { username: 'asc' },
  });
  return rows.map((r) => ({
    ...r,
    responsibilities: normalizeResponsibilities(r.responsibilities),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
