'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { authorize, can, runAction, type ActionResult } from '@/lib/auth';
import { createAdminClient, RECEIPTS_BUCKET } from '@/lib/supabase/admin';
import { parseAmountToCents } from '@/lib/money';
import { isoToDate } from '@/lib/dates';
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

    const parsed = transactionFormSchema.safeParse(
      Object.fromEntries(FORM_FIELDS.map((k) => [k, formData.get(k) ?? ''])),
    );
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
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
          message: 'Pick a category that matches the transaction type.',
        };
      }
    }

    const id = String(formData.get('id') ?? '') || null;
    const existing = id
      ? await prisma.transaction.findUnique({ where: { id } })
      : null;
    if (id && !existing) {
      return { success: false, message: 'This transaction no longer exists.' };
    }

    const receipt = formData.get('receipt');
    const newFile = receipt instanceof File && receipt.size > 0 ? receipt : null;
    if (newFile) {
      const problem = validateReceipt(newFile);
      if (problem) return { success: false, message: problem };
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
        return { success: false, message: 'Could not upload the receipt.' };
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
  }, 'Failed to save the transaction.');
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
  }, 'Failed to delete the transaction.');
}
