import type { TransactionType } from '../schemas';

/**
 * Selected-state colours for Income/Expense toggle items, using the finance
 * theme tokens. Expense is yellow, so it takes dark text (white on yellow is
 * unreadable); income text follows primary-foreground (white / dark navy).
 */
export const TYPE_TOGGLE_CLASS: Record<TransactionType, string> = {
  INCOME:
    'data-[state=on]:bg-income data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-income/90 data-[state=on]:hover:text-primary-foreground',
  EXPENSE:
    'data-[state=on]:bg-expense data-[state=on]:text-[#14213d] data-[state=on]:hover:bg-expense/90 data-[state=on]:hover:text-[#14213d]',
};

/** Checked-state colours for menu checkbox items (including the check icon). */
export const TYPE_CHECKED_CLASS: Record<TransactionType, string> = {
  INCOME:
    'data-[state=checked]:bg-income data-[state=checked]:text-primary-foreground data-[state=checked]:focus:bg-income/90 data-[state=checked]:focus:text-primary-foreground data-[state=checked]:focus:**:text-primary-foreground',
  EXPENSE:
    'data-[state=checked]:bg-expense data-[state=checked]:text-[#14213d] data-[state=checked]:focus:bg-expense/90 data-[state=checked]:focus:text-[#14213d] data-[state=checked]:focus:**:text-[#14213d]',
};

/** Heading (group label) colour per type. */
export const TYPE_HEADING_CLASS: Record<TransactionType, string> = {
  INCOME: 'text-income-text',
  EXPENSE: 'text-expense-text',
};
