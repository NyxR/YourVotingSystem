'use client';

import { formatCAD } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/client';
import type { TransactionType } from '../schemas';

/** Signed, coloured amount: "+$1,200.00" / "−45,10 $" in the current language. */
export function Amount({
  cents,
  type,
  className,
}: {
  cents: number;
  type: TransactionType;
  className?: string;
}) {
  const { intl } = useI18n();
  const isIncome = type === 'INCOME';
  return (
    <span
      className={cn(
        'font-medium tabular-nums whitespace-nowrap',
        isIncome ? 'text-income-text' : 'text-expense-text',
        className,
      )}
    >
      {isIncome ? '+' : '−'}
      {formatCAD(cents, intl)}
    </span>
  );
}
