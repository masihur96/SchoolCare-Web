"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  CreditCard,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
  Plus,
  ArrowRight,
  Radio,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

export default function SuperadminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [smsOverview, setSmsOverview] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    const token = getStoredToken();
    const headers = { Authorization: `Bearer ${token}`, Accept: '*/*' };

    try {
      const [statsRes, smsRes, schoolsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/superadmin/dashboard`, { headers }),
        fetch(`${API_BASE_URL}/superadmin/sms/overview`, { headers }),
        fetch(`${API_BASE_URL}/superadmin/schools`, { headers }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const json = await statsRes.value.json();
        setStats(json.data || json);
      }
      if (smsRes.status === 'fulfilled' && smsRes.value.ok) {
        const json = await smsRes.value.json();
        setSmsOverview(json.data || json);
      }
      if (schoolsRes.status === 'fulfilled' && schoolsRes.value.ok) {
        const json = await schoolsRes.value.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          setSchools(list.slice(0, 5));
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalSchools = typeof stats?.totalSchools === 'number' ? stats.totalSchools : (stats?.schoolsCount ?? schools.length);
  const activeSchools = typeof stats?.activeSchools === 'number' ? stats.activeSchools : (stats?.activeSchoolsCount ?? schools.filter((s) => s.isActive !== false).length);
  const totalUsers = typeof stats?.totalUsers === 'number' ? stats.totalUsers : (stats?.usersCount ?? 0);
  const activeSubscriptions = typeof stats?.activeSubscriptions === 'number' ? stats.activeSubscriptions : (stats?.subscriptionsCount ?? 0);

  const rawBalance = smsOverview?.balance ?? smsOverview?.gatewayBalance ?? stats?.smsBalance;
  let gatewayBalance = '—';
  if (typeof rawBalance === 'number') {
    gatewayBalance = rawBalance.toLocaleString();
  } else if (typeof rawBalance === 'string' && !isNaN(Number(rawBalance))) {
    gatewayBalance = Number(rawBalance).toLocaleString();
  } else if (typeof rawBalance === 'object' && rawBalance !== null) {
    if (typeof rawBalance.balance === 'number') {
      gatewayBalance = rawBalance.balance.toLocaleString();
    } else if (rawBalance.message) {
      gatewayBalance = String(rawBalance.message);
    } else if (rawBalance.status) {
      gatewayBalance = String(rawBalance.status);
    } else {
      gatewayBalance = 'Unavailable';
    }
  }

  const rawSent = smsOverview?.totalSent ?? smsOverview?.smsSent ?? stats?.totalSmsSent;
  const totalSmsSent = typeof rawSent === 'number' ? rawSent.toLocaleString() : (typeof rawSent === 'string' ? rawSent : '0');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            bottom: '-40px',
            opacity: 0.15,
            pointerEvents: 'none',
          }}
        >
          <ShieldCheck size={260} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '750px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
            }}
          >
            <Sparkles size={12} /> Superadmin Central Control Center
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.2 }}>
            Multi-Tenant Platform Overview
          </h2>
          <p style={{ opacity: 0.9, fontSize: '0.9rem', lineHeight: 1.5 }}>
            Monitor and manage registered schools, user quotas, subscription tiers, platform SMS delivery gateways, and system recovery.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <Link
              href="/superadmin/schools"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                color: '#4f46e5',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              }}
            >
              <Plus size={16} /> Register New School
            </Link>
            <Link
              href="/superadmin/sms/schools"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <Layers size={16} /> Manage SMS Quotas
            </Link>
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                color: '#ffffff',
                border: 'none',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                opacity: 0.85,
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Total Schools */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>
              Total Schools
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(79, 70, 229, 0.1)',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--foreground)' }}>
              {loading ? '...' : totalSchools}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
              {activeSchools} Active
            </span>
          </div>
          <Link
            href="/superadmin/schools"
            style={{
              fontSize: '0.75rem',
              color: '#4f46e5',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
          >
            Manage schools <ArrowRight size={12} />
          </Link>
        </div>

        {/* Global Users */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>
              Registered Users
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--foreground)' }}>
              {loading ? '...' : totalUsers}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Across all tenants</span>
          </div>
          <Link
            href="/superadmin/users"
            style={{
              fontSize: '0.75rem',
              color: '#10b981',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
          >
            Inspect user directory <ArrowRight size={12} />
          </Link>
        </div>

        {/* Subscriptions */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>
              Active Subscriptions
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(236, 72, 153, 0.1)',
                color: '#ec4899',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--foreground)' }}>
              {loading ? '...' : activeSubscriptions}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#ec4899', fontWeight: 600 }}>Active plans</span>
          </div>
          <Link
            href="/superadmin/subscriptions"
            style={{
              fontSize: '0.75rem',
              color: '#ec4899',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
          >
            Review subscriptions <ArrowRight size={12} />
          </Link>
        </div>

        {/* SMS Gateway Balance */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>
              SMS Gateway Live Balance
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--foreground)' }}>
              {loading ? '...' : gatewayBalance}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Credits</span>
          </div>
          <Link
            href="/superadmin/sms"
            style={{
              fontSize: '0.75rem',
              color: '#f59e0b',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
          >
            Gateway diagnostics <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Main Grid: Recent Schools & Quick Modules */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Recent Schools Section */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
                Registered Schools
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                Recently active educational institutions
              </p>
            </div>
            <Link
              href="/superadmin/schools"
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#7c3aed',
                textDecoration: 'none',
              }}
            >
              View all
            </Link>
          </div>

          {schools.length === 0 ? (
            <div
              style={{
                padding: '2rem 1rem',
                textAlign: 'center',
                color: 'var(--muted-foreground)',
                fontSize: '0.875rem',
              }}
            >
              {loading ? 'Loading institutions...' : 'No schools found.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {schools.map((school) => (
                <div
                  key={school.id || school.schoolId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--muted)',
                    borderRadius: '10px',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        flexShrink: 0,
                      }}
                    >
                      {school.name ? school.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--foreground)',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {school.name}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                        {school.domain ? (
                          <span style={{ fontSize: '0.725rem', color: '#7c3aed', fontWeight: 600 }}>
                            {school.domain}.schoolcare.app
                          </span>
                        ) : school.email ? (
                          <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                            {school.email}
                          </span>
                        ) : null}
                        {school.phone && (
                          <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                            {school.domain || school.email ? `· ${school.phone}` : school.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        background: school.isActive !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: school.isActive !== false ? '#10b981' : '#ef4444',
                      }}
                    >
                      {school.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                    <Link
                      href={`/superadmin/sms/schools/${school.id || school.schoolId}`}
                      title="View School SMS Profile"
                      style={{
                        color: 'var(--muted-foreground)',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                      }}
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Hub Navigation Cards */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
              Superadmin Control Hub
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
              Quick navigation to privileged administrative operations
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* Schools Management */}
            <Link
              href="/superadmin/schools"
              style={{
                textDecoration: 'none',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Building2 size={20} color="#4f46e5" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Schools Registry
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                Add, edit, or trash schools
              </span>
            </Link>

            {/* Users Directory */}
            <Link
              href="/superadmin/users"
              style={{
                textDecoration: 'none',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Users size={20} color="#10b981" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Global Users
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                View all system accounts
              </span>
            </Link>

            {/* Subscriptions */}
            <Link
              href="/superadmin/subscriptions"
              style={{
                textDecoration: 'none',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <CreditCard size={20} color="#ec4899" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Subscriptions
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                Activate or halt plans
              </span>
            </Link>

            {/* Trash & Restore */}
            <Link
              href="/superadmin/trash"
              style={{
                textDecoration: 'none',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Trash2 size={20} color="#f59e0b" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Trash & Restore
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                Recover soft-deleted data
              </span>
            </Link>

            {/* SMS Packages */}
            <Link
              href="/superadmin/sms/packages"
              style={{
                textDecoration: 'none',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <MessageSquare size={20} color="#8b5cf6" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                SMS Pricing
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                Configure credit bundles
              </span>
            </Link>

            {/* SMS Orders */}
            <Link
              href="/superadmin/sms/purchases"
              style={{
                textDecoration: 'none',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <CheckCircle2 size={20} color="#06b6d4" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Purchase Orders
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                Approve school orders
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
