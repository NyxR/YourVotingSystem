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

// Malagasy names (CLDR). Browsers often lack Malagasy locale data, so we
// substitute them ourselves; server and browser then render the same text.
export const MG_MONTHS = [
  'Janoary', 'Febroary', 'Martsa', 'Aprily', 'Mey', 'Jona',
  'Jolay', 'Aogositra', 'Septambra', 'Oktobra', 'Novambra', 'Desambra',
];
export const MG_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mey', 'Jon', 'Jol', 'Aog', 'Sep', 'Okt', 'Nov', 'Des',
];
/** Sunday first, like Date#getDay(). */
export const MG_WEEKDAYS = [
  'Alahady', 'Alatsinainy', 'Talata', 'Alarobia', 'Alakamisy', 'Zoma', 'Asabotsy',
];
export const MG_WEEKDAYS_SHORT = ['Alah', 'Alats', 'Tal', 'Alar', 'Alak', 'Zom', 'Asab'];

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/**
 * Date#toLocaleDateString, plus Malagasy: for `intl` 'mg' the date is laid
 * out the French way ("19 nov. 2026") with Malagasy month and day names
 * ("19 Nov 2026", "19 Novambra 2026").
 */
export function formatDate(date: Date, intl: string, opts: Intl.DateTimeFormatOptions) {
  if (!intl.startsWith('mg')) return date.toLocaleDateString(intl, opts);
  const inZone = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { timeZone: opts.timeZone, ...o }).format(date);
  return new Intl.DateTimeFormat('fr-FR', opts)
    .formatToParts(date)
    .map((part) => {
      if (part.type === 'month' && opts.month && opts.month !== 'numeric' && opts.month !== '2-digit') {
        const m = Number(inZone({ month: 'numeric' })) - 1;
        return opts.month === 'long' ? MG_MONTHS[m] : MG_MONTHS_SHORT[m];
      }
      if (part.type === 'weekday') {
        const d = WEEKDAY_INDEX[inZone({ weekday: 'short' })];
        return opts.weekday === 'long' ? MG_WEEKDAYS[d] : MG_WEEKDAYS_SHORT[d];
      }
      return part.value;
    })
    .join('');
}

/**
 * "2026-11-05" -> "Nov 5, 2026" (en-CA) / "5 nov. 2026" (fr-CA) / "5 Nov 2026" (mg).
 * Rendered in UTC so the calendar day never shifts.
 */
export function formatDay(
  iso: string,
  opts: Intl.DateTimeFormatOptions = {},
  intl = 'en-CA',
) {
  return formatDate(isoToDate(iso), intl, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...opts,
  });
}
