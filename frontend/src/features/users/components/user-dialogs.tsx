'use client';

import { useEffect } from 'react';
import { Controller, useForm, type Control, type FieldValues, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES } from '@/lib/roles';
import { inviteUser, updateUser } from '../actions/user.actions';
import {
  inviteUserSchema,
  updateUserSchema,
  type TInviteUser,
  type TUpdateUser,
  type UserRow,
} from '../schemas/user.schema';

function RoleField<T extends FieldValues>({ control, name }: { control: Control<T>; name: Path<T> }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor='user-role'>Role</FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id='user-role' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{ROLE_DESCRIPTIONS[field.value as keyof typeof ROLE_DESCRIPTIONS]}</FieldDescription>
        </Field>
      )}
    />
  );
}

function NameField<T extends FieldValues>({ control, name }: { control: Control<T>; name: Path<T> }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor='user-name'>Full name</FieldLabel>
          <Input {...field} id='user-name' autoComplete='off' aria-invalid={fieldState.invalid} />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<TInviteUser>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { username: '', email: '', role: 'viewer' },
  });

  useEffect(() => {
    if (open) form.reset({ username: '', email: '', role: 'viewer' });
  }, [open, form]);

  const onSubmit = async (values: TInviteUser) => {
    const result = await inviteUser(values);
    if (result.success) {
      toast.success(`Invitation sent to ${values.email}`);
      onOpenChange(false);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>
            They&apos;ll receive an email with a link to choose their password.
          </DialogDescription>
        </DialogHeader>
        <form id='invite-user-form' onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <NameField control={form.control} name='username' />
            <Controller
              control={form.control}
              name='email'
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='user-email'>Email</FieldLabel>
                  <Input
                    {...field}
                    id='user-email'
                    type='email'
                    placeholder='name@example.org'
                    autoComplete='off'
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <RoleField control={form.control} name='role' />
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>Cancel</Button>
          </DialogClose>
          <Button type='submit' form='invite-user-form' disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Sending…' : 'Send invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditUserDialog({
  user,
  onClose,
}: {
  user: UserRow | null;
  onClose: () => void;
}) {
  const form = useForm<TUpdateUser>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { username: '', role: 'viewer' },
  });

  useEffect(() => {
    if (user) form.reset({ username: user.username, role: user.role });
  }, [user, form]);

  const onSubmit = async (values: TUpdateUser) => {
    if (!user) return;
    const result = await updateUser(user.id, values);
    if (result.success) {
      toast.success('User updated');
      onClose();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <form id='edit-user-form' onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <NameField control={form.control} name='username' />
            <RoleField control={form.control} name='role' />
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>Cancel</Button>
          </DialogClose>
          <Button type='submit' form='edit-user-form' disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
