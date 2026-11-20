// Money is stored as integer CAD cents. `intl` is a BCP-47 tag such as
// 'en-CA', 'fr-CA' or 'mg' (see INTL_LOCALE in @/i18n/config).

import { numberLocale } from '@/i18n/config';

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(intl: string, compact: boolean) {
  const key = `${intl}|${compact}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(numberLocale(intl), {
      style: 'currency',
      currency: 'CAD',
      ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
    });
    formatters.set(key, f);
  }
  return f;
}

/** 12550 -> "$125.50" (en-CA) / "125,50 $" (fr-CA). */
export const formatCAD = (cents: number, intl = 'en-CA') =>
  formatter(intl, false).format(cents / 100);

/** 1250000 -> "$12.5K" / "12,5 k$". */
export const formatCADCompact = (cents: number, intl = 'en-CA') =>
  formatter(intl, true).format(cents / 100);

/** Plain decimal string for inputs and CSV, e.g. 12550 -> "125.50". */
export const centsToDecimal = (cents: number) => (cents / 100).toFixed(2);

/** Like centsToDecimal, with a decimal comma for French/Malagasy: "125,50". */
export const centsToInput = (cents: number, intl = 'en-CA') => {
  const s = centsToDecimal(cents);
  return numberLocale(intl).startsWith('fr') ? s.replace('.', ',') : s;
};

const MAX_CENTS = 2_000_000_000; // fits a Postgres INTEGER with margin

/**
 * Parses what a person typed into cents, in English or French style:
 * "1,234.50", "$1234.5", "1 234,50", "12,50 $" -> 123450 / 1250.
 * A comma followed by exactly one or two final digits is a decimal comma;
 * otherwise commas are thousands separators. Returns null when invalid.
 */
export function parseAmountToCents(input: string): number | null {
  let cleaned = input.replace(/[\s  $]/g, '');
  if (/^\d+,\d{1,2}$/.test(cleaned)) cleaned = cleaned.replace(',', '.');
  cleaned = cleaned.replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  return cents <= MAX_CENTS ? cents : null;
}
