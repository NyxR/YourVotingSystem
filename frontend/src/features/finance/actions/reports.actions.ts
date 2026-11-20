'use server';

import { z } from 'zod';
import { AuthError, authorize } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { translateValidation, type ValidationKey } from '@/i18n/validation';
import {
  getDailyTotals,
  getTotalsByCategory,
  type CategoryTotal,
  type DailyTotal,
} from '../queries';
import { TRANSACTION_TYPES, type TransactionType } from '../schemas';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'datePick' satisfies ValidationKey);
const rangeSchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((r) => r.from <= r.to, { message: 'rangeOrder' satisfies ValidationKey });

type Result<T> = { success: true; data: T } | { success: false; message: string };
export type CategoryTotalsResult = Result<CategoryTotal[]>;
export type DailyTotalsResult = Result<DailyTotal[]>;

/** Validates the range, then runs `load`; errors come back translated. */
async function loadRange<T>(
  from: string,
  to: string,
  load: (range: { from: string; to: string }) => Promise<T>,
): Promise<Result<T>> {
  const { t } = await getI18n();
  try {
    await authorize();
    const parsed = rangeSchema.safeParse({ from, to });
    if (!parsed.success) {
      return { success: false, message: translateValidation(t, parsed.error.issues[0]?.message) };
    }
    return { success: true, data: await load(parsed.data) };
  } catch (error) {
    if (error instanceof AuthError) return { success: false, message: t.errors[error.key] };
    console.error('Loading a report range failed', error);
    return { success: false, message: t.errors.rangeLoad };
  }
}

/** Income or expense totals per category for an inclusive date range (any signed-in user). */
export async function fetchTotalsByCategory(
  type: TransactionType,
  from: string,
  to: string,
): Promise<CategoryTotalsResult> {
  const parsedType = z.enum(TRANSACTION_TYPES).safeParse(type);
  if (!parsedType.success) {
    const { t } = await getI18n();
    return { success: false, message: t.validation.invalid };
  }
  return loadRange(from, to, (range) => getTotalsByCategory(parsedType.data, range));
}

/** Income/expense totals per day for an inclusive date range (any signed-in user). */
export async function fetchDailyTotals(from: string, to: string): Promise<DailyTotalsResult> {
  return loadRange(from, to, getDailyTotals);
}
