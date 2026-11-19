'use server';

import { z } from 'zod';
import { AuthError, authorize } from '@/lib/auth';
import { getTotalsByCategory, type CategoryTotal } from '../queries';
import { TRANSACTION_TYPES, type TransactionType } from '../schemas';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const requestSchema = z
  .object({ type: z.enum(TRANSACTION_TYPES), from: isoDate, to: isoDate })
  .refine((r) => r.from <= r.to, {
    message: 'The start date must be on or before the end date.',
  });

export type CategoryTotalsResult =
  | { success: true; data: CategoryTotal[] }
  | { success: false; message: string };

/** Income or expense totals per category for an inclusive date range (any signed-in user). */
export async function fetchTotalsByCategory(
  type: TransactionType,
  from: string,
  to: string,
): Promise<CategoryTotalsResult> {
  try {
    await authorize();
    const parsed = requestSchema.safeParse({ type, from, to });
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid date range.' };
    }
    const { type: t, ...range } = parsed.data;
    return { success: true, data: await getTotalsByCategory(t, range) };
  } catch (error) {
    if (error instanceof AuthError) return { success: false, message: error.message };
    console.error('fetchTotalsByCategory failed', error);
    return { success: false, message: 'Could not load totals for this range.' };
  }
}
