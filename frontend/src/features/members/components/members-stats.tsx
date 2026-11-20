'use client';

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { fmt, numberLocale } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { APP_TIMEZONE, monthStart } from '@/lib/dates';
import { MEMBER_TYPE_LABELS, MEMBER_TYPES } from '@/lib/member-types';
import {
  ALWAYS_RESPONSIBILITY,
  OPTIONAL_RESPONSIBILITIES,
  RESPONSIBILITY_LABELS,
} from '@/lib/responsibilities';
import type { MemberRow } from '../queries';

type Stat = {
  key: string;
  label: string;
  count: number;
  newCount: number;
  /** Total card: no "% of members" line. */
  isTotal?: boolean;
};

/**
 * One card per number for the whole membership (they ignore the table
 * filters): total, each member type, each responsibility. Each shows its
 * share of members and how many were added this month.
 */
export function MembersStats({ members, today }: { members: MemberRow[]; today: string }) {
  const { t, intl } = useI18n();
  const total = members.length;

  // "Added this month" in the organization's time zone.
  const thisMonth = monthStart(today);
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE });
  const isNew = (m: MemberRow) => dayFormat.format(new Date(m.createdAt)) >= thisMonth;

  const stat = (
    key: string,
    label: string,
    match: (m: MemberRow) => boolean,
  ): Stat => {
    const matching = members.filter(match);
    return { key, label, count: matching.length, newCount: matching.filter(isNew).length };
  };

  const stats: Stat[] = [
    // Everyone is Mpiara-mivavaka, so this card doubles as the total.
    {
      ...stat('total', RESPONSIBILITY_LABELS[ALWAYS_RESPONSIBILITY], () => true),
      isTotal: true,
    },
    ...MEMBER_TYPES.map((type) =>
      stat(type, MEMBER_TYPE_LABELS[type], (m) => m.memberType === type),
    ),
    ...OPTIONAL_RESPONSIBILITIES.map((r) =>
      stat(r, RESPONSIBILITY_LABELS[r], (m) =>
        m.responsibilities.includes(r),
      ),
    ),
  ];

  const number = (n: number) => new Intl.NumberFormat(numberLocale(intl)).format(n);
  const percent = (n: number) =>
    new Intl.NumberFormat(numberLocale(intl), { style: 'percent', maximumFractionDigits: 0 }).format(
      total ? n / total : 0,
    );

  return (
    <div className='grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @3xl/main:grid-cols-3 @6xl/main:grid-cols-5 dark:*:data-[slot=card]:bg-card'>
      {stats.map((s) => (
        <Card key={s.key} className='@container/card gap-3'>
          <CardHeader className='gap-1.5'>
            <CardDescription className='truncate font-medium text-foreground' title={s.label}>
              {s.label}
            </CardDescription>
            <CardTitle className='text-2xl font-semibold tabular-nums @[200px]/card:text-3xl'>
              {number(s.count)}
            </CardTitle>
          </CardHeader>
          <CardFooter className='mt-auto flex-col items-start gap-0.5 text-xs'>
            {!s.isTotal && (
              <span className='text-muted-foreground tabular-nums'>
                {fmt(t.members.shareOfMembers, { percent: percent(s.count) })}
              </span>
            )}
            <span
              className={
                s.newCount > 0 ? 'font-medium tabular-nums' : 'text-muted-foreground'
              }
            >
              {s.newCount > 0
                ? fmt(t.members.newThisMonth, { count: number(s.newCount) })
                : t.members.noneThisMonth}
            </span>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
