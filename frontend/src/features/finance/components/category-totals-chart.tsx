'use client';

import { useMemo, useRef, useState } from 'react';
import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';
import { Loader2Icon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCAD, formatCADCompact } from '@/lib/money';
import { formatDay } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { fetchTotalsByCategory } from '../actions/reports.actions';
import type { CategoryTotal, DateRange } from '../queries';
import type { TransactionType } from '../schemas';
import { useI18n } from '@/i18n/client';
import type { Messages } from '@/i18n/messages/en';
import { EmptyChart } from './income-expense-chart';

type ChartKey = keyof Messages['charts'];

/** Per-type message keys and bar colour. */
const COPY: Record<
  TransactionType,
  { title: ChartKey; verb: ChartKey; label: ChartKey; empty: ChartKey; color: string }
> = {
  INCOME: {
    title: 'incomeByCategory',
    verb: 'received',
    label: 'receivedLabel',
    empty: 'noIncome',
    color: 'var(--income)',
  },
  EXPENSE: {
    title: 'expensesByCategory',
    verb: 'spent',
    label: 'spentLabel',
    empty: 'noExpenses',
    color: 'var(--expense)',
  },
};

/** Bars shown before the rest fold into "Other". */
const MAX_BARS = 7;

function describeRange({ from, to }: DateRange, intl: string) {
  const day = (iso: string) => formatDay(iso, {}, intl);
  return from === to ? day(from) : `${day(from)} – ${day(to)}`;
}

/** Bar chart of income or expense totals per category over a chosen date range. */
export function CategoryTotalsChart({
  type,
  initialData,
  defaultRange,
}: {
  type: TransactionType;
  /** Totals for `defaultRange`, rendered on the server. */
  initialData: CategoryTotal[];
  /** First to last day of the current month. */
  defaultRange: DateRange;
}) {
  const { t, intl } = useI18n();
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [totals, setTotals] = useState<CategoryTotal[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the latest request may update the chart (dates can change quickly).
  const latestRequest = useRef(0);
  const copy = COPY[type];
  const chartConfig = {
    amount: { label: t.charts[copy.label], color: copy.color },
  } satisfies ChartConfig;
  const fromId = `${type.toLowerCase()}-from`;
  const toId = `${type.toLowerCase()}-to`;

  const rangeError =
    !range.from || !range.to
      ? t.validation.rangeBoth
      : range.from > range.to
        ? t.validation.rangeOrder
        : null;

  const load = async (next: DateRange) => {
    if (!next.from || !next.to || next.from > next.to) return;
    const id = ++latestRequest.current;
    setLoading(true);
    setError(null);
    const result = await fetchTotalsByCategory(type, next.from, next.to);
    if (id !== latestRequest.current) return;
    setLoading(false);
    if (result.success) setTotals(result.data);
    else setError(result.message);
  };

  const updateRange = (next: DateRange) => {
    setRange(next);
    void load(next);
  };

  const isDefault = range.from === defaultRange.from && range.to === defaultRange.to;

  const { data, total } = useMemo(() => {
    const named = totals.map((r) => ({ name: r.name ?? t.common.uncategorized, amount: r.amount }));
    const top = named.slice(0, MAX_BARS);
    const rest = named.slice(MAX_BARS).reduce((s, r) => s + r.amount, 0);
    if (rest > 0) top.push({ name: t.charts.other, amount: rest });
    return { data: top, total: totals.reduce((s, r) => s + r.amount, 0) };
  }, [totals, t]);

  return (
    <Card className='@container/card flex flex-col'>
      <CardHeader>
        <CardTitle>{t.charts[copy.title]}</CardTitle>
        <CardDescription>
          {rangeError
            ? t.charts.chooseRange
            : `${describeRange(range, intl)} · ${formatCAD(total, intl)} ${t.charts[copy.verb]}`}
        </CardDescription>
        <CardAction className='flex flex-wrap items-center justify-end gap-2'>
          {loading && (
            <Loader2Icon className='size-4 animate-spin text-muted-foreground' aria-label={t.common.loading} />
          )}
          {!isDefault && (
            <Button
              variant='ghost'
              size='icon'
              className='size-8'
              title={t.charts.backToThisMonth}
              onClick={() => updateRange(defaultRange)}
            >
              <RotateCcwIcon />
              <span className='sr-only'>{t.charts.backToThisMonth}</span>
            </Button>
          )}
          <div className='flex items-center gap-1.5'>
            <Label htmlFor={fromId} className='text-sm text-muted-foreground'>
              {t.common.from}
            </Label>
            <Input
              id={fromId}
              type='date'
              className='h-8 w-36'
              value={range.from}
              max={range.to || undefined}
              aria-invalid={!!rangeError && !!range.from}
              onChange={(e) => updateRange({ ...range, from: e.target.value })}
            />
          </div>
          <div className='flex items-center gap-1.5'>
            <Label htmlFor={toId} className='text-sm text-muted-foreground'>
              {t.common.to}
            </Label>
            <Input
              id={toId}
              type='date'
              className='h-8 w-36'
              value={range.to}
              min={range.from || undefined}
              aria-invalid={!!rangeError && !!range.to}
              onChange={(e) => updateRange({ ...range, to: e.target.value })}
            />
          </div>
        </CardAction>
        {(rangeError || error) && (
          <p role='alert' className='col-span-full text-sm text-destructive'>
            {rangeError ?? error}
          </p>
        )}
      </CardHeader>
      <CardContent className={cn('flex-1 transition-opacity', loading && 'opacity-50')} aria-busy={loading}>
        {data.length === 0 ? (
          <EmptyChart message={t.charts[copy.empty]} />
        ) : (
          <ChartContainer
            config={chartConfig}
            className='aspect-auto w-full'
            style={{ height: Math.max(data.length * 40 + 16, 120) }}
          >
            <BarChart data={data} layout='vertical' margin={{ left: 0, right: 64 }} barCategoryGap={8}>
              <YAxis
                dataKey='name'
                type='category'
                tickLine={false}
                axisLine={false}
                width={120}
                tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
              />
              <XAxis type='number' dataKey='amount' hide />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    formatter={(value) => (
                      <div className='flex w-full justify-between gap-4'>
                        <span className='text-muted-foreground'>{chartConfig.amount.label}</span>
                        <span className='font-mono font-medium tabular-nums text-foreground'>
                          {formatCAD(Number(value), intl)} ·{' '}
                          {total ? Math.round((Number(value) / total) * 100) : 0}%
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey='amount' fill='var(--color-amount)' radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey='amount'
                  position='right'
                  offset={8}
                  className='fill-foreground'
                  fontSize={12}
                  formatter={(v) => formatCADCompact(Number(v), intl)}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
