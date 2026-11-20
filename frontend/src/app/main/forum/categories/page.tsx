import type { Metadata } from 'next';
import { requirePageAccess } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { canModerate } from '@/features/forum/access';
import { getAllForumCategories } from '@/features/forum/queries';
import { ManageCategories } from '@/features/forum/components/manage-categories';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.forum.cat.title };
}

export default async function ForumCategoriesPage() {
  await requirePageAccess(canModerate);
  return <ManageCategories categories={await getAllForumCategories()} />;
}
