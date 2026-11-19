'use client';

import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CategoryOption } from '../schemas';
import { TransactionFormDialog } from './transaction-form-dialog';

export function NewTransactionButton({ categories }: { categories: CategoryOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size='sm' onClick={() => setOpen(true)}>
        <PlusIcon /> New transaction
      </Button>
      <TransactionFormDialog open={open} onOpenChange={setOpen} categories={categories} />
    </>
  );
}
