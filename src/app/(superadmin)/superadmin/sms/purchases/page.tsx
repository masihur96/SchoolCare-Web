"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  RefreshCw,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  Loader2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';
import { sanitizeCode, sanitizeDisplayName } from '@/lib/formatters';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

interface SmsPurchaseItem {
  id: string;
  schoolId?: string;
  school?: {
    id: string;
    name: string;
    schoolId?: string;
  } | null;
  package?: {
    id: string;
    name: string;
    smsCount: number;
    price: number;
  } | null;
  packageName?: string;
  smsCount?: number;
  amount?: number;
  price?: number;
  paymentMethod?: string;
  transactionId?: string;
  status: string; // 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  notes?: string;
  createdAt?: string;
}

export default function SuperadminSmsPurchasesPage() {
  const [purchases, setPurchases] = useState<SmsPurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Status Update Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SmsPurchaseItem | null>(null);
  const [newStatus, setNewStatus] = useState<string>('APPROVED');
  const [submitting, setSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchPurchases = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const res = await fetch(`${API_BASE_URL}/superadmin/sms/purchases?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });

      if (!res.ok) {
        throw new Error(`Failed to load SMS purchases: ${res.statusText}`);
      }

      const json = await res.json();
      const rawData = json.data || json;

      if (Array.isArray(rawData)) {
        setPurchases(rawData);
        setTotal(json.total || rawData.length);
      } else if (rawData && Array.isArray(rawData.items)) {
        setPurchases(rawData.items);
        setTotal(rawData.total || rawData.items.length);
      } else if (rawData && Array.isArray(rawData.purchases)) {
        setPurchases(rawData.purchases);
        setTotal(rawData.total || rawData.purchases.length);
      } else {
        setPurchases([]);
        setTotal(0);
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [page, limit, statusFilter]);

  const handleOpenStatusModal = (order: SmsPurchaseItem, defaultStat = 'APPROVED') => {
    setSelectedOrder(order);
    setNewStatus(defaultStat);
    setStatusError(null);
    setStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);
    setStatusError(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/sms/purchases/${selectedOrder.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to update purchase order status');
      }

      setStatusModalOpen(false);
      fetchPurchases();
    } catch (err: any) {
      setStatusError(err.message || 'Error updating order status');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED' || s === 'COMPLETED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={12} /> {s}
        </span>
      );
    }
    if (s === 'PENDING') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <Clock size={12} /> PENDING
        </span>
      );
    }
    if (s === 'REJECTED' || s === 'CANCELLED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <XCircle size={12} /> {s}
        </span>
      );
    }
    return (
      <span
        style={{
          background: 'var(--muted)',
          color: 'var(--muted-foreground)',
          padding: '3px 8px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        {status}
      </span>
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>
            SMS Purchase Orders
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            Review purchase requests, verify payment references, and approve SMS quota credits
          </p>
        </div>

        <button
          onClick={fetchPurchases}
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
            placeholder="Search by school, TXN ID, or bundle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchPurchases();
            }}
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
              onClick={() => {
                setSearchTerm('');
                fetchPurchases();
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Order Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
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

      {/* Orders Table */}
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
            <p>Loading purchase orders...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Receipt size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>No purchase orders found</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              School bundle checkout requests will appear here for verification.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>School / Tenant</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Package & Credits</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Payment & Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Transaction Ref</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Order Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((order) => {
                  const schoolName = sanitizeDisplayName(order.school?.name, 'Institutional Order');
                  const schoolCode = sanitizeCode(order.school?.schoolId);
                  const pkgName = order.package?.name || order.packageName || 'SMS Bundle';
                  const credits = order.package?.smsCount ?? order.smsCount ?? 0;
                  const price = order.package?.price ?? order.amount ?? order.price ?? 0;
                  const isPending = (order.status || '').toUpperCase() === 'PENDING';

                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Building2 size={16} color="#7c3aed" />
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--foreground)', display: 'block' }}>
                              {schoolName}
                            </span>
                            {schoolCode && (
                              <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                                Code: {schoolCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)', display: 'block' }}>
                          {pkgName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 700 }}>
                          +{credits.toLocaleString()} Credits
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--foreground)', display: 'block' }}>
                          ৳ {price.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                          via {order.paymentMethod || 'ONLINE'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <code style={{ fontSize: '0.775rem', color: '#7c3aed', background: 'var(--muted)', padding: '2px 6px', borderRadius: '4px' }}>
                          {order.transactionId || 'N/A'}
                        </code>
                        {order.notes && (
                          <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                            {order.notes}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {getStatusBadge(order.status)}
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--muted-foreground)', fontSize: '0.775rem' }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {isPending ? (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenStatusModal(order, 'APPROVED')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#10b981',
                                color: '#ffffff',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              onClick={() => handleOpenStatusModal(order, 'REJECTED')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              <X size={12} /> Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenStatusModal(order, order.status)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--muted)',
                              color: 'var(--foreground)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Update
                          </button>
                        )}
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
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total orders)
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

      {/* UPDATE STATUS MODAL */}
      {statusModalOpen && selectedOrder && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  Update Order Status
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  {sanitizeDisplayName(selectedOrder.school?.name, 'Institutional Order')} · {selectedOrder.package?.name || 'SMS Package'}
                </p>
              </div>
              <button
                onClick={() => setStatusModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
              >
                <X size={20} />
              </button>
            </div>

            {statusError && (
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
                {statusError}
              </div>
            )}

            <form onSubmit={handleStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--foreground)' }}>
                  Select Order Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  <option value="APPROVED">APPROVED (Credit Quota to School)</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="PENDING">PENDING (Awaiting Verification)</option>
                  <option value="REJECTED">REJECTED (Decline Order)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
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
                  disabled={submitting}
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
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
