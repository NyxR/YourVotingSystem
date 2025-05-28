import React from 'react';
import { HeaderContext } from '@tanstack/react-table';
import { User } from '@/lib/data';
import { Funnel } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

type SortingTableHeaderProps<T> = {
  info: HeaderContext<User, T>;
  name: string;
  options: T[];
};

const SortingTableHeader = <T,>({
  info,
  name,
  options,
}: SortingTableHeaderProps<T>) => {
  const column = info.column;
  const selected = (column.getFilterValue() as T[]) ?? [];
  const toggleSelected = (select: T) => {
    console.log('selected', selected);
    const update = selected.includes(select)
      ? selected.filter((s) => s !== select)
      : [...selected, select];
    console.log('updated', update);
    column.setFilterValue(update.length ? update : undefined);
  };
  return (
    <div className='flex w-full h-full items-center justify-start gap-1'>
      {name}
      <Popover>
        <PopoverTrigger>
          <Funnel className='w-3 h-3' />
        </PopoverTrigger>
        <PopoverContent className='max-w-44'>
          <div className='flex flex-col gap-2'>
            {options.map((option) => (
              <div
                key={`select_${option}`}
                className='flex items-center gap-2'
              >
                <Checkbox
                  id={`${option}`}
                  checked={selected.includes(option)}
                  onCheckedChange={() => toggleSelected(option)}
                />
                <label htmlFor={`${option}`} className='text-sm'>
                  {`${option}`}
                </label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SortingTableHeader;
