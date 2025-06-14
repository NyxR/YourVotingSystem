'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  PaginationTable,
  DataTableLoading,
} from '@/components/utilities/data-table';

import { OctagonX, OctagonAlert } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  error?: boolean;
  error_message?: string;
  loading?: boolean;
}

export const DataTable = <TData, TValue>({
  columns,
  data,
  error,
  error_message,
  loading,
}: DataTableProps<TData, TValue>) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className='w-full h-[450px] flex flex-col gap-4'>
      <div className='rounded-md border flex flex-col flex-2/3 overflow-hidden'>
        <Table>
          <TableHeader className='sticky top-0 z-10 shadow-md bg-accent'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {!loading && table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-[200px] text-center'
                >
                  <DataTableLoading
                    error={error}
                    error_message={error_message}
                    loading={loading}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className='flex justify-between'>
        <div className='flex items-center justify-center text-sm text-secondary'>
          {table.getSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} rows selected
        </div>
        <div className='flex'>
          <PaginationTable table={table} />
        </div>
      </div>
    </div>
  );
};
