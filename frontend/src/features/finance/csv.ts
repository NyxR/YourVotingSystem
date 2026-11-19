import { centsToDecimal } from '@/lib/money';
import {
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPE_LABELS,
  type TransactionRow,
} from './schemas';

function escapeCell(value: string): string {
  // Neutralise spreadsheet formula injection, then quote if needed.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function transactionsToCsv(rows: TransactionRow[]): string {
  const header = [
    'Date',
    'Type',
    'Description',
    'Category',
    'Payment method',
    'Reference',
    'Amount (CAD)',
    'Signed amount (CAD)',
    'Has receipt',
    'Recorded by',
    'Recorded at',
    'Last edited by',
    'Last edited at',
  ];
  const lines = rows.map((r) =>
    [
      r.date,
      TRANSACTION_TYPE_LABELS[r.type],
      r.description,
      r.categoryName ?? 'Uncategorized',
      PAYMENT_METHOD_LABELS[r.paymentMethod],
      r.reference ?? '',
      centsToDecimal(r.amountCents),
      (r.type === 'EXPENSE' ? '-' : '') + centsToDecimal(r.amountCents),
      r.hasReceipt ? 'Yes' : 'No',
      r.createdByName ?? '',
      r.createdAt,
      r.editedAt ? (r.updatedByName ?? '') : '',
      r.editedAt ?? '',
    ]
      .map((v) => escapeCell(String(v)))
      .join(','),
  );
  return [header.join(','), ...lines].join('\r\n');
}

export function downloadCsv(filename: string, csv: string) {
  // BOM so Excel opens UTF-8 (accents, $) correctly.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
