import React from 'react';
import { SuperadminGuard } from '@/components/superadmin/superadmin-guard';
import { SuperadminSidebar } from '@/components/superadmin/superadmin-sidebar';
import { SuperadminNavbar } from '@/components/superadmin/superadmin-navbar';

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SuperadminGuard>
      <div className="app-layout superadmin-layout">
        <SuperadminSidebar />
        <div className="main-content">
          <SuperadminNavbar />
          <main className="page-content" style={{ padding: '1.5rem', minHeight: 'calc(100vh - 70px)' }}>
            {children}
          </main>
        </div>
      </div>
    </SuperadminGuard>
  );
}
