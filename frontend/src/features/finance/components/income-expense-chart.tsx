'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatCAD, formatCADCompact } from '@/lib/money';
import { addDays, formatDay, isoToDate, monthStart } from '@/lib/dates';
import type { DailyTotal } from '../queries';

const chartConfig = {
  income: { label: 'Income', color: 'var(--income)' },
  expense: { label: 'Expenses', color: 'var(--expense)' },
} satisfies ChartConfig;

const RANGES = {
  '12m': { label: 'Last 12 months', short: '12 months' },
  '3m': { label: 'Last 3 months', short: '3 months' },
  '30d': { label: 'Last 30 days', short: '30 days' },
} as const;
type Range = keyof typeof RANGES;

type Bucket = { key: string; label: string; tooltip: string; income: number; expense: number };

/** Monday of the week containing `iso`. */
function weekStart(iso: string) {
  const day = isoToDate(iso).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((day + 6) % 7));
}

/** Builds evenly spaced, gap-filled buckets ending today. */
function bucketize(daily: DailyTotal[], range: Range, today: string): Bucket[] {
  const buckets: Bucket[] = [];
  let keyOf: (iso: string) => string;

  if (range === '30d') {
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i);
      buckets.push({
        key: d,
        label: formatDay(d, { year: undefined }),
        tooltip: formatDay(d, { weekday: 'short' }),
        income: 0,
        expense: 0,
      });
    }
    keyOf = (iso) => iso;
  } else if (range === '3m') {
    const last = weekStart(today);
    for (let i = 12; i >= 0; i--) {
      const w = addDays(last, -7 * i);
      buckets.push({
        key: w,
        label: formatDay(w, { year: undefined }),
        tooltip: `Week of ${formatDay(w)}`,
        income: 0,
        expense: 0,
      });
    }
    keyOf = weekStart;
  } else {
    for (let i = 11; i >= 0; i--) {
      const m = monthStart(today, -i);
      buckets.push({
        key: m,
        label: formatDay(m, { month: 'short', day: undefined, year: '2-digit' }),
        tooltip: formatDay(m, { month: 'long', day: undefined }),
        income: 0,
        expense: 0,
      });
    }
    keyOf = (iso) => monthStart(iso);
  }

  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const d of daily) {
    const i = index.get(keyOf(d.date));
    if (i === undefined) continue;
    buckets[i].income += d.income;
    buckets[i].expense += d.expense;
  }
  return buckets;
}

export function IncomeExpenseChart({ daily, today }: { daily: DailyTotal[]; today: string }) {
  const [range, setRange] = useState<Range>('12m');
  const data = useMemo(() => bucketize(daily, range, today), [daily, range, today]);
  const totals = data.reduce(
    (acc, b) => ({ income: acc.income + b.income, expense: acc.expense + b.expense }),
    { income: 0, expense: 0 },
  );
  const isEmpty = totals.income === 0 && totals.expense === 0;

  return (
    <Card className='@container/card'>
      <CardHeader>
        <CardTitle>Income vs expenses</CardTitle>
        <CardDescription>
          {RANGES[range].label}: {formatCAD(totals.income)} in, {formatCAD(totals.expense)} out
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type='single'
            value={range}
            onValueChange={(v) => v && setRange(v as Range)}
            variant='outline'
            className='hidden *:data-[slot=toggle-group-item]:px-4! @[640px]/card:flex'
          >
            {(Object.keys(RANGES) as Range[]).map((r) => (
              <ToggleGroupItem key={r} value={r}>
                {RANGES[r].label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className='flex w-36 @[640px]/card:hidden' size='sm' aria-label='Time range'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='rounded-xl'>
              {(Object.keys(RANGES) as Range[]).map((r) => (
                <SelectItem key={r} value={r} className='rounded-lg'>
                  {RANGES[r].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
        {isEmpty ? (
          <EmptyChart message={`No transactions in the ${RANGES[range].short.toLowerCase()} up to today.`} />
        ) : (
          <ChartContainer config={chartConfig} className='aspect-auto h-[280px] w-full'>
            <BarChart data={data} barGap={2} barCategoryGap={range === '30d' ? '15%' : '25%'}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey='label'
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v: number) => formatCADCompact(v)}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltip ?? ''}
                    formatter={(value, name, item) => (
                      <div className='flex w-full items-center gap-2'>
                        <span
                          className='size-2.5 shrink-0 rounded-[2px]'
                          style={{ background: item.color }}
                        />
                        <span className='text-muted-foreground'>
                          {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                        </span>
                        <span className='ml-auto font-mono font-medium tabular-nums text-foreground'>
                          {formatCAD(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey='income' fill='var(--color-income)' radius={[4, 4, 0, 0]} />
              <Bar dataKey='expense' fill='var(--color-expense)' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className='flex h-[280px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground'>
      {message}
    </div>
  );
}
