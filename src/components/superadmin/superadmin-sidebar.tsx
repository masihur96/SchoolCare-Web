"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Trash2,
  MessageSquare,
  Package,
  Receipt,
  History,
  Layers,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  Radio,
  User,
  Sparkles,
  ExternalLink,
  BadgePercent,
} from 'lucide-react';
import { clearAuthSession } from '@/lib/auth';

export function SuperadminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false); // Mobile toggle
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop toggle
  const [smsExpanded, setSmsExpanded] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('userProfile');
      if (stored) {
        setProfile(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Auto-expand SMS submenu if active route is under /superadmin/sms
  useEffect(() => {
    if (pathname.startsWith('/superadmin/sms')) {
      setSmsExpanded(true);
    }
  }, [pathname]);

  const handleLogout = () => {
    clearAuthSession();
    router.replace('/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard },
    { name: 'Schools', href: '/superadmin/schools', icon: Building2 },
    { name: 'Users', href: '/superadmin/users', icon: Users },
    { name: 'Subscriptions', href: '/superadmin/subscriptions', icon: CreditCard },
    { name: 'Pricing Plans', href: '/superadmin/pricing', icon: BadgePercent },
    { name: 'Trash & Restore', href: '/superadmin/trash', icon: Trash2 },
  ];

  const smsSubItems = [
    { name: 'Overview', href: '/superadmin/sms', icon: Radio },
    { name: 'School Quotas', href: '/superadmin/sms/schools', icon: Layers },
    { name: 'SMS Packages', href: '/superadmin/sms/packages', icon: Package },
    { name: 'Purchase Orders', href: '/superadmin/sms/purchases', icon: Receipt },
    { name: 'Transactions Log', href: '/superadmin/sms/transactions', icon: History },
  ];

  const isSmsActive = pathname.startsWith('/superadmin/sms');

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        type="button"
        className="mobile-menu-btn md:hidden"
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 60,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px',
          cursor: 'pointer',
          color: 'var(--foreground)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 45,
            backdropFilter: 'blur(2px)',
          }}
          className="md:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`sidebar superadmin-sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''}`}
        style={{
          width: isCollapsed ? '76px' : '260px',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 50,
          background: 'var(--card)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isOpen ? 'translateX(0)' : undefined,
        }}
      >
        {/* Header Branding */}
        <div
          style={{
            height: '70px',
            padding: isCollapsed ? '0 1rem' : '0 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Link
            href="/superadmin/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={22} />
            </div>
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--foreground)',
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                  }}
                >
                  SchoolCare
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#8b5cf6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Sparkles size={10} /> Superadmin
                </span>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="hidden md:flex icon-btn"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted-foreground)',
                padding: '4px',
                borderRadius: '6px',
              }}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div style={{ padding: '8px', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              style={{
                background: 'var(--muted)',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--foreground)',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Nav Links */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isCollapsed ? '12px 6px' : '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/superadmin/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? item.name : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: isCollapsed ? '10px 0' : '9px 12px',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : 'var(--muted-foreground)',
                  background: isActive
                    ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)'
                    : 'transparent',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(124, 58, 237, 0.25)' : 'none',
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}

          {/* SMS Management Group */}
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => setSmsExpanded(!smsExpanded)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: isSmsActive && !smsExpanded ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: isSmsActive ? '#8b5cf6' : 'var(--muted-foreground)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} /> SMS Management
                </span>
                {smsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}

            {(smsExpanded || isCollapsed) && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  marginTop: '4px',
                  paddingLeft: isCollapsed ? '0' : '10px',
                }}
              >
                {smsSubItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive =
                    sub.href === '/superadmin/sms'
                      ? pathname === '/superadmin/sms'
                      : pathname.startsWith(sub.href);
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => setIsOpen(false)}
                      title={isCollapsed ? sub.name : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: isCollapsed ? '8px 0' : '7px 10px',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.825rem',
                        fontWeight: isSubActive ? 600 : 500,
                        color: isSubActive ? '#7c3aed' : 'var(--muted-foreground)',
                        background: isSubActive ? 'rgba(124, 58, 237, 0.12)' : 'transparent',
                        borderLeft: isSubActive && !isCollapsed ? '3px solid #7c3aed' : '3px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <SubIcon size={16} style={{ flexShrink: 0 }} />
                      {!isCollapsed && <span>{sub.name}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Profile & Logout */}
        <div
          style={{
            padding: isCollapsed ? '12px 6px' : '14px 12px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {!isCollapsed ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                borderRadius: '8px',
                background: 'var(--muted)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <p
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: 'var(--foreground)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {profile?.name || 'Super Admin'}
                </p>
                <p
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--muted-foreground)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {profile?.email || 'admin@schoolcare.com'}
                </p>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '10px 0' : '9px 12px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'background 0.15s ease',
            }}
            title="Log Out"
          >
            <LogOut size={16} />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
