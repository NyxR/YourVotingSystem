'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { signIn, type AuthFormState } from '../actions/auth.actions';
import { FormAlert } from './auth-shell';
import { useI18n } from '@/i18n/client';

export function LoginForm({ initialError }: { initialError?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signIn,
    { error: initialError },
  );

  return (
    <form action={action}>
      <FieldGroup>
        {state.error && <FormAlert tone='error'>{state.error}</FormAlert>}
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
        <Field>
          <div className='flex items-center'>
            <FieldLabel htmlFor='password'>{t.auth.password}</FieldLabel>
            <Link
              href='/forgot-password'
              className='ml-auto text-sm underline-offset-4 hover:underline'
            >
              {t.auth.forgotPassword}
            </Link>
          </div>
          <Input
            id='password'
            name='password'
            type='password'
            autoComplete='current-password'
            required
          />
        </Field>
        <Button type='submit' className='w-full' disabled={pending}>
          {pending ? t.auth.signingIn : t.auth.signIn}
        </Button>
      </FieldGroup>
    </form>
  );
}
