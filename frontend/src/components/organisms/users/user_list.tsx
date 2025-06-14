import React from 'react';
import UserTable from './user_table';
import axios, { AxiosError } from 'axios';
import { USER_ENDPOINTS } from '@/lib/api_urls';
import { TUser } from '@/lib/validations/userform.schema';

const UserList = async () => {
  let users_data: TUser[] = [];
  let err: boolean = false;
  let errMsg = undefined;
  try {
    const res = await axios.get(USER_ENDPOINTS.list);
    const users = res?.data.data;
    if (users && Array.isArray(users)) {
      users_data = users.map((user) => ({
        id: user.id,
        name: user.username,
        email: user.email,
        role: user.role,
      }));
    }
  } catch (error) {
    err = true;
    errMsg = 'Error occured when fetching users, Please try again';
    users_data = [];
  }
  return (
    <UserTable error={err} error_message={errMsg} data={users_data} />
  );
};

export default UserList;
