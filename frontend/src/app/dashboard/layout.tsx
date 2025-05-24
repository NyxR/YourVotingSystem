import React from 'react';

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return <section>{children}</section>;
};

export default DashboardLayout;
