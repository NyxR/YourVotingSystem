'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  LockIcon,
  MessageSquareIcon,
  PinIcon,
  PlusIcon,
  Settings2Icon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fmt } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { cn } from '@/lib/utils';
import { COLOR_DOT } from '../colors';
import type { ForumCategoryItem, TopicListItem } from '../schemas';
import { useOnForumActivity } from '../use-realtime';
import { CategoryBadge, RelativeTime } from './forum-bits';

const href = (categoryId: string | null, page = 1) => {
  const params = new URLSearchParams();
  if (categoryId) params.set('category', categoryId);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/main/forum?${qs}` : '/main/forum';
};

export function ForumHome({
  categories,
  topics,
  total,
  page,
  pageCount,
  activeCategoryId,
  canManage,
}: {
  categories: ForumCategoryItem[];
  topics: TopicListItem[];
  total: number;
  page: number;
  pageCount: number;
  activeCategoryId: string | null;
  canManage: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  // New topics, replies, pins… from others appear without reloading.
  useOnForumActivity(() => router.refresh());
  const active = categories.find((c) => c.id === activeCategoryId) ?? null;
  const newTopicHref = active ? `/main/forum/new?category=${active.id}` : '/main/forum/new';

  return (
    <div className='flex flex-col gap-4 px-4 lg:px-6'>
      <div className='flex flex-wrap items-center gap-2'>
        <nav aria-label={t.forum.categoriesLabel} className='flex min-w-0 flex-1 flex-wrap gap-1.5'>
          <Button asChild size='sm' variant={active ? 'outline' : 'secondary'}>
            <Link href={href(null)} aria-current={active ? undefined : 'page'}>
              {t.forum.allCategories}
            </Link>
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              asChild
              size='sm'
              variant={c.id === active?.id ? 'secondary' : 'outline'}
            >
              <Link href={href(c.id)} aria-current={c.id === active?.id ? 'page' : undefined}>
                <span className={cn('size-2 rounded-full', COLOR_DOT[c.color])} aria-hidden />
                {c.name}
                {c.visibility !== 'EVERYONE' && (
                  <LockIcon
                    className='size-3 text-muted-foreground'
                    aria-label={t.forum.visibility[c.visibility]}
                  />
                )}
              </Link>
            </Button>
          ))}
        </nav>
        <div className='flex items-center gap-2'>
          {canManage && (
            <Button asChild size='sm' variant='outline'>
              <Link href='/main/forum/categories'>
                <Settings2Icon />{' '}
                <span className='hidden sm:inline'>{t.forum.manageCategories}</span>
                <span className='sr-only sm:hidden'>{t.forum.manageCategories}</span>
              </Link>
            </Button>
          )}
          {categories.length > 0 && (
            <Button asChild size='sm'>
              <Link href={newTopicHref}>
                <PlusIcon /> {t.forum.newTopic}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {active && (
        <div className='flex flex-col gap-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <CategoryBadge category={active} className='text-sm' />
            <span className='text-sm text-muted-foreground'>
              {t.forum.visibilityHint[active.visibility]}
            </span>
          </div>
          {active.description && (
            <p className='text-sm text-muted-foreground'>{active.description}</p>
          )}
        </div>
      )}

      <Card className='gap-0 py-0'>
        <div className='hidden grid-cols-[1fr_5rem_7rem] gap-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground sm:grid'>
          <span>{t.forum.colTopic}</span>
          <span className='text-center'>{t.forum.colReplies}</span>
          <span className='text-right'>{t.forum.colActivity}</span>
        </div>
        {topics.length === 0 ? (
          <p className='p-8 text-center text-sm text-muted-foreground'>
            {active ? t.forum.emptyCategory : t.forum.empty}
          </p>
        ) : (
          <ul className='divide-y'>
            {topics.map((topic) => (
              <TopicRow key={topic.id} topic={topic} showCategory={!active} />
            ))}
          </ul>
        )}
      </Card>

      {pageCount > 1 && (
        <div className='flex items-center justify-between gap-2 text-sm'>
          <span className='text-muted-foreground tabular-nums'>
            {fmt(t.forum.topicCount, { count: total })} ·{' '}
            {fmt(t.common.pageOf, { page, total: pageCount })}
          </span>
          <div className='flex gap-2'>
            <Button asChild={page > 1} size='sm' variant='outline' disabled={page <= 1}>
              {page > 1 ? (
                <Link href={href(activeCategoryId, page - 1)}>
                  <ChevronLeftIcon /> {t.forum.previous}
                </Link>
              ) : (
                <span>
                  <ChevronLeftIcon /> {t.forum.previous}
                </span>
              )}
            </Button>
            <Button
              asChild={page < pageCount}
              size='sm'
              variant='outline'
              disabled={page >= pageCount}
            >
              {page < pageCount ? (
                <Link href={href(activeCategoryId, page + 1)}>
                  {t.forum.next} <ChevronRightIcon />
                </Link>
              ) : (
                <span>
                  {t.forum.next} <ChevronRightIcon />
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopicRow({ topic, showCategory }: { topic: TopicListItem; showCategory: boolean }) {
  const { t } = useI18n();
  const unread = topic.isNew || topic.newComments > 0;
  return (
    <li className='relative grid gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/50 sm:grid-cols-[1fr_5rem_7rem] sm:items-center'>
      <div className='flex min-w-0 flex-col gap-1'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
          {topic.pinned && (
            <PinIcon className='size-3.5 shrink-0 text-primary' aria-label={t.forum.pinned} />
          )}
          {topic.locked && (
            <LockIcon
              className='size-3.5 shrink-0 text-muted-foreground'
              aria-label={t.forum.locked}
            />
          )}
          <Link
            href={`/main/forum/${topic.id}`}
            className={cn(
              'min-w-0 break-words after:absolute after:inset-0 hover:underline',
              unread ? 'font-semibold' : 'font-medium text-foreground/85',
            )}
          >
            {topic.title}
          </Link>
          {topic.isNew ? (
            <Badge className='h-5'>{t.forum.new}</Badge>
          ) : topic.newComments > 0 ? (
            <Badge className='h-5 tabular-nums'>
              {fmt(t.forum.newComments, { count: topic.newComments })}
            </Badge>
          ) : null}
        </div>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
          {showCategory && <CategoryBadge category={topic.category} />}
          <span>
            {fmt(t.forum.startedBy, {
              name: topic.author?.name ?? t.common.removedUser,
            })}
          </span>
          {topic.likeCount > 0 && (
            <span className='inline-flex items-center gap-1 tabular-nums'>
              <HeartIcon className='size-3' aria-hidden />
              <span className='sr-only'>{t.forum.like}:</span>
              {topic.likeCount}
            </span>
          )}
          {/* Phones: replies + activity on the meta line. */}
          <span className='inline-flex items-center gap-1 tabular-nums sm:hidden'>
            <MessageSquareIcon className='size-3' aria-hidden />
            {topic.commentCount}
          </span>
          <RelativeTime iso={topic.lastActivityAt} className='sm:hidden' />
        </div>
      </div>
      <span className='hidden text-center text-sm tabular-nums sm:block'>
        <span className='sr-only'>{t.forum.colReplies}: </span>
        {topic.commentCount}
      </span>
      <RelativeTime
        iso={topic.lastActivityAt}
        className='hidden text-right text-sm text-muted-foreground sm:block'
      />
    </li>
  );
}
