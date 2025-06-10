'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { submitUserForm } from '@/lib/userform.action';
import { cn } from '@/lib/utils';
import React, { useActionState, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { createUserFormSchema } from '@/lib/userform.schema';

// const createUserFormSchema = z.object({
//   name: z.string().min(1, 'name is required'),
//   email: z
//     .string()
//     .min(1, 'email is required')
//     .email('Invalid email address'),
//   role: z.string().min(1, 'Role is required'),
// });

type UserFormProps = {
  btn_title: string;
  form_title: string;
  roles: string[];
};

const initialState = {
  success: false,
  errors: {} as Record<string, string[]>,
  values: { name: '', email: '', role: '' },
};

const UserForm = ({
  btn_title,
  form_title,
  roles,
}: UserFormProps) => {
  const [state, formAction] = useActionState(
    submitUserForm,
    initialState
  );

  const form = useForm<z.infer<typeof createUserFormSchema>>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: '',
    },
  });

  const onSubmit = (values: z.infer<typeof createUserFormSchema>) => {
    console.log(values);
    form.reset();
  };

  console.log('formstate', state);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{btn_title}</Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form
            className='flex flex-col gap-4'
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <DialogHeader>
              <DialogTitle>{form_title}</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <div className='flex flex-col gap-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder='Ex: John' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='Ex: John@gmail.com'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='role'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger
                          className={cn(
                            state.errors.role && 'border-destructive'
                          )}
                        >
                          <SelectValue
                            id='role'
                            placeholder='Choose user role'
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role, index) => (
                            <SelectItem
                              key={`role_${index}`}
                              value={role}
                            >
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant='outline'>Cancel</Button>
              </DialogClose>
              <Button type='submit'>Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UserForm;
