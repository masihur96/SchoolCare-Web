"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/components/language-provider';
import { 
  Search, Plus, Edit3, Trash2, Eye, EyeOff, Filter, 
  ChevronLeft, ChevronRight, Loader2, X, Upload, AlertTriangle,
  GraduationCap, Download, RefreshCw,
  Phone, BookOpen, Layers, CheckCircle2, Users,
  ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, FileText, ChevronDown
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

interface StudentEntity {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  rollNumber: string;
  isActive: boolean;
  avatar?: string;
  createdAt?: string;
  classes: ClassEntity[];
  sections: SectionEntity[];
}

export default function StudentsPage() {
  const { t } = useLanguage();
  const [students, setStudents] = useState<StudentEntity[]>([]);
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
  const [filterIsActive, setFilterIsActive] = useState(''); // 'true', 'false', ''
  
  // Sorting
  const [rollSortOrder, setRollSortOrder] = useState<'asc' | 'desc' | 'none'>('asc');
  
  // Toggle filters visibility
  const [showFilters, setShowFilters] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedStudent, setSelectedStudent] = useState<StudentEntity | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string; roll: string }>({ 
    open: false, 
    id: '', 
    name: '',
    roll: ''
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    avatar: '',
    rollNumber: '',
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

  const fetchFiltersData = useCallback(async () => {
    if (!userSchoolId) return;
    try {
      const headers = {
        'accept': '*/*',
        'Authorization': `Bearer ${getApiToken()}`
      };
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
      console.error("Failed to fetch filters data:", error);
    }
  }, [userSchoolId]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {
        'accept': '*/*',
        'Authorization': `Bearer ${getApiToken()}`
      };
      
      const queryParams = new URLSearchParams({
        role: 'student',
        page: page.toString(),
        limit: limit.toString(),
      });

      if (debouncedSearch) queryParams.append('search', debouncedSearch);
      if (filterClass) queryParams.append('classIds', filterClass);
      if (filterSection) queryParams.append('sectionIds', filterSection);
      if (filterIsActive !== '') queryParams.append('isActive', filterIsActive);

      const response = await fetch(`${API_BASE_URL}/admin/users?${queryParams.toString()}`, { headers });
      const json = await response.json();

      if (json.statusCode === 200 && json.data) {
        setStudents(json.data.data || []);
        setTotal(json.data.total ?? 0);
      } else {
        setStudents([]);
        setTotal(0);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
      setStudents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, filterClass, filterSection, filterIsActive]);

  useEffect(() => {
    fetchFiltersData();
  }, [fetchFiltersData]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const resetForm = () => {
    setFormState({
      name: '', 
      email: '', 
      password: '', 
      phone: '', 
      designation: '', 
      avatar: '', 
      rollNumber: '', 
      classIds: [], 
      sectionIds: []
    });
    setSelectedStudent(null);
    setShowPassword(false);
  };

  const openAddModal = () => {
    resetForm();
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (student: StudentEntity) => {
    setFormState({
      name: student.name || '',
      email: student.email || '',
      password: '',
      phone: student.phone || '',
      designation: student.designation || '',
      avatar: student.avatar || '',
      rollNumber: student.rollNumber || '',
      classIds: student.classes?.map(c => c.id) || [],
      sectionIds: student.sections?.map(s => s.id) || []
    });
    setSelectedStudent(student);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openViewModal = (student: StudentEntity) => {
    setFormState({
      name: student.name || '',
      email: student.email || '',
      password: '', 
      phone: student.phone || '',
      designation: student.designation || '',
      avatar: student.avatar || '',
      rollNumber: student.rollNumber || '',
      classIds: student.classes?.map(c => c.id) || [],
      sectionIds: student.sections?.map(s => s.id) || []
    });
    setSelectedStudent(student);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = (student: StudentEntity) => {
    setDeleteModal({ 
      open: true, 
      id: student.id, 
      name: student.name, 
      roll: student.rollNumber || 'N/A' 
    });
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${deleteModal.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getApiToken()}`
        }
      });
      if (res.ok) {
        setDeleteModal({ open: false, id: '', name: '', roll: '' });
        fetchStudents();
      } else {
        alert(t('students.failedToDelete') || 'Failed to delete student.');
      }
    } catch (e) {
      alert(t('students.errorDeleting') || 'Error deleting student.');
    } finally {
      setDeleteLoading(false);
    }
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
        headers: {
          'Authorization': `Bearer ${getApiToken()}`
        },
        body: formData
      });
      const result = await response.json();
      if (result.statusCode === 200 && result.data?.url) {
        setFormState(prev => ({ ...prev, avatar: result.data.url }));
      } else {
        alert(t('students.failedToUpload') || 'Failed to upload image.');
      }
    } catch (err) {
      alert(t('students.errorUploading') || 'Error uploading image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSchoolId || modalMode === 'view') return;
    setActionLoading(true);
    
    const payload: any = {
      ...formState,
      role: 'student',
      schoolId: userSchoolId,
    };

    if (modalMode === 'edit' && !payload.password) {
      delete payload.password;
    }

    try {
      const url = modalMode === 'edit' && selectedStudent?.id 
        ? `${API_BASE_URL}/admin/users/${selectedStudent.id}`
        : `${API_BASE_URL}/admin/users`;
        
      const response = await fetch(url, {
        method: modalMode === 'edit' ? 'PUT' : 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchStudents();
      } else {
        const errorData = await response.json();
        alert(`${t('students.failedToSave') || 'Failed to save'}: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert(t('students.errorSaving') || "Error saving student information.");
    } finally {
      setActionLoading(false);
    }
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

  // Export current list to CSV
  const handleExportCSV = () => {
    setExportDropdownOpen(false);
    if (sortedStudents.length === 0) return;
    const headers = ["SL", "Name", "Roll Number", "Email", "Phone", "Class", "Section", "Status"];
    const rows = sortedStudents.map((s, idx) => [
      ((page - 1) * limit + idx + 1).toString(),
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${s.rollNumber || ''}"`,
      `"${s.email || ''}"`,
      `"${s.phone || ''}"`,
      `"${(s.classes || []).map(c => c.name).join(', ')}"`,
      `"${(s.sections || []).map(sec => sec.name).join(', ')}"`,
      s.isActive ? "Active" : "Inactive"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_export_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current list to PDF
  const handleExportPDF = () => {
    setExportDropdownOpen(false);
    if (sortedStudents.length === 0) return;

    const doc = new jsPDF('portrait');

    // Header
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229); // Primary Indigo color
    doc.text("Students Report", 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const subtitleParts = [
      `Page: ${page} of ${totalPages}`,
      `Total: ${total} students`,
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

    const tableColumn = ["#", "Name", "Roll No", "Email", "Phone", "Class", "Section", "Status"];
    const tableRows = sortedStudents.map((s, idx) => [
      ((page - 1) * limit + idx + 1).toString(),
      s.name || 'N/A',
      s.rollNumber || 'N/A',
      s.email || 'N/A',
      s.phone || 'N/A',
      (s.classes || []).map(c => c.name).join(', ') || 'Unassigned',
      (s.sections || []).map(sec => sec.name).join(', ') || 'None',
      s.isActive ? 'Active' : 'Inactive'
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

    doc.save(`students_export_page_${page}.pdf`);
  };

  // Derived sections based on selected filter class
  const availableFilterSections = useMemo(() => {
    return filterClass 
      ? sectionsData.filter(s => s.classId === filterClass)
      : sectionsData;
  }, [filterClass, sectionsData]);

  // Available modal sections based on student's selected classes
  const availableModalSections = useMemo(() => {
    if (formState.classIds.length === 0) return sectionsData;
    return sectionsData.filter(s => formState.classIds.includes(s.classId));
  }, [formState.classIds, sectionsData]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const activeFiltersCount = (filterClass ? 1 : 0) + (filterSection ? 1 : 0) + (filterIsActive !== '' ? 1 : 0) + (debouncedSearch ? 1 : 0);

  // Sort students by roll number
  const sortedStudents = useMemo(() => {
    if (rollSortOrder === 'none') return students;
    return [...students].sort((a, b) => {
      const rollA = (a.rollNumber || '').trim();
      const rollB = (b.rollNumber || '').trim();
      
      const numA = Number(rollA);
      const numB = Number(rollB);

      let comparison = 0;
      if (!isNaN(numA) && !isNaN(numB) && rollA !== '' && rollB !== '') {
        comparison = numA - numB;
      } else {
        comparison = rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
      }

      return rollSortOrder === 'desc' ? -comparison : comparison;
    });
  }, [students, rollSortOrder]);

  const toggleRollSort = () => {
    setRollSortOrder(current => {
      if (current === 'asc') return 'desc';
      if (current === 'desc') return 'none';
      return 'asc';
    });
  };

  const resetAllFilters = () => {
    setFilterClass('');
    setFilterSection('');
    setFilterIsActive('');
    setSearchTerm('');
    setDebouncedSearch('');
    setRollSortOrder('asc');
    setPage(1);
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* ── Main Data Table Card ───────────────────────────────── */}
      <div className="data-table-wrapper glass-card" style={{ background: 'var(--card)', borderRadius: '1.25rem', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        
        {/* Table Search & Filter Toolbar */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '400px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                border: '1px solid var(--border)', 
                borderRadius: '0.75rem', 
                padding: '0 0.875rem', 
                height: '42px', 
                background: 'var(--background)',
                transition: 'all 0.2s',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <Search size={18} style={{ color: 'var(--muted-foreground)', marginRight: '0.625rem', flexShrink: 0 }} />
                <input 
                  type="text" 
                  placeholder={t('students.searchPlaceholder') || "Search student name, roll number, or email..."} 
                  style={{ 
                    border: 'none', 
                    outline: 'none', 
                    background: 'transparent', 
                    width: '100%', 
                    color: 'var(--foreground)',
                    fontSize: '0.9rem'
                  }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter, Export & Add Student Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                  alignItems: 'center'
                }}
              >
                <Filter size={16} />
                <span>{t('students.filters') || 'Filters'}</span>
                {activeFiltersCount > 0 && (
                  <span style={{ 
                    background: showFilters ? '#ffffff' : 'var(--primary)', 
                    color: showFilters ? 'var(--primary)' : '#ffffff', 
                    fontSize: '0.75rem', 
                    borderRadius: '999px', 
                    padding: '0.1rem 0.5rem',
                    fontWeight: 700
                  }}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Export Dropdown (Beside Filters) */}
              <div className="export-dropdown-container" style={{ position: 'relative' }}>
                <button 
                  className="btn"
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  disabled={students.length === 0}
                  title={t('students.exportOptions') || 'Export Options'}
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
                    opacity: students.length === 0 ? 0.6 : 1,
                    cursor: students.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Download size={16} />
                  <span>{t('common.export') || 'Export'}</span>
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
                      <span>{t('students.exportCsv') || 'Export as CSV'}</span>
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
                      <span>{t('students.exportPdf') || 'Export as PDF'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Add Student Button (Beside Filters) */}
              <button 
                className="btn btn-primary"
                onClick={openAddModal} 
                style={{ 
                  height: '42px',
                  padding: '0 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  boxShadow: '0 4px 15px rgba(79, 70, 229, 0.35)'
                }}
              >
                <Plus size={18} /> {t('students.addStudent') || 'Add Student'}
              </button>

              {/* Page Sizer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.75rem', height: '42px', padding: '0 0.75rem', background: 'var(--background)' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{t('students.show') || 'Show:'}</span>
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
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--muted-foreground)', 
                    fontSize: '0.825rem', 
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {t('students.clearAll') || 'Clear all'}
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Filter Tray */}
          {showFilters && (
            <div className="animate-fade-in" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem', 
              padding: '1.25rem', 
              background: 'var(--background)', 
              borderRadius: '0.875rem', 
              border: '1px solid var(--border)' 
            }}>
              {/* Class Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('students.filterByClass') || 'Class'}
                </label>
                <select 
                  className="input" 
                  value={filterClass} 
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setFilterSection('');
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('common.allClasses') || 'All Classes'}</option>
                  {classesData.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Section Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('students.filterBySection') || 'Section'}
                </label>
                <select 
                  className="input" 
                  value={filterSection} 
                  onChange={(e) => {
                    setFilterSection(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                  disabled={!filterClass}
                >
                  <option value="">{t('common.allSections') || 'All Sections'}</option>
                  {availableFilterSections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('students.filterByStatus') || 'Enrollment Status'}
                </label>
                <select 
                  className="input" 
                  value={filterIsActive} 
                  onChange={(e) => {
                    setFilterIsActive(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('common.all') || 'All Statuses'}</option>
                  <option value="true">{t('common.active') || 'Active'}</option>
                  <option value="false">{t('common.inactive') || 'Inactive'}</option>
                </select>
              </div>

              {/* Sort by Roll No */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('students.sortByRoll') || 'Sort by Roll No'}
                </label>
                <select 
                  className="input" 
                  value={rollSortOrder} 
                  onChange={(e) => setRollSortOrder(e.target.value as 'asc' | 'desc' | 'none')}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="asc">{t('students.rollAsc') || 'Roll: Low to High (1 → 100)'}</option>
                  <option value="desc">{t('students.rollDesc') || 'Roll: High to Low (100 → 1)'}</option>
                  <option value="none">{t('students.originalOrder') || 'Original Order'}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Table Layout ────────────────────────────────────────── */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>
                  #
                </th>
                <th 
                  onClick={toggleRollSort}
                  title={t('students.clickToSortRoll') || 'Click to sort by Roll Number'}
                  style={{ 
                    padding: '0.875rem 1.25rem', 
                    color: rollSortOrder !== 'none' ? 'var(--primary)' : 'var(--muted-foreground)', 
                    fontWeight: 600, 
                    fontSize: '0.78rem', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    width: '120px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{t('students.rollNo') || 'Roll No'}</span>
                    {rollSortOrder === 'asc' ? (
                      <ArrowUp size={14} style={{ color: 'var(--primary)' }} />
                    ) : rollSortOrder === 'desc' ? (
                      <ArrowDown size={14} style={{ color: 'var(--primary)' }} />
                    ) : (
                      <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                    )}
                  </div>
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('students.studentDetails') || 'Student Details'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('students.classAndSection') || 'Class & Section'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('students.contactInfo') || 'Contact Info'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '110px' }}>
                  {t('common.status') || 'Status'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', width: '140px' }}>
                  {t('common.actions') || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '20px', margin: 0 }}></div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '45px', margin: 0 }}></div>
                    </td>
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
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '110px', margin: 0 }}></div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-block" style={{ width: '65px', height: '22px', borderRadius: '999px' }}></div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }}></div>
                        <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }}></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : sortedStudents.length > 0 ? (
                sortedStudents.map((student, index) => {
                  const sl = (page - 1) * limit + index + 1;
                  const classesList = student.classes && student.classes.length > 0
                    ? student.classes.map(c => c.name).join(', ')
                    : (t('students.unassigned') || 'Unassigned');
                  const sectionsList = student.sections && student.sections.length > 0
                    ? student.sections.map(s => s.name).join(', ')
                    : (t('students.none') || 'None');

                  return (
                    <tr 
                      key={student.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border)', 
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* SL No */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        {sl}
                      </td>

                      {/* Roll Number */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          background: 'rgba(79, 70, 229, 0.08)',
                          color: 'var(--primary)',
                          borderRadius: '0.4rem',
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          fontFamily: 'monospace'
                        }}>
                          {student.rollNumber || 'N/A'}
                        </span>
                      </td>

                      {/* Student Details (Avatar + Name + Email) */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ 
                            width: '42px', 
                            height: '42px', 
                            borderRadius: '50%', 
                            overflow: 'hidden', 
                            background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(129,140,248,0.2))', 
                            flexShrink: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            border: '1.5px solid var(--border)'
                          }}>
                            {student.avatar ? (
                              <img src={student.avatar} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ color: 'var(--primary)', fontSize: '1rem', fontWeight: 700 }}>
                                {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span 
                              style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.925rem', cursor: 'pointer' }}
                              onClick={() => openViewModal(student)}
                              title={t('students.clickToViewProfile') || 'Click to view full profile'}
                            >
                              {student.name}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                              {student.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Class & Section */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                            <BookOpen size={13} style={{ color: 'var(--primary)' }} />
                            <span>{classesList}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                            <Layers size={13} />
                            <span>{t('students.filterBySection') || 'Section'}: {sectionsList}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: student.phone ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                            <Phone size={13} style={{ color: 'var(--muted-foreground)' }} />
                            <span>{student.phone || (t('students.noPhone') || 'No phone')}</span>
                          </div>
                          {student.designation && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                              {student.designation}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: student.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: student.isActive ? '#10b981' : '#ef4444',
                          border: `1px solid ${student.isActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: student.isActive ? '#10b981' : '#ef4444'
                          }}></span>
                          {student.isActive ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button 
                            className="action-btn" 
                            title={t('students.viewProfile') || 'View student profile'} 
                            onClick={() => openViewModal(student)}
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
                              color: 'var(--foreground)'
                            }}
                          >
                            <Eye size={15} />
                          </button>
                          
                          <button 
                            className="action-btn" 
                            title={t('students.editStudent') || 'Edit student'} 
                            onClick={() => openEditModal(student)}
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
                              color: 'var(--foreground)'
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          
                          <button 
                            className="action-btn" 
                            title={t('students.deleteStudentBtn') || 'Delete student'} 
                            onClick={() => handleDelete(student)}
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
                              color: '#ef4444'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
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
                        {t('students.noStudents') || 'No students found'}
                      </p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                        {searchTerm || filterClass || filterSection || filterIsActive
                          ? (t('students.tryAdjusting') || 'Try adjusting your search keywords or resetting filters.')
                          : (t('students.noStudentsYet') || 'No student records have been created in this school yet. Click "Add Student" to begin.')}
                      </p>
                      {(searchTerm || filterClass || filterSection || filterIsActive) && (
                        <button 
                          onClick={resetAllFilters} 
                          className="btn" 
                          style={{ marginTop: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '0.85rem' }}
                        >
                          {t('students.clearFilters') || 'Clear Filters'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* ── Table Footer & Pagination ──────────────────────────── */}
        {!loading && total > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1rem 1.5rem', 
            borderTop: '1px solid var(--border)',
            background: 'var(--background)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
              {t('students.showing') || 'Showing'} <strong style={{ color: 'var(--foreground)' }}>{((page - 1) * limit) + 1}</strong> {t('students.to') || 'to'} <strong style={{ color: 'var(--foreground)' }}>{Math.min(page * limit, total)}</strong> {t('students.of') || 'of'} <strong style={{ color: 'var(--foreground)' }}>{total}</strong> {t('students.students') || 'students'}
            </span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginRight: '0.5rem' }}>
                {t('students.page') || 'Page'} {page} {t('students.of') || 'of'} {totalPages}
              </span>

              <button 
                className="btn" 
                style={{ 
                  padding: '0.5rem 0.75rem', 
                  border: '1px solid var(--border)', 
                  cursor: page === 1 ? 'not-allowed' : 'pointer', 
                  opacity: page === 1 ? 0.4 : 1,
                  background: 'var(--card)',
                  borderRadius: '0.5rem'
                }}
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                title={t('students.prevPage') || 'Previous page'}
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
                  borderRadius: '0.5rem'
                }}
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                title={t('students.nextPage') || 'Next page'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── View / Add / Edit Modal ────────────────────────────── */}
      {isModalOpen && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.55)', 
          backdropFilter: 'blur(6px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 110, 
          padding: '1rem' 
        }}>
          <div className="glass-card animate-fade-in" style={{ 
            background: 'var(--card)', 
            width: '100%', 
            maxWidth: modalMode === 'view' ? '600px' : '720px', 
            borderRadius: '1.25rem', 
            overflow: 'hidden', 
            maxHeight: '90vh', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid var(--border)'
          }}>
            {/* Modal Header */}
            <div style={{ 
              padding: '1.25rem 1.75rem', 
              borderBottom: '1px solid var(--border)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: 'var(--background)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '0.6rem', 
                  background: modalMode === 'view' ? 'rgba(79, 70, 229, 0.1)' : modalMode === 'edit' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: modalMode === 'view' ? 'var(--primary)' : modalMode === 'edit' ? '#f59e0b' : '#10b981',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {modalMode === 'view' ? <Eye size={18} /> : modalMode === 'edit' ? <Edit3 size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                    {modalMode === 'add' ? (t('students.enrollStudent') || 'Enroll New Student') : modalMode === 'edit' ? (t('students.editStudentTitle') || 'Edit Student Profile') : (t('students.profileDetails') || 'Student Profile Details')}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>
                    {modalMode === 'view' ? (t('students.readOnlyInfo') || 'Read-only student information') : (t('students.fillInfo') || 'Fill in the information below to continue')}
                  </p>
                </div>
              </div>
              <button 
                className="action-btn" 
                onClick={() => setIsModalOpen(false)} 
                disabled={actionLoading}
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  border: '1px solid var(--border)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'var(--card)',
                  cursor: 'pointer',
                  color: 'var(--foreground)'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ overflowY: 'auto', padding: '1.75rem' }}>
              {modalMode === 'view' && selectedStudent ? (
                /* View Only Profile Card */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', borderRadius: '1rem', background: 'var(--background)', border: '1px solid var(--border)' }}>
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '50%', 
                      overflow: 'hidden', 
                      background: 'var(--primary)', 
                      color: '#ffffff',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {selectedStudent.avatar ? (
                        <img src={selectedStudent.avatar} alt={selectedStudent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        selectedStudent.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>{selectedStudent.name}</h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{selectedStudent.email}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.725rem',
                          fontWeight: 600,
                          background: selectedStudent.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: selectedStudent.isActive ? '#10b981' : '#ef4444',
                        }}>
                          {selectedStudent.isActive ? (t('students.activeAccount') || 'Active Account') : (t('common.inactive') || 'Inactive')}
                        </span>
                        {selectedStudent.rollNumber && (
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            background: 'rgba(79, 70, 229, 0.1)',
                            color: 'var(--primary)',
                            fontFamily: 'monospace'
                          }}>
                            {t('students.rollNo') || 'Roll'} #{selectedStudent.rollNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('students.phoneNumber') || 'Phone Number'}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--foreground)' }}>{selectedStudent.phone || (t('students.notProvided') || 'Not provided')}</div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('students.designationTag') || 'Designation / Tag'}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--foreground)' }}>{selectedStudent.designation || (t('common.student') || 'Student')}</div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('students.enrolledClasses') || 'Enrolled Classes'}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--foreground)' }}>
                        {selectedStudent.classes?.map(c => c.name).join(', ') || (t('students.noneAssigned') || 'None assigned')}
                      </div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('students.filterBySection') || 'Sections'}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--foreground)' }}>
                        {selectedStudent.sections?.map(s => s.name).join(', ') || (t('students.noneAssigned') || 'None assigned')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button 
                      type="button" 
                      className="btn" 
                      style={{ border: '1px solid var(--border)', borderRadius: '0.75rem' }} 
                      onClick={() => setIsModalOpen(false)}
                    >
                      {t('common.close') || 'Close'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
                      onClick={() => openEditModal(selectedStudent)}
                    >
                      <Edit3 size={16} /> {t('students.editProfile') || 'Edit Profile'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Form for Add and Edit */
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Photo & Identity Section */}
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1rem', background: 'var(--background)', borderRadius: '0.875rem', border: '1px solid var(--border)' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '50%', 
                      overflow: 'hidden', 
                      border: '2px solid var(--border)', 
                      background: 'var(--card)', 
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {formState.avatar ? (
                        <img src={formState.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Users size={24} style={{ color: 'var(--muted-foreground)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                        {t('students.profilePhoto') || 'Student Profile Photo'}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label className="btn" style={{ 
                          border: '1px solid var(--border)', 
                          background: 'var(--card)', 
                          cursor: 'pointer', 
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.825rem',
                          borderRadius: '0.5rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                          {uploadingAvatar ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                          <span>{uploadingAvatar ? (t('common.uploading') || 'Uploading...') : (t('common.uploadImage') || 'Upload Image')}</span>
                          <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={actionLoading || uploadingAvatar} />
                        </label>
                        {formState.avatar && (
                          <button 
                            type="button" 
                            onClick={() => setFormState(p => ({ ...p, avatar: '' }))}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            {t('common.remove') || 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name and Email */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>{t('students.fullName') || 'Full Name'} *</label>
                      <input 
                        type="text" 
                        className="input" 
                        value={formState.name} 
                        onChange={(e) => setFormState({...formState, name: e.target.value})} 
                        required 
                        disabled={actionLoading} 
                        placeholder={t('students.namePlaceholder') || "e.g. John Doe"}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>{t('students.emailAddress') || 'Email Address'} *</label>
                      <input 
                        type="email" 
                        className="input" 
                        value={formState.email} 
                        onChange={(e) => setFormState({...formState, email: e.target.value})} 
                        required 
                        disabled={actionLoading} 
                        placeholder={t('students.emailPlaceholder') || "student@school.edu"}
                      />
                    </div>
                  </div>
                  
                  {/* Password & Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                        {t('students.password') || 'Password'} {modalMode === 'add' ? '*' : (t('students.passwordKeepHint') || '(Leave empty to keep current)')}
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input 
                          type={showPassword ? "text" : "password"} 
                          className="input" 
                          style={{ width: '100%', paddingRight: '2.5rem' }} 
                          value={formState.password} 
                          onChange={(e) => setFormState({...formState, password: e.target.value})} 
                          required={modalMode === 'add'} 
                          disabled={actionLoading} 
                          placeholder={modalMode === 'edit' ? "••••••••" : (t('students.passwordMinHint') || "Minimum 6 characters")} 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)} 
                          style={{ position: 'absolute', right: '0.75rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>{t('students.phoneNumber') || 'Phone Number'}</label>
                      <input 
                        type="text" 
                        className="input" 
                        value={formState.phone} 
                        onChange={(e) => setFormState({...formState, phone: e.target.value})} 
                        disabled={actionLoading} 
                        placeholder="+880 1700 000000"
                      />
                    </div>
                  </div>

                  {/* Roll Number & Designation */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>{t('students.rollNumberId') || 'Roll Number / ID'}</label>
                      <input 
                        type="text" 
                        className="input" 
                        value={formState.rollNumber} 
                        onChange={(e) => setFormState({...formState, rollNumber: e.target.value})} 
                        disabled={actionLoading} 
                        placeholder={t('students.rollPlaceholder') || "e.g. 101"}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>{t('students.designationTag') || 'Designation / Tag'}</label>
                      <input 
                        type="text" 
                        className="input" 
                        value={formState.designation} 
                        onChange={(e) => setFormState({...formState, designation: e.target.value})} 
                        disabled={actionLoading} 
                        placeholder={t('students.designationPlaceholder') || "e.g. Class Representative, Student"}
                      />
                    </div>
                  </div>

                  {/* Class Assignment Multi-selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                        {t('students.assignClasses') || t('common.classes') || 'Assign Classes'}
                      </label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        {formState.classIds.length} {t('students.selected') || 'selected'}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '0.5rem', 
                      padding: '0.75rem', 
                      border: '1px solid var(--border)', 
                      borderRadius: '0.75rem', 
                      minHeight: '52px',
                      background: 'var(--background)' 
                    }}>
                      {classesData.length > 0 ? (
                        classesData.map(c => {
                          const isSelected = formState.classIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setFormState(prev => ({
                                  ...prev,
                                  classIds: isSelected 
                                    ? prev.classIds.filter(id => id !== c.id) 
                                    : [...prev.classIds, c.id]
                                }));
                              }}
                              disabled={actionLoading}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '999px',
                                fontSize: '0.825rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: isSelected ? 'var(--primary)' : 'var(--card)',
                                color: isSelected ? 'var(--primary-foreground)' : 'var(--foreground)'
                              }}
                            >
                              {isSelected && <CheckCircle2 size={13} />}
                              <span>{c.name}</span>
                            </button>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)' }}>{t('students.noClassesAvailable') || 'No classes available'}</span>
                      )}
                    </div>
                  </div>

                  {/* Section Assignment Multi-selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                        {t('students.assignSections') || t('common.sections') || 'Assign Sections'}
                      </label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                        {formState.sectionIds.length} {t('students.selected') || 'selected'}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '0.5rem', 
                      padding: '0.75rem', 
                      border: '1px solid var(--border)', 
                      borderRadius: '0.75rem', 
                      minHeight: '52px',
                      background: 'var(--background)' 
                    }}>
                      {availableModalSections.length > 0 ? (
                        availableModalSections.map(s => {
                          const isSelected = formState.sectionIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setFormState(prev => ({
                                  ...prev,
                                  sectionIds: isSelected 
                                    ? prev.sectionIds.filter(id => id !== s.id) 
                                    : [...prev.sectionIds, s.id]
                                }));
                              }}
                              disabled={actionLoading}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '999px',
                                fontSize: '0.825rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: isSelected ? 'var(--primary)' : 'var(--card)',
                                color: isSelected ? 'var(--primary-foreground)' : 'var(--foreground)'
                              }}
                            >
                              {isSelected && <CheckCircle2 size={13} />}
                              <span>{s.name}</span>
                            </button>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)' }}>
                          {formState.classIds.length === 0 ? (t('students.selectClassFirst') || "Select classes above to view sections") : (t('students.noSectionsFound') || "No sections found for chosen classes")}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Submit Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                    <button 
                      type="button" 
                      className="btn" 
                      style={{ border: '1px solid var(--border)', borderRadius: '0.75rem' }} 
                      onClick={() => setIsModalOpen(false)} 
                      disabled={actionLoading}
                    >
                      {t('common.cancel') || 'Cancel'}
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={actionLoading}
                      style={{ borderRadius: '0.75rem', padding: '0.625rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null} 
                      {modalMode === 'add' ? (t('students.createStudent') || 'Create Student') : (t('common.saveChanges') || 'Save Changes')}
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
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.65)', 
          backdropFilter: 'blur(6px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 120, 
          padding: '1rem' 
        }}>
          <div className="glass-card animate-fade-in" style={{ 
            background: 'var(--card)', 
            width: '100%', 
            maxWidth: '440px', 
            borderRadius: '1.25rem', 
            overflow: 'hidden', 
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', 
            border: '1px solid var(--border)'
          }}>
            <div style={{ padding: '2rem 1.75rem 1.25rem 1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: 'rgba(239, 68, 68, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                border: '1.5px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444'
              }}>
                <AlertTriangle size={32} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--foreground)' }}>
                  {t('students.deleteStudentHeading') || t('students.deleteStudent') || 'Delete Student Record'}
                </h2>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  {t('students.deleteConfirmText') || 'Are you sure you want to permanently delete student'} <strong style={{ color: 'var(--foreground)' }}>{deleteModal.name}</strong> ({t('students.rollNo') || 'Roll'}: {deleteModal.roll})? {t('students.deleteConfirmSuffix') || 'All class enrollments and records will be revoked.'}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', padding: '1.25rem 1.75rem 1.75rem 1.75rem' }}>
              <button
                className="btn"
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.9rem' }}
                onClick={() => setDeleteModal({ open: false, id: '', name: '', roll: '' })}
                disabled={deleteLoading}
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                className="btn"
                style={{ 
                  flex: 1, 
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)', 
                  color: '#ffffff', 
                  fontSize: '0.9rem', 
                  borderRadius: '0.75rem', 
                  border: 'none', 
                  boxShadow: '0 4px 15px rgba(239,68,68,0.35)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.5rem',
                  fontWeight: 600
                }}
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
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
