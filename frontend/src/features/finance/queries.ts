// Server-only read helpers for finance pages. Deliberately *not* a
// 'use server' module, so none of these become publicly callable actions.

import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { addDays, dateToISO, isoToDate, monthStart, todayISO } from '@/lib/dates';
import type {
  CategoryOption,
  CategoryRow,
  TransactionRow,
  TransactionType,
} from './schemas';

const transactionInclude = {
  category: { select: { name: true } },
  createdBy: { select: { username: true } },
  updatedBy: { select: { username: true } },
} as const;

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: typeof transactionInclude;
}>;

function toRow(t: TransactionWithRelations): TransactionRow {
  return {
    id: t.id,
    type: t.type,
    amountCents: t.amountCents,
    date: dateToISO(t.date),
    description: t.description,
    paymentMethod: t.paymentMethod,
    reference: t.reference,
    hasReceipt: !!t.receiptPath,
    categoryId: t.categoryId,
    categoryName: t.category?.name ?? null,
    createdByName: t.createdBy?.username ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedByName: t.updatedBy?.username ?? null,
    editedAt: t.updatedById ? t.updatedAt.toISOString() : null,
  };
}

export async function getTransactions(): Promise<TransactionRow[]> {
  const rows = await prisma.transaction.findMany({
    include: transactionInclude,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map(toRow);
}

export async function getCategoryOptions(): Promise<CategoryOption[]> {
  return prisma.category.findMany({
    select: { id: true, name: true, type: true },
    orderBy: { name: 'asc' },
  });
}

export async function getCategoriesWithCounts(): Promise<CategoryRow[]> {
  const rows = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      _count: { select: { transactions: true } },
    },
    orderBy: { name: 'asc' },
  });
  return rows.map(({ _count, ...c }) => ({
    ...c,
    transactionCount: _count.transactions,
  }));
}

// ─── Dashboard ────────────────────────────────────────────────

export type DailyTotal = { date: string; income: number; expense: number };

/** Total per category (cents), largest first. `name` is null for uncategorized. */
export type CategoryTotal = { name: string | null; amount: number };

export type DateRange = { from: string; to: string };

/** First and last day of the month containing `today`. */
export function currentMonthRange(today: string): DateRange {
  return { from: monthStart(today), to: addDays(monthStart(today, 1), -1) };
}

/** Income or expenses summed per category for an inclusive yyyy-MM-dd range. */
export async function getTotalsByCategory(
  type: TransactionType,
  { from, to }: DateRange,
): Promise<CategoryTotal[]> {
  const [groups, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { type, date: { gte: isoToDate(from), lte: isoToDate(to) } },
      _sum: { amountCents: true },
    }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);
  const names = new Map(categories.map((c) => [c.id, c.name]));
  return groups
    .map((g) => ({
      name: (g.categoryId && names.get(g.categoryId)) || null,
      amount: g._sum.amountCents ?? 0,
    }))
    .filter((g) => g.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Income/expense totals per day (cents) from `from` onward, up to `to` when
 * given. Days without transactions are omitted.
 */
export async function getDailyTotals({ from, to }: { from: string; to?: string }): Promise<DailyTotal[]> {
  const rows = await prisma.transaction.groupBy({
    by: ['date', 'type'],
    where: { date: { gte: isoToDate(from), ...(to ? { lte: isoToDate(to) } : {}) } },
    _sum: { amountCents: true },
  });
  const byDate = new Map<string, DailyTotal>();
  for (const row of rows) {
    const date = dateToISO(row.date);
    const entry = byDate.get(date) ?? { date, income: 0, expense: 0 };
    const amount = row._sum.amountCents ?? 0;
    if (row.type === 'INCOME') entry.income += amount;
    else entry.expense += amount;
    byDate.set(date, entry);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export type DashboardData = {
  today: string;
  balance: number;
  thisMonth: { income: number; expense: number };
  lastMonth: { income: number; expense: number };
  /** Per-day totals (cents) from `dailySince` onward (last 12 calendar months). */
  daily: DailyTotal[];
  dailySince: string;
  /** Default range of the by-category charts, and their data. */
  categoryRange: DateRange;
  incomeByCategory: CategoryTotal[];
  expensesByCategory: CategoryTotal[];
  recent: TransactionRow[];
  transactionCount: number;
};

export async function getDashboardData(): Promise<DashboardData> {
  const today = todayISO();
  const windowStart = monthStart(today, -11);
  const categoryRange = currentMonthRange(today);

  const [totals, daily, incomeByCategory, expensesByCategory, recent, transactionCount] =
    await Promise.all([
      prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amountCents: true },
      }),
      getDailyTotals({ from: windowStart }),
      getTotalsByCategory('INCOME', categoryRange),
      getTotalsByCategory('EXPENSE', categoryRange),
      prisma.transaction.findMany({
        include: transactionInclude,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 8,
      }),
      prisma.transaction.count(),
    ]);

  const sumOf = (type: TransactionType) =>
    totals.find((t) => t.type === type)?._sum.amountCents ?? 0;


  const thisMonthStart = monthStart(today);
  const nextMonthStart = monthStart(today, 1);
  const lastMonthStart = monthStart(today, -1);
  const thisMonth = { income: 0, expense: 0 };
  const lastMonth = { income: 0, expense: 0 };
  for (const d of daily) {
    // Future-dated entries in the current month still count toward it.
    const bucket =
      d.date >= thisMonthStart && d.date < nextMonthStart
        ? thisMonth
        : d.date >= lastMonthStart && d.date < thisMonthStart
          ? lastMonth
          : null;
    if (bucket) {
      bucket.income += d.income;
      bucket.expense += d.expense;
    }
  }

  return {
    today,
    balance: sumOf('INCOME') - sumOf('EXPENSE'),
    thisMonth,
    lastMonth,
    daily,
    dailySince: windowStart,
    categoryRange,
    incomeByCategory,
    expensesByCategory,
    recent: recent.map(toRow),
    transactionCount,
  };
}
