// Shared by server and client code.

/** What the browser sends after cropping (a small square image). */
export const AVATAR_UPLOAD_TYPES = ['image/webp', 'image/jpeg'] as const;
/** The file people pick, before cropping. */
export const AVATAR_SOURCE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AVATAR_SOURCE_MAX_BYTES = 5 * 1024 * 1024;
/** The cropped result is ~256px, so this is generous. */
export const AVATAR_UPLOAD_MAX_BYTES = 1024 * 1024;
export const AVATAR_SIZE_PX = 256;

/** Stored file names: "<userId>-<uuid>.webp" (new name per upload, so URLs never go stale). */
export const AVATAR_FILE_RE = /^[A-Za-z0-9-]+-[0-9a-f-]{36}\.(webp|jpg)$/;

/** URL the app serves a stored avatar from, or null when there is none. */
export const avatarUrl = (path: string | null | undefined): string | null =>
  path ? `/main/avatars/${path}` : null;
