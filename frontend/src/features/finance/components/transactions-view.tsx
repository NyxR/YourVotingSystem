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
import { enCA, frCA } from 'date-fns/locale';
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
import { fmt } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { deleteTransaction } from '../actions/transactions.actions';
import { downloadCsv, transactionsToCsv } from '../csv';
import {
  NO_CATEGORY,
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
  const { t, intl, locale } = useI18n();
  const dateLocale = locale === 'fr' ? frCA : enCA;
  const money = (cents: number) => formatCAD(cents, intl);
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(defaultRange));
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionRow | undefined>();
  const [deleting, setDeleting] = useState<TransactionRow | null>(null);

  // Pagination is owned here and reset to page 1 from the filter handlers.
  // (TanStack's autoResetPageIndex schedules a state update that can fire
  // before mount, which React warns about.)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const toFirstPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    toFirstPage();
  };
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(defaultFilters(defaultRange));

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filters.type !== ALL && tx.type !== filters.type) return false;
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(tx.categoryId ?? NO_CATEGORY)
      ) {
        return false;
      }
      if (filters.from && tx.date < filters.from) return false;
      if (filters.to && tx.date > filters.to) return false;
      if (q) {
        const haystack =
          `${tx.description} ${tx.reference ?? ''} ${tx.categoryName ?? ''} ${tx.createdByName ?? ''} ${tx.updatedByName ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, filters]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.type === 'INCOME') income += tx.amountCents;
      else expense += tx.amountCents;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const columns = useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        accessorKey: 'date',
        header: ({ column }) => <SortableHeader column={column} title={t.transactions.colDate} />,
        cell: ({ row }) => (
          <span className='whitespace-nowrap'>{formatDay(row.original.date, {}, intl)}</span>
        ),
      },
      {
        accessorKey: 'description',
        header: t.transactions.colDescription,
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
        header: ({ column }) => <SortableHeader column={column} title={t.transactions.colCategory} />,
        cell: ({ row }) =>
          row.original.categoryName ? (
            <Badge variant='outline' className='text-muted-foreground'>
              {row.original.categoryName}
            </Badge>
          ) : (
            <span className='text-sm text-muted-foreground'>{t.common.uncategorized}</span>
          ),
      },
      {
        accessorKey: 'paymentMethod',
        header: t.transactions.colMethod,
        cell: ({ row }) => (
          <span className='whitespace-nowrap text-muted-foreground'>
            {t.paymentMethods[row.original.paymentMethod]}
          </span>
        ),
      },
      {
        id: 'recordedBy',
        accessorFn: (r) => r.createdByName ?? '',
        header: ({ column }) => <SortableHeader column={column} title={t.transactions.colRecordedBy} />,
        cell: ({ row }) => {
          const tx = row.original;
          const when = (iso: string) => format(new Date(iso), 'PPp', { locale: dateLocale });
          const removed = t.transactions.removedUserLower;
          const created = fmt(t.transactions.createdByOn, {
            name: tx.createdByName ?? removed,
            date: when(tx.createdAt),
          });
          const edited = tx.editedAt
            ? fmt(t.transactions.editedByOn, {
                name: tx.updatedByName ?? removed,
                date: when(tx.editedAt),
              })
            : null;
          return (
            <div className='flex flex-col' title={edited ? `${created}\n${edited}` : created}>
              <span className={cn('whitespace-nowrap', !tx.createdByName && 'text-muted-foreground')}>
                {tx.createdByName ?? t.common.removedUser}
              </span>
              {tx.editedAt && (
                <span className='text-xs whitespace-nowrap text-muted-foreground'>
                  {fmt(t.transactions.editedBy, {
                    name: tx.updatedByName ?? removed,
                    when: formatDistanceToNow(new Date(tx.editedAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    }),
                  })}
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
          <SortableHeader column={column} title={t.transactions.colAmount} align='right' />
        ),
        meta: { align: 'right' },
        cell: ({ row }) => (
          <Amount cents={row.original.amountCents} type={row.original.type} />
        ),
      },
      {
        id: 'receipt',
        header: () => <span className='sr-only'>{t.transactions.colReceipt}</span>,
        cell: ({ row }) =>
          row.original.hasReceipt ? (
            <Button variant='ghost' size='icon' className='size-8' asChild>
              <a
                href={`/main/transactions/${row.original.id}/receipt`}
                target='_blank'
                rel='noreferrer'
                title={t.transactions.openReceipt}
              >
                <PaperclipIcon />
                <span className='sr-only'>{t.transactions.openReceipt}</span>
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
                      <span className='sr-only'>{t.common.openMenu}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-36'>
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(row.original);
                        setFormOpen(true);
                      }}
                    >
                      {t.common.edit}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant='destructive'
                      onSelect={() => setDeleting(row.original)}
                    >
                      {t.common.delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            } satisfies ColumnDef<TransactionRow>,
          ]
        : []),
    ],
    [canEdit, t, intl, dateLocale],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, pagination },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
  });

  const exportCsv = () => {
    const rows = table.getSortedRowModel().rows.map((r) => r.original);
    if (!rows.length) {
      toast.info(t.transactions.nothingToExport);
      return;
    }
    downloadCsv(`${t.csv.filename}-${todayISO()}.csv`, transactionsToCsv(rows, t));
  };

  // Changing the type drops selected categories that belong to the other type.
  const changeType = (type: string) => {
    toFirstPage();
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
  };

  return (
    <div className='flex flex-col gap-4 px-4 lg:px-6'>
      {/* Toolbar */}
      <div className='flex flex-col gap-3 rounded-lg border p-3'>
        <div className='flex flex-wrap items-end gap-3'>
          <div className='relative min-w-48 flex-1'>
            <SearchIcon className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder={t.transactions.searchPlaceholder}
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className='pl-8'
              aria-label={t.transactions.searchLabel}
            />
          </div>
          <Select value={filters.type} onValueChange={changeType}>
            <SelectTrigger className='w-36' aria-label={t.transactions.type}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t.transactions.allTypes}</SelectItem>
              <SelectItem value='INCOME'>{t.transactions.incomeFilter}</SelectItem>
              <SelectItem value='EXPENSE'>{t.transactions.expensesFilter}</SelectItem>
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
              {t.common.from}
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
              {t.common.to}
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
          <SummaryPill
            label={t.transactions.incomeFilter}
            value={money(totals.income)}
            className='text-income-text'
          />
          <SummaryPill
            label={t.transactions.expensesFilter}
            value={money(totals.expense)}
            className='text-expense-text'
          />
          <SummaryPill
            label={t.transactions.net}
            value={(totals.net < 0 ? '−' : '') + money(Math.abs(totals.net))}
          />
          <div className='ml-auto flex items-center gap-2'>
            {isFiltered && (
              <Button variant='ghost' size='sm' onClick={() => {
                  setFilters(defaultFilters(defaultRange));
                  toFirstPage();
                }}>
                <FilterXIcon /> {t.transactions.resetFilters}
              </Button>
            )}
            <Button variant='outline' size='sm' onClick={exportCsv}>
              <DownloadIcon /> {t.transactions.exportCsv}
            </Button>
            {canEdit && (
              <Button
                size='sm'
                onClick={() => {
                  setEditing(undefined);
                  setFormOpen(true);
                }}
              >
                <PlusIcon /> {t.transactions.newTransaction}
              </Button>
            )}
          </div>
        </div>
      </div>

      <DataTable
        table={table}
        emptyMessage={
          transactions.length
            ? t.transactions.noMatch
            : canEdit
              ? t.transactions.emptyCanEdit
              : t.transactions.empty
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
            title={t.transactions.deleteTitle}
            description={
              deleting && (
                fmt(
                  deleting.hasReceipt
                    ? t.transactions.deleteDescriptionReceipt
                    : t.transactions.deleteDescription,
                  {
                    description: deleting.description,
                    amount: money(deleting.amountCents),
                    date: formatDay(deleting.date, {}, intl),
                  },
                )
              )
            }
            onConfirm={async () => {
              if (!deleting) return;
              const result = await deleteTransaction(deleting.id);
              if (result.success) toast.success(t.transactions.deleted);
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
