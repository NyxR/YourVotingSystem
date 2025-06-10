import { z } from 'zod';

export const createUserFormSchema = z.object({
  name: z.string().min(1, 'name is required'),
  email: z
    .string()
    .min(1, 'email is required')
    .email('Invalid email address'),
  role: z.string().min(1, 'Role is required'),
});
