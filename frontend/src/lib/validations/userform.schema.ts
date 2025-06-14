import { z } from 'zod';

export const createUserFormSchema = z.object({
  name: z.string().min(1, 'name is required'),
  email: z
    .string()
    .min(1, 'email is required')
    .email('Invalid email address'),
  role: z.string().min(1, 'Role is required'),
});

export const deleteUserSchema = z.object({
  id: z.string(),
});

export type TUserFormData = z.infer<typeof createUserFormSchema>;

const UserSchema = createUserFormSchema.extend({
  id: z.string(),
});

export type TUser = z.infer<typeof UserSchema>;
