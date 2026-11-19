import { centsToDecimal } from '@/lib/money';
import type { Messages } from '@/i18n/messages/en';
import type { TransactionRow } from './schemas';

function escapeCell(value: string): string {
  // Neutralise spreadsheet formula injection, then quote if needed.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * CSV with headers and labels in the current language. Amounts stay as plain
 * "1234.50" numbers so spreadsheets in any locale can parse them.
 */
export function transactionsToCsv(rows: TransactionRow[], t: Messages): string {
  const c = t.csv;
  const header = [
    c.date,
    c.type,
    c.description,
    c.category,
    c.paymentMethod,
    c.reference,
    c.amount,
    c.signedAmount,
    c.hasReceipt,
    c.recordedBy,
    c.recordedAt,
    c.lastEditedBy,
    c.lastEditedAt,
  ];
  const lines = rows.map((r) =>
    [
      r.date,
      t.types[r.type],
      r.description,
      r.categoryName ?? t.common.uncategorized,
      t.paymentMethods[r.paymentMethod],
      r.reference ?? '',
      centsToDecimal(r.amountCents),
      (r.type === 'EXPENSE' ? '-' : '') + centsToDecimal(r.amountCents),
      r.hasReceipt ? c.yes : c.no,
      r.createdByName ?? '',
      r.createdAt,
      r.editedAt ? (r.updatedByName ?? '') : '',
      r.editedAt ?? '',
    ]
      .map((v) => escapeCell(String(v)))
      .join(','),
  );
  return [header.map(escapeCell).join(','), ...lines].join('\r\n');
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
