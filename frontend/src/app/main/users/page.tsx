import type { Metadata } from 'next';
import { can, requirePageAccess } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { getUsers } from '@/features/users/queries';
import { UsersView } from '@/features/users/components/users-view';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.users };
}

export default async function UsersPage() {
  const me = await requirePageAccess(can.manageUsers);
  const users = await getUsers();

  return <UsersView users={users} currentUserId={me.id} />;
}
