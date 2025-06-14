'use server';
import axios, { AxiosError } from 'axios';
import { USER_ENDPOINTS } from '@/lib/api_urls';
import { actionClient } from '@/lib/safe-action';
import {
  createUserFormSchema,
  deleteUserSchema,
} from '@/lib/validations/userform.schema';
import { revalidatePath } from 'next/cache';

export const addUserSafeAction = actionClient
  .inputSchema(createUserFormSchema)
  .action(async ({ parsedInput }) => {
    try {
      const user = await axios.post(USER_ENDPOINTS.add, parsedInput);
      revalidatePath('/dashboard/users');
      return {
        error: false,
        message: user.data?.message,
        data: user.data?.data,
      };
    } catch (error) {
      if (error instanceof AxiosError && error.status === 400) {
        const error_data = error.response?.data;
        return {
          error: true,
          message: error_data?.message,
          data: error_data?.data,
        };
      }
      return { message: 'failed' };
    }
  });

export const deleteUserSafeAction = actionClient
  .inputSchema(deleteUserSchema)
  .action(async ({ parsedInput }) => {
    try {
      try {
        const user = await axios.post(
          USER_ENDPOINTS.delete,
          parsedInput
        );
        revalidatePath('/dashboard/users');
        return {
          error: false,
          message: user.data?.message,
          data: user.data?.data,
        };
      } catch (error) {
        if (error instanceof AxiosError && error.status === 400) {
          const error_data = error.response?.data;
          return {
            error: true,
            message: error_data?.message,
            data: error_data?.data,
          };
        }
        return { message: 'failed' };
      }
    } catch (error) {}
    console.log(parsedInput);
  });
