'use server';
import { z } from 'zod';
import { createUserFormSchema } from './userform.schema';

// const createUserFormSchema = z.object({
//   name: z.string().min(1, 'name is required'),
//   email: z
//     .string()
//     .min(1, 'email is required')
//     .email('Invalid email address'),
//   role: z.string().min(1, 'Role is required'),
// });

export const submitUserForm = async (
  prevState: any,
  formData: FormData
) => {
  const data = {
    name: formData.get('name')?.toString() ?? '',
    email: formData.get('email')?.toString() ?? '',
    role: formData.get('role')?.toString() ?? '',
  };

  const parsed_data = createUserFormSchema.safeParse(data);
  if (!parsed_data.success) {
    return {
      success: false,
      errors: parsed_data.error?.flatten().fieldErrors,
      values: data,
    };
  }
  return {
    success: true,
    errors: {},
    values: { name: '', email: '', role: '' },
  };
};
