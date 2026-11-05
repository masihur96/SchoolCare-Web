"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Search,
  RefreshCw,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';
import { sanitizeCode, sanitizeDisplayName } from '@/lib/formatters';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

interface SubscriptionItem {
  id: string;
  schoolId?: string;
  school?: {
    id: string;
    name: string;
    schoolId?: string;
  } | null;
  pricingPlan?: {
    id?: string;
    name?: string;
    price?: number;
  } | null;
  planName?: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  status?: string;
  paymentMethod?: string;
  transactionId?: string;
  createdAt?: string;
}

export default function SuperadminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Toggle modal
  const [selectedSub, setSelectedSub] = useState<SubscriptionItem | null>(null);
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/subscriptions`, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });
      if (!res.ok) {
        throw new Error(`Failed to load subscriptions: ${res.statusText}`);
      }
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      setSubscriptions(list);
    } catch (err: any) {
      setError(err?.message || 'Error fetching subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOpenToggle = (sub: SubscriptionItem) => {
    setSelectedSub(sub);
    setToggleModalOpen(true);
  };

  const handleToggleConfirm = async () => {
    if (!selectedSub) return;
    setSubmitting(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/subscriptions/${selectedSub.id}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: '*/*',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to update subscription status');
      }

      setToggleModalOpen(false);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message || 'Failed to update subscription status');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        (sub.school?.name || '').toLowerCase().includes(q) ||
        (sub.schoolId || '').toLowerCase().includes(q) ||
        (sub.planName || sub.pricingPlan?.name || '').toLowerCase().includes(q) ||
        (sub.transactionId || '').toLowerCase().includes(q);

      const isSubActive =
        sub.isActive !== undefined ? sub.isActive : (sub.status || '').toLowerCase() === 'active';
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? isSubActive
          : !isSubActive;

      return matchSearch && matchStatus;
    });
  }, [subscriptions, searchTerm, statusFilter]);

  const activeCount = subscriptions.filter(
    (s) => s.isActive !== false && (s.status || '').toLowerCase() !== 'inactive'
  ).length;
  const inactiveCount = subscriptions.length - activeCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>
            Subscription Management
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            Inspect and control school subscription plans, renewal periods, and active tenant licensing
          </p>
        </div>

        <button
          onClick={fetchSubscriptions}
          disabled={loading}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            color: 'var(--foreground)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Counter Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setStatusFilter('ALL')}
          style={{
            background: statusFilter === 'ALL' ? 'rgba(124, 58, 237, 0.12)' : 'var(--card)',
            border: statusFilter === 'ALL' ? '2px solid #7c3aed' : '1px solid var(--border)',
            borderRadius: '10px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--foreground)',
          }}
        >
          <CreditCard size={16} color="#7c3aed" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>All Subscriptions:</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{subscriptions.length}</span>
        </button>

        <button
          onClick={() => setStatusFilter('ACTIVE')}
          style={{
            background: statusFilter === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'var(--card)',
            border: statusFilter === 'ACTIVE' ? '2px solid #10b981' : '1px solid var(--border)',
            borderRadius: '10px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--foreground)',
          }}
        >
          <CheckCircle2 size={16} color="#10b981" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Licenses:</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{activeCount}</span>
        </button>

        <button
          onClick={() => setStatusFilter('INACTIVE')}
          style={{
            background: statusFilter === 'INACTIVE' ? 'rgba(239, 68, 68, 0.12)' : 'var(--card)',
            border: statusFilter === 'INACTIVE' ? '2px solid #ef4444' : '1px solid var(--border)',
            borderRadius: '10px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--foreground)',
          }}
        >
          <XCircle size={16} color="#ef4444" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Expired / Suspended:</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{inactiveCount}</span>
        </button>
      </div>

      {/* Search Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '8px 14px',
        }}
      >
        <Search size={18} color="var(--muted-foreground)" />
        <input
          type="text"
          placeholder="Search subscriptions by school name, plan, or transaction ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '0.875rem',
            color: 'var(--foreground)',
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#ef4444',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Loading subscriptions...</p>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <CreditCard size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>No subscription records found</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              {searchTerm ? 'Try adjusting your search criteria.' : 'Schools will appear here when subscribed to a pricing plan.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>School / Tenant</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Plan Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Billing / Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Validity Period</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Payment Method</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((sub) => {
                  const isSubActive =
                    sub.isActive !== undefined ? sub.isActive : (sub.status || '').toLowerCase() === 'active';
                  const planTitle = typeof sub.pricingPlan?.name === 'string' ? sub.pricingPlan.name : typeof sub.planName === 'string' ? sub.planName : 'Standard Plan';
                  const rawAmount = sub.amount ?? sub.pricingPlan?.price;
                  const amount = typeof rawAmount === 'number' ? `৳ ${rawAmount.toLocaleString()}` : typeof rawAmount === 'string' ? rawAmount : '—';

                  return (
                    <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Building2 size={16} color="#7c3aed" />
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--foreground)', display: 'block' }}>
                              {sanitizeDisplayName(sub.school?.name, 'Registered Institution')}
                            </span>
                            {sanitizeCode(sub.school?.schoolId) && (
                              <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                                Code: {sanitizeCode(sub.school?.schoolId)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            background: 'rgba(124, 58, 237, 0.1)',
                            color: '#7c3aed',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                          }}
                        >
                          {planTitle}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--foreground)' }}>
                        {amount}
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: 'var(--foreground)' }}>
                            Start: {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '—'}
                          </span>
                          <span style={{ color: 'var(--muted-foreground)' }}>
                            Expires: {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ color: 'var(--foreground)' }}>
                          {sub.paymentMethod || 'ONLINE'}
                        </span>
                        {sub.transactionId && (
                          <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                            TXN: {sub.transactionId}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            background: isSubActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isSubActive ? '#10b981' : '#ef4444',
                          }}
                        >
                          {isSubActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {isSubActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenToggle(sub)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: isSubActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: isSubActive ? '#ef4444' : '#10b981',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {isSubActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TOGGLE STATUS CONFIRMATION MODAL */}
      {toggleModalOpen && selectedSub && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(124, 58, 237, 0.1)',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CreditCard size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  Change Subscription Status?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  Update tenant access permissions & lifecycle
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--muted)', borderRadius: '8px', padding: '12px 14px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Institution:</span>
                <strong style={{ color: 'var(--foreground)' }}>{sanitizeDisplayName(selectedSub.school?.name, 'Registered Institution')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Plan Tier:</span>
                <span style={{ color: '#7c3aed', fontWeight: 600 }}>{selectedSub.pricingPlan?.name || selectedSub.planName || 'Standard'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Target Status:</span>
                <span style={{ fontWeight: 700, color: (selectedSub.isActive !== false && (selectedSub.status || '').toLowerCase() === 'active') ? '#ef4444' : '#10b981' }}>
                  {(selectedSub.isActive !== false && (selectedSub.status || '').toLowerCase() === 'active') ? 'Deactivate / Suspend' : 'Activate Subscription'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setToggleModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--muted)',
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleToggleConfirm}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
