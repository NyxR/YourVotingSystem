/**
 * True for the error a server action's `redirect()` rejects with on the client
 * (its digest starts with NEXT_REDIRECT). By then Next.js has already started
 * the navigation, so callers just show their success message and stop.
 */
export const isRedirectError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'digest' in error &&
  String(error.digest).startsWith('NEXT_REDIRECT');
