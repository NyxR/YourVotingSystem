'use client';

import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CategoryOption } from '../schemas';
import { useI18n } from '@/i18n/client';
import { TransactionFormDialog } from './transaction-form-dialog';

export function NewTransactionButton({ categories }: { categories: CategoryOption[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size='sm' onClick={() => setOpen(true)}>
        <PlusIcon /> {t.transactions.newTransaction}
      </Button>
      <TransactionFormDialog open={open} onOpenChange={setOpen} categories={categories} />
    </>
  );
}
