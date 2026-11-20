'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeftRightIcon,
  ChurchIcon,
  MessagesSquareIcon,
  PieChartIcon,
  ShieldIcon,
  TagsIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
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
import { APP_NAME, HOME_PATH } from '@/lib/app';
import { useI18n } from '@/i18n/client';
import { isManager, type Role } from '@/lib/roles';
import type { MemberType } from '@/lib/member-types';
import type { Responsibility } from '@/lib/responsibilities';
import { fetchUnreadTopicCount } from '@/features/forum/actions/forum.actions';
import { useForumActivity } from '@/features/forum/use-realtime';

export type SidebarUser = {
  name: string;
  email: string;
  role: Role;
  memberType: MemberType;
  phone: string | null;
  responsibilities: Responsibility[];
  avatarUrl: string | null;
};

/**
 * The unread-topics badge: starts from the server's count (refreshed on
 * every navigation) and is refetched live when the forum changes.
 */
function useLiveUnreadCount(initial: number) {
  const [count, setCount] = React.useState(initial);
  const [prevInitial, setPrevInitial] = React.useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setCount(initial);
  }
  useForumActivity(() => {
    fetchUnreadTopicCount()
      .then(setCount)
      .catch(() => {});
  });
  return count;
}

export function AppSidebar({
  user,
  unreadForumTopics,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: SidebarUser;
  unreadForumTopics: number;
}) {
  const { t } = useI18n();
  const unread = useLiveUnreadCount(unreadForumTopics);
  const financeNav: NavItem[] = [
    { title: t.nav.overview, url: '/main/finance', icon: <PieChartIcon /> },
    {
      title: t.nav.transactions,
      url: '/main/transactions',
      icon: <ArrowLeftRightIcon />,
    },
    { title: t.nav.categories, url: '/main/categories', icon: <TagsIcon /> },
  ];
  const communityNav: NavItem[] = [
    {
      title: t.nav.forum,
      url: '/main/forum',
      icon: <MessagesSquareIcon />,
      badge: unread,
      badgeLabel: t.forum.unreadTopics,
    },
    { title: t.nav.members, url: '/main/members', icon: <UsersRoundIcon /> },
  ];
  const adminNav: NavItem[] = [{ title: t.nav.users, url: '/main/users', icon: <UsersIcon /> }];

  return (
    <Sidebar collapsible='offcanvas' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className='data-[slot=sidebar-menu-button]:p-1.5!'>
              <Link href={HOME_PATH}>
                <BrandLogo size={24} className='size-6!' priority />
                <span className='truncate text-base font-semibold'>{APP_NAME}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label={t.nav.community} icon={<ChurchIcon />} items={communityNav} />
        <NavMain label={t.nav.finance} icon={<WalletIcon />} items={financeNav} />
        {isManager(user.role) && (
          <NavMain label={t.nav.administration} icon={<ShieldIcon />} items={adminNav} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
