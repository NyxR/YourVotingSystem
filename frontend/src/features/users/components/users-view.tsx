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
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { EllipsisVerticalIcon, SearchIcon, UserPlusIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, SortableHeader } from '@/components/data-table/data-table';
import { ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { deleteUser, resendAccessEmail } from '../actions/user.actions';
import type { UserRow, UserStatus } from '../schemas/user.schema';
import { EditUserDialog, InviteUserDialog } from './user-dialogs';

const STATUS: Record<UserStatus, { label: string; dot: string }> = {
  active: { label: 'Active', dot: 'bg-primary' },
  invited: { label: 'Invite pending', dot: 'bg-muted-foreground' },
  not_invited: { label: 'Not invited', dot: 'border border-muted-foreground' },
};

export function UsersView({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);

  const sendEmail = async (u: UserRow) => {
    const result = await resendAccessEmail(u.id);
    if (result.success) {
      toast.success(
        u.status === 'active' ? `Password reset email sent to ${u.email}` : `Invitation sent to ${u.email}`,
      );
    } else {
      toast.error(result.message);
    }
  };

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: 'username',
        header: ({ column }) => <SortableHeader column={column} title='Name' />,
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <span className='font-medium'>
              {row.original.username}
              {row.original.id === currentUserId && (
                <span className='ml-1.5 text-xs font-normal text-muted-foreground'>(you)</span>
              )}
            </span>
            <span className='text-xs text-muted-foreground'>{row.original.email}</span>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: ({ column }) => <SortableHeader column={column} title='Role' />,
        cell: ({ row }) => (
          <Badge variant={row.original.role === 'admin' ? 'default' : 'outline'}>
            {ROLE_LABELS[row.original.role]}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const s = STATUS[row.original.status];
          return (
            <span className='flex items-center gap-2 text-sm'>
              <span className={cn('size-2 rounded-full', s.dot)} aria-hidden />
              {s.label}
            </span>
          );
        },
      },
      {
        accessorKey: 'lastSignInAt',
        header: 'Last sign-in',
        cell: ({ row }) =>
          row.original.lastSignInAt ? (
            <span className='text-sm text-muted-foreground'>
              {formatDistanceToNow(new Date(row.original.lastSignInAt), { addSuffix: true })}
            </span>
          ) : (
            <span className='text-sm text-muted-foreground'>Never</span>
          ),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const u = row.original;
          const isMe = u.id === currentUserId;
          return (
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
              <DropdownMenuContent align='end' className='w-52'>
                <DropdownMenuItem onSelect={() => setEditing(u)}>Edit name or role</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => sendEmail(u)}>
                  {u.status === 'active' ? 'Send password reset' : 'Resend invitation'}
                </DropdownMenuItem>
                {!isMe && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant='destructive' onSelect={() => setDeleting(u)}>
                      Remove user
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [currentUserId],
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _id, value: string) =>
      `${row.original.username} ${row.original.email}`.toLowerCase().includes(value.toLowerCase()),
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className='flex flex-col gap-4 px-4 lg:px-6'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative min-w-48 flex-1 sm:max-w-sm'>
          <SearchIcon className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search by name or email…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-8'
            aria-label='Search users'
          />
        </div>
        <Button size='sm' className='ml-auto' onClick={() => setInviteOpen(true)}>
          <UserPlusIcon /> Invite user
        </Button>
      </div>

      <DataTable table={table} emptyMessage='No users found.' />

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Remove ${deleting?.username}?`}
        description='They will no longer be able to sign in. Transactions they recorded are kept.'
        confirmLabel='Remove user'
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteUser(deleting.id);
          if (result.success) toast.success('User removed');
          else {
            toast.error(result.message);
            return false;
          }
        }}
      />
    </div>
  );
}
