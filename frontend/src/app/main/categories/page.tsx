import type { Metadata } from 'next';
import { can, requireUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { getCategoriesWithCounts } from '@/features/finance/queries';
import { CategoriesView } from '@/features/finance/components/categories-view';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.categories };
}

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await getCategoriesWithCounts();

  return <CategoriesView categories={categories} canEdit={can.editFinance(user)} />;
}
