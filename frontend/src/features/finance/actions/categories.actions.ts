'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { authorize, can, runAction, type ActionResult } from '@/lib/auth';
import { categoryFormSchema, type CategoryFormValues } from '../schemas';

const duplicateMessage = 'A category with this name already exists for that type.';

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

export async function createCategory(
  values: CategoryFormValues,
): Promise<ActionResult> {
  return runAction(async () => {
    await authorize(can.editFinance);
    const parsed = categoryFormSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }
    try {
      await prisma.category.create({ data: parsed.data });
    } catch (e) {
      if (isUniqueViolation(e)) return { success: false, message: duplicateMessage };
      throw e;
    }
    revalidatePath('/main', 'layout');
  }, 'Failed to create the category.');
}

/** Renames a category. The type can't change, since its transactions depend on it. */
export async function renameCategory(
  id: string,
  name: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await authorize(can.editFinance);
    const parsed = categoryFormSchema.shape.name.safeParse(name);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }
    try {
      await prisma.category.update({ where: { id }, data: { name: parsed.data } });
    } catch (e) {
      if (isUniqueViolation(e)) return { success: false, message: duplicateMessage };
      throw e;
    }
    revalidatePath('/main', 'layout');
  }, 'Failed to rename the category.');
}

/** Deletes a category; its transactions become uncategorized (FK SET NULL). */
export async function deleteCategory(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await authorize(can.editFinance);
    await prisma.category.delete({ where: { id } });
    revalidatePath('/main', 'layout');
  }, 'Failed to delete the category.');
}
