import { z } from 'zod';

const USER_ROLES = ['Admin', 'Agent'] as const;

export const insertUserSchema = z.object({
  name: z
    .string({
      required_error: 'name is required',
      invalid_type_error: 'name must be a string',
    })
    .min(1, { message: 'name is required' }),
  email: z
    .string({
      required_error: 'email is required',
      invalid_type_error: 'email must be a string',
    })
    .min(1, 'email is required')
    .email('Invalid email address'),
  role: z.enum(USER_ROLES).refine((val) => USER_ROLES.includes(val), {
    message: 'Role should be Admin or Agent',
  }),
});

export type TUser = z.infer<typeof insertUserSchema>;

export const deleteUserSchema = z.object({
  id: z.string({
    required_error: 'id is required',
    invalid_type_error: 'id must be a string',
  }),
});

export const updateUserSchema = z.object({
  id: z.string({
    required_error: 'id is required',
    invalid_type_error: 'id must be a string',
  }),
  name: z
    .string({
      required_error: 'name is required',
      invalid_type_error: 'name must be a string',
    })
    .min(1, { message: 'name is required' }),
  email: z
    .string({
      required_error: 'email is required',
      invalid_type_error: 'email must be a string',
    })
    .min(1, 'email is required')
    .email('Invalid email address'),
  role: z.enum(USER_ROLES).refine((val) => USER_ROLES.includes(val), {
    message: 'Role should be Admin or Agent',
  }),
});

export type TUpdateUserData = z.infer<typeof updateUserSchema>;
