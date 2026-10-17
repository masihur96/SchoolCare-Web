"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  BookOpen, Filter, Loader2, FileText, Calendar,
  AlertCircle, RefreshCw, Clock, User,
  CheckCircle2, BookMarked, Search,
  Plus, Edit3, Trash2, Eye, Download, ChevronDown,
  ChevronLeft, ChevronRight, FileSpreadsheet,
  AlertTriangle, X, Check, School, Layers, LayoutGrid
} from 'lucide-react';
import { getPdfTools } from '@/lib/pdf';

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

interface ClassOption {
  id: string;
  name: string;
  schoolId?: string;
  sections?: { id: string; name: string }[];
}

interface SectionOption {
  id: string;
  name: string;
  classId?: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code?: string;
}

interface TeacherOption {
  id: string;
  name: string;
  email?: string;
}

interface HomeworkRecord {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  schoolId?: string;
  createdAt?: string;
  classEntity?: { id: string; name: string };
  sectionEntity?: { id: string; name: string };
  subjectEntity?: { id: string; name: string; code?: string };
  teacherEntity?: { id: string; name: string; email?: string };
  studentId?: string;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; color: string; border: string; dot: string; label: string }
> = {
  Assigned: {
    bg: 'rgba(99, 102, 241, 0.08)',
    color: '#6366f1',
    border: 'rgba(99, 102, 241, 0.25)',
    dot: '#6366f1',
    label: 'Assigned',
  },
  Pending: {
    bg: 'rgba(245, 158, 11, 0.08)',
    color: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.25)',
    dot: '#f59e0b',
    label: 'Pending',
  },
  Completed: {
    bg: 'rgba(16, 185, 129, 0.08)',
    color: '#10b981',
    border: 'rgba(16, 185, 129, 0.25)',
    dot: '#10b981',
    label: 'Completed',
  },
  Late: {
    bg: 'rgba(239, 68, 68, 0.08)',
    color: '#ef4444',
    border: 'rgba(239, 68, 68, 0.25)',
    dot: '#ef4444',
    label: 'Late / Overdue',
  },
};

export default function HomeworkPage() {
  const { t, language } = useLanguage();

  const getStatusInfo = useCallback((statusKey: string) => {
    const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.Assigned;
    let label = config.label;
    if (statusKey === 'Assigned') label = t('homework.statusAssigned') || 'Assigned';
    else if (statusKey === 'Pending') label = t('homework.statusPending') || 'Pending';
    else if (statusKey === 'Completed') label = t('homework.statusCompleted') || 'Completed';
    else if (statusKey === 'Late') label = t('homework.statusLate') || 'Late / Overdue';
    return { ...config, label };
  }, [t]);

  // Core Data States
  const [homeworks, setHomeworks] = useState<HomeworkRecord[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]);
  const [availableSections, setAvailableSections] = useState<SectionOption[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<TeacherOption[]>([]);

  // Loading & Error States
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // View Mode & Pagination
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Export Menu
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'create' | 'edit'>('create');
  const [editingHomeworkId, setEditingHomeworkId] = useState<string | null>(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignForm, setAssignForm] = useState({
    title: '',
    description: '',
    classId: '',
    sectionId: '',
    subjectId: '',
    teacherId: '',
    dueDate: '',
    status: 'Assigned',
  });

  // Details Modal
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; homework: HomeworkRecord | null }>({
    open: false,
    homework: null,
  });

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; title: string }>({
    open: false,
    id: '',
    title: '',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Close export menu when clicking outside
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

  // Toast Auto-Dismiss
  useEffect(() => {
    if (successToast) {
      const tId = setTimeout(() => setSuccessToast(''), 4000);
      return () => clearTimeout(tId);
    }
  }, [successToast]);

  // Fetch Metadata (Classes, Sections, Subjects, Teachers)
  useEffect(() => {
    let cancelled = false;

    const fetchMetadata = async () => {
      const schoolId = getUserSchoolId();
      if (!schoolId) return;

      setLoadingMeta(true);
      try {
        const headers = {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        };

        const [clsRes, secRes, subRes, tchRes, routineRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/admin/classes`, { headers }),
          fetch(`${API_BASE_URL}/admin/sections?schoolId=${schoolId}`, { headers }),
          fetch(`${API_BASE_URL}/admin/subjects?schoolId=${schoolId}`, { headers }),
          fetch(`${API_BASE_URL}/admin/users?role=teacher&schoolId=${schoolId}&limit=1000`, { headers }),
          fetch(`${API_BASE_URL}/general/routine?schoolId=${schoolId}`, { headers }),
        ]);

        if (cancelled) return;

        const classMap = new Map<string, ClassOption>();
        const sectionList: SectionOption[] = [];
        const subjectMap = new Map<string, SubjectOption>();
        const teacherMap = new Map<string, TeacherOption>();

        // 1. Classes
        if (clsRes.status === 'fulfilled' && clsRes.value.ok) {
          const json = await clsRes.value.json();
          const list = Array.isArray(json) ? json : json.data || [];
          list.forEach((c: { id?: string; name?: string; schoolId?: string }) => {
            if (c?.id && c?.name) {
              classMap.set(c.id, {
                id: c.id,
                name: c.name,
                schoolId: c.schoolId,
                sections: [],
              });
            }
          });
        }

        // 2. Sections
        if (secRes.status === 'fulfilled' && secRes.value.ok) {
          const json = await secRes.value.json();
          const list = Array.isArray(json) ? json : json.data || [];
          list.forEach((s: { id?: string; name?: string; classId?: string }) => {
            if (s?.id && s?.name) {
              sectionList.push({ id: s.id, name: s.name, classId: s.classId });
              if (s.classId && classMap.has(s.classId)) {
                const cls = classMap.get(s.classId)!;
                if (!cls.sections?.some(sec => sec.id === s.id)) {
                  cls.sections?.push({ id: s.id, name: s.name });
                }
              }
            }
          });
        }

        // 3. Subjects
        if (subRes.status === 'fulfilled' && subRes.value.ok) {
          const json = await subRes.value.json();
          const list = Array.isArray(json) ? json : json.data || [];
          list.forEach((sub: { id?: string; name?: string; code?: string }) => {
            if (sub?.id && sub?.name) {
              subjectMap.set(sub.id, {
                id: sub.id,
                name: sub.name,
                code: sub.code,
              });
            }
          });
        }

        // 4. Teachers
        if (tchRes.status === 'fulfilled' && tchRes.value.ok) {
          const json = await tchRes.value.json();
          const list = json.data?.data || json.data || (Array.isArray(json) ? json : []);
          list.forEach((tch: { id?: string; name?: string; email?: string }) => {
            if (tch?.id && tch?.name) {
              teacherMap.set(tch.id, {
                id: tch.id,
                name: tch.name,
                email: tch.email,
              });
            }
          });
        }

        // 5. Routine (Fallback & Supplemental enrichment)
        if (routineRes.status === 'fulfilled' && routineRes.value.ok) {
          const json = await routineRes.value.json();
          const routines: Array<{
            classEntity?: { id: string; name: string };
            sectionEntity?: { id: string; name: string };
            subjectEntity?: { id: string; name: string; code?: string };
            teacherEntity?: { id: string; name: string; email?: string };
          }> = json.data && Array.isArray(json.data)
            ? json.data
            : Array.isArray(json) ? json : [];

          routines.forEach((r) => {
            if (r.classEntity?.id && r.classEntity?.name) {
              if (!classMap.has(r.classEntity.id)) {
                classMap.set(r.classEntity.id, {
                  id: r.classEntity.id,
                  name: r.classEntity.name,
                  sections: [],
                });
              }
              const sec = r.sectionEntity;
              if (sec?.id && sec?.name) {
                const cls = classMap.get(r.classEntity.id)!;
                if (!cls.sections?.some(s => s.id === sec.id)) {
                  cls.sections?.push({ id: sec.id, name: sec.name });
                }
                if (!sectionList.some(s => s.id === sec.id)) {
                  sectionList.push({ id: sec.id, name: sec.name, classId: r.classEntity.id });
                }
              }
            }
            if (r.subjectEntity?.id && r.subjectEntity?.name && !subjectMap.has(r.subjectEntity.id)) {
              subjectMap.set(r.subjectEntity.id, {
                id: r.subjectEntity.id,
                name: r.subjectEntity.name,
                code: r.subjectEntity.code,
              });
            }
            if (r.teacherEntity?.id && r.teacherEntity?.name && !teacherMap.has(r.teacherEntity.id)) {
              teacherMap.set(r.teacherEntity.id, {
                id: r.teacherEntity.id,
                name: r.teacherEntity.name,
                email: r.teacherEntity.email,
              });
            }
          });
        }

        setAvailableClasses(Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        setAvailableSections(sectionList);
        setAvailableSubjects(Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        setAvailableTeachers(Array.from(teacherMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Failed to load homework metadata:', err);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    };

    fetchMetadata();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch Homework Records
  const fetchHomework = useCallback(async () => {
    const schoolId = getUserSchoolId();
    if (!schoolId) {
      setError('Could not resolve school ID from token.');
      return;
    }

    setLoadingHomework(true);
    setError('');

    try {
      const params = new URLSearchParams({ schoolId });
      if (selectedClassId) params.set('classId', selectedClassId);
      if (selectedSectionId) params.set('sectionId', selectedSectionId);
      if (selectedSubjectId) params.set('subjectId', selectedSubjectId);
      if (selectedDate) params.set('date', selectedDate);

      const res = await fetch(`${API_BASE_URL}/admin/homework?${params.toString()}`, {
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        },
      });

      const json = await res.json();
      let records: HomeworkRecord[] = [];
      if (json.data?.data && Array.isArray(json.data.data)) {
        records = json.data.data;
      } else if (json.data && Array.isArray(json.data)) {
        records = json.data;
      } else if (Array.isArray(json)) {
        records = json;
      }

      setHomeworks(records);
    } catch (e) {
      console.error('Failed to fetch homework', e);
      setError('Failed to load homework records. Please try again.');
    } finally {
      setLoadingHomework(false);
    }
  }, [selectedClassId, selectedSectionId, selectedSubjectId, selectedDate]);

  // Initial fetch on mount & filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHomework();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchHomework]);

  // Dynamic sections filtered by selected class
  const activeClassSections = useMemo(() => {
    if (!selectedClassId) return availableSections;
    const found = availableClasses.find(c => c.id === selectedClassId);
    if (found?.sections && found.sections.length > 0) {
      return found.sections;
    }
    return availableSections.filter(s => s.classId === selectedClassId);
  }, [selectedClassId, availableClasses, availableSections]);

  // Dynamic sections for Assign Modal
  const assignClassSections = useMemo(() => {
    if (!assignForm.classId) return [];
    const found = availableClasses.find(c => c.id === assignForm.classId);
    if (found?.sections && found.sections.length > 0) {
      return found.sections;
    }
    return availableSections.filter(s => s.classId === assignForm.classId);
  }, [assignForm.classId, availableClasses, availableSections]);

  // Date Formatting strictly in single line
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const [currentTime] = useState(() => Date.now());

  // Status classifier
  const resolveStatus = useCallback((hw: HomeworkRecord) => {
    if (hw.status === 'Completed') return 'Completed';
    if (hw.status === 'Late') return 'Late';
    if (hw.dueDate) {
      const due = new Date(hw.dueDate);
      due.setHours(23, 59, 59, 999);
      if (due.getTime() < currentTime && hw.status !== 'Completed') {
        return 'Late';
      }
    }
    if (hw.status === 'Pending') return 'Pending';
    return hw.status || 'Assigned';
  }, [currentTime]);

  // Filtered & Searched records
  const filteredHomeworks = useMemo(() => {
    let result = [...homeworks];

    // Status filter
    if (selectedStatus) {
      result = result.filter(hw => resolveStatus(hw) === selectedStatus);
    }

    // Debounced search across title, description, class, section, subject, teacher
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(hw => {
        const titleMatch = hw.title?.toLowerCase().includes(q);
        const descMatch = hw.description?.toLowerCase().includes(q);
        const classMatch = hw.classEntity?.name?.toLowerCase().includes(q);
        const sectionMatch = hw.sectionEntity?.name?.toLowerCase().includes(q);
        const subjectMatch = hw.subjectEntity?.name?.toLowerCase().includes(q);
        const teacherMatch = hw.teacherEntity?.name?.toLowerCase().includes(q);
        return titleMatch || descMatch || classMatch || sectionMatch || subjectMatch || teacherMatch;
      });
    }

    return result;
  }, [homeworks, selectedStatus, debouncedSearch, resolveStatus]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = homeworks.length;
    let assigned = 0;
    let pending = 0;
    let completed = 0;
    let late = 0;

    homeworks.forEach(hw => {
      const st = resolveStatus(hw);
      if (st === 'Completed') completed++;
      else if (st === 'Late') late++;
      else if (st === 'Pending') pending++;
      else assigned++;
    });

    return {
      total,
      assigned: assigned + pending,
      completed,
      late,
      completedPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      activePct: total > 0 ? Math.round(((assigned + pending) / total) * 100) : 0,
      latePct: total > 0 ? Math.round((late / total) * 100) : 0,
    };
  }, [homeworks, resolveStatus]);

  // Pagination slice
  const totalPages = Math.ceil(filteredHomeworks.length / limit) || 1;
  const paginatedHomeworks = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredHomeworks.slice(start, start + limit);
  }, [filteredHomeworks, page, limit]);

  // Active filter count badge
  const activeFiltersCount = [
    selectedClassId,
    selectedSectionId,
    selectedSubjectId,
    selectedStatus,
    selectedDate,
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSelectedClassId('');
    setSelectedSectionId('');
    setSelectedSubjectId('');
    setSelectedStatus('');
    setSelectedDate('');
    setSearchTerm('');
    setPage(1);
  };

  // Open Assign Homework Modal
  const handleOpenAssignModal = (hw?: HomeworkRecord) => {
    if (hw) {
      setAssignMode('edit');
      setEditingHomeworkId(hw.id);
      setAssignForm({
        title: hw.title || '',
        description: hw.description || '',
        classId: hw.classEntity?.id || '',
        sectionId: hw.sectionEntity?.id || '',
        subjectId: hw.subjectEntity?.id || '',
        teacherId: hw.teacherEntity?.id || '',
        dueDate: hw.dueDate ? hw.dueDate.split('T')[0] : '',
        status: hw.status || 'Assigned',
      });
    } else {
      setAssignMode('create');
      setEditingHomeworkId(null);
      // Default due date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const defaultDue = tomorrow.toISOString().split('T')[0];

      setAssignForm({
        title: '',
        description: '',
        classId: selectedClassId || (availableClasses[0]?.id ?? ''),
        sectionId: selectedSectionId || '',
        subjectId: selectedSubjectId || (availableSubjects[0]?.id ?? ''),
        teacherId: availableTeachers[0]?.id ?? '',
        dueDate: defaultDue,
        status: 'Assigned',
      });
    }
    setAssignModalOpen(true);
  };

  // Submit Assign Homework Form
  const handleSaveHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.title.trim() || !assignForm.classId || !assignForm.subjectId || !assignForm.dueDate) {
      setError(t('homework.validationRequired') || 'Please fill in all required fields (Title, Class, Subject, Due Date).');
      return;
    }

    const schoolId = getUserSchoolId();
    if (!schoolId) {
      setError(t('homework.authError') || 'Authentication error: School ID not found.');
      return;
    }

    setAssignSubmitting(true);
    try {
      const payload: Record<string, string | undefined> = {
        id: (assignMode === 'edit' && editingHomeworkId) ? editingHomeworkId : undefined,
        title: assignForm.title.trim(),
        description: assignForm.description.trim(),
        classId: assignForm.classId,
        subjectId: assignForm.subjectId,
        dueDate: assignForm.dueDate,
        status: assignForm.status || 'Assigned',
        schoolId,
        sectionId: assignForm.sectionId || undefined,
        teacherId: assignForm.teacherId || undefined,
      };

      const url = `${API_BASE_URL}/admin/homework`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && (json.statusCode === 200 || json.statusCode === 201 || !json.statusCode)) {
        setSuccessToast(
          assignMode === 'edit'
            ? (t('homework.updatedSuccess') || 'Homework updated successfully!')
            : (t('homework.createdSuccess') || 'New homework assigned successfully!')
        );
        setAssignModalOpen(false);
        fetchHomework();
      } else {
        setError(json.message || (t('homework.failedSave') || 'Failed to save homework.'));
      }
    } catch (err) {
      console.error('Error saving homework:', err);
      setError(t('homework.networkErrorSave') || 'Network error occurred while saving homework.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Delete Homework Handler
  const handleDeleteHomework = async () => {
    if (!deleteModal.id) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/homework/${deleteModal.id}`, {
        method: 'DELETE',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        },
      });

      if (res.ok) {
        setSuccessToast(t('homework.deletedSuccess') || 'Homework deleted successfully.');
        setDeleteModal({ open: false, id: '', title: '' });
        setHomeworks(prev => prev.filter(h => h.id !== deleteModal.id));
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.message || (t('homework.failedDelete') || 'Failed to delete homework.'));
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(t('homework.networkErrorDelete') || 'Network error occurred while deleting homework.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredHomeworks.length === 0) return;
    setShowExportMenu(false);

    const headers = [
      t('homework.fieldTitle') || 'Title',
      t('homework.fieldInstructions') || 'Description',
      t('homework.fieldClass') || 'Class',
      t('homework.fieldSection') || 'Section',
      t('homework.fieldSubject') || 'Subject',
      t('homework.teacher') || 'Teacher',
      t('homework.dueDate') || 'Due Date',
      t('homework.status') || 'Status',
    ];

    const rows = filteredHomeworks.map(hw => [
      `"${(hw.title || '').replace(/"/g, '""')}"`,
      `"${(hw.description || '').replace(/"/g, '""')}"`,
      `"${(hw.classEntity?.name || '').replace(/"/g, '""')}"`,
      `"${(hw.sectionEntity?.name || (t('homework.allSections') || 'All Sections')).replace(/"/g, '""')}"`,
      `"${(hw.subjectEntity?.name || '').replace(/"/g, '""')}"`,
      `"${(hw.teacherEntity?.name || (t('homework.assignedByStaff') || 'Assigned by Staff')).replace(/"/g, '""')}"`,
      `"${formatDate(hw.dueDate)}"`,
      `"${getStatusInfo(resolveStatus(hw)).label}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `homework_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (filteredHomeworks.length === 0) return;
    setShowExportMenu(false);

    const { jsPDF, autoTable } = await getPdfTools();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Document Title & Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(t('homework.reportTitle') || 'Smart School – Homework Report', 14, 16);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const dateGenerated = new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    doc.text(
      `${t('homework.generatedOn') || 'Generated on:'} ${dateGenerated} | ${t('homework.totalRecords') || 'Total Records:'} ${filteredHomeworks.length.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`,
      14,
      23
    );

    const tableRows = filteredHomeworks.map((hw, idx) => [
      (idx + 1).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US'),
      hw.title || '—',
      hw.classEntity?.name || '—',
      hw.sectionEntity?.name || (t('homework.allSections') || 'All Sections'),
      hw.subjectEntity?.name || '—',
      hw.teacherEntity?.name || (t('homework.assignedByStaff') || 'Assigned by Staff'),
      formatDate(hw.dueDate),
      getStatusInfo(resolveStatus(hw)).label,
    ]);

    autoTable(doc, {
      startY: 28,
      head: [[
        '#',
        t('homework.fieldTitle') || 'Title',
        t('homework.fieldClass') || 'Class',
        t('homework.fieldSection') || 'Section',
        t('homework.fieldSubject') || 'Subject',
        t('homework.teacher') || 'Teacher',
        t('homework.dueDate') || 'Due Date',
        t('homework.status') || 'Status'
      ]],
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

    doc.save(`homework_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div
      className="page-container animate-fade-in"
      style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}
    >
      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--foreground)', margin: 0, letterSpacing: '-0.02em' }}>
          {t('homework.title') || 'Homework'}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', margin: '0.25rem 0 0' }}>
          {t('homework.subtitle') || 'View and manage homework assignments across classes and subjects'}
        </p>
      </div>

      {/* Success Notification Banner */}
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
        {/* Total Homework */}
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
              {t('homework.totalHomework') || 'Total Homework'}
            </span>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: 'var(--foreground)',
                marginTop: '0.25rem',
              }}
            >
              {stats.total.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
            </div>
            <span style={{ fontSize: '0.775rem', color: 'var(--muted-foreground)' }}>
              {t('homework.allRecorded') || 'All recorded assignments'}
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
            <BookOpen size={24} />
          </div>
        </div>

        {/* Assigned / Active */}
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
              {t('homework.activeAssigned') || 'Active / Assigned'}
            </span>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: '#6366f1',
                marginTop: '0.25rem',
              }}
            >
              {stats.assigned.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
              <span
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                }}
              >
                {stats.activePct.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}{t('homework.pctOfTotal') || '% of total'}
              </span>
              <span style={{ fontSize: '0.775rem', color: 'var(--muted-foreground)' }}>
                {t('homework.pendingSubmission') || 'Pending submission'}
              </span>
            </div>
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
            <Clock size={24} />
          </div>
        </div>

        {/* Completed */}
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
              {t('homework.completed') || 'Completed'}
            </span>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: '#10b981',
                marginTop: '0.25rem',
              }}
            >
              {stats.completed.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
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
                {stats.completedPct.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}%
              </span>
              <span style={{ fontSize: '0.775rem', color: 'var(--muted-foreground)' }}>
                {t('homework.turnedInVerified') || 'Turned in / verified'}
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
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Overdue / Late */}
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
              {t('homework.overdueLate') || 'Overdue / Late'}
            </span>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: '#ef4444',
                marginTop: '0.25rem',
              }}
            >
              {stats.late.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
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
                {stats.latePct.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}%
              </span>
              <span style={{ fontSize: '0.775rem', color: 'var(--muted-foreground)' }}>
                {t('homework.pastDeadline') || 'Past deadline'}
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
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
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
        {/* Integrated Top Toolbar */}
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
              placeholder={t('homework.searchPlaceholder') || "Search by title, subject, class, teacher..."}
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

          {/* Right Toolbar Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 0.9rem',
                borderRadius: '0.65rem',
                border: activeFiltersCount > 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: activeFiltersCount > 0 ? 'rgba(99, 102, 241, 0.08)' : 'var(--background)',
                color: activeFiltersCount > 0 ? 'var(--primary)' : 'var(--foreground)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Filter size={15} />
              <span>{t('homework.filters') || 'Filters'}</span>
              {loadingMeta && (
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              )}
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
                  {activeFiltersCount.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
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
                onClick={() => setViewMode('table')}
                title={t('homework.table') || "Table View"}
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
                <span className="hidden sm:inline">{t('homework.table') || 'Table'}</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                title={t('homework.cards') || "Card Grid View"}
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
                <span className="hidden sm:inline">{t('homework.cards') || 'Cards'}</span>
              </button>
            </div>

            {/* Export Dropdown */}
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
                <span>{t('homework.export') || 'Export'}</span>
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
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <FileSpreadsheet size={16} style={{ color: '#10b981' }} />
                    <span>{t('homework.exportCsv') || 'Export to CSV'}</span>
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
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <FileText size={16} style={{ color: '#ef4444' }} />
                    <span>{t('homework.exportPdf') || 'Export to PDF'}</span>
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
                {t('homework.show') || 'Show:'}
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

            {/* Primary Action Button: Assign Homework */}
            <button
              className="btn btn-primary"
              onClick={() => handleOpenAssignModal()}
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
              <span>{t('homework.assignHomework') || 'Assign Homework'}</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchHomework}
              disabled={loadingHomework}
              title={t('homework.refreshRecords') || "Refresh records"}
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
                cursor: loadingHomework ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw
                size={16}
                style={{
                  animation: loadingHomework ? 'spin 1s linear infinite' : 'none',
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
              background: 'rgba(99, 102, 241, 0.02)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'flex-end',
            }}
          >
            {/* Class Filter */}
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
                {t('homework.class') || 'Class'}
              </label>
              <div style={{ position: 'relative' }}>
                <School
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted-foreground)',
                    pointerEvents: 'none',
                  }}
                />
                <select
                  value={selectedClassId}
                  onChange={e => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionId('');
                    setPage(1);
                  }}
                  style={{
                    width: '100%',
                    paddingLeft: '2.2rem',
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
                  <option value="">{t('homework.allClasses') || 'All Classes'}</option>
                  {availableClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section Filter */}
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
                {t('homework.section') || 'Section'}
              </label>
              <select
                value={selectedSectionId}
                onChange={e => {
                  setSelectedSectionId(e.target.value);
                  setPage(1);
                }}
                disabled={!selectedClassId || activeClassSections.length === 0}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: selectedClassId ? 'pointer' : 'not-allowed',
                  opacity: selectedClassId ? 1 : 0.6,
                }}
              >
                <option value="">{t('homework.allSections') || 'All Sections'}</option>
                {activeClassSections.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
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
                {t('homework.subject') || 'Subject'}
              </label>
              <div style={{ position: 'relative' }}>
                <BookMarked
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted-foreground)',
                    pointerEvents: 'none',
                  }}
                />
                <select
                  value={selectedSubjectId}
                  onChange={e => {
                    setSelectedSubjectId(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    width: '100%',
                    paddingLeft: '2.2rem',
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
                  <option value="">{t('homework.allSubjects') || 'All Subjects'}</option>
                  {availableSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                      {sub.code ? ` (${sub.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter */}
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
                {t('homework.status') || 'Status'}
              </label>
              <select
                value={selectedStatus}
                onChange={e => {
                  setSelectedStatus(e.target.value);
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
                <option value="">{t('homework.allStatuses') || 'All Statuses'}</option>
                <option value="Assigned">{t('homework.statusAssigned') || 'Assigned'}</option>
                <option value="Pending">{t('homework.statusPending') || 'Pending'}</option>
                <option value="Completed">{t('homework.statusCompleted') || 'Completed'}</option>
                <option value="Late">{t('homework.statusLate') || 'Late / Overdue'}</option>
              </select>
            </div>

            {/* Date Filter */}
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
                {t('homework.dueDate') || 'Due Date'}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => {
                  setSelectedDate(e.target.value);
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

            {/* Reset Filters Button */}
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
                <span>{t('homework.reset') || 'Reset'}</span>
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loadingHomework && (
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
            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{t('homework.fetchingHomework') || 'Fetching homework assignments...'}</span>
          </div>
        )}

        {/* Empty State */}
        {!loadingHomework && paginatedHomeworks.length === 0 && (
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
                background: 'rgba(99, 102, 241, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1',
              }}
            >
              <FileText size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                {t('homework.noHomework') || 'No homework records found'}
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
                  ? (t('homework.noMatchingFilters') || 'No homework assignments match your current filters. Try resetting your search filters.')
                  : (t('homework.noHomeworkAssignedYet') || 'No homework has been assigned yet. Click "Assign Homework" to create the first assignment.')}
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
                {t('homework.clearAllFilters') || 'Clear all filters'}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => handleOpenAssignModal()}
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
                <span>{t('homework.assignHomework') || 'Assign Homework'}</span>
              </button>
            )}
          </div>
        )}

        {/* TABLE VIEW */}
        {!loadingHomework && paginatedHomeworks.length > 0 && viewMode === 'table' && (
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
                  <th style={{ padding: '0.9rem 1.25rem' }}>{t('homework.homeworkDetails') || 'Homework Details'}</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>{t('homework.classAndSection') || 'Class & Section'}</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>{t('homework.subject') || 'Subject'}</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>{t('homework.teacher') || 'Teacher'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', whiteSpace: 'nowrap' }}>{t('homework.dueDate') || 'Due Date'}</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>{t('homework.status') || 'Status'}</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>{t('homework.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHomeworks.map((hw, idx) => {
                  const statusKey = resolveStatus(hw);
                  const st = getStatusInfo(statusKey);

                  return (
                    <tr
                      key={hw.id || idx}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Title & Description */}
                      <td style={{ padding: '1rem 1.25rem', maxWidth: '320px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '9px',
                              background: 'rgba(99, 102, 241, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#6366f1',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            <FileText size={17} />
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
                              title={hw.title}
                            >
                              {hw.title}
                            </div>
                            {hw.description ? (
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--muted-foreground)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  marginTop: '0.2rem',
                                }}
                                title={hw.description}
                              >
                                {hw.description}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                {t('homework.noInstructions') || 'No instructions provided'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Class & Section */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              background: 'rgba(99, 102, 241, 0.08)',
                              color: '#6366f1',
                              border: '1px solid rgba(99, 102, 241, 0.2)',
                            }}
                          >
                            {hw.classEntity?.name || `${t('homework.classPrefix') || 'Class'} —`}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              background: 'var(--background)',
                              border: '1px solid var(--border)',
                              color: 'var(--muted-foreground)',
                            }}
                          >
                            {hw.sectionEntity?.name ? `${t('homework.secPrefix') || 'Sec'} ${hw.sectionEntity.name}` : (t('homework.allSections') || 'All Sections')}
                          </span>
                        </div>
                      </td>

                      {/* Subject */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <BookMarked size={14} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                            {hw.subjectEntity?.name || '—'}
                          </span>
                          {hw.subjectEntity?.code && (
                            <span
                              style={{
                                fontSize: '0.725rem',
                                color: 'var(--muted-foreground)',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                background: 'var(--muted)',
                              }}
                            >
                              {hw.subjectEntity.code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Teacher */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#10b981',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <User size={13} />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--foreground)' }}>
                            {hw.teacherEntity?.name || (t('homework.assignedByStaff') || 'Assigned by Staff')}
                          </span>
                        </div>
                      </td>

                      {/* Due Date (strictly single line) */}
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
                          <span style={{ whiteSpace: 'nowrap' }}>{formatDate(hw.dueDate)}</span>
                        </div>
                      </td>

                      {/* Status */}
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
                            background: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: st.dot,
                            }}
                          />
                          {st.label}
                        </span>
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
                          {/* View Details */}
                          <button
                            onClick={() => setDetailsModal({ open: true, homework: hw })}
                            title={t('homework.viewDetails') || "View assignment details"}
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
                            onMouseEnter={e => {
                              e.currentTarget.style.color = 'var(--primary)';
                              e.currentTarget.style.borderColor = 'var(--primary)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = 'var(--muted-foreground)';
                              e.currentTarget.style.borderColor = 'var(--border)';
                            }}
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit / Update */}
                          <button
                            onClick={() => handleOpenAssignModal(hw)}
                            title={t('homework.editAssignment') || "Edit assignment"}
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
                            onMouseEnter={e => {
                              e.currentTarget.style.color = '#f59e0b';
                              e.currentTarget.style.borderColor = '#f59e0b';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = 'var(--muted-foreground)';
                              e.currentTarget.style.borderColor = 'var(--border)';
                            }}
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() =>
                              setDeleteModal({
                                open: true,
                                id: hw.id,
                                title: hw.title,
                              })
                            }
                            title={t('homework.deleteAssignment') || "Delete assignment"}
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
                            onMouseEnter={e => {
                              e.currentTarget.style.color = '#ef4444';
                              e.currentTarget.style.borderColor = '#ef4444';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = 'var(--muted-foreground)';
                              e.currentTarget.style.borderColor = 'var(--border)';
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

        {/* CARDS GRID VIEW */}
        {!loadingHomework && paginatedHomeworks.length > 0 && viewMode === 'cards' && (
          <div
            style={{
              padding: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {paginatedHomeworks.map((hw, idx) => {
              const statusKey = resolveStatus(hw);
              const st = getStatusInfo(statusKey);

              return (
                <div
                  key={hw.id || idx}
                  className="widget glass-card"
                  style={{
                    borderRadius: '1rem',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px -2px rgba(0,0,0,0.04)';
                  }}
                >
                  <div>
                    {/* Top Row: Status Chip & Due Date Badge */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.85rem',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          background: st.bg,
                          color: st.color,
                          border: `1px solid ${st.border}`,
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: st.dot,
                          }}
                        />
                        {st.label}
                      </span>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.775rem',
                          color: 'var(--muted-foreground)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Calendar size={13} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                          {formatDate(hw.dueDate)}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: 'var(--foreground)',
                        margin: '0 0 0.45rem',
                        lineHeight: 1.35,
                      }}
                    >
                      {hw.title}
                    </h3>

                    {/* Description */}
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
                      {hw.description || (t('homework.noInstructionsProvided') || 'No additional instructions provided for this assignment.')}
                    </p>

                    {/* Metadata Badges */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        fontSize: '0.8rem',
                        color: 'var(--muted-foreground)',
                        padding: '0.75rem',
                        borderRadius: '0.65rem',
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        marginBottom: '1rem',
                      }}
                    >
                      {/* Class & Section */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <School size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                          {hw.classEntity?.name || `${t('homework.classPrefix') || 'Class'} —`}
                        </span>
                        <span style={{ color: 'var(--muted-foreground)' }}>•</span>
                        <span>{hw.sectionEntity?.name ? `${t('homework.secPrefix') || 'Sec'} ${hw.sectionEntity.name}` : (t('homework.allSections') || 'All Sections')}</span>
                      </div>

                      {/* Subject */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <BookMarked size={13} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                        <span>{t('homework.subjectColon') || 'Subject:'}</span>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                          {hw.subjectEntity?.name || '—'}
                        </span>
                        {hw.subjectEntity?.code && (
                          <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                            ({hw.subjectEntity.code})
                          </span>
                        )}
                      </div>

                      {/* Teacher */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span>{t('homework.teacherColon') || 'Teacher:'}</span>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                          {hw.teacherEntity?.name || (t('homework.assignedByStaff') || 'Assigned by Staff')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
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
                      onClick={() => setDetailsModal({ open: true, homework: hw })}
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
                      <span>{t('homework.detailsBtn') || 'Details'}</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleOpenAssignModal(hw)}
                        title={t('homework.editAssignment') || "Edit assignment"}
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
                        onClick={() =>
                          setDeleteModal({
                            open: true,
                            id: hw.id,
                            title: hw.title,
                          })
                        }
                        title={t('homework.deleteAssignment') || "Delete assignment"}
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

        {/* Standard Pagination Footer */}
        {!loadingHomework && filteredHomeworks.length > 0 && (
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
              {t('homework.showing') || 'Showing'}{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {Math.min((page - 1) * limit + 1, filteredHomeworks.length).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
              </strong>{' '}
              {t('homework.to') || 'to'}{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {Math.min(page * limit, filteredHomeworks.length).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
              </strong>{' '}
              {t('homework.of') || 'of'} <strong style={{ color: 'var(--foreground)' }}>{filteredHomeworks.length.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</strong> {t('homework.records') || 'homework records'}
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
                <span>{t('homework.prev') || 'Prev'}</span>
              </button>

              <div
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  padding: '0 0.5rem',
                }}
              >
                {t('homework.page') || 'Page'} {page.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')} {t('homework.of') || 'of'} {totalPages.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
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
                <span>{t('homework.next') || 'Next'}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ASSIGN / EDIT HOMEWORK MODAL */}
      {assignModalOpen && (
        <div className="modal-overlay animate-fade-in">
          <div
            className="modal-content"
            style={{
              maxWidth: '620px',
              width: '100%',
              borderRadius: '1.25rem',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(99, 102, 241, 0.02)',
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
                  <FileText size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                    {assignMode === 'edit'
                      ? (t('homework.modalEditTitle') || 'Edit Homework')
                      : (t('homework.modalAssignTitle') || 'Assign Homework')}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: '0.15rem 0 0' }}>
                    {assignMode === 'edit'
                      ? (t('homework.modalEditSubtitle') || 'Update details, instructions, or deadline')
                      : (t('homework.modalAssignSubtitle') || 'Create a new homework task for your students')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
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

            {/* Modal Form */}
            <form onSubmit={handleSaveHomework} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {t('homework.fieldTitle') || 'Homework Title'} <span style={{ color: 'var(--destructive)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('homework.placeholderTitle') || "e.g. Chapter 4 Exercises: Fractions & Decimals"}
                    value={assignForm.title}
                    onChange={e => setAssignForm({ ...assignForm, title: e.target.value })}
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

                {/* Class & Section Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Class */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {t('homework.fieldClass') || 'Class'} <span style={{ color: 'var(--destructive)' }}>*</span>
                    </label>
                    <select
                      required
                      value={assignForm.classId}
                      onChange={e =>
                        setAssignForm({
                          ...assignForm,
                          classId: e.target.value,
                          sectionId: '',
                        })
                      }
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
                      <option value="">{t('homework.selectClass') || 'Select Class'}</option>
                      {availableClasses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {t('homework.fieldSection') || 'Section'} <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t('homework.optional') || '(Optional)'}</span>
                    </label>
                    <select
                      value={assignForm.sectionId}
                      onChange={e => setAssignForm({ ...assignForm, sectionId: e.target.value })}
                      disabled={!assignForm.classId}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.875rem',
                        cursor: assignForm.classId ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <option value="">{t('homework.allSections') || 'All Sections'}</option>
                      {assignClassSections.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject & Teacher Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Subject */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {t('homework.fieldSubject') || 'Subject'} <span style={{ color: 'var(--destructive)' }}>*</span>
                    </label>
                    <select
                      required
                      value={assignForm.subjectId}
                      onChange={e => setAssignForm({ ...assignForm, subjectId: e.target.value })}
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
                      <option value="">{t('homework.selectSubject') || 'Select Subject'}</option>
                      {availableSubjects.map(sub => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                          {sub.code ? ` (${sub.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Teacher */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {t('homework.fieldTeacher') || 'Assigning Teacher'}
                    </label>
                    <select
                      value={assignForm.teacherId}
                      onChange={e => setAssignForm({ ...assignForm, teacherId: e.target.value })}
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
                      <option value="">{t('homework.autoTeacher') || 'Auto / Current Teacher'}</option>
                      {availableTeachers.map(tch => (
                        <option key={tch.id} value={tch.id}>
                          {tch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Due Date & Status Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Due Date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {t('homework.fieldDueDate') || 'Due Date'} <span style={{ color: 'var(--destructive)' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={assignForm.dueDate}
                      onChange={e => setAssignForm({ ...assignForm, dueDate: e.target.value })}
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
                    />
                  </div>

                  {/* Status */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {t('homework.fieldStatus') || 'Status'}
                    </label>
                    <select
                      value={assignForm.status}
                      onChange={e => setAssignForm({ ...assignForm, status: e.target.value })}
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
                      <option value="Assigned">{t('homework.statusAssigned') || 'Assigned'}</option>
                      <option value="Pending">{t('homework.statusPending') || 'Pending'}</option>
                      <option value="Completed">{t('homework.statusCompleted') || 'Completed'}</option>
                      <option value="Late">{t('homework.statusLate') || 'Late / Overdue'}</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {t('homework.fieldInstructions') || 'Instructions & Description'}
                  </label>
                  <textarea
                    rows={4}
                    placeholder={t('homework.placeholderInstructions') || "Provide detailed instructions, textbook pages, questions, or submission guidelines..."}
                    value={assignForm.description}
                    onChange={e => setAssignForm({ ...assignForm, description: e.target.value })}
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
              </div>

              {/* Form Footer */}
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
                  onClick={() => setAssignModalOpen(false)}
                  disabled={assignSubmitting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '0.65rem',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={assignSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '0.65rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                    cursor: assignSubmitting ? 'not-allowed' : 'pointer',
                    opacity: assignSubmitting ? 0.7 : 1,
                  }}
                >
                  {assignSubmitting ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>{t('homework.saving') || 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>
                        {assignMode === 'edit'
                          ? (t('homework.saveChanges') || 'Save Changes')
                          : (t('homework.assignHomework') || 'Assign Homework')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HOMEWORK DETAILS MODAL */}
      {detailsModal.open && detailsModal.homework && (
        <div className="modal-overlay animate-fade-in">
          <div
            className="modal-content"
            style={{
              maxWidth: '560px',
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
                background: 'rgba(99, 102, 241, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6366f1',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                    {t('homework.detailsModalTitle') || 'Homework Details'}
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                    {t('homework.assignmentOverview') || 'Assignment Overview'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailsModal({ open: false, homework: null })}
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

            {/* Content Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      background: getStatusInfo(resolveStatus(detailsModal.homework)).bg,
                      color: getStatusInfo(resolveStatus(detailsModal.homework)).color,
                      border: `1px solid ${getStatusInfo(resolveStatus(detailsModal.homework)).border}`,
                    }}
                  >
                    {getStatusInfo(resolveStatus(detailsModal.homework)).label}
                  </span>
                  <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)' }}>
                    {t('homework.dueColon') || 'Due:'} <strong>{formatDate(detailsModal.homework.dueDate)}</strong>
                  </span>
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>
                  {detailsModal.homework.title}
                </h3>
              </div>

              {/* Instructions Box */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    color: 'var(--muted-foreground)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'block',
                    marginBottom: '0.35rem',
                  }}
                >
                  {t('homework.instructionsGuidelines') || 'Instructions & Guidelines'}
                </span>
                <p style={{ fontSize: '0.9rem', color: 'var(--foreground)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {detailsModal.homework.description || (t('homework.noDetailedInstructions') || 'No detailed instructions provided.')}
                </p>
              </div>

              {/* Meta Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.65rem',
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', fontWeight: 700 }}>
                    {t('homework.classAndSection') || 'Class & Section'}
                  </span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '0.2rem' }}>
                    {detailsModal.homework.classEntity?.name || '—'}{' '}
                    <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>
                      ({detailsModal.homework.sectionEntity?.name ? `${t('homework.secPrefix') || 'Sec'} ${detailsModal.homework.sectionEntity.name}` : (t('homework.allSections') || 'All Sections')})
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.65rem',
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', fontWeight: 700 }}>
                    {t('homework.subject') || 'Subject'}
                  </span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '0.2rem' }}>
                    {detailsModal.homework.subjectEntity?.name || '—'}
                    {detailsModal.homework.subjectEntity?.code && ` (${detailsModal.homework.subjectEntity.code})`}
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.65rem',
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', fontWeight: 700 }}>
                    {t('homework.teacher') || 'Teacher'}
                  </span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '0.2rem' }}>
                    {detailsModal.homework.teacherEntity?.name || (t('homework.assignedByStaff') || 'Assigned by Staff')}
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.65rem',
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', fontWeight: 700 }}>
                    {t('homework.deadline') || 'Deadline'}
                  </span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '0.2rem', whiteSpace: 'nowrap' }}>
                    {formatDate(detailsModal.homework.dueDate)}
                  </div>
                </div>
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
                onClick={() => setDetailsModal({ open: false, homework: null })}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('common.close') || 'Close'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const target = detailsModal.homework;
                  setDetailsModal({ open: false, homework: null });
                  if (target) handleOpenAssignModal(target);
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
                <span>{t('homework.editHomework') || 'Edit Homework'}</span>
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
                  {t('homework.deleteModalTitle') || 'Delete Homework'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  {t('homework.cannotBeUndone') || 'This action cannot be undone'}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              {t('homework.deleteConfirmPre') || 'Are you sure you want to permanently delete'}{' '}
              <strong style={{ color: 'var(--foreground)' }}>&ldquo;{deleteModal.title}&rdquo;</strong>{t('homework.deleteConfirmPost') || '? Students will no longer see this assignment in their dashboard.'}
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
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleDeleteHomework}
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
                <span>{deleteLoading ? (t('homework.deleting') || 'Deleting...') : (t('common.delete') || 'Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
