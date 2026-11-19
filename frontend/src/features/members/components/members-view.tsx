'use client';

import { useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { FilterXIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmt } from '@/i18n/config';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, SortableHeader } from '@/components/data-table/data-table';
import { PhoneLink } from '@/components/phone-link';
import { ResponsibilityBadges } from '@/components/responsibility-badges';
import {
  OPTIONAL_RESPONSIBILITIES,
  RESPONSIBILITY_LABELS,
  type Responsibility,
} from '@/lib/responsibilities';
import { useI18n } from '@/i18n/client';
import { MEMBER_TYPE_LABELS, MEMBER_TYPES } from '@/lib/member-types';
import { APP_TIMEZONE } from '@/lib/dates';
import type { MemberRow } from '../queries';

const ALL = 'all';
/** Filter value for people with no responsibility besides Mpiara-mivavaka. */
const NONE = 'none';

/** Text match on name/email, or digit match on the phone ("5551234"). */
function matchesSearch(text: string, phone: string | null | undefined, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (text.toLowerCase().includes(q)) return true;
  const digits = q.replace(/\D/g, '');
  return digits.length >= 3 && !!phone && phone.includes(digits);
}

/** A timestamp as a short date in the organization's time zone. */
function DateCell({ iso, intl }: { iso: string; intl: string }) {
  return (
    <span className='whitespace-nowrap text-muted-foreground'>
      {new Date(iso).toLocaleDateString(intl, {
        timeZone: APP_TIMEZONE,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}
    </span>
  );
}

/** Read-only member list: same table as Users, without role/status/sign-in. */
export function MembersView({
  members,
  showPhone,
}: {
  members: MemberRow[];
  /** Admins & treasurers only; the server omits numbers otherwise. */
  showPhone: boolean;
}) {
  const { t, intl } = useI18n();
  // Pagination is owned here and reset to page 1 from the filter handlers.
  // (TanStack's autoResetPageIndex schedules a state update that can fire
  // before mount, which React warns about.)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const withFirstPage =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    };
  const [search, setSearchState] = useState('');
  const setSearch = withFirstPage(setSearchState);
  const [type, setTypeState] = useState<string>(ALL);
  const setType = withFirstPage(setTypeState);
  const [responsibility, setResponsibilityState] = useState<string>(ALL);
  const setResponsibility = withFirstPage(setResponsibilityState);
  const isFiltered = search !== '' || type !== ALL || responsibility !== ALL;
  const [sorting, setSorting] = useState<SortingState>([]);

  const filtered = useMemo(
    () =>
      members.filter(
        (m) =>
          (type === ALL || m.memberType === type) &&
          (responsibility === ALL ||
            (responsibility === NONE
              ? !m.responsibilities.some((r) => OPTIONAL_RESPONSIBILITIES.includes(r))
              : m.responsibilities.includes(responsibility as Responsibility))),
      ),
    [members, type, responsibility],
  );

  const columns = useMemo<ColumnDef<MemberRow>[]>(
    () => [
      {
        accessorKey: 'username',
        header: ({ column }) => <SortableHeader column={column} title={t.members.colName} />,
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <span className='font-medium'>{row.original.username}</span>
            <span className='text-xs text-muted-foreground'>{row.original.email}</span>
          </div>
        ),
      },
      {
        accessorKey: 'memberType',
        header: ({ column }) => <SortableHeader column={column} title={t.members.colType} />,
        cell: ({ row }) => (
          <Badge variant={row.original.memberType === 'MPANDRAY' ? 'default' : 'outline'}>
            {MEMBER_TYPE_LABELS[row.original.memberType]}
          </Badge>
        ),
      },
      {
        id: 'responsibilities',
        header: t.members.colResponsibilities,
        cell: ({ row }) => <ResponsibilityBadges values={row.original.responsibilities} />,
      },
      ...(showPhone
        ? [
            {
              id: 'phone',
              header: t.members.colPhone,
              cell: ({ row }) => (
                <PhoneLink phone={row.original.phone} name={row.original.username} />
              ),
            } satisfies ColumnDef<MemberRow>,
          ]
        : []),
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <SortableHeader column={column} title={t.members.colAdded} />,
        cell: ({ row }) => <DateCell iso={row.original.createdAt} intl={intl} />,
      },
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => <SortableHeader column={column} title={t.members.colUpdated} />,
        cell: ({ row }) => <DateCell iso={row.original.updatedAt} intl={intl} />,
      },
    ],
    [t, intl, showPhone],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter: search, pagination },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _id, value: string) =>
      matchesSearch(
        `${row.original.username} ${row.original.email}`,
        row.original.phone,
        value,
      ),
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
  });

  return (
    <div className='flex flex-col gap-4 px-4 lg:px-6'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative min-w-48 flex-1 sm:max-w-sm'>
          <SearchIcon className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder={t.members.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-8'
            aria-label={t.members.searchLabel}
          />
        </div>
        <Select value={responsibility} onValueChange={setResponsibility}>
          <SelectTrigger className='w-52' aria-label={t.members.responsibilityFilter}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t.members.allResponsibilities}</SelectItem>
            {OPTIONAL_RESPONSIBILITIES.map((r) => (
              <SelectItem key={r} value={r}>
                {RESPONSIBILITY_LABELS[r]}
              </SelectItem>
            ))}
            <SelectItem value={NONE}>{t.members.noResponsibility}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className='w-44' aria-label={t.members.typeFilter}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t.members.allTypes}</SelectItem>
            {MEMBER_TYPES.map((m) => (
              <SelectItem key={m} value={m}>
                {MEMBER_TYPE_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFiltered && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              setSearch('');
              setType(ALL);
              setResponsibility(ALL);
            }}
          >
            <FilterXIcon /> {t.transactions.resetFilters}
          </Button>
        )}
        <span className='ml-auto text-sm text-muted-foreground tabular-nums' aria-live='polite'>
          {fmt(t.members.resultCount, {
            shown: table.getFilteredRowModel().rows.length,
            total: members.length,
          })}
        </span>
      </div>

      <DataTable table={table} emptyMessage={t.members.empty} />
    </div>
  );
}
