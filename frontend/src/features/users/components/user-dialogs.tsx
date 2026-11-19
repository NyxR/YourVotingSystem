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
import { ROLES, type Role } from '@/lib/roles';
import { fmt } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { tErrors } from '@/i18n/validation';
import { inviteUser, updateUser } from '../actions/user.actions';
import {
  inviteUserSchema,
  updateUserSchema,
  type TInviteUser,
  type TUpdateUser,
  type UserRow,
} from '../schemas/user.schema';

function RoleField<T extends FieldValues>({ control, name }: { control: Control<T>; name: Path<T> }) {
  const { t } = useI18n();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor='user-role'>{t.users.role}</FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id='user-role' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {t.roles[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{t.roleDescriptions[field.value as Role]}</FieldDescription>
        </Field>
      )}
    />
  );
}

function NameField<T extends FieldValues>({ control, name }: { control: Control<T>; name: Path<T> }) {
  const { t } = useI18n();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor='user-name'>{t.users.fullName}</FieldLabel>
          <Input {...field} id='user-name' autoComplete='off' aria-invalid={fieldState.invalid} />
          {fieldState.invalid && <FieldError errors={tErrors(t, fieldState.error)} />}
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
  const { t } = useI18n();
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
      toast.success(fmt(t.users.inviteSent, { email: values.email }));
      onOpenChange(false);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t.users.inviteTitle}</DialogTitle>
          <DialogDescription>
            {t.users.inviteDescription}
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
                  <FieldLabel htmlFor='user-email'>{t.users.email}</FieldLabel>
                  <Input
                    {...field}
                    id='user-email'
                    type='email'
                    placeholder={t.users.emailPlaceholder}
                    autoComplete='off'
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={tErrors(t, fieldState.error)} />}
                </Field>
              )}
            />
            <RoleField control={form.control} name='role' />
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>{t.common.cancel}</Button>
          </DialogClose>
          <Button type='submit' form='invite-user-form' disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t.auth.sending : t.users.sendInvitation}
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
  const { t } = useI18n();
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
      toast.success(t.users.updated);
      onClose();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t.users.editTitle}</DialogTitle>
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
            <Button variant='outline'>{t.common.cancel}</Button>
          </DialogClose>
          <Button type='submit' form='edit-user-form' disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t.common.saving : t.common.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
