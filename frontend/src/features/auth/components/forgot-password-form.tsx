'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  requestPasswordReset,
  type AuthFormState,
} from '../actions/auth.actions';
import { FormAlert } from './auth-shell';
import { useI18n } from '@/i18n/client';

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    {},
  );

  return (
    <form action={action}>
      <FieldGroup>
        {state.error && <FormAlert tone='error'>{state.error}</FormAlert>}
        {state.message && (
          <FormAlert tone='success'>{state.message}</FormAlert>
        )}
        <Field>
          <FieldLabel htmlFor='email'>{t.auth.email}</FieldLabel>
          <Input
            id='email'
            name='email'
            type='email'
            autoComplete='email'
            placeholder={t.auth.emailPlaceholder}
            defaultValue={state.email}
            required
            autoFocus
          />
        </Field>
        <Button type='submit' className='w-full' disabled={pending}>
          {pending ? t.auth.sending : t.auth.sendResetLink}
        </Button>
        <Link
          href='/login'
          className='text-center text-sm underline-offset-4 hover:underline'
        >
          {t.auth.backToSignIn}
        </Link>
      </FieldGroup>
    </form>
  );
}
