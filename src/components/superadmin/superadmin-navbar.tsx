"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  Sun,
  Moon,
  Activity,
  Layers,
  Radio,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { getStoredToken } from '@/lib/auth';

export function SuperadminNavbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchBalance();
  }, []);

  async function fetchBalance() {
    setBalanceLoading(true);
    try {
      const token = getStoredToken();
      if (!token) return;
      const res = await fetch(
        'https://smart-school-backend-production.up.railway.app/superadmin/sms/overview',
        {
          headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
        }
      );
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const raw = data?.balance ?? data?.gatewayBalance ?? data?.liveBalance;
        if (typeof raw === 'number') {
          setBalance(raw);
        } else if (typeof raw === 'string' && !isNaN(Number(raw))) {
          setBalance(Number(raw));
        } else if (typeof raw === 'object' && raw !== null && typeof raw.balance === 'number') {
          setBalance(raw.balance);
        } else {
          setBalance(null);
        }
      }
    } catch {
      // ignore
    } finally {
      setBalanceLoading(false);
    }
  }

  // Format breadcrumb title
  const getPageTitle = () => {
    if (pathname.includes('/superadmin/schools')) return 'Schools Directory';
    if (pathname.includes('/superadmin/users')) return 'Global Users Management';
    if (pathname.includes('/superadmin/subscriptions')) return 'Subscription Management';
    if (pathname.includes('/superadmin/trash')) return 'Trash & Entity Recovery';
    if (pathname.includes('/superadmin/sms/schools')) return 'School SMS Quotas & Controls';
    if (pathname.includes('/superadmin/sms/packages')) return 'SMS Pricing Packages';
    if (pathname.includes('/superadmin/sms/purchases')) return 'SMS Purchase Orders';
    if (pathname.includes('/superadmin/sms/transactions')) return 'SMS Audit Transactions';
    if (pathname.includes('/superadmin/sms')) return 'Global SMS Gateway Hub';
    return 'Superadmin Dashboard';
  };

  return (
    <header
      style={{
        height: '70px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Left: Breadcrumbs & Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ marginLeft: '2.5rem' }} className="md:!ml-0">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
              Superadmin
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>/</span>
            <span style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 600 }}>
              {pathname.replace('/superadmin/', '').replace('/superadmin', 'Overview')}
            </span>
          </div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)' }}>
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* SMS Live Balance Pill */}
        <div
          title="SMS Gateway Live Balance"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--muted)',
            padding: '6px 12px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            border: '1px solid var(--border)',
          }}
          className="hidden sm:flex"
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
            }}
          />
          <span style={{ color: 'var(--muted-foreground)' }}>SMS Gateway:</span>
          <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>
            {typeof balance === 'number' ? `${balance.toLocaleString()} credits` : 'Online'}
          </span>
          <button
            type="button"
            onClick={fetchBalance}
            disabled={balanceLoading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted-foreground)',
              display: 'flex',
              padding: 0,
            }}
          >
            <RefreshCw size={12} className={balanceLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Superadmin Badge */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(79, 70, 229, 0.15))',
            color: '#7c3aed',
            padding: '5px 12px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            border: '1px solid rgba(124, 58, 237, 0.3)',
          }}
        >
          <ShieldCheck size={14} />
          SUPERADMIN
        </span>

        {/* Theme Toggle */}
        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="icon-btn"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--foreground)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        )}
      </div>
    </header>
  );
}
