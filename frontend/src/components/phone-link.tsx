'use client';

import { PhoneIcon } from 'lucide-react';
import { fmt } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { formatPhone, telHref } from '@/lib/phone';

/** Tap-to-call contact number, or a dash when there is none. */
export function PhoneLink({ phone, name }: { phone: string | null | undefined; name: string }) {
  const { t } = useI18n();
  if (!phone) return <span className='text-muted-foreground'>—</span>;
  return (
    <a
      href={telHref(phone)}
      className='inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums underline-offset-4 hover:underline'
      aria-label={fmt(t.users.call, { name })}
    >
      <PhoneIcon className='size-3.5 text-muted-foreground' />
      {formatPhone(phone)}
    </a>
  );
}
