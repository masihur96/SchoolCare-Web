"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  Building2,
  RefreshCw,
  Layers,
  CheckCircle2,
  XCircle,
  Sliders,
  History,
  Send,
  PlusCircle,
  MinusCircle,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';
import { sanitizeDisplayName } from '@/lib/formatters';
import SchoolAvatar from '@/components/superadmin/school-avatar';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

export default function SingleSchoolSmsDetailPage() {
  const params = useParams();
  const rawSchoolId = params?.schoolId;
  const schoolId = Array.isArray(rawSchoolId) ? rawSchoolId[0] : (rawSchoolId as string) || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  // Adjust Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [quotaAction, setQuotaAction] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [quotaAmount, setQuotaAmount] = useState<number>(500);
  const [quotaReason, setQuotaReason] = useState<string>('Superadmin quota top-up');
  const [submittingQuota, setSubmittingQuota] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const fetchSchoolDetail = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/sms/schools/${schoolId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });

      if (!res.ok) {
        throw new Error(`Failed to load school SMS detail: ${res.statusText}`);
      }

      const json = await res.json();
      setProfile(json.data || json);
    } catch (err: any) {
      setError(err?.message || 'Error fetching school SMS profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolDetail();
  }, [schoolId]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setSubmittingQuota(true);
    setQuotaError(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/sms/schools/${schoolId}/adjust-quota`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
        body: JSON.stringify({
          amount: Number(quotaAmount),
          action: quotaAction,
          reason: quotaReason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to adjust quota');
      }

      setAdjustModalOpen(false);
      fetchSchoolDetail();
    } catch (err: any) {
      setQuotaError(err.message || 'Error adjusting quota');
    } finally {
      setSubmittingQuota(false);
    }
  };

  const schoolName = sanitizeDisplayName(profile?.school?.name || profile?.name, 'Institution SMS Profile');
  const rawBalance: any = (profile as any)?.balance ?? (profile as any)?.smsBalance ?? 0;
  const balance = typeof rawBalance === 'number' ? rawBalance : (typeof rawBalance === 'object' && rawBalance !== null && typeof rawBalance.balance === 'number' ? rawBalance.balance : 0);
  const rawSent = profile?.totalSent ?? profile?.smsSent ?? 0;
  const totalSent = typeof rawSent === 'number' ? rawSent : 0;
  const rawPurchased = profile?.totalPurchased ?? 0;
  const totalPurchased = typeof rawPurchased === 'number' ? rawPurchased : 0;
  const isEnabled = profile?.isSmsEnabled !== false && profile?.status !== 'DISABLED';
  const transactions: any[] = Array.isArray(profile?.transactions) ? profile.transactions : Array.isArray(profile?.history) ? profile.history : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Link */}
      <div>
        <Link
          href="/superadmin/sms/schools"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--muted-foreground)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <ChevronLeft size={16} /> Back to School Quotas
        </Link>
      </div>

      {/* Header Banner */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <SchoolAvatar
            avatar={profile?.avatar || profile?.school?.avatar}
            name={schoolName}
            size={48}
            radius={12}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--foreground)' }}>
                {schoolName}
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  background: isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: isEnabled ? '#10b981' : '#ef4444',
                }}
              >
                {isEnabled ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {isEnabled ? 'SMS Enabled' : 'SMS Disabled'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                {profile?.email || (profile?.domain ? `${profile.domain}.schoolcare.app` : 'Dedicated SMS Channel')}
              </span>
              {profile?.phone && (
                <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  · {profile.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={fetchSchoolDetail}
            disabled={loading}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--muted)',
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
          <button
            onClick={() => setAdjustModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
            }}
          >
            <Sliders size={15} /> Adjust Quota
          </button>
        </div>
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

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Available Quota Balance
          </span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: balance > 0 ? '#10b981' : '#ef4444' }}>
            {loading ? '...' : balance.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block', marginTop: '4px' }}>
            Credits in wallet
          </span>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Lifetime Broadcasted
          </span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--foreground)' }}>
            {loading ? '...' : totalSent.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block', marginTop: '4px' }}>
            Messages delivered
          </span>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Lifetime Purchased
          </span>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--foreground)' }}>
            {loading ? '...' : totalPurchased.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block', marginTop: '4px' }}>
            Total bundle allocations
          </span>
        </div>
      </div>

      {/* School Transactions Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="#7c3aed" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
            School Quota Ledger & Activity History
          </h3>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Loading activity history...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <History size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>No transaction history found</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Allocations and usage events for this school will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Credits</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Reason / Reference</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => {
                  const isCredit = (tx.type || tx.action || '').toUpperCase() === 'ADD' || (tx.type || '').toUpperCase() === 'CREDIT';
                  return (
                    <tr key={tx.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isCredit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isCredit ? '#10b981' : '#ef4444',
                          }}
                        >
                          {tx.type || tx.action || 'TRANSACTION'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: isCredit ? '#10b981' : '#ef4444' }}>
                        {isCredit ? `+${tx.amount}` : `-${tx.amount}`}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--foreground)' }}>
                        {tx.reason || tx.description || tx.reference || 'Quota event'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted-foreground)', fontSize: '0.775rem' }}>
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADJUST QUOTA MODAL */}
      {adjustModalOpen && (
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
              maxWidth: '460px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  Adjust SMS Quota
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  {schoolName}
                </p>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
              >
                <X size={20} />
              </button>
            </div>

            {quotaError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {quotaError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--foreground)' }}>
                  Action
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setQuotaAction('ADD')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: quotaAction === 'ADD' ? '2px solid #10b981' : '1px solid var(--border)',
                      background: quotaAction === 'ADD' ? 'rgba(16, 185, 129, 0.15)' : 'var(--background)',
                      color: quotaAction === 'ADD' ? '#10b981' : 'var(--muted-foreground)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    <PlusCircle size={16} /> Credit (ADD)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuotaAction('DEDUCT')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: quotaAction === 'DEDUCT' ? '2px solid #ef4444' : '1px solid var(--border)',
                      background: quotaAction === 'DEDUCT' ? 'rgba(239, 68, 68, 0.15)' : 'var(--background)',
                      color: quotaAction === 'DEDUCT' ? '#ef4444' : 'var(--muted-foreground)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    <MinusCircle size={16} /> Debit (DEDUCT)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--foreground)' }}>
                  Credit Amount *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quotaAmount}
                  onChange={(e) => setQuotaAmount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--foreground)' }}>
                  Reason / Remarks
                </label>
                <input
                  type="text"
                  value={quotaReason}
                  onChange={(e) => setQuotaReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
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
                  type="submit"
                  disabled={submittingQuota}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background:
                      quotaAction === 'ADD'
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {submittingQuota && <Loader2 size={14} className="animate-spin" />}
                  Confirm {quotaAction}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
