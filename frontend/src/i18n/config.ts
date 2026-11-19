// Shared by server and client code.

export const LOCALES = ['en', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie holding the user's chosen language. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** BCP-47 tag used for Intl number/date formatting (Canadian variants). */
export const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-CA',
  fr: 'fr-CA',
};

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Replaces `{name}` placeholders: fmt('Hi {name}', { name: 'Ana' }). */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
