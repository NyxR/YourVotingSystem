// Category colours: a small fixed palette so badges stay readable in light
// and dark mode. Stored on ForumCategory.color as one of these keys.

export const FORUM_COLORS = ['blue', 'green', 'purple', 'red', 'orange', 'teal', 'gray'] as const;
export type ForumColor = (typeof FORUM_COLORS)[number];

export function toForumColor(value: string): ForumColor {
  return (FORUM_COLORS as readonly string[]).includes(value) ? (value as ForumColor) : 'gray';
}

/** Solid swatch (dots, colour picker). */
export const COLOR_DOT: Record<ForumColor, string> = {
  blue: 'bg-blue-600 dark:bg-blue-400',
  green: 'bg-emerald-600 dark:bg-emerald-400',
  purple: 'bg-violet-600 dark:bg-violet-400',
  red: 'bg-rose-600 dark:bg-rose-400',
  orange: 'bg-orange-500 dark:bg-orange-400',
  teal: 'bg-teal-600 dark:bg-teal-400',
  gray: 'bg-zinc-500 dark:bg-zinc-400',
};

/** Tinted badge background + readable text. */
export const COLOR_BADGE: Record<ForumColor, string> = {
  blue: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900',
  green:
    'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900',
  purple:
    'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-900',
  red: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900',
  orange:
    'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-900',
  teal: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-900',
  gray: 'bg-zinc-50 text-zinc-800 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800',
};
