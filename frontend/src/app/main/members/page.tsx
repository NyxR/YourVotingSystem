import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { getMembers } from '@/features/members/queries';
import { MembersView } from '@/features/members/components/members-view';
import { MembersStats } from '@/features/members/components/members-stats';
import { todayISO } from '@/lib/dates';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.members };
}

/**
 * Member list, readable by every signed-in user (not only admins).
 * Contact numbers are included for admins and treasurers only.
 */
export default async function MembersPage() {
  const user = await requireUser();
  const showPhone = user.role === 'admin' || user.role === 'treasurer';
  const members = await getMembers({ includePhone: showPhone });

  return (
    <>
      <MembersStats members={members} today={todayISO()} />
      <MembersView members={members} showPhone={showPhone} />
    </>
  );
}
