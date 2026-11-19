const cad = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});
const cadCompact = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const formatCAD = (cents: number) => cad.format(cents / 100);
export const formatCADCompact = (cents: number) =>
  cadCompact.format(cents / 100);

/** Plain decimal string for inputs and CSV, e.g. 12550 -> "125.50". */
export const centsToDecimal = (cents: number) => (cents / 100).toFixed(2);

const MAX_CENTS = 2_000_000_000; // fits a Postgres INTEGER with margin

/** "1,234.5" / "$1234.50" -> 123450. Returns null when not a valid amount. */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[\s,$]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  return cents <= MAX_CENTS ? cents : null;
}
