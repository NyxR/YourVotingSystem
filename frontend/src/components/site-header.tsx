'use client';

import { usePathname } from 'next/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useI18n } from '@/i18n/client';
import type { Messages } from '@/i18n/messages/en';

const TITLES: [prefix: string, key: keyof Messages['nav']][] = [
  ['/main/finance', 'financeOverview'],
  ['/main/transactions', 'transactions'],
  ['/main/categories', 'categories'],
  ['/main/users', 'users'],
];

export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useI18n();
  const key = TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1];

  return (
    <header className='flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)'>
      <div className='flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mx-2 data-[orientation=vertical]:h-4' />
        <h1 className='text-base font-medium'>{key ? t.nav[key] : ''}</h1>
        <LanguageSwitcher className='ml-auto' />
      </div>
    </header>
  );
}
