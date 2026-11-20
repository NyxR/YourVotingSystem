'use client';

import { formatDistanceToNow } from 'date-fns';
import { LockKeyholeIcon } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { DATE_FNS_LOCALES } from '@/i18n/date-locale';
import { formatDate } from '@/lib/dates';
import { initials } from '@/lib/initials';
import { cn } from '@/lib/utils';
import { COLOR_BADGE, COLOR_DOT } from '../colors';
import type { ForumCategoryItem } from '../schemas';

type CategoryRef = Pick<ForumCategoryItem, 'name' | 'color' | 'visibility'>;

/** Coloured category chip; restricted categories show a lock. */
export function CategoryBadge({
  category,
  className,
}: {
  category: CategoryRef;
  className?: string;
}) {
  const { t } = useI18n();
  const restricted = category.visibility !== 'EVERYONE';
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium',
        COLOR_BADGE[category.color],
        className,
      )}
      title={restricted ? t.forum.visibility[category.visibility] : undefined}
    >
      <span className={cn('size-2 shrink-0 rounded-full', COLOR_DOT[category.color])} aria-hidden />
      <span className='truncate'>{category.name}</span>
      {restricted && (
        <>
          <LockKeyholeIcon className='size-3 shrink-0' aria-hidden />
          <span className='sr-only'>{t.forum.visibility[category.visibility]}</span>
        </>
      )}
    </span>
  );
}

export function PersonAvatar({ name, className }: { name: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground',
        !name && 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {name ? initials(name) : '?'}
    </span>
  );
}

/** "3 hours ago", with the full date on hover. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const { locale, intl } = useI18n();
  const date = new Date(iso);
  return (
    <time
      dateTime={iso}
      className={className}
      title={formatDate(date, intl, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
      suppressHydrationWarning
    >
      {formatDistanceToNow(date, {
        addSuffix: true,
        locale: DATE_FNS_LOCALES[locale],
      })}
    </time>
  );
}
