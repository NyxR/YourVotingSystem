'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { isLocale, LOCALE_COOKIE } from './config';

/** Saves the chosen language for a year and re-renders the app in it. */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  revalidatePath('/', 'layout');
}
