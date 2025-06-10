import React from 'react';
import Navbar from '@/components/molecules/navbar/navbar';
import AppSidebar from '@/components/organisms/app_sidebar';
import { Card } from '@/components/ui/card';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <section className='w-full h-full'>
      <div className='flex h-full'>
        <div className='mx-2 my-2 grow-[1]'>
          <AppSidebar />
        </div>
        <div className='mr-2 my-2 grow-[8]'>
          <div className='flex flex-col h-full gap-2'>
            <Navbar
              left={
                <h1 className='text-2xl cursor-pointer'>
                  {'> Dashboard'}
                </h1>
              }
            />
            <Card className='flex-1 bg-background'>{children}</Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardLayout;
