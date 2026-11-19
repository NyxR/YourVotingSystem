import { formatCAD } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { TransactionType } from '../schemas';

/** Signed, coloured amount: "+$1,200.00" for income, "−$45.10" for expenses. */
export function Amount({
  cents,
  type,
  className,
}: {
  cents: number;
  type: TransactionType;
  className?: string;
}) {
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
      {formatCAD(cents)}
    </span>
  );
}
