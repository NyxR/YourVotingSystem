import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { getMembers } from '@/features/members/queries';
import { MembersView } from '@/features/members/components/members-view';
import { MembersStats } from '@/features/members/components/members-stats';
import { todayISO } from '@/lib/dates';
import { isManager } from '@/lib/roles';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.members };
}

/**
 * Member list, readable by every signed-in user (not only admins).
 * Emails and contact numbers are included for admins and treasurers only.
 */
export default async function MembersPage() {
  const user = await requireUser();
  const showContact = isManager(user.role);
  const members = await getMembers({ includeContact: showContact });

  return (
    <>
      <MembersStats members={members} today={todayISO()} />
      <MembersView members={members} showContact={showContact} />
    </>
  );
}
