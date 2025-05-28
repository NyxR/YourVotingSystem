import React from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const items = [
  {
    title: 'Home',
    url: '/dashboard',
  },
  {
    title: 'Admins',
    url: '/login',
  },
  {
    title: 'Agents',
    url: 'dashboard',
  },
  {
    title: 'Voting Session',
    url: 'dashboard',
  },
  {
    title: 'Voting Item',
    url: 'dashboard',
  },
];

const AppSidebar = () => {
  return (
    <div className='container h-dvh border-r-2'>
      <div className='flex flex-col'>
        <div className=''>
          <h1 className='text-2xl px-10 py-6'>Voting System</h1>
        </div>
        {items.map((item) => (
          <MenuItem
            key={item.title}
            title={item.title}
            link={item.url}
          />
        ))}
      </div>
    </div>
  );
};

type MenuItemProps = {
  title: string;
  link: string;
};

const MenuItem = ({ title, link }: MenuItemProps) => {
  return (
    <Link
      className={cn(
        'py-4 px-10 cursor-pointer rounded-md no-underline hover:bg-accent hover:text-accent-foreground'
      )}
      href={link}
    >
      {title}
    </Link>
  );
};

export default AppSidebar;
