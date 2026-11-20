"use client";

import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Loader2Icon } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCAD, formatCADCompact } from "@/lib/money";
import { addDays, formatDay, isoToDate, monthStart } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import type { Messages } from "@/i18n/messages/en";
import { fetchDailyTotals } from "../actions/reports.actions";
import type { DailyTotal, DateRange } from "../queries";

/** Preset ranges and the message key of their label. */
import {
  chartActionClass,
  chartHeaderClass,
  dateFieldClass,
  dateInputClass,
  dateRowClass,
  dateRowExtraClass,
} from "./chart-header-layout";

const PRESETS = {
  "12m": "last12Months",
  "3m": "last3Months",
  "30d": "last30Days",
} as const satisfies Record<string, keyof Messages["charts"]>;
type Preset = keyof typeof PRESETS;
const CUSTOM = "custom";

/** Monday of the week containing `iso`. */
function weekStart(iso: string) {
  const day = isoToDate(iso).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((day + 6) % 7));
}

function presetRange(preset: Preset, today: string): DateRange {
  switch (preset) {
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "3m":
      return { from: addDays(weekStart(today), -7 * 12), to: today };
    case "12m":
      return { from: monthStart(today, -11), to: today };
  }
}

function daysBetween(from: string, to: string) {
  return (
    Math.round(
      (isoToDate(to).getTime() - isoToDate(from).getTime()) / 86_400_000,
    ) + 1
  );
}

type Granularity = "day" | "week" | "month";

/** Bar size that keeps the chart readable for the range's length. */
function granularityFor({ from, to }: DateRange): Granularity {
  const days = daysBetween(from, to);
  if (days <= 62) return "day";
  if (days <= 190) return "week";
  return "month";
}

type Bucket = {
  key: string;
  label: string;
  tooltip: string;
  income: number;
  expense: number;
};

/** Evenly spaced, gap-filled buckets covering the range; only in-range days count. */
function bucketize(
  daily: DailyTotal[],
  range: DateRange,
  t: Messages,
  intl: string,
): Bucket[] {
  const granularity = granularityFor(range);
  const multiYear = range.from.slice(0, 4) !== range.to.slice(0, 4);
  const buckets: Bucket[] = [];
  let keyOf: (iso: string) => string;

  if (granularity === "day") {
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
      buckets.push({
        key: d,
        label: formatDay(d, { year: multiYear ? "2-digit" : undefined }, intl),
        tooltip: formatDay(d, { weekday: "short" }, intl),
        income: 0,
        expense: 0,
      });
    }
    keyOf = (iso) => iso;
  } else if (granularity === "week") {
    for (let w = weekStart(range.from); w <= range.to; w = addDays(w, 7)) {
      buckets.push({
        key: w,
        label: formatDay(w, { year: multiYear ? "2-digit" : undefined }, intl),
        tooltip: fmt(t.charts.weekOf, { date: formatDay(w, {}, intl) }),
        income: 0,
        expense: 0,
      });
    }
    keyOf = weekStart;
  } else {
    for (let m = monthStart(range.from); m <= range.to; m = monthStart(m, 1)) {
      buckets.push({
        key: m,
        label: formatDay(
          m,
          { month: "short", day: undefined, year: "2-digit" },
          intl,
        ),
        tooltip: formatDay(m, { month: "long", day: undefined }, intl),
        income: 0,
        expense: 0,
      });
    }
    keyOf = (iso) => monthStart(iso);
  }

  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const d of daily) {
    if (d.date < range.from || d.date > range.to) continue;
    const i = index.get(keyOf(d.date));
    if (i === undefined) continue;
    buckets[i].income += d.income;
    buckets[i].expense += d.expense;
  }
  return buckets;
}

function describeRange({ from, to }: DateRange, intl: string) {
  return `${formatDay(from, {}, intl)} – ${formatDay(to, {}, intl)}`;
}

export function IncomeExpenseChart({
  daily,
  dailySince,
  today,
}: {
  /** Per-day totals preloaded by the server, from `dailySince` onward. */
  daily: DailyTotal[];
  dailySince: string;
  today: string;
}) {
  const { t, intl } = useI18n();
  const chartConfig = {
    income: { label: t.charts.income, color: "var(--income)" },
    expense: { label: t.charts.expenses, color: "var(--expense)" },
  } satisfies ChartConfig;
  const [preset, setPreset] = useState<Preset | typeof CUSTOM>("12m");
  const [range, setRange] = useState<DateRange>(() =>
    presetRange("12m", today),
  );
  // Totals for a custom range older than the preloaded window.
  const [fetched, setFetched] = useState<DailyTotal[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const rangeError =
    !range.from || !range.to
      ? t.validation.rangeBoth
      : range.from > range.to
        ? t.validation.rangeOrder
        : null;

  const applyRange = async (
    next: DateRange,
    nextPreset: Preset | typeof CUSTOM,
  ) => {
    setPreset(nextPreset);
    setRange(next);
    setError(null);
    const id = ++latestRequest.current;
    if (!next.from || !next.to || next.from > next.to) return;

    // Preloaded data already covers ranges starting inside the last 12 months.
    if (next.from >= dailySince) {
      setFetched(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await fetchDailyTotals(next.from, next.to);
    if (id !== latestRequest.current) return;
    setLoading(false);
    if (result.success) setFetched(result.data);
    else setError(result.message);
  };

  const choosePreset = (value: string) => {
    if (!value || value === CUSTOM) return;
    void applyRange(presetRange(value as Preset, today), value as Preset);
  };

  const source = fetched ?? daily;
  const data = useMemo(
    () => (rangeError ? [] : bucketize(source, range, t, intl)),
    [source, range, rangeError, t, intl],
  );
  const totals = data.reduce(
    (acc, b) => ({
      income: acc.income + b.income,
      expense: acc.expense + b.expense,
    }),
    { income: 0, expense: 0 },
  );
  const isEmpty = totals.income === 0 && totals.expense === 0;
  const rangeLabel =
    preset === CUSTOM ? describeRange(range, intl) : t.charts[PRESETS[preset]];

  return (
    <Card className="@container/card">
      <CardHeader className={chartHeaderClass}>
        <CardTitle>{t.charts.incomeVsExpenses}</CardTitle>
        <CardDescription>
          {rangeError
            ? t.charts.chooseRange
            : fmt(t.charts.inOut, {
                range: rangeLabel,
                income: formatCAD(totals.income, intl),
                expense: formatCAD(totals.expense, intl),
              })}
        </CardDescription>
        {(rangeError || error) && (
          <p role="alert" className="text-sm text-destructive">
            {rangeError ?? error}
          </p>
        )}
        <CardAction
          className={cn(
            chartActionClass,
            "flex flex-col items-stretch gap-2 @[640px]/card:items-end",
          )}
        >
          <ToggleGroup
            type="single"
            value={preset === CUSTOM ? "" : preset}
            onValueChange={choosePreset}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[640px]/card:flex"
          >
            {(Object.keys(PRESETS) as Preset[]).map((p) => (
              <ToggleGroupItem key={p} value={p}>
                {t.charts[PRESETS[p]]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={preset} onValueChange={choosePreset}>
            <SelectTrigger
              className="flex w-full @[640px]/card:hidden"
              size="sm"
              aria-label={t.charts.timeRange}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {(Object.keys(PRESETS) as Preset[]).map((p) => (
                <SelectItem key={p} value={p} className="rounded-lg">
                  {t.charts[PRESETS[p]]}
                </SelectItem>
              ))}
              {preset === CUSTOM && (
                <SelectItem value={CUSTOM} className="rounded-lg">
                  {t.charts.customRange}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <div className={dateRowClass}>
            {loading && (
              <Loader2Icon
                className={cn(
                  dateRowExtraClass,
                  "mb-2 size-4 animate-spin text-muted-foreground @[640px]/card:mb-0",
                )}
                aria-label={t.common.loading}
              />
            )}
            <div className={dateFieldClass}>
              <Label
                htmlFor="cashflow-from"
                className="text-sm text-muted-foreground"
              >
                {t.common.from}
              </Label>
              <Input
                id="cashflow-from"
                type="date"
                className={dateInputClass}
                value={range.from}
                max={range.to || undefined}
                aria-invalid={!!rangeError && !!range.from}
                onChange={(e) =>
                  void applyRange({ ...range, from: e.target.value }, CUSTOM)
                }
              />
            </div>
            <div className={dateFieldClass}>
              <Label
                htmlFor="cashflow-to"
                className="text-sm text-muted-foreground"
              >
                {t.common.to}
              </Label>
              <Input
                id="cashflow-to"
                type="date"
                className={dateInputClass}
                value={range.to}
                min={range.from || undefined}
                aria-invalid={!!rangeError && !!range.to}
                onChange={(e) =>
                  void applyRange({ ...range, to: e.target.value }, CUSTOM)
                }
              />
            </div>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent
        className={cn(
          "px-2 pt-4 transition-opacity sm:px-6 sm:pt-6",
          loading && "opacity-50",
        )}
        aria-busy={loading}
      >
        {isEmpty ? (
          <EmptyChart message={t.charts.noTransactions} />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[280px] w-full"
          >
            <BarChart
              data={data}
              barGap={2}
              barCategoryGap={data.length > 40 ? "15%" : "25%"}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v: number) => formatCADCompact(v, intl)}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.tooltip ?? ""
                    }
                    formatter={(value, name, item) => (
                      <div className="flex w-full items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-[2px]"
                          style={{ background: item.color }}
                        />
                        <span className="text-muted-foreground">
                          {chartConfig[name as keyof typeof chartConfig]
                            ?.label ?? name}
                        </span>
                        <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                          {formatCAD(Number(value), intl)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="income"
                fill="var(--color-income)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                fill="var(--color-expense)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  );
}
