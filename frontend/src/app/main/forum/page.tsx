import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { canModerate } from '@/features/forum/access';
import { getForumCategories, getTopics, TOPICS_PER_PAGE } from '@/features/forum/queries';
import { ForumHome } from '@/features/forum/components/forum-home';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.forum };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string | string[];
    page?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const categoryId = first(params.category) || undefined;
  const page = Math.max(1, Number.parseInt(first(params.page) ?? '1', 10) || 1);

  const [categories, result] = await Promise.all([
    getForumCategories(user),
    getTopics(user, { categoryId, page }),
  ]);
  // Unknown or not-visible category: same answer, so its existence isn't revealed.
  if (!result) notFound();

  return (
    <ForumHome
      categories={categories}
      topics={result.topics}
      total={result.total}
      page={page}
      pageCount={Math.max(1, Math.ceil(result.total / TOPICS_PER_PAGE))}
      activeCategoryId={categoryId ?? null}
      canManage={canModerate(user)}
    />
  );
}
