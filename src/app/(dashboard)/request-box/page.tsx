"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  Inbox, Plus, AlertCircle, Calendar, Trash2, Loader2,
  Users, CheckCircle2, Clock, AlertTriangle, Search, Filter,
  Download, ChevronDown, ChevronLeft, ChevronRight, FileSpreadsheet,
  FileText, RefreshCw, Eye, Paperclip, X, User, ExternalLink,
  ShieldAlert, Send, ArrowDownLeft, ArrowUpRight, HelpCircle,
  FileCheck, LayoutGrid, Layers, Check, GraduationCap,
  CalendarCheck, FileClock, Building2, DollarSign, Scale,
  Smile, CheckCheck, Sparkles, Upload
} from 'lucide-react';
import { getPdfTools } from '@/lib/pdf';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

interface UserBrief {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  avatar?: string | null;
  designation?: string | null;
}

interface RequestComplaintItem {
  id: string;
  schoolId: string;
  senderId: string;
  recipientId: string;
  targetRole?: string | null;
  type: 'REQUEST' | 'COMPLAINT';
  category: 'ACADEMIC' | 'ATTENDANCE' | 'LEAVE' | 'FACILITY' | 'FEE' | 'DISCIPLINE' | 'BEHAVIOR' | 'EXAM' | 'OTHER' | string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  attachments: string[];
  resolutionNote?: string | null;
  resolvedById?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  sender?: UserBrief | null;
  recipient?: UserBrief | null;
  resolvedBy?: UserBrief | null;
}

// 9 Valid Backend Category Enums
const CATEGORIES = [
  { value: 'ACADEMIC', label: 'Academic', desc: 'Curriculum, classes, books, grading' },
  { value: 'ATTENDANCE', label: 'Attendance', desc: 'Attendance records, discrepancies' },
  { value: 'LEAVE', label: 'Leave', desc: 'Leave of absence, sick leave, vacations' },
  { value: 'FACILITY', label: 'Facility', desc: 'Campus facilities, labs, classrooms, equipment' },
  { value: 'FEE', label: 'Fee / Financial', desc: 'Tuition fees, dues, payment plans, accounts' },
  { value: 'DISCIPLINE', label: 'Discipline', desc: 'Code of conduct, policy violations' },
  { value: 'BEHAVIOR', label: 'Behavior', desc: 'Student conduct or interpersonal issues' },
  { value: 'EXAM', label: 'Exam', desc: 'Exam schedules, hall tickets, marks, results' },
  { value: 'OTHER', label: 'Other', desc: 'General queries and miscellaneous matters' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)' },
  { value: 'MEDIUM', label: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)' },
  { value: 'HIGH', label: 'High', color: '#f97316', bg: 'rgba(249, 115, 22, 0.08)', border: 'rgba(249, 115, 22, 0.25)' },
  { value: 'URGENT', label: 'Urgent', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  PENDING: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)', icon: RefreshCw },
  RESOLVED: { label: 'Resolved', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)', icon: AlertCircle },
};

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  ACADEMIC: { label: 'Academic', icon: GraduationCap, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)' },
  ATTENDANCE: { label: 'Attendance', icon: CalendarCheck, color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.08)' },
  LEAVE: { label: 'Leave', icon: FileClock, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)' },
  FACILITY: { label: 'Facility', icon: Building2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
  FEE: { label: 'Fee / Financial', icon: DollarSign, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
  DISCIPLINE: { label: 'Discipline', icon: Scale, color: '#f97316', bg: 'rgba(249, 115, 22, 0.08)' },
  BEHAVIOR: { label: 'Behavior', icon: Smile, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.08)' },
  EXAM: { label: 'Exam', icon: FileSpreadsheet, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' },
  OTHER: { label: 'Other', icon: HelpCircle, color: '#64748b', bg: 'rgba(100, 116, 139, 0.08)' },
};

export default function RequestBoxPage() {
  const { t, language } = useLanguage();

  // Core Data State
  const [items, setItems] = useState<RequestComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Filters & Search
  const [scope, setScope] = useState<'all' | 'received' | 'sent'>('all');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Available Users for recipient selection
  const [availableRecipients, setAvailableRecipients] = useState<UserBrief[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RequestComplaintItem | null>(null);

  // Delete modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<RequestComplaintItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create Form State
  const [formType, setFormType] = useState<'REQUEST' | 'COMPLAINT'>('REQUEST');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('LEAVE');
  const [formPriority, setFormPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [formRecipientId, setFormRecipientId] = useState('');
  const [formAttachments, setFormAttachments] = useState<string[]>([]);
  const [customAttachmentUrl, setCustomAttachmentUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Status Update State in Detail Modal
  const [newStatus, setNewStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'>('PENDING');
  const [resolutionNote, setResolutionNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Date Formatting Helper
  const formatDate = useCallback((dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, [language]);

  const formatTime = useCallback((dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }, [language]);

  // Auth & School ID Helpers
  const getApiToken = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('access_token') ||
      ''
    );
  }, []);

  const getSchoolId = useCallback(() => {
    try {
      const token = getApiToken();
      if (!token) return '';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return (payload.schoolId as string) || '';
    } catch {
      return '';
    }
  }, [getApiToken]);

  // Toast Auto-Dismiss
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Click outside export dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch recipients list
  const fetchRecipients = useCallback(async () => {
    const token = getApiToken();
    if (!token) return;
    setLoadingRecipients(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users?limit=100`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        const usersList: any[] = json.data?.data || json.data || [];
        const formatted: UserBrief[] = usersList.map(u => ({
          id: u.id,
          name: u.name || 'User',
          email: u.email || '',
          role: u.role || 'Staff',
          phone: u.phone,
          avatar: u.avatar,
          designation: u.designation
        }));
        setAvailableRecipients(formatted);
      }
    } catch (e) {
      console.error('Failed to fetch recipients', e);
    } finally {
      setLoadingRecipients(false);
    }
  }, [getApiToken]);

  // Fetch Items
  const fetchItems = useCallback(async () => {
    const token = getApiToken();
    if (!token) {
      setErrorMsg('Not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const schoolId = getSchoolId();
      const params = new URLSearchParams();

      if (filterType !== 'ALL') params.append('type', filterType);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterPriority !== 'ALL') params.append('priority', filterPriority);
      if (filterCategory !== 'ALL') params.append('category', filterCategory);
      if (scope !== 'all') params.append('scope', scope);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (schoolId) params.append('schoolId', schoolId);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const res = await fetch(`${API_BASE_URL}/request-complaints?${params.toString()}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || `Failed to fetch records (${res.status})`);
      }

      const json = await res.json();
      const payload = json.data || {};
      const dataList: RequestComplaintItem[] = payload.data || [];
      setItems(dataList);
      setTotalCount(payload.total ?? dataList.length);
      setTotalPages(payload.totalPages ?? Math.max(1, Math.ceil((payload.total ?? dataList.length) / limit)));
    } catch (err: any) {
      console.error('Fetch error:', err);
      setErrorMsg(err.message || 'Failed to load requests & complaints');
    } finally {
      setLoading(false);
    }
  }, [getApiToken, getSchoolId, filterType, filterStatus, filterPriority, filterCategory, scope, debouncedSearch, page, limit]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  // Form Submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTitle.trim()) {
      setFormError('Please enter a descriptive title.');
      return;
    }
    if (formTitle.trim().length < 3) {
      setFormError('Title must be at least 3 characters long.');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Please enter detailed description.');
      return;
    }
    if (formDescription.trim().length < 5) {
      setFormError('Description must be at least 5 characters long.');
      return;
    }
    if (!formRecipientId) {
      setFormError('Please select a recipient.');
      return;
    }

    const token = getApiToken();
    const schoolId = getSchoolId();

    if (!token) {
      setFormError('Authentication required. Please re-login.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type: formType,
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        priority: formPriority,
        recipientId: formRecipientId,
        attachments: formAttachments,
        schoolId: schoolId || undefined
      };

      const res = await fetch(`${API_BASE_URL}/request-complaints`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.statusCode >= 400) {
        const msg = Array.isArray(json?.message) ? json.message.join(', ') : json?.message || 'Failed to create record';
        throw new Error(msg);
      }

      setToastMsg(formType === 'REQUEST' ? 'Request submitted successfully!' : 'Complaint submitted successfully!');
      setIsCreateOpen(false);
      resetCreateForm();
      fetchItems();
    } catch (err: any) {
      setFormError(err.message || 'Error creating request/complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setFormType('REQUEST');
    setFormTitle('');
    setFormDescription('');
    setFormCategory('LEAVE');
    setFormPriority('MEDIUM');
    setFormRecipientId('');
    setFormAttachments([]);
    setCustomAttachmentUrl('');
    setFormError('');
  };

  // Upload attachment file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = getApiToken();
    const formData = new FormData();
    formData.append('file', file);

    setUploadingFile(true);
    try {
      const res = await fetch(`${API_BASE_URL}/general/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.statusCode === 200 && json?.data?.url) {
        setFormAttachments(prev => [...prev, json.data.url]);
      } else {
        alert('File upload failed: ' + (json?.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('File upload error', err);
      alert('Error uploading file attachment.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const addCustomAttachment = () => {
    if (!customAttachmentUrl.trim()) return;
    setFormAttachments(prev => [...prev, customAttachmentUrl.trim()]);
    setCustomAttachmentUrl('');
  };

  const removeAttachment = (index: number) => {
    setFormAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Status Update
  const handleStatusUpdate = async () => {
    if (!selectedItem) return;
    const token = getApiToken();
    if (!token) return;

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/request-complaints/${selectedItem.id}/status`, {
        method: 'PATCH',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          resolutionNote: resolutionNote.trim() || undefined
        })
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.statusCode >= 400) {
        throw new Error(json?.message || 'Failed to update status.');
      }

      setToastMsg('Status and resolution updated successfully!');
      if (json.data) {
        setSelectedItem(json.data);
      }
      fetchItems();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete Item
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const token = getApiToken();
    if (!token) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/request-complaints/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || 'Failed to delete record.');
      }

      setToastMsg('Record deleted successfully!');
      setIsDeleteOpen(false);
      setItemToDelete(null);
      if (selectedItem?.id === itemToDelete.id) {
        setIsDetailOpen(false);
        setSelectedItem(null);
      }
      fetchItems();
    } catch (err: any) {
      alert(err.message || 'Error deleting request/complaint');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDetails = (item: RequestComplaintItem) => {
    setSelectedItem(item);
    setNewStatus(item.status);
    setResolutionNote(item.resolutionNote || '');
    setIsDetailOpen(true);
  };

  // CSV Export
  const exportToCSV = () => {
    if (!items.length) {
      alert('No data to export.');
      return;
    }
    const headers = ['Type', 'Category', 'Title', 'Priority', 'Status', 'Sender', 'Recipient', 'Created Date'];
    const rows = items.map(i => [
      i.type,
      i.category,
      `"${i.title.replace(/"/g, '""')}"`,
      i.priority,
      i.status,
      `"${(i.sender?.name || 'Unknown').replace(/"/g, '""')}"`,
      `"${(i.recipient?.name || 'Unknown').replace(/"/g, '""')}"`,
      formatDate(i.createdAt)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `request_box_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  // PDF Export
  const exportToPDF = async () => {
    if (!items.length) {
      alert('No data to export.');
      return;
    }
    try {
      setShowExportMenu(false);
      const { jsPDF, autoTable } = await getPdfTools();
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text('Smart School – Request & Complaint Records', 14, 16);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const dateGenerated = new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      doc.text(`Generated on: ${dateGenerated} | Total Records: ${items.length}`, 14, 23);

      const tableData = items.map((i, idx) => [
        idx + 1,
        i.type,
        i.title,
        i.category,
        i.priority,
        i.status,
        i.sender?.name || 'N/A',
        i.recipient?.name || 'N/A',
        formatDate(i.createdAt)
      ]);

      autoTable(doc, {
        head: [['#', 'Type', 'Title', 'Category', 'Priority', 'Status', 'Sender', 'Recipient', 'Date']],
        body: tableData,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`request_box_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('Failed to generate PDF document.');
    }
  };

  // Metric Computations
  const stats = useMemo(() => {
    const total = totalCount;
    let reqCount = 0;
    let compCount = 0;
    let pendingCount = 0;
    let resolvedCount = 0;

    items.forEach(item => {
      if (item.type === 'REQUEST') reqCount++;
      if (item.type === 'COMPLAINT') compCount++;
      if (item.status === 'PENDING') pendingCount++;
      if (item.status === 'RESOLVED') resolvedCount++;
    });

    const pendingPct = total > 0 ? Math.round((pendingCount / total) * 100) : 0;
    const resolvedPct = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

    return { total, reqCount, compCount, pendingCount, resolvedCount, pendingPct, resolvedPct };
  }, [items, totalCount]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'ALL') count++;
    if (filterStatus !== 'ALL') count++;
    if (filterPriority !== 'ALL') count++;
    if (filterCategory !== 'ALL') count++;
    if (scope !== 'all') count++;
    return count;
  }, [filterType, filterStatus, filterPriority, filterCategory, scope]);

  const clearFilters = () => {
    setScope('all');
    setFilterType('ALL');
    setFilterStatus('ALL');
    setFilterPriority('ALL');
    setFilterCategory('ALL');
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
  };

  const renderCategoryBadge = (catVal: string) => {
    const meta = CATEGORY_MAP[catVal] || CATEGORY_MAP.OTHER;
    const IconComponent = meta.icon;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.2rem 0.55rem',
          borderRadius: '9999px',
          fontSize: '0.725rem',
          fontWeight: 700,
          background: meta.bg,
          color: meta.color,
          border: `1px solid ${meta.color}35`,
          whiteSpace: 'nowrap',
        }}
      >
        <IconComponent size={12} />
        <span>{meta.label}</span>
      </span>
    );
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  return (
    <div
      className="page-container animate-fade-in"
      style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}
    >
      {/* Toast Feedback Banner */}
      {toastMsg && (
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
            <span>{toastMsg}</span>
          </div>
          <button
            onClick={() => setToastMsg('')}
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
      <div
        style={{
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: 'var(--foreground)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              {t('requestBox.title') || 'Request Box'}
            </h1>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                background: 'rgba(79, 70, 229, 0.1)',
                color: 'var(--primary)',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Official Desk
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', margin: '0.35rem 0 0' }}>
            {t('requestBox.subtitle') || 'Submit, track, and manage official requests and complaints with administrative resolution workflow'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchItems()}
            disabled={loading}
            title="Refresh records"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 0.95rem',
              borderRadius: '0.65rem',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--foreground)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span className="hidden sm:inline">{t('common.refresh') || 'Refresh'}</span>
          </button>

          <button
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.65rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={16} />
            <span>{t('requestBox.new') || 'New Request / Complaint'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
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
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg('')}
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

      {/* 5-Stat Metric Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Total Submissions */}
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
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Total Records
            </span>
            <div
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: 'var(--foreground)',
                marginTop: '0.25rem',
              }}
            >
              {stats.total.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
              All submissions logged
            </span>
          </div>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              flexShrink: 0,
            }}
          >
            <Inbox size={22} />
          </div>
        </div>

        {/* Requests */}
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
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Requests
            </span>
            <div
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: '#6366f1',
                marginTop: '0.25rem',
              }}
            >
              {stats.reqCount.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
              Formal institutional requests
            </span>
          </div>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366f1',
              flexShrink: 0,
            }}
          >
            <FileCheck size={22} />
          </div>
        </div>

        {/* Complaints */}
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
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Complaints
            </span>
            <div
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: '#f43f5e',
                marginTop: '0.25rem',
              }}
            >
              {stats.compCount.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
              Reported grievances & issues
            </span>
          </div>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(244, 63, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f43f5e',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={22} />
          </div>
        </div>

        {/* Pending Action */}
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
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Pending Review
            </span>
            <div
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: '#f59e0b',
                marginTop: '0.25rem',
              }}
            >
              {stats.pendingCount.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
              Awaiting administrative action
            </span>
          </div>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              flexShrink: 0,
            }}
          >
            <Clock size={22} />
          </div>
        </div>

        {/* Resolved */}
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
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Resolved
            </span>
            <div
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: '#10b981',
                marginTop: '0.25rem',
              }}
            >
              {stats.resolvedCount.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
              Completed & addressed
            </span>
          </div>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={22} />
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
        {/* Integrated Toolbar Header */}
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
          {/* Left: Scope Tabs & Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 360px' }}>
            {/* Scope Pill Tabs */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '0.65rem',
                padding: '3px',
              }}
            >
              <button
                onClick={() => { setScope('all'); setPage(1); }}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: scope === 'all' ? 'var(--primary)' : 'transparent',
                  color: scope === 'all' ? 'white' : 'var(--muted-foreground)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                {t('requestBox.all') || 'All'}
              </button>
              <button
                onClick={() => { setScope('received'); setPage(1); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: scope === 'received' ? 'var(--primary)' : 'transparent',
                  color: scope === 'received' ? 'white' : 'var(--muted-foreground)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                <ArrowDownLeft size={13} />
                <span>{t('requestBox.received') || 'Received'}</span>
              </button>
              <button
                onClick={() => { setScope('sent'); setPage(1); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: scope === 'sent' ? 'var(--primary)' : 'transparent',
                  color: scope === 'sent' ? 'white' : 'var(--muted-foreground)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                <ArrowUpRight size={13} />
                <span>{t('requestBox.sent') || 'Sent'}</span>
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '380px' }}>
              <Search
                size={16}
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
                placeholder={t('requestBox.searchPlaceholder') || 'Search by title, description...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 2.2rem 0.6rem 2.3rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.85rem',
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
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 0.9rem',
                borderRadius: '0.65rem',
                border: activeFiltersCount > 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: activeFiltersCount > 0 ? 'rgba(79, 70, 229, 0.08)' : 'var(--background)',
                color: activeFiltersCount > 0 ? 'var(--primary)' : 'var(--foreground)',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Filter size={14} />
              <span>{t('common.filter') || 'Filters'}</span>
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle */}
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
                  padding: '0.55rem 0.9rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Download size={14} />
                <span>Export</span>
                <ChevronDown size={13} />
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
                    onClick={exportToCSV}
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
                    onClick={exportToPDF}
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
              <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
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
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
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
            {/* Type */}
            <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  color: 'var(--muted-foreground)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Type
              </label>
              <select
                value={filterType}
                onChange={e => { setFilterType(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.825rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Types</option>
                <option value="REQUEST">Requests Only</option>
                <option value="COMPLAINT">Complaints Only</option>
              </select>
            </div>

            {/* Status */}
            <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  color: 'var(--muted-foreground)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Status
              </label>
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.825rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Priority */}
            <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                style={{
                  fontSize: '0.725rem',
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
                onChange={e => { setFilterPriority(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.825rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Category */}
            <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  color: 'var(--muted-foreground)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Category
              </label>
              <select
                value={filterCategory}
                onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.825rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                style={{
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0 0.9rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#ef4444',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        {loading ? (
          <div
            style={{
              padding: '5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted-foreground)',
            }}
          >
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', marginBottom: '1rem' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>Loading requests & complaints...</p>
            <p style={{ fontSize: '0.8rem' }}>Please wait while records are synchronized</p>
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: '4.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(79, 70, 229, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                marginBottom: '1rem',
              }}
            >
              <Inbox size={32} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)', margin: '0 0 0.4rem' }}>
              No records found
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', maxWidth: '420px', lineHeight: 1.5, margin: 0 }}>
              {activeFiltersCount > 0 || debouncedSearch
                ? 'No items match your active search and filter filters. Try clearing filters to see all submissions.'
                : 'Your request box is currently empty. Click below to submit an official request or lodge a complaint.'}
            </p>
            {activeFiltersCount > 0 || debouncedSearch ? (
              <button
                onClick={clearFilters}
                style={{
                  marginTop: '1.25rem',
                  padding: '0.55rem 1rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={() => { resetCreateForm(); setIsCreateOpen(true); }}
                className="btn btn-primary"
                style={{
                  marginTop: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1.15rem',
                  borderRadius: '0.65rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                <span>Create First Request</span>
              </button>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards View */
          <div
            style={{
              padding: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {items.map(item => {
              const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = statusMeta.icon;
              const priorityMeta = PRIORITIES.find(p => p.value === item.priority) || PRIORITIES[0];
              const isRequest = item.type === 'REQUEST';

              return (
                <div
                  key={item.id}
                  onClick={() => openDetails(item)}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '1rem',
                    padding: '1.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.9rem',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.35)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  {/* Top Bar: Type Pill, Priority, Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          letterSpacing: '0.04em',
                          background: isRequest ? 'rgba(99, 102, 241, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                          color: isRequest ? '#6366f1' : '#f43f5e',
                          border: isRequest ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid rgba(244, 63, 94, 0.25)',
                        }}
                      >
                        {item.type}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          color: priorityMeta.color,
                          background: priorityMeta.bg,
                          border: `1px solid ${priorityMeta.border}`,
                        }}
                      >
                        {item.priority}
                      </span>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        color: statusMeta.color,
                        background: statusMeta.bg,
                        border: `1px solid ${statusMeta.border}`,
                      }}
                    >
                      <StatusIcon size={12} />
                      <span>{statusMeta.label}</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: 'var(--foreground)',
                        lineHeight: 1.35,
                        margin: '0 0 0.35rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.title}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.825rem',
                        color: 'var(--muted-foreground)',
                        lineHeight: 1.5,
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.description}
                    </p>
                  </div>

                  {/* Category & Attachments */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {renderCategoryBadge(item.category)}
                    {item.attachments && item.attachments.length > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.725rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          color: 'var(--primary)',
                          background: 'rgba(79, 70, 229, 0.08)',
                        }}
                      >
                        <Paperclip size={12} />
                        <span>{item.attachments.length} attachment{item.attachments.length > 1 ? 's' : ''}</span>
                      </span>
                    )}
                  </div>

                  {/* Resolution note callout if exists */}
                  {item.resolutionNote && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.45rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        color: '#10b981',
                        fontSize: '0.75rem',
                      }}
                    >
                      <CheckCheck size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong>Note:</strong> {item.resolutionNote}
                      </span>
                    </div>
                  )}

                  {/* Dual Mini Cards: Sender & Assigned Recipient */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                      padding: '0.65rem 0.8rem',
                      borderRadius: '0.65rem',
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {/* Sender */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary), #818cf8)',
                          color: 'white',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {item.sender?.avatar ? (
                          <img src={item.sender.avatar} alt="Sender" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          getInitials(item.sender?.name)
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                          From
                        </span>
                        <span
                          style={{
                            fontSize: '0.775rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                        >
                          {item.sender?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Recipient */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #10b981, #34d399)',
                          color: 'white',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {item.recipient?.avatar ? (
                          <img src={item.recipient.avatar} alt="Recipient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          getInitials(item.recipient?.name)
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                          To
                        </span>
                        <span
                          style={{
                            fontSize: '0.775rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                        >
                          {item.recipient?.name || 'Assigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Date & Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.4rem',
                      borderTop: '1px solid var(--border)',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      <Calendar size={13} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 500 }}>{formatDate(item.createdAt)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        onClick={() => openDetails(item)}
                        title="View Details"
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
                      <button
                        onClick={() => {
                          setItemToDelete(item);
                          setIsDeleteOpen(true);
                        }}
                        title="Delete Record"
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
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--background)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  <th style={{ padding: '0.9rem 1.25rem' }}>Type</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Title & Category</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Priority</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Sender</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Recipient</th>
                  <th style={{ padding: '0.9rem 1.25rem', whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusMeta.icon;
                  const priorityMeta = PRIORITIES.find(p => p.value === item.priority) || PRIORITIES[0];
                  const isRequest = item.type === 'REQUEST';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => openDetails(item)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79, 70, 229, 0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Type */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: isRequest ? 'rgba(99, 102, 241, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                            color: isRequest ? '#6366f1' : '#f43f5e',
                            border: isRequest ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid rgba(244, 63, 94, 0.25)',
                          }}
                        >
                          {item.type}
                        </span>
                      </td>

                      {/* Title & Category */}
                      <td style={{ padding: '1rem 1.25rem', maxWidth: '300px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </div>
                        <div style={{ marginTop: '0.35rem' }}>
                          {renderCategoryBadge(item.category)}
                        </div>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            color: priorityMeta.color,
                            background: priorityMeta.bg,
                            border: `1px solid ${priorityMeta.border}`,
                          }}
                        >
                          {item.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            color: statusMeta.color,
                            background: statusMeta.bg,
                            border: `1px solid ${statusMeta.border}`,
                          }}
                        >
                          <StatusIcon size={12} />
                          <span>{statusMeta.label}</span>
                        </span>
                      </td>

                      {/* Sender */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--primary), #818cf8)',
                              color: 'white',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {item.sender?.avatar ? (
                              <img src={item.sender.avatar} alt="Sender" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              getInitials(item.sender?.name)
                            )}
                          </div>
                          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                            {item.sender?.name || 'Unknown'}
                          </span>
                        </div>
                      </td>

                      {/* Recipient */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #10b981, #34d399)',
                              color: 'white',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {item.recipient?.avatar ? (
                              <img src={item.recipient.avatar} alt="Recipient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              getInitials(item.recipient?.name)
                            )}
                          </div>
                          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                            {item.recipient?.name || 'Assigned'}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                          <Calendar size={13} style={{ color: 'var(--primary)' }} />
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => openDetails(item)}
                            title="View Details"
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
                          <button
                            onClick={() => {
                              setItemToDelete(item);
                              setIsDeleteOpen(true);
                            }}
                            title="Delete"
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
        {!loading && items.length > 0 && (
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
              Showing <strong style={{ color: 'var(--foreground)' }}>{(page - 1) * limit + 1}</strong> to{' '}
              <strong style={{ color: 'var(--foreground)' }}>{Math.min(page * limit, totalCount)}</strong> of{' '}
              <strong style={{ color: 'var(--foreground)' }}>{totalCount}</strong> records
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: page === 1 ? 'var(--muted-foreground)' : 'var(--foreground)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.6 : 1,
                }}
              >
                <ChevronLeft size={15} />
                <span>Previous</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <React.Fragment key={p}>
                      {prev && p - prev > 1 && <span style={{ color: 'var(--muted-foreground)', padding: '0 0.25rem' }}>…</span>}
                      <button
                        onClick={() => setPage(p)}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '0.5rem',
                          border: page === p ? 'none' : '1px solid var(--border)',
                          background: page === p ? 'var(--primary)' : 'var(--background)',
                          color: page === p ? 'white' : 'var(--foreground)',
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: page === totalPages ? 'var(--muted-foreground)' : 'var(--foreground)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.6 : 1,
                }}
              >
                <span>Next</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="modal-overlay animate-fade-in">
          <div
            className="modal-content"
            style={{
              maxWidth: '680px',
              width: '100%',
              borderRadius: '1.25rem',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
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
                background: 'rgba(79, 70, 229, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: formType === 'REQUEST' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'linear-gradient(135deg, #e11d48, #f43f5e)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {formType === 'REQUEST' ? <FileCheck size={20} /> : <ShieldAlert size={20} />}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                    {formType === 'REQUEST' ? 'Submit New Request' : 'Lodge Official Complaint'}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: '0.15rem 0 0' }}>
                    {formType === 'REQUEST'
                      ? 'Submit an official academic, leave, or facility request to the administration'
                      : 'Report an issue, misconduct, or formal grievance with recipient tracking'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
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

            {/* Modal Form Scrollable */}
            <form onSubmit={handleCreateSubmit} style={{ padding: '1.5rem', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {formError && (
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '0.65rem',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#ef4444',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Submission Type Switcher (Card-style interactive tabs) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    Submission Type <span style={{ color: 'var(--destructive)' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {/* Request Option Card */}
                    <div
                      onClick={() => setFormType('REQUEST')}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '0.75rem',
                        border: formType === 'REQUEST' ? '2px solid #6366f1' : '1px solid var(--border)',
                        background: formType === 'REQUEST' ? 'rgba(99, 102, 241, 0.08)' : 'var(--background)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: formType === 'REQUEST' ? '#6366f1' : 'var(--muted)',
                          color: formType === 'REQUEST' ? 'white' : 'var(--muted-foreground)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FileCheck size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: formType === 'REQUEST' ? '#6366f1' : 'var(--foreground)' }}>
                          Formal Request
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Leave, approvals, permissions
                        </div>
                      </div>
                      {formType === 'REQUEST' && (
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={12} />
                        </div>
                      )}
                    </div>

                    {/* Complaint Option Card */}
                    <div
                      onClick={() => setFormType('COMPLAINT')}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '0.75rem',
                        border: formType === 'COMPLAINT' ? '2px solid #f43f5e' : '1px solid var(--border)',
                        background: formType === 'COMPLAINT' ? 'rgba(244, 63, 94, 0.08)' : 'var(--background)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: formType === 'COMPLAINT' ? '#f43f5e' : 'var(--muted)',
                          color: formType === 'COMPLAINT' ? 'white' : 'var(--muted-foreground)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <ShieldAlert size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: formType === 'COMPLAINT' ? '#f43f5e' : 'var(--foreground)' }}>
                          Official Complaint
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Disputes, misconduct, facility issues
                        </div>
                      </div>
                      {formType === 'COMPLAINT' && (
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#f43f5e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    Title <span style={{ color: 'var(--destructive)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formType === 'REQUEST' ? 'e.g. Leave request for medical reasons' : 'e.g. Classroom projector malfunction in Lab 3'}
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
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

                {/* Category & Priority Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Category */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      Category <span style={{ color: 'var(--destructive)' }}>*</span>
                    </label>
                    <select
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label} ({c.desc})</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      Priority Level
                    </label>
                    <select
                      value={formPriority}
                      onChange={e => setFormPriority(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: PRIORITIES.find(p => p.value === formPriority)?.color || 'var(--foreground)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {PRIORITIES.map(p => (
                        <option key={p.value} value={p.value}>{p.label} Priority</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Recipient Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      Designated Recipient <span style={{ color: 'var(--destructive)' }}>*</span>
                    </label>
                    {loadingRecipients && (
                      <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>Loading staff list...</span>
                    )}
                  </div>
                  <select
                    value={formRecipientId}
                    onChange={e => setFormRecipientId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    <option value="">-- Select Recipient (Admin / Teacher / Staff) --</option>
                    {availableRecipients.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.role || 'Staff'} {u.designation ? `(${u.designation})` : ''} ({u.email})
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>Or enter UUID manually:</span>
                    <input
                      type="text"
                      placeholder="e.g. da0c3fff-ae59-46a3-a037-19fa68003c6b"
                      value={formRecipientId}
                      onChange={e => setFormRecipientId(e.target.value.trim())}
                      style={{
                        flex: 1,
                        padding: '0.35rem 0.6rem',
                        borderRadius: '0.35rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                      }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    Detailed Description <span style={{ color: 'var(--destructive)' }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide full description, reason, dates, or relevant background details..."
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.85rem',
                      resize: 'vertical',
                      lineHeight: 1.5,
                    }}
                  />
                  <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                    Minimum 5 characters required for administrative review.
                  </span>
                </div>

                {/* Attachments Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    Attachments & Documents (Optional)
                  </label>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.55rem 0.95rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: uploadingFile ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Upload size={14} style={{ animation: uploadingFile ? 'spin 1s linear infinite' : 'none' }} />
                      <span>{uploadingFile ? 'Uploading...' : 'Upload Document / Image'}</span>
                      <input
                        type="file"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1 1 240px' }}>
                      <input
                        type="url"
                        placeholder="Or paste external file URL..."
                        value={customAttachmentUrl}
                        onChange={e => setCustomAttachmentUrl(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          background: 'var(--background)',
                          color: 'var(--foreground)',
                          fontSize: '0.8rem',
                        }}
                      />
                      <button
                        type="button"
                        onClick={addCustomAttachment}
                        style={{
                          padding: '0.5rem 0.85rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          background: 'var(--background)',
                          color: 'var(--foreground)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Attached List */}
                  {formAttachments.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        marginTop: '0.4rem',
                        padding: '0.6rem',
                        borderRadius: '0.5rem',
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {formAttachments.map((url, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '0.35rem',
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            fontSize: '0.775rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                            <Paperclip size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                              {url}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(i)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
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
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting || uploadingFile}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '0.65rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Submit {formType === 'REQUEST' ? 'Request' : 'Complaint'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS & STATUS RESOLUTION MODAL */}
      {isDetailOpen && selectedItem && (
        <div className="modal-overlay animate-fade-in">
          <div
            className="modal-content"
            style={{
              maxWidth: '680px',
              width: '100%',
              borderRadius: '1.25rem',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    background: selectedItem.type === 'REQUEST' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                    color: selectedItem.type === 'REQUEST' ? '#6366f1' : '#f43f5e',
                    border: selectedItem.type === 'REQUEST' ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid rgba(244, 63, 94, 0.25)',
                  }}
                >
                  {selectedItem.type}
                </span>
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                    color: PRIORITIES.find(p => p.value === selectedItem.priority)?.color || 'inherit',
                    background: PRIORITIES.find(p => p.value === selectedItem.priority)?.bg || 'transparent',
                    border: `1px solid ${PRIORITIES.find(p => p.value === selectedItem.priority)?.border || 'transparent'}`,
                  }}
                >
                  {selectedItem.priority}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px',
                    color: STATUS_CONFIG[selectedItem.status]?.color || 'inherit',
                    background: STATUS_CONFIG[selectedItem.status]?.bg || 'transparent',
                    border: `1px solid ${STATUS_CONFIG[selectedItem.status]?.border || 'transparent'}`,
                  }}
                >
                  {STATUS_CONFIG[selectedItem.status]?.label || selectedItem.status}
                </span>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
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
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Category & Title */}
              <div>
                <div style={{ marginBottom: '0.4rem' }}>
                  {renderCategoryBadge(selectedItem.category)}
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--foreground)', margin: '0 0 0.35rem', lineHeight: 1.3 }}>
                  {selectedItem.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  <Calendar size={14} style={{ color: 'var(--primary)' }} />
                  <span>Submitted on {formatDate(selectedItem.createdAt)} at {formatTime(selectedItem.createdAt)}</span>
                </div>
              </div>

              {/* Sender & Recipient Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Sender Card */}
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '0.75rem',
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
                    Sender Information
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), #818cf8)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      {selectedItem.sender?.avatar ? (
                        <img src={selectedItem.sender.avatar} alt="Sender" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        getInitials(selectedItem.sender?.name)
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedItem.sender?.name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        {selectedItem.sender?.role || 'User'}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedItem.sender?.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recipient Card */}
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '0.75rem',
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
                    Assigned Recipient
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #34d399)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      {selectedItem.recipient?.avatar ? (
                        <img src={selectedItem.recipient.avatar} alt="Recipient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        getInitials(selectedItem.recipient?.name)
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedItem.recipient?.name || 'Assigned Staff'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        {selectedItem.recipient?.role || 'Staff'} {selectedItem.recipient?.designation ? `· ${selectedItem.recipient.designation}` : ''}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedItem.recipient?.email}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Description */}
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
                  Description Details
                </span>
                <p style={{ fontSize: '0.875rem', color: 'var(--foreground)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {selectedItem.description}
                </p>
              </div>

              {/* Attachments */}
              {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
                    Attached Files ({selectedItem.attachments.length})
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                    {selectedItem.attachments.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '0.5rem',
                          background: 'var(--background)',
                          border: '1px solid var(--border)',
                          color: 'var(--foreground)',
                          textDecoration: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                          <Paperclip size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {url.split('/').pop() || 'Attachment'}
                          </span>
                        </div>
                        <ExternalLink size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0, marginLeft: '0.4rem' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Resolution Note if any */}
              {selectedItem.resolutionNote && (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                      Official Resolution Note
                    </span>
                    {selectedItem.resolvedAt && (
                      <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                        Resolved on {formatDate(selectedItem.resolvedAt)}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--foreground)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {selectedItem.resolutionNote}
                  </p>
                  {selectedItem.resolvedBy && (
                    <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', display: 'block', marginTop: '0.4rem' }}>
                      Resolved by: {selectedItem.resolvedBy.name}
                    </span>
                  )}
                </div>
              )}

              {/* Admin Status & Resolution Workflow */}
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(79, 70, 229, 0.03)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.9rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    Administrative Resolution Workflow
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.3rem' }}>
                      Update Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        color: 'var(--foreground)',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.3rem' }}>
                      Resolution Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Leave approved for requested dates"
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        color: 'var(--foreground)',
                        fontSize: '0.825rem',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={isUpdatingStatus}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.55rem 1.1rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isUpdatingStatus ? (
                      <>
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Update Status & Save Note</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderTop: '1px solid var(--border)',
              }}
            >
              <button
                onClick={() => {
                  setItemToDelete(selectedItem);
                  setIsDeleteOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.95rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#ef4444',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={14} />
                <span>Delete Record</span>
              </button>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="btn"
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && itemToDelete && (
        <div className="modal-overlay animate-fade-in">
          <div
            className="modal-content"
            style={{
              maxWidth: '460px',
              width: '100%',
              borderRadius: '1.25rem',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ef4444' }}>
                <AlertTriangle size={20} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                  Confirm Deletion
                </h3>
              </div>
              <button
                onClick={() => setIsDeleteOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted-foreground)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', margin: '0 0 1rem', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this {itemToDelete.type.toLowerCase()}?
              </p>
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '0.65rem',
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {itemToDelete.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
                  Category: {itemToDelete.category} · Priority: {itemToDelete.priority}
                </div>
              </div>
              <p style={{ fontSize: '0.775rem', color: '#ef4444', fontWeight: 600, margin: 0 }}>
                This action cannot be undone.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isDeleting}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: '#ef4444',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Permanently</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scoped CSS for Modals & Micro-interactions */}
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1.5rem;
        }

        .modal-content {
          animation: modal-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes modal-pop {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
