import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <main className="page-content animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
