import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { AuthGuard } from '@/components/auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <main className="page-content animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
