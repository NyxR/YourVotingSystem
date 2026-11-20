import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCAD } from '@/lib/money';
import { formatDay } from '@/lib/dates';
import { fmt, numberLocale } from '@/i18n/config';
import { getI18n } from '@/i18n/server';
import type { DashboardData } from '../queries';

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

function ChangeBadge({ change, intl }: { change: number | null; intl: string }) {
  if (change === null) return null;
  const Icon = change >= 0 ? TrendingUpIcon : TrendingDownIcon;
  const text = new Intl.NumberFormat(numberLocale(intl), {
    style: 'percent',
    maximumFractionDigits: 0,
    signDisplay: 'exceptZero',
  }).format(change);
  return (
    <Badge variant='outline'>
      <Icon />
      {text}
    </Badge>
  );
}

export async function OverviewCards({ data }: { data: DashboardData }) {
  const { t, intl } = await getI18n();
  const o = t.overview;
  const money = (cents: number) => formatCAD(cents, intl);
  const signed = (cents: number) => (cents < 0 ? '−' : '') + money(Math.abs(cents));

  const { thisMonth, lastMonth } = data;
  const net = thisMonth.income - thisMonth.expense;
  const lastNet = lastMonth.income - lastMonth.expense;
  const month = formatDay(data.today, { month: 'long', day: undefined, year: undefined }, intl);

  const cards = [
    {
      key: 'balance',
      label: o.currentBalance,
      value: signed(data.balance),
      badge: null,
      footer: fmt(o.netIn, { amount: signed(net), month }),
      sub: fmt(o.acrossTransactions, { count: data.transactionCount }),
    },
    {
      key: 'income',
      label: fmt(o.incomeMonth, { month }),
      value: money(thisMonth.income),
      badge: (
        <ChangeBadge change={percentChange(thisMonth.income, lastMonth.income)} intl={intl} />
      ),
      footer: fmt(o.lastMonth, { amount: money(lastMonth.income) }),
      sub: o.receivedThisMonth,
    },
    {
      key: 'expense',
      label: fmt(o.expensesMonth, { month }),
      value: money(thisMonth.expense),
      badge: (
        <ChangeBadge change={percentChange(thisMonth.expense, lastMonth.expense)} intl={intl} />
      ),
      footer: fmt(o.lastMonth, { amount: money(lastMonth.expense) }),
      sub: o.spentThisMonth,
    },
    {
      key: 'net',
      label: fmt(o.netMonth, { month }),
      value: signed(net),
      badge: null,
      footer: fmt(o.lastMonth, { amount: signed(lastNet) }),
      sub: net >= 0 ? o.moreIn : o.moreOut,
    },
  ];

  return (
    <div className='grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card'>
      {cards.map((c) => (
        <Card key={c.key} className='@container/card'>
          <CardHeader>
            <CardDescription>{c.label}</CardDescription>
            <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
              {c.value}
            </CardTitle>
            {c.badge && <CardAction>{c.badge}</CardAction>}
          </CardHeader>
          <CardFooter className='flex-col items-start gap-1.5 text-sm'>
            <div className='line-clamp-1 font-medium tabular-nums'>{c.footer}</div>
            <div className='text-muted-foreground'>{c.sub}</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
