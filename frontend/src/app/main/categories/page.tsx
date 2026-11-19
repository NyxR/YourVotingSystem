import type { Metadata } from 'next';
import { can, requireUser } from '@/lib/auth';
import { getCategoriesWithCounts } from '@/features/finance/queries';
import { CategoriesView } from '@/features/finance/components/categories-view';

export const metadata: Metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await getCategoriesWithCounts();

  return <CategoriesView categories={categories} canEdit={can.editFinance(user)} />;
}
