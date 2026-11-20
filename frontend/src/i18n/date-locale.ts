// date-fns locales per app language. date-fns has no Malagasy locale, so
// we build one on top of the Canadian French one (date layout, 24-hour time)
// with Malagasy month/day names and relative times ("3 andro lasa izay").

import type { FormatDistanceFn, FormatDistanceToken, Locale as DateFnsLocale } from 'date-fns';
import { enCA, frCA } from 'date-fns/locale';
import {
  MG_MONTHS,
  MG_MONTHS_SHORT,
  MG_WEEKDAYS,
  MG_WEEKDAYS_SHORT,
} from '@/lib/dates';
import type { Locale } from './config';

type Plural = string | { one: string; other: string };

const MG_DISTANCE: Record<FormatDistanceToken, Plural> = {
  lessThanXSeconds: { one: 'latsaky ny segondra iray', other: 'latsaky ny {{count}} segondra' },
  xSeconds: { one: 'segondra iray', other: '{{count}} segondra' },
  halfAMinute: '30 segondra',
  lessThanXMinutes: { one: 'latsaky ny minitra iray', other: 'latsaky ny {{count}} minitra' },
  xMinutes: { one: 'minitra iray', other: '{{count}} minitra' },
  aboutXHours: { one: 'manodidina ny ora iray', other: 'manodidina ny {{count}} ora' },
  xHours: { one: 'ora iray', other: '{{count}} ora' },
  xDays: { one: 'andro iray', other: '{{count}} andro' },
  aboutXWeeks: { one: 'manodidina ny herinandro iray', other: 'manodidina ny {{count}} herinandro' },
  xWeeks: { one: 'herinandro iray', other: '{{count}} herinandro' },
  aboutXMonths: { one: 'manodidina ny volana iray', other: 'manodidina ny {{count}} volana' },
  xMonths: { one: 'volana iray', other: '{{count}} volana' },
  aboutXYears: { one: 'manodidina ny taona iray', other: 'manodidina ny {{count}} taona' },
  xYears: { one: 'taona iray', other: '{{count}} taona' },
  overXYears: { one: 'mihoatra ny taona iray', other: 'mihoatra ny {{count}} taona' },
  almostXYears: { one: 'efa ho taona iray', other: 'efa ho {{count}} taona' },
};

const mgFormatDistance: FormatDistanceFn = (token, count, options) => {
  const entry = MG_DISTANCE[token];
  const text =
    typeof entry === 'string'
      ? entry
      : (count === 1 ? entry.one : entry.other).replace('{{count}}', String(count));
  if (!options?.addSuffix) return text;
  return options.comparison && options.comparison > 0 ? `afaka ${text}` : `${text} lasa izay`;
};

type WidthOption = { width?: string };

const mg: DateFnsLocale = {
  ...frCA,
  code: 'mg',
  formatDistance: mgFormatDistance,
  localize: {
    ...frCA.localize,
    month: (index: number, options?: WidthOption) =>
      options?.width === 'wide'
        ? MG_MONTHS[index]
        : options?.width === 'narrow'
          ? MG_MONTHS[index][0]
          : MG_MONTHS_SHORT[index],
    day: (index: number, options?: WidthOption) =>
      options?.width === 'wide'
        ? MG_WEEKDAYS[index]
        : options?.width === 'narrow'
          ? MG_WEEKDAYS[index][0]
          : MG_WEEKDAYS_SHORT[index],
  },
};

export const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = { en: enCA, fr: frCA, mg };
