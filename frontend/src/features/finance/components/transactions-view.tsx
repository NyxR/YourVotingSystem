'use client';

import { useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import {
  DownloadIcon,
  EllipsisVerticalIcon,
  FilterXIcon,
  PaperclipIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, SortableHeader } from '@/components/data-table/data-table';
import { formatCAD } from '@/lib/money';
import { formatDay, todayISO } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { deleteTransaction } from '../actions/transactions.actions';
import { downloadCsv, transactionsToCsv } from '../csv';
import {
  NO_CATEGORY,
  PAYMENT_METHOD_LABELS,
  type CategoryOption,
  type TransactionRow,
  type TransactionType,
} from '../schemas';
import type { DateRange } from '../queries';
import { Amount } from './amount';
import { CategoryFilter } from './category-filter';
import { TransactionFormDialog } from './transaction-form-dialog';

const ALL = 'all';

type Filters = {
  search: string;
  type: string;
  /** Selected category ids (may include NO_CATEGORY); empty = all. */
  categories: string[];
  from: string;
  to: string;
};
/** Default filters: everything in the given date range (the current month). */
const defaultFilters = (range: DateRange): Filters => ({
  search: '',
  type: ALL,
  categories: [],
  from: range.from,
  to: range.to,
});

export function TransactionsView({
  transactions,
  categories,
  canEdit,
  defaultRange,
}: {
  transactions: TransactionRow[];
  categories: CategoryOption[];
  canEdit: boolean;
  /** Initial From/To filter: first to last day of the current month. */
  defaultRange: DateRange;
}) {
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(defaultRange));
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionRow | undefined>();
  const [deleting, setDeleting] = useState<TransactionRow | null>(null);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(defaultFilters(defaultRange));

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filters.type !== ALL && t.type !== filters.type) return false;
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(t.categoryId ?? NO_CATEGORY)
      ) {
        return false;
      }
      if (filters.from && t.date < filters.from) return false;
      if (filters.to && t.date > filters.to) return false;
      if (q) {
        const haystack =
          `${t.description} ${t.reference ?? ''} ${t.categoryName ?? ''} ${t.createdByName ?? ''} ${t.updatedByName ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, filters]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === 'INCOME') income += t.amountCents;
      else expense += t.amountCents;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const columns = useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        accessorKey: 'date',
        header: ({ column }) => <SortableHeader column={column} title='Date' />,
        cell: ({ row }) => (
          <span className='whitespace-nowrap'>{formatDay(row.original.date)}</span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <div className='flex max-w-[22rem] flex-col'>
            <span className='truncate font-medium'>{row.original.description}</span>
            {row.original.reference && (
              <span className='truncate text-xs text-muted-foreground'>
                Ref. {row.original.reference}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'category',
        accessorFn: (r) => r.categoryName ?? '',
        header: ({ column }) => <SortableHeader column={column} title='Category' />,
        cell: ({ row }) =>
          row.original.categoryName ? (
            <Badge variant='outline' className='text-muted-foreground'>
              {row.original.categoryName}
            </Badge>
          ) : (
            <span className='text-sm text-muted-foreground'>Uncategorized</span>
          ),
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Method',
        cell: ({ row }) => (
          <span className='whitespace-nowrap text-muted-foreground'>
            {PAYMENT_METHOD_LABELS[row.original.paymentMethod]}
          </span>
        ),
      },
      {
        id: 'recordedBy',
        accessorFn: (r) => r.createdByName ?? '',
        header: ({ column }) => <SortableHeader column={column} title='Recorded by' />,
        cell: ({ row }) => {
          const t = row.original;
          const created = `Created by ${t.createdByName ?? 'a removed user'} on ${format(new Date(t.createdAt), 'PPp')}`;
          const edited = t.editedAt
            ? `Last edited by ${t.updatedByName ?? 'a removed user'} on ${format(new Date(t.editedAt), 'PPp')}`
            : null;
          return (
            <div className='flex flex-col' title={edited ? `${created}\n${edited}` : created}>
              <span className={cn('whitespace-nowrap', !t.createdByName && 'text-muted-foreground')}>
                {t.createdByName ?? 'Removed user'}
              </span>
              {t.editedAt && (
                <span className='text-xs whitespace-nowrap text-muted-foreground'>
                  Edited by {t.updatedByName ?? 'removed user'} ·{' '}
                  {formatDistanceToNow(new Date(t.editedAt), { addSuffix: true })}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'amount',
        accessorFn: (r) => (r.type === 'INCOME' ? r.amountCents : -r.amountCents),
        header: ({ column }) => (
          <SortableHeader column={column} title='Amount' align='right' />
        ),
        meta: { align: 'right' },
        cell: ({ row }) => (
          <Amount cents={row.original.amountCents} type={row.original.type} />
        ),
      },
      {
        id: 'receipt',
        header: () => <span className='sr-only'>Receipt</span>,
        cell: ({ row }) =>
          row.original.hasReceipt ? (
            <Button variant='ghost' size='icon' className='size-8' asChild>
              <a
                href={`/main/transactions/${row.original.id}/receipt`}
                target='_blank'
                rel='noreferrer'
                title='Open receipt'
              >
                <PaperclipIcon />
                <span className='sr-only'>Open receipt</span>
              </a>
            </Button>
          ) : null,
      },
      ...(canEdit
        ? [
            {
              id: 'actions',
              cell: ({ row }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 text-muted-foreground data-[state=open]:bg-muted'
                    >
                      <EllipsisVerticalIcon />
                      <span className='sr-only'>Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-36'>
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(row.original);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant='destructive'
                      onSelect={() => setDeleting(row.original)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            } satisfies ColumnDef<TransactionRow>,
          ]
        : []),
    ],
    [canEdit],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
    initialState: { pagination: { pageSize: 20 } },
  });

  const exportCsv = () => {
    const rows = table.getSortedRowModel().rows.map((r) => r.original);
    if (!rows.length) {
      toast.info('Nothing to export with the current filters.');
      return;
    }
    downloadCsv(`transactions-${todayISO()}.csv`, transactionsToCsv(rows));
  };

  // Changing the type drops selected categories that belong to the other type.
  const changeType = (type: string) =>
    setFilters((f) => ({
      ...f,
      type,
      categories:
        type === ALL
          ? f.categories
          : f.categories.filter(
              (id) => id === NO_CATEGORY || categories.find((c) => c.id === id)?.type === type,
            ),
    }));

  return (
    <div className='flex flex-col gap-4 px-4 lg:px-6'>
      {/* Toolbar */}
      <div className='flex flex-col gap-3 rounded-lg border p-3'>
        <div className='flex flex-wrap items-end gap-3'>
          <div className='relative min-w-48 flex-1'>
            <SearchIcon className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search description, reference, category, person…'
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className='pl-8'
              aria-label='Search transactions'
            />
          </div>
          <Select value={filters.type} onValueChange={changeType}>
            <SelectTrigger className='w-36' aria-label='Type'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              <SelectItem value='INCOME'>Income</SelectItem>
              <SelectItem value='EXPENSE'>Expenses</SelectItem>
            </SelectContent>
          </Select>
          <CategoryFilter
            categories={categories}
            selected={filters.categories}
            onChange={(ids) => setFilter('categories', ids)}
            onlyType={filters.type === ALL ? undefined : (filters.type as TransactionType)}
          />
          <div className='flex items-center gap-2'>
            <Label htmlFor='tx-from' className='text-sm text-muted-foreground'>
              From
            </Label>
            <Input
              id='tx-from'
              type='date'
              className='w-38'
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => setFilter('from', e.target.value)}
            />
            <Label htmlFor='tx-to' className='text-sm text-muted-foreground'>
              To
            </Label>
            <Input
              id='tx-to'
              type='date'
              className='w-38'
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => setFilter('to', e.target.value)}
            />
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <SummaryPill label='Income' value={formatCAD(totals.income)} className='text-income-text' />
          <SummaryPill label='Expenses' value={formatCAD(totals.expense)} className='text-expense-text' />
          <SummaryPill
            label='Net'
            value={(totals.net < 0 ? '−' : '') + formatCAD(Math.abs(totals.net))}
          />
          <div className='ml-auto flex items-center gap-2'>
            {isFiltered && (
              <Button variant='ghost' size='sm' onClick={() => setFilters(defaultFilters(defaultRange))}>
                <FilterXIcon /> Reset filters
              </Button>
            )}
            <Button variant='outline' size='sm' onClick={exportCsv}>
              <DownloadIcon /> Export CSV
            </Button>
            {canEdit && (
              <Button
                size='sm'
                onClick={() => {
                  setEditing(undefined);
                  setFormOpen(true);
                }}
              >
                <PlusIcon /> New transaction
              </Button>
            )}
          </div>
        </div>
      </div>

      <DataTable
        table={table}
        emptyMessage={
          transactions.length
            ? 'No transactions match these filters.'
            : canEdit
              ? 'No transactions yet. Add the first one with "New transaction".'
              : 'No transactions yet.'
        }
      />

      {canEdit && (
        <>
          <TransactionFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            categories={categories}
            transaction={editing}
          />
          <ConfirmDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title='Delete this transaction?'
            description={
              deleting && (
                <>
                  “{deleting.description}” ({formatCAD(deleting.amountCents)} on{' '}
                  {formatDay(deleting.date)}) will be permanently deleted
                  {deleting.hasReceipt && ', along with its receipt'}.
                </>
              )
            }
            onConfirm={async () => {
              if (!deleting) return;
              const result = await deleteTransaction(deleting.id);
              if (result.success) toast.success('Transaction deleted');
              else {
                toast.error(result.message);
                return false;
              }
            }}
          />
        </>
      )}
    </div>
  );
}

function SummaryPill({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className='flex items-baseline gap-1.5 rounded-md bg-muted px-2.5 py-1 text-sm'>
      <span className='text-muted-foreground'>{label}</span>
      <span className={cn('font-semibold tabular-nums', className)}>{value}</span>
    </div>
  );
}
