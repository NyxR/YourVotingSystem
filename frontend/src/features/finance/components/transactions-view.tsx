"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { DATE_FNS_LOCALES } from "@/i18n/date-locale";
import {
  DownloadIcon,
  EllipsisVerticalIcon,
  FilterXIcon,
  Loader2Icon,
  PaperclipIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable, SortableHeader } from "@/components/data-table/data-table";
import { formatCAD } from "@/lib/money";
import { formatDay, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { deleteTransaction } from "../actions/transactions.actions";
import { downloadCsv, transactionsToCsv } from "../csv";
import {
  NO_CATEGORY,
  type CategoryOption,
  type TransactionRow,
  type TransactionType,
} from "../schemas";
import type { DateRange } from "../queries";
import { Amount } from "./amount";
import { CategoryFilter } from "./category-filter";
import { TransactionFormDialog } from "./transaction-form-dialog";

const ALL = "all";

/** In-page filters. The date range lives in the URL and is applied by the server. */
type Filters = {
  search: string;
  type: string;
  /** Selected category ids (may include NO_CATEGORY); empty = all. */
  categories: string[];
};
const DEFAULT_FILTERS: Filters = { search: "", type: ALL, categories: [] };

export function TransactionsView({
  transactions,
  categories,
  canEdit,
  range,
  defaultRange,
}: {
  /** Only the transactions inside `range` (loaded by the server). */
  transactions: TransactionRow[];
  categories: CategoryOption[];
  canEdit: boolean;
  /** Current From/To from the URL; an empty side means "no limit". */
  range: DateRange;
  /** First to last day of the current month (used when the URL has no dates). */
  defaultRange: DateRange;
}) {
  const { t, intl, locale } = useI18n();
  const dateLocale = DATE_FNS_LOCALES[locale];
  const money = (cents: number) => formatCAD(cents, intl);
  const router = useRouter();
  const pathname = usePathname();
  const [loadingRange, startRangeChange] = useTransition();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // The date inputs edit a draft so typing stays smooth while the new range
  // loads; the draft follows the URL when it changes (e.g. Back button).
  const [draft, setDraft] = useState<DateRange>(range);
  const [syncedRange, setSyncedRange] = useState<DateRange>(range);
  if (range.from !== syncedRange.from || range.to !== syncedRange.to) {
    setSyncedRange(range);
    setDraft(range);
  }
  const rangeError =
    draft.from && draft.to && draft.from > draft.to
      ? t.validation.rangeOrder
      : null;
  const isAllTime = !range.from && !range.to;
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
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
  const isFiltered =
    JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS) ||
    range.from !== defaultRange.from ||
    range.to !== defaultRange.to;

  /** Puts a range in the URL (null = no dates, i.e. this month); the server reloads the rows. */
  const goToRange = (next: DateRange | null) => {
    toFirstPage();
    startRangeChange(() => {
      const query = next
        ? `?${new URLSearchParams({ from: next.from, to: next.to })}`
        : "";
      router.replace(`${pathname}${query}`, { scroll: false });
    });
  };
  const changeDate = (key: keyof DateRange, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (next.from && next.to && next.from > next.to) return; // shown as an error instead
    goToRange(next);
  };

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
      if (q) {
        const haystack =
          `${tx.description} ${tx.reference ?? ""} ${tx.categoryName ?? ""} ${tx.createdByName ?? ""} ${tx.updatedByName ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, filters]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.type === "INCOME") income += tx.amountCents;
      else expense += tx.amountCents;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const columns = useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => (
          <SortableHeader column={column} title={t.transactions.colDate} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatDay(row.original.date, {}, intl)}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: t.transactions.colDescription,
        cell: ({ row }) => (
          <div className="flex max-w-[22rem] flex-col">
            <span className="truncate font-medium">
              {row.original.description}
            </span>
            {row.original.reference && (
              <span className="truncate text-xs text-muted-foreground">
                Ref. {row.original.reference}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "category",
        accessorFn: (r) => r.categoryName ?? "",
        header: ({ column }) => (
          <SortableHeader column={column} title={t.transactions.colCategory} />
        ),
        cell: ({ row }) =>
          row.original.categoryName ? (
            <Badge variant="outline" className="text-muted-foreground">
              {row.original.categoryName}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">
              {t.common.uncategorized}
            </span>
          ),
      },
      {
        accessorKey: "paymentMethod",
        header: t.transactions.colMethod,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {t.paymentMethods[row.original.paymentMethod]}
          </span>
        ),
      },
      {
        id: "recordedBy",
        accessorFn: (r) => r.createdByName ?? "",
        header: ({ column }) => (
          <SortableHeader
            column={column}
            title={t.transactions.colRecordedBy}
          />
        ),
        cell: ({ row }) => {
          const tx = row.original;
          const when = (iso: string) =>
            format(new Date(iso), "PPp", { locale: dateLocale });
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
            <div
              className="flex flex-col"
              title={edited ? `${created}\n${edited}` : created}
            >
              <span
                className={cn(
                  "whitespace-nowrap",
                  !tx.createdByName && "text-muted-foreground",
                )}
              >
                {tx.createdByName ?? t.common.removedUser}
              </span>
              {tx.editedAt && (
                <span className="text-xs whitespace-nowrap text-muted-foreground">
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
        id: "amount",
        accessorFn: (r) =>
          r.type === "INCOME" ? r.amountCents : -r.amountCents,
        header: ({ column }) => (
          <SortableHeader
            column={column}
            title={t.transactions.colAmount}
            align="right"
          />
        ),
        meta: { align: "right" },
        cell: ({ row }) => (
          <Amount cents={row.original.amountCents} type={row.original.type} />
        ),
      },
      {
        id: "receipt",
        header: () => (
          <span className="sr-only">{t.transactions.colReceipt}</span>
        ),
        cell: ({ row }) =>
          row.original.hasReceipt ? (
            <Button variant="ghost" size="icon" className="size-8" asChild>
              <a
                href={`/main/transactions/${row.original.id}/receipt`}
                target="_blank"
                rel="noreferrer"
                title={t.transactions.openReceipt}
              >
                <PaperclipIcon />
                <span className="sr-only">{t.transactions.openReceipt}</span>
              </a>
            </Button>
          ) : null,
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              cell: ({ row }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground data-[state=open]:bg-muted"
                    >
                      <EllipsisVerticalIcon />
                      <span className="sr-only">{t.common.openMenu}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
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
                      variant="destructive"
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
    downloadCsv(
      `${t.csv.filename}-${todayISO()}.csv`,
      transactionsToCsv(rows, t),
    );
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
              (id) =>
                id === NO_CATEGORY ||
                categories.find((c) => c.id === id)?.type === type,
            ),
    }));
  };

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border p-3">
        {/* Phones: a two-column grid (search, then type + categories, then
            dates) so nothing overflows; wider screens: one wrapping row. */}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <div className="relative col-span-2 min-w-48 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t.transactions.searchPlaceholder}
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              className="pl-8"
              aria-label={t.transactions.searchLabel}
            />
          </div>
          <Select value={filters.type} onValueChange={changeType}>
            <SelectTrigger
              className="w-full min-w-0 sm:w-36"
              aria-label={t.transactions.type}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t.transactions.allTypes}</SelectItem>
              <SelectItem value="INCOME">
                {t.transactions.incomeFilter}
              </SelectItem>
              <SelectItem value="EXPENSE">
                {t.transactions.expensesFilter}
              </SelectItem>
            </SelectContent>
          </Select>
          <CategoryFilter
            className="w-full min-w-0 sm:w-48"
            categories={categories}
            selected={filters.categories}
            onChange={(ids) => setFilter("categories", ids)}
            onlyType={
              filters.type === ALL
                ? undefined
                : (filters.type as TransactionType)
            }
          />
          <div className="col-span-2 grid grid-cols-2 gap-x-2 gap-y-2 sm:flex sm:items-center">
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <Label
                htmlFor="tx-from"
                className="text-sm text-muted-foreground"
              >
                {t.common.from}
              </Label>
              <Input
                id="tx-from"
                type="date"
                className="w-full sm:w-38"
                value={draft.from}
                max={draft.to || undefined}
                aria-invalid={!!rangeError}
                onChange={(e) => changeDate("from", e.target.value)}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <Label htmlFor="tx-to" className="text-sm text-muted-foreground">
                {t.common.to}
              </Label>
              <Input
                id="tx-to"
                type="date"
                className="w-full sm:w-38"
                value={draft.to}
                min={draft.from || undefined}
                aria-invalid={!!rangeError}
                onChange={(e) => changeDate("to", e.target.value)}
              />
            </div>
            {(!isAllTime || loadingRange) && (
              <div className="col-span-2 flex items-center gap-2">
                {!isAllTime && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToRange({ from: "", to: "" })}
                  >
                    {t.transactions.allTime}
                  </Button>
                )}
                {loadingRange && (
                  <Loader2Icon
                    className="size-4 animate-spin text-muted-foreground"
                    aria-label={t.common.loading}
                  />
                )}
              </div>
            )}
          </div>
        </div>
        {rangeError && (
          <p role="alert" className="text-sm text-destructive">
            {rangeError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <SummaryPill
            label={t.transactions.incomeFilter}
            value={money(totals.income)}
            className="text-income-text"
          />
          <SummaryPill
            label={t.transactions.expensesFilter}
            value={money(totals.expense)}
            className="text-expense-text"
          />
          <SummaryPill
            label={t.transactions.net}
            value={(totals.net < 0 ? "−" : "") + money(Math.abs(totals.net))}
          />
          <div className="ml-auto flex items-center gap-2">
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  goToRange(null);
                }}
              >
                <FilterXIcon /> {t.transactions.resetFilters}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <DownloadIcon /> {t.transactions.exportCsv}
            </Button>
            {canEdit && (
              <Button
                size="sm"
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

      <div
        className={cn("transition-opacity", loadingRange && "opacity-50")}
        aria-busy={loadingRange}
      >
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
      </div>

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
              deleting &&
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
    <div className="flex items-baseline gap-1.5 rounded-md bg-muted px-2.5 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", className)}>
        {value}
      </span>
    </div>
  );
}
