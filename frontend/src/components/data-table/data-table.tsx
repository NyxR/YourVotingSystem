'use client';

import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpDownIcon,
} from 'lucide-react';
import type { Column } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { fmt } from '@/i18n/config';
import { useI18n } from '@/i18n/client';

/**
 * Renders a TanStack table with the dashboard template's styling plus
 * pagination controls. Callers own the `useReactTable` instance.
 */
export function DataTable<TData>({
  table,
  emptyMessage,
  footer,
}: {
  table: TanstackTable<TData>;
  emptyMessage?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { t } = useI18n();
  const columnCount = table.getVisibleLeafColumns().length;
  const pageCount = Math.max(table.getPageCount(), 1);

  return (
    <div className='flex flex-col gap-4'>
      <div className='overflow-hidden rounded-lg border'>
        <Table>
          <TableHeader className='sticky top-0 z-10 bg-muted'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      header.column.columnDef.meta?.align === 'right' &&
                        'text-right',
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.columnDef.meta?.align === 'right' &&
                          'text-right',
                        cell.column.columnDef.meta?.className,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className='h-24 text-center text-muted-foreground'
                >
                  {emptyMessage ?? t.common.noResults}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {footer}
        </Table>
      </div>

      <div className='flex items-center justify-between px-2'>
        <div className='hidden flex-1 text-sm text-muted-foreground lg:flex'>
          {fmt(t.common.rows, { count: table.getFilteredRowModel().rows.length })}
        </div>
        <div className='flex w-full items-center gap-8 lg:w-fit'>
          <div className='hidden items-center gap-2 lg:flex'>
            <Label htmlFor='rows-per-page' className='text-sm font-medium'>
              {t.common.rowsPerPage}
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size='sm' className='w-20' id='rows-per-page'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent side='top'>
                <SelectGroup>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className='flex w-fit items-center justify-center text-sm font-medium'>
            {fmt(t.common.pageOf, {
              page: table.getState().pagination.pageIndex + 1,
              total: pageCount,
            })}
          </div>
          <div className='ml-auto flex items-center gap-2 lg:ml-0'>
            <Button
              variant='outline'
              className='hidden size-8 p-0 lg:flex'
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className='sr-only'>{t.common.firstPage}</span>
              <ChevronsLeftIcon />
            </Button>
            <Button
              variant='outline'
              className='size-8'
              size='icon'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className='sr-only'>{t.common.previousPage}</span>
              <ChevronLeftIcon />
            </Button>
            <Button
              variant='outline'
              className='size-8'
              size='icon'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className='sr-only'>{t.common.nextPage}</span>
              <ChevronRightIcon />
            </Button>
            <Button
              variant='outline'
              className='hidden size-8 lg:flex'
              size='icon'
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className='sr-only'>{t.common.lastPage}</span>
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Clickable column header that toggles sorting. */
export function SortableHeader<TData>({
  column,
  title,
  align,
}: {
  column: Column<TData>;
  title: string;
  align?: 'right';
}) {
  const sorted = column.getIsSorted();
  const Icon =
    sorted === 'asc' ? ArrowUpIcon : sorted === 'desc' ? ArrowDownIcon : ChevronsUpDownIcon;
  return (
    <Button
      variant='ghost'
      size='sm'
      className={cn('-ml-2 h-8', align === 'right' && '-mr-2 ml-auto flex')}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {title}
      <Icon className='size-3.5 text-muted-foreground' />
    </Button>
  );
}
