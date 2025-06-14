import { Row } from '@tanstack/react-table';
import { TUser } from '@/lib/validations/userform.schema';
import DeleteBtnUser from '@/components/atoms/users/delete_btn_user';
import EditBtnUser from '@/components/atoms/users/edit_btn_user';
import React from 'react';

type UserTableActionsProps = {
  row: Row<TUser>;
};

const UserTableActions = ({ row }: UserTableActionsProps) => {
  const user = row.original;
  return (
    <div className='max-w-8 flex gap-2'>
      <DeleteBtnUser userId={user.id} />
      <EditBtnUser />
    </div>
  );
};

export default UserTableActions;
