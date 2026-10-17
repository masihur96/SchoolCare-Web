"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  Search, Filter, ChevronLeft, ChevronRight, Loader2, X,
  Download, RefreshCw, ClipboardList,
  FileSpreadsheet, FileText, ChevronDown, Calendar,
  User, Clock, Plus, MapPin, Briefcase
} from 'lucide-react';
import { getPdfTools } from '@/lib/pdf';
import CreateTeacherAttendanceModal from '@/components/CreateTeacherAttendanceModal';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

interface TeacherEntity {
  id: string;
  name: string;
  designation?: string;
  email?: string;
}

interface SchoolEntity {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  schoolId?: string;
}

interface TeacherAttendanceRecord {
  id: string;
  teacherId: string;
  date: string;
  time: string;
  startTime: string;
  endTime: string | null;
  status: string;
  distanceFromCenter: number;
  teacher: { name: string; designation?: string } | null;
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  'clock-in':    { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', border: 'rgba(16,185,129,0.25)',  dot: '#10b981' },
  'clock-out':   { bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6', border: 'rgba(59,130,246,0.25)', dot: '#3b82f6' },
  'clocked-in':  { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', border: 'rgba(16,185,129,0.25)',  dot: '#10b981' },
  'clocked-out': { bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6', border: 'rgba(59,130,246,0.25)', dot: '#3b82f6' },
  present:       { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', border: 'rgba(16,185,129,0.25)',  dot: '#10b981' },
  absent:        { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)',   dot: '#ef4444' },
  late:          { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)',  dot: '#f59e0b' },
  leave:         { bg: 'rgba(139,92,246,0.1)',  color: '#8b5cf6', border: 'rgba(139,92,246,0.25)', dot: '#8b5cf6' },
  excused:       { bg: 'rgba(139,92,246,0.1)',  color: '#8b5cf6', border: 'rgba(139,92,246,0.25)', dot: '#8b5cf6' },
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const key = status?.toLowerCase() || 'unknown';
  const cfg = STATUS_CONFIG[key] ?? {
    bg: 'rgba(107,114,128,0.1)',
    color: '#6b7280',
    border: 'rgba(107,114,128,0.25)',
    dot: '#6b7280',
  };

  let label = t('teacherAttendance.unknown') || 'Unknown';
  if (key === 'clock-in' || key === 'clocked-in') label = t('teacherAttendance.clockIn') || 'Clock In';
  else if (key === 'clock-out' || key === 'clocked-out') label = t('teacherAttendance.clockOut') || 'Clock Out';
  else if (key === 'present') label = t('common.present') || 'Present';
  else if (key === 'absent') label = t('common.absent') || 'Absent';
  else if (key === 'late') label = t('common.late') || 'Late';
  else if (key === 'leave') label = t('common.leave') || 'Leave';
  else if (key === 'excused') label = t('teacherAttendance.excused') || 'Excused';
  else if (status) {
    label = status
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.25rem 0.65rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// Convert ISO string or "HH:MM" to "h:MM AM/PM"
function formatTimeTo12h(timeStr: string | null | undefined, language: string = 'en'): string {
  if (!timeStr) return '—';
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime()) && timeStr.includes('T')) {
      return d.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    const [hStr, mStr] = timeStr.split(':');
    if (hStr !== undefined && mStr !== undefined) {
      let h = parseInt(hStr, 10);
      const m = mStr.substring(0, 2);
      const ampm = h >= 12 ? (language === 'bn' ? 'পিএম' : 'PM') : (language === 'bn' ? 'এএম' : 'AM');
      h = h % 12 || 12;
      const formattedNum = language === 'bn' ? `${h}:${m}`.replace(/\d/g, (dig) => '০১২৩৪৫৬৭৮৯'[parseInt(dig, 10)]) : `${h}:${m}`;
      return `${formattedNum} ${ampm}`;
    }
  } catch (e) {}
  return timeStr;
}

export default function TeacherAttendancePage() {
  const { t, language } = useLanguage();
  const [records, setRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [teachersData, setTeachersData] = useState<TeacherEntity[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolEntity | null>(null);

  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [showFilters, setShowFilters] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(getApiToken().split('.')[1]));
      return payload.schoolId;
    } catch {
      return null;
    }
  };
  const userSchoolId = getUserSchoolId();

  // Debounce search
  useEffect(() => {
    const h = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportDropdownOpen) return;
    const fn = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.teacher-att-export-dd')) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [exportDropdownOpen]);

  const fetchFiltersData = useCallback(async () => {
    if (!userSchoolId) return;
    try {
      const headers = { accept: '*/*', Authorization: `Bearer ${getApiToken()}` };
      const [teachersRes, schoolsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/users?role=teacher&limit=1000`, { headers }),
        fetch(`${API_BASE_URL}/admin/schools`, { headers }),
      ]);
      const teachersJson = await teachersRes.json();
      const schoolsJson = await schoolsRes.json();

      const teachers: TeacherEntity[] = teachersJson.data?.data || teachersJson.data || teachersJson || [];
      const schools: SchoolEntity[] = Array.isArray(schoolsJson) ? schoolsJson : schoolsJson.data || [];

      setTeachersData(Array.isArray(teachers) ? teachers : []);
      const school = schools.find((s) => s.schoolId === userSchoolId || s.id === userSchoolId);
      if (school) setSchoolInfo(school);
    } catch (err) {
      console.error('Failed to fetch filters data:', err);
    }
  }, [userSchoolId]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { accept: '*/*', Authorization: `Bearer ${getApiToken()}` };
      const q = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filterTeacher) q.append('teacherId', filterTeacher);
      if (filterStatus) q.append('status', filterStatus);
      if (filterDate) q.append('date', filterDate);
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);

      const res = await fetch(`${API_BASE_URL}/admin/teacher-attendance?${q.toString()}`, { headers });
      const json = await res.json();

      let fetchedRecords: TeacherAttendanceRecord[] = [];
      let fetchedTotal = 0;

      if (Array.isArray(json)) {
        fetchedRecords = json;
        fetchedTotal = json.length;
      } else if (json.data && Array.isArray(json.data)) {
        fetchedRecords = json.data;
        fetchedTotal = json.data.length;
      } else if (json.data?.data && Array.isArray(json.data.data)) {
        fetchedRecords = json.data.data;
        fetchedTotal = json.data.total || json.data.data.length || 0;
      }

      setRecords(fetchedRecords);
      setTotal(fetchedTotal || fetchedRecords.length);
    } catch (err) {
      console.error('Failed to fetch teacher attendance:', err);
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterTeacher, filterStatus, filterDate, startDate, endDate]);

  useEffect(() => {
    fetchFiltersData();
  }, [fetchFiltersData]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Client-side search filtering across records
  const filteredRecords = useMemo(() => {
    if (!debouncedSearch) return records;
    const term = debouncedSearch.toLowerCase().trim();
    return records.filter(
      (r) =>
        (r.teacher?.name && r.teacher.name.toLowerCase().includes(term)) ||
        (r.teacher?.designation && r.teacher.designation.toLowerCase().includes(term))
    );
  }, [records, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const activeFiltersCount =
    (filterTeacher ? 1 : 0) +
    (filterStatus ? 1 : 0) +
    (filterDate ? 1 : 0) +
    (debouncedSearch ? 1 : 0);

  const resetAllFilters = () => {
    setFilterTeacher('');
    setFilterStatus('');
    setFilterDate('');
    setSearchTerm('');
    setDebouncedSearch('');
    setStartDate(today);
    setEndDate(today);
    setPage(1);
  };

  // ── Summary stats ───────────────────────────────────────────
  const stats = useMemo(() => {
    const clockIn = records.filter(
      (r) =>
        r.status?.toLowerCase().includes('in') ||
        r.status?.toLowerCase() === 'present'
    ).length;
    const clockOut = records.filter((r) => r.status?.toLowerCase().includes('out')).length;
    const absent = records.filter((r) => r.status?.toLowerCase() === 'absent').length;
    const other = records.length - clockIn - clockOut - absent;
    return { clockIn, clockOut, absent, other };
  }, [records]);

  // ── Helper for localized status label ──────────────────────
  const getStatusLabel = (st: string) => {
    const k = st?.toLowerCase() || '';
    if (k === 'clock-in' || k === 'clocked-in') return t('teacherAttendance.clockIn') || 'Clock In';
    if (k === 'clock-out' || k === 'clocked-out') return t('teacherAttendance.clockOut') || 'Clock Out';
    if (k === 'present') return t('common.present') || 'Present';
    if (k === 'absent') return t('common.absent') || 'Absent';
    if (k === 'late') return t('common.late') || 'Late';
    if (k === 'leave') return t('common.leave') || 'Leave';
    if (k === 'excused') return t('teacherAttendance.excused') || 'Excused';
    return st ? st.charAt(0).toUpperCase() + st.slice(1).replace('-', ' ') : (t('teacherAttendance.unknown') || 'Unknown');
  };

  // ── Export CSV ──────────────────────────────────────────────
  const handleExportCSV = () => {
    setExportDropdownOpen(false);
    if (filteredRecords.length === 0) return;
    const headers = [
      '#',
      t('teacherAttendance.teacherDetails') || 'Teacher Name',
      t('teachers.designationTag') || 'Designation',
      t('common.date') || 'Date',
      t('teacherAttendance.clockIn') || 'Clock In',
      t('teacherAttendance.clockOut') || 'Clock Out',
      `${t('teacherAttendance.distance') || 'Distance'} (${t('teachers.meter') || 'm'})`,
      t('common.status') || 'Status'
    ];
    const rows = filteredRecords.map((r, i) => {
      const dateObj = new Date(r.date);
      const formattedDate = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        : r.date || (t('common.na') || 'N/A');

      return [
        ((page - 1) * limit + i + 1).toString(),
        `"${(r.teacher?.name || (t('teacherAttendance.unknown') || 'Unknown')).replace(/"/g, '""')}"`,
        `"${(r.teacher?.designation || (t('common.na') || 'N/A')).replace(/"/g, '""')}"`,
        `"${formattedDate}"`,
        `"${formatTimeTo12h(r.startTime, language)}"`,
        `"${formatTimeTo12h(r.endTime, language)}"`,
        `"${r.distanceFromCenter != null ? r.distanceFromCenter.toFixed(2) : (t('common.na') || 'N/A')}"`,
        `"${getStatusLabel(r.status)}"`,
      ];
    });

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `teacher_attendance_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Export PDF ──────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExportDropdownOpen(false);
    if (filteredRecords.length === 0) return;
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
    doc.text(t('teacherAttendance.reportTitle') || 'Teacher Attendance Report', 14, y);
    y += 7;

    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    let filterText = `${t('teacherAttendance.dateRange') || 'Date Range'}: ${startDate} ${t('teachers.to') || 'to'} ${endDate}`;
    if (debouncedSearch) filterText += ` | ${t('teachers.searchPlaceholder') || 'Search'}: ${debouncedSearch}`;
    if (filterTeacher) {
      const n = teachersData.find((tItem) => tItem.id === filterTeacher)?.name;
      if (n) filterText += ` | ${t('common.teacher') || 'Teacher'}: ${n}`;
    }
    if (filterStatus) filterText += ` | ${t('common.status') || 'Status'}: ${getStatusLabel(filterStatus)}`;
    doc.text(filterText, 14, y);
    y += 7;

    autoTable(doc, {
      head: [[
        '#',
        t('teacherAttendance.teacherDetails') || 'Teacher Name',
        t('teachers.designationTag') || 'Designation',
        t('common.date') || 'Date',
        t('teacherAttendance.clockIn') || 'Clock In',
        t('teacherAttendance.clockOut') || 'Clock Out',
        `${t('teacherAttendance.distance') || 'Distance'} (${t('teachers.meter') || 'm'})`,
        t('common.status') || 'Status'
      ]],
      body: filteredRecords.map((r, i) => {
        const dateObj = new Date(r.date);
        const formattedDate = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          : r.date || (t('common.na') || 'N/A');

        return [
          ((page - 1) * limit + i + 1).toString(),
          r.teacher?.name || (t('teacherAttendance.unknown') || 'Unknown'),
          r.teacher?.designation || (t('common.na') || 'N/A'),
          formattedDate,
          formatTimeTo12h(r.startTime, language),
          formatTimeTo12h(r.endTime, language),
          r.distanceFromCenter != null ? r.distanceFromCenter.toFixed(2) : (t('common.na') || 'N/A'),
          getStatusLabel(r.status),
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
        doc.text(`${t('teachers.page') || 'Page'} ${data.pageNumber} ${t('teachers.of') || 'of'} ${pages}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        doc.text(`${t('teacherAttendance.generated') || 'Generated'}: ${new Date().toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`, 14, doc.internal.pageSize.height - 10);
      },
    });
    doc.save(`teacher_attendance_${startDate}_to_${endDate}.pdf`);
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* ── Stats Strip ─────────────────────────────────────── */}
      {!loading && records.length > 0 && (
        <div
          className="animate-fade-in"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {[
            { label: t('teacherAttendance.totalRecords') || 'Total Records', value: total, color: 'var(--primary)', bg: 'rgba(79,70,229,0.08)' },
            { label: t('teacherAttendance.clockedIn') || 'Clocked In', value: stats.clockIn, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
            { label: t('teacherAttendance.clockedOut') || 'Clocked Out', value: stats.clockOut, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
            { label: t('teacherAttendance.absentOther') || 'Absent / Other', value: stats.absent + stats.other, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
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
                gap: '0.25rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  color: 'var(--muted-foreground)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {s.label}
              </span>
              <span style={{ fontSize: '1.85rem', fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Main Card ───────────────────────────────────────── */}
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
            {/* Search */}
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
                  placeholder={t('teacherAttendance.searchPlaceholder') || "Search by teacher name or designation..."}
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

            {/* Action buttons row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Filters toggle */}
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
                <span>{t('teacherAttendance.filters') || t('common.filters') || 'Filters'}</span>
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
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Export dropdown */}
              <div className="teacher-att-export-dd" style={{ position: 'relative' }}>
                <button
                  className="btn"
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  disabled={filteredRecords.length === 0}
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
                    opacity: filteredRecords.length === 0 ? 0.6 : 1,
                    cursor: filteredRecords.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Download size={16} />
                  <span>{t('common.export') || 'Export'}</span>
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
                      { label: t('teachers.exportCsv') || 'Export as CSV', icon: <FileSpreadsheet size={15} style={{ color: '#10b981' }} />, fn: handleExportCSV },
                      { label: t('teachers.exportPdf') || 'Export as PDF', icon: <FileText size={15} style={{ color: '#ef4444' }} />, fn: handleExportPDF },
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

              {/* Create Attendance button */}
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
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
                <span>{t('teacherAttendance.createAttendance') || 'Create Attendance'}</span>
              </button>

              {/* Refresh button */}
              <button
                className="btn"
                onClick={() => fetchAttendance()}
                title={t('teacherAttendance.refresh') || 'Refresh'}
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

              {/* Page sizer */}
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
                <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{t('teachers.show') || 'Show:'}</span>
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
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

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
                  {t('teachers.clearAll') || 'Clear all'}
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '1rem',
                padding: '1.25rem',
                background: 'var(--background)',
                borderRadius: '0.875rem',
                border: '1px solid var(--border)',
              }}
            >
              {/* Start Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('teacherAttendance.startDate') || 'Start Date'}
                </label>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                />
              </div>

              {/* End Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('teacherAttendance.endDate') || 'End Date'}
                </label>
                <input
                  type="date"
                  className="input"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                />
              </div>

              {/* Specific Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('teacherAttendance.specificDate') || 'Specific Date'}
                </label>
                <input
                  type="date"
                  className="input"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                />
              </div>

              {/* Teacher */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('common.teacher') || 'Teacher'}
                </label>
                <select
                  className="input"
                  value={filterTeacher}
                  onChange={(e) => {
                    setFilterTeacher(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('common.allTeachers') || 'All Teachers'}</option>
                  {teachersData.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name} {tc.designation ? `(${tc.designation})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('common.status') || 'Status'}
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
                  <option value="">{t('common.allStatus') || 'All Statuses'}</option>
                  <option value="clock-in">{t('teacherAttendance.clockIn') || 'Clock In'}</option>
                  <option value="clock-out">{t('teacherAttendance.clockOut') || 'Clock Out'}</option>
                  <option value="present">{t('common.present') || 'Present'}</option>
                  <option value="absent">{t('common.absent') || 'Absent'}</option>
                  <option value="late">{t('common.late') || 'Late'}</option>
                  <option value="leave">{t('common.leave') || 'Leave'}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Table ───────────────────────────────────────── */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                {[
                  { label: '#', w: '52px' },
                  { label: t('teacherAttendance.teacherDetails') || 'Teacher Details' },
                  { label: t('common.date') || 'Date', w: '160px' },
                  { label: t('teacherAttendance.clockIn') || 'Clock In', w: '130px' },
                  { label: t('teacherAttendance.clockOut') || 'Clock Out', w: '130px' },
                  { label: t('teacherAttendance.distance') || 'Distance', w: '130px' },
                  { label: t('common.status') || 'Status', w: '130px' },
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
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={`sk-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* SL */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '20px', margin: 0 }} />
                    </td>
                    {/* Teacher Details */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="shimmer shimmer-circle" style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '140px' }}>
                          <div className="shimmer shimmer-text" />
                          <div className="shimmer shimmer-text short" style={{ margin: 0 }} />
                        </div>
                      </div>
                    </td>
                    {/* Date */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '100px', margin: 0 }} />
                    </td>
                    {/* Clock In */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '80px', margin: 0 }} />
                    </td>
                    {/* Clock Out */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '80px', margin: 0 }} />
                    </td>
                    {/* Distance */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '60px', margin: 0 }} />
                    </td>
                    {/* Status */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-block" style={{ width: '80px', height: '24px', borderRadius: '999px' }} />
                    </td>
                  </tr>
                ))
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => {
                  const sl = (page - 1) * limit + index + 1;

                  // Beautiful date: "Wed, Oct 15, 2026" — single line
                  const dateObj = new Date(record.date);
                  const formattedDate = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                    : record.date || (t('common.na') || 'N/A');

                  const clockIn = formatTimeTo12h(record.startTime, language);
                  const clockOut = formatTimeTo12h(record.endTime, language);

                  return (
                    <tr
                      key={record.id}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* SL */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        {sl}
                      </td>

                      {/* Teacher Details */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              flexShrink: 0,
                              background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(129,140,248,0.2))',
                              border: '1.5px solid var(--border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span style={{ color: 'var(--primary)', fontSize: '1rem', fontWeight: 700 }}>
                              {record.teacher?.name ? record.teacher.name.charAt(0).toUpperCase() : 'T'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.925rem' }}>
                              {record.teacher?.name || (t('teacherAttendance.unknown') || 'Unknown')}
                            </span>
                            {record.teacher?.designation && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                <Briefcase size={12} style={{ flexShrink: 0 }} />
                                <span>{record.teacher.designation}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date — single-line beautiful format */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '0.5rem',
                              flexShrink: 0,
                              background: 'rgba(79,70,229,0.08)',
                              border: '1px solid rgba(79,70,229,0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Calendar size={15} style={{ color: 'var(--primary)' }} />
                          </div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                            {formattedDate}
                          </span>
                        </div>
                      </td>

                      {/* Clock In — AM/PM format */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '0.4rem',
                              flexShrink: 0,
                              background: 'rgba(16,185,129,0.1)',
                              border: '1px solid rgba(16,185,129,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Clock size={13} style={{ color: '#10b981' }} />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                            {clockIn}
                          </span>
                        </div>
                      </td>

                      {/* Clock Out — AM/PM format */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '0.4rem',
                              flexShrink: 0,
                              background: clockOut !== '—' ? 'rgba(59,130,246,0.1)' : 'rgba(107,114,128,0.08)',
                              border: `1px solid ${clockOut !== '—' ? 'rgba(59,130,246,0.2)' : 'rgba(107,114,128,0.15)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Clock size={13} style={{ color: clockOut !== '—' ? '#3b82f6' : 'var(--muted-foreground)' }} />
                          </div>
                          <span
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: clockOut !== '—' ? 600 : 400,
                              color: clockOut !== '—' ? 'var(--foreground)' : 'var(--muted-foreground)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {clockOut}
                          </span>
                        </div>
                      </td>

                      {/* Distance */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {record.distanceFromCenter != null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPin size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.825rem', color: 'var(--foreground)', fontWeight: 500 }}>
                              {record.distanceFromCenter.toFixed(1)} {t('teachers.meter') || 'm'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <StatusBadge status={record.status} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '4.5rem 1rem' }}>
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
                        <ClipboardList size={28} />
                      </div>
                      <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                        {t('attendance.noRecords') || 'No attendance records found'}
                      </p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                        {activeFiltersCount > 0
                          ? (t('teacherAttendance.tryAdjusting') || 'Try adjusting your search keywords or resetting filters.')
                          : (t('teacherAttendance.noRecordsDateRange') || 'No teacher attendance records exist for the selected date range.')}
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
                          {t('teachers.clearFilters') || 'Clear Filters'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ────────────────────────────────── */}
        {!loading && total > 0 && (
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
              {t('teachers.showing') || 'Showing'} <strong style={{ color: 'var(--foreground)' }}>{((page - 1) * limit) + 1}</strong> {t('teachers.to') || 'to'}{' '}
              <strong style={{ color: 'var(--foreground)' }}>{Math.min(page * limit, total)}</strong> {t('teachers.of') || 'of'}{' '}
              <strong style={{ color: 'var(--foreground)' }}>{total}</strong> {t('teacherAttendance.records') || 'records'}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginRight: '0.5rem' }}>
                {t('teachers.page') || 'Page'} {page} {t('teachers.of') || 'of'} {totalPages}
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
                title={t('teachers.prevPage') || 'Previous page'}
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
                title={t('teachers.nextPage') || 'Next page'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTeacherAttendanceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchAttendance}
        />
      )}
    </div>
  );
}
