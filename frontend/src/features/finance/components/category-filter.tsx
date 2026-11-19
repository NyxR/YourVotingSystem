'use client';

import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { fmt } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { NO_CATEGORY, type CategoryOption, type TransactionType } from '../schemas';
import { TYPE_CHECKED_CLASS, TYPE_HEADING_CLASS } from './type-toggle-styles';

const GROUPS: TransactionType[] = ['INCOME', 'EXPENSE'];

/**
 * Multi-select category filter, grouped by Income / Expense. An empty
 * selection means "all categories". `NO_CATEGORY` selects uncategorized rows.
 */
export function CategoryFilter({
  categories,
  selected,
  onChange,
  onlyType,
  className,
}: {
  categories: CategoryOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** When set, only that type's group is offered. */
  onlyType?: TransactionType;
  className?: string;
}) {
  const { t } = useI18n();
  const toggle = (id: string, checked: boolean) =>
    onChange(checked ? [...selected, id] : selected.filter((s) => s !== id));

  const names = new Map(categories.map((c) => [c.id, c.name]));
  names.set(NO_CATEGORY, t.common.uncategorized);
  const label =
    selected.length === 0
      ? t.transactions.allCategories
      : selected.length === 1
        ? (names.get(selected[0]) ?? t.transactions.allCategories)
        : fmt(t.transactions.nCategories, { count: selected.length });

  const groups = GROUPS.filter((g) => !onlyType || g === onlyType);

  // Keep the menu open while ticking several boxes.
  const keepOpen = (e: Event) => e.preventDefault();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          className={cn('w-48 justify-between font-normal', className)}
          aria-label={t.transactions.filterByCategory}
        >
          <span className='truncate'>{label}</span>
          <ChevronDownIcon className='text-muted-foreground' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='max-h-80 w-56 overflow-y-auto'>
        {groups.map((g, i) => {
          const items = categories.filter((c) => c.type === g);
          return (
            <DropdownMenuGroup key={g}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel
                className={cn(
                  'text-xs font-semibold tracking-wide uppercase',
                  TYPE_HEADING_CLASS[g],
                )}
              >
                {t.types[g]}
              </DropdownMenuLabel>
              {items.length === 0 ? (
                <p className='px-2 py-1.5 text-sm text-muted-foreground'>{t.transactions.noCategories}</p>
              ) : (
                items.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    className={cn('my-0.5', TYPE_CHECKED_CLASS[g])}
                    checked={selected.includes(c.id)}
                    onCheckedChange={(v) => toggle(c.id, v === true)}
                    onSelect={keepOpen}
                  >
                    {c.name}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuGroup>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          className='data-[state=checked]:bg-accent data-[state=checked]:font-medium'
          checked={selected.includes(NO_CATEGORY)}
          onCheckedChange={(v) => toggle(NO_CATEGORY, v === true)}
          onSelect={keepOpen}
        >
          {t.common.uncategorized}
        </DropdownMenuCheckboxItem>
        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>{t.transactions.clearSelection}</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
