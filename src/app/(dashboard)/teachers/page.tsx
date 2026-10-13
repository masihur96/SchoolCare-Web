"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  Search, Plus, Edit3, Trash2, Eye, EyeOff, Filter,
  ChevronLeft, ChevronRight, Loader2, X, Upload, AlertTriangle,
  Download, Phone, BookOpen, Layers, CheckCircle2, Users,
  MapPin, FileSpreadsheet, FileText, ChevronDown
} from 'lucide-react';
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
  schoolId: string;
}

interface SectionEntity {
  id: string;
  name: string;
  classId: string;
}

interface TeacherEntity {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  lat?: number;
  lon?: number;
  radius?: number;
  rollNumber?: string;
  isActive: boolean;
  avatar?: string;
  classes: ClassEntity[];
  sections: SectionEntity[];
}

// Reverse geocode with sessionStorage caching
const LocationCell = ({ lat, lon, radius, hideRadius }: { lat?: number | string | null; lon?: number | string | null; radius?: number | string | null; hideRadius?: boolean }) => {
  const [placeName, setPlaceName] = useState<string | null>(null);

  const numLat = lat !== undefined && lat !== null && lat !== '' ? Number(lat) : NaN;
  const numLon = lon !== undefined && lon !== null && lon !== '' ? Number(lon) : NaN;
  const isValidCoord = !isNaN(numLat) && !isNaN(numLon);

  useEffect(() => {
    if (!isValidCoord) return;
    const cacheKey = `geocode_${numLat}_${numLon}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setPlaceName(cached); return; }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${numLat}&lon=${numLon}`, {
          headers: { 'User-Agent': 'SchoolCareWeb/1.0' }
        });
        const data = await res.json();
        if (data?.display_name) {
          const simplified = data.display_name.split(', ').slice(0, 3).join(', ');
          sessionStorage.setItem(cacheKey, simplified);
          setPlaceName(simplified);
        }
      } catch { /* ignore */ }
    }, Math.random() * 1000 + 500);

    return () => clearTimeout(timer);
  }, [isValidCoord, numLat, numLon]);

  if (!isValidCoord) {
    return <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>N/A</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', fontWeight: 500, color: 'var(--foreground)' }}>
        <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span title={`Lat: ${numLat}, Lon: ${numLon}`}>{placeName ?? `${numLat.toFixed(4)}, ${numLon.toFixed(4)}`}</span>
      </div>
      {!hideRadius && (
        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', paddingLeft: '1.1rem' }}>
          Radius: {radius ?? 'N/A'} m
        </span>
      )}
    </div>
  );
};

export default function TeachersPage() {
  const { t } = useLanguage();
  const [teachers, setTeachers] = useState<TeacherEntity[]>([]);
  const [classesData, setClassesData] = useState<ClassEntity[]>([]);
  const [sectionsData, setSectionsData] = useState<SectionEntity[]>([]);

  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterIsActive, setFilterIsActive] = useState('');


  // Toggle filters visibility
  const [showFilters, setShowFilters] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherEntity | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    avatar: '',
    rollNumber: '',
    lat: '',
    lon: '',
    radius: '',
    classIds: [] as string[],
    sectionIds: [] as string[]
  });

  const [showPassword, setShowPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const getUserSchoolId = () => {
    try {
      const token = getApiToken();
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.schoolId;
    } catch { return null; }
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

  const fetchFiltersData = useCallback(async () => {
    if (!userSchoolId) return;
    try {
      const headers = { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` };
      const [classesRes, sectionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/classes`, { headers }),
        fetch(`${API_BASE_URL}/admin/sections?schoolId=${userSchoolId}`, { headers })
      ]);
      const classesJson = await classesRes.json();
      const sectionsJson = await sectionsRes.json();
      const classes: ClassEntity[] = Array.isArray(classesJson) ? classesJson : classesJson.data || [];
      const sections: SectionEntity[] = Array.isArray(sectionsJson) ? sectionsJson : sectionsJson.data || [];
      setClassesData(classes.filter(c => c.schoolId === userSchoolId));
      setSectionsData(sections);
    } catch (error) {
      console.error('Failed to fetch filters data:', error);
    }
  }, [userSchoolId]);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` };
      const queryParams = new URLSearchParams({ role: 'teacher', page: page.toString(), limit: limit.toString() });
      if (debouncedSearch) queryParams.append('search', debouncedSearch);
      if (filterClass) queryParams.append('classIds', filterClass);
      if (filterSection) queryParams.append('sectionIds', filterSection);
      if (filterIsActive !== '') queryParams.append('isActive', filterIsActive);

      const response = await fetch(`${API_BASE_URL}/admin/users?${queryParams.toString()}`, { headers });
      const json = await response.json();
      if (json.statusCode === 200 && json.data) {
        setTeachers(json.data.data || []);
        setTotal(json.data.total ?? 0);
      } else {
        setTeachers([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
      setTeachers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, filterClass, filterSection, filterIsActive]);

  useEffect(() => { fetchFiltersData(); }, [fetchFiltersData]);
  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const resetForm = () => {
    setFormState({ name: '', email: '', password: '', phone: '', designation: '', avatar: '', rollNumber: '', lat: '', lon: '', radius: '', classIds: [], sectionIds: [] });
    setSelectedTeacher(null);
    setShowPassword(false);
  };

  const openAddModal = () => { resetForm(); setModalMode('add'); setIsModalOpen(true); };

  const openEditModal = (teacher: TeacherEntity) => {
    setFormState({
      name: teacher.name || '',
      email: teacher.email || '',
      password: '',
      phone: teacher.phone || '',
      designation: teacher.designation || '',
      avatar: teacher.avatar || '',
      rollNumber: teacher.rollNumber || '',
      lat: teacher.lat !== undefined ? String(teacher.lat) : '',
      lon: teacher.lon !== undefined ? String(teacher.lon) : '',
      radius: teacher.radius !== undefined ? String(teacher.radius) : '',
      classIds: teacher.classes?.map(c => c.id) || [],
      sectionIds: teacher.sections?.map(s => s.id) || []
    });
    setSelectedTeacher(teacher);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openViewModal = (teacher: TeacherEntity) => {
    setFormState({
      name: teacher.name || '',
      email: teacher.email || '',
      password: '',
      phone: teacher.phone || '',
      designation: teacher.designation || '',
      avatar: teacher.avatar || '',
      rollNumber: teacher.rollNumber || '',
      lat: teacher.lat !== undefined ? String(teacher.lat) : '',
      lon: teacher.lon !== undefined ? String(teacher.lon) : '',
      radius: teacher.radius !== undefined ? String(teacher.radius) : '',
      classIds: teacher.classes?.map(c => c.id) || [],
      sectionIds: teacher.sections?.map(s => s.id) || []
    });
    setSelectedTeacher(teacher);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteModal({ open: true, id, name });
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${deleteModal.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getApiToken()}` }
      });
      if (res.ok) {
        setDeleteModal({ open: false, id: '', name: '' });
        fetchTeachers();
      } else {
        alert('Failed to delete teacher.');
      }
    } catch { alert('Error deleting teacher.'); }
    finally { setDeleteLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (modalMode === 'view') return;
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadingAvatar(true);
    try {
      const response = await fetch(`${API_BASE_URL}/general/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getApiToken()}` },
        body: formData
      });
      const result = await response.json();
      if (result.statusCode === 200 && result.data?.url) {
        setFormState(prev => ({ ...prev, avatar: result.data.url }));
      } else {
        alert('Failed to upload image.');
      }
    } catch { alert('Error uploading image.'); }
    finally { setUploadingAvatar(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSchoolId || modalMode === 'view') return;
    setActionLoading(true);
    const payload: any = {
      ...formState,
      role: 'teacher',
      schoolId: userSchoolId,
      lat: formState.lat ? parseFloat(formState.lat) : undefined,
      lon: formState.lon ? parseFloat(formState.lon) : undefined,
      radius: formState.radius ? parseInt(formState.radius) : undefined,
    };
    if (modalMode === 'edit' && !payload.password) delete payload.password;
    try {
      const url = modalMode === 'edit' && selectedTeacher?.id
        ? `${API_BASE_URL}/admin/users/${selectedTeacher.id}`
        : `${API_BASE_URL}/admin/users`;
      const response = await fetch(url, {
        method: modalMode === 'edit' ? 'PUT' : 'POST',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchTeachers();
      } else {
        const errorData = await response.json();
        alert(`Failed to save: ${errorData.message || 'Unknown error'}`);
      }
    } catch { alert('Error saving teacher information.'); }
    finally { setActionLoading(false); }
  };

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Close export dropdown on click outside
  useEffect(() => {
    if (!exportDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.export-dropdown-container')) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportDropdownOpen]);

  // Export CSV
  const handleExportCSV = () => {
    setExportDropdownOpen(false);
    if (sortedTeachers.length === 0) return;
    const headers = ['SL', 'Name', 'Email', 'Phone', 'Designation', 'Class', 'Section', 'Status'];
    const rows = sortedTeachers.map((tc, idx) => [
      ((page - 1) * limit + idx + 1).toString(),
      `"${(tc.name || '').replace(/"/g, '""')}"`,
      `"${tc.email || ''}"`,
      `"${tc.phone || ''}"`,
      `"${tc.designation || ''}"`,
      `"${(tc.classes || []).map(c => c.name).join(', ')}"`,
      `"${(tc.sections || []).map(s => s.name).join(', ')}"`,
      tc.isActive ? 'Active' : 'Inactive'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `teachers_export_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF
  const handleExportPDF = () => {
    setExportDropdownOpen(false);
    if (sortedTeachers.length === 0) return;

    const doc = new jsPDF('portrait');

    // Header
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text("Teachers Report", 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const subtitleParts = [
      `Page: ${page} of ${totalPages}`,
      `Total: ${total} teachers`,
      `Generated: ${new Date().toLocaleDateString()}`
    ];
    if (filterClass) {
      const cls = classesData.find(c => c.id === filterClass)?.name;
      if (cls) subtitleParts.push(`Class: ${cls}`);
    }
    if (filterSection) {
      const sec = sectionsData.find(s => s.id === filterSection)?.name;
      if (sec) subtitleParts.push(`Section: ${sec}`);
    }
    doc.text(subtitleParts.join(' | '), 14, 25);

    const tableColumn = ["#", "Name", "Email", "Phone", "Designation", "Class", "Section", "Status"];
    const tableRows = sortedTeachers.map((tc, idx) => [
      ((page - 1) * limit + idx + 1).toString(),
      tc.name || 'N/A',
      tc.email || 'N/A',
      tc.phone || 'N/A',
      tc.designation || 'N/A',
      (tc.classes || []).map(c => c.name).join(', ') || 'Unassigned',
      (tc.sections || []).map(s => s.name).join(', ') || 'None',
      tc.isActive ? 'Active' : 'Inactive'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      didDrawPage: (data) => {
        const pageCount = (doc.internal as any).getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.width - 25,
          doc.internal.pageSize.height - 10
        );
      }
    });

    doc.save(`teachers_export_page_${page}.pdf`);
  };

  // Derived filter sections
  const availableFilterSections = useMemo(() => {
    return filterClass ? sectionsData.filter(s => s.classId === filterClass) : sectionsData;
  }, [filterClass, sectionsData]);

  // Available modal sections
  const availableModalSections = useMemo(() => {
    if (formState.classIds.length === 0) return sectionsData;
    return sectionsData.filter(s => formState.classIds.includes(s.classId));
  }, [formState.classIds, sectionsData]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const activeFiltersCount = (filterClass ? 1 : 0) + (filterSection ? 1 : 0) + (filterIsActive !== '' ? 1 : 0) + (debouncedSearch ? 1 : 0);

  const sortedTeachers = teachers;

  const resetAllFilters = () => {
    setFilterClass('');
    setFilterSection('');
    setFilterIsActive('');
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* ── Main Data Table Card ─────────────────────────────────── */}
      <div className="data-table-wrapper glass-card" style={{ background: 'var(--card)', borderRadius: '1.25rem', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>

        {/* Toolbar */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>

            {/* Search */}
            <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '400px' }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: '1px solid var(--border)', borderRadius: '0.75rem',
                padding: '0 0.875rem', height: '42px', background: 'var(--background)',
                transition: 'all 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <Search size={18} style={{ color: 'var(--muted-foreground)', marginRight: '0.625rem', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search teacher name or email..."
                  style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', color: 'var(--foreground)', fontSize: '0.9rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Filters Toggle */}
              <button
                className="btn"
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  border: showFilters || activeFiltersCount > 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                  gap: '0.5rem', borderRadius: '0.75rem', height: '42px', padding: '0 1rem',
                  background: showFilters ? 'var(--primary)' : 'var(--background)',
                  color: showFilters ? 'var(--primary-foreground)' : 'var(--foreground)',
                  fontWeight: 500, fontSize: '0.875rem', display: 'flex', alignItems: 'center'
                }}
              >
                <Filter size={16} />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span style={{
                    background: showFilters ? '#ffffff' : 'var(--primary)',
                    color: showFilters ? 'var(--primary)' : '#ffffff',
                    fontSize: '0.75rem', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: 700
                  }}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Export Dropdown */}
              <div className="export-dropdown-container" style={{ position: 'relative' }}>
                <button
                  className="btn"
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  disabled={teachers.length === 0}
                  title="Export Options"
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
                    opacity: teachers.length === 0 ? 0.6 : 1,
                    cursor: teachers.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Download size={16} />
                  <span>Export</span>
                  <ChevronDown size={14} style={{ opacity: 0.7, transform: exportDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {exportDropdownOpen && (
                  <div
                    className="glass-card animate-fade-in"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      zIndex: 50,
                      minWidth: '160px',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      padding: '0.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem'
                    }}
                  >
                    <button
                      onClick={handleExportCSV}
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
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <FileSpreadsheet size={15} style={{ color: '#10b981' }} />
                      <span>Export as CSV</span>
                    </button>
                    <button
                      onClick={handleExportPDF}
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
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <FileText size={15} style={{ color: '#ef4444' }} />
                      <span>Export as PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Add Teacher Button */}
              <button
                className="btn btn-primary"
                onClick={openAddModal}
                style={{
                  height: '42px', padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.875rem',
                  boxShadow: '0 4px 15px rgba(79, 70, 229, 0.35)'
                }}
              >
                <Plus size={18} /> {t('teachers.addTeacher') || 'Add Teacher'}
              </button>

              {/* Page Sizer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.75rem', height: '42px', padding: '0 0.75rem', background: 'var(--background)' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>Show:</span>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: 'var(--foreground)', cursor: 'pointer', fontWeight: 600 }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', fontSize: '0.825rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Filter Tray */}
          {showFilters && (
            <div className="animate-fade-in" style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem', padding: '1.25rem', background: 'var(--background)',
              borderRadius: '0.875rem', border: '1px solid var(--border)'
            }}>
              {/* Class Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('common.classes') || 'Class'}
                </label>
                <select
                  className="input"
                  value={filterClass}
                  onChange={(e) => { setFilterClass(e.target.value); setFilterSection(''); setPage(1); }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('common.allClasses') || 'All Classes'}</option>
                  {classesData.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>

              {/* Section Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('common.sections') || 'Section'}
                </label>
                <select
                  className="input"
                  value={filterSection}
                  onChange={(e) => { setFilterSection(e.target.value); setPage(1); }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                  disabled={!filterClass}
                >
                  <option value="">{t('common.allSections') || 'All Sections'}</option>
                  {availableFilterSections.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  Status
                </label>
                <select
                  className="input"
                  value={filterIsActive}
                  onChange={(e) => { setFilterIsActive(e.target.value); setPage(1); }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('common.all') || 'All Statuses'}</option>
                  <option value="true">{t('common.active') || 'Active'}</option>
                  <option value="false">{t('common.inactive') || 'Inactive'}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Table ───────────────────────────────────────────────── */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>
                  #
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Teacher Details
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Class &amp; Section
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contact &amp; Designation
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Location
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '110px' }}>
                  Status
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', width: '140px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}><div className="shimmer shimmer-text" style={{ width: '20px', margin: 0 }}></div></td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="shimmer shimmer-circle" style={{ width: '42px', height: '42px', flexShrink: 0, borderRadius: '50%' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '140px' }}>
                          <div className="shimmer shimmer-text"></div>
                          <div className="shimmer shimmer-text short" style={{ margin: 0 }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '110px' }}>
                        <div className="shimmer shimmer-text"></div>
                        <div className="shimmer shimmer-text short" style={{ margin: 0 }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}><div className="shimmer shimmer-text" style={{ width: '110px', margin: 0 }}></div></td>
                    <td style={{ padding: '1rem 1.25rem' }}><div className="shimmer shimmer-text" style={{ width: '130px', margin: 0 }}></div></td>
                    <td style={{ padding: '1rem 1.25rem' }}><div className="shimmer shimmer-block" style={{ width: '65px', height: '22px', borderRadius: '999px' }}></div></td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }}></div>
                        <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }}></div>
                        <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }}></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : sortedTeachers.length > 0 ? (
                sortedTeachers.map((teacher, index) => {
                  const sl = (page - 1) * limit + index + 1;
                  const classesList = teacher.classes && teacher.classes.length > 0
                    ? teacher.classes.map(c => c.name).join(', ')
                    : 'Unassigned';
                  const sectionsList = teacher.sections && teacher.sections.length > 0
                    ? teacher.sections.map(s => s.name).join(', ')
                    : 'None';

                  return (
                    <tr
                      key={teacher.id}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{sl}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(129,140,248,0.2))', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--border)' }}>
                            {teacher.avatar ? (
                              <img src={teacher.avatar} alt={teacher.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ color: 'var(--primary)', fontSize: '1rem', fontWeight: 700 }}>{teacher.name ? teacher.name.charAt(0).toUpperCase() : 'T'}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.925rem', cursor: 'pointer' }} onClick={() => openViewModal(teacher)} title="Click to view full profile">{teacher.name}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{teacher.email}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                            <BookOpen size={13} style={{ color: 'var(--primary)' }} />
                            <span>{classesList}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                            <Layers size={13} />
                            <span>Section: {sectionsList}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: teacher.phone ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                            <Phone size={13} style={{ color: 'var(--muted-foreground)' }} />
                            <span>{teacher.phone || 'No phone'}</span>
                          </div>
                          {teacher.designation && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{teacher.designation}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <LocationCell lat={teacher.lat} lon={teacher.lon} radius={teacher.radius} />
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: teacher.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: teacher.isActive ? '#10b981' : '#ef4444', border: `1px solid ${teacher.isActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}` }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: teacher.isActive ? '#10b981' : '#ef4444' }}></span>
                          {teacher.isActive ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button className="action-btn" title="View teacher profile" onClick={() => openViewModal(teacher)} style={{ width: '32px', height: '32px', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--foreground)' }}><Eye size={15} /></button>
                          <button className="action-btn" title="Edit teacher" onClick={() => openEditModal(teacher)} style={{ width: '32px', height: '32px', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--foreground)' }}><Edit3 size={15} /></button>
                          <button className="action-btn" title="Delete teacher" onClick={() => handleDelete(teacher.id, teacher.name)} style={{ width: '32px', height: '32px', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '4.5rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', maxWidth: '380px', margin: '0 auto' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
                        <Search size={28} />
                      </div>
                      <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                        {t('teachers.noTeachers') || 'No teachers found'}
                      </p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                        {searchTerm || filterClass || filterSection || filterIsActive
                          ? (t('teachers.tryAdjusting') || 'Try adjusting your search keywords or resetting filters.')
                          : 'No teacher records have been created yet. Click "Add Teacher" to begin.'}
                      </p>
                      {(searchTerm || filterClass || filterSection || filterIsActive) && (
                        <button onClick={resetAllFilters} className="btn" style={{ marginTop: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '0.85rem' }}>
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────────────────── */}
        {!loading && total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--background)', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
              Showing <strong style={{ color: 'var(--foreground)' }}>{((page - 1) * limit) + 1}</strong> to <strong style={{ color: 'var(--foreground)' }}>{Math.min(page * limit, total)}</strong> of <strong style={{ color: 'var(--foreground)' }}>{total}</strong> teachers
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginRight: '0.5rem' }}>Page {page} of {totalPages}</span>
              <button className="btn" style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, background: 'var(--card)', borderRadius: '0.5rem' }} disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} title="Previous page">
                <ChevronLeft size={16} />
              </button>
              <button className="btn" style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, background: 'var(--card)', borderRadius: '0.5rem' }} disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} title="Next page">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── View / Add / Edit Modal ──────────────────────────────── */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: modalMode === 'view' ? '620px' : '760px', borderRadius: '1.25rem', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid var(--border)' }}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '0.6rem', background: modalMode === 'view' ? 'rgba(79, 70, 229, 0.1)' : modalMode === 'edit' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: modalMode === 'view' ? 'var(--primary)' : modalMode === 'edit' ? '#f59e0b' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {modalMode === 'view' ? <Eye size={18} /> : modalMode === 'edit' ? <Edit3 size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                    {modalMode === 'add' ? 'Add New Teacher' : modalMode === 'edit' ? 'Edit Teacher Profile' : 'Teacher Profile Details'}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>
                    {modalMode === 'view' ? 'Read-only teacher information' : 'Fill in the information below to continue'}
                  </p>
                </div>
              </div>
              <button className="action-btn" onClick={() => setIsModalOpen(false)} disabled={actionLoading} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card)', cursor: 'pointer', color: 'var(--foreground)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ overflowY: 'auto', padding: '1.75rem' }}>
              {modalMode === 'view' && selectedTeacher ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Avatar Card */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', borderRadius: '1rem', background: 'var(--background)', border: '1px solid var(--border)' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', background: 'var(--primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0 }}>
                      {selectedTeacher.avatar ? (<img src={selectedTeacher.avatar} alt={selectedTeacher.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />) : (selectedTeacher.name.charAt(0).toUpperCase())}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>{selectedTeacher.name}</h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{selectedTeacher.email}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.725rem', fontWeight: 600, background: selectedTeacher.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: selectedTeacher.isActive ? '#10b981' : '#ef4444' }}>
                          {selectedTeacher.isActive ? 'Active Account' : 'Inactive'}
                        </span>
                        {selectedTeacher.rollNumber && (
                          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.725rem', fontWeight: 600, background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', fontFamily: 'monospace' }}>
                            Roll #{selectedTeacher.rollNumber}
                          </span>
                        )}
                        {selectedTeacher.designation && (
                          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.725rem', fontWeight: 600, background: 'var(--muted)', color: 'var(--foreground)' }}>
                            {selectedTeacher.designation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>Phone Number</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--foreground)' }}>{selectedTeacher.phone || 'Not provided'}</div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>Designation</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--foreground)' }}>{selectedTeacher.designation || 'Teacher'}</div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>Classes</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--foreground)' }}>{selectedTeacher.classes?.map(c => c.name).join(', ') || 'None assigned'}</div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>Sections</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--foreground)' }}>{selectedTeacher.sections?.map(s => s.name).join(', ') || 'None assigned'}</div>
                    </div>
                    {(selectedTeacher.lat !== undefined || selectedTeacher.lon !== undefined) && (
                      <div style={{ gridColumn: '1 / -1', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: '0.4rem' }}>Attendance Location</div>
                        <LocationCell lat={selectedTeacher.lat} lon={selectedTeacher.lon} radius={selectedTeacher.radius} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button type="button" className="btn" style={{ border: '1px solid var(--border)', borderRadius: '0.75rem' }} onClick={() => setIsModalOpen(false)}>Close</button>
                    <button type="button" className="btn btn-primary" style={{ borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => openEditModal(selectedTeacher)}>
                      <Edit3 size={16} /> Edit Profile
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* Photo */}
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1rem', background: 'var(--background)', borderRadius: '0.875rem', border: '1px solid var(--border)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border)', background: 'var(--card)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {formState.avatar ? (<img src={formState.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />) : (<Users size={24} style={{ color: 'var(--muted-foreground)' }} />)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>Teacher Profile Photo</div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label className="btn" style={{ border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', padding: '0.4rem 0.85rem', fontSize: '0.825rem', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {uploadingAvatar ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                          <span>{uploadingAvatar ? 'Uploading...' : 'Upload Image'}</span>
                          <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={actionLoading || uploadingAvatar} />
                        </label>
                        {formState.avatar && (
                          <button type="button" onClick={() => setFormState(p => ({ ...p, avatar: '' }))} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}>Remove</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name & Email */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>Full Name *</label>
                      <input type="text" className="input" value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} required disabled={actionLoading} placeholder="e.g. Mr. John Smith" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>Email Address *</label>
                      <input type="email" className="input" value={formState.email} onChange={(e) => setFormState({ ...formState, email: e.target.value })} required disabled={actionLoading} placeholder="teacher@school.edu" />
                    </div>
                  </div>

                  {/* Password & Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>Password {modalMode === 'add' ? '*' : '(Leave empty to keep current)'}</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input type={showPassword ? 'text' : 'password'} className="input" style={{ width: '100%', paddingRight: '2.5rem' }} value={formState.password} onChange={(e) => setFormState({ ...formState, password: e.target.value })} required={modalMode === 'add'} disabled={actionLoading} placeholder={modalMode === 'edit' ? '••••••••' : 'Minimum 6 characters'} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>Phone Number</label>
                      <input type="text" className="input" value={formState.phone} onChange={(e) => setFormState({ ...formState, phone: e.target.value })} disabled={actionLoading} placeholder="+880 1700 000000" />
                    </div>
                  </div>

                  {/* Roll Number & Designation */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>Roll Number / ID</label>
                      <input type="text" className="input" value={formState.rollNumber} onChange={(e) => setFormState({ ...formState, rollNumber: e.target.value })} disabled={actionLoading} placeholder="e.g. T-001" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>Designation</label>
                      <input type="text" className="input" value={formState.designation} onChange={(e) => setFormState({ ...formState, designation: e.target.value })} disabled={actionLoading} placeholder="e.g. Senior Teacher, HOD" />
                    </div>
                  </div>

                  {/* Attendance Location */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>Attendance Location (Optional)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Latitude</label>
                        <input type="number" step="any" className="input" value={formState.lat} onChange={(e) => setFormState({ ...formState, lat: e.target.value })} disabled={actionLoading} placeholder="23.8103" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Longitude</label>
                        <input type="number" step="any" className="input" value={formState.lon} onChange={(e) => setFormState({ ...formState, lon: e.target.value })} disabled={actionLoading} placeholder="90.4125" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Radius (m)</label>
                        <input type="number" className="input" value={formState.radius} onChange={(e) => setFormState({ ...formState, radius: e.target.value })} disabled={actionLoading} placeholder="100" />
                      </div>
                    </div>
                  </div>

                  {/* Class Assignment */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>{t('common.classes') || 'Assign Classes'}</label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{formState.classIds.length} selected</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.75rem', minHeight: '52px', background: 'var(--background)' }}>
                      {classesData.length > 0 ? (
                        classesData.map(c => {
                          const isSelected = formState.classIds.includes(c.id);
                          return (
                            <button key={c.id} type="button" onClick={() => { setFormState(prev => ({ ...prev, classIds: isSelected ? prev.classIds.filter(id => id !== c.id) : [...prev.classIds, c.id] })); }} disabled={actionLoading}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.825rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)', background: isSelected ? 'var(--primary)' : 'var(--card)', color: isSelected ? 'var(--primary-foreground)' : 'var(--foreground)' }}>
                              {isSelected && <CheckCircle2 size={13} />}
                              <span>{c.name}</span>
                            </button>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)' }}>No classes available</span>
                      )}
                    </div>
                  </div>

                  {/* Section Assignment */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>{t('common.sections') || 'Assign Sections'}</label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{formState.sectionIds.length} selected</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.75rem', minHeight: '52px', background: 'var(--background)' }}>
                      {availableModalSections.length > 0 ? (
                        availableModalSections.map(s => {
                          const isSelected = formState.sectionIds.includes(s.id);
                          return (
                            <button key={s.id} type="button" onClick={() => { setFormState(prev => ({ ...prev, sectionIds: isSelected ? prev.sectionIds.filter(id => id !== s.id) : [...prev.sectionIds, s.id] })); }} disabled={actionLoading}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.825rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)', background: isSelected ? 'var(--primary)' : 'var(--card)', color: isSelected ? 'var(--primary-foreground)' : 'var(--foreground)' }}>
                              {isSelected && <CheckCircle2 size={13} />}
                              <span>{s.name}</span>
                            </button>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)' }}>
                          {formState.classIds.length === 0 ? 'Select classes above to view sections' : 'No sections found for chosen classes'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submit */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                    <button type="button" className="btn" style={{ border: '1px solid var(--border)', borderRadius: '0.75rem' }} onClick={() => setIsModalOpen(false)} disabled={actionLoading}>
                      {t('common.cancel') || 'Cancel'}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ borderRadius: '0.75rem', padding: '0.625rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                      {modalMode === 'add' ? (t('teachers.addTeacher') || 'Add Teacher') : (t('common.saveChanges') || 'Save Changes')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────── */}
      {deleteModal.open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '440px', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '2rem 1.75rem 1.25rem 1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(239, 68, 68, 0.25)', color: '#ef4444' }}>
                <AlertTriangle size={32} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--foreground)' }}>Delete Teacher Account</h2>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  Are you sure you want to permanently delete <strong style={{ color: 'var(--foreground)' }}>{deleteModal.name}</strong>? All class assignments and records will be removed. This action cannot be undone.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', padding: '1.25rem 1.75rem 1.75rem 1.75rem' }}>
              <button className="btn" style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.9rem' }} onClick={() => setDeleteModal({ open: false, id: '', name: '' })} disabled={deleteLoading}>
                Cancel
              </button>
              <button className="btn" style={{ flex: 1, background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ffffff', fontSize: '0.9rem', borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 15px rgba(239,68,68,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }} onClick={confirmDelete} disabled={deleteLoading}>
                {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {deleteLoading ? (t('common.deleting') || 'Deleting...') : (t('common.delete') || 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
