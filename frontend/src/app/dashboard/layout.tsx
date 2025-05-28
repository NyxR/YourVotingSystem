import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import Navbar from '@/components/layout/navbar/navbar';
import AppSidebar from '@/components/layout/app_sidebar/app_sidebar';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <section className='w-screen h-screen'>
        <div className='grid grid-flow-col grid-rows-10'>
          <div className='row-span-10 col-span-1'>
            <AppSidebar />
          </div>
          <div className='col-span-10'>
            <Navbar
              left={
                <h1 className='text-2xl cursor-pointer'>
                  {'> Dashboard'}
                </h1>
              }
            />
          </div>
          <div className='col-span-10 row-span-9'>{children}</div>
        </div>
      </section>
    </SidebarProvider>
  );
};

export default DashboardLayout;
