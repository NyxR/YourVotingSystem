import type { Metadata } from 'next';
import { can, requireUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { todayISO } from '@/lib/dates';
import {
  currentMonthRange,
  getCategoryOptions,
  getTransactions,
  type DateRange,
} from '@/features/finance/queries';
import { TransactionsView } from '@/features/finance/components/transactions-view';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.transactions };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A single, valid yyyy-MM-dd value from the query string, else ''. */
function dateParam(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  return v && ISO_DATE.test(v) ? v : '';
}

/**
 * The range comes from ?from=&to= so it survives refresh, Back/Forward and
 * bookmarks. No dates in the URL = the current month; empty values = no limit
 * ("All time"). Only that range is loaded from the database.
 */
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const defaultRange = currentMonthRange(todayISO());

  const hasRange = params.from !== undefined || params.to !== undefined;
  let range: DateRange = hasRange
    ? { from: dateParam(params.from), to: dateParam(params.to) }
    : defaultRange;
  // A reversed range can only come from a hand-edited URL; fall back safely.
  if (range.from && range.to && range.from > range.to) range = defaultRange;

  const [transactions, categories] = await Promise.all([
    getTransactions(range),
    getCategoryOptions(),
  ]);

  return (
    <TransactionsView
      transactions={transactions}
      categories={categories}
      canEdit={can.editFinance(user)}
      range={range}
      defaultRange={defaultRange}
    />
  );
}
