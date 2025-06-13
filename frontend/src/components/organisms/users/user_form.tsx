'use client';
import { Button } from '@/components/ui/button';
import { Loader2Icon } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import React, {
  useActionState,
  useRef,
  useState,
  useTransition,
} from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { createUserFormSchema } from '@/lib/validations/userform.schema';
import { addUserSafeAction } from '@/actions/users.actions';
import { useToast } from '@/hooks/use-toast';

type UserFormProps = {
  btn_title: string;
  form_title: string;
  roles: string[];
};

const UserForm = ({
  btn_title,
  form_title,
  roles,
}: UserFormProps) => {
  const form = useForm<z.infer<typeof createUserFormSchema>>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: '',
    },
  });

  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // const { executeAsync, result } = useAction(addUserSafeAction, {
  //   onSuccess: async () => {},
  // });

  const onSubmit = async (
    values: z.infer<typeof createUserFormSchema>
  ) => {
    startTransition(async () => {
      const result = await addUserSafeAction(values);
      console.log('result', result);
      const result_data = result?.data;
      if (result_data?.error) {
        const data = result_data?.data;
        if (Array.isArray(data)) {
          data.map((err) =>
            form.setError(err?.name, {
              type: 'server',
              message: err?.message,
            })
          );
        }
        toast({
          description: result_data?.message,
          variant: 'destructive',
        });
      } else {
        toast({
          description: result_data?.message,
          variant: 'success',
        });
        form.reset();
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
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
              <Button type='submit' disabled={isPending}>
                {isPending && (
                  <Loader2Icon className='animate-spin' />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UserForm;
