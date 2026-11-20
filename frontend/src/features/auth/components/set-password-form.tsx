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
import { useI18n } from '@/i18n/client';

export function SetPasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    setPassword,
    {},
  );

  return (
    <form action={action}>
      <FieldGroup>
        {state.error && <FormAlert tone='error'>{state.error}</FormAlert>}
        <Field>
          <FieldLabel htmlFor='password'>{t.auth.newPassword}</FieldLabel>
          <Input
            id='password'
            name='password'
            type='password'
            autoComplete='new-password'
            minLength={8}
            required
            autoFocus
          />
          <FieldDescription>{t.auth.passwordHint}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor='confirm'>{t.auth.confirmPassword}</FieldLabel>
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
          {pending ? t.common.saving : t.auth.savePassword}
        </Button>
      </FieldGroup>
    </form>
  );
}
