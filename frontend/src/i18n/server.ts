// Server-side i18n: resolve the visitor's language and its messages.

import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from './config';
import en, { type Messages } from './messages/en';
import fr from './messages/fr';
import mg from './messages/mg';

const MESSAGES: Record<Locale, Messages> = { en, fr, mg };

/**
 * The chosen language (cookie), else the browser's preferred one if we
 * support it, else French. Memoised per request.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const accept = (await headers()).get('accept-language') ?? '';
  for (const part of accept.split(',')) {
    const lang = part.split(';')[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
});

export function getMessagesFor(locale: Locale): Messages {
  return MESSAGES[locale];
}

/** Messages plus locale info for the current request. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, intl: INTL_LOCALE[locale], t: MESSAGES[locale] };
}
