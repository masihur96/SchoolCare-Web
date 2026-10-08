"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { setupFetchInterceptor } from '@/lib/fetchInterceptor';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    setupFetchInterceptor();
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    
    if (!token) {
      // Not logged in, redirect to initial page
      router.replace('/');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  return <>{children}</>;
}
