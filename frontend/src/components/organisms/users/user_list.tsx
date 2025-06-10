'use client';
import React from 'react';
import { DataTable } from '@/components/utilities/data-table';
import { data, User, Role } from '@/lib/data';
import { Separator } from '@/components/ui/separator';
import { createColumnHelper } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import DefaultTableHeader from '@/components/utilities/default-table-header';
import SortingTableHeader from '@/components/utilities/sorting-table-header';
import { cn } from '@/lib/utils';

const columnHelper = createColumnHelper<User>();
const columns = [
  columnHelper.display({
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) =>
          table.toggleAllPageRowsSelected(!!value)
        }
        aria-label='Select all'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
      />
    ),
  }),
  columnHelper.accessor('username', {
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
];

const UserList = () => {
  return <DataTable<User, any> columns={columns} data={data} />;
};

export default UserList;
