'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { authorize, can, runAction, type ActionResult } from '@/lib/auth';
import { createAdminClient, RECEIPTS_BUCKET } from '@/lib/supabase/admin';
import { parseAmountToCents } from '@/lib/money';
import { isoToDate } from '@/lib/dates';
import { getI18n } from '@/i18n/server';
import { translateValidation } from '@/i18n/validation';
import {
  NO_CATEGORY,
  RECEIPT_MIME_TYPES,
  transactionFormSchema,
  validateReceipt,
} from '../schemas';

const FORM_FIELDS = [
  'type',
  'date',
  'amount',
  'description',
  'categoryId',
  'paymentMethod',
  'reference',
] as const;

/**
 * Creates a transaction, or updates one when the form data has an `id`.
 * Optional fields: `receipt` (File) to attach/replace, `removeReceipt=true`.
 */
export async function saveTransaction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await authorize(can.editFinance);
    const { t } = await getI18n();

    const parsed = transactionFormSchema.safeParse(
      Object.fromEntries(FORM_FIELDS.map((k) => [k, formData.get(k) ?? ''])),
    );
    if (!parsed.success) {
      return {
        success: false,
        message: translateValidation(t, parsed.error.issues[0]?.message),
      };
    }
    const values = parsed.data;

    const categoryId =
      values.categoryId && values.categoryId !== NO_CATEGORY
        ? values.categoryId
        : null;
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category || category.type !== values.type) {
        return {
          success: false,
          message: t.errors.categoryMismatch,
        };
      }
    }

    const id = String(formData.get('id') ?? '') || null;
    const existing = id
      ? await prisma.transaction.findUnique({ where: { id } })
      : null;
    if (id && !existing) {
      return { success: false, message: t.errors.transactionGone };
    }

    const receipt = formData.get('receipt');
    const newFile = receipt instanceof File && receipt.size > 0 ? receipt : null;
    if (newFile) {
      const problem = validateReceipt(newFile);
      if (problem) return { success: false, message: t.validation[problem] };
    }

    const storage = createAdminClient().storage.from(RECEIPTS_BUCKET);
    let receiptPath = existing?.receiptPath ?? null;
    let staleReceipt: string | null = null;
    let uploaded: string | null = null;

    if (newFile) {
      const path = `${values.date.slice(0, 4)}/${crypto.randomUUID()}.${RECEIPT_MIME_TYPES[newFile.type]}`;
      const { error } = await storage.upload(path, newFile, {
        contentType: newFile.type,
      });
      if (error) {
        console.error('Receipt upload failed', error);
        return { success: false, message: t.errors.receiptUpload };
      }
      uploaded = path;
      staleReceipt = receiptPath;
      receiptPath = path;
    } else if (formData.get('removeReceipt') === 'true') {
      staleReceipt = receiptPath;
      receiptPath = null;
    }

    const data = {
      type: values.type,
      amountCents: parseAmountToCents(values.amount)!,
      date: isoToDate(values.date),
      description: values.description,
      paymentMethod: values.paymentMethod,
      reference: values.reference || null,
      categoryId,
      receiptPath,
    };

    try {
      if (existing) {
        await prisma.transaction.update({
          where: { id: existing.id },
          data: { ...data, updatedById: user.id },
        });
      } else {
        await prisma.transaction.create({
          data: { ...data, createdById: user.id },
        });
      }
    } catch (error) {
      if (uploaded) await storage.remove([uploaded]);
      throw error;
    }

    if (staleReceipt) await storage.remove([staleReceipt]);
    revalidatePath('/main', 'layout');
  }, 'transactionSave');
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await authorize(can.editFinance);
    const deleted = await prisma.transaction.delete({ where: { id } });
    if (deleted.receiptPath) {
      await createAdminClient()
        .storage.from(RECEIPTS_BUCKET)
        .remove([deleted.receiptPath]);
    }
    revalidatePath('/main', 'layout');
  }, 'transactionDelete');
}
