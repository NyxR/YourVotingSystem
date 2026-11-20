'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export type NavItem = {
  title: string;
  url: string;
  icon?: React.ReactNode;
  /** Small count on the right (e.g. unread topics); hidden when 0. */
  badge?: number;
  badgeLabel?: string;
};

export function NavMain({ label, items }: { label?: string; items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
              >
                <Link href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              {!!item.badge && (
                <SidebarMenuBadge className='bg-primary text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-active/menu-button:text-primary-foreground'>
                  {item.badge > 99 ? '99+' : item.badge}
                  {item.badgeLabel && <span className='sr-only'> {item.badgeLabel}</span>}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
