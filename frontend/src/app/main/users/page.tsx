import type { Metadata } from 'next';
import { can, requirePageAccess } from '@/lib/auth';
import { getUsers } from '@/features/users/queries';
import { UsersView } from '@/features/users/components/users-view';

export const metadata: Metadata = { title: 'Users' };

export default async function UsersPage() {
  const me = await requirePageAccess(can.manageUsers);
  const users = await getUsers();

  return <UsersView users={users} currentUserId={me.id} />;
}
