import type { Metadata } from 'next';
import { can, requireUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { getCategoryOptions, getDashboardData } from '@/features/finance/queries';
import { OverviewCards } from '@/features/finance/components/overview-cards';
import { IncomeExpenseChart } from '@/features/finance/components/income-expense-chart';
import { CategoryTotalsChart } from '@/features/finance/components/category-totals-chart';
import { RecentTransactions } from '@/features/finance/components/recent-transactions';
import { NewTransactionButton } from '@/features/finance/components/new-transaction-button';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.financeOverview };
}

export default async function FinanceOverviewPage() {
  const user = await requireUser();
  const canEdit = can.editFinance(user);
  const { t } = await getI18n();
  const [data, categories] = await Promise.all([
    getDashboardData(),
    canEdit ? getCategoryOptions() : Promise.resolve([]),
  ]);

  return (
    <>
      <div className='flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6'>
        <p className='text-sm text-muted-foreground'>{t.common.allAmountsCad}</p>
        {canEdit && <NewTransactionButton categories={categories} />}
      </div>
      <OverviewCards data={data} />
      <div className='px-4 lg:px-6'>
        <IncomeExpenseChart daily={data.daily} dailySince={data.dailySince} today={data.today} />
      </div>
      <div className='grid gap-4 px-4 md:gap-6 lg:px-6 @4xl/main:grid-cols-2'>
        <CategoryTotalsChart
          type='EXPENSE'
          initialData={data.expensesByCategory}
          defaultRange={data.categoryRange}
        />
        <CategoryTotalsChart
          type='INCOME'
          initialData={data.incomeByCategory}
          defaultRange={data.categoryRange}
        />
      </div>
      <div className='px-4 lg:px-6'>
        <RecentTransactions transactions={data.recent} />
      </div>
    </>
  );
}
