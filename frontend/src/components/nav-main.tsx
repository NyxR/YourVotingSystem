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

export function NavMain({
  label,
  icon,
  items,
}: {
  label?: string;
  /** Shown before the group title (brand blue). */
  icon?: React.ReactNode;
  items: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label && (
        <SidebarGroupLabel className='gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase [&>svg]:size-3.5 [&>svg]:text-primary'>
          {icon}
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        {/* Items line up with the title text (after its 14px icon + 8px gap). */}
        <SidebarMenu className={icon ? 'pl-[22px]' : undefined}>
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
