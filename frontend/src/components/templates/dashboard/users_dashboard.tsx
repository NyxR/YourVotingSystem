import React from 'react';
import UserList from '@/components/organisms/users/user_list';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UserForm from '@/components/organisms/users/user_form';

const UsersPage = () => {
  return (
    <div className='px-2 py-9 flex h-full justify-center'>
      <div className='w-3/4 flex flex-col gap-4'>
        <div className='flex justify-between'>
          <h1 className='text-2xl'>List of Users</h1>
          <UserForm
            btn_title='Create User'
            form_title='Create new user'
            roles={['Admin', 'Agent']}
          />
        </div>
        <div className=''>
          <UserList />
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
