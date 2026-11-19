/**
 * Transaction dates are calendar days (Postgres DATE), handled as
 * "yyyy-MM-dd" strings everywhere outside the database layer.
 */

/** Organisation timezone used to decide what "today" / "this month" means. */
export const APP_TIMEZONE =
  process.env.NEXT_PUBLIC_APP_TIMEZONE || 'America/Toronto';

/** Today as "yyyy-MM-dd" in the organisation's timezone. */
export function todayISO(): string {
  // en-CA formats dates as yyyy-MM-dd.
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(
    new Date(),
  );
}

/** DB DATE (UTC midnight) -> "yyyy-MM-dd". */
export const dateToISO = (d: Date) => d.toISOString().slice(0, 10);

/** "yyyy-MM-dd" -> Date at UTC midnight, for writing a DATE column. */
export const isoToDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** Shift a "yyyy-MM-dd" by whole days. */
export function addDays(iso: string, days: number): string {
  const d = isoToDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return dateToISO(d);
}

/** First day of the month `offset` months from the month containing `iso`. */
export function monthStart(iso: string, offset = 0): string {
  const d = isoToDate(iso);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return dateToISO(d);
}

/**
 * "2026-11-05" -> "Nov 5, 2026" (en-CA) / "5 nov. 2026" (fr-CA).
 * Rendered in UTC so the calendar day never shifts.
 */
export function formatDay(
  iso: string,
  opts: Intl.DateTimeFormatOptions = {},
  intl = 'en-CA',
) {
  return isoToDate(iso).toLocaleDateString(intl, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...opts,
  });
}
