"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  TrendingDown, TrendingUp, DollarSign, Search, Filter, RefreshCw,
  Calendar, CreditCard, ArrowDownRight, ArrowUpRight, X, ChevronLeft,
  ChevronRight, AlertCircle, FileText, CheckCircle2, Building2,
  Tag, Download, Plus, Clock, Wallet, Check
} from 'lucide-react';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('access_token') ||
      ''
    );
  }
  return '';
};

const getUserSchoolId = () => {
  try {
    const token = getApiToken();
    if (!token) return '29f05edb-8e0b-434c-a471-aa776308a1c1';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.schoolId || '29f05edb-8e0b-434c-a471-aa776308a1c1';
  } catch {
    return '29f05edb-8e0b-434c-a471-aa776308a1c1';
  }
};

interface Transaction {
  id: string;
  walletId?: string;
  schoolId?: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  category: string;
  title: string;
  description?: string | null;
  paymentMethod: string;
  referenceNumber?: string | null;
  transactionDate: string;
  performedById?: string;
  performedByName?: string;
  attachmentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SummaryData {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalCount: number;
}

const CATEGORIES = [
  'All Categories',
  'Electricity Bill',
  'Salary',
  'Tuition Fee Collection',
  'Rent',
  'Maintenance & Repairs',
  'Internet & Utilities',
  'Stationery & Supplies',
  'Lab Equipment',
  'Sports & Extracurricular',
  'Transportation & Fuel',
  'Software & IT',
  'Exam Expenses',
  'Other',
];

const PAYMENT_METHODS = [
  { value: 'ALL', label: 'All Methods' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CARD', label: 'Credit/Debit Card' },
];

export default function ExpenseTrackingPage() {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Summary State
  const [summary, setSummary] = useState<SummaryData>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    totalCount: 0,
  });

  // Filter States (matching curl parameters)
  const [typeFilter, setTypeFilter] = useState<'EXPENSE' | 'INCOME' | 'ALL'>('EXPENSE');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('transactionDate');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Advanced filters toggle
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const schoolId = getUserSchoolId();
      const params = new URLSearchParams();

      if (schoolId) params.set('schoolId', schoolId);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (category && category !== 'All Categories') params.set('category', category);
      if (paymentMethod && paymentMethod !== 'ALL') params.set('paymentMethod', paymentMethod);
      if (month) params.set('month', month);
      if (year) params.set('year', year);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (search) params.set('search', search);

      params.set('page', page.toString());
      params.set('limit', limit.toString());
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const url = `${API_BASE_URL}/wallet/transactions?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Failed to load transactions (Status ${res.status})`);
      }

      const json = await res.json();
      const data = json.data;

      if (data) {
        const txList = Array.isArray(data.transactions) ? data.transactions : (Array.isArray(data) ? data : []);
        setTransactions(txList);

        if (data.pagination) {
          setTotal(data.pagination.total || txList.length);
          setTotalPages(data.pagination.totalPages || 1);
        } else {
          setTotal(txList.length);
          setTotalPages(1);
        }

        if (data.summary) {
          setSummary(data.summary);
        }
      } else {
        setTransactions([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong fetching transactions');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, category, paymentMethod, month, year, startDate, endDate, search, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const handleResetFilters = () => {
    setTypeFilter('EXPENSE');
    setCategory('All Categories');
    setPaymentMethod('ALL');
    setMonth('');
    setYear('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount).replace('BDT', '৳');
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* ── Page Header ────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700 }}>
              <TrendingDown size={13} /> School Ledger & Expenses
            </span>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #ef4444, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.025em' }}>
            Expense Tracking
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.35rem', fontSize: '0.98rem' }}>
            Track utility bills, staff payroll, facility maintenance, and outgoing institutional expenditures.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchTransactions()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--background)')}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* {t('fees.totalExpense')} */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingDown size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.totalExpense')}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ef4444', lineHeight: 1.15 }}>
              {formatCurrency(summary.totalExpense)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>
              From recorded transactions
            </div>
          </div>
        </div>

        {/* Total Income */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.totalIncome')}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.15 }}>
              {formatCurrency(summary.totalIncome)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>
              Tuition & other income
            </div>
          </div>
        </div>

        {/* {t('fees.netBalance')} Balance */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: summary.netBalance >= 0 ? '#eff6ff' : '#fff7ed', color: summary.netBalance >= 0 ? '#2563eb' : '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.netBalance')}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: summary.netBalance >= 0 ? '#2563eb' : '#ea580c', lineHeight: 1.15 }}>
              {formatCurrency(summary.netBalance)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>
              {summary.netBalance >= 0 ? 'Surplus balance' : 'Deficit cashflow'}
            </div>
          </div>
        </div>

        {/* Total Records */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(79, 70, 229, 0.08)', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Total Records</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.15 }}>
              {summary.totalCount || total}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>
              Matching current criteria
            </div>
          </div>
        </div>

      </div>

      {/* ── Type Selector Tabs ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: 'EXPENSE', label: 'Expenses Only', icon: TrendingDown, color: '#ef4444' },
          { key: 'ALL', label: 'All Transactions', icon: FileText, color: '#4f46e5' },
          { key: 'INCOME', label: 'Income & Fees', icon: TrendingUp, color: '#16a34a' },
        ].map(tab => {
          const isSelected = typeFilter === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setTypeFilter(tab.key as any);
                setPage(1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.35rem',
                borderRadius: '0.85rem',
                border: isSelected ? `2px solid ${tab.color}` : '1px solid var(--border)',
                background: isSelected ? `${tab.color}15` : 'var(--card)',
                color: isSelected ? tab.color : 'var(--foreground)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Search & Filter Controls ────────────────────────────── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 280px', display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted-foreground)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search title, payee, or e.g. DESCO..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '2.5rem',
                  paddingRight: searchInput ? '2.5rem' : '0.9rem',
                  paddingTop: '0.65rem',
                  paddingBottom: '0.65rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{
                    position: 'absolute',
                    right: '0.7rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button
              type="submit"
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '0.65rem',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </form>

          {/* Category Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Tag size={15} style={{ color: 'var(--muted-foreground)' }} />
            <select
              value={category}
              onChange={e => {
                setCategory(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '0.65rem 0.95rem',
                borderRadius: '0.65rem',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.88rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CreditCard size={15} style={{ color: 'var(--muted-foreground)' }} />
            <select
              value={paymentMethod}
              onChange={e => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '0.65rem 0.95rem',
                borderRadius: '0.65rem',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.88rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Toggle More Filters */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.65rem 1rem',
              borderRadius: '0.65rem',
              border: '1px solid var(--border)',
              background: showAdvancedFilters ? 'rgba(79, 70, 229, 0.08)' : 'var(--background)',
              color: showAdvancedFilters ? '#4f46e5' : 'var(--foreground)',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Filter size={15} />
            {showAdvancedFilters ? 'Fewer Filters' : 'More Filters'}
          </button>
        </div>

        {/* ── Advanced Date & Sorter Panel ───────────────────────── */}
        {showAdvancedFilters && (
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* Start Date */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
              />
            </div>

            {/* End Date */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
              />
            </div>

            {/* Month */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                Specific Month
              </label>
              <select
                value={month}
                onChange={e => {
                  setMonth(e.target.value);
                  setPage(1);
                }}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
              >
                <option value="">All Months</option>
                {[
                  { m: '1', name: 'January' },
                  { m: '2', name: 'February' },
                  { m: '3', name: 'March' },
                  { m: '4', name: 'April' },
                  { m: '5', name: 'May' },
                  { m: '6', name: 'June' },
                  { m: '7', name: 'July' },
                  { m: '8', name: 'August' },
                  { m: '9', name: 'September' },
                  { m: '10', name: 'October' },
                  { m: '11', name: 'November' },
                  { m: '12', name: 'December' },
                ].map(item => (
                  <option key={item.m} value={item.m}>{item.name}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                Year
              </label>
              <input
                type="number"
                placeholder="e.g. 2026"
                value={year}
                onChange={e => {
                  setYear(e.target.value);
                  setPage(1);
                }}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
              />
            </div>

            {/* Sort By & Order */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                Sort By
              </label>
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={e => {
                  const [by, order] = e.target.value.split(':');
                  setSortBy(by);
                  setSortOrder(order as any);
                  setPage(1);
                }}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
              >
                <option value="transactionDate:DESC">Date: Newest First</option>
                <option value="transactionDate:ASC">Date: Oldest First</option>
                <option value="amount:DESC">Amount: Highest First</option>
                <option value="amount:ASC">Amount: Lowest First</option>
              </select>
            </div>

            {/* Records per page */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                Items Per Page
              </label>
              <select
                value={limit}
                onChange={e => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
              >
                <option value={10}>10 records</option>
                <option value={20}>20 records</option>
                <option value={50}>50 records</option>
                <option value={100}>100 records</option>
              </select>
            </div>

          </div>
        )}
      </div>

      {/* Active Filter Badges */}
      {(search || category !== 'All Categories' || paymentMethod !== 'ALL' || startDate || endDate || month || year) && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Active filters:</span>
          {search && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#eff6ff', color: '#2563eb', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600 }}>
              Search: &ldquo;{search}&rdquo;
              <button onClick={() => { setSearch(''); setSearchInput(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#2563eb', display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          {category !== 'All Categories' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#fef2f2', color: '#dc2626', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600 }}>
              Category: {category}
              <button onClick={() => setCategory('All Categories')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#dc2626', display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          {paymentMethod !== 'ALL' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600 }}>
              Method: {paymentMethod}
              <button onClick={() => setPaymentMethod('ALL')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#16a34a', display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          {(startDate || endDate) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#fff7ed', color: '#ea580c', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600 }}>
              Date: {startDate || 'Start'} to {endDate || 'End'}
              <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#ea580c', display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          {month && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#eef2ff', color: '#4f46e5', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600 }}>
              Month: {month}
              <button onClick={() => setMonth('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#4f46e5', display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          {year && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#f1f5f9', color: '#475569', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600 }}>
              Year: {year}
              <button onClick={() => setYear('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#475569', display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          <button
            onClick={handleResetFilters}
            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: '0 0.25rem' }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Content: Table or Loading ──────────────────────────── */}
      {loading ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.25rem', overflow: 'hidden' }}>
          <div style={{ padding: '2rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                <div style={{ width: '120px', height: '16px', background: 'var(--muted)', borderRadius: '4px', animation: 'tx-pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '220px', height: '16px', background: 'var(--muted)', borderRadius: '4px', animation: 'tx-pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '140px', height: '16px', background: 'var(--muted)', borderRadius: '4px', animation: 'tx-pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '90px', height: '16px', background: 'var(--muted)', borderRadius: '4px', animation: 'tx-pulse 1.5s ease-in-out infinite', marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', background: 'var(--card)', borderRadius: '1.25rem', border: '1px dashed var(--border)', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <AlertCircle size={36} color="#ef4444" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>Failed to Load Transactions</h3>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.4rem', fontSize: '0.92rem' }}>{error}</p>
          <button
            onClick={() => fetchTransactions()}
            style={{ marginTop: '1.25rem', padding: '0.65rem 1.5rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '7rem 2rem', background: 'var(--card)', borderRadius: '1.25rem', border: '1px dashed var(--border)', textAlign: 'center' }}>
          <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', opacity: 0.6 }}>
            <TrendingDown size={38} />
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>{t('fees.noTransactions')}</h3>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.4rem', fontSize: '0.92rem', maxWidth: '420px' }}>
            No transaction records match the specified filters or date range.
          </p>
          <button
            onClick={handleResetFilters}
            style={{ marginTop: '1.25rem', padding: '0.65rem 1.4rem', background: 'var(--primary, #4f46e5)', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.04)' }}>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '1rem 1.5rem' }}>Date & Time</th>
                  <th style={{ padding: '1rem 1rem' }}>Title & Reference</th>
                  <th style={{ padding: '1rem 1rem' }}>Category</th>
                  <th style={{ padding: '1rem 1rem' }}>Payment Method</th>
                  <th style={{ padding: '1rem 1rem' }}>Handled By</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isExpense = tx.type === 'EXPENSE';

                  return (
                    <tr
                      key={tx.id}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Date */}
                      <td style={{ padding: '1.1rem 1.5rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                          {new Date(tx.transactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                          {new Date(tx.transactionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Title & Payee */}
                      <td style={{ padding: '1.1rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>
                          {tx.title || 'Untitled Transaction'}
                        </div>
                        {tx.description && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>
                            {tx.description}
                          </div>
                        )}
                        {tx.referenceNumber && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                            Ref: {tx.referenceNumber}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '1.1rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '99px',
                            background: isExpense ? '#fef2f2' : '#f0fdf4',
                            color: isExpense ? '#dc2626' : '#16a34a',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {tx.category || 'General'}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td style={{ padding: '1.1rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem',
                            color: 'var(--foreground)',
                            fontWeight: 500,
                            background: 'var(--background)',
                            border: '1px solid var(--border)',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                          }}
                        >
                          <CreditCard size={12} style={{ color: 'var(--muted-foreground)' }} />
                          {tx.paymentMethod?.replace('_', ' ') || 'CASH'}
                        </span>
                      </td>

                      {/* Handled By */}
                      <td style={{ padding: '1.1rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>
                        {tx.performedByName || 'Admin'}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '1.1rem 1.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '1.02rem',
                            fontWeight: 800,
                            color: isExpense ? '#ef4444' : '#16a34a',
                          }}
                        >
                          {isExpense ? '-' : '+'} {formatCurrency(tx.amount)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {tx.type}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Table Footer & Pagination ───────────────────────── */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              fontSize: '0.85rem',
              color: 'var(--muted-foreground)',
            }}
          >
            <div>
              Showing <strong>{transactions.length}</strong> of <strong>{total}</strong> transaction{total !== 1 ? 's' : ''}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', marginRight: '0.5rem' }}>
                Page {page} of {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

        </div>
      )}

      <style>{`
        @keyframes tx-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

    </div>
  );
}
