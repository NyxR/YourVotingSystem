// Shared by server and client code.

export const LOCALES = ['en', 'fr', 'mg'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

/** Cookie holding the user's chosen language. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/**
 * BCP-47 tag passed around as `intl` for number/date formatting. Malagasy
 * dates go through our own month/day names (see formatDate in @/lib/dates),
 * because many browsers ship without Malagasy data.
 */
export const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-CA',
  fr: 'fr-CA',
  mg: 'mg',
};

/** Tag for Intl.NumberFormat: Malagasy uses the French style, "1 234,50 $". */
export function numberLocale(intl: string): string {
  return intl.startsWith('mg') ? 'fr-CA' : intl;
}

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  mg: 'Malagasy',
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
