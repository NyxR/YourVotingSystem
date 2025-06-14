'use client';
import { Checkbox } from '@/components/ui/checkbox';
import { Row } from '@tanstack/react-table';
import React from 'react';

type DataTableCheckBoxRowProps<TData> = {
  row: Row<TData>;
};

export const DataTableCheckBoxRow = <TData,>({
  row,
}: DataTableCheckBoxRowProps<TData>) => {
  return (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label='Select row'
    />
  );
};
