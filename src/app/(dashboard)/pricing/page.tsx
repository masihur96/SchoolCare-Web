"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard, Plus, Trash2, Edit3, RotateCcw, Calculator, RefreshCw,
  Search, Shield, CheckCircle2, AlertCircle, Info, Sparkles,
  ArrowRight, Users, Tag, DollarSign, Layers, ChevronDown, Check,
  Sliders, LayoutGrid, Table, Calendar, X, AlertTriangle, ArrowUpDown, Clock
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

// ─── Interfaces ─────────────────────────────────────────────────────────────
export interface PricingPlan {
  id: string;
  name: string;
  maxStudents: number;
  minStudents: number;
  pricePerMonth: string;
  pricePerStudent: string;
  description: string;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PricingDetails {
  setupFee: number;
  setupFeeFrequency: string;
  trialDays: number;
  marketingLines: string[];
}

export interface CalculateResult {
  plan: PricingPlan | null;
  estimatedMonthlyCost: string;
  effectivePerStudentRate?: string;
}

interface ToastState {
  msg: string;
  type: 'success' | 'error' | 'info';
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const getAuthToken = () => {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('accessToken') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('access_token') ||
    ''
  );
};

const getHeaders = (includeAuth = true): HeadersInit => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: '*/*',
  };
  if (includeAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const formatCurrency = (val: string | number | undefined) => {
  if (val === undefined || val === null || val === '') return '৳0';
  const str = String(val).trim();
  if (isNaN(Number(str))) return str;
  return `৳${Number(str).toLocaleString('en-US')}`;
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function PricingManagementPage() {
  const { t } = useLanguage();

  // ─── Data States ────────────────────────────────────────────────────────────
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [details, setDetails] = useState<PricingDetails | null>(null);
  const [trashedPlans, setTrashedPlans] = useState<PricingPlan[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // ─── Search & Filter States ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'standard' | 'custom'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'students-asc' | 'students-desc' | 'name-asc'>('default');

  // ─── Calculator States ──────────────────────────────────────────────────────
  const [calcStudents, setCalcStudents] = useState<number>(250);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcResult, setCalcResult] = useState<CalculateResult | null>(null);
  const [isCalcOpen, setIsCalcOpen] = useState(true);

  // ─── Modal States ───────────────────────────────────────────────────────────
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    minStudents: 0,
    maxStudents: 100,
    pricePerMonth: '1000',
    pricePerStudent: '10',
    description: '',
    isCustom: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal
  const [deletingPlan, setDeletingPlan] = useState<PricingPlan | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Restoring state
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Fetch APIs ─────────────────────────────────────────────────────────────

  // 1. GET /pricing/plans
  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/pricing/plans`, {
        headers: getHeaders(false),
      });
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json) ? json : json.data || [];
        setPlans(data);
      } else {
        console.error('Failed to fetch pricing plans', res.status);
      }
    } catch (e) {
      console.error('Error fetching pricing plans', e);
    }
  }, []);

  // 2. GET /pricing/details
  const fetchDetails = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/pricing/details`, {
        headers: getHeaders(false),
      });
      if (res.ok) {
        const json = await res.json();
        setDetails(json.data || json);
      }
    } catch (e) {
      console.error('Error fetching pricing details', e);
    }
  }, []);

  // 3. GET /pricing/trash (Superadmin only)
  const fetchTrash = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/pricing/trash`, {
        headers: getHeaders(true),
      });
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json) ? json : json.data || [];
        setTrashedPlans(data);
      } else if (res.status === 401 || res.status === 403) {
        console.warn('Trash plans requires superadmin privileges.');
      }
    } catch (e) {
      console.error('Error fetching trash plans', e);
    }
  }, []);

  // Load all data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([fetchPlans(), fetchDetails(), fetchTrash()]);
    setLoading(false);
  }, [fetchPlans, fetchDetails, fetchTrash]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([fetchPlans(), fetchDetails(), fetchTrash()]);
    setRefreshing(false);
    showToast(t('common.refresh') || 'Refreshed successfully', 'info');
  };

  // 4. GET /pricing/calculate (Calculate price based on student count)
  const calculatePrice = useCallback(async (students: number) => {
    if (students < 0) return;
    setCalcLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pricing/calculate?students=${encodeURIComponent(students)}`, {
        headers: getHeaders(false),
      });
      if (res.ok) {
        const json = await res.json();
        setCalcResult(json.data || json);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Calculation error', err);
      }
    } catch (e) {
      console.error('Failed to calculate pricing', e);
    } finally {
      setCalcLoading(false);
    }
  }, []);

  // Run calculation when calcStudents changes (debounced)
  useEffect(() => {
    const handler = setTimeout(() => {
      calculatePrice(calcStudents);
    }, 350);
    return () => clearTimeout(handler);
  }, [calcStudents, calculatePrice]);

  // 5. POST /pricing (Create Plan)
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Plan name is required');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        isCustom: formData.isCustom,
        minStudents: Number(formData.minStudents) || 0,
        maxStudents: Number(formData.maxStudents) || 0,
        pricePerMonth: String(formData.pricePerMonth || '0'),
        pricePerStudent: String(formData.pricePerStudent || '0'),
        description: formData.description.trim(),
      };

      const res = await fetch(`${API_BASE_URL}/pricing`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMessage = Array.isArray(errJson.message)
          ? errJson.message.join(', ')
          : errJson.message || errJson.error || 'Failed to create pricing plan';
        throw new Error(errMessage);
      }

      showToast('Pricing plan created successfully!', 'success');
      setModalMode(null);
      await fetchPlans();
      if (calcStudents) calculatePrice(calcStudents);
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // 6. PATCH /pricing/{id} (Update Plan)
  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    if (!formData.name.trim()) {
      setFormError('Plan name is required');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        isCustom: formData.isCustom,
        minStudents: Number(formData.minStudents) || 0,
        maxStudents: Number(formData.maxStudents) || 0,
        pricePerMonth: String(formData.pricePerMonth || '0'),
        pricePerStudent: String(formData.pricePerStudent || '0'),
        description: formData.description.trim(),
      };

      const res = await fetch(`${API_BASE_URL}/pricing/${editingPlan.id}`, {
        method: 'PATCH',
        headers: getHeaders(true),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMessage = Array.isArray(errJson.message)
          ? errJson.message.join(', ')
          : errJson.message || errJson.error || 'Failed to update pricing plan';
        throw new Error(errMessage);
      }

      showToast(`Plan "${formData.name}" updated successfully!`, 'success');
      setModalMode(null);
      setEditingPlan(null);
      await fetchPlans();
      if (calcStudents) calculatePrice(calcStudents);
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // 7. DELETE /pricing/{id} (Soft-Delete Plan)
  const handleDeletePlan = async () => {
    if (!deletingPlan) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pricing/${deletingPlan.id}`, {
        method: 'DELETE',
        headers: getHeaders(true),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMessage = Array.isArray(errJson.message)
          ? errJson.message.join(', ')
          : errJson.message || errJson.error || 'Failed to delete plan';
        throw new Error(errMessage);
      }

      showToast(`Plan "${deletingPlan.name}" moved to Trash`, 'success');
      setDeletingPlan(null);
      await Promise.all([fetchPlans(), fetchTrash()]);
      if (calcStudents) calculatePrice(calcStudents);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete plan', 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // 8. PATCH /pricing/{id}/restore (Restore soft-deleted plan)
  const handleRestorePlan = async (id: string, name: string) => {
    setRestoringId(id);
    try {
      let res = await fetch(`${API_BASE_URL}/pricing/${id}/restore`, {
        method: 'PATCH',
        headers: getHeaders(true),
      });

      // Defensive fallback if superadmin nested route is used
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE_URL}/superadmin/trash/pricing/${id}/restore`, {
          method: 'PATCH',
          headers: getHeaders(true),
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMessage = Array.isArray(errJson.message)
          ? errJson.message.join(', ')
          : errJson.message || errJson.error || 'Failed to restore plan';
        throw new Error(errMessage);
      }

      showToast(`Plan "${name}" restored successfully!`, 'success');
      await Promise.all([fetchPlans(), fetchTrash()]);
      if (calcStudents) calculatePrice(calcStudents);
    } catch (err: any) {
      showToast(err.message || 'Failed to restore plan', 'error');
    } finally {
      setRestoringId(null);
    }
  };

  // ─── Modal Openers ──────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setFormData({
      name: '',
      minStudents: 0,
      maxStudents: 150,
      pricePerMonth: '1000',
      pricePerStudent: '10',
      description: '',
      isCustom: false,
    });
    setFormError(null);
    setEditingPlan(null);
    setModalMode('create');
  };

  const openEditModal = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      minStudents: plan.minStudents || 0,
      maxStudents: plan.maxStudents || 0,
      pricePerMonth: plan.pricePerMonth || '0',
      pricePerStudent: plan.pricePerStudent || '0',
      description: plan.description || '',
      isCustom: Boolean(plan.isCustom),
    });
    setFormError(null);
    setModalMode('edit');
  };

  // ─── Filtering & Sorting Plans ──────────────────────────────────────────────
  const filteredPlans = useMemo(() => {
    const list = activeTab === 'active' ? plans : trashedPlans;
    return list.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (typeFilter === 'standard') return !p.isCustom;
      if (typeFilter === 'custom') return p.isCustom;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return Number(a.pricePerMonth || 0) - Number(b.pricePerMonth || 0);
      if (sortBy === 'price-desc') return Number(b.pricePerMonth || 0) - Number(a.pricePerMonth || 0);
      if (sortBy === 'students-asc') return (a.maxStudents || 0) - (b.maxStudents || 0);
      if (sortBy === 'students-desc') return (b.maxStudents || 0) - (a.maxStudents || 0);
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [plans, trashedPlans, activeTab, searchQuery, typeFilter, sortBy]);

  const maxStudentOverall = useMemo(() => {
    const values = plans.map((p) => p.maxStudents || 0);
    return Math.max(...values, 500);
  }, [plans]);

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            background:
              toast.type === 'success'
                ? 'var(--success)'
                : toast.type === 'error'
                ? 'var(--destructive)'
                : 'var(--primary)',
            color: '#fff',
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            fontWeight: 600,
            fontSize: '0.875rem',
            maxWidth: 380,
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : toast.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <Info size={18} />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', background: 'rgba(79, 70, 229, 0.12)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            <Shield size={13} />
            <span>{t('pricing.superAdminBadge') || 'Super Admin Control'}</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.02em', margin: 0 }}>
            {t('pricing.mgmtTitle') || 'Pricing Plans & Subscriptions'}
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
            {t('pricing.mgmtSubtitle') || 'Configure institution subscription tiers, calculate dynamic pricing, and restore archived plans.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsCalcOpen(!isCalcOpen)}
            className="btn"
            style={{
              background: isCalcOpen ? 'var(--secondary)' : 'var(--card)',
              color: isCalcOpen ? 'var(--secondary-foreground)' : 'var(--foreground)',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 0.9rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 'var(--radius)',
            }}
            title="Toggle Live Cost Calculator"
          >
            <Calculator size={16} />
            <span>{t('pricing.calculator') || 'Cost Calculator'}</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn"
            style={{
              background: 'var(--card)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 0.9rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 'var(--radius)',
            }}
            title="Refresh All Pricing Data"
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{t('common.refresh') || 'Refresh'}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.15rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 'var(--radius)',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
            }}
          >
            <Plus size={16} />
            <span>{t('pricing.createNewPlan') || 'Create New Plan'}</span>
          </button>
        </div>
      </div>

      {/* ── Global Details & KPI Metrics Banner ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Active Plans Card */}
        <div className="glass-card" style={{ padding: '1.25rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('pricing.activePlans') || 'Active Plans'}
            </span>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--foreground)' }}>
            {plans.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
            {plans.filter(p => p.isCustom).length} Custom • {plans.filter(p => !p.isCustom).length} Standard
          </div>
        </div>

        {/* Global Setup Fee Card */}
        <div className="glass-card" style={{ padding: '1.25rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('pricing.setupFee') || 'Global Setup Fee'}
            </span>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--foreground)' }}>
            {details ? formatCurrency(details.setupFee) : '৳1,000'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
            Frequency: {details?.setupFeeFrequency || 'per year'}
          </div>
        </div>

        {/* Free Trial Period Card */}
        <div className="glass-card" style={{ padding: '1.25rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('pricing.freeTrial') || 'Trial Period'}
            </span>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--foreground)' }}>
            {details?.trialDays !== undefined ? `${details.trialDays} Days` : '7 Days'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
            Risk-free onboarding evaluation
          </div>
        </div>

        {/* Soft-Deleted / Trash Plans Card */}
        <div
          onClick={() => setActiveTab('trash')}
          className="glass-card"
          style={{
            padding: '1.25rem',
            background: 'var(--card)',
            border: activeTab === 'trash' ? '1px solid var(--destructive)' : '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Click to view soft-deleted plans"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('pricing.trashedPlans') || 'Archived / Trash'}
            </span>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--destructive)' }}>
              <Trash2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: trashedPlans.length > 0 ? 'var(--destructive)' : 'var(--foreground)' }}>
            {trashedPlans.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
            Soft-deleted & restorable anytime
          </div>
        </div>
      </div>

      {/* ── Marketing Highlights Line ── */}
      {details?.marketingLines && details.marketingLines.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.25rem',
            background: 'rgba(79, 70, 229, 0.05)',
            border: '1px dashed rgba(79, 70, 229, 0.3)',
            borderRadius: 'var(--radius)',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: 'var(--foreground)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 700, color: 'var(--primary)' }}>
            <Sparkles size={16} />
            <span>Highlights:</span>
          </div>
          {details.marketingLines.map((line, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                background: 'var(--card)',
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontWeight: 500,
                fontSize: '0.8rem',
              }}
            >
              <Check size={12} style={{ color: 'var(--success)' }} />
              {line}
            </span>
          ))}
        </div>
      )}

      {/* ── Interactive Plan & Cost Calculator (Collapsible) ── */}
      {isCalcOpen && (
        <div
          className="glass-card animate-fade-in"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.5rem',
            marginBottom: '1.75rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '0.35rem', borderRadius: '6px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
                  <Calculator size={18} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                  {t('pricing.calculator') || 'Interactive Plan & Cost Estimator'}
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.2rem', marginBottom: 0 }}>
                {t('pricing.calcSubtitle') || 'Estimate costs dynamically using endpoint /pricing/calculate for any school size.'}
              </p>
            </div>

            {/* Quick Student Preset Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginRight: '0.25rem' }}>Presets:</span>
              {[50, 100, 250, 500, 1000, 2500, 5000].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setCalcStudents(count)}
                  style={{
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: calcStudents === count ? 700 : 500,
                    background: calcStudents === count ? 'var(--primary)' : 'var(--muted)',
                    color: calcStudents === count ? '#fff' : 'var(--foreground)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
            
            {/* Input Controls */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  {t('pricing.studentCount') || 'Target Student Count'}:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    value={calcStudents}
                    onChange={(e) => setCalcStudents(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{
                      width: '100px',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      textAlign: 'right',
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Students</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="3000"
                step="10"
                value={calcStudents > 3000 ? 3000 : calcStudents}
                onChange={(e) => setCalcStudents(Number(e.target.value))}
                style={{
                  width: '100%',
                  cursor: 'pointer',
                  accentColor: 'var(--primary)',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                <span>0 Students</span>
                <span>1,500 Students</span>
                <span>3,000+ Students</span>
              </div>
            </div>

            {/* Live Calculation Output Card */}
            <div
              style={{
                background: 'var(--background)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  Matching Recommended Plan
                </span>
                {calcLoading ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Calculating...</span>
                ) : (
                  <span className={`badge ${calcResult?.plan ? 'badge-primary' : 'badge-warning'}`}>
                    {calcResult?.plan ? calcResult.plan.name : 'Enterprise Quote'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                    {t('pricing.monthlyEst') || 'Estimated Monthly Cost'}
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--foreground)' }}>
                    {calcResult ? (
                      isNaN(Number(calcResult.estimatedMonthlyCost))
                        ? calcResult.estimatedMonthlyCost
                        : formatCurrency(calcResult.estimatedMonthlyCost)
                    ) : '—'}
                    {calcResult && !isNaN(Number(calcResult.estimatedMonthlyCost)) && (
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}> / month</span>
                    )}
                  </div>
                </div>

                {calcResult?.effectivePerStudentRate && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                      {t('pricing.perStudentRate') || 'Rate per Student'}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--success)' }}>
                      {formatCurrency(calcResult.effectivePerStudentRate)}
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted-foreground)' }}> / student</span>
                    </div>
                  </div>
                )}
              </div>

              {calcResult?.plan?.description && (
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                  Tier details: {calcResult.plan.description} (Capacity: up to {calcResult.plan.maxStudents} students)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <div
        className="data-table-wrapper glass-card"
        style={{
          background: 'var(--card)',
          borderRadius: '1.25rem',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        {/* Tabs Bar & Filters */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('active')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                background: activeTab === 'active' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'active' ? '#fff' : 'var(--muted-foreground)',
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={16} />
              <span>{t('pricing.activePlans') || 'Active Plans'}</span>
              <span
                style={{
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  background: activeTab === 'active' ? 'rgba(255,255,255,0.25)' : 'var(--muted)',
                  color: activeTab === 'active' ? '#fff' : 'var(--foreground)',
                }}
              >
                {plans.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('trash')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                background: activeTab === 'trash' ? 'var(--destructive)' : 'transparent',
                color: activeTab === 'trash' ? '#fff' : 'var(--muted-foreground)',
                transition: 'all 0.15s ease',
              }}
            >
              <Trash2 size={16} />
              <span>{t('pricing.trashedPlans') || 'Trash / Archived'}</span>
              <span
                style={{
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  background: activeTab === 'trash' ? 'rgba(255,255,255,0.25)' : 'var(--muted)',
                  color: activeTab === 'trash' ? '#fff' : 'var(--foreground)',
                }}
              >
                {trashedPlans.length}
              </span>
            </button>
          </div>

          {/* Search & Layout Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('pricing.searchPlaceholder') || 'Search plans...'}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2.25rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">{t('pricing.filterAll') || 'All Plans'}</option>
              <option value="standard">{t('pricing.filterStandard') || 'Standard Only'}</option>
              <option value="custom">{t('pricing.filterCustom') || 'Custom Enterprise'}</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="default">{t('pricing.sortBy') || 'Sort'}: Default</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="students-asc">Students: Min to Max</option>
              <option value="students-desc">Students: Max to Min</option>
              <option value="name-asc">Name: A to Z</option>
            </select>

            {/* View Mode Toggle */}
            <div style={{ display: 'inline-flex', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '0.45rem 0.6rem',
                  border: 'none',
                  background: viewMode === 'grid' ? 'var(--primary)' : 'var(--background)',
                  color: viewMode === 'grid' ? '#fff' : 'var(--muted-foreground)',
                  cursor: 'pointer',
                }}
                title={t('pricing.viewCards') || 'Cards View'}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  padding: '0.45rem 0.6rem',
                  border: 'none',
                  background: viewMode === 'table' ? 'var(--primary)' : 'var(--background)',
                  color: viewMode === 'table' ? '#fff' : 'var(--muted-foreground)',
                  cursor: 'pointer',
                }}
                title={t('pricing.viewTable') || 'Table View'}
              >
                <Table size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Active Plans View: Grid or Table ── */}
        {activeTab === 'active' && (
          <div style={{ padding: '1.5rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Loading pricing plans...</p>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--muted-foreground)' }}>
                  <Layers size={28} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--foreground)' }}>
                  No Pricing Plans Found
                </h4>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 1.25rem' }}>
                  {searchQuery || typeFilter !== 'all'
                    ? 'No plans match your current filters. Try resetting search.'
                    : 'Get started by creating your first subscription tier for institutions.'}
                </p>
                <button
                  onClick={openCreateModal}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  <Plus size={15} />
                  <span>Create Plan</span>
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* ── Grid Cards View ── */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {filteredPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="glass-card"
                    style={{
                      background: 'var(--card)',
                      borderRadius: 'var(--radius)',
                      border: plan.isCustom ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border)',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Top colored accent bar */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: plan.isCustom
                          ? 'linear-gradient(90deg, #8b5cf6, #ec4899)'
                          : Number(plan.pricePerMonth) === 0
                          ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                          : 'linear-gradient(90deg, #4f46e5, #3b82f6)',
                      }}
                    />

                    <div>
                      {/* Card Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                            {plan.name}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '9999px',
                                background: plan.isCustom ? 'rgba(139, 92, 246, 0.12)' : 'rgba(79, 70, 229, 0.12)',
                                color: plan.isCustom ? '#8b5cf6' : 'var(--primary)',
                              }}
                            >
                              <Tag size={10} />
                              {plan.isCustom ? (t('pricing.customTier') || 'Custom Enterprise') : (t('pricing.standardTier') || 'Standard')}
                            </span>
                          </div>
                        </div>

                        {/* Actions Pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <button
                            onClick={() => openEditModal(plan)}
                            className="btn"
                            style={{
                              padding: '0.35rem',
                              background: 'var(--muted)',
                              border: 'none',
                              borderRadius: '6px',
                              color: 'var(--foreground)',
                              cursor: 'pointer',
                            }}
                            title="Edit Plan"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => setDeletingPlan(plan)}
                            className="btn"
                            style={{
                              padding: '0.35rem',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              borderRadius: '6px',
                              color: 'var(--destructive)',
                              cursor: 'pointer',
                            }}
                            title="Soft-Delete Plan"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Pricing Display */}
                      <div style={{ margin: '1rem 0' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--foreground)' }}>
                            {Number(plan.pricePerMonth) === 0 ? 'Free' : formatCurrency(plan.pricePerMonth)}
                          </span>
                          {Number(plan.pricePerMonth) > 0 && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>
                              / month
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
                          {Number(plan.pricePerStudent) > 0 ? (
                            <span>
                              Rate: <strong style={{ color: 'var(--foreground)' }}>{formatCurrency(plan.pricePerStudent)}</strong> per student
                            </span>
                          ) : (
                            <span>Flat / Free rate tier</span>
                          )}
                        </div>
                      </div>

                      {/* Student Capacity Range */}
                      <div
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          background: 'var(--background)',
                          border: '1px solid var(--border)',
                          marginBottom: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Users size={13} />
                            Capacity:
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>
                            {plan.minStudents} – {plan.maxStudents ? `${plan.maxStudents} Students` : 'Unlimited'}
                          </span>
                        </div>

                        {/* Visual Capacity Bar */}
                        <div style={{ height: '5px', width: '100%', background: 'var(--muted)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, Math.max(8, ((plan.maxStudents || 100) / maxStudentOverall) * 100))}%`,
                              background: plan.isCustom ? '#8b5cf6' : 'var(--primary)',
                              borderRadius: '9999px',
                            }}
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)', margin: '0 0 1rem 0', lineHeight: 1.45, minHeight: '2.5rem' }}>
                        {plan.description || 'No description provided for this tier.'}
                      </p>
                    </div>

                    {/* Card Footer Meta */}
                    <div
                      style={{
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.725rem',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      <span title={`Created at: ${formatDate(plan.createdAt)}`}>
                        Created: {formatDate(plan.createdAt)}
                      </span>
                      <button
                        onClick={() => openEditModal(plan)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          fontSize: '0.775rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <span>Edit Details</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── Table View ── */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Plan Name</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Student Range</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Price / Month</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Price / Student</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Description</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Created Date</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((plan) => (
                      <tr key={plan.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
                          {plan.name}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: plan.isCustom ? 'rgba(139, 92, 246, 0.12)' : 'rgba(79, 70, 229, 0.12)',
                              color: plan.isCustom ? '#8b5cf6' : 'var(--primary)',
                            }}
                          >
                            {plan.isCustom ? 'Custom' : 'Standard'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--foreground)' }}>
                          {plan.minStudents} – {plan.maxStudents ? `${plan.maxStudents}` : 'Unlimited'}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
                          {Number(plan.pricePerMonth) === 0 ? 'Free' : formatCurrency(plan.pricePerMonth)}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--foreground)' }}>
                          {Number(plan.pricePerStudent) > 0 ? formatCurrency(plan.pricePerStudent) : '—'}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--muted-foreground)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {plan.description || '—'}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
                          {formatDate(plan.createdAt)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => openEditModal(plan)}
                              className="btn"
                              style={{ padding: '0.35rem 0.55rem', background: 'var(--muted)', border: 'none', borderRadius: '6px', fontSize: '0.75rem' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingPlan(plan)}
                              className="btn"
                              style={{ padding: '0.35rem 0.55rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--destructive)', border: 'none', borderRadius: '6px', fontSize: '0.75rem' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Trash / Archived Plans View ── */}
        {activeTab === 'trash' && (
          <div style={{ padding: '1.5rem' }}>
            {/* Trash Notice Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1.25rem',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: 'var(--foreground)',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
              }}
            >
              <AlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <div>
                <strong>Archived Plans Repository:</strong> These plans have been soft-deleted and are hidden from schools. You can restore any plan back into the active catalog with one click.
              </div>
            </div>

            {trashedPlans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--muted-foreground)' }}>
                  <Trash2 size={28} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--foreground)' }}>
                  Trash is Empty
                </h4>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>
                  No pricing plans have been deleted. When a plan is deleted, it will be safely kept here for future restoration.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Plan Name</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Student Limit</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Monthly Price</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Deleted On</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trashedPlans.map((plan) => (
                      <tr key={plan.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
                          {plan.name}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'var(--muted)',
                              color: 'var(--muted-foreground)',
                            }}
                          >
                            {plan.isCustom ? 'Custom' : 'Standard'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--foreground)' }}>
                          Up to {plan.maxStudents} Students
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
                          {Number(plan.pricePerMonth) === 0 ? 'Free' : formatCurrency(plan.pricePerMonth)}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--destructive)', fontSize: '0.8rem' }}>
                          {formatDate(plan.deletedAt || plan.updatedAt)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleRestorePlan(plan.id, plan.name)}
                            disabled={restoringId === plan.id}
                            className="btn"
                            style={{
                              padding: '0.4rem 0.85rem',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: 'var(--success)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <RotateCcw size={13} style={{ animation: restoringId === plan.id ? 'spin 1s linear infinite' : 'none' }} />
                            <span>{restoringId === plan.id ? 'Restoring...' : 'Restore Plan'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create / Edit Plan Modal ── */}
      {modalMode && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !submitting && setModalMode(null)}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              width: '100%',
              maxWidth: '540px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                  {modalMode === 'create' ? 'Create New Pricing Plan' : 'Edit Pricing Plan'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: '0.2rem 0 0 0' }}>
                  {modalMode === 'create'
                    ? 'Define student limits, monthly subscription fees, and custom tier flags.'
                    : `Updating details for plan: ${editingPlan?.name}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--destructive)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={modalMode === 'create' ? handleCreatePlan : handleUpdatePlan}>
              {/* Plan Name */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
                  Plan Name <span style={{ color: 'var(--destructive)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starter, Growth, Enterprise"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              {/* Is Custom Toggle */}
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    Custom Enterprise Tier
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    Check this if this tier uses custom negotiated pricing / sales contact.
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                  <input
                    type="checkbox"
                    checked={formData.isCustom}
                    onChange={(e) => setFormData({ ...formData, isCustom: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      inset: 0,
                      background: formData.isCustom ? 'var(--primary)' : 'var(--muted)',
                      borderRadius: '34px',
                      transition: '0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '16px',
                        width: '16px',
                        left: formData.isCustom ? '20px' : '3px',
                        bottom: '3px',
                        background: '#fff',
                        borderRadius: '50%',
                        transition: '0.2s',
                      }}
                    />
                  </span>
                </label>
              </div>

              {/* Min & Max Students */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
                    Min Students
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStudents}
                    onChange={(e) => setFormData({ ...formData, minStudents: Math.max(0, parseInt(e.target.value) || 0) })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
                    Max Students
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxStudents}
                    onChange={(e) => setFormData({ ...formData, maxStudents: Math.max(0, parseInt(e.target.value) || 0) })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              {/* Price Per Month & Price Per Student */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
                    Monthly Price (BDT)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', fontWeight: 600 }}>৳</span>
                    <input
                      type="text"
                      placeholder="e.g. 2400 or 0"
                      value={formData.pricePerMonth}
                      onChange={(e) => setFormData({ ...formData, pricePerMonth: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem 0.6rem 1.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
                    Price / Student (BDT)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', fontWeight: 600 }}>৳</span>
                    <input
                      type="text"
                      placeholder="e.g. 8 or 0"
                      value={formData.pricePerStudent}
                      onChange={(e) => setFormData({ ...formData, pricePerStudent: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem 0.6rem 1.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem' }}>
                  Plan Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Summarize features or target school size..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalMode(null)}
                  className="btn"
                  style={{
                    padding: '0.6rem 1rem',
                    background: 'var(--muted)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{
                    padding: '0.6rem 1.25rem',
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {submitting && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  <span>{modalMode === 'create' ? 'Create Plan' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Soft Delete Confirmation Modal ── */}
      {deletingPlan && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !deleteSubmitting && setDeletingPlan(null)}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              width: '100%',
              maxWidth: '440px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--destructive)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                  Soft-Delete Plan
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: '0.15rem 0 0 0' }}>
                  Move plan to Trash / Archived repository
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--foreground)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to soft-delete <strong>&quot;{deletingPlan.name}&quot;</strong>? This plan will be moved to the Trash tab and hidden from prospective schools, but you can restore it at any time.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeletingPlan(null)}
                className="btn"
                style={{
                  padding: '0.55rem 0.9rem',
                  background: 'var(--muted)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleDeletePlan}
                className="btn"
                style={{
                  padding: '0.55rem 1.15rem',
                  background: 'var(--destructive)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {deleteSubmitting && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                <span>Move to Trash</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
