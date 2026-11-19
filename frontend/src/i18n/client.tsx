'use client';

import { createContext, useContext } from 'react';
import { INTL_LOCALE, type Locale } from './config';
import type { Messages } from './messages/en';

type I18nValue = { locale: Locale; intl: string; t: Messages };

const I18nContext = createContext<I18nValue | null>(null);

/** Provides the current language's messages to client components. */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, intl: INTL_LOCALE[locale], t: messages }}>
      {children}
    </I18nContext.Provider>
  );
}

/** `{ t, locale, intl }` for the current language. */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}
