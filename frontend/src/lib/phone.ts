// North American (Canada/US) phone numbers. Shared by server and client.
// Stored as E.164 "+15065551234", shown as "(506) 555-1234".

/**
 * Parses what a person typed ("506-555-1234", "(506) 555 1234",
 * "+1 506 555 1234") into E.164, or null when it isn't a valid NANP number.
 */
export function toE164(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  // Area code and exchange can't start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return `+1${digits}`;
}

export const isValidPhone = (input: string) => toE164(input) !== null;

/** "+15065551234" -> "(506) 555-1234". Falls back to the raw value. */
export function formatPhone(value: string): string {
  const e164 = toE164(value);
  if (!e164) return value;
  const d = e164.slice(2);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Link target for tap-to-call. */
export const telHref = (value: string) => `tel:${toE164(value) ?? value}`;
