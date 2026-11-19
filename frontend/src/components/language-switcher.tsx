'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LanguagesIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LOCALE_NAMES, LOCALES } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { setLocale } from '@/i18n/locale.actions';
import { cn } from '@/lib/utils';

/** English / Français selector. Saves the choice and re-renders the page. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={locale}
      disabled={pending}
      onValueChange={(next) =>
        startTransition(async () => {
          await setLocale(next);
          router.refresh();
        })
      }
    >
      <SelectTrigger size='sm' className={cn('w-34', className)} aria-label={t.common.language}>
        <LanguagesIcon className='text-muted-foreground' />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align='end'>
        {LOCALES.map((l) => (
          <SelectItem key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
