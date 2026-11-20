import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { canModerate } from '@/features/forum/access';
import { getForumCategories, getTopic } from '@/features/forum/queries';
import { TopicView } from '@/features/forum/components/topic-view';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const [{ t }, user, { id }] = await Promise.all([getI18n(), getCurrentUser(), params]);
  const topic = user ? await getTopic(user, id) : null;
  return { title: topic?.title ?? t.nav.forum };
}

export default async function TopicPage({ params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const [topic, categories] = await Promise.all([getTopic(user, id), getForumCategories(user)]);
  // Missing or not visible: the same 404, so restricted topics aren't revealed.
  if (!topic) notFound();

  return (
    <TopicView
      topic={topic}
      categories={categories}
      currentUserId={user.id}
      currentUserName={user.username}
      canModerate={canModerate(user)}
    />
  );
}
