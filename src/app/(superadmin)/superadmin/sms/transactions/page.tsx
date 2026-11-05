"use client";

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  RefreshCw,
  Building2,
  Calendar,
  Filter,
  PlusCircle,
  MinusCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';
import { sanitizeDisplayName } from '@/lib/formatters';
import SchoolAvatar from '@/components/superadmin/school-avatar';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

interface SmsTransactionItem {
  id: string;
  schoolId?: string;
  school?: {
    id: string;
    name: string;
    schoolId?: string;
    avatar?: string | null;
  } | null;
  type: string; // 'CREDIT' | 'DEBIT' | 'ADJUSTMENT' | 'PURCHASE'
  amount: number;
  balanceAfter?: number;
  reason?: string;
  description?: string;
  reference?: string;
  createdAt: string;
}

export default function SuperadminSmsTransactionsPage() {
  const [transactions, setTransactions] = useState<SmsTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (typeFilter !== 'ALL') {
        params.append('type', typeFilter);
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const res = await fetch(`${API_BASE_URL}/superadmin/sms/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });

      if (!res.ok) {
        throw new Error(`Failed to load SMS transactions: ${res.statusText}`);
      }

      const json = await res.json();
      const rawData = json.data || json;

      if (Array.isArray(rawData)) {
        setTransactions(rawData);
        setTotal(json.total || rawData.length);
      } else if (rawData && Array.isArray(rawData.items)) {
        setTransactions(rawData.items);
        setTotal(rawData.total || rawData.items.length);
      } else if (rawData && Array.isArray(rawData.transactions)) {
        setTransactions(rawData.transactions);
        setTotal(rawData.total || rawData.transactions.length);
      } else {
        setTransactions([]);
        setTotal(0);
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching SMS audit transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, limit, typeFilter]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const isCredit = (type: string) => {
    const t = (type || '').toUpperCase();
    return t === 'CREDIT' || t === 'ADD' || t === 'PURCHASE' || t === 'BONUS';
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>
            SMS Quota Audit & Transactions Log
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            System-wide chronological ledger of SMS quota allocations, campaign deductions, and manual adjustments
          </p>
        </div>

        <button
          onClick={fetchTransactions}
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
          Refresh Log
        </button>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleApplyFilter}
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '12px',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            flex: '1 1 240px',
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
            placeholder="Search school or remarks..."
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
              type="button"
              onClick={() => setSearchTerm('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
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
            <option value="ALL">All Types</option>
            <option value="CREDIT">Credit (Allocated)</option>
            <option value="DEBIT">Debit (Consumed)</option>
            <option value="PURCHASE">Purchase Order</option>
            <option value="ADJUSTMENT">Manual Adjustment</option>
          </select>
        </div>

        {/* Date Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: '0.825rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: '0.825rem',
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: '7px 16px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.825rem',
            cursor: 'pointer',
          }}
        >
          Apply Filters
        </button>
      </form>

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

      {/* Ledger Table */}
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
            <p>Loading audit ledger...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <History size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>No audit transactions found</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Quota changes and broadcast events will be logged here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>School / Tenant</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Quota Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Balance After</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Reason / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const credit = isCredit(tx.type);
                  const schoolName = sanitizeDisplayName(tx.school?.name, 'Global / Platform');

                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px', color: 'var(--muted-foreground)', fontSize: '0.775rem' }}>
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <SchoolAvatar
                            avatar={tx.school?.avatar}
                            name={schoolName}
                            size={22}
                            radius={5}
                          />
                          <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                            {schoolName}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: credit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: credit ? '#10b981' : '#ef4444',
                          }}
                        >
                          {credit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                          {tx.type}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 700, color: credit ? '#10b981' : '#ef4444' }}>
                        {credit ? `+${tx.amount.toLocaleString()}` : `-${tx.amount.toLocaleString()}`}
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--foreground)', fontWeight: 600 }}>
                        {tx.balanceAfter !== undefined ? `${tx.balanceAfter.toLocaleString()} credits` : '—'}
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--foreground)' }}>
                        <span>{tx.reason || tx.description || tx.reference || '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--muted)',
            borderTop: '1px solid var(--border)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} recorded events)
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
