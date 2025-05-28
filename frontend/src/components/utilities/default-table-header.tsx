import React from 'react';
import { User } from '@/lib/data';
import { HeaderContext } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';

type DefaultTableHeaderProps<T> = {
  info: HeaderContext<User, T>;
  name: string;
};

const DefaultTableHeader = <T,>({
  info,
  name,
}: DefaultTableHeaderProps<T>) => {
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
