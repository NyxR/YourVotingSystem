import React from 'react';
import { HeaderContext } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';

type DefaultTableHeaderProps<M, T> = {
  info: HeaderContext<M, T>;
  name: string;
};

const DefaultTableHeader = <M, T>({
  info,
  name,
}: DefaultTableHeaderProps<M, T>) => {
  return (
    <div
      className='flex w-full h-full items-center justify-start gap-1'
      onPointerDown={(e) => {
        e.preventDefault();
        info.column.toggleSorting(
          info.column.getIsSorted() === 'asc'
        );
      }}
    >
      {name}
      <ArrowUpDown className='w-4 h-4' />
    </div>
  );
};

export default DefaultTableHeader;
