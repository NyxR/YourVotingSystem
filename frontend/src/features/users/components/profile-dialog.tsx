'use client';

import { useForm } from 'react-hook-form';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n/client';
import { formatPhone } from '@/lib/phone';
import type { Responsibility } from '@/lib/responsibilities';
import { updateMyProfile } from '../actions/user.actions';
import { profileSchema, type TProfile } from '../schemas/user.schema';
import { PhoneField, ResponsibilitiesReadOnly } from './user-dialogs';
import { AvatarPicker } from './avatar-picker';

type Me = {
  name: string;
  email: string;
  phone: string | null;
  responsibilities: Responsibility[];
  avatarUrl: string | null;
};

/** Lets the signed-in user update their own picture and contact number. */
export function ProfileDialog({
  open,
  onOpenChange,
  me,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  me: Me;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        {/* Content unmounts when closed, so the form starts fresh each time. */}
        <ProfileForm me={me} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ProfileForm({ me, onDone }: { me: Me; onDone: () => void }) {
  const { t } = useI18n();
  const form = useForm<TProfile>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: me.phone ? formatPhone(me.phone) : '',
    },
  });

  const onSubmit = async (values: TProfile) => {
    const result = await updateMyProfile(values);
    if (result.success) {
      toast.success(t.profile.saved);
      onDone();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.profile.title}</DialogTitle>
        <DialogDescription>{t.profile.description}</DialogDescription>
      </DialogHeader>
      <form id='profile-form' onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <AvatarPicker name={me.name} src={me.avatarUrl} />
          <Field>
            <FieldLabel htmlFor='profile-name'>{t.users.fullName}</FieldLabel>
            <Input id='profile-name' value={me.name} readOnly disabled />
          </Field>
          <Field>
            <FieldLabel htmlFor='profile-email'>{t.users.email}</FieldLabel>
            <Input id='profile-email' value={me.email} readOnly disabled />
          </Field>
          <PhoneField control={form.control} name='phone' />
          <ResponsibilitiesReadOnly value={me.responsibilities} />
        </FieldGroup>
      </form>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant='outline'>{t.common.cancel}</Button>
        </DialogClose>
        <Button type='submit' form='profile-form' disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t.common.saving : t.common.save}
        </Button>
      </DialogFooter>
    </>
  );
}
