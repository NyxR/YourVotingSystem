'use client';

import React, { useOptimistic, useState, useTransition } from 'react';
import { data, User } from '@/lib/data';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import {
  DataTable,
  DefaultTableHeader,
  SortingTableHeader,
  DataTableCheckBoxCol,
  DataTableCheckBoxRow,
} from '@/components/utilities/data-table';
import { cn } from '@/lib/utils';
import { TUser } from '@/lib/validations/userform.schema';
import UserTableActions from '../../molecules/users/user_table_actions';

const columnHelper = createColumnHelper<TUser>();
const getColumns = () => [
  columnHelper.display({
    id: 'select',
    header: ({ table }) => <DataTableCheckBoxCol table={table} />,
    cell: ({ row }) => <DataTableCheckBoxRow row={row} />,
  }),
  columnHelper.accessor('name', {
    header: (info) => (
      <DefaultTableHeader info={info} name='Username' />
    ),
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('email', {
    header: (info) => (
      <DefaultTableHeader info={info} name='Email Address' />
    ),
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('role', {
    header: (info) => {
      const optionRoles = Array.from(
        new Set(data.map((user) => user.role))
      );
      return (
        <SortingTableHeader
          info={info}
          name='Role'
          options={optionRoles}
        />
      );
    },
    cell: ({ row }) => {
      const role: string = row.getValue('role');
      return (
        <Badge
          className='max-w-20 flex items-center justify-center'
          variant={role === 'Admin' ? 'default' : 'destructive'}
        >
          {role}
        </Badge>
      );
    },
    filterFn: (row, columnId, filterValue) => {
      return filterValue.includes(row.getValue(columnId));
    },
  }),
  columnHelper.display({
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <UserTableActions row={row} />,
  }),
];

type UserTableProps = {
  data: TUser[];
  error: boolean;
  error_message?: string;
};

const UserTable = ({
  error,
  error_message,
  data,
}: UserTableProps) => {
  // const [loading, setLoading] = useState(false);
  const columns = getColumns();
  return (
    <DataTable<TUser, any>
      columns={columns}
      data={data}
      error={error}
      error_message={error_message}
    />
  );
};

export default UserTable;
