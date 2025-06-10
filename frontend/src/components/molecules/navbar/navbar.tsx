import React from 'react';
import { cn } from '@/lib/utils';
import css from '@/components/layout/navbar/navbar.module.css';
import Profile from '@/components/molecules/navbar/profile/profile';
import { Card } from '@/components/ui/card';

type NavbarProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
};

const Navbar = ({ left, right }: NavbarProps) => {
  return (
    <Card className='bg-primary'>
      <div className='flex px-4 py-4 justify-between'>
        <div className='flex gap-3'>{left}</div>
        <div className='flex gap-3'>
          <Profile />
        </div>
      </div>
    </Card>
  );
};

export default Navbar;
