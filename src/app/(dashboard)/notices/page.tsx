"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  Megaphone, Plus, AlertCircle, Calendar, Trash2, Edit3, Loader2,
  Bell, Users, GraduationCap, X, CheckCircle2,
  Search, Filter, Download, ChevronDown, ChevronLeft,
  ChevronRight, FileSpreadsheet, FileText, RefreshCw, Eye,
  AlertTriangle, Check, Layers, LayoutGrid
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      ''
    );
  }
  return '';
};

const getUserSchoolId = () => {
  try {
    const token = getApiToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.schoolId as string) || null;
  } catch {
    return null;
  }
};

interface Notice {
  _id: string;
  title: string;
  content: string;
  targetAudience: string;
  isImportent: boolean;
  postedBy: string;
  schoolId: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

const AUDIENCE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  All: {
    label: 'Everyone',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.25)',
  },
  Students: {
    label: 'Students',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.25)',
  },
  Teachers: {
    label: 'Teachers',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.25)',
  },
  Parents: {
    label: 'Parents',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.08)',
    border: 'rgba(139, 92, 246, 0.25)',
  },
};

export default function NoticesPage() {
  const { t } = useLanguage();

  // Core Notices Data
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterAudience, setFilterAudience] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All'); // 'All' | 'Important' | 'Standard'
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // View Mode & Pagination
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Export Menu
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Form Modal States (Create / Edit)
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetAudience: 'All',
    isImportent: false,
    postedBy: '',
  });

  // Details Modal
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; notice: Notice | null }>({
    open: false,
    notice: null,
  });

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; title: string }>({
    open: false,
    id: '',
    title: '',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Toast auto-clear
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Fetch Notices
  const fetchNotices = useCallback(async () => {
    const schoolId = getUserSchoolId();
    if (!schoolId) {
      setError('School ID not found in session.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/general/notices?schoolId=${schoolId}`, {
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        const list: Notice[] = Array.isArray(json) ? json : json?.data || [];
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setNotices(list);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.message || 'Failed to fetch notice board.');
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
      setError('Network error while retrieving notices.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotices();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchNotices]);

  // Date Formatting strictly in single line
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // 12-Hour AM/PM Time Format
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  // Author initial helper
  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'A';
    return name.trim().charAt(0).toUpperCase();
  };

  // Filtered & Searched Notices
  const filteredNotices = useMemo(() => {
    let result = [...notices];

    // Audience filter
    if (filterAudience !== 'All') {
      result = result.filter(n => n.targetAudience === filterAudience);
    }

    // Priority filter
    if (filterPriority === 'Important') {
      result = result.filter(n => n.isImportent);
    } else if (filterPriority === 'Standard') {
      result = result.filter(n => !n.isImportent);
    }

    // Date filter
    if (filterDate) {
      result = result.filter(n => n.createdAt && n.createdAt.startsWith(filterDate));
    }

    // Debounced Search (title, content, postedBy, targetAudience)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(n => {
        const titleMatch = n.title?.toLowerCase().includes(q);
        const contentMatch = n.content?.toLowerCase().includes(q);
        const authorMatch = n.postedBy?.toLowerCase().includes(q);
        const audienceMatch = n.targetAudience?.toLowerCase().includes(q);
        return titleMatch || contentMatch || authorMatch || audienceMatch;
      });
    }

    return result;
  }, [notices, filterAudience, filterPriority, filterDate, debouncedSearch]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = notices.length;
    let important = 0;
    let students = 0;
    let teachers = 0;

    notices.forEach(n => {
      if (n.isImportent) important++;
      if (n.targetAudience === 'Students' || n.targetAudience === 'All') students++;
      if (n.targetAudience === 'Teachers' || n.targetAudience === 'Parents') teachers++;
    });

    return {
      total,
      important,
      students,
      teachers,
      importantPct: total > 0 ? Math.round((important / total) * 100) : 0,
      studentsPct: total > 0 ? Math.round((students / total) * 100) : 0,
    };
  }, [notices]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredNotices.length / limit) || 1;
  const paginatedNotices = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredNotices.slice(start, start + limit);
  }, [filteredNotices, page, limit]);

  // Active filters count
  const activeFiltersCount = [
    filterAudience !== 'All' ? filterAudience : '',
    filterPriority !== 'All' ? filterPriority : '',
    filterDate,
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setFilterAudience('All');
    setFilterPriority('All');
    setFilterDate('');
    setSearchTerm('');
    setPage(1);
  };

  // Open Form Modal (Create or Edit)
  const handleOpenFormModal = (notice?: Notice) => {
    if (notice) {
      setFormMode('edit');
      setEditingId(notice._id);
      setFormData({
        title: notice.title || '',
        content: notice.content || '',
        targetAudience: notice.targetAudience || 'All',
        isImportent: !!notice.isImportent,
        postedBy: notice.postedBy || '',
      });
    } else {
      setFormMode('create');
      setEditingId(null);
      setFormData({
        title: '',
        content: '',
        targetAudience: filterAudience !== 'All' ? filterAudience : 'All',
        isImportent: false,
        postedBy: 'Principal / Administration',
      });
    }
    setFormModalOpen(true);
  };

  // Submit Notice Form (Create or Edit)
  const handleSubmitNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim() || !formData.postedBy.trim()) {
      setError('Please fill in Title, Message, and Author name.');
      return;
    }

    const schoolId = getUserSchoolId();
    if (!schoolId) {
      setError('School ID not found.');
      return;
    }

    setFormSubmitting(true);
    try {
      const url = editingId
        ? `${API_BASE_URL}/general/notices/${editingId}`
        : `${API_BASE_URL}/general/notices`;

      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          schoolId,
          avatar: 'https://example.com/avatar.jpg',
        }),
      });

      if (res.ok) {
        setSuccessToast(
          formMode === 'edit'
            ? 'Notice updated successfully!'
            : 'Notice published successfully!'
        );
        setFormModalOpen(false);
        fetchNotices();
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.message || 'Failed to save notice announcement.');
      }
    } catch (err) {
      console.error('Error saving notice:', err);
      setError('Network error occurred while saving notice.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Notice Handler
  const handleDeleteNotice = async () => {
    if (!deleteModal.id) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/general/notices/${deleteModal.id}`, {
        method: 'DELETE',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok || res.status === 204) {
        setSuccessToast('Notice announcement deleted.');
        setDeleteModal({ open: false, id: '', title: '' });
        setNotices(prev => prev.filter(n => n._id !== deleteModal.id));
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.message || 'Failed to delete notice.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Network error occurred while deleting notice.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredNotices.length === 0) return;
    setShowExportMenu(false);

    const headers = [
      'Title',
      'Target Audience',
      'Priority',
      'Posted By',
      'Date',
      'Time',
      'Content',
    ];

    const rows = filteredNotices.map(n => [
      `"${(n.title || '').replace(/"/g, '""')}"`,
      `"${n.targetAudience || 'Everyone'}"`,
      `"${n.isImportent ? 'Important' : 'Standard'}"`,
      `"${(n.postedBy || 'Admin').replace(/"/g, '""')}"`,
      `"${formatDate(n.createdAt)}"`,
      `"${formatTime(n.createdAt)}"`,
      `"${(n.content || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `school_notices_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // PDF Export
  const handleExportPDF = () => {
    if (filteredNotices.length === 0) return;
    setShowExportMenu(false);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Smart School – Official Notices & Announcements', 14, 16);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const dateGenerated = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    doc.text(
      `Generated on: ${dateGenerated} | Total Records: ${filteredNotices.length}`,
      14,
      23
    );

    const tableRows = filteredNotices.map((n, idx) => [
      idx + 1,
      n.title || 'Untitled Notice',
      n.targetAudience || 'Everyone',
      n.isImportent ? 'Important' : 'Standard',
      n.postedBy || 'Admin',
      `${formatDate(n.createdAt)} ${formatTime(n.createdAt)}`,
      n.content ? (n.content.length > 90 ? `${n.content.slice(0, 90)}…` : n.content) : '—',
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['#', 'Notice Title', 'Audience', 'Priority', 'Posted By', 'Date & Time', 'Summary']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    doc.save(`school_notices_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div
      className="page-container animate-fade-in"
      style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}
    >
      {/* Toast Feedback Banner */}
      {successToast && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            borderRadius: '0.75rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600 }}>
            <CheckCircle2 size={18} />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast('')}
            style={{
              background: 'none',
              border: 'none',
              color: 'currentColor',
              cursor: 'pointer',
              padding: '0.2rem',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            borderRadius: '0.75rem',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 500 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            style={{
              background: 'none',
              border: 'none',
              color: 'currentColor',
              cursor: 'pointer',
              padding: '0.2rem',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 4-Stat Metric Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Total Notices */}
        <div
          className="widget glass-card"
          style={{
            padding: '1.35rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Total Notices
            </span>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: 'var(--foreground)',
                marginTop: '0.25rem',
              }}
            >
              {stats.total}
            </div>
            <span style={{ fontSize: '0.775rem', color: 'var(--muted-foreground)' }}>
              All published bulletins
            </span>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366f1',
              flexShrink: 0,
            }}
          >
            <Megaphone size={24} />
          </div>
        </div>

        {/* Important Announcements */}
        <div
          className="widget glass-card"
          style={{
            padding: '1.35rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--muted-foreground)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Important / Urgent
              </span>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 8px #ef4444',
                }}
              />
            </div>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: '#ef4444',
                marginTop: '0.25rem',
              }}
            >
              {stats.important}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
              <span
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                }}
              >
                {stats.importantPct}%
              </span>
              <span style={{ fontSize: '0.775rem', color: 'var(--muted-foreground)' }}>
                High priority alerts
              </span>
            </div>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={24} />
          </div>
        </div>

        {/* For Students */}
        <div
          className="widget glass-card"
          style={{
            padding: '1.35rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              For Students
            </span>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: '#10b981',
                marginTop: '0.25rem',
              }}
            >
              {stats.students}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
              <span
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                }}
              >
                {stats.studentsPct}%
              </span>
              <span style={{ fontSize: '0.775rem', color: 'var(--muted-foreground)' }}>
                Targeted or general
              </span>
            </div>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0,
            }}
          >
            <GraduationCap size={24} />
          </div>
        </div>

        {/* For Staff & Parents */}
        <div
          className="widget glass-card"
          style={{
            padding: '1.35rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Staff & Parents
            </span>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: '#f59e0b',
                marginTop: '0.25rem',
              }}
            >
              {stats.teachers}
            </div>
            <span style={{ fontSize: '0.775rem', color: 'var(--muted-foreground)' }}>
              Faculty and guardian updates
            </span>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              flexShrink: 0,
            }}
          >
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Main Table / Grid Container */}
      <div
        className="widget glass-card"
        style={{
          background: 'var(--card)',
          borderRadius: '1.25rem',
          border: '1px solid var(--border)',
          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Unified Integrated Toolbar Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Left: Search Bar */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 280px',
              maxWidth: '420px',
            }}
          >
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted-foreground)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search notices by title, author, audience..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 2.25rem 0.65rem 2.4rem',
                borderRadius: '0.65rem',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted-foreground)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Right Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 0.9rem',
                borderRadius: '0.65rem',
                border: activeFiltersCount > 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: activeFiltersCount > 0 ? 'rgba(79, 70, 229, 0.08)' : 'var(--background)',
                color: activeFiltersCount > 0 ? 'var(--primary)' : 'var(--foreground)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Filter size={15} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View Mode Switcher */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '0.65rem',
                padding: '2px',
              }}
            >
              <button
                onClick={() => setViewMode('cards')}
                title="Cards View"
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: viewMode === 'cards' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'cards' ? 'white' : 'var(--muted-foreground)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Table View"
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: viewMode === 'table' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'table' ? 'white' : 'var(--muted-foreground)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <Layers size={14} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            {/* Export Menu */}
            <div style={{ position: 'relative' }} ref={exportRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 0.9rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Download size={15} />
                <span>Export</span>
                <ChevronDown size={14} />
              </button>

              {showExportMenu && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    padding: '0.4rem',
                    width: '180px',
                    zIndex: 50,
                  }}
                >
                  <button
                    onClick={handleExportCSV}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--foreground)',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79, 70, 229, 0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <FileSpreadsheet size={16} style={{ color: '#10b981' }} />
                    <span>Export to CSV</span>
                  </button>
                  <button
                    onClick={handleExportPDF}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--foreground)',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79, 70, 229, 0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <FileText size={16} style={{ color: '#ef4444' }} />
                    <span>Export to PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Page Limit Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span
                style={{
                  fontSize: '0.825rem',
                  color: 'var(--muted-foreground)',
                  whiteSpace: 'nowrap',
                }}
              >
                Show:
              </span>
              <select
                value={limit}
                onChange={e => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  padding: '0.45rem 0.6rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Primary Action Button: Post Notice */}
            <button
              className="btn btn-primary"
              onClick={() => handleOpenFormModal()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.15rem',
                borderRadius: '0.65rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={16} />
              <span>Post Notice</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchNotices}
              disabled={loading}
              title="Refresh notices"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '0.65rem',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw
                size={16}
                style={{
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                }}
              />
            </button>
          </div>
        </div>

        {/* Collapsible Filter Tray */}
        {showFilters && (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              background: 'rgba(79, 70, 229, 0.02)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'flex-end',
            }}
          >
            {/* Audience */}
            <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--muted-foreground)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Target Audience
              </label>
              <select
                value={filterAudience}
                onChange={e => {
                  setFilterAudience(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <option value="All">All Audiences</option>
                <option value="Students">Students Only</option>
                <option value="Teachers">Teachers Only</option>
                <option value="Parents">Parents Only</option>
              </select>
            </div>

            {/* Priority */}
            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--muted-foreground)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Priority
              </label>
              <select
                value={filterPriority}
                onChange={e => {
                  setFilterPriority(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <option value="All">All Priorities</option>
                <option value="Important">⚠ Important Only</option>
                <option value="Standard">Standard Only</option>
              </select>
            </div>

            {/* Date */}
            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--muted-foreground)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Date Posted
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={e => {
                  setFilterDate(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  padding: '0 0.75rem',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Reset */}
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                style={{
                  height: '40px',
                  padding: '0 1rem',
                  borderRadius: '0.5rem',
                  border: '1px dashed var(--border)',
                  background: 'transparent',
                  color: 'var(--muted-foreground)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: '5rem 2rem',
              color: 'var(--muted-foreground)',
            }}
          >
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Loading bulletin board...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && paginatedNotices.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: '5rem 2rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <Bell size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                {t('notices.noNotices') || 'No notices found'}
              </h3>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--muted-foreground)',
                  marginTop: '0.35rem',
                  maxWidth: '380px',
                }}
              >
                {searchTerm || activeFiltersCount > 0
                  ? 'No notice announcements match your current filters. Try resetting your search.'
                  : 'No notices have been published to the bulletin board yet.'}
              </p>
            </div>
            {searchTerm || activeFiltersCount > 0 ? (
              <button
                className="btn"
                onClick={handleResetFilters}
                style={{
                  marginTop: '0.5rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.55rem 1rem',
                }}
              >
                Clear all filters
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => handleOpenFormModal()}
                style={{
                  marginTop: '0.5rem',
                  borderRadius: '0.65rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.55rem 1.1rem',
                }}
              >
                <Plus size={16} />
                <span>Post First Notice</span>
              </button>
            )}
          </div>
        )}

        {/* CARDS GRID VIEW */}
        {!loading && paginatedNotices.length > 0 && viewMode === 'cards' && (
          <div
            style={{
              padding: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {paginatedNotices.map((n, idx) => {
              const aud = AUDIENCE_CONFIG[n.targetAudience] || AUDIENCE_CONFIG.All;

              return (
                <div
                  key={n._id || idx}
                  className="widget glass-card"
                  style={{
                    borderRadius: '1rem',
                    border: n.isImportent ? '1.5px solid #ef4444' : '1px solid var(--border)',
                    background: 'var(--card)',
                    padding: '1.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: n.isImportent ? '0 8px 24px -4px rgba(239, 68, 68, 0.12)' : '0 4px 16px -2px rgba(0,0,0,0.04)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px -4px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = n.isImportent ? '0 8px 24px -4px rgba(239, 68, 68, 0.12)' : '0 4px 16px -2px rgba(0,0,0,0.04)';
                  }}
                >
                  <div>
                    {/* Top Row: Priority + Audience + Single-line Date */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.85rem',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {n.isImportent ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#ef4444',
                                boxShadow: '0 0 6px #ef4444',
                              }}
                            />
                            Important
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '9999px',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              background: 'var(--muted)',
                              color: 'var(--muted-foreground)',
                            }}
                          >
                            Standard
                          </span>
                        )}

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            background: aud.bg,
                            color: aud.color,
                            border: `1px solid ${aud.border}`,
                          }}
                        >
                          {aud.label}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.775rem',
                          color: 'var(--muted-foreground)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Calendar size={13} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                          {formatDate(n.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Notice Title */}
                    <h3
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: 'var(--foreground)',
                        margin: '0 0 0.5rem',
                        lineHeight: 1.35,
                      }}
                    >
                      {n.title || 'Untitled Notice'}
                    </h3>

                    {/* Content Snippet */}
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--muted-foreground)',
                        margin: '0 0 1rem',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {n.content}
                    </p>

                    {/* Author Box */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.65rem 0.8rem',
                        borderRadius: '0.65rem',
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        marginBottom: '1rem',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(n.postedBy)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {n.postedBy || 'Administration'}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                          {formatTime(n.createdAt) ? `Posted at ${formatTime(n.createdAt)}` : 'Official Broadcast'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '0.85rem',
                      marginTop: 'auto',
                    }}
                  >
                    <button
                      onClick={() => setDetailsModal({ open: true, notice: n })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--foreground)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Eye size={13} />
                      <span>Read Notice</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleOpenFormModal(n)}
                        title="Edit notice"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: '#f59e0b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        onClick={() => setDeleteModal({ open: true, id: n._id, title: n.title })}
                        title="Delete notice"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TABLE VIEW */}
        {!loading && paginatedNotices.length > 0 && viewMode === 'table' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--muted)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  <th style={{ padding: '0.9rem 1.25rem' }}>Notice Details</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Target Audience</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Priority</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Posted By</th>
                  <th style={{ padding: '0.9rem 1.25rem', whiteSpace: 'nowrap' }}>Date Posted</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedNotices.map((n, idx) => {
                  const aud = AUDIENCE_CONFIG[n.targetAudience] || AUDIENCE_CONFIG.All;

                  return (
                    <tr
                      key={n._id || idx}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79, 70, 229, 0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Notice Details */}
                      <td style={{ padding: '1rem 1.25rem', maxWidth: '320px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '9px',
                              background: n.isImportent ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: n.isImportent ? '#ef4444' : 'var(--primary)',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            <Megaphone size={17} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '0.925rem',
                                fontWeight: 700,
                                color: 'var(--foreground)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={n.title}
                            >
                              {n.title || 'Untitled Notice'}
                            </div>
                            <div
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--muted-foreground)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginTop: '0.2rem',
                              }}
                              title={n.content}
                            >
                              {n.content}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Target Audience */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: aud.bg,
                            color: aud.color,
                            border: `1px solid ${aud.border}`,
                          }}
                        >
                          {aud.label}
                        </span>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        {n.isImportent ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                            }}
                          >
                            <AlertCircle size={12} />
                            Important
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: 'var(--muted)',
                              color: 'var(--muted-foreground)',
                            }}
                          >
                            Standard
                          </span>
                        )}
                      </td>

                      {/* Posted By */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(n.postedBy)}
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--foreground)' }}>
                            {n.postedBy || 'Admin'}
                          </span>
                        </div>
                      </td>

                      {/* Date Posted (strictly single line) */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            whiteSpace: 'nowrap',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                          }}
                        >
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              background: 'rgba(99, 102, 241, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Calendar size={13} style={{ color: 'var(--primary)' }} />
                          </div>
                          <span style={{ whiteSpace: 'nowrap' }}>{formatDate(n.createdAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '0.4rem',
                          }}
                        >
                          {/* View */}
                          <button
                            onClick={() => setDetailsModal({ open: true, notice: n })}
                            title="Read notice"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'var(--background)',
                              color: 'var(--muted-foreground)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenFormModal(n)}
                            title="Edit notice"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'var(--background)',
                              color: '#f59e0b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteModal({ open: true, id: n._id, title: n.title })}
                            title="Delete notice"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'var(--background)',
                              color: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Standard Pagination Footer */}
        {!loading && filteredNotices.length > 0 && (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
              Showing{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {Math.min((page - 1) * limit + 1, filteredNotices.length)}
              </strong>{' '}
              to{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {Math.min(page * limit, filteredNotices.length)}
              </strong>{' '}
              of <strong style={{ color: 'var(--foreground)' }}>{filteredNotices.length}</strong> notices
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page <= 1}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: page <= 1 ? 'var(--muted-foreground)' : 'var(--foreground)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.6 : 1,
                }}
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <div
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  padding: '0 0.5rem',
                }}
              >
                Page {page} of {totalPages}
              </div>

              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: page >= totalPages ? 'var(--muted-foreground)' : 'var(--foreground)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.6 : 1,
                }}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT NOTICE MODAL */}
      {formModalOpen && (
        <div className="modal-overlay animate-fade-in">
          <div
            className="modal-content"
            style={{
              maxWidth: '600px',
              width: '100%',
              borderRadius: '1.25rem',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(79, 70, 229, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0,
                  }}
                >
                  <Megaphone size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                    {formMode === 'edit' ? 'Edit Notice' : 'Post New Notice'}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: '0.15rem 0 0' }}>
                    {formMode === 'edit'
                      ? 'Update notice information or priority'
                      : 'Publish an announcement to students, teachers, or parents'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFormModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted-foreground)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitNotice} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    Notice Title <span style={{ color: 'var(--destructive)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual Sports Day Schedule & Registration"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                {/* Audience & Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Target Audience */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      Target Audience <span style={{ color: 'var(--destructive)' }}>*</span>
                    </label>
                    <select
                      value={formData.targetAudience}
                      onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="All">Everyone (School-wide)</option>
                      <option value="Students">Students Only</option>
                      <option value="Teachers">Teachers Only</option>
                      <option value="Parents">Parents Only</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      Priority Level
                    </label>
                    <select
                      value={formData.isImportent ? 'true' : 'false'}
                      onChange={e => setFormData({ ...formData, isImportent: e.target.value === 'true' })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: formData.isImportent ? '#ef4444' : 'var(--foreground)',
                        fontWeight: formData.isImportent ? 700 : 500,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="false">Standard Priority</option>
                      <option value="true">⚠ Important / High Priority</option>
                    </select>
                  </div>
                </div>

                {/* Posted By */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    Posted By <span style={{ color: 'var(--destructive)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Principal's Office / Examination Board"
                    value={formData.postedBy}
                    onChange={e => setFormData({ ...formData, postedBy: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                {/* Message Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    Announcement Message <span style={{ color: 'var(--destructive)' }}>*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Write the full announcement, guidelines, dates, or detailed instructions..."
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                      resize: 'vertical',
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                {/* Priority alert hint */}
                {formData.isImportent && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#ef4444',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>This announcement will be pinned with high-priority alert styling.</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.75rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={() => setFormModalOpen(false)}
                  disabled={formSubmitting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '0.65rem',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '0.65rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                    cursor: formSubmitting ? 'not-allowed' : 'pointer',
                    opacity: formSubmitting ? 0.7 : 1,
                  }}
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{formMode === 'edit' ? 'Save Changes' : 'Publish Notice'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTICE DETAILS MODAL */}
      {detailsModal.open && detailsModal.notice && (
        <div className="modal-overlay animate-fade-in">
          <div
            className="modal-content"
            style={{
              maxWidth: '580px',
              width: '100%',
              borderRadius: '1.25rem',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                background: 'rgba(79, 70, 229, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(79, 70, 229, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    flexShrink: 0,
                  }}
                >
                  <Megaphone size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                    Notice Bulletin
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                    Full Announcement Details
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailsModal({ open: false, notice: null })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted-foreground)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  {detailsModal.notice.isImportent ? (
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <AlertCircle size={12} />
                      Important Notice
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        background: 'var(--muted)',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      Standard Notice
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      background: AUDIENCE_CONFIG[detailsModal.notice.targetAudience]?.bg,
                      color: AUDIENCE_CONFIG[detailsModal.notice.targetAudience]?.color,
                      border: `1px solid ${AUDIENCE_CONFIG[detailsModal.notice.targetAudience]?.border}`,
                    }}
                  >
                    {AUDIENCE_CONFIG[detailsModal.notice.targetAudience]?.label || 'Everyone'}
                  </span>

                  <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                    {formatDate(detailsModal.notice.createdAt)} {formatTime(detailsModal.notice.createdAt)}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--foreground)', margin: 0, lineHeight: 1.35 }}>
                  {detailsModal.notice.title}
                </h3>
              </div>

              {/* Author Info */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.75rem',
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    flexShrink: 0,
                  }}
                >
                  {getInitials(detailsModal.notice.postedBy)}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {detailsModal.notice.postedBy || 'School Administration'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    Published Broadcast
                  </div>
                </div>
              </div>

              {/* Full Content */}
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                }}
              >
                <p
                  style={{
                    fontSize: '0.925rem',
                    color: 'var(--foreground)',
                    margin: 0,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {detailsModal.notice.content}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                className="btn"
                onClick={() => setDetailsModal({ open: false, notice: null })}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const target = detailsModal.notice;
                  setDetailsModal({ open: false, notice: null });
                  if (target) handleOpenFormModal(target);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '0.65rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Edit3 size={15} />
                <span>Edit Notice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.open && (
        <div className="modal-overlay animate-fade-in">
          <div
            className="modal-content"
            style={{
              maxWidth: '440px',
              width: '100%',
              borderRadius: '1.25rem',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                  Delete Notice
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  This action cannot be undone
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              Are you sure you want to permanently delete{' '}
              <strong style={{ color: 'var(--foreground)' }}>&ldquo;{deleteModal.title}&rdquo;</strong>? This bulletin
              will no longer appear for students, teachers, or parents.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="btn"
                onClick={() => setDeleteModal({ open: false, id: '', title: '' })}
                disabled={deleteLoading}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteNotice}
                disabled={deleteLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.3rem',
                  borderRadius: '0.65rem',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  fontWeight: 700,
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  opacity: deleteLoading ? 0.7 : 1,
                }}
              >
                {deleteLoading ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Trash2 size={16} />
                )}
                <span>{deleteLoading ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
