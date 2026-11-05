"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  Search,
  RefreshCw,
  Building2,
  CheckCircle2,
  XCircle,
  PlusCircle,
  MinusCircle,
  ExternalLink,
  X,
  Loader2,
  AlertTriangle,
  Radio,
  Sliders,
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';
import { sanitizeCode, sanitizeDisplayName } from '@/lib/formatters';
import SchoolAvatar from '@/components/superadmin/school-avatar';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

interface SchoolSmsItem {
  id: string;
  schoolId: string;
  schoolName?: string;
  name?: string;
  avatar?: string | null;
  school?: {
    id: string;
    name: string;
    schoolId?: string;
    avatar?: string | null;
  };
  balance?: number;
  smsBalance?: number;
  totalSent?: number;
  totalPurchased?: number;
  isSmsEnabled?: boolean;
  isActive?: boolean;
  status?: string;
}

export default function SuperadminSmsSchoolsPage() {
  const [schools, setSchools] = useState<SchoolSmsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');

  // Adjust Quota Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolSmsItem | null>(null);
  const [quotaAction, setQuotaAction] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [quotaAmount, setQuotaAmount] = useState<number>(500);
  const [quotaReason, setQuotaReason] = useState<string>('Superadmin quota adjustment');
  const [submittingQuota, setSubmittingQuota] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  // Toggle status loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchSchoolsSms = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
        search: searchTerm,
      });

      const res = await fetch(`${API_BASE_URL}/superadmin/sms/schools?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });

      if (!res.ok) {
        throw new Error(`Failed to load schools SMS metrics: ${res.statusText}`);
      }

      const json = await res.json();
      const list = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.items)
        ? json.items
        : Array.isArray(json)
        ? json
        : [];
      setSchools(list);
    } catch (err: any) {
      setError(err?.message || 'Error fetching school SMS quotas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolsSms();
  }, []);

  const handleOpenAdjust = (school: SchoolSmsItem) => {
    setSelectedSchool(school);
    setQuotaAction('ADD');
    setQuotaAmount(500);
    setQuotaReason('Superadmin quota allocation');
    setQuotaError(null);
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;
    if (!quotaAmount || quotaAmount <= 0) {
      setQuotaError('Please enter a valid credit amount.');
      return;
    }

    setSubmittingQuota(true);
    setQuotaError(null);

    const schoolTargetId = selectedSchool.schoolId || selectedSchool.id || selectedSchool.school?.id;

    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/sms/schools/${schoolTargetId}/adjust-quota`, {
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
        throw new Error(errJson.message || 'Failed to adjust school quota');
      }

      setAdjustModalOpen(false);
      fetchSchoolsSms();
    } catch (err: any) {
      setQuotaError(err.message || 'Failed to adjust quota');
    } finally {
      setSubmittingQuota(false);
    }
  };

  const handleToggleStatus = async (school: SchoolSmsItem) => {
    const schoolTargetId = school.schoolId || school.id || school.school?.id;
    if (!schoolTargetId) return;
    setTogglingId(schoolTargetId);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/sms/schools/${schoolTargetId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: '*/*',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to toggle SMS sending status');
      }

      fetchSchoolsSms();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const schoolName = s.schoolName || s.name || s.school?.name || '';
      const schoolCode = s.schoolId || s.school?.schoolId || s.id || '';
      const q = searchTerm.toLowerCase();

      const matchSearch = schoolName.toLowerCase().includes(q) || schoolCode.toLowerCase().includes(q);

      const isEnabled = s.isSmsEnabled !== false && s.status !== 'DISABLED';
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ENABLED'
          ? isEnabled
          : !isEnabled;

      return matchSearch && matchStatus;
    });
  }, [schools, searchTerm, statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>
            School SMS Quotas & Controls
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            Monitor balance consumption, adjust credits, and manage SMS broadcast capability per campus
          </p>
        </div>

        <button
          onClick={fetchSchoolsSms}
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

      {/* Filter / Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '12px',
        }}
      >
        <div
          style={{
            flex: '1 1 280px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '6px 12px',
          }}
        >
          <Search size={16} color="var(--muted-foreground)" />
          <input
            type="text"
            placeholder="Search school name or school code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.85rem',
              color: 'var(--foreground)',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>SMS Capability:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: '0.825rem',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Schools</option>
            <option value="ENABLED">SMS Enabled</option>
            <option value="DISABLED">SMS Disabled</option>
          </select>
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

      {/* Schools Table */}
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
            <p>Loading school quotas...</p>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Layers size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>No school quotas found</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Ensure schools are registered and active.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>School / Tenant</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Available Balance</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Total Broadcasted</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Total Purchased</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>SMS Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school) => {
                  const schoolId = school.schoolId || school.id || school.school?.id;
                  const schoolName = sanitizeDisplayName(school.schoolName || school.name || school.school?.name, 'Institution');
                  const schoolCode = sanitizeCode(school.schoolId || school.school?.schoolId);
                  const rawBalance: any = (school as any).balance ?? (school as any).smsBalance ?? 0;
                  const balance = typeof rawBalance === 'number' ? rawBalance : (typeof rawBalance === 'object' && rawBalance !== null && typeof rawBalance.balance === 'number' ? rawBalance.balance : 0);
                  const totalSent = typeof school.totalSent === 'number' ? school.totalSent : 0;
                  const totalPurchased = typeof school.totalPurchased === 'number' ? school.totalPurchased : 0;
                  const schoolAvatar = school.avatar || school.school?.avatar;
                  const isEnabled = school.isSmsEnabled !== false && school.status !== 'DISABLED';
                  const isToggling = togglingId === schoolId;

                  return (
                    <tr key={schoolId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <SchoolAvatar
                            avatar={schoolAvatar}
                            name={schoolName}
                            size={36}
                            radius={8}
                          />
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--foreground)', display: 'block' }}>
                              {schoolName}
                            </span>
                            {schoolCode ? (
                              <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                                Code: {schoolCode}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                                Standard Campus
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '1rem',
                            fontWeight: 800,
                            color: balance > 100 ? '#10b981' : balance > 0 ? '#f59e0b' : '#ef4444',
                          }}
                        >
                          {balance.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginLeft: '4px' }}>credits</span>
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--foreground)' }}>
                        {totalSent.toLocaleString()}
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--foreground)' }}>
                        {totalPurchased.toLocaleString()}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(school)}
                          disabled={isToggling}
                          title={isEnabled ? 'Click to Disable SMS capability' : 'Click to Enable SMS capability'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            background: isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isEnabled ? '#10b981' : '#ef4444',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {isToggling ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : isEnabled ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <XCircle size={12} />
                          )}
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenAdjust(school)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                              color: '#ffffff',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.775rem',
                            }}
                          >
                            <Sliders size={13} />
                            Adjust Quota
                          </button>
                          <Link
                            href={`/superadmin/sms/schools/${schoolId}`}
                            title="School SMS Profile & Details"
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--muted)',
                              color: 'var(--foreground)',
                              display: 'flex',
                              alignItems: 'center',
                              textDecoration: 'none',
                            }}
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </div>
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
      {adjustModalOpen && selectedSchool && (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <SchoolAvatar
                  avatar={selectedSchool.avatar || selectedSchool.school?.avatar}
                  name={selectedSchool.schoolName || selectedSchool.name}
                  size={40}
                  radius={8}
                />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    Adjust SMS Quota
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                    {sanitizeDisplayName(selectedSchool.schoolName || selectedSchool.name, 'Selected Institution')}
                  </p>
                </div>
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
              {/* Action Selector: ADD vs DEDUCT */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--foreground)' }}>
                  Adjustment Action
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

              {/* Amount */}
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

              {/* Reason */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--foreground)' }}>
                  Audit Reason / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Promotional credits, Manual top-up, Package credit"
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
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
