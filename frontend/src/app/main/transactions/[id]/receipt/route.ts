import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient, RECEIPTS_BUCKET } from '@/lib/supabase/admin';

/**
 * Opens a transaction's receipt. Receipts live in a private bucket, so this
 * checks the session and redirects to a short-lived signed URL.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await params;
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    select: { receiptPath: true },
  });
  if (!transaction?.receiptPath) {
    return new NextResponse('Receipt not found', { status: 404 });
  }

  const { data, error } = await createAdminClient()
    .storage.from(RECEIPTS_BUCKET)
    .createSignedUrl(transaction.receiptPath, 60);
  if (error || !data) {
    return new NextResponse('Could not open the receipt', { status: 502 });
  }

  return NextResponse.redirect(data.signedUrl);
}
