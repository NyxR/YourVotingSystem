'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeftRightIcon,
  PieChartIcon,
  TagsIcon,
  UsersIcon,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { NavMain, type NavItem } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { APP_NAME } from '@/lib/app';
import { useI18n } from '@/i18n/client';
import type { Role } from '@/lib/roles';

export type SidebarUser = { name: string; email: string; role: Role };

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: SidebarUser }) {
  const { t } = useI18n();
  const financeNav: NavItem[] = [
    { title: t.nav.overview, url: '/main/finance', icon: <PieChartIcon /> },
    { title: t.nav.transactions, url: '/main/transactions', icon: <ArrowLeftRightIcon /> },
    { title: t.nav.categories, url: '/main/categories', icon: <TagsIcon /> },
  ];
  const adminNav: NavItem[] = [{ title: t.nav.users, url: '/main/users', icon: <UsersIcon /> }];

  return (
    <Sidebar collapsible='offcanvas' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className='data-[slot=sidebar-menu-button]:p-1.5!'>
              <Link href='/main/finance'>
                <BrandLogo size={24} className='size-6!' priority />
                <span className='truncate text-base font-semibold'>{APP_NAME}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label={t.nav.finance} items={financeNav} />
        {user.role === 'admin' && <NavMain label={t.nav.administration} items={adminNav} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
