import type { Metadata } from 'next';
import { can, requireUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { todayISO } from '@/lib/dates';
import {
  currentMonthRange,
  getCategoryOptions,
  getTransactions,
} from '@/features/finance/queries';
import { TransactionsView } from '@/features/finance/components/transactions-view';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.transactions };
}

export default async function TransactionsPage() {
  const user = await requireUser();
  const [transactions, categories] = await Promise.all([
    getTransactions(),
    getCategoryOptions(),
  ]);

  return (
    <TransactionsView
      transactions={transactions}
      categories={categories}
      canEdit={can.editFinance(user)}
      defaultRange={currentMonthRange(todayISO())}
    />
  );
}
