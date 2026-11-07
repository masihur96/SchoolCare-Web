"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setupFetchInterceptor } from '@/lib/fetchInterceptor';
import { getStoredToken, getCachedUserRole, fetchCurrentUserProfile } from '@/lib/auth';

export function SuperadminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    setupFetchInterceptor();

    async function checkAuth() {
      const token = getStoredToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      let role = getCachedUserRole();
      if (!role) {
        const profile = await fetchCurrentUserProfile(token);
        role = (profile?.role || '').toLowerCase();
      }

      if (role === 'superadmin') {
        setIsAuthorized(true);
      } else if (role === 'admin') {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }

    checkAuth();
  }, [router]);

  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '42px', height: '42px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', fontWeight: 500 }}>
          Verifying Superadmin Access...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <>{children}</>;
}
