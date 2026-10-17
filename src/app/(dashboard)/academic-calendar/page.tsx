"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  CalendarDays, Plus, Filter, Search, Download, RefreshCw,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock,
  MapPin, Paperclip, CheckCircle2, AlertCircle, Trash2, Edit3,
  Eye, X, Loader2, AlertTriangle, Layers, Users,
  BookOpen, ExternalLink, ChevronDown, Check, Sun, Flag
} from 'lucide-react';
import { getPdfTools } from '@/lib/pdf';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const FALLBACK_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkYTBjM2ZmZi1hZTU5LTQ2YTMtYTAzNy0xOWZhNjgwMDNjNmIiLCJyb2xlIjoiYWRtaW4iLCJzY2hvb2xJZCI6IjI5ZjA1ZWRiLThlMGItNDM0Yy1hNDcxLWFhNzc2MzA4YTFjMSIsImNsYXNzSWRzIjpbXSwic2VjdGlvbklkcyI6W10sImlhdCI6MTc5MjI2NDIwMiwiZXhwIjoxNzkyMzUwNjAyfQ.qsqOVg2U3L-_pw1O7LIwAsT-H9WKX0aQYU8Y8f1yuKs';
const DEFAULT_SCHOOL_ID = '29f05edb-8e0b-434c-a471-aa776308a1c1';

const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('access_token') ||
      FALLBACK_TOKEN
    );
  }
  return FALLBACK_TOKEN;
};

const getUserSchoolId = () => {
  try {
    const token = getApiToken();
    if (!token) return DEFAULT_SCHOOL_ID;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.schoolId || DEFAULT_SCHOOL_ID;
  } catch {
    return DEFAULT_SCHOOL_ID;
  }
};

export interface ClassEntity {
  id: string;
  name: string;
  schoolId?: string;
  description?: string;
}

export interface CalendarEvent {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  category: string; // "VACATION" | "HOLIDAY" | "EXAM" | "EVENT" | "ACADEMIC" | "OTHER"
  startDate: string; // ISO date string e.g. "2026-06-01T00:00:00.000Z"
  endDate: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  isHoliday: boolean;
  targetAudience: string;
  classIds?: string[];
  classes?: { id: string; name: string }[];
  color?: string;
  location?: string;
  attachmentUrl?: string | null;
  academicYear?: string;
  term?: string;
  createdById?: string;
  createdBy?: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface EventFormData {
  title: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  isHoliday: boolean;
  targetAudience: string;
  classIds: string[];
  color: string;
  location: string;
  attachmentUrl: string;
  academicYear: string;
  term: string;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; defaultColor: string; bg: string; border: string; text: string; icon: string }
> = {
  VACATION: {
    label: 'Vacation',
    defaultColor: '#E53935',
    bg: 'rgba(229, 57, 53, 0.1)',
    border: 'rgba(229, 57, 53, 0.3)',
    text: '#E53935',
    icon: '🏖️',
  },
  HOLIDAY: {
    label: 'Holiday',
    defaultColor: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    text: '#D97706',
    icon: '🎉',
  },
  EXAM: {
    label: 'Exam & Result',
    defaultColor: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.3)',
    text: '#7C3AED',
    icon: '📝',
  },
  EVENT: {
    label: 'School Event',
    defaultColor: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
    text: '#2563EB',
    icon: '🏆',
  },
  ACADEMIC: {
    label: 'Academic Schedule',
    defaultColor: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    text: '#059669',
    icon: '📚',
  },
  OTHER: {
    label: 'Other',
    defaultColor: '#6B7280',
    bg: 'rgba(107, 114, 128, 0.1)',
    border: 'rgba(107, 114, 128, 0.3)',
    text: '#4B5563',
    icon: '📌',
  },
};

const COLOR_PRESETS = [
  { name: 'Red', hex: '#E53935' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Rose', hex: '#E11D48' },
  { name: 'Slate', hex: '#475569' },
];

const INITIAL_FORM: EventFormData = {
  title: '',
  description: '',
  category: 'VACATION',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '14:00',
  isAllDay: true,
  isHoliday: true,
  targetAudience: 'ALL',
  classIds: [],
  color: '#E53935',
  location: '',
  attachmentUrl: '',
  academicYear: '2026-2027',
  term: 'First Term',
};

export default function AcademicCalendarPage() {
  const { t, language } = useLanguage();

  // Core Data States
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [classesList, setClassesList] = useState<ClassEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'agenda'>('calendar');

  // Month Calendar View State
  const [calendarDate, setCalendarDate] = useState(() => {
    // Default to June 2026 or current date if in 2026
    const now = new Date();
    if (now.getFullYear() === 2026) return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(2026, 5, 1); // June 2026 (0-indexed month 5 is June)
  });

  // Filter States
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('2026-2027');
  const [filterTerm, setFilterTerm] = useState<string>('First Term');
  const [filterYear, setFilterYear] = useState<string>('2026');
  const [filterMonth, setFilterMonth] = useState<string>('all'); // 'all' or '1'..'12'
  const [filterStartDate, setFilterStartDate] = useState<string>('2026-01-01');
  const [filterEndDate, setFilterEndDate] = useState<string>('2026-12-31');
  const [filterHoliday, setFilterHoliday] = useState<string>('all'); // 'all' | 'true' | 'false'
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventFormData>(INITIAL_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Handle outside click for export menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch classes for multi-select
  useEffect(() => {
    async function loadClasses() {
      try {
        const token = getApiToken();
        const res = await fetch(`${API_BASE_URL}/admin/classes`, {
          headers: { accept: '*/*', Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          const list: ClassEntity[] = Array.isArray(json) ? json : json.data || [];
          const userSchoolId = getUserSchoolId();
          const filtered = list.filter((c) => !c.schoolId || c.schoolId === userSchoolId);
          setClassesList(filtered.length > 0 ? filtered : list);
        }
      } catch (err) {
        console.error('Failed to load classes', err);
      }
    }
    loadClasses();
  }, []);

  // Fetch Calendar Events with filters
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getApiToken();
      const params = new URLSearchParams();

      if (filterYear && filterYear !== 'all') params.append('year', filterYear);
      if (filterMonth && filterMonth !== 'all') params.append('month', filterMonth);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      if (filterHoliday !== 'all') params.append('isHoliday', filterHoliday);
      if (filterAcademicYear && filterAcademicYear !== 'all') params.append('academicYear', filterAcademicYear);
      if (filterTerm && filterTerm !== 'all') params.append('term', filterTerm);

      const queryString = params.toString();
      const url = `${API_BASE_URL}/admin/academic-calendar${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url, {
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load calendar events (${res.status})`);
      }

      const json = await res.json();
      const rawEvents: CalendarEvent[] = Array.isArray(json) ? json : json.data || [];
      setEvents(rawEvents);
    } catch (err: unknown) {
      console.error('Failed to fetch academic calendar events', err);
      const msg = err instanceof Error ? err.message : 'Failed to fetch calendar events';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    filterYear,
    filterMonth,
    filterStartDate,
    filterEndDate,
    filterHoliday,
    filterAcademicYear,
    filterTerm,
  ]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        await fetchEvents();
      } catch (err) {
        if (!ignore) {
          console.error(err);
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [fetchEvents]);

  // Client-side filtering by category & search term
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Category filter
      if (filterCategory !== 'all' && ev.category !== filterCategory) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = ev.title?.toLowerCase().includes(query);
        const descMatch = ev.description?.toLowerCase().includes(query);
        const locMatch = ev.location?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !locMatch) return false;
      }
      return true;
    });
  }, [events, filterCategory, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = events.length;
    const holidaysCount = events.filter((e) => e.isHoliday || e.category === 'VACATION' || e.category === 'HOLIDAY').length;
    const now = new Date();
    const upcoming = events.filter((e) => {
      const start = new Date(e.startDate);
      const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length;
    return { total, holidaysCount, upcoming };
  }, [events]);

  // Helper date formatters
  const formatDateRange = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const opt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      if (s.toDateString() === e.toDateString()) {
        return s.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', opt);
      }
      return `${s.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', opt)}`;
    } catch {
      return `${startStr} - ${endStr}`;
    }
  };

  const calculateDaysDuration = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr.split('T')[0]);
      const e = new Date(endStr.split('T')[0]);
      const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  };

  // Open Create Modal
  const handleOpenCreate = (presetDate?: string) => {
    const targetDate = presetDate || new Date().toISOString().split('T')[0];
    setFormData({
      ...INITIAL_FORM,
      startDate: targetDate,
      endDate: targetDate,
      academicYear: filterAcademicYear !== 'all' ? filterAcademicYear : '2026-2027',
      term: filterTerm !== 'all' ? filterTerm : 'First Term',
    });
    setFormMode('create');
    setEditingId(null);
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (event: CalendarEvent) => {
    const sDate = event.startDate ? event.startDate.split('T')[0] : '';
    const eDate = event.endDate ? event.endDate.split('T')[0] : sDate;
    setFormData({
      title: event.title || '',
      description: event.description || '',
      category: event.category || 'VACATION',
      startDate: sDate,
      endDate: eDate,
      startTime: event.startTime || '09:00',
      endTime: event.endTime || '14:00',
      isAllDay: event.isAllDay ?? true,
      isHoliday: event.isHoliday ?? true,
      targetAudience: event.targetAudience || 'ALL',
      classIds: event.classIds || event.classes?.map((c) => c.id) || [],
      color: event.color || '#E53935',
      location: event.location || '',
      attachmentUrl: event.attachmentUrl || '',
      academicYear: event.academicYear || '2026-2027',
      term: event.term || 'First Term',
    });
    setFormMode('edit');
    setEditingId(event.id);
    setDetailModalOpen(false);
    setFormModalOpen(true);
  };

  // Submit Form (Create or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Event title is required');
      return;
    }
    if (!formData.startDate) {
      alert('Start date is required');
      return;
    }
    if (formData.endDate && formData.endDate < formData.startDate) {
      alert('End date cannot be earlier than start date');
      return;
    }

    setFormSubmitting(true);
    try {
      const token = getApiToken();
      const schoolId = getUserSchoolId();

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        startTime: formData.isAllDay ? '00:00' : formData.startTime || '09:00',
        endTime: formData.isAllDay ? '23:59' : formData.endTime || '14:00',
        isAllDay: formData.isAllDay,
        isHoliday: formData.isHoliday,
        targetAudience: formData.targetAudience,
        classIds: formData.classIds,
        color: formData.color,
        location: formData.location.trim(),
        attachmentUrl: formData.attachmentUrl.trim() || undefined,
        academicYear: formData.academicYear,
        term: formData.term,
      };

      let url = '';
      let method = 'POST';

      if (formMode === 'create') {
        url = `${API_BASE_URL}/admin/academic-calendar?schoolId=${schoolId}`;
        method = 'POST';
      } else {
        url = `${API_BASE_URL}/admin/academic-calendar/${editingId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || `Operation failed with status ${res.status}`);
      }

      setToastMessage({
        text: t('academicCalendar.saveSuccess') || 'Calendar event saved successfully!',
        type: 'success',
      });
      setFormModalOpen(false);
      fetchEvents();
    } catch (err: unknown) {
      console.error('Failed to save event', err);
      const msg = err instanceof Error ? err.message : 'Failed to save calendar event';
      alert(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Action
  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setDeleteSubmitting(true);
    try {
      const token = getApiToken();
      const res = await fetch(`${API_BASE_URL}/admin/academic-calendar/${deletingId}`, {
        method: 'DELETE',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to delete event with status ${res.status}`);
      }

      setToastMessage({
        text: t('academicCalendar.deleteSuccess') || 'Calendar event deleted successfully!',
        type: 'success',
      });
      setDeleteConfirmOpen(false);
      setDetailModalOpen(false);
      setDeletingId(null);
      fetchEvents();
    } catch (err: unknown) {
      console.error('Failed to delete event', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete event';
      alert(msg);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Reset Filters to initial curl default
  const handleResetFilters = () => {
    setFilterAcademicYear('2026-2027');
    setFilterTerm('First Term');
    setFilterYear('2026');
    setFilterMonth('all');
    setFilterStartDate('2026-01-01');
    setFilterEndDate('2026-12-31');
    setFilterHoliday('all');
    setFilterCategory('all');
    setSearchTerm('');
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterCategory !== 'all') count++;
    if (filterHoliday !== 'all') count++;
    if (filterMonth !== 'all') count++;
    if (filterAcademicYear !== '2026-2027') count++;
    if (filterTerm !== 'First Term') count++;
    if (filterStartDate !== '2026-01-01' || filterEndDate !== '2026-12-31') count++;
    if (searchTerm) count++;
    return count;
  }, [
    filterCategory,
    filterHoliday,
    filterMonth,
    filterAcademicYear,
    filterTerm,
    filterStartDate,
    filterEndDate,
    searchTerm,
  ]);

  // Export to CSV
  const handleExportCSV = () => {
    setExportMenuOpen(false);
    if (filteredEvents.length === 0) {
      alert('No events to export');
      return;
    }
    const headers = [
      '#',
      'Title',
      'Category',
      'Holiday/Vacation',
      'Start Date',
      'End Date',
      'Duration (Days)',
      'Time',
      'Target Audience',
      'Location',
      'Academic Year',
      'Term',
    ];
    const rows = filteredEvents.map((ev, i) => [
      (i + 1).toString(),
      `"${(ev.title || '').replace(/"/g, '""')}"`,
      ev.category,
      ev.isHoliday ? 'Yes' : 'No',
      ev.startDate ? ev.startDate.split('T')[0] : '',
      ev.endDate ? ev.endDate.split('T')[0] : '',
      calculateDaysDuration(ev.startDate, ev.endDate).toString(),
      ev.isAllDay ? 'All Day' : `${ev.startTime || ''} - ${ev.endTime || ''}`,
      ev.targetAudience,
      `"${(ev.location || '').replace(/"/g, '""')}"`,
      ev.academicYear || '',
      ev.term || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `academic_calendar_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF
  const handleExportPDF = async () => {
    setExportMenuOpen(false);
    if (filteredEvents.length === 0) {
      alert('No events to export');
      return;
    }
    try {
      const { jsPDF, autoTable } = await getPdfTools();
      const doc = new jsPDF('landscape');

      doc.setFontSize(18);
      doc.setTextColor(79, 70, 229);
      doc.text(t('academicCalendar.title') || 'Academic Calendar', 14, 18);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Academic Year: ${filterAcademicYear} | Term: ${filterTerm} | Generated on: ${new Date().toLocaleDateString()}`,
        14,
        25
      );

      const tableHeaders = [
        '#',
        'Title',
        'Category',
        'Dates',
        'Days',
        'Timing',
        'Audience',
        'Location',
        'Holiday',
      ];
      const tableRows = filteredEvents.map((ev, idx) => [
        (idx + 1).toString(),
        ev.title || '',
        CATEGORY_CONFIG[ev.category]?.label || ev.category,
        formatDateRange(ev.startDate, ev.endDate),
        calculateDaysDuration(ev.startDate, ev.endDate).toString(),
        ev.isAllDay ? 'All Day' : `${ev.startTime || ''} - ${ev.endTime || ''}`,
        ev.targetAudience,
        ev.location || '—',
        ev.isHoliday ? 'Holiday / Closed' : 'Regular',
      ]);

      autoTable(doc, {
        head: [tableHeaders],
        body: tableRows,
        startY: 30,
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`academic_calendar_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export error', err);
      alert('Failed to generate PDF');
    }
  };

  // Month navigation helpers for Month View
  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const goToToday = () => {
    setCalendarDate(new Date());
  };

  // Build Month Calendar Days matrix
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEvent[];
    }[] = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      const ds = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateString: ds,
        dayNumber: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: ds === todayStr,
        events: [],
      });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(year, month, day);
      // Format as YYYY-MM-DD cleanly using local values
      const yearStr = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const ds = `${yearStr}-${monthStr}-${dayStr}`;

      // Check which events fall on this day
      const matchingEvents = filteredEvents.filter((ev) => {
        if (!ev.startDate) return false;
        const s = ev.startDate.split('T')[0];
        const e = (ev.endDate || ev.startDate).split('T')[0];
        return ds >= s && ds <= e;
      });

      days.push({
        date: d,
        dateString: ds,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: ds === todayStr,
        events: matchingEvents,
      });
    }

    // Next month filler days (fill to reach multiple of 7, up to 42 cells)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const ds = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateString: ds,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: ds === todayStr,
        events: [],
      });
    }

    return days;
  }, [calendarDate, filteredEvents]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div
      className="page-container animate-fade-in"
      style={{
        padding: '2rem',
        maxWidth: '1440px',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {/* Toast feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: toastMessage.type === 'success' ? '#10B981' : '#EF4444',
            color: '#fff',
            padding: '0.85rem 1.4rem',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontWeight: 500,
            fontSize: '0.9rem',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              marginLeft: '0.5rem',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Top Header & Actions ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              }}
            >
              <CalendarDays size={22} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: 'var(--foreground)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {t('academicCalendar.title') || 'Academic Calendar'}
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', margin: 0 }}>
                {t('academicCalendar.subtitle') || 'Plan, schedule and track holidays, vacations, exams and academic events'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Refresh */}
          <button
            className="btn"
            onClick={fetchEvents}
            disabled={loading}
            style={{
              height: '42px',
              padding: '0 1rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--foreground)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t('common.refresh') || 'Refresh'}</span>
          </button>

          {/* Export Dropdown */}
          <div style={{ position: 'relative' }} ref={exportMenuRef}>
            <button
              className="btn"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              style={{
                height: '42px',
                padding: '0 1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Download size={16} />
              <span>Export</span>
              <ChevronDown size={14} />
            </button>

            {exportMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '48px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  zIndex: 100,
                  minWidth: '160px',
                  overflow: 'hidden',
                  padding: '0.35rem',
                }}
              >
                <button
                  onClick={handleExportPDF}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    color: 'var(--foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Download size={14} color="#EF4444" />
                  <span>{t('academicCalendar.exportPDF') || 'Export PDF'}</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    color: 'var(--foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Download size={14} color="#10B981" />
                  <span>{t('academicCalendar.exportCSV') || 'Export CSV'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Add Calendar Event Button */}
          <button
            className="btn btn-primary"
            onClick={() => handleOpenCreate()}
            style={{
              height: '42px',
              padding: '0 1.25rem',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            <span>{t('academicCalendar.addEvent') || 'Add Event'}</span>
          </button>
        </div>
      </div>

      {/* ── Summary Metrics Cards ─────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          className="glass-card"
          style={{
            background: 'var(--card)',
            padding: '1.25rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '0.75rem',
              background: 'rgba(79, 70, 229, 0.12)',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>
              {t('academicCalendar.totalEvents') || 'Total Events'}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
              {metrics.total}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            background: 'var(--card)',
            padding: '1.25rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '0.75rem',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sun size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>
              {t('academicCalendar.holidays') || 'Holidays & Vacations'}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
              {metrics.holidaysCount}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            background: 'var(--card)',
            padding: '1.25rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '0.75rem',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>
              {t('academicCalendar.upcoming') || 'Next 30 Days'}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
              {metrics.upcoming}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            background: 'var(--card)',
            padding: '1.25rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '0.75rem',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Flag size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>
              {t('academicCalendar.currentTerm') || 'Session & Term'}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
              {filterAcademicYear} • {filterTerm}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter & View Toggle Bar ───────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          background: 'var(--card)',
          borderRadius: '1rem',
          border: '1px solid var(--border)',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              flex: '1',
              minWidth: '240px',
              maxWidth: '380px',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              padding: '0 0.75rem',
              height: '40px',
              background: 'var(--background)',
            }}
          >
            <Search size={16} style={{ color: 'var(--muted-foreground)', marginRight: '0.5rem' }} />
            <input
              type="text"
              placeholder={t('academicCalendar.searchPlaceholder') || 'Search title, description, venue...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted-foreground)',
                  padding: 2,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Year / Term Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              value={filterAcademicYear}
              onChange={(e) => setFilterAcademicYear(e.target.value)}
              style={{
                height: '40px',
                padding: '0 0.85rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.85rem',
                outline: 'none',
                fontWeight: 500,
              }}
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2027-2028">2027-2028</option>
              <option value="all">All Academic Years</option>
            </select>

            <select
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              style={{
                height: '40px',
                padding: '0 0.85rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.85rem',
                outline: 'none',
                fontWeight: 500,
              }}
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Final Term">Final Term</option>
              <option value="all">All Terms</option>
            </select>

            {/* Toggle Advanced Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                height: '40px',
                padding: '0 0.85rem',
                borderRadius: '0.75rem',
                border: showFilters || activeFiltersCount > 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: showFilters ? 'var(--primary)' : 'var(--background)',
                color: showFilters ? 'var(--primary-foreground)' : 'var(--foreground)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Filter size={15} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    backgroundColor: showFilters ? '#fff' : 'var(--primary)',
                    color: showFilters ? 'var(--primary)' : '#fff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View Switch Buttons */}
            <div
              style={{
                display: 'flex',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '0.75rem',
                padding: '3px',
                gap: '2px',
              }}
            >
              <button
                onClick={() => setViewMode('calendar')}
                title="Month Calendar View"
                style={{
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '0.5rem',
                  background: viewMode === 'calendar' ? 'var(--card)' : 'transparent',
                  color: viewMode === 'calendar' ? 'var(--primary)' : 'var(--muted-foreground)',
                  fontWeight: viewMode === 'calendar' ? 600 : 500,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <CalendarDays size={15} />
                <span className="hidden md:inline">Calendar</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Table View"
                style={{
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '0.5rem',
                  background: viewMode === 'table' ? 'var(--card)' : 'transparent',
                  color: viewMode === 'table' ? 'var(--primary)' : 'var(--muted-foreground)',
                  fontWeight: viewMode === 'table' ? 600 : 500,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Layers size={15} />
                <span className="hidden md:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                title="Agenda Cards View"
                style={{
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '0.5rem',
                  background: viewMode === 'agenda' ? 'var(--card)' : 'transparent',
                  color: viewMode === 'agenda' ? 'var(--primary)' : 'var(--muted-foreground)',
                  fontWeight: viewMode === 'agenda' ? 600 : 500,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'agenda' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Clock size={15} />
                <span className="hidden md:inline">Agenda</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {showFilters && (
          <div
            style={{
              paddingTop: '1rem',
              borderTop: '1px dashed var(--border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.25rem' }}>
                {t('academicCalendar.filterCategory') || 'Category'}
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="all">All Categories</option>
                <option value="VACATION">Vacation (Recess)</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="EXAM">Exam & Result</option>
                <option value="EVENT">Event</option>
                <option value="ACADEMIC">Academic</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.25rem' }}>
                {t('academicCalendar.filterHoliday') || 'Holiday Status'}
              </label>
              <select
                value={filterHoliday}
                onChange={(e) => setFilterHoliday(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="all">All Entries</option>
                <option value="true">Holidays & Closures Only</option>
                <option value="false">Non-Holidays Only</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.25rem' }}>
                Month
              </label>
              <select
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value);
                  if (e.target.value !== 'all') {
                    const m = parseInt(e.target.value, 10) - 1;
                    const y = filterYear !== 'all' ? parseInt(filterYear, 10) : 2026;
                    setCalendarDate(new Date(y, m, 1));
                  }
                }}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="all">All Months</option>
                {monthNames.map((name, idx) => (
                  <option key={idx + 1} value={(idx + 1).toString()}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.25rem' }}>
                Start Date
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.25rem' }}>
                End Date
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <button
                onClick={handleResetFilters}
                style={{
                  height: '38px',
                  width: '100%',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--muted)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <RefreshCw size={14} />
                <span>{t('academicCalendar.resetFilters') || 'Reset'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '0.75rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertCircle size={20} />
          <div>
            <strong>Error loading calendar:</strong> {error}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT VIEW ──────────────────────────────────────── */}
      {loading ? (
        <div
          style={{
            minHeight: '360px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
          }}
        >
          <Loader2 size={36} className="animate-spin" color="var(--primary)" />
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
            {t('common.loading') || 'Loading academic calendar events...'}
          </p>
        </div>
      ) : filteredEvents.length === 0 && viewMode !== 'calendar' ? (
        <div
          className="glass-card"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            background: 'var(--card)',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              background: 'rgba(79, 70, 229, 0.1)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarDays size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.5rem' }}>
            {t('academicCalendar.noEvents') || 'No academic events found'}
          </h3>
          <p style={{ color: 'var(--muted-foreground)', maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            {t('academicCalendar.noEventsDesc') || 'Create your first calendar entry or adjust the active filters above.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => handleOpenCreate()}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Plus size={18} />
            <span>{t('academicCalendar.addEvent') || 'Add Calendar Event'}</span>
          </button>
        </div>
      ) : viewMode === 'calendar' ? (
        /* ── VIEW 1: MONTH CALENDAR GRID ────────────────────────────── */
        <div
          className="glass-card"
          style={{
            background: 'var(--card)',
            borderRadius: '1.25rem',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          {/* Calendar Month Header & Navigation */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                }}
              >
                {filteredEvents.length} events
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={prevMonth}
                title="Previous Month"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goToToday}
                style={{
                  height: '36px',
                  padding: '0 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {t('academicCalendar.today') || 'Today'}
              </button>
              <button
                onClick={nextMonth}
                title="Next Month"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Day of Week Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid var(--border)',
              background: 'var(--muted)',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: '0.8rem',
              color: 'var(--muted-foreground)',
            }}
          >
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={day} style={{ padding: '0.65rem 0', color: i === 5 || i === 6 ? '#EF4444' : 'inherit' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              background: 'var(--border)',
              gap: '1px',
            }}
          >
            {calendarDays.map((cell, idx) => {
              return (
                <div
                  key={idx}
                  onClick={() => cell.isCurrentMonth && handleOpenCreate(cell.dateString)}
                  style={{
                    background: cell.isCurrentMonth ? 'var(--card)' : 'var(--background)',
                    minHeight: '120px',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: cell.isCurrentMonth ? 1 : 0.45,
                    cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (cell.isCurrentMonth) e.currentTarget.style.backgroundColor = 'var(--muted)';
                  }}
                  onMouseLeave={(e) => {
                    if (cell.isCurrentMonth) e.currentTarget.style.backgroundColor = 'var(--card)';
                  }}
                >
                  {/* Day header number */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        fontSize: '0.8rem',
                        fontWeight: cell.isToday ? 700 : 500,
                        backgroundColor: cell.isToday ? 'var(--primary)' : 'transparent',
                        color: cell.isToday ? '#fff' : 'var(--foreground)',
                      }}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.events.some((e) => e.isHoliday) && (
                      <span
                        title="Holiday / School closed"
                        style={{
                          fontSize: '0.7rem',
                          color: '#EF4444',
                          fontWeight: 600,
                        }}
                      >
                        🌴
                      </span>
                    )}
                  </div>

                  {/* Day Events Pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'auto' }}>
                    {cell.events.slice(0, 3).map((ev) => {
                      const cfg = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.OTHER;
                      const eventColor = ev.color || cfg.defaultColor;
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                            setDetailModalOpen(true);
                          }}
                          style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            backgroundColor: eventColor + '1F',
                            borderLeft: `3px solid ${eventColor}`,
                            color: 'var(--foreground)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer',
                          }}
                          title={`${ev.title} (${cfg.label})`}
                        >
                          <span>{cfg.icon}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                        </div>
                      );
                    })}
                    {cell.events.length > 3 && (
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          paddingLeft: '4px',
                        }}
                      >
                        +{cell.events.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* ── VIEW 2: TABLE VIEW ─────────────────────────────────────── */
        <div
          className="glass-card"
          style={{
            background: 'var(--card)',
            borderRadius: '1.25rem',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--muted)',
                    color: 'var(--muted-foreground)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                  }}
                >
                  <th style={{ padding: '0.85rem 1rem' }}>#</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Event Title</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Dates & Duration</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Timing</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Holiday?</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Target Audience</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Location</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev, index) => {
                  const cfg = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.OTHER;
                  const eventColor = ev.color || cfg.defaultColor;
                  const duration = calculateDaysDuration(ev.startDate, ev.endDate);

                  return (
                    <tr
                      key={ev.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.15s',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedEvent(ev);
                        setDetailModalOpen(true);
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '1rem', color: 'var(--muted-foreground)' }}>{index + 1}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: eventColor,
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{ev.title}</div>
                            {ev.description && (
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--muted-foreground)',
                                  maxWidth: '300px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {ev.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                            color: cfg.text,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 500, color: 'var(--foreground)' }}>
                          {formatDateRange(ev.startDate, ev.endDate)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                          {duration} day{duration > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--foreground)' }}>
                        {ev.isAllDay ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>
                            All Day
                          </span>
                        ) : (
                          <span>
                            {ev.startTime} - {ev.endTime}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {ev.isHoliday ? (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: '#EF4444',
                            }}
                          >
                            Closed
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              backgroundColor: 'var(--muted)',
                              color: 'var(--muted-foreground)',
                            }}
                          >
                            Open
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--foreground)' }}>
                          {ev.targetAudience}
                        </div>
                        {ev.classes && ev.classes.length > 0 && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                            {ev.classes.map((c) => c.name).join(', ')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--foreground)' }}>
                        {ev.location ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} style={{ color: 'var(--muted-foreground)' }} />
                            <span>{ev.location}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted-foreground)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setSelectedEvent(ev);
                              setDetailModalOpen(true);
                            }}
                            title="View Details"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--card)',
                              color: 'var(--foreground)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(ev)}
                            title="Edit Event"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--card)',
                              color: '#3B82F6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(ev.id)}
                            title="Delete Event"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--card)',
                              color: '#EF4444',
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
        </div>
      ) : (
        /* ── VIEW 3: AGENDA / CARDS VIEW ────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredEvents.map((ev) => {
            const cfg = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.OTHER;
            const eventColor = ev.color || cfg.defaultColor;
            const duration = calculateDaysDuration(ev.startDate, ev.endDate);

            return (
              <div
                key={ev.id}
                className="glass-card"
                onClick={() => {
                  setSelectedEvent(ev);
                  setDetailModalOpen(true);
                }}
                style={{
                  background: 'var(--card)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)',
                  borderLeft: `5px solid ${eventColor}`,
                  padding: '1.25rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '0.75rem',
                      backgroundColor: eventColor + '18',
                      color: eventColor,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{cfg.icon}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '2px' }}>
                      {duration}d
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                        {ev.title}
                      </h3>
                      {ev.isHoliday && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#EF4444',
                          }}
                        >
                          Holiday
                        </span>
                      )}
                    </div>

                    {ev.description && (
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--muted-foreground)',
                          margin: '0 0 0.5rem 0',
                          maxWidth: '650px',
                        }}
                      >
                        {ev.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CalendarIcon size={14} />
                        <span>{formatDateRange(ev.startDate, ev.endDate)}</span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        <span>{ev.isAllDay ? 'All Day' : `${ev.startTime} - ${ev.endTime}`}</span>
                      </span>
                      {ev.location && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} />
                          <span>{ev.location}</span>
                        </span>
                      )}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={14} />
                        <span>Audience: {ev.targetAudience}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleOpenEdit(ev)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      color: 'var(--foreground)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(ev.id)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.05)',
                      color: '#EF4444',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT EVENT MODAL ──────────────────────────────── */}
      {formModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !formSubmitting && setFormModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--card)',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              borderRadius: '1.25rem',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '0.5rem',
                    backgroundColor: formData.color + '22',
                    color: formData.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                    {formMode === 'create'
                      ? t('academicCalendar.addEvent') || 'Add Calendar Event'
                      : t('academicCalendar.editEvent') || 'Edit Calendar Event'}
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0 }}>
                    {formMode === 'create'
                      ? 'Create a new entry for academic schedule, vacation or holiday'
                      : 'Update the existing academic calendar entry'}
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
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Event Title */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('academicCalendar.eventTitle') || 'Event Title'} <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Vacation 2026, Annual Sports Day, Eid-ul-Fitr Break"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Category & Academic Year & Term */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const presetColor = CATEGORY_CONFIG[cat]?.defaultColor || formData.color;
                      const isHolidayCategory = cat === 'VACATION' || cat === 'HOLIDAY';
                      setFormData({
                        ...formData,
                        category: cat,
                        color: presetColor,
                        isHoliday: isHolidayCategory ? true : formData.isHoliday,
                      });
                    }}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="VACATION">Vacation (Recess)</option>
                    <option value="HOLIDAY">Holiday</option>
                    <option value="EXAM">Exam & Result</option>
                    <option value="EVENT">School Event</option>
                    <option value="ACADEMIC">Academic Schedule</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                    {t('academicCalendar.filterYear') || 'Academic Year'}
                  </label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    placeholder="e.g. 2026-2027"
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                    {t('academicCalendar.filterTerm') || 'Term'}
                  </label>
                  <select
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Final Term">Final Term</option>
                    <option value="Mid Term">Mid Term</option>
                    <option value="Full Year">Full Year</option>
                  </select>
                </div>
              </div>

              {/* Holiday & All Day Checkbox Toggles */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                  padding: '0.85rem 1rem',
                  background: 'var(--muted)',
                  borderRadius: '0.75rem',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: 'var(--foreground)' }}>
                  <input
                    type="checkbox"
                    checked={formData.isHoliday}
                    onChange={(e) => setFormData({ ...formData, isHoliday: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#EF4444' }}
                  />
                  <span>Mark as Holiday / School Closed</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: 'var(--foreground)' }}>
                  <input
                    type="checkbox"
                    checked={formData.isAllDay}
                    onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  <span>All Day Event</span>
                </label>
              </div>

              {/* Start Date & End Date */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                    {t('academicCalendar.startDate') || 'Start Date'} <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFormData({
                        ...formData,
                        startDate: newStart,
                        endDate: formData.endDate < newStart ? newStart : formData.endDate,
                      });
                    }}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                    {t('academicCalendar.endDate') || 'End Date'} <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              {/* Start Time & End Time (only if not all day) */}
              {!formData.isAllDay && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                      {t('academicCalendar.startTime') || 'Start Time'}
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 0.85rem',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.9rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                      {t('academicCalendar.endTime') || 'End Time'}
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 0.85rem',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.9rem',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Target Audience & Classes Multi-select */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                    {t('academicCalendar.targetAudience') || 'Target Audience'}
                  </label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="ALL">ALL (Everyone)</option>
                    <option value="STUDENTS">Students Only</option>
                    <option value="TEACHERS">Teachers Only</option>
                    <option value="PARENTS">Parents Only</option>
                    <option value="CLASSES">Specific Classes</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                    {t('academicCalendar.location') || 'Location / Venue'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Auditorium, Campus Ground, Online"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              {/* Class Selection Pills (if classes exist) */}
              {classesList.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                    Assigned Classes {formData.targetAudience === 'CLASSES' && <span style={{ color: '#EF4444' }}>*</span>}
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.4rem',
                      maxHeight: '110px',
                      overflowY: 'auto',
                      padding: '0.5rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                    }}
                  >
                    {classesList.map((cls) => {
                      const isSelected = formData.classIds.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => {
                            const updated = isSelected
                              ? formData.classIds.filter((id) => id !== cls.id)
                              : [...formData.classIds, cls.id];
                            setFormData({ ...formData, classIds: updated });
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'var(--card)',
                            color: isSelected ? 'var(--primary)' : 'var(--foreground)',
                            fontSize: '0.8rem',
                            fontWeight: isSelected ? 600 : 400,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isSelected && <Check size={12} />}
                          <span>{cls.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Color Theme Picker */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('academicCalendar.color') || 'Color Theme'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: preset.hex })}
                      title={preset.name}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: preset.hex,
                        border: formData.color === preset.hex ? '3px solid #fff' : '2px solid transparent',
                        boxShadow: formData.color === preset.hex ? '0 0 0 2px var(--primary)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      {formData.color === preset.hex && <Check size={14} />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                </div>
              </div>

              {/* Attachment URL */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('academicCalendar.attachmentUrl') || 'Attachment URL (PDF Notice or Circular)'}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Paperclip size={16} style={{ position: 'absolute', left: '12px', color: 'var(--muted-foreground)' }} />
                  <input
                    type="url"
                    placeholder="https://example.com/uploads/academic-calendar-2026.pdf"
                    value={formData.attachmentUrl}
                    onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem 0 2.25rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('academicCalendar.description') || 'Description / Notes'}
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional notes, instructions or circular details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  disabled={formSubmitting}
                  style={{
                    height: '42px',
                    padding: '0 1.25rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn btn-primary"
                  style={{
                    height: '42px',
                    padding: '0 1.5rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  {formSubmitting && <Loader2 size={16} className="animate-spin" />}
                  <span>{formMode === 'create' ? 'Save Event' : 'Update Event'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EVENT DETAILS MODAL ────────────────────────────────────── */}
      {detailModalOpen && selectedEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setDetailModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--card)',
              width: '100%',
              maxWidth: '560px',
              borderRadius: '1.25rem',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Colored Banner */}
            <div
              style={{
                height: '8px',
                backgroundColor: selectedEvent.color || '#4F46E5',
                width: '100%',
              }}
            />

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Header with Badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: (selectedEvent.color || '#4F46E5') + '22',
                        color: selectedEvent.color || '#4F46E5',
                      }}
                    >
                      {CATEGORY_CONFIG[selectedEvent.category]?.label || selectedEvent.category}
                    </span>
                    {selectedEvent.isHoliday && (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#EF4444',
                        }}
                      >
                        🌴 Holiday / Closed
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
                    {selectedEvent.title}
                  </h2>
                </div>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted-foreground)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Date & Time Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  background: 'var(--muted)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                    DATES & DURATION
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '2px' }}>
                    {formatDateRange(selectedEvent.startDate, selectedEvent.endDate)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    {calculateDaysDuration(selectedEvent.startDate, selectedEvent.endDate)} day(s) duration
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                    TIME SCHEDULE
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '2px' }}>
                    {selectedEvent.isAllDay
                      ? 'All Day'
                      : `${selectedEvent.startTime || ''} - ${selectedEvent.endTime || ''}`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    Session: {selectedEvent.academicYear || '2026-2027'} • {selectedEvent.term || 'First Term'}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>
                    DESCRIPTION
                  </div>
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--foreground)',
                      margin: 0,
                      lineHeight: 1.5,
                      background: 'var(--background)',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Audience & Location Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)' }}>
                  <Users size={16} style={{ color: 'var(--muted-foreground)' }} />
                  <span>
                    <strong>Target Audience:</strong> {selectedEvent.targetAudience}
                  </span>
                </div>

                {selectedEvent.classes && selectedEvent.classes.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)' }}>
                    <BookOpen size={16} style={{ color: 'var(--muted-foreground)' }} />
                    <span>
                      <strong>Classes:</strong> {selectedEvent.classes.map((c) => c.name).join(', ')}
                    </span>
                  </div>
                )}

                {selectedEvent.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)' }}>
                    <MapPin size={16} style={{ color: 'var(--muted-foreground)' }} />
                    <span>
                      <strong>Location:</strong> {selectedEvent.location}
                    </span>
                  </div>
                )}

                {selectedEvent.attachmentUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Paperclip size={16} style={{ color: 'var(--primary)' }} />
                    <a
                      href={selectedEvent.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--primary)',
                        textDecoration: 'underline',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 500,
                      }}
                    >
                      <span>View Attached Notice / PDF</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>

              {/* Creator info */}
              {selectedEvent.createdBy && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '0.5rem',
                    background: 'var(--muted)',
                    fontSize: '0.8rem',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  {selectedEvent.createdBy.avatar ? (
                    <img
                      src={selectedEvent.createdBy.avatar}
                      alt={selectedEvent.createdBy.name}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                      }}
                    >
                      {selectedEvent.createdBy.name?.[0] || 'A'}
                    </div>
                  )}
                  <span>
                    Posted by <strong>{selectedEvent.createdBy.name}</strong> ({selectedEvent.createdBy.role})
                  </span>
                </div>
              )}

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  onClick={() => handleDeleteClick(selectedEvent.id)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#EF4444',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={15} />
                  <span>Delete</span>
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleOpenEdit(selectedEvent)}
                    className="btn btn-primary"
                    style={{
                      padding: '0.55rem 1.25rem',
                      borderRadius: '0.5rem',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={15} />
                    <span>Edit Event</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ──────────────────────────────── */}
      {deleteConfirmOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !deleteSubmitting && setDeleteConfirmOpen(false)}
        >
          <div
            style={{
              background: 'var(--card)',
              width: '100%',
              maxWidth: '440px',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, textAlign: 'center', margin: '0 0 0.5rem', color: 'var(--foreground)' }}>
              {t('academicCalendar.deleteEvent') || 'Delete Calendar Event'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', textAlign: 'center', margin: '0 0 1.5rem' }}>
              {t('academicCalendar.deleteConfirm') || 'Are you sure you want to delete this event? This action cannot be undone.'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteSubmitting}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: '#EF4444',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                {deleteSubmitting && <Loader2 size={15} className="animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
