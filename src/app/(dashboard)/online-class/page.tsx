"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  Video, Calendar, Clock, Link as LinkIcon, Loader2, User, BookOpen,
  Filter, Search, Plus, Edit3, Trash2, Eye, Download, ChevronDown,
  ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
  AlertTriangle, X, Check, School, Layers, LayoutGrid, RefreshCw,
  Radio, Copy, ExternalLink, CheckCircle2, AlertCircle
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

interface Participant {
  name: string | null;
  avatar: string | null;
}

interface OnlineClass {
  id: string;
  title: string;
  description?: string;
  meetLink: string;
  date: string;
  startTime: string;
  endTime: string;
  host?: {
    name: string;
    avatar: string | null;
  };
  class?: { id?: string; name: string } | null;
  section?: { id?: string; name: string } | null;
  subject?: { id?: string; name: string; code?: string } | null;
  participants?: Participant[];
}

interface ClassOption {
  id: string;
  name: string;
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

const STATUS_STYLES: Record<
  string,
  { bg: string; color: string; border: string; dot: string }
> = {
  Live: {
    bg: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    border: 'rgba(16, 185, 129, 0.25)',
    dot: '#10b981',
  },
  Upcoming: {
    bg: 'rgba(99, 102, 241, 0.1)',
    color: '#6366f1',
    border: 'rgba(99, 102, 241, 0.25)',
    dot: '#6366f1',
  },
  Completed: {
    bg: 'rgba(100, 116, 139, 0.1)',
    color: '#64748b',
    border: 'rgba(100, 116, 139, 0.25)',
    dot: '#64748b',
  },
};

export default function OnlineClassPage() {
  const { t, language } = useLanguage();

  const getStatusInfo = useCallback((status: string) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES.Upcoming;
    let label = t('onlineClass.statusUpcoming');
    if (status === 'Live') label = t('onlineClass.statusLive');
    else if (status === 'Completed') label = t('onlineClass.statusCompleted');
    return { ...style, label };
  }, [t]);

  // Core Data
  const [meetings, setMeetings] = useState<OnlineClass[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]);
  const [availableSections, setAvailableSections] = useState<SectionOption[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<TeacherOption[]>([]);

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Export Menu
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Schedule / Edit Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetLink: '',
    date: '',
    startTime: '10:00',
    endTime: '11:00',
    classId: '',
    sectionId: '',
    subjectId: '',
    hostName: '',
  });

  // Details Modal
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; meeting: OnlineClass | null }>({
    open: false,
    meeting: null,
  });

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; title: string }>({
    open: false,
    id: '',
    title: '',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reference timestamp for pure rendering
  const [currentTime] = useState(() => Date.now());

  // Close export menu on outside click
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

        if (clsRes.status === 'fulfilled' && clsRes.value.ok) {
          const json = await clsRes.value.json();
          const list = Array.isArray(json) ? json : json.data || [];
          list.forEach((c: { id?: string; name?: string }) => {
            if (c?.id && c?.name) {
              classMap.set(c.id, { id: c.id, name: c.name, sections: [] });
            }
          });
        }

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

        if (subRes.status === 'fulfilled' && subRes.value.ok) {
          const json = await subRes.value.json();
          const list = Array.isArray(json) ? json : json.data || [];
          list.forEach((sub: { id?: string; name?: string; code?: string }) => {
            if (sub?.id && sub?.name) {
              subjectMap.set(sub.id, { id: sub.id, name: sub.name, code: sub.code });
            }
          });
        }

        if (tchRes.status === 'fulfilled' && tchRes.value.ok) {
          const json = await tchRes.value.json();
          const list = json.data?.data || json.data || (Array.isArray(json) ? json : []);
          list.forEach((tch: { id?: string; name?: string; email?: string }) => {
            if (tch?.id && tch?.name) {
              teacherMap.set(tch.id, { id: tch.id, name: tch.name, email: tch.email });
            }
          });
        }

        if (routineRes.status === 'fulfilled' && routineRes.value.ok) {
          const json = await routineRes.value.json();
          const routines: Array<{
            classEntity?: { id: string; name: string };
            sectionEntity?: { id: string; name: string };
            subjectEntity?: { id: string; name: string; code?: string };
            teacherEntity?: { id: string; name: string; email?: string };
          }> = json.data && Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];

          routines.forEach(r => {
            if (r.classEntity?.id && r.classEntity?.name && !classMap.has(r.classEntity.id)) {
              classMap.set(r.classEntity.id, { id: r.classEntity.id, name: r.classEntity.name, sections: [] });
            }
            const sec = r.sectionEntity;
            if (sec?.id && sec?.name && r.classEntity?.id) {
              const cls = classMap.get(r.classEntity.id);
              if (cls && !cls.sections?.some(s => s.id === sec.id)) {
                cls.sections?.push({ id: sec.id, name: sec.name });
              }
              if (!sectionList.some(s => s.id === sec.id)) {
                sectionList.push({ id: sec.id, name: sec.name, classId: r.classEntity.id });
              }
            }
            if (r.subjectEntity?.id && r.subjectEntity?.name && !subjectMap.has(r.subjectEntity.id)) {
              subjectMap.set(r.subjectEntity.id, { id: r.subjectEntity.id, name: r.subjectEntity.name, code: r.subjectEntity.code });
            }
            if (r.teacherEntity?.id && r.teacherEntity?.name && !teacherMap.has(r.teacherEntity.id)) {
              teacherMap.set(r.teacherEntity.id, { id: r.teacherEntity.id, name: r.teacherEntity.name, email: r.teacherEntity.email });
            }
          });
        }

        setAvailableClasses(Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        setAvailableSections(sectionList);
        setAvailableSubjects(Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        setAvailableTeachers(Array.from(teacherMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Failed to load online classes metadata:', err);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    };

    fetchMetadata();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch Online Classes
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/online-classes`, {
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        const list: OnlineClass[] = json.data || (Array.isArray(json) ? json : []);
        setMeetings(list);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.message || t('onlineClass.failedFetch'));
      }
    } catch (err) {
      console.error('Error fetching online classes:', err);
      setError(t('onlineClass.networkErrorFetch'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Mount fetch (deferred with setTimeout to prevent cascading render warning)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMeetings();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMeetings]);

  // Helper to convert English digits to Bengali digits
  const toBengaliDigits = useCallback((numStr: string) => {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return numStr.replace(/\d/g, d => bnDigits[parseInt(d, 10)]);
  }, []);

  // Date Formatting strictly in single line
  const formatDate = useCallback((dateStr?: string) => {
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
  }, [language]);

  // 12-Hour AM/PM Time Formatting
  const format12HourTime = useCallback((timeStr?: string) => {
    if (!timeStr) return '—';
    if (/am|pm/i.test(timeStr)) {
      return language === 'bn' ? toBengaliDigits(timeStr) : timeStr;
    }

    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1].slice(0, 2);
      if (isNaN(hours)) return timeStr;

      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;

      const paddedHours = hours < 10 ? `0${hours}` : `${hours}`;
      const res = `${paddedHours}:${minutes} ${ampm}`;
      return language === 'bn' ? toBengaliDigits(res) : res;
    }
    return timeStr;
  }, [language, toBengaliDigits]);

  // Status Classifier (Live, Upcoming, Completed)
  const resolveStatus = useCallback((m: OnlineClass) => {
    if (!m.date) return 'Upcoming';

    try {
      const datePart = m.date.split('T')[0];
      const todayStr = new Date(currentTime).toISOString().split('T')[0];

      if (datePart < todayStr) return 'Completed';
      if (datePart > todayStr) return 'Upcoming';

      // Today: check times if available
      if (m.startTime && m.endTime) {
        const startParts = m.startTime.split(':');
        const endParts = m.endTime.split(':');
        if (startParts.length >= 2 && endParts.length >= 2) {
          const now = new Date(currentTime);
          const curMinutes = now.getHours() * 60 + now.getMinutes();

          let sHours = parseInt(startParts[0], 10);
          const sMins = parseInt(startParts[1], 10);
          if (/pm/i.test(m.startTime) && sHours < 12) sHours += 12;
          if (/am/i.test(m.startTime) && sHours === 12) sHours = 0;
          const startMinutes = sHours * 60 + sMins;

          let eHours = parseInt(endParts[0], 10);
          const eMins = parseInt(endParts[1], 10);
          if (/pm/i.test(m.endTime) && eHours < 12) eHours += 12;
          if (/am/i.test(m.endTime) && eHours === 12) eHours = 0;
          const endMinutes = eHours * 60 + eMins;

          if (curMinutes >= startMinutes && curMinutes <= endMinutes) {
            return 'Live';
          }
          if (curMinutes < startMinutes) {
            return 'Upcoming';
          }
          return 'Completed';
        }
      }

      return 'Upcoming';
    } catch {
      return 'Upcoming';
    }
  }, [currentTime]);

  // Dynamic sections for filter drawer
  const activeClassSections = useMemo(() => {
    if (!selectedClassId) return availableSections;
    const found = availableClasses.find(c => c.id === selectedClassId);
    if (found?.sections && found.sections.length > 0) {
      return found.sections;
    }
    return availableSections.filter(s => s.classId === selectedClassId);
  }, [selectedClassId, availableClasses, availableSections]);

  // Dynamic sections for Schedule Modal
  const scheduleClassSections = useMemo(() => {
    if (!formData.classId) return [];
    const found = availableClasses.find(c => c.id === formData.classId);
    if (found?.sections && found.sections.length > 0) {
      return found.sections;
    }
    return availableSections.filter(s => s.classId === formData.classId);
  }, [formData.classId, availableClasses, availableSections]);

  // Filtered & Searched Meetings
  const filteredMeetings = useMemo(() => {
    let result = [...meetings];

    if (selectedClassId) {
      result = result.filter(m => {
        const cName = availableClasses.find(c => c.id === selectedClassId)?.name;
        return m.class?.id === selectedClassId || (cName && m.class?.name === cName);
      });
    }

    if (selectedSectionId) {
      result = result.filter(m => {
        const sName = availableSections.find(s => s.id === selectedSectionId)?.name;
        return m.section?.id === selectedSectionId || (sName && m.section?.name === sName);
      });
    }

    if (selectedSubjectId) {
      result = result.filter(m => {
        const subName = availableSubjects.find(sub => sub.id === selectedSubjectId)?.name;
        return m.subject?.id === selectedSubjectId || (subName && m.subject?.name === subName);
      });
    }

    if (selectedStatus) {
      result = result.filter(m => resolveStatus(m) === selectedStatus);
    }

    if (selectedDate) {
      result = result.filter(m => m.date && m.date.startsWith(selectedDate));
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(m => {
        const titleMatch = m.title?.toLowerCase().includes(q);
        const descMatch = m.description?.toLowerCase().includes(q);
        const classMatch = m.class?.name?.toLowerCase().includes(q);
        const secMatch = m.section?.name?.toLowerCase().includes(q);
        const subMatch = m.subject?.name?.toLowerCase().includes(q);
        const hostMatch = m.host?.name?.toLowerCase().includes(q);
        return titleMatch || descMatch || classMatch || secMatch || subMatch || hostMatch;
      });
    }

    return result;
  }, [meetings, selectedClassId, selectedSectionId, selectedSubjectId, selectedStatus, selectedDate, debouncedSearch, availableClasses, availableSections, availableSubjects, resolveStatus]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = meetings.length;
    let live = 0;
    let upcoming = 0;
    let completed = 0;

    meetings.forEach(m => {
      const st = resolveStatus(m);
      if (st === 'Live') live++;
      else if (st === 'Upcoming') upcoming++;
      else completed++;
    });

    return {
      total,
      live,
      upcoming,
      completed,
      upcomingPct: total > 0 ? Math.round((upcoming / total) * 100) : 0,
      completedPct: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [meetings, resolveStatus]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredMeetings.length / limit) || 1;
  const paginatedMeetings = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredMeetings.slice(start, start + limit);
  }, [filteredMeetings, page, limit]);

  // Active filters count
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

  // Open Schedule Modal
  const handleOpenScheduleModal = (m?: OnlineClass) => {
    if (m) {
      setModalMode('edit');
      setEditingMeetingId(m.id);
      setFormData({
        title: m.title || '',
        description: m.description || '',
        meetLink: m.meetLink || '',
        date: m.date ? m.date.split('T')[0] : '',
        startTime: m.startTime || '10:00',
        endTime: m.endTime || '11:00',
        classId: m.class?.id || '',
        sectionId: m.section?.id || '',
        subjectId: m.subject?.id || '',
        hostName: m.host?.name || '',
      });
    } else {
      setModalMode('create');
      setEditingMeetingId(null);
      const todayStr = new Date().toISOString().split('T')[0];
      setFormData({
        title: '',
        description: '',
        meetLink: '',
        date: todayStr,
        startTime: '10:00',
        endTime: '11:00',
        classId: selectedClassId || (availableClasses[0]?.id ?? ''),
        sectionId: selectedSectionId || '',
        subjectId: selectedSubjectId || (availableSubjects[0]?.id ?? ''),
        hostName: availableTeachers[0]?.name || '',
      });
    }
    setScheduleModalOpen(true);
  };

  // Submit Schedule Form
  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.meetLink.trim() || !formData.date || !formData.startTime || !formData.endTime) {
      setError(t('onlineClass.validationRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const selectedClass = availableClasses.find(c => c.id === formData.classId);
      const selectedSection = availableSections.find(s => s.id === formData.sectionId);
      const selectedSubject = availableSubjects.find(sub => sub.id === formData.subjectId);

      const payload: Record<string, unknown> = {
        id: (modalMode === 'edit' && editingMeetingId) ? editingMeetingId : undefined,
        title: formData.title.trim(),
        description: formData.description.trim(),
        meetLink: formData.meetLink.trim(),
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        host: {
          name: formData.hostName.trim() || t('onlineClass.staffHost'),
          avatar: null,
        },
        class: selectedClass ? { id: selectedClass.id, name: selectedClass.name } : null,
        section: selectedSection ? { id: selectedSection.id, name: selectedSection.name } : null,
        subject: selectedSubject ? { id: selectedSubject.id, name: selectedSubject.name } : null,
      };

      const url = `${API_BASE_URL}/online-classes`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessToast(
          modalMode === 'edit'
            ? t('onlineClass.updatedSuccess')
            : t('onlineClass.scheduledSuccess')
        );
        setScheduleModalOpen(false);
        fetchMeetings();
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.message || t('onlineClass.failedSave'));
      }
    } catch (err) {
      console.error('Error saving online class:', err);
      setError(t('onlineClass.networkErrorSave'));
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Meeting Handler
  const handleDeleteMeeting = async () => {
    if (!deleteModal.id) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/online-classes/${deleteModal.id}`, {
        method: 'DELETE',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        },
      });

      if (res.ok) {
        setSuccessToast(t('onlineClass.deletedSuccess'));
        setDeleteModal({ open: false, id: '', title: '' });
        setMeetings(prev => prev.filter(m => m.id !== deleteModal.id));
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.message || t('onlineClass.failedDelete'));
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(t('onlineClass.networkErrorDelete'));
    } finally {
      setDeleteLoading(false);
    }
  };

  // Copy Meeting Link
  const handleCopyLink = (link: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredMeetings.length === 0) return;
    setShowExportMenu(false);

    const headers = [
      t('onlineClass.fieldTitle'),
      t('onlineClass.class'),
      t('onlineClass.section'),
      t('onlineClass.subject'),
      t('onlineClass.host'),
      t('onlineClass.date'),
      t('onlineClass.timeWindow'),
      t('onlineClass.fieldMeetingLink'),
      t('onlineClass.status'),
    ];

    const rows = filteredMeetings.map(m => [
      `"${(m.title || t('onlineClass.untitledMeeting')).replace(/"/g, '""')}"`,
      `"${(m.class?.name || t('onlineClass.allClasses')).replace(/"/g, '""')}"`,
      `"${(m.section?.name || t('onlineClass.allSections')).replace(/"/g, '""')}"`,
      `"${(m.subject?.name || '—').replace(/"/g, '""')}"`,
      `"${(m.host?.name || t('onlineClass.staffHost')).replace(/"/g, '""')}"`,
      `"${formatDate(m.date)}"`,
      `"${format12HourTime(m.startTime)} – ${format12HourTime(m.endTime)}"`,
      `"${(m.meetLink || '').replace(/"/g, '""')}"`,
      `"${getStatusInfo(resolveStatus(m)).label}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `online_classes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (filteredMeetings.length === 0) return;
    setShowExportMenu(false);

    const { jsPDF, autoTable } = await getPdfTools();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(t('onlineClass.reportTitle'), 14, 16);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const dateGenerated = new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    doc.text(
      `${t('onlineClass.generatedOn')} ${dateGenerated} | ${t('onlineClass.totalSessionsReport')} ${filteredMeetings.length.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`,
      14,
      23
    );

    const tableRows = filteredMeetings.map((m, idx) => [
      (idx + 1).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US'),
      m.title || t('onlineClass.untitledMeeting'),
      m.class?.name ? `${t('onlineClass.classPrefix')} ${m.class.name}` : t('onlineClass.allClasses'),
      m.section?.name ? `${t('onlineClass.secPrefix')} ${m.section.name}` : t('onlineClass.allSections'),
      m.subject?.name || '—',
      m.host?.name || t('onlineClass.staffHost'),
      formatDate(m.date),
      `${format12HourTime(m.startTime)} – ${format12HourTime(m.endTime)}`,
      getStatusInfo(resolveStatus(m)).label,
    ]);

    autoTable(doc, {
      startY: 28,
      head: [[
        '#',
        t('onlineClass.fieldTitle'),
        t('onlineClass.class'),
        t('onlineClass.section'),
        t('onlineClass.subject'),
        t('onlineClass.host'),
        t('onlineClass.date'),
        t('onlineClass.timeWindow'),
        t('onlineClass.status'),
      ]],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [20, 184, 166],
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

    doc.save(`online_classes_${new Date().toISOString().split('T')[0]}.pdf`);
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



      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>
          {t('onlineClass.title')}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
          {t('onlineClass.subtitle')}
        </p>
      </div>

      {/* 4-Stat Metric Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Total Sessions */}
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
              {t('onlineClass.totalSessions')}
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
              {t('onlineClass.allVirtualClassrooms')}
            </span>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(20, 184, 166, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#14b8a6',
              flexShrink: 0,
            }}
          >
            <Video size={24} />
          </div>
        </div>

        {/* Live Now */}
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
                {t('onlineClass.liveNow')}
              </span>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
            </div>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: '#10b981',
                marginTop: '0.25rem',
              }}
            >
              {stats.live.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
            </div>
            <span style={{ fontSize: '0.775rem', color: 'var(--muted-foreground)' }}>
              {stats.live > 0 ? t('onlineClass.activeStreamInProgress') : t('onlineClass.noActiveSessions')}
            </span>
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
            <Radio size={24} />
          </div>
        </div>

        {/* Upcoming */}
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
              {t('onlineClass.upcoming')}
            </span>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: '#6366f1',
                marginTop: '0.25rem',
              }}
            >
              {stats.upcoming.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
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
                {stats.upcomingPct.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}%
              </span>
              <span style={{ fontSize: '0.775rem', color: 'var(--muted-foreground)' }}>
                {t('onlineClass.scheduledAhead')}
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
              {t('onlineClass.completed')}
            </span>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: '#64748b',
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
                  background: 'rgba(100, 116, 139, 0.1)',
                  color: '#64748b',
                }}
              >
                {stats.completedPct.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}%
              </span>
              <span style={{ fontSize: '0.775rem', color: 'var(--muted-foreground)' }}>
                {t('onlineClass.concludedSessions')}
              </span>
            </div>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(100, 116, 139, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              flexShrink: 0,
            }}
          >
            <Calendar size={24} />
          </div>
        </div>
      </div>

      {/* Main Table & Grid Card Container */}
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
        {/* Unified Integrated Toolbar */}
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
              placeholder={t('onlineClass.searchPlaceholder')}
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

          {/* Right: Controls & Filters */}
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
                border: activeFiltersCount > 0 ? '1px solid #14b8a6' : '1px solid var(--border)',
                background: activeFiltersCount > 0 ? 'rgba(20, 184, 166, 0.08)' : 'var(--background)',
                color: activeFiltersCount > 0 ? '#14b8a6' : 'var(--foreground)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Filter size={15} />
              <span>{t('onlineClass.filters')}</span>
              {loadingMeta && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    background: '#14b8a6',
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

            {/* View Switcher */}
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
                title={t('onlineClass.cards')}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: viewMode === 'cards' ? '#14b8a6' : 'transparent',
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
                <span className="hidden sm:inline">{t('onlineClass.cards')}</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                title={t('onlineClass.table')}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: viewMode === 'table' ? '#14b8a6' : 'transparent',
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
                <span className="hidden sm:inline">{t('onlineClass.table')}</span>
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
                <span>{t('onlineClass.export')}</span>
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
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(20, 184, 166, 0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <FileSpreadsheet size={16} style={{ color: '#10b981' }} />
                    <span>{t('onlineClass.exportCsv')}</span>
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
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(20, 184, 166, 0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <FileText size={16} style={{ color: '#ef4444' }} />
                    <span>{t('onlineClass.exportPdf')}</span>
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
                {t('onlineClass.show')}
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
                <option value={10}>{Number(10).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</option>
                <option value={25}>{Number(25).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</option>
                <option value={50}>{Number(50).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</option>
                <option value={100}>{Number(100).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</option>
              </select>
            </div>
            {/* Primary Action Button: Schedule Online Class */}
            <button
              className="btn btn-primary"
              onClick={() => handleOpenScheduleModal()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.15rem',
                borderRadius: '0.65rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                background: 'linear-gradient(135deg, #14b8a6, var(--primary))',
                boxShadow: '0 4px 14px rgba(20, 184, 166, 0.35)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={16} />
              <span>{t('onlineClass.scheduleOnlineClass')}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={fetchMeetings}
              disabled={loading}
              title={t('onlineClass.refreshSessions')}
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
              background: 'rgba(20, 184, 166, 0.02)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'flex-end',
            }}
          >
            {/* Class */}
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
                {t('onlineClass.class')}
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
                  <option value="">{t('onlineClass.allClasses')}</option>
                  {availableClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section */}
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
                {t('onlineClass.section')}
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
                <option value="">{t('onlineClass.allSections')}</option>
                {activeClassSections.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
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
                {t('onlineClass.subject')}
              </label>
              <div style={{ position: 'relative' }}>
                <BookOpen
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
                  <option value="">{t('onlineClass.allSubjects')}</option>
                  {availableSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                      {sub.code ? ` (${sub.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
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
                {t('onlineClass.status')}
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
                <option value="">{t('onlineClass.allStatuses')}</option>
                <option value="Live">{t('onlineClass.statusLive')}</option>
                <option value="Upcoming">{t('onlineClass.statusUpcoming')}</option>
                <option value="Completed">{t('onlineClass.statusCompleted')}</option>
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
                {t('onlineClass.date')}
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
                <span>{t('onlineClass.reset')}</span>
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
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#14b8a6' }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{t('onlineClass.loadingVirtualClasses')}</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && paginatedMeetings.length === 0 && (
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
                background: 'rgba(20, 184, 166, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#14b8a6',
              }}
            >
              <Video size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                {searchTerm || activeFiltersCount > 0
                  ? t('onlineClass.noMatchingClasses')
                  : t('onlineClass.noMeetings')}
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
                  ? t('onlineClass.noMatchingDesc')
                  : t('onlineClass.noMeetingsDesc')}
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
                {t('onlineClass.clearAllFilters')}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => handleOpenScheduleModal()}
                style={{
                  marginTop: '0.5rem',
                  borderRadius: '0.65rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.55rem 1.1rem',
                  background: 'linear-gradient(135deg, #14b8a6, var(--primary))',
                  border: 'none',
                  color: 'white',
                }}
              >
                <Plus size={16} />
                <span>{t('onlineClass.scheduleOnlineClass')}</span>
              </button>
            )}
          </div>
        )}

        {/* CARDS GRID VIEW */}
        {!loading && paginatedMeetings.length > 0 && viewMode === 'cards' && (
          <div
            style={{
              padding: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {paginatedMeetings.map((m, idx) => {
              const statusKey = resolveStatus(m);
              const st = getStatusInfo(statusKey);
              const isLive = statusKey === 'Live';

              return (
                <div
                  key={m.id || idx}
                  className="widget glass-card"
                  style={{
                    borderRadius: '1rem',
                    border: isLive ? '1.5px solid #10b981' : '1px solid var(--border)',
                    background: 'var(--card)',
                    padding: '1.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isLive ? '0 8px 24px -4px rgba(16, 185, 129, 0.15)' : '0 4px 16px -2px rgba(0,0,0,0.04)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px -4px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = isLive ? '0 8px 24px -4px rgba(16, 185, 129, 0.15)' : '0 4px 16px -2px rgba(0,0,0,0.04)';
                  }}
                >
                  <div>
                    {/* Top Row: Status badge & Single-line date */}
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
                          gap: '0.4rem',
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
                            boxShadow: isLive ? '0 0 6px #10b981' : 'none',
                          }}
                        />
                        {st.label}
                      </span>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.8rem',
                          color: 'var(--muted-foreground)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Calendar size={13} style={{ color: '#14b8a6' }} />
                        <span style={{ fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                          {formatDate(m.date)}
                        </span>
                      </div>
                    </div>

                    {/* Session Title */}
                    <h3
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: 'var(--foreground)',
                        margin: '0 0 0.5rem',
                        lineHeight: 1.35,
                      }}
                    >
                      {m.title || t('onlineClass.untitledMeeting')}
                    </h3>

                    {/* Description snippet */}
                    {m.description && (
                      <p
                        style={{
                          fontSize: '0.825rem',
                          color: 'var(--muted-foreground)',
                          margin: '0 0 0.85rem',
                          lineHeight: 1.45,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {m.description}
                      </p>
                    )}

                    {/* Time Window with AM/PM */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(20, 184, 166, 0.08)',
                        color: '#0f766e',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        marginBottom: '0.85rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Clock size={14} style={{ color: '#14b8a6' }} />
                      <span style={{ whiteSpace: 'nowrap' }}>
                        {format12HourTime(m.startTime)} – {format12HourTime(m.endTime)}
                      </span>
                    </div>

                    {/* Metadata Box */}
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
                        <School size={13} style={{ color: '#14b8a6', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                          {m.class ? `${t('onlineClass.classPrefix')} ${m.class.name}` : t('onlineClass.allClasses')}
                        </span>
                        {m.section && (
                          <>
                            <span style={{ color: 'var(--muted-foreground)' }}>•</span>
                            <span>{t('onlineClass.secPrefix')} {m.section.name}</span>
                          </>
                        )}
                        {m.subject && (
                          <>
                            <span style={{ color: 'var(--muted-foreground)' }}>•</span>
                            <span style={{ fontWeight: 600, color: '#6366f1' }}>{m.subject.name}</span>
                          </>
                        )}
                      </div>

                      {/* Host */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <User size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span>{t('onlineClass.hostColon')}</span>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                          {m.host?.name || t('onlineClass.staffHost')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Join CTA */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '0.85rem',
                      marginTop: 'auto',
                    }}
                  >
                    {/* Join Meeting Direct Button */}
                    <a
                      href={m.meetLink || '#'}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.65rem 1rem',
                        borderRadius: '0.65rem',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                        background: isLive
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'rgba(20, 184, 166, 0.12)',
                        color: isLive ? 'white' : '#0f766e',
                        border: isLive ? 'none' : '1px solid rgba(20, 184, 166, 0.25)',
                        boxShadow: isLive ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                      }}
                    >
                      <LinkIcon size={16} />
                      <span>{t('onlineClass.joinMeeting')}</span>
                    </a>

                    {/* Secondary Utility Controls */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <button
                        onClick={() => setDetailsModal({ open: true, meeting: m })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--foreground)',
                          fontSize: '0.775rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={13} />
                        <span>{t('onlineClass.details')}</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleCopyLink(m.meetLink)}
                          title={t('onlineClass.copyMeetingLink')}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--muted-foreground)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Copy size={13} />
                        </button>

                        <button
                          onClick={() => handleOpenScheduleModal(m)}
                          title={t('onlineClass.editSession')}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: '#f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          onClick={() => setDeleteModal({ open: true, id: m.id, title: m.title })}
                          title={t('onlineClass.deleteSession')}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TABLE VIEW */}
        {!loading && paginatedMeetings.length > 0 && viewMode === 'table' && (
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
                  <th style={{ padding: '0.9rem 1.25rem' }}>{t('onlineClass.sessionDetails')}</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>{t('onlineClass.classAndSection')}</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>{t('onlineClass.subject')}</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>{t('onlineClass.host')}</th>
                  <th style={{ padding: '0.9rem 1.25rem', whiteSpace: 'nowrap' }}>{t('onlineClass.date')}</th>
                  <th style={{ padding: '0.9rem 1.25rem', whiteSpace: 'nowrap' }}>{t('onlineClass.timeWindow')}</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>{t('onlineClass.status')}</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>{t('onlineClass.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMeetings.map((m, idx) => {
                  const statusKey = resolveStatus(m);
                  const st = getStatusInfo(statusKey);
                  const isLive = statusKey === 'Live';

                  return (
                    <tr
                      key={m.id || idx}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(20, 184, 166, 0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Session Details */}
                      <td style={{ padding: '1rem 1.25rem', maxWidth: '300px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '9px',
                              background: isLive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(20, 184, 166, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isLive ? '#10b981' : '#14b8a6',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            <Video size={17} />
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
                              title={m.title}
                            >
                              {m.title || t('onlineClass.untitledMeeting')}
                            </div>
                            {m.description && (
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--muted-foreground)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  marginTop: '0.2rem',
                                }}
                                title={m.description}
                              >
                                {m.description}
                              </div>
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
                              background: 'rgba(20, 184, 166, 0.08)',
                              color: '#0f766e',
                              border: '1px solid rgba(20, 184, 166, 0.2)',
                            }}
                          >
                            {m.class?.name ? `${t('onlineClass.classPrefix')} ${m.class.name}` : t('onlineClass.allClasses')}
                          </span>
                          {m.section?.name && (
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
                              {t('onlineClass.secPrefix')} {m.section.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Subject */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <BookOpen size={14} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                            {m.subject?.name || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Host */}
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
                            {m.host?.name || t('onlineClass.staffHost')}
                          </span>
                        </div>
                      </td>

                      {/* Date (strictly single line) */}
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
                              background: 'rgba(20, 184, 166, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Calendar size={13} style={{ color: '#14b8a6' }} />
                          </div>
                          <span style={{ whiteSpace: 'nowrap' }}>{formatDate(m.date)}</span>
                        </div>
                      </td>

                      {/* Time Window (AM/PM strictly single line) */}
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
                          <Clock size={13} style={{ color: 'var(--muted-foreground)' }} />
                          <span style={{ whiteSpace: 'nowrap' }}>
                            {format12HourTime(m.startTime)} – {format12HourTime(m.endTime)}
                          </span>
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
                              boxShadow: isLive ? '0 0 6px #10b981' : 'none',
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
                          {/* Join Link */}
                          <a
                            href={m.meetLink || '#'}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '0.5rem',
                              background: isLive ? '#10b981' : 'rgba(20, 184, 166, 0.1)',
                              color: isLive ? 'white' : '#0f766e',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            <ExternalLink size={13} />
                            <span>{t('onlineClass.join')}</span>
                          </a>

                          {/* View Details */}
                          <button
                            onClick={() => setDetailsModal({ open: true, meeting: m })}
                            title={t('onlineClass.viewDetails')}
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
                            onClick={() => handleOpenScheduleModal(m)}
                            title={t('onlineClass.editClass')}
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
                            onClick={() => setDeleteModal({ open: true, id: m.id, title: m.title })}
                            title={t('onlineClass.deleteClass')}
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
        {!loading && filteredMeetings.length > 0 && (
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
              {t('onlineClass.showing')}{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {Math.min((page - 1) * limit + 1, filteredMeetings.length).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
              </strong>{' '}
              {t('onlineClass.to')}{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {Math.min(page * limit, filteredMeetings.length).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
              </strong>{' '}
              {t('onlineClass.of')}{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                {filteredMeetings.length.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
              </strong>{' '}
              {t('onlineClass.records')}
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
                <span>{t('onlineClass.prev')}</span>
              </button>

              <div
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  padding: '0 0.5rem',
                }}
              >
                {t('onlineClass.page')} {page.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')} {t('onlineClass.of')} {totalPages.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
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
                <span>{t('onlineClass.next')}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SCHEDULE / EDIT MODAL */}
      {scheduleModalOpen && (
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
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(20, 184, 166, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #14b8a6, var(--primary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0,
                  }}
                >
                  <Video size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                    {modalMode === 'edit' ? t('onlineClass.modalEditTitle') : t('onlineClass.modalScheduleTitle')}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: '0.15rem 0 0' }}>
                    {modalMode === 'edit'
                      ? t('onlineClass.modalEditSubtitle')
                      : t('onlineClass.modalScheduleSubtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
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
            <form onSubmit={handleSubmitSchedule} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {t('onlineClass.fieldTitle')} <span style={{ color: 'var(--destructive)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('onlineClass.placeholderTitle')}
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

                {/* Meeting Link */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {t('onlineClass.fieldMeetingLink')} <span style={{ color: 'var(--destructive)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <LinkIcon
                      size={15}
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
                      type="url"
                      required
                      placeholder={t('onlineClass.placeholderMeetingLink')}
                      value={formData.meetLink}
                      onChange={e => setFormData({ ...formData, meetLink: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.4rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>

                {/* Date & Time Window */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem' }}>
                  {/* Date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {t('onlineClass.fieldDate')} <span style={{ color: 'var(--destructive)' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    />
                  </div>

                  {/* Start Time */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {t('onlineClass.fieldStartTime')} <span style={{ color: 'var(--destructive)' }}>*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    />
                  </div>

                  {/* End Time */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {t('onlineClass.fieldEndTime')} <span style={{ color: 'var(--destructive)' }}>*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                </div>

                {/* Class & Section Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Class */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {t('onlineClass.fieldClass')}
                    </label>
                    <select
                      value={formData.classId}
                      onChange={e => setFormData({ ...formData, classId: e.target.value, sectionId: '' })}
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
                      <option value="">{t('onlineClass.allClasses')}</option>
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
                      {t('onlineClass.fieldSection')}
                    </label>
                    <select
                      value={formData.sectionId}
                      onChange={e => setFormData({ ...formData, sectionId: e.target.value })}
                      disabled={!formData.classId}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.875rem',
                        cursor: formData.classId ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <option value="">{t('onlineClass.allSections')}</option>
                      {scheduleClassSections.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject & Host Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Subject */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {t('onlineClass.fieldSubject')}
                    </label>
                    <select
                      value={formData.subjectId}
                      onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
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
                      <option value="">{t('onlineClass.selectSubject')}</option>
                      {availableSubjects.map(sub => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                          {sub.code ? ` (${sub.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Host */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {t('onlineClass.fieldHost')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('onlineClass.placeholderHost')}
                      value={formData.hostName}
                      onChange={e => setFormData({ ...formData, hostName: e.target.value })}
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
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {t('onlineClass.fieldDescription')}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={t('onlineClass.placeholderDescription')}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
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
                  onClick={() => setScheduleModalOpen(false)}
                  disabled={submitting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '0.65rem',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('onlineClass.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '0.65rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #14b8a6, var(--primary))',
                    border: 'none',
                    color: 'white',
                    boxShadow: '0 4px 14px rgba(20, 184, 166, 0.35)',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>{t('onlineClass.saving')}</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{modalMode === 'edit' ? t('onlineClass.saveChanges') : t('onlineClass.scheduleClass')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {detailsModal.open && detailsModal.meeting && (
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
                background: 'rgba(20, 184, 166, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(20, 184, 166, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#14b8a6',
                    flexShrink: 0,
                  }}
                >
                  <Video size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                    {t('onlineClass.detailsTitle')}
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                    {t('onlineClass.detailsSubtitle')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailsModal({ open: false, meeting: null })}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      background: getStatusInfo(resolveStatus(detailsModal.meeting)).bg,
                      color: getStatusInfo(resolveStatus(detailsModal.meeting)).color,
                      border: `1px solid ${getStatusInfo(resolveStatus(detailsModal.meeting)).border}`,
                    }}
                  >
                    {getStatusInfo(resolveStatus(detailsModal.meeting)).label}
                  </span>
                  <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                    {formatDate(detailsModal.meeting.date)}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>
                  {detailsModal.meeting.title || t('onlineClass.untitledMeeting')}
                </h3>
              </div>

              {/* Link CTA Box */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(20, 184, 166, 0.05)',
                  border: '1px solid rgba(20, 184, 166, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      color: '#0f766e',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'block',
                    }}
                  >
                    {t('onlineClass.directMeetingLink')}
                  </span>
                  <a
                    href={detailsModal.meeting.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '0.85rem',
                      color: '#14b8a6',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: '0.2rem',
                    }}
                  >
                    {detailsModal.meeting.meetLink || t('onlineClass.noLinkConfigured')}
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleCopyLink(detailsModal.meeting?.meetLink || '')}
                    title={t('onlineClass.copyMeetingLink')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      color: 'var(--foreground)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedLink ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                    <span>{copiedLink ? t('onlineClass.copied') : t('onlineClass.copy')}</span>
                  </button>
                  <a
                    href={detailsModal.meeting.meetLink || '#'}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '0.5rem 0.9rem',
                      borderRadius: '0.5rem',
                      background: '#10b981',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>{t('onlineClass.join')}</span>
                  </a>
                </div>
              </div>

              {/* Description */}
              {detailsModal.meeting.description && (
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
                    {t('onlineClass.agendaAndInstructions')}
                  </span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--foreground)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {detailsModal.meeting.description}
                  </p>
                </div>
              )}

              {/* Grid Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.65rem',
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', fontWeight: 700 }}>
                    {t('onlineClass.classAndSection')}
                  </span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '0.2rem' }}>
                    {detailsModal.meeting.class?.name ? `${t('onlineClass.classPrefix')} ${detailsModal.meeting.class.name}` : t('onlineClass.allClasses')}{' '}
                    {detailsModal.meeting.section?.name && (
                      <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>
                        ({t('onlineClass.secPrefix')} {detailsModal.meeting.section.name})
                      </span>
                    )}
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
                    {t('onlineClass.subject')}
                  </span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '0.2rem' }}>
                    {detailsModal.meeting.subject?.name || t('onlineClass.generalAcademic')}
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
                    {t('onlineClass.timeWindow')}
                  </span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '0.2rem', whiteSpace: 'nowrap' }}>
                    {format12HourTime(detailsModal.meeting.startTime)} – {format12HourTime(detailsModal.meeting.endTime)}
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
                    {t('onlineClass.host')}
                  </span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '0.2rem' }}>
                    {detailsModal.meeting.host?.name || t('onlineClass.staffHost')}
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
                onClick={() => setDetailsModal({ open: false, meeting: null })}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('onlineClass.close')}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const target = detailsModal.meeting;
                  setDetailsModal({ open: false, meeting: null });
                  if (target) handleOpenScheduleModal(target);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '0.65rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #14b8a6, var(--primary))',
                  border: 'none',
                  color: 'white',
                }}
              >
                <Edit3 size={15} />
                <span>{t('onlineClass.editSessionBtn')}</span>
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
                  {t('onlineClass.deleteModalTitle')}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  {t('onlineClass.cannotBeUndone')}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              {t('onlineClass.deleteConfirmPre')}{' '}
              <strong style={{ color: 'var(--foreground)' }}>&ldquo;{deleteModal.title}&rdquo;</strong>
              {t('onlineClass.deleteConfirmPost')}
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
                {t('onlineClass.cancel')}
              </button>
              <button
                onClick={handleDeleteMeeting}
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
                <span>{deleteLoading ? t('onlineClass.deleting') : t('onlineClass.delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
