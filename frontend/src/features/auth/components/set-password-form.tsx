'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { setPassword, type AuthFormState } from '../actions/auth.actions';
import { FormAlert } from './auth-shell';

export function SetPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    setPassword,
    {},
  );

  return (
    <form action={action}>
      <FieldGroup>
        {state.error && <FormAlert tone='error'>{state.error}</FormAlert>}
        <Field>
          <FieldLabel htmlFor='password'>New password</FieldLabel>
          <Input
            id='password'
            name='password'
            type='password'
            autoComplete='new-password'
            minLength={8}
            required
            autoFocus
          />
          <FieldDescription>At least 8 characters.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor='confirm'>Confirm password</FieldLabel>
          <Input
            id='confirm'
            name='confirm'
            type='password'
            autoComplete='new-password'
            minLength={8}
            required
          />
        </Field>
        <Button type='submit' className='w-full' disabled={pending}>
          {pending ? 'Saving…' : 'Save password'}
        </Button>
      </FieldGroup>
    </form>
  );
}
