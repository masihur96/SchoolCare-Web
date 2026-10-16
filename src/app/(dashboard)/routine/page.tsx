"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, Clock, MapPin, Loader2, BookOpen, User, Filter, CheckSquare,
  FileText, Search, Plus, Download, RefreshCw, X, ChevronDown, ChevronLeft,
  ChevronRight, FileSpreadsheet, Layers, LayoutGrid, Table as TableIcon,
  Trash2, School, GraduationCap
} from 'lucide-react';
import AttendanceModal from '@/components/AttendanceModal';
import HomeworkModal from '@/components/HomeworkModal';
import CreateRoutineModal from '@/components/CreateRoutineModal';
import { useLanguage } from '@/components/language-provider';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

interface ClassEntity {
  id: string;
  name: string;
}

interface SectionEntity {
  id: string;
  name: string;
}

interface SubjectEntity {
  id: string;
  name: string;
  code?: string;
}

interface TeacherEntity {
  id: string;
  name: string;
}

interface SchoolEntity {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  schoolId?: string;
}

interface Routine {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  classEntity: ClassEntity;
  sectionEntity: SectionEntity;
  subjectEntity: SubjectEntity;
  teacherEntity: TeacherEntity;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Convert "HH:MM" to "h:MM AM/PM"
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

const DAY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  monday:    { bg: 'rgba(79, 70, 229, 0.08)',  color: '#4f46e5', border: 'rgba(79, 70, 229, 0.2)' },
  tuesday:   { bg: 'rgba(16, 185, 129, 0.08)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  wednesday: { bg: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
  thursday:  { bg: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  friday:    { bg: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.2)' },
  saturday:  { bg: 'rgba(236, 72, 153, 0.08)', color: '#ec4899', border: 'rgba(236, 72, 153, 0.2)' },
  sunday:    { bg: 'rgba(107, 114, 128, 0.08)', color: '#6b7280', border: 'rgba(107, 114, 128, 0.2)' },
};

export default function RoutinePage() {
  const { t, language } = useLanguage();

  const getDayLabel = useCallback((day: string) => {
    const key = day?.toLowerCase() || '';
    if (key === 'monday') return t('routine.day.monday') || 'Monday';
    if (key === 'tuesday') return t('routine.day.tuesday') || 'Tuesday';
    if (key === 'wednesday') return t('routine.day.wednesday') || 'Wednesday';
    if (key === 'thursday') return t('routine.day.thursday') || 'Thursday';
    if (key === 'friday') return t('routine.day.friday') || 'Friday';
    if (key === 'saturday') return t('routine.day.saturday') || 'Saturday';
    if (key === 'sunday') return t('routine.day.sunday') || 'Sunday';
    return day;
  }, [t]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolEntity | null>(null);
  const [loading, setLoading] = useState(true);

  // Available filter sources
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string; sections: { id: string; name: string }[] }[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<{ id: string; name: string }[]>([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // View Mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Pagination for table view
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Modals state
  const [activeAttendanceRoutine, setActiveAttendanceRoutine] = useState<Routine | null>(null);
  const [activeHomeworkRoutine, setActiveHomeworkRoutine] = useState<Routine | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
      if (!(e.target as HTMLElement).closest('.routine-export-dd')) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [exportDropdownOpen]);

  const fetchRoutines = useCallback(async () => {
    if (!userSchoolId) return;
    setLoading(true);
    try {
      const headers = {
        accept: '*/*',
        Authorization: `Bearer ${getApiToken()}`,
      };

      const [routineRes, schoolRes] = await Promise.all([
        fetch(`${API_BASE_URL}/general/routine?schoolId=${userSchoolId}`, { headers }),
        fetch(`${API_BASE_URL}/admin/schools`, { headers }),
      ]);

      const json = await routineRes.json();
      const schoolsJson = await schoolRes.json();

      let fetchedRoutines: Routine[] = [];
      if (json.data && Array.isArray(json.data)) {
        fetchedRoutines = json.data;
      } else if (Array.isArray(json)) {
        fetchedRoutines = json;
      }

      setRoutines(fetchedRoutines);

      const schools: SchoolEntity[] = Array.isArray(schoolsJson) ? schoolsJson : schoolsJson.data || [];
      const userSchool = schools.find((s) => s.schoolId === userSchoolId || s.id === userSchoolId);
      if (userSchool) setSchoolInfo(userSchool);

      // Extract unique classes, sections, and teachers
      const classMap = new Map<string, { id: string; name: string; sections: Map<string, { id: string; name: string }> }>();
      const teacherMap = new Map<string, { id: string; name: string }>();

      fetchedRoutines.forEach((r) => {
        if (r.classEntity && r.sectionEntity) {
          if (!classMap.has(r.classEntity.id)) {
            classMap.set(r.classEntity.id, {
              id: r.classEntity.id,
              name: r.classEntity.name,
              sections: new Map(),
            });
          }
          const classEntry = classMap.get(r.classEntity.id)!;
          if (!classEntry.sections.has(r.sectionEntity.id)) {
            classEntry.sections.set(r.sectionEntity.id, {
              id: r.sectionEntity.id,
              name: r.sectionEntity.name,
            });
          }
        }

        if (r.teacherEntity && !teacherMap.has(r.teacherEntity.id)) {
          teacherMap.set(r.teacherEntity.id, {
            id: r.teacherEntity.id,
            name: r.teacherEntity.name,
          });
        }
      });

      const parsedClasses = Array.from(classMap.values())
        .map((c) => ({
          id: c.id,
          name: c.name,
          sections: Array.from(c.sections.values()),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const parsedTeachers = Array.from(teacherMap.values()).sort((a, b) => a.name.localeCompare(b.name));

      setAvailableClasses(parsedClasses);
      setAvailableTeachers(parsedTeachers);
    } catch (error) {
      console.error('Failed to fetch routines:', error);
    } finally {
      setLoading(false);
    }
  }, [userSchoolId]);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(e.target.value);
    setSelectedSectionId('');
    setPage(1);
  };

  const selectedClassObj = availableClasses.find((c) => c.id === selectedClassId);
  const availableSections = selectedClassObj ? selectedClassObj.sections : [];

  // Filtered routines based on search, day, class, section, teacher
  const filteredRoutines = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    return routines.filter((r) => {
      const matchSearch =
        !term ||
        r.subjectEntity?.name?.toLowerCase().includes(term) ||
        r.subjectEntity?.code?.toLowerCase().includes(term) ||
        r.classEntity?.name?.toLowerCase().includes(term) ||
        r.sectionEntity?.name?.toLowerCase().includes(term) ||
        r.teacherEntity?.name?.toLowerCase().includes(term) ||
        r.roomNumber?.toLowerCase().includes(term) ||
        r.day?.toLowerCase().includes(term);

      const matchDay = selectedDay ? r.day?.toLowerCase() === selectedDay.toLowerCase() : true;
      const matchClass = selectedClassId ? r.classEntity?.id === selectedClassId : true;
      const matchSection = selectedSectionId ? r.sectionEntity?.id === selectedSectionId : true;
      const matchTeacher = selectedTeacherId ? r.teacherEntity?.id === selectedTeacherId : true;

      return matchSearch && matchDay && matchClass && matchSection && matchTeacher;
    });
  }, [routines, debouncedSearch, selectedDay, selectedClassId, selectedSectionId, selectedTeacherId]);

  // Group by day for Grid View
  const routinesByDay = useMemo(() => {
    return DAYS_OF_WEEK.reduce((acc, day) => {
      acc[day] = filteredRoutines
        .filter((r) => r.day?.toLowerCase() === day.toLowerCase())
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      return acc;
    }, {} as Record<string, Routine[]>);
  }, [filteredRoutines]);

  // Pagination calculations
  const total = filteredRoutines.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedRoutines = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredRoutines.slice(start, start + limit);
  }, [filteredRoutines, page, limit]);

  const activeFiltersCount =
    (debouncedSearch ? 1 : 0) +
    (selectedDay ? 1 : 0) +
    (selectedClassId ? 1 : 0) +
    (selectedSectionId ? 1 : 0) +
    (selectedTeacherId ? 1 : 0);

  const resetAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedDay('');
    setSelectedClassId('');
    setSelectedSectionId('');
    setSelectedTeacherId('');
    setPage(1);
  };

  // Metrics summary
  const summaryMetrics = useMemo(() => {
    const totalSlots = routines.length;
    const uniqueClasses = new Set(routines.map((r) => r.classEntity?.id).filter(Boolean)).size;
    const uniqueTeachers = new Set(routines.map((r) => r.teacherEntity?.id).filter(Boolean)).size;
    const uniqueSubjects = new Set(routines.map((r) => r.subjectEntity?.name).filter(Boolean)).size;
    return { totalSlots, uniqueClasses, uniqueTeachers, uniqueSubjects };
  }, [routines]);

  // Delete Routine Handler
  const handleDeleteRoutine = async (routineId: string) => {
    if (!confirm(t('routine.deleteConfirm') || 'Are you sure you want to remove this routine slot?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/general/routine/${routineId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getApiToken()}` },
      });
      if (res.ok) {
        fetchRoutines();
      } else {
        alert(t('routine.createFailed') || 'Failed to delete routine slot.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting routine slot.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    setExportDropdownOpen(false);
    if (filteredRoutines.length === 0) return;
    const headers = [
      '#',
      t('routine.day') || 'Day',
      t('teacherAttendance.startTime') || 'Start Time',
      t('teacherAttendance.endTime') || 'End Time',
      t('common.subject') || 'Subject',
      t('classes.subjectCode') || 'Code',
      t('common.class') || 'Class',
      t('common.section') || 'Section',
      t('common.teacher') || 'Teacher',
      t('routine.room') || 'Room',
    ];
    const rows = filteredRoutines.map((r, i) => [
      (i + 1).toString(),
      `"${getDayLabel(r.day)}"`,
      formatTimeTo12h(r.startTime, language),
      formatTimeTo12h(r.endTime, language),
      `"${(r.subjectEntity?.name || '').replace(/"/g, '""')}"`,
      `"${r.subjectEntity?.code || ''}"`,
      `"${r.classEntity?.name || ''}"`,
      `"${r.sectionEntity?.name || ''}"`,
      `"${(r.teacherEntity?.name || '').replace(/"/g, '""')}"`,
      `"${r.roomNumber || ''}"`,
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'class_routine.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF
  const handleExportPDF = () => {
    setExportDropdownOpen(false);
    if (filteredRoutines.length === 0) return;
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
    doc.text(t('routine.reportTitle') || 'Class Routine & Timetable Schedule', 14, y);
    y += 7;

    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const filterParts: string[] = [];
    if (selectedClassId) {
      const cls = availableClasses.find((c) => c.id === selectedClassId)?.name;
      if (cls) filterParts.push(`${t('common.class') || 'Class'}: ${cls}`);
    }
    if (selectedSectionId) {
      const sec = availableSections.find((s) => s.id === selectedSectionId)?.name;
      if (sec) filterParts.push(`${t('common.section') || 'Section'}: ${sec}`);
    }
    if (selectedTeacherId) {
      const tName = availableTeachers.find((tc) => tc.id === selectedTeacherId)?.name;
      if (tName) filterParts.push(`${t('common.teacher') || 'Teacher'}: ${tName}`);
    }
    if (selectedDay) filterParts.push(`${t('routine.day') || 'Day'}: ${getDayLabel(selectedDay)}`);
    if (filterParts.length > 0) {
      doc.text(filterParts.join(' | '), 14, y);
      y += 7;
    }

    autoTable(doc, {
      head: [[
        '#',
        t('routine.day') || 'Day',
        t('attendance.time') || 'Time',
        t('common.subject') || 'Subject',
        t('common.class') || 'Class',
        t('common.section') || 'Section',
        t('common.teacher') || 'Teacher',
        t('routine.room') || 'Room',
      ]],
      body: filteredRoutines.map((r, i) => [
        (i + 1).toString(),
        getDayLabel(r.day),
        `${formatTimeTo12h(r.startTime, language)} – ${formatTimeTo12h(r.endTime, language)}`,
        r.subjectEntity?.code ? `${r.subjectEntity.name} (${r.subjectEntity.code})` : r.subjectEntity?.name || (t('common.na') || '—'),
        r.classEntity?.name || (t('common.na') || '—'),
        r.sectionEntity?.name || (t('common.na') || '—'),
        r.teacherEntity?.name || (t('routine.unassigned') || '—'),
        r.roomNumber || (t('routine.tba') || 'TBA'),
      ]),
      startY: y,
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      didDrawPage: (data) => {
        const pages = (doc.internal as any).getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`${t('students.page') || 'Page'} ${data.pageNumber} ${t('students.of') || 'of'} ${pages}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        doc.text(`${t('attendance.generated') || 'Generated'}: ${new Date().toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`, 14, doc.internal.pageSize.height - 10);
      },
    });
    doc.save('class_routine_schedule.pdf');
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* ── Stats Strip ─────────────────────────────────────── */}
      {!loading && routines.length > 0 && (
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
            { label: t('routine.weeklyPeriods') || 'Weekly Periods', value: language === 'bn' ? String(summaryMetrics.totalSlots).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : summaryMetrics.totalSlots, color: 'var(--primary)', icon: <Calendar size={16} /> },
            { label: t('routine.activeClasses') || 'Active Classes', value: language === 'bn' ? String(summaryMetrics.uniqueClasses).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : summaryMetrics.uniqueClasses, color: '#10b981', icon: <School size={16} /> },
            { label: t('routine.assignedTeachers') || 'Assigned Teachers', value: language === 'bn' ? String(summaryMetrics.uniqueTeachers).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : summaryMetrics.uniqueTeachers, color: '#3b82f6', icon: <User size={16} /> },
            { label: t('routine.subjectsTaught') || 'Subjects Taught', value: language === 'bn' ? String(summaryMetrics.uniqueSubjects).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : summaryMetrics.uniqueSubjects, color: '#8b5cf6', icon: <BookOpen size={16} /> },
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
                  placeholder={t('routine.searchPlaceholder') || 'Search subject, class, teacher, or room...'}
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
              {/* View Switcher: Table vs Timetable Cards */}
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
                  title={t('routine.tableView') || 'Table List View'}
                >
                  <TableIcon size={15} />
                  <span>{t('routine.table') || 'Table'}</span>
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
                  title={t('routine.timetableCards') || 'Weekly Timetable Cards View'}
                >
                  <LayoutGrid size={15} />
                  <span>{t('routine.timetable') || 'Timetable'}</span>
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
                <span>{t('routine.filters') || 'Filters'}</span>
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
                    {language === 'bn' ? String(activeFiltersCount).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Export Dropdown */}
              <div className="routine-export-dd" style={{ position: 'relative' }}>
                <button
                  className="btn"
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  disabled={filteredRoutines.length === 0}
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
                    opacity: filteredRoutines.length === 0 ? 0.6 : 1,
                    cursor: filteredRoutines.length === 0 ? 'not-allowed' : 'pointer',
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
                      { label: t('routine.exportCsv') || 'Export as CSV', icon: <FileSpreadsheet size={15} style={{ color: '#10b981' }} />, fn: handleExportCSV },
                      { label: t('routine.exportPdf') || 'Export as PDF', icon: <FileText size={15} style={{ color: '#ef4444' }} />, fn: handleExportPDF },
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

              {/* Create Routine Button */}
              <button
                className="btn btn-primary"
                onClick={() => setIsCreateModalOpen(true)}
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
                <span>{t('routine.createRoutine') || 'Create Routine'}</span>
              </button>

              {/* Refresh Button */}
              <button
                className="btn"
                onClick={fetchRoutines}
                title={t('routine.refresh') || 'Refresh'}
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
                  <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{t('routine.show') || 'Show:'}</span>
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
                    <option value={10}>{language === 'bn' ? '১০' : '10'}</option>
                    <option value={15}>{language === 'bn' ? '১৫' : '15'}</option>
                    <option value={30}>{language === 'bn' ? '৩০' : '30'}</option>
                    <option value={50}>{language === 'bn' ? '৫০' : '50'}</option>
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
                  {t('routine.clearAll') || 'Clear all'}
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                padding: '1.25rem',
                background: 'var(--background)',
                borderRadius: '0.875rem',
                border: '1px solid var(--border)',
              }}
            >
              {/* Day Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('routine.dayOfWeek') || 'Day of Week'}
                </label>
                <select
                  className="input"
                  value={selectedDay}
                  onChange={(e) => {
                    setSelectedDay(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('routine.allDays') || 'All Days'}</option>
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>{getDayLabel(d)}</option>
                  ))}
                </select>
              </div>

              {/* Class Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('common.class') || 'Class'}
                </label>
                <select
                  className="input"
                  value={selectedClassId}
                  onChange={handleClassChange}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('common.allClasses') || 'All Classes'}</option>
                  {availableClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Section Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('common.section') || 'Section'}
                </label>
                <select
                  className="input"
                  value={selectedSectionId}
                  onChange={(e) => {
                    setSelectedSectionId(e.target.value);
                    setPage(1);
                  }}
                  disabled={!selectedClassId || availableSections.length === 0}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('common.allSections') || 'All Sections'}</option>
                  {availableSections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Teacher Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('common.teacher') || 'Teacher'}
                </label>
                <select
                  className="input"
                  value={selectedTeacherId}
                  onChange={(e) => {
                    setSelectedTeacherId(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('common.allTeachers') || 'All Teachers'}</option>
                  {availableTeachers.map((tc) => (
                    <option key={tc.id} value={tc.id}>{tc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Table View ────────────────────────────────────────── */}
        {viewMode === 'table' ? (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  {[
                    { label: '#', w: '52px' },
                    { label: t('routine.subjectAndCode') || 'Subject & Code' },
                    { label: t('routine.day') || 'Day', w: '130px' },
                    { label: t('routine.time') || 'Time', w: '190px' },
                    { label: t('routine.classAndSection') || 'Class & Section' },
                    { label: t('common.teacher') || 'Teacher' },
                    { label: t('routine.room') || 'Room', w: '110px' },
                    { label: t('common.actions') || 'Actions', w: '170px', align: 'right' as const },
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
                  Array.from({ length: 7 }).map((_, i) => (
                    <tr key={`sk-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="shimmer shimmer-text" style={{ width: '20px', margin: 0 }} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="shimmer shimmer-block" style={{ width: '38px', height: '38px', borderRadius: '0.6rem' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '120px' }}>
                            <div className="shimmer shimmer-text" />
                            <div className="shimmer shimmer-text short" style={{ margin: 0 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="shimmer shimmer-block" style={{ width: '70px', height: '24px', borderRadius: '999px' }} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="shimmer shimmer-text" style={{ width: '130px', margin: 0 }} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100px' }}>
                          <div className="shimmer shimmer-text" />
                          <div className="shimmer shimmer-text short" style={{ margin: 0 }} />
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="shimmer shimmer-text" style={{ width: '100px', margin: 0 }} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="shimmer shimmer-text" style={{ width: '50px', margin: 0 }} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }} />
                          <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }} />
                          <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : paginatedRoutines.length > 0 ? (
                  paginatedRoutines.map((routine, index) => {
                    const sl = (page - 1) * limit + index + 1;
                    const dayKey = routine.day?.toLowerCase() || '';
                    const dayStyle = DAY_COLORS[dayKey] ?? { bg: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', border: 'rgba(79, 70, 229, 0.2)' };

                    return (
                      <tr
                        key={routine.id}
                        style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* SL */}
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                          {language === 'bn' ? String(sl).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : sl}
                        </td>

                        {/* Subject */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
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
                              <BookOpen size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--foreground)' }}>
                                {routine.subjectEntity?.name || t('routine.subjectUnknown') || 'Subject Unknown'}
                              </span>
                              {routine.subjectEntity?.code && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '0.725rem',
                                    fontWeight: 700,
                                    fontFamily: 'monospace',
                                    color: 'var(--primary)',
                                  }}
                                >
                                  {routine.subjectEntity.code}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Day */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: dayStyle.bg,
                              color: dayStyle.color,
                              border: `1px solid ${dayStyle.border}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {getDayLabel(routine.day)}
                          </span>
                        </td>

                        {/* Time */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '0.4rem',
                                flexShrink: 0,
                                background: 'rgba(245,158,11,0.1)',
                                border: '1px solid rgba(245,158,11,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Clock size={13} style={{ color: '#f59e0b' }} />
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                              {formatTimeTo12h(routine.startTime, language)} – {formatTimeTo12h(routine.endTime, language)}
                            </span>
                          </div>
                        </td>

                        {/* Class & Section */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                              <School size={13} style={{ color: 'var(--primary)' }} />
                              <span>{routine.classEntity?.name || (t('common.na') || 'N/A')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                              <Layers size={12} />
                              <span>{t('routine.sec') || 'Sec'}: {routine.sectionEntity?.name || (t('common.na') || 'N/A')}</span>
                            </div>
                          </div>
                        </td>

                        {/* Teacher */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', color: 'var(--foreground)' }}>
                            <User size={13} style={{ color: 'var(--muted-foreground)' }} />
                            <span style={{ fontWeight: 500 }}>{routine.teacherEntity?.name || t('routine.unassigned') || 'Unassigned'}</span>
                          </div>
                        </td>

                        {/* Room */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: 'var(--muted-foreground)' }}>
                            <MapPin size={13} />
                            <span>{routine.roomNumber ? (language === 'bn' ? String(routine.roomNumber).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : routine.roomNumber) : (t('routine.tba') || 'TBA')}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              className="action-btn"
                              title={t('routine.takeAttendance') || 'Take Attendance'}
                              onClick={() => setActiveAttendanceRoutine(routine)}
                              style={{
                                padding: '0.35rem 0.6rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                background: 'rgba(16, 185, 129, 0.08)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer',
                                color: '#10b981',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              <CheckSquare size={13} />
                              <span>{t('routine.attShort') || 'Att'}</span>
                            </button>
                            <button
                              className="action-btn"
                              title={t('routine.assignHomework') || 'Assign / View Homework'}
                              onClick={() => setActiveHomeworkRoutine(routine)}
                              style={{
                                padding: '0.35rem 0.6rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(79, 70, 229, 0.25)',
                                background: 'rgba(79, 70, 229, 0.08)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer',
                                color: 'var(--primary)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              <FileText size={13} />
                              <span>{t('routine.hwShort') || 'HW'}</span>
                            </button>
                            <button
                              className="action-btn"
                              title={t('routine.deleteSlot') || 'Remove Routine Slot'}
                              onClick={() => handleDeleteRoutine(routine.id)}
                              style={{
                                width: '30px',
                                height: '30px',
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
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '4.5rem 1rem' }}>
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
                          <Calendar size={28} />
                        </div>
                        <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                          {t('routine.noRoutine') || 'No routine blocks found'}
                        </p>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                          {activeFiltersCount > 0
                            ? (t('routine.tryAdjusting') || 'Try adjusting your search query or reset your filters.')
                            : (t('routine.noRoutinesYet') || 'No routines have been scheduled yet. Click "Create Routine" to begin.')}
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
                            {t('routine.clearFilters') || 'Clear Filters'}
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
          /* ── Timetable Grid / Schedule View ────────────────────── */
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {Array.from({ length: 2 }).map((_, dayIdx) => (
                  <div key={`sk-grid-${dayIdx}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '120px', height: '24px', margin: 0 }} />
                      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                      {Array.from({ length: 3 }).map((_, cIdx) => (
                        <div key={cIdx} className="glass-card" style={{ padding: '1.25rem', borderRadius: '0.875rem', border: '1px solid var(--border)', height: '160px' }}>
                          <div className="shimmer shimmer-text" style={{ width: '60%', height: '18px' }} />
                          <div className="shimmer shimmer-text" style={{ width: '40%', height: '14px', marginTop: '0.5rem' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredRoutines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4.5rem 1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', maxWidth: '380px', margin: '0 auto' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
                    <Calendar size={28} />
                  </div>
                  <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                    {t('routine.noRoutine') || 'No routine blocks found'}
                  </p>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0 }}>
                    {activeFiltersCount > 0
                      ? (t('routine.tryClearingFilters') || 'Try clearing your filters.')
                      : (t('routine.clickToCreate') || 'Click "Create Routine" to add timetable periods.')}
                  </p>
                </div>
              </div>
            ) : (
              DAYS_OF_WEEK.map((day) => {
                const dayRoutines = routinesByDay[day] || [];
                if (dayRoutines.length === 0) return null;
                const dayKey = day.toLowerCase();
                const dayStyle = DAY_COLORS[dayKey] ?? { bg: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', border: 'rgba(79, 70, 229, 0.2)' };

                return (
                  <div key={day} className="day-section">
                    {/* Day Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 800,
                          padding: '0.3rem 0.85rem',
                          borderRadius: '999px',
                          background: dayStyle.bg,
                          color: dayStyle.color,
                          border: `1px solid ${dayStyle.border}`,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {getDayLabel(day)}
                      </span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        {language === 'bn' ? String(dayRoutines.length).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : dayRoutines.length}{' '}
                        {dayRoutines.length === 1 ? (t('routine.period') || 'period') : (t('routine.periods') || 'periods')}
                      </span>
                    </div>

                    {/* Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
                      {dayRoutines.map((routine) => (
                        <div
                          key={routine.id}
                          className="glass-card"
                          style={{
                            borderRadius: '0.875rem',
                            border: '1px solid var(--border)',
                            background: 'var(--card)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px -6px rgba(0,0,0,0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)';
                          }}
                        >
                          <div style={{ height: '3px', background: dayStyle.color }} />

                          <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                            {/* Title & Code */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <div>
                                <h5 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                                  {routine.subjectEntity?.name || t('routine.subjectUnknown') || 'Subject Unknown'}
                                </h5>
                                <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <School size={12} />
                                  <span>{routine.classEntity?.name || (t('common.na') || '—')}</span>
                                  {routine.sectionEntity?.name && <span>• {t('routine.sec') || 'Sec'} {routine.sectionEntity.name}</span>}
                                </div>
                              </div>
                              {routine.subjectEntity?.code && (
                                <span
                                  style={{
                                    fontSize: '0.725rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '0.35rem',
                                    background: 'var(--background)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--primary)',
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {routine.subjectEntity.code}
                                </span>
                              )}
                            </div>

                            {/* Time & Room block */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.4rem',
                                padding: '0.75rem',
                                background: 'var(--background)',
                                borderRadius: '0.6rem',
                                border: '1px solid var(--border)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>
                                <Clock size={13} style={{ color: '#f59e0b' }} />
                                <span>
                                  {formatTimeTo12h(routine.startTime, language)} – {formatTimeTo12h(routine.endTime, language)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                <User size={13} />
                                <span>{routine.teacherEntity?.name || t('routine.unassigned') || 'Unassigned'}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                <MapPin size={13} />
                                <span>
                                  {routine.roomNumber
                                    ? `${t('routine.room') || 'Room'} ${language === 'bn' ? String(routine.roomNumber).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : routine.roomNumber}`
                                    : (t('routine.roomTba') || 'Room TBA')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div style={{ display: 'flex', borderTop: '1px solid var(--border)', background: 'var(--background)' }}>
                            <button
                              onClick={() => setActiveAttendanceRoutine(routine)}
                              style={{
                                flex: 1,
                                padding: '0.65rem 0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.35rem',
                                border: 'none',
                                borderRight: '1px solid var(--border)',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: '#10b981',
                              }}
                            >
                              <CheckSquare size={14} />
                              <span>{t('routine.attendance') || 'Attendance'}</span>
                            </button>
                            <button
                              onClick={() => setActiveHomeworkRoutine(routine)}
                              style={{
                                flex: 1,
                                padding: '0.65rem 0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.35rem',
                                border: 'none',
                                borderRight: '1px solid var(--border)',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--primary)',
                              }}
                            >
                              <FileText size={14} />
                              <span>{t('routine.homework') || 'Homework'}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteRoutine(routine.id)}
                              title={t('routine.deleteSlot') || 'Delete routine slot'}
                              style={{
                                padding: '0.65rem 0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: '#ef4444',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
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
              {t('attendance.showing') || 'Showing'}{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {language === 'bn' ? String(((page - 1) * limit) + 1).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : ((page - 1) * limit) + 1}
              </strong>{' '}
              {t('attendance.to') || 'to'}{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {language === 'bn' ? String(Math.min(page * limit, total)).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : Math.min(page * limit, total)}
              </strong>{' '}
              {t('attendance.of') || 'of'}{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {language === 'bn' ? String(total).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : total}
              </strong>{' '}
              {t('routine.routineSlots') || 'routine slots'}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginRight: '0.5rem' }}>
                {t('attendance.page') || 'Page'}{' '}
                {language === 'bn' ? String(page).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : page}{' '}
                {t('attendance.of') || 'of'}{' '}
                {language === 'bn' ? String(totalPages).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : totalPages}
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
                title={t('attendance.prevPage') || 'Previous page'}
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
                title={t('attendance.nextPage') || 'Next page'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Attendance Modal ──────────────────────────────────── */}
      {activeAttendanceRoutine && (
        <AttendanceModal
          routine={activeAttendanceRoutine}
          onClose={() => setActiveAttendanceRoutine(null)}
        />
      )}

      {/* ── Homework Modal ────────────────────────────────────── */}
      {activeHomeworkRoutine && (
        <HomeworkModal
          routine={activeHomeworkRoutine}
          onClose={() => setActiveHomeworkRoutine(null)}
        />
      )}

      {/* ── Create Routine Modal ──────────────────────────────── */}
      {isCreateModalOpen && (
        <CreateRoutineModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchRoutines();
          }}
        />
      )}
    </div>
  );
}
