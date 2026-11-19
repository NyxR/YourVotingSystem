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
import type { DashboardData } from '../queries';

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) return null;
  const up = change >= 0;
  const Icon = up ? TrendingUpIcon : TrendingDownIcon;
  return (
    <Badge variant='outline'>
      <Icon />
      {up ? '+' : ''}
      {change.toFixed(0)}%
    </Badge>
  );
}

const signed = (cents: number) => (cents < 0 ? '−' : '') + formatCAD(Math.abs(cents));

export function OverviewCards({ data }: { data: DashboardData }) {
  const { thisMonth, lastMonth } = data;
  const net = thisMonth.income - thisMonth.expense;
  const lastNet = lastMonth.income - lastMonth.expense;
  const monthName = formatDay(data.today, { month: 'long', day: undefined, year: undefined });

  const cards = [
    {
      label: 'Current balance',
      value: signed(data.balance),
      badge: null,
      footer: `${signed(net)} net in ${monthName}`,
      sub: `Across ${data.transactionCount} recorded transaction${data.transactionCount === 1 ? '' : 's'}`,
    },
    {
      label: `Income · ${monthName}`,
      value: formatCAD(thisMonth.income),
      badge: <ChangeBadge change={percentChange(thisMonth.income, lastMonth.income)} />,
      footer: `Last month: ${formatCAD(lastMonth.income)}`,
      sub: 'Money received this month',
    },
    {
      label: `Expenses · ${monthName}`,
      value: formatCAD(thisMonth.expense),
      badge: <ChangeBadge change={percentChange(thisMonth.expense, lastMonth.expense)} />,
      footer: `Last month: ${formatCAD(lastMonth.expense)}`,
      sub: 'Money spent this month',
    },
    {
      label: `Net · ${monthName}`,
      value: signed(net),
      badge: null,
      footer: `Last month: ${signed(lastNet)}`,
      sub: net >= 0 ? 'More came in than went out' : 'More went out than came in',
    },
  ];

  return (
    <div className='grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card'>
      {cards.map((c) => (
        <Card key={c.label} className='@container/card'>
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
