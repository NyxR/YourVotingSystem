import React from 'react';
import { cn } from '@/lib/utils';
import css from '@/components/layout/navbar/navbar.module.css';
import Profile from '@/components/layout/navbar/profile/profile';

type NavbarProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
};

const Navbar = ({ left, right }: NavbarProps) => {
  return (
    <div className={cn(css.navbar)}>
      <div className='flex gap-3'>{left}</div>
      <div className='flex gap-3'>
        <Profile />
      </div>
    </div>
  );
};

export default Navbar;
