import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { getForumCategories } from '@/features/forum/queries';
import { NewTopic } from '@/features/forum/components/new-topic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.forum.newTopicTitle };
}

export default async function NewTopicPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const user = await requireUser();
  const categories = await getForumCategories(user);
  if (categories.length === 0) redirect('/main/forum');

  const requested = (await searchParams).category;
  const id = Array.isArray(requested) ? requested[0] : requested;
  // Preselect the category the user came from, if they can post there.
  const categoryId = categories.some((c) => c.id === id) ? id! : categories[0].id;

  return <NewTopic categories={categories} categoryId={categoryId} />;
}
