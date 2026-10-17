"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, BookOpen, Users, Calendar, Clock, Loader2, Edit3, FileText,
  CheckCircle2, CircleDashed, Filter, Download, RefreshCw, X, ChevronDown,
  ChevronLeft, ChevronRight, FileSpreadsheet, Layers, School, Trash2,
  Award, Activity, Table as TableIcon, LayoutGrid, Search
} from 'lucide-react';
import CreateExamModal from '@/components/CreateExamModal';
import ExamRoutineModal from '@/components/ExamRoutineModal';
import { useLanguage } from '@/components/language-provider';
import { getPdfTools } from '@/lib/pdf';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

interface SchoolEntity {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  schoolId?: string;
}

interface Exam {
  id: string;
  exam_name: string;
  description: string;
  start_date: string;
  end_date: string;
  isPublished: boolean;
  assignments: {
    id: string;
    class: { name: string; uuid: string };
    subject: { name: string; uuid: string };
    examiner: { name: string; uuid: string };
    date: string;
    syllabus: string;
  }[];
}

type StatusCategory = 'in-progress' | 'completed' | 'upcoming' | 'draft';

export default function ExamsPage() {
  const { t, language } = useLanguage();
  const [exams, setExams] = useState<Exam[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolEntity | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // View Mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal triggers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState<Exam | null>(null);
  const [examForRoutine, setExamForRoutine] = useState<Exam | null>(null);

  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(getApiToken().split('.')[1]));
      return payload.schoolId;
    } catch (e) {
      return null;
    }
  };
  const userSchoolId = getUserSchoolId();

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Close export dropdown on click outside
  useEffect(() => {
    if (!exportDropdownOpen) return;
    const fn = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.exam-export-dd')) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [exportDropdownOpen]);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {
        accept: '*/*',
        Authorization: `Bearer ${getApiToken()}`,
      };

      const [examsRes, schoolsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/exams`, { headers, cache: 'no-store' }),
        fetch(`${API_BASE_URL}/admin/schools`, { headers }),
      ]);

      const json = await examsRes.json();
      const schoolsJson = await schoolsRes.json();

      let fetchedExams: Exam[] = [];
      if (json.data && Array.isArray(json.data)) {
        fetchedExams = json.data;
      } else if (Array.isArray(json)) {
        fetchedExams = json;
      }

      setExams(fetchedExams);

      const schools: SchoolEntity[] = Array.isArray(schoolsJson) ? schoolsJson : schoolsJson.data || [];
      const userSchool = schools.find((s) => s.schoolId === userSchoolId || s.id === userSchoolId);
      if (userSchool) setSchoolInfo(userSchool);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setLoading(false);
    }
  }, [userSchoolId]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // Status classifier
  const getStatusInfo = (exam: Exam): {
    category: StatusCategory;
    label: string;
    bg: string;
    color: string;
    border: string;
    dot: string;
    icon: React.ReactNode;
  } => {
    if (!exam.isPublished) {
      return {
        category: 'draft',
        label: t('exams.status.draft') || 'Draft',
        bg: 'rgba(107, 114, 128, 0.1)',
        color: '#6b7280',
        border: 'rgba(107, 114, 128, 0.25)',
        dot: '#6b7280',
        icon: <Clock size={13} />,
      };
    }

    if (!exam.start_date || !exam.end_date) {
      return {
        category: 'upcoming',
        label: t('exams.status.datesTba') || 'Dates TBA',
        bg: 'rgba(245, 158, 11, 0.1)',
        color: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.25)',
        dot: '#f59e0b',
        icon: <Clock size={13} />,
      };
    }

    const start = new Date(exam.start_date).getTime();
    const end = new Date(exam.end_date).getTime();
    const today = new Date().getTime();

    if (today > end) {
      return {
        category: 'completed',
        label: t('exams.status.completed') || 'Completed',
        bg: 'rgba(79, 70, 229, 0.1)',
        color: '#4f46e5',
        border: 'rgba(79, 70, 229, 0.25)',
        dot: '#4f46e5',
        icon: <CheckCircle2 size={13} />,
      };
    } else if (today >= start && today <= end) {
      return {
        category: 'in-progress',
        label: t('exams.status.inProgress') || 'In Progress',
        bg: 'rgba(16, 185, 129, 0.1)',
        color: '#10b981',
        border: 'rgba(16, 185, 129, 0.25)',
        dot: '#10b981',
        icon: <CircleDashed size={13} className="animate-spin" />,
      };
    } else {
      const diffDays = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
      const daysStr = language === 'bn' ? diffDays.toLocaleString('bn-BD') : diffDays.toString();
      const startsInLabel = (t('exams.status.startsInDays') || 'Starts in {days} days').replace('{days}', daysStr);
      return {
        category: 'upcoming',
        label: diffDays === 1 ? (t('exams.status.startsTomorrow') || 'Starts Tomorrow') : startsInLabel,
        bg: 'rgba(245, 158, 11, 0.1)',
        color: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.25)',
        dot: '#f59e0b',
        icon: <Clock size={13} />,
      };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Distinct classes across all exams for filtering
  const allClasses = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((ex) => {
      ex.assignments?.forEach((a) => {
        if (a.class?.name) set.add(a.class.name);
      });
    });
    return Array.from(set).sort();
  }, [exams]);

  // Filtered and Sorted Exams
  const filteredExams = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    let result = exams.filter((exam) => {
      const statusInfo = getStatusInfo(exam);

      // Search match
      const matchSearch =
        !term ||
        exam.exam_name?.toLowerCase().includes(term) ||
        exam.description?.toLowerCase().includes(term) ||
        exam.assignments?.some(
          (a) =>
            a.class?.name?.toLowerCase().includes(term) ||
            a.subject?.name?.toLowerCase().includes(term) ||
            a.examiner?.name?.toLowerCase().includes(term)
        );

      if (!matchSearch) return false;

      // Status match
      if (filterStatus !== 'all' && statusInfo.category !== filterStatus) {
        return false;
      }

      // Class match
      if (filterClass !== 'all') {
        const hasClass = exam.assignments?.some((a) => a.class?.name === filterClass);
        if (!hasClass) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime();
      }
      if (sortBy === 'name-asc') {
        return (a.exam_name || '').localeCompare(b.exam_name || '');
      }
      if (sortBy === 'name-desc') {
        return (b.exam_name || '').localeCompare(a.exam_name || '');
      }
      return 0;
    });

    return result;
  }, [exams, debouncedSearch, filterStatus, filterClass, sortBy]);

  // Pagination calculations
  const total = filteredExams.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedExams = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredExams.slice(start, start + limit);
  }, [filteredExams, page, limit]);

  const activeFiltersCount =
    (debouncedSearch ? 1 : 0) +
    (filterStatus !== 'all' ? 1 : 0) +
    (filterClass !== 'all' ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0);

  const resetAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setFilterStatus('all');
    setFilterClass('all');
    setSortBy('newest');
    setPage(1);
  };

  // Metrics summary
  const summaryMetrics = useMemo(() => {
    let inProgress = 0;
    let completed = 0;
    let upcoming = 0;
    let draft = 0;

    exams.forEach((ex) => {
      const st = getStatusInfo(ex).category;
      if (st === 'in-progress') inProgress++;
      else if (st === 'completed') completed++;
      else if (st === 'upcoming') upcoming++;
      else if (st === 'draft') draft++;
    });

    return { total: exams.length, inProgress, completed, upcomingOrDraft: upcoming + draft };
  }, [exams]);

  // Delete Exam Handler
  const handleDeleteExam = async (examId: string, examName: string) => {
    const confirmMsg = (t('exams.deleteConfirm') || 'Are you sure you want to delete "{name}"? All associated routine items and student grades will be permanently deleted.').replace('{name}', examName);
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/exams/${examId}`, {
        method: 'DELETE',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        },
      });

      if (res.ok) {
        fetchExams();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`${t('exams.deleteFailed') || 'Failed to delete exam:'} ${err.message || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert(t('exams.deleteError') || 'Error deleting exam.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    setExportDropdownOpen(false);
    if (filteredExams.length === 0) return;
    const headers = ['#', 'Exam Name', 'Status', 'Start Date', 'End Date', 'Assigned Classes', 'Subjects Count', 'Description'];
    const rows = filteredExams.map((ex, i) => {
      const st = getStatusInfo(ex);
      const classes = Array.from(new Set(ex.assignments?.map((a) => a.class?.name).filter(Boolean))).join(', ');
      const subjectsCount = new Set(ex.assignments?.map((a) => a.subject?.name).filter(Boolean)).size;

      return [
        (i + 1).toString(),
        `"${(ex.exam_name || '').replace(/"/g, '""')}"`,
        `"${st.label}"`,
        `"${formatDate(ex.start_date)}"`,
        `"${formatDate(ex.end_date)}"`,
        `"${classes}"`,
        subjectsCount.toString(),
        `"${(ex.description || '').replace(/"/g, '""')}"`,
      ];
    });

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'exams_and_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF
  const handleExportPDF = async () => {
    setExportDropdownOpen(false);
    if (filteredExams.length === 0) return;
    const { jsPDF, autoTable } = await getPdfTools();
    const doc = new jsPDF('landscape');
    const schoolName = schoolInfo?.name || 'Smart School Management System';
    const schoolAddress = schoolInfo?.address || '';
    const schoolContact = [schoolInfo?.phone, schoolInfo?.email].filter(Boolean).join(' | ');

    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(schoolName, 14, 18);

    let y = 26;
    if (schoolAddress || schoolContact) {
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      if (schoolAddress) {
        doc.text(schoolAddress, 14, y);
        y += 5;
      }
      if (schoolContact) {
        doc.text(schoolContact, 14, y);
        y += 5;
      }
      y += 2;
    }

    doc.setFontSize(15);
    doc.setTextColor(50, 50, 50);
    doc.text('Exams & Results Report', 14, y);
    y += 7;

    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const filterParts: string[] = [];
    if (filterStatus !== 'all') filterParts.push(`Status: ${filterStatus}`);
    if (filterClass !== 'all') filterParts.push(`Class: ${filterClass}`);
    if (debouncedSearch) filterParts.push(`Search: ${debouncedSearch}`);
    if (filterParts.length > 0) {
      doc.text(filterParts.join(' | '), 14, y);
      y += 7;
    }

    autoTable(doc, {
      head: [['#', 'Exam Name', 'Status', 'Timeline', 'Classes', 'Subjects', 'Description']],
      body: filteredExams.map((ex, i) => {
        const st = getStatusInfo(ex);
        const classes = Array.from(new Set(ex.assignments?.map((a) => a.class?.name).filter(Boolean))).join(', ') || 'None';
        const subjectsCount = new Set(ex.assignments?.map((a) => a.subject?.name).filter(Boolean)).size;

        return [
          (i + 1).toString(),
          ex.exam_name,
          st.label,
          `${formatDate(ex.start_date)} – ${formatDate(ex.end_date)}`,
          classes,
          `${subjectsCount} Subjects`,
          ex.description || '—',
        ];
      }),
      startY: y,
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      didDrawPage: (data) => {
        const pages = (doc.internal as any).getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${data.pageNumber} of ${pages}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);
      },
    });
    doc.save('exams_and_results.pdf');
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* ── Stats Strip ─────────────────────────────────────── */}
      {!loading && exams.length > 0 && (
        <div
          className="animate-fade-in"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {[
            { label: t('exams.stats.totalAssessments') || 'Total Assessments', value: language === 'bn' ? summaryMetrics.total.toLocaleString('bn-BD') : summaryMetrics.total, color: 'var(--primary)', icon: <Award size={16} /> },
            { label: t('exams.stats.inProgress') || 'In Progress', value: language === 'bn' ? summaryMetrics.inProgress.toLocaleString('bn-BD') : summaryMetrics.inProgress, color: '#10b981', icon: <Activity size={16} /> },
            { label: t('exams.stats.completed') || 'Completed', value: language === 'bn' ? summaryMetrics.completed.toLocaleString('bn-BD') : summaryMetrics.completed, color: '#4f46e5', icon: <CheckCircle2 size={16} /> },
            { label: t('exams.stats.upcomingDraft') || 'Upcoming / Draft', value: language === 'bn' ? summaryMetrics.upcomingOrDraft.toLocaleString('bn-BD') : summaryMetrics.upcomingOrDraft, color: '#f59e0b', icon: <Calendar size={16} /> },
          ].map((s) => (
            <div
              key={s.label}
              className="glass-card"
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--muted-foreground)' }}>
                <span style={{ fontSize: '0.775rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {s.label}
                </span>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <span style={{ fontSize: '1.85rem', fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Main Glass Card Container ───────────────────────── */}
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
        {/* ── Toolbar ─────────────────────────────────────── */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '400px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  padding: '0 0.875rem',
                  height: '42px',
                  background: 'var(--background)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <Search size={18} style={{ color: 'var(--muted-foreground)', marginRight: '0.625rem', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={t('exams.searchPlaceholder') || 'Search exam name, subject, or class...'}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    color: 'var(--foreground)',
                    fontSize: '0.9rem',
                  }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.25rem',
                      cursor: 'pointer',
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Actions group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* View Switcher: Table vs Cards */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--background)',
                  padding: '0.2rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)',
                  height: '42px',
                }}
              >
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0 0.75rem',
                    height: '100%',
                    border: 'none',
                    borderRadius: '0.55rem',
                    background: viewMode === 'table' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'table' ? '#ffffff' : 'var(--foreground)',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title={t('exams.view.table') || 'Table View'}
                >
                  <TableIcon size={15} />
                  <span>{t('exams.view.table') || 'Table'}</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0 0.75rem',
                    height: '100%',
                    border: 'none',
                    borderRadius: '0.55rem',
                    background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'grid' ? '#ffffff' : 'var(--foreground)',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title={t('exams.view.cards') || 'Cards View'}
                >
                  <LayoutGrid size={15} />
                  <span>{t('exams.view.cards') || 'Cards'}</span>
                </button>
              </div>

              {/* Filters Toggle Button */}
              <button
                className="btn"
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  border: showFilters || activeFiltersCount > 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                  gap: '0.5rem',
                  borderRadius: '0.75rem',
                  height: '42px',
                  padding: '0 1rem',
                  background: showFilters ? 'var(--primary)' : 'var(--background)',
                  color: showFilters ? 'var(--primary-foreground)' : 'var(--foreground)',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Filter size={16} />
                <span>{t('exams.filters') || 'Filters'}</span>
                {activeFiltersCount > 0 && (
                  <span
                    style={{
                      background: showFilters ? '#ffffff' : 'var(--primary)',
                      color: showFilters ? 'var(--primary)' : '#ffffff',
                      fontSize: '0.75rem',
                      borderRadius: '999px',
                      padding: '0.1rem 0.5rem',
                      fontWeight: 700,
                    }}
                  >
                    {language === 'bn' ? activeFiltersCount.toLocaleString('bn-BD') : activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Export Dropdown */}
              <div className="exam-export-dd" style={{ position: 'relative' }}>
                <button
                  className="btn"
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  disabled={filteredExams.length === 0}
                  style={{
                    background: exportDropdownOpen ? 'var(--muted)' : 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    height: '42px',
                    padding: '0 0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    borderRadius: '0.75rem',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    opacity: filteredExams.length === 0 ? 0.6 : 1,
                    cursor: filteredExams.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Download size={16} />
                  <span>{t('exams.export') || 'Export'}</span>
                  <ChevronDown
                    size={14}
                    style={{
                      opacity: 0.7,
                      transform: exportDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
                {exportDropdownOpen && (
                  <div
                    className="glass-card animate-fade-in"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      zIndex: 50,
                      minWidth: '165px',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      padding: '0.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                    }}
                  >
                    {[
                      { label: t('exams.exportCSV') || 'Export as CSV', icon: <FileSpreadsheet size={15} style={{ color: '#10b981' }} />, fn: handleExportCSV },
                      { label: t('exams.exportPDF') || 'Export as PDF', icon: <FileText size={15} style={{ color: '#ef4444' }} />, fn: handleExportPDF },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.fn}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--foreground)',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Exam Button */}
              <button
                className="btn btn-primary"
                onClick={() => {
                  setExamToEdit(null);
                  setIsCreateModalOpen(true);
                }}
                style={{
                  height: '42px',
                  padding: '0 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  boxShadow: '0 4px 15px rgba(79, 70, 229, 0.35)',
                }}
              >
                <Plus size={18} />
                <span>{t('exams.createExam') || 'Create Exam'}</span>
              </button>

              {/* Refresh Button */}
              <button
                className="btn"
                onClick={fetchExams}
                title={t('exams.refresh') || 'Refresh'}
                style={{
                  height: '42px',
                  width: '42px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                }}
              >
                <RefreshCw size={16} />
              </button>

              {/* Limit Selector (only in Table view) */}
              {viewMode === 'table' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    height: '42px',
                    padding: '0 0.75rem',
                    background: 'var(--background)',
                  }}
                >
                  <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                    {t('exams.show') || 'Show:'}
                  </span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '0.85rem',
                      color: 'var(--foreground)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <option value={10}>{language === 'bn' ? (10).toLocaleString('bn-BD') : 10}</option>
                    <option value={20}>{language === 'bn' ? (20).toLocaleString('bn-BD') : 20}</option>
                    <option value={50}>{language === 'bn' ? (50).toLocaleString('bn-BD') : 50}</option>
                  </select>
                </div>
              )}

              {activeFiltersCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted-foreground)',
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {t('exams.clearAll') || 'Clear all'}
                </button>
              )}
            </div>
          </div>

          {/* ── Collapsible Filter Tray ───────────────────── */}
          {showFilters && (
            <div
              className="animate-fade-in"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                padding: '1.25rem',
                background: 'var(--background)',
                borderRadius: '0.875rem',
                border: '1px solid var(--border)',
              }}
            >
              {/* Status Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('exams.filterByStatus') || 'Filter by Status'}
                </label>
                <select
                  className="input"
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="all">{t('exams.allStatuses') || 'All Statuses'}</option>
                  <option value="in-progress">{t('exams.status.inProgress') || 'In Progress'}</option>
                  <option value="completed">{t('exams.status.completed') || 'Completed'}</option>
                  <option value="upcoming">{t('exams.statusUpcoming') || 'Upcoming'}</option>
                  <option value="draft">{t('exams.statusDraft') || 'Draft (Unpublished)'}</option>
                </select>
              </div>

              {/* Class Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('exams.filterByClass') || 'Filter by Class'}
                </label>
                <select
                  className="input"
                  value={filterClass}
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="all">{t('exams.allClasses') || 'All Classes'}</option>
                  {allClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('exams.sortOrder') || 'Sort Order'}
                </label>
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="newest">{t('exams.sort.newest') || 'Newest First'}</option>
                  <option value="oldest">{t('exams.sort.oldest') || 'Oldest First'}</option>
                  <option value="name-asc">{t('exams.sort.nameAsc') || 'Exam Name: A → Z'}</option>
                  <option value="name-desc">{t('exams.sort.nameDesc') || 'Exam Name: Z → A'}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── View Rendering ──────────────────────────────────────── */}
        {viewMode === 'table' ? (
          /* ── Table View (Students page format) ─────────────────── */
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  {[
                    { label: t('exams.th.serial') || '#', w: '52px' },
                    { label: t('exams.th.examNameDetails') || 'Exam Name & Details' },
                    { label: t('exams.th.timeline') || 'Timeline', w: '230px' },
                    { label: t('exams.th.classesSubjects') || 'Assigned Classes & Subjects' },
                    { label: t('exams.th.status') || 'Status', w: '140px' },
                    { label: t('exams.th.actions') || 'Actions', w: '180px', align: 'right' as const },
                  ].map((col) => (
                    <th
                      key={col.label}
                      style={{
                        padding: '0.875rem 1.25rem',
                        color: 'var(--muted-foreground)',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        width: col.w,
                        textAlign: col.align || 'left',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="shimmer shimmer-text" style={{ width: '20px', margin: 0 }} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="shimmer shimmer-block" style={{ width: '40px', height: '40px', borderRadius: '0.6rem' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '140px' }}>
                            <div className="shimmer shimmer-text" />
                            <div className="shimmer shimmer-text short" style={{ margin: 0 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="shimmer shimmer-text" style={{ width: '140px', margin: 0 }} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <div className="shimmer shimmer-block" style={{ width: '60px', height: '24px', borderRadius: '999px' }} />
                          <div className="shimmer shimmer-block" style={{ width: '60px', height: '24px', borderRadius: '999px' }} />
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="shimmer shimmer-block" style={{ width: '85px', height: '24px', borderRadius: '999px' }} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <div className="shimmer shimmer-block" style={{ width: '90px', height: '32px', borderRadius: '0.5rem' }} />
                          <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }} />
                          <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : paginatedExams.length > 0 ? (
                  paginatedExams.map((exam, index) => {
                    const sl = (page - 1) * limit + index + 1;
                    const status = getStatusInfo(exam);
                    const uniqueClasses = Array.from(new Set(exam.assignments?.map((a) => a.class?.name).filter(Boolean)));
                    const uniqueSubjects = Array.from(new Set(exam.assignments?.map((a) => a.subject?.name).filter(Boolean)));

                    return (
                      <tr
                        key={exam.id}
                        style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* SL */}
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                          {language === 'bn' ? sl.toLocaleString('bn-BD') : sl}
                        </td>

                        {/* Exam Name & Details */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '0.65rem',
                                background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(129,140,248,0.2))',
                                border: '1.5px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--primary)',
                                flexShrink: 0,
                              }}
                            >
                              <Award size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span
                                style={{
                                  fontWeight: 600,
                                  fontSize: '0.95rem',
                                  color: 'var(--foreground)',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setExamForRoutine(exam)}
                                title={t('exams.clickToView') || 'Click to view routine and results'}
                              >
                                {exam.exam_name}
                              </span>
                              {exam.description ? (
                                <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {exam.description}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                                  {t('exams.noDescription') || 'No description'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Timeline */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '0.4rem',
                                flexShrink: 0,
                                background: 'rgba(79,70,229,0.08)',
                                border: '1px solid rgba(79,70,229,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Calendar size={13} style={{ color: 'var(--primary)' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                                {formatDate(exam.start_date)}
                              </span>
                              {exam.end_date && exam.end_date !== exam.start_date && (
                                <>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>→</span>
                                  <span style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>
                                    {formatDate(exam.end_date)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Classes & Subjects */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <School size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                              {uniqueClasses.length > 0 ? (
                                uniqueClasses.slice(0, 3).map((cls, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      display: 'inline-block',
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '0.3rem',
                                      background: 'rgba(79,70,229,0.08)',
                                      color: 'var(--primary)',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {cls}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                  {t('exams.unassigned') || 'Unassigned'}
                                </span>
                              )}
                              {uniqueClasses.length > 3 && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                                  +{language === 'bn' ? (uniqueClasses.length - 3).toLocaleString('bn-BD') : (uniqueClasses.length - 3)}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                              <BookOpen size={12} />
                              <span>
                                {language === 'bn' ? uniqueSubjects.length.toLocaleString('bn-BD') : uniqueSubjects.length}{' '}
                                {uniqueSubjects.length === 1 ? (t('exams.subjectScheduled') || 'subject scheduled') : (t('exams.subjectsScheduled') || 'subjects scheduled')}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: status.bg,
                              color: status.color,
                              border: `1px solid ${status.border}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.dot, flexShrink: 0 }} />
                            {status.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              className="action-btn"
                              title={t('exams.routineAndResults') || 'Routine & Results'}
                              onClick={() => setExamForRoutine(exam)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(79, 70, 229, 0.25)',
                                background: 'rgba(79, 70, 229, 0.08)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                cursor: 'pointer',
                                color: 'var(--primary)',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                              }}
                            >
                              <FileText size={13} />
                              <span>{t('exams.results') || 'Results'}</span>
                            </button>

                            <button
                              className="action-btn"
                              title={t('exams.editExam') || 'Edit Exam'}
                              onClick={() => {
                                setExamToEdit(exam);
                                setIsCreateModalOpen(true);
                              }}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border)',
                                background: 'var(--background)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--foreground)',
                              }}
                            >
                              <Edit3 size={14} />
                            </button>

                            <button
                              className="action-btn"
                              title={t('exams.deleteExam') || 'Delete Exam'}
                              onClick={() => handleDeleteExam(exam.id, exam.exam_name)}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                background: 'rgba(239, 68, 68, 0.05)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#ef4444',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '4.5rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', maxWidth: '380px', margin: '0 auto' }}>
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'var(--muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--muted-foreground)',
                          }}
                        >
                          <Award size={28} />
                        </div>
                        <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                          {t('exams.noExams') || 'No exams found'}
                        </p>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                          {activeFiltersCount > 0
                            ? (t('exams.emptyFiltered') || 'Try adjusting your search query or reset your filters.')
                            : (t('exams.emptyDefault') || 'No assessment exams have been configured yet. Click "Create Exam" to schedule your first exam.')}
                        </p>
                        {activeFiltersCount > 0 && (
                          <button
                            onClick={resetAllFilters}
                            className="btn"
                            style={{
                              marginTop: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--background)',
                              fontSize: '0.85rem',
                            }}
                          >
                            {t('exams.clearFilters') || 'Clear Filters'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Cards View ────────────────────────────────────────── */
          <div style={{ padding: '1.5rem' }}>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-card" style={{ height: '220px', borderRadius: '1rem', border: '1px solid var(--border)', padding: '1.25rem' }}>
                    <div className="shimmer shimmer-text" style={{ width: '50%', height: '20px' }} />
                    <div className="shimmer shimmer-text" style={{ width: '80%', height: '14px', marginTop: '0.5rem' }} />
                  </div>
                ))}
              </div>
            ) : filteredExams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4.5rem 1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', maxWidth: '380px', margin: '0 auto' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
                    <Award size={28} />
                  </div>
                  <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                    {t('exams.noExams') || 'No exams found'}
                  </p>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0 }}>
                    {activeFiltersCount > 0
                      ? (t('exams.emptyFilteredCards') || 'Try clearing your filters.')
                      : (t('exams.emptyDefaultCards') || 'Click "Create Exam" to begin.')}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                {filteredExams.map((exam) => {
                  const status = getStatusInfo(exam);
                  const uniqueClasses = Array.from(new Set(exam.assignments?.map((a) => a.class?.name).filter(Boolean)));
                  const uniqueSubjects = Array.from(new Set(exam.assignments?.map((a) => a.subject?.name).filter(Boolean)));

                  return (
                    <div
                      key={exam.id}
                      className="glass-card"
                      style={{
                        borderRadius: '1rem',
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 25px -8px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ height: '3px', background: status.color }} />

                      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '999px',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                background: status.bg,
                                color: status.color,
                                border: `1px solid ${status.border}`,
                                marginBottom: '0.4rem',
                              }}
                            >
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: status.dot }} />
                              {status.label}
                            </span>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                              {exam.exam_name}
                            </h4>
                            {exam.description && (
                              <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: '0.25rem 0 0', lineHeight: 1.4 }}>
                                {exam.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Dates */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            background: 'var(--background)',
                            borderRadius: '0.6rem',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                              {t('exams.starts') || 'Starts'}
                            </span>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '0.15rem' }}>
                              {formatDate(exam.start_date)}
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                              {t('exams.ends') || 'Ends'}
                            </span>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '0.15rem' }}>
                              {formatDate(exam.end_date)}
                            </div>
                          </div>
                        </div>

                        {/* Classes & Subjects */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <School size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <span>{t('exams.classesLabel') || 'Classes:'}</span>
                            {uniqueClasses.length > 0 ? (
                              uniqueClasses.slice(0, 3).map((c, i) => (
                                <span key={i} style={{ padding: '0.1rem 0.4rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>
                                  {c}
                                </span>
                              ))
                            ) : (
                              <span>{t('exams.none') || 'None'}</span>
                            )}
                            {uniqueClasses.length > 3 && (
                              <span>+{language === 'bn' ? (uniqueClasses.length - 3).toLocaleString('bn-BD') : (uniqueClasses.length - 3)}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <BookOpen size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <span>
                              {language === 'bn' ? uniqueSubjects.length.toLocaleString('bn-BD') : uniqueSubjects.length}{' '}
                              {uniqueSubjects.length === 1 ? (t('exams.subjectScheduled') || 'subject scheduled') : (t('exams.subjectsScheduled') || 'subjects scheduled')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div style={{ display: 'flex', borderTop: '1px solid var(--border)', background: 'var(--background)' }}>
                        <button
                          onClick={() => setExamForRoutine(exam)}
                          style={{
                            flex: 1,
                            padding: '0.75rem 0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            border: 'none',
                            borderRight: '1px solid var(--border)',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: 'var(--primary)',
                          }}
                        >
                          <FileText size={15} />
                          <span>{t('exams.routineAndResults') || 'Routine & Results'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setExamToEdit(exam);
                            setIsCreateModalOpen(true);
                          }}
                          style={{
                            padding: '0.75rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            borderRight: '1px solid var(--border)',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: 'var(--foreground)',
                          }}
                          title={t('exams.editExam') || 'Edit Exam'}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam.id, exam.exam_name)}
                          style={{
                            padding: '0.75rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#ef4444',
                          }}
                          title={t('exams.deleteExam') || 'Delete Exam'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Table Footer & Pagination (only in Table View) ─────── */}
        {viewMode === 'table' && !loading && total > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              background: 'var(--background)',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
              {t('exams.showing') || 'Showing'}{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {language === 'bn' ? (((page - 1) * limit) + 1).toLocaleString('bn-BD') : (((page - 1) * limit) + 1)}
              </strong>{' '}
              {t('exams.to') || 'to'}{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {language === 'bn' ? Math.min(page * limit, total).toLocaleString('bn-BD') : Math.min(page * limit, total)}
              </strong>{' '}
              {t('exams.of') || 'of'}{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {language === 'bn' ? total.toLocaleString('bn-BD') : total}
              </strong>{' '}
              {t('exams.examsCount') || 'exams'}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginRight: '0.5rem' }}>
                {t('exams.page') || 'Page'} {language === 'bn' ? page.toLocaleString('bn-BD') : page} {t('exams.of') || 'of'} {language === 'bn' ? totalPages.toLocaleString('bn-BD') : totalPages}
              </span>

              <button
                className="btn"
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.4 : 1,
                  background: 'var(--card)',
                  borderRadius: '0.5rem',
                }}
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title={t('exams.previousPage') || 'Previous page'}
              >
                <ChevronLeft size={16} />
              </button>

              <button
                className="btn"
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.4 : 1,
                  background: 'var(--card)',
                  borderRadius: '0.5rem',
                }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title={t('exams.nextPage') || 'Next page'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT EXAM MODAL ──────────────────────────── */}
      {isCreateModalOpen && (
        <CreateExamModal
          examToEdit={examToEdit}
          onClose={() => {
            setIsCreateModalOpen(false);
            setExamToEdit(null);
          }}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            setExamToEdit(null);
            fetchExams();
          }}
        />
      )}

      {/* ── EXAM ROUTINE & RESULTS MODAL ──────────────────────── */}
      {examForRoutine && (
        <ExamRoutineModal
          exam={examForRoutine}
          onClose={() => setExamForRoutine(null)}
        />
      )}
    </div>
  );
}
