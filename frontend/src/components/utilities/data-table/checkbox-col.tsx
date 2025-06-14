'use client';
import { Checkbox } from '@/components/ui/checkbox';
import { Table } from '@tanstack/react-table';
import React from 'react';

type DataTableCheckBoxColProps<TData> = {
  table: Table<TData>;
};

export const DataTableCheckBoxCol = <TData,>({
  table,
}: DataTableCheckBoxColProps<TData>) => {
  return (
    <Checkbox
      checked={
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() && 'indeterminate')
      }
      onCheckedChange={(value) =>
        table.toggleAllPageRowsSelected(!!value)
      }
      aria-label='Select all'
    />
  );
};
