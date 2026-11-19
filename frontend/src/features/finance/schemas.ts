import { z } from 'zod';
import { parseAmountToCents } from '@/lib/money';

// ─── Enums (mirror prisma/schema.prisma) ──────────────────────

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
};

export const PAYMENT_METHODS = [
  'CASH',
  'CHEQUE',
  'E_TRANSFER',
  'CARD',
  'DIRECT_DEPOSIT',
  'OTHER',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  E_TRANSFER: 'Interac e-Transfer',
  CARD: 'Card',
  DIRECT_DEPOSIT: 'Direct deposit',
  OTHER: 'Other',
};

/** Select value meaning "no category" (Radix Select can't use ""). */
export const NO_CATEGORY = '__none';

// ─── Receipts ─────────────────────────────────────────────────

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
export const RECEIPT_ACCEPT = Object.keys(RECEIPT_MIME_TYPES).join(',');

/** Returns an error message, or null when the file is acceptable. */
export function validateReceipt(file: File): string | null {
  if (!(file.type in RECEIPT_MIME_TYPES)) {
    return 'Receipts must be a JPG, PNG, WebP image or a PDF.';
  }
  if (file.size > RECEIPT_MAX_BYTES) return 'Receipts must be 5 MB or smaller.';
  return null;
}

// ─── Forms ────────────────────────────────────────────────────

export const transactionFormSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.'),
  amount: z
    .string()
    .trim()
    .refine((v) => (parseAmountToCents(v) ?? 0) > 0, {
      message: 'Enter a positive amount, e.g. 125.50',
    }),
  description: z
    .string()
    .trim()
    .min(1, 'Add a short description.')
    .max(300, 'Keep it under 300 characters.'),
  categoryId: z.string(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(100, 'Keep it under 100 characters.'),
});
export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .max(60, 'Keep it under 60 characters.'),
  type: z.enum(TRANSACTION_TYPES),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// ─── Serialized rows passed from server to client ─────────────

export type TransactionRow = {
  id: string;
  type: TransactionType;
  amountCents: number;
  /** yyyy-MM-dd */
  date: string;
  description: string;
  paymentMethod: PaymentMethod;
  reference: string | null;
  hasReceipt: boolean;
  categoryId: string | null;
  categoryName: string | null;
  createdByName: string | null;
  /** ISO timestamp the transaction was recorded. */
  createdAt: string;
  /** Last editor; null when the transaction was never edited. */
  updatedByName: string | null;
  /** ISO timestamp of the last edit; null when never edited. */
  editedAt: string | null;
};

export type CategoryOption = {
  id: string;
  name: string;
  type: TransactionType;
};

export type CategoryRow = CategoryOption & { transactionCount: number };
