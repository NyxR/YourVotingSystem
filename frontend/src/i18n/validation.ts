import type { Messages } from './messages/en';

/** Keys of `t.validation`; zod schemas use them as their error messages. */
export type ValidationKey = keyof Messages['validation'];

/** Translates a schema error message (a ValidationKey) for display. */
export function translateValidation(t: Messages, message: string | undefined): string {
  if (!message) return t.validation.invalid;
  return message in t.validation ? t.validation[message as ValidationKey] : message;
}

/** For react-hook-form's FieldError: `errors={tErrors(t, fieldState.error)}`. */
export function tErrors(t: Messages, error: { message?: string } | undefined) {
  return error ? [{ message: translateValidation(t, error.message) }] : [];
}
