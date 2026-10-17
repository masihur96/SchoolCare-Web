"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/components/language-provider';
import { 
  Search, Plus, Edit3, Trash2, Eye, Filter, 
  ChevronLeft, ChevronRight, Loader2, X, Upload, AlertTriangle,
  Download, RefreshCw, BookOpen, Layers, CheckCircle2,
  FileSpreadsheet, FileText, ChevronDown, ExternalLink, Calendar,
  User, Tag, GraduationCap, BookMarked, Maximize2, Minimize2
} from 'lucide-react';
import { getPdfTools } from '@/lib/pdf';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('access_token') ||
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
    return payload.schoolId || null;
  } catch {
    return null;
  }
};

interface ClassEntity {
  id?: string;
  uuid?: string;
  name: string;
  schoolId?: string;
}

interface SubjectEntity {
  id?: string;
  uuid?: string;
  name: string;
}

interface AcademicBook {
  id: string;
  title: string;
  author?: string;
  classId?: string;
  subjectId?: string;
  subject?: string;
  edition?: string;
  coverImageUrl?: string;
  pdfUrl?: string;
  fileSize?: number;
  description?: string;
  totalPages?: number;
  publishedYear?: number;
  isActive?: boolean;
  class?: { id?: string; uuid?: string; name: string };
  [key: string]: unknown;
}

interface AcademicBookForm {
  title: string;
  author: string;
  classId: string;
  subjectId: string;
  subject: string;
  edition: string;
  coverImageUrl: string;
  pdfUrl: string;
  fileSize: number | string;
  description: string;
  totalPages: number | string;
  publishedYear: number | string;
  isActive: boolean;
}

const EMPTY_FORM: AcademicBookForm = {
  title: '',
  author: 'National Curriculum and Textbook Board (NCTB)',
  classId: '',
  subjectId: '',
  subject: '',
  edition: `${new Date().getFullYear()} Edition`,
  coverImageUrl: '',
  pdfUrl: '',
  fileSize: '',
  description: '',
  totalPages: '',
  publishedYear: new Date().getFullYear(),
  isActive: true,
};

export default function AcademicBooksPage() {
  const { language, t } = useLanguage();

  const formatNumber = useCallback((num: number | string) => {
    if (num === null || num === undefined || num === '') return '';
    const n = Number(num);
    if (isNaN(n)) return num.toString();
    return language === 'bn' ? n.toLocaleString('bn-BD') : n.toString();
  }, [language]);

  const formatFileSize = useCallback((bytes?: number): string => {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) {
      return `${formatNumber(bytes)} ${t('academicBooks.bytes') || 'B'}`;
    }
    if (bytes < 1024 * 1024) {
      const kb = (bytes / 1024).toFixed(1);
      const formattedKb = language === 'bn' 
        ? Number(kb).toLocaleString('bn-BD', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) 
        : kb;
      return `${formattedKb} ${t('academicBooks.kb') || 'KB'}`;
    }
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    const formattedMb = language === 'bn' 
      ? Number(mb).toLocaleString('bn-BD', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) 
      : mb;
    return `${formattedMb} ${t('academicBooks.mb') || 'MB'}`;
  }, [formatNumber, language, t]);

  const [books, setBooks] = useState<AcademicBook[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterIsActive, setFilterIsActive] = useState(''); // 'true', 'false', ''
  const [sortBy, setSortBy] = useState<'title-asc' | 'title-desc' | 'year-desc' | 'year-asc' | 'pages-desc' | 'none'>('title-asc');

  // Toggle filters visibility
  const [showFilters, setShowFilters] = useState(false);

  // Filter dropdown options
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [subjects, setSubjects] = useState<SubjectEntity[]>([]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedBook, setSelectedBook] = useState<AcademicBook | null>(null);
  const [formState, setFormState] = useState<AcademicBookForm>(EMPTY_FORM);
  const [actionLoading, setActionLoading] = useState(false);

  // Reader / View Modal
  const [viewingBook, setViewingBook] = useState<AcademicBook | null>(null);
  const [isReaderFullscreen, setIsReaderFullscreen] = useState(false);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; title: string }>({ 
    open: false, 
    id: '', 
    title: '' 
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // File Upload states
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Export dropdown
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const userSchoolId = getUserSchoolId();

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Classes and Subjects
  useEffect(() => {
    const fetchOptions = async () => {
      const headers = { accept: '*/*', Authorization: `Bearer ${getApiToken()}` };
      try {
        const [clsRes, subRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/classes${userSchoolId ? `?schoolId=${userSchoolId}&limit=1000` : '?limit=1000'}`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/admin/subjects${userSchoolId ? `?schoolId=${userSchoolId}&limit=1000` : '?limit=1000'}`, { headers }).catch(() => null),
        ]);

        if (clsRes && clsRes.ok) {
          const json = await clsRes.json();
          let list = json.data?.data || json.data || json || [];
          if (Array.isArray(list)) {
            if (userSchoolId) list = list.filter((c: ClassEntity) => !c.schoolId || c.schoolId === userSchoolId);
            setClasses(list);
          }
        }

        if (subRes && subRes.ok) {
          const json = await subRes.json();
          const list = json.data?.data || json.data || json || [];
          if (Array.isArray(list)) setSubjects(list);
        }
      } catch (e) {
        console.error('Failed to load classes or subjects:', e);
      }
    };

    fetchOptions();
  }, [userSchoolId]);

  // Fetch Academic Books
  const fetchBooks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterClass) params.set('classId', filterClass);
      if (filterSubject) params.set('subject', filterSubject);

      const url = `${API_BASE_URL}/academic-ebooks${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json();
        let fetched: AcademicBook[] = [];

        if (Array.isArray(json)) {
          fetched = json;
        } else if (json.data && Array.isArray(json.data)) {
          fetched = json.data;
        } else if (json.data?.data && Array.isArray(json.data.data)) {
          fetched = json.data.data;
        } else if (json.books && Array.isArray(json.books)) {
          fetched = json.books;
        }

        setBooks(fetched);
      } else {
        setBooks([]);
      }
    } catch (err) {
      console.error('Failed to fetch academic books:', err);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterClass, filterSubject]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        await fetchBooks();
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
  }, [fetchBooks]);

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

  // Filter books locally by active status if specified
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      if (filterIsActive === 'true' && b.isActive === false) return false;
      if (filterIsActive === 'false' && b.isActive !== false) return false;
      return true;
    });
  }, [books, filterIsActive]);

  // Sort books
  const sortedBooks = useMemo(() => {
    if (sortBy === 'none') return filteredBooks;
    return [...filteredBooks].sort((a, b) => {
      if (sortBy === 'title-asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'title-desc') {
        return (b.title || '').localeCompare(a.title || '');
      }
      if (sortBy === 'year-desc') {
        return (Number(b.publishedYear) || 0) - (Number(a.publishedYear) || 0);
      }
      if (sortBy === 'year-asc') {
        return (Number(a.publishedYear) || 0) - (Number(b.publishedYear) || 0);
      }
      if (sortBy === 'pages-desc') {
        return (Number(b.totalPages) || 0) - (Number(a.totalPages) || 0);
      }
      return 0;
    });
  }, [filteredBooks, sortBy]);

  // Pagination calculation
  const total = sortedBooks.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedBooks = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return sortedBooks.slice(startIndex, startIndex + limit);
  }, [sortedBooks, page, limit]);

  // Active filters count
  const activeFiltersCount = 
    (debouncedSearch ? 1 : 0) + 
    (filterClass ? 1 : 0) + 
    (filterSubject ? 1 : 0) + 
    (filterIsActive !== '' ? 1 : 0) +
    (sortBy !== 'title-asc' ? 1 : 0);

  const resetAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setFilterClass('');
    setFilterSubject('');
    setFilterIsActive('');
    setSortBy('title-asc');
    setPage(1);
  };

  const getClassName = (book: AcademicBook) => {
    if (book.class?.name) return book.class.name;
    if (book.classId) {
      const found = classes.find(c => (c.id || c.uuid) === book.classId);
      if (found) return found.name;
    }
    return null;
  };

  // Form Handlers
  const openAddModal = () => {
    setFormState({
      ...EMPTY_FORM,
      edition: `${new Date().getFullYear()} Edition`,
      publishedYear: new Date().getFullYear(),
    });
    setSelectedBook(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (book: AcademicBook) => {
    setSelectedBook(book);
    setFormState({
      title: book.title || '',
      author: book.author || '',
      classId: book.classId || book.class?.id || book.class?.uuid || '',
      subjectId: book.subjectId || '',
      subject: book.subject || '',
      edition: book.edition || '',
      coverImageUrl: book.coverImageUrl || '',
      pdfUrl: book.pdfUrl || '',
      fileSize: book.fileSize ?? '',
      description: book.description || '',
      totalPages: book.totalPages ?? '',
      publishedYear: book.publishedYear ?? new Date().getFullYear(),
      isActive: book.isActive !== false,
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingCover(true);
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
        setFormState(prev => ({ ...prev, coverImageUrl: result.data.url }));
      } else {
        alert(t('academicBooks.uploadCoverFailed') || 'Failed to upload cover image.');
      }
    } catch {
      alert(t('academicBooks.uploadCoverError') || 'Error uploading cover image.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingPdf(true);
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
        setFormState(prev => ({ 
          ...prev, 
          pdfUrl: result.data.url,
          fileSize: prev.fileSize || file.size
        }));
      } else {
        alert(t('academicBooks.uploadPdfFailed') || 'Failed to upload PDF document.');
      }
    } catch {
      alert(t('academicBooks.uploadPdfError') || 'Error uploading PDF document.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title.trim()) {
      alert(t('academicBooks.titleRequired') || 'Book title is required.');
      return;
    }

    setActionLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: formState.title.trim(),
        author: formState.author.trim(),
        classId: formState.classId || undefined,
        subjectId: formState.subjectId || undefined,
        subject: formState.subject.trim(),
        edition: formState.edition.trim(),
        coverImageUrl: formState.coverImageUrl.trim(),
        pdfUrl: formState.pdfUrl.trim(),
        description: formState.description.trim(),
        isActive: formState.isActive,
      };

      if (formState.fileSize) {
        body.fileSize = Number(formState.fileSize);
      }
      if (formState.totalPages) {
        body.totalPages = Number(formState.totalPages);
      }
      if (formState.publishedYear) {
        body.publishedYear = Number(formState.publishedYear);
      }

      const url = modalMode === 'edit' && selectedBook?.id
        ? `${API_BASE_URL}/academic-ebooks/${selectedBook.id}`
        : `${API_BASE_URL}/academic-ebooks`;
      const method = modalMode === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchBooks();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`${t('academicBooks.saveFailed') || 'Failed to save book'}: ${errorData.message || 'Unknown error'}`);
      }
    } catch {
      alert(t('academicBooks.saveError') || 'Error saving academic book information.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Handlers
  const handleDelete = (book: AcademicBook) => {
    setDeleteModal({
      open: true,
      id: book.id,
      title: book.title
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/academic-ebooks/${deleteModal.id}`, {
        method: 'DELETE',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`
        }
      });
      if (res.ok) {
        setDeleteModal({ open: false, id: '', title: '' });
        fetchBooks();
      } else {
        alert(t('academicBooks.deleteFailed') || 'Failed to delete book.');
      }
    } catch {
      alert(t('academicBooks.deleteError') || 'Error deleting academic book.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Export current list to CSV
  const handleExportCSV = () => {
    setExportDropdownOpen(false);
    if (sortedBooks.length === 0) return;
    const headers = [
      t('academicBooks.exportSl') || "SL",
      t('academicBooks.exportTitle') || "Title",
      t('academicBooks.exportAuthor') || "Author",
      t('academicBooks.exportClass') || "Class",
      t('academicBooks.exportSubject') || "Subject",
      t('academicBooks.exportEdition') || "Edition",
      t('academicBooks.exportPages') || "Pages",
      t('academicBooks.exportFileSize') || "File Size",
      t('academicBooks.exportStatus') || "Status",
      t('academicBooks.exportPdfUrl') || "PDF URL"
    ];
    const rows = sortedBooks.map((b, idx) => [
      formatNumber((page - 1) * limit + idx + 1),
      `"${(b.title || '').replace(/"/g, '""')}"`,
      `"${(b.author || '').replace(/"/g, '""')}"`,
      `"${(getClassName(b) || t('academicBooks.allClasses') || 'All Classes').replace(/"/g, '""')}"`,
      `"${(b.subject || t('academicBooks.general') || 'General').replace(/"/g, '""')}"`,
      `"${(b.edition || t('academicBooks.standard') || 'Standard').replace(/"/g, '""')}"`,
      b.totalPages ? formatNumber(b.totalPages) : '',
      formatFileSize(b.fileSize),
      b.isActive !== false ? (t('common.active') || "Active") : (t('common.inactive') || "Inactive"),
      `"${b.pdfUrl || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `academic_books_export_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current list to PDF
  const handleExportPDF = async () => {
    setExportDropdownOpen(false);
    if (sortedBooks.length === 0) return;

    const { jsPDF, autoTable } = await getPdfTools();
    const doc = new jsPDF('portrait');

    // Header
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229); // Primary Indigo color
    doc.text(t('academicBooks.reportTitle') || "Academic Books Report", 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const dateStr = new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US');
    const subtitleParts = [
      `${t('academicBooks.page') || 'Page'}: ${formatNumber(page)} ${t('academicBooks.of') || 'of'} ${formatNumber(totalPages)}`,
      `${t('academicBooks.total') || 'Total'}: ${formatNumber(total)} ${t('academicBooks.booksCount') || 'books'}`,
      `${t('academicBooks.generated') || 'Generated'}: ${dateStr}`
    ];
    if (filterClass) {
      const cls = classes.find(c => (c.id || c.uuid) === filterClass)?.name;
      if (cls) subtitleParts.push(`${t('common.class') || 'Class'}: ${cls}`);
    }
    if (filterSubject) {
      subtitleParts.push(`${t('common.subject') || 'Subject'}: ${filterSubject}`);
    }
    doc.text(subtitleParts.join(' | '), 14, 25);

    const tableColumn = [
      "#",
      t('academicBooks.exportTitle') || "Title",
      t('academicBooks.exportAuthor') || "Author",
      t('academicBooks.exportClass') || "Class",
      t('academicBooks.exportSubject') || "Subject",
      t('academicBooks.exportEdition') || "Edition",
      t('academicBooks.exportPages') || "Pages",
      t('academicBooks.exportStatus') || "Status"
    ];
    const tableRows = sortedBooks.map((b, idx) => [
      formatNumber((page - 1) * limit + idx + 1),
      b.title || (t('common.na') || 'N/A'),
      b.author || (t('common.na') || 'N/A'),
      getClassName(b) || (t('academicBooks.allClasses') || 'All Classes'),
      b.subject || (t('academicBooks.general') || 'General'),
      b.edition || (t('academicBooks.standard') || 'Standard'),
      b.totalPages ? formatNumber(b.totalPages) : (t('common.na') || 'N/A'),
      b.isActive !== false ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      didDrawPage: (data) => {
        const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `${t('academicBooks.page') || 'Page'} ${formatNumber(data.pageNumber)} ${t('academicBooks.of') || 'of'} ${formatNumber(pageCount)}`,
          doc.internal.pageSize.width - 25,
          doc.internal.pageSize.height - 10
        );
      }
    });

    doc.save(`academic_books_export_page_${page}.pdf`);
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
                  placeholder={t('academicBooks.searchPlaceholder') || "Search book title, author, or subject..."} 
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

            {/* Filter, Export & Add Book Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              
              {/* Refresh Button */}
              <button
                className="btn"
                onClick={fetchBooks}
                title={t('academicBooks.refreshTooltip') || "Refresh books list"}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  height: '42px',
                  padding: '0 0.875rem',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{t('academicBooks.refresh') || 'Refresh'}</span>
              </button>

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
                <span>{t('academicBooks.filters') || 'Filters'}</span>
                {activeFiltersCount > 0 && (
                  <span style={{ 
                    background: showFilters ? '#ffffff' : 'var(--primary)', 
                    color: showFilters ? 'var(--primary)' : '#ffffff', 
                    fontSize: '0.75rem', 
                    borderRadius: '999px', 
                    padding: '0.1rem 0.5rem',
                    fontWeight: 700
                  }}>
                    {formatNumber(activeFiltersCount)}
                  </span>
                )}
              </button>

              {/* Export Dropdown */}
              <div className="export-dropdown-container" style={{ position: 'relative' }}>
                <button 
                  className="btn"
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  disabled={sortedBooks.length === 0}
                  title={t('academicBooks.export') || "Export Options"}
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
                    opacity: sortedBooks.length === 0 ? 0.6 : 1,
                    cursor: sortedBooks.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Download size={16} />
                  <span>{t('academicBooks.export') || 'Export'}</span>
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
                      <span>{t('academicBooks.exportCsv') || 'Export as CSV'}</span>
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
                      <span>{t('academicBooks.exportPdf') || 'Export as PDF'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Add Academic Book Button */}
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
                <Plus size={18} /> {t('academicBooks.addBook') || 'Add Academic Book'}
              </button>

              {/* Page Sizer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.75rem', height: '42px', padding: '0 0.75rem', background: 'var(--background)' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                  {t('academicBooks.show') || 'Show:'}
                </span>
                <select 
                  value={limit} 
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: 'var(--foreground)', cursor: 'pointer', fontWeight: 600 }}
                >
                  <option value={10}>{formatNumber(10)}</option>
                  <option value={20}>{formatNumber(20)}</option>
                  <option value={50}>{formatNumber(50)}</option>
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
                  {t('academicBooks.clearAll') || 'Clear all'}
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
                  {t('common.class') || 'Class'}
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
                  <option value="">{t('common.allClasses') || 'All Classes'}</option>
                  {classes.map(c => {
                    const cId = c.id || c.uuid || '';
                    return (
                      <option key={cId} value={cId}>{c.name}</option>
                    );
                  })}
                </select>
              </div>

              {/* Subject Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('common.subject') || 'Subject'}
                </label>
                <select 
                  className="input" 
                  value={filterSubject} 
                  onChange={(e) => {
                    setFilterSubject(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('common.allSubjects') || 'All Subjects'}</option>
                  {subjects.map((s, idx) => (
                    <option key={s.id || s.uuid || idx} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('academicBooks.status') || 'Status'}
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

              {/* Sort Order */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('academicBooks.sortBy') || 'Sort By'}
                </label>
                <select 
                  className="input" 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as 'title-asc' | 'title-desc' | 'year-desc' | 'year-asc' | 'pages-desc' | 'none')}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="title-asc">{t('academicBooks.sortTitleAsc') || 'Title: A → Z'}</option>
                  <option value="title-desc">{t('academicBooks.sortTitleDesc') || 'Title: Z → A'}</option>
                  <option value="year-desc">{t('academicBooks.sortYearDesc') || 'Year: Newest First'}</option>
                  <option value="year-asc">{t('academicBooks.sortYearAsc') || 'Year: Oldest First'}</option>
                  <option value="pages-desc">{t('academicBooks.sortPagesDesc') || 'Pages: Most to Least'}</option>
                  <option value="none">{t('academicBooks.sortNone') || 'Original Order'}</option>
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
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('academicBooks.bookDetails') || 'Book Details'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('academicBooks.subjectAndClass') || 'Subject & Class'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('academicBooks.authorPublisher') || 'Author / Publisher'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('academicBooks.pagesAndFileSize') || 'Pages & File Size'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '110px' }}>
                  {t('academicBooks.status') || 'Status'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', width: '140px' }}>
                  {t('academicBooks.actions') || 'Actions'}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="shimmer shimmer-block" style={{ width: '42px', height: '42px', flexShrink: 0, borderRadius: '0.5rem' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '160px' }}>
                          <div className="shimmer shimmer-text"></div>
                          <div className="shimmer shimmer-text short" style={{ margin: 0 }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '120px' }}>
                        <div className="shimmer shimmer-text"></div>
                        <div className="shimmer shimmer-text short" style={{ margin: 0 }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '130px' }}>
                        <div className="shimmer shimmer-text"></div>
                        <div className="shimmer shimmer-text short" style={{ margin: 0 }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '100px', margin: 0 }}></div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-block" style={{ width: '65px', height: '22px', borderRadius: '999px' }}></div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }}></div>
                        <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }}></div>
                        <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }}></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginatedBooks.length > 0 ? (
                paginatedBooks.map((book, index) => {
                  const sl = (page - 1) * limit + index + 1;
                  const className = getClassName(book) || t('academicBooks.allClasses') || 'All Classes';

                  return (
                    <tr 
                      key={book.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border)', 
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* SL No */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        {formatNumber(sl)}
                      </td>

                      {/* Book Details (Thumbnail + Title + Edition) */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ 
                            width: '42px', 
                            height: '42px', 
                            borderRadius: '0.5rem', 
                            overflow: 'hidden', 
                            background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(129,140,248,0.2))', 
                            flexShrink: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            border: '1.5px solid var(--border)'
                          }}>
                            {book.coverImageUrl ? (
                              <img 
                                src={book.coverImageUrl} 
                                alt={book.title} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <BookOpen size={20} style={{ color: 'var(--primary)' }} />
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span 
                              style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.925rem', cursor: 'pointer' }}
                              onClick={() => setViewingBook(book)}
                              title={t('academicBooks.clickToView') || "Click to view and read"}
                            >
                              {book.title}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                              {book.edition && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                                  {book.edition}
                                </span>
                              )}
                              {book.publishedYear && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                  ({formatNumber(book.publishedYear)})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class & Subject */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                            <GraduationCap size={14} style={{ color: 'var(--primary)' }} />
                            <span>{className}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                            <Tag size={13} />
                            <span>{book.subject || t('academicBooks.generalCurriculum') || 'General Curriculum'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Author / Publisher */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: book.author ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                            <User size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={book.author}>
                              {book.author || t('academicBooks.academicTextbook') || 'Academic Textbook'}
                            </span>
                          </div>
                          {book.publishedYear && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                              <Calendar size={12} />
                              <span>{formatNumber(book.publishedYear)}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Pages & File Size */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--foreground)' }}>
                            <FileText size={13} style={{ color: 'var(--muted-foreground)' }} />
                            <span>{book.totalPages ? `${formatNumber(book.totalPages)} ${t('academicBooks.pages') || 'Pages'}` : (t('academicBooks.pagesNa') || 'Pages N/A')}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {book.fileSize && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                <Layers size={12} /> {formatFileSize(book.fileSize)}
                              </span>
                            )}
                            {book.pdfUrl ? (
                              <span style={{
                                padding: '0.1rem 0.45rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                background: 'rgba(79, 70, 229, 0.1)',
                                color: 'var(--primary)'
                              }}>
                                {t('academicBooks.pdfReady') || 'PDF Ready'}
                              </span>
                            ) : (
                              <span style={{
                                padding: '0.1rem 0.45rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                background: 'var(--muted)',
                                color: 'var(--muted-foreground)'
                              }}>
                                {t('academicBooks.noPdf') || 'No PDF'}
                              </span>
                            )}
                          </div>
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
                          background: book.isActive !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: book.isActive !== false ? '#10b981' : '#ef4444',
                          border: `1px solid ${book.isActive !== false ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: book.isActive !== false ? '#10b981' : '#ef4444'
                          }}></span>
                          {book.isActive !== false ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button 
                            className="action-btn" 
                            title={t('academicBooks.viewTooltip') || "Read book & view details"} 
                            aria-label={t('academicBooks.viewTooltip') || "Read book & view details"}
                            onClick={() => setViewingBook(book)}
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
                            title={t('academicBooks.editTooltip') || "Edit book"} 
                            aria-label={t('academicBooks.editTooltip') || "Edit book"}
                            onClick={() => openEditModal(book)}
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
                            title={t('academicBooks.deleteTooltip') || "Delete book"} 
                            aria-label={t('academicBooks.deleteTooltip') || "Delete book"}
                            onClick={() => handleDelete(book)}
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
                        <BookMarked size={28} />
                      </div>
                      <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                        {t('academicBooks.noBooks') || 'No academic books found'}
                      </p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                        {searchTerm || filterClass || filterSubject || filterIsActive
                          ? (t('academicBooks.adjustFilters') || 'Try adjusting your search keywords or resetting filters.')
                          : (t('academicBooks.noBooksYet') || 'No academic books have been created yet. Click "Add Academic Book" to begin publishing textbooks.')}
                      </p>
                      {(searchTerm || filterClass || filterSubject || filterIsActive) && (
                        <button 
                          onClick={resetAllFilters} 
                          className="btn" 
                          style={{ marginTop: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '0.85rem' }}
                        >
                          {t('academicBooks.clearFilters') || 'Clear Filters'}
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
              {t('academicBooks.showing') || 'Showing'} <strong style={{ color: 'var(--foreground)' }}>{formatNumber(((page - 1) * limit) + 1)}</strong> {t('academicBooks.to') || 'to'} <strong style={{ color: 'var(--foreground)' }}>{formatNumber(Math.min(page * limit, total))}</strong> {t('academicBooks.of') || 'of'} <strong style={{ color: 'var(--foreground)' }}>{formatNumber(total)}</strong> {t('academicBooks.booksCount') || 'academic books'}
            </span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginRight: '0.5rem' }}>
                {t('academicBooks.page') || 'Page'} {formatNumber(page)} {t('academicBooks.of') || 'of'} {formatNumber(totalPages)}
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
                title={t('academicBooks.prevPage') || "Previous page"}
                aria-label={t('academicBooks.prevPage') || "Previous page"}
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
                title={t('academicBooks.nextPage') || "Next page"}
                aria-label={t('academicBooks.nextPage') || "Next page"}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── View & Read Modal ──────────────────────────────────── */}
      {viewingBook && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.65)', 
          backdropFilter: 'blur(6px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 110, 
          padding: isReaderFullscreen ? '0' : '1rem' 
        }}>
          <div className="glass-card animate-fade-in" style={{ 
            background: 'var(--card)', 
            width: '100%', 
            maxWidth: isReaderFullscreen ? '100vw' : '920px', 
            height: isReaderFullscreen ? '100vh' : 'auto',
            borderRadius: isReaderFullscreen ? '0' : '1.25rem', 
            overflow: 'hidden', 
            maxHeight: isReaderFullscreen ? '100vh' : '92vh', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: isReaderFullscreen ? 'none' : '1px solid var(--border)'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                <div style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '0.6rem', 
                  background: 'rgba(79, 70, 229, 0.1)',
                  color: 'var(--primary)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <BookOpen size={20} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {viewingBook.title}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: '0.15rem 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {viewingBook.author || t('academicBooks.academicCurriculumTextbook') || 'Academic Curriculum Textbook'} {viewingBook.edition ? `• ${viewingBook.edition}` : ''}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {viewingBook.pdfUrl && (
                  <>
                    <a
                      href={viewingBook.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '0.55rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <ExternalLink size={14} /> 
                      <span className="hidden sm:inline">{t('academicBooks.newTab') || 'New Tab'}</span>
                    </a>
                    <button
                      className="btn"
                      onClick={() => setIsReaderFullscreen(!isReaderFullscreen)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '0.55rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      {isReaderFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                      <span className="hidden sm:inline">{isReaderFullscreen ? (t('academicBooks.exitFullscreen') || 'Exit Fullscreen') : (t('academicBooks.fullscreen') || 'Fullscreen')}</span>
                    </button>
                  </>
                )}
                
                <button 
                  className="action-btn" 
                  onClick={() => {
                    setViewingBook(null);
                    setIsReaderFullscreen(false);
                  }} 
                  aria-label={t('common.close') || 'Close'}
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
            </div>

            {/* Modal Body */}
            <div style={{ overflowY: 'auto', padding: isReaderFullscreen ? '0' : '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {!isReaderFullscreen && (
                <>
                  {/* Book Details Overview Card */}
                  <div style={{ display: 'flex', gap: '1.25rem', padding: '1.25rem', borderRadius: '1rem', background: 'var(--background)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    <div style={{ 
                      width: '70px', 
                      height: '90px', 
                      borderRadius: '0.6rem', 
                      overflow: 'hidden', 
                      background: 'linear-gradient(135deg, rgba(79,70,229,0.15), rgba(6,182,212,0.2))', 
                      border: '1.5px solid var(--border)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {viewingBook.coverImageUrl ? (
                        <img src={viewingBook.coverImageUrl} alt={viewingBook.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <BookMarked size={32} color="#4f46e5" />
                      )}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                          {viewingBook.title}
                        </h3>
                        <span style={{
                          padding: '0.15rem 0.55rem',
                          borderRadius: '999px',
                          fontSize: '0.725rem',
                          fontWeight: 600,
                          background: viewingBook.isActive !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: viewingBook.isActive !== false ? '#10b981' : '#ef4444',
                        }}>
                          {viewingBook.isActive !== false ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                        {t('academicBooks.by') || 'By'} <strong>{viewingBook.author || t('academicBooks.academicTextbook') || 'Academic Board'}</strong> {viewingBook.publishedYear ? `(${formatNumber(viewingBook.publishedYear)})` : ''}
                      </div>

                      {viewingBook.description && (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--foreground)', opacity: 0.85, lineHeight: 1.5 }}>
                          {viewingBook.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        {t('common.class') || 'Class'}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--foreground)' }}>
                        {getClassName(viewingBook) || t('academicBooks.allClasses') || 'All Classes'}
                      </div>
                    </div>
                    <div style={{ padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        {t('common.subject') || 'Subject'}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--foreground)' }}>
                        {viewingBook.subject || t('academicBooks.general') || 'General'}
                      </div>
                    </div>
                    <div style={{ padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        {t('academicBooks.edition') || 'Edition'}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--foreground)' }}>
                        {viewingBook.edition || t('academicBooks.standard') || 'Standard'}
                      </div>
                    </div>
                    <div style={{ padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        {t('academicBooks.totalPages') || 'Total Pages'}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--foreground)' }}>
                        {viewingBook.totalPages ? `${formatNumber(viewingBook.totalPages)} ${t('academicBooks.pages') || 'Pages'}` : (t('academicBooks.notSpecified') || 'N/A')}
                      </div>
                    </div>
                    <div style={{ padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        {t('academicBooks.fileSize') || 'File Size'}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--foreground)' }}>
                        {formatFileSize(viewingBook.fileSize) || t('academicBooks.notSpecified') || 'N/A'}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Reader Viewport */}
              <div style={{ 
                flex: 1, 
                minHeight: isReaderFullscreen ? '100%' : '480px', 
                borderRadius: isReaderFullscreen ? '0' : '0.875rem', 
                overflow: 'hidden', 
                border: isReaderFullscreen ? 'none' : '1px solid var(--border)',
                background: '#1e293b',
                position: 'relative'
              }}>
                {viewingBook.pdfUrl ? (
                  <iframe 
                    src={viewingBook.pdfUrl}
                    title={viewingBook.title}
                    style={{ width: '100%', height: '100%', minHeight: isReaderFullscreen ? '100%' : '480px', border: 'none', background: '#ffffff' }}
                  />
                ) : (
                  <div style={{ 
                    height: '100%', 
                    minHeight: '380px',
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#f8fafc' 
                  }}>
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '50%', 
                      background: 'rgba(255,255,255,0.1)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginBottom: '1rem' 
                    }}>
                      <BookOpen size={32} color="#94a3b8" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                      {t('academicBooks.noPdfHeading') || 'No PDF Document Attached'}
                    </h3>
                    <p style={{ maxWidth: '400px', marginTop: '0.4rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                      {t('academicBooks.noPdfDesc') || 'This textbook does not have a PDF document link attached yet. Edit this book to provide a valid PDF document URL or upload a file.'}
                    </p>
                    <button
                      onClick={() => {
                        const b = viewingBook;
                        setViewingBook(null);
                        openEditModal(b);
                      }}
                      className="btn btn-primary"
                      style={{ marginTop: '1.25rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Edit3 size={15} /> {t('academicBooks.editToAddPdf') || 'Edit Book to Add PDF'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            {!isReaderFullscreen && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.75rem', borderTop: '1px solid var(--border)', background: 'var(--background)' }}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ border: '1px solid var(--border)', borderRadius: '0.75rem' }} 
                  onClick={() => setViewingBook(null)}
                >
                  {t('common.close') || 'Close'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
                  onClick={() => {
                    const b = viewingBook;
                    setViewingBook(null);
                    openEditModal(b);
                  }}
                >
                  <Edit3 size={16} /> {t('academicBooks.editBook') || 'Edit Book'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ───────────────────────────────────── */}
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
            maxWidth: '720px', 
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
                  background: modalMode === 'edit' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: modalMode === 'edit' ? '#f59e0b' : '#10b981',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {modalMode === 'edit' ? <Edit3 size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                    {modalMode === 'add' ? (t('academicBooks.addHeading') || 'Add Academic Book') : (t('academicBooks.editHeading') || 'Edit Academic Book')}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>
                    {modalMode === 'add' ? (t('academicBooks.addSub') || 'Publish a curriculum textbook or digital study material') : (t('academicBooks.editSub') || 'Update details for this curriculum textbook')}
                  </p>
                </div>
              </div>
              <button 
                className="action-btn" 
                onClick={() => setIsModalOpen(false)} 
                disabled={actionLoading}
                aria-label={t('common.close') || 'Close'}
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
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Cover Image Upload Section */}
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1rem', background: 'var(--background)', borderRadius: '0.875rem', border: '1px solid var(--border)' }}>
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '0.5rem', 
                    overflow: 'hidden', 
                    border: '1.5px solid var(--border)', 
                    background: 'var(--card)', 
                    flexShrink: 0, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    {formState.coverImageUrl ? (
                      <img src={formState.coverImageUrl} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <BookOpen size={24} style={{ color: 'var(--muted-foreground)' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                      {t('academicBooks.coverImage') || 'Book Cover Image'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                        {uploadingCover ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                        <span>{uploadingCover ? (t('academicBooks.uploading') || 'Uploading...') : (t('academicBooks.uploadCover') || 'Upload Cover')}</span>
                        <input type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} disabled={actionLoading || uploadingCover} />
                      </label>
                      {formState.coverImageUrl && (
                        <button 
                          type="button" 
                          onClick={() => setFormState(p => ({ ...p, coverImageUrl: '' }))}
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          {t('academicBooks.remove') || 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Cover URL (Optional fallback) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    {t('academicBooks.orCoverUrl') || 'Cover Image URL (Direct Link)'}
                  </label>
                  <input 
                    type="url" 
                    className="input" 
                    value={formState.coverImageUrl} 
                    onChange={(e) => setFormState({...formState, coverImageUrl: e.target.value})} 
                    disabled={actionLoading} 
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>

                {/* Book Title & Author */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {t('academicBooks.bookTitle') || 'Book Title'} *
                    </label>
                    <input 
                      type="text" 
                      className="input" 
                      value={formState.title} 
                      onChange={(e) => setFormState({...formState, title: e.target.value})} 
                      required 
                      disabled={actionLoading} 
                      placeholder={t('academicBooks.titlePlaceholder') || "e.g. Class 9 Higher Mathematics"}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {t('academicBooks.authorPublisherLabel') || 'Author / Publisher'}
                    </label>
                    <input 
                      type="text" 
                      className="input" 
                      value={formState.author} 
                      onChange={(e) => setFormState({...formState, author: e.target.value})} 
                      disabled={actionLoading} 
                      placeholder={t('academicBooks.authorPlaceholder') || "e.g. National Curriculum and Textbook Board (NCTB)"}
                    />
                  </div>
                </div>

                {/* Class & Subject */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {t('common.class') || 'Class'}
                    </label>
                    <select
                      className="input" 
                      value={formState.classId} 
                      onChange={(e) => setFormState({...formState, classId: e.target.value})} 
                      disabled={actionLoading}
                    >
                      <option value="">{t('common.selectClass') || 'Select Class...'}</option>
                      {classes.map(c => {
                        const cId = c.id || c.uuid || '';
                        return (
                          <option key={cId} value={cId}>{c.name}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {t('common.subject') || 'Subject'}
                    </label>
                    <input 
                      type="text" 
                      className="input" 
                      list="subjects-modal-datalist"
                      value={formState.subject} 
                      onChange={(e) => {
                        const val = e.target.value;
                        const matched = subjects.find(s => s.name.toLowerCase() === val.toLowerCase());
                        setFormState({
                          ...formState, 
                          subject: val,
                          subjectId: matched ? (matched.id || matched.uuid || '') : formState.subjectId
                        });
                      }} 
                      disabled={actionLoading} 
                      placeholder={t('academicBooks.subjectPlaceholder') || "e.g. Mathematics, English, Physics..."}
                    />
                    <datalist id="subjects-modal-datalist">
                      {subjects.map((s, idx) => (
                        <option key={s.id || s.uuid || idx} value={s.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Edition & Published Year */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {t('academicBooks.edition') || 'Edition'}
                    </label>
                    <input 
                      type="text" 
                      className="input" 
                      value={formState.edition} 
                      onChange={(e) => setFormState({...formState, edition: e.target.value})} 
                      disabled={actionLoading} 
                      placeholder={t('academicBooks.editionPlaceholder') || "e.g. 2024 Edition"}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {t('academicBooks.publishedYear') || 'Published Year'}
                    </label>
                    <input 
                      type="number" 
                      className="input" 
                      value={formState.publishedYear} 
                      onChange={(e) => setFormState({...formState, publishedYear: e.target.value})} 
                      disabled={actionLoading} 
                      placeholder={t('academicBooks.yearPlaceholder') || "e.g. 2024"}
                    />
                  </div>
                </div>

                {/* Total Pages & File Size */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {t('academicBooks.totalPages') || 'Total Pages'}
                    </label>
                    <input 
                      type="number" 
                      className="input" 
                      value={formState.totalPages} 
                      onChange={(e) => setFormState({...formState, totalPages: e.target.value})} 
                      disabled={actionLoading} 
                      placeholder={t('academicBooks.pagesPlaceholder') || "e.g. 280"}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {t('academicBooks.fileSizeBytes') || 'File Size (in bytes)'}
                    </label>
                    <input 
                      type="number" 
                      className="input" 
                      value={formState.fileSize} 
                      onChange={(e) => setFormState({...formState, fileSize: e.target.value})} 
                      disabled={actionLoading} 
                      placeholder={t('academicBooks.fileSizePlaceholder') || "e.g. 15485760 (15 MB)"}
                    />
                  </div>
                </div>

                {/* PDF Document Upload & URL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.875rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {t('academicBooks.pdfDoc') || 'PDF Document'} <span style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>{t('academicBooks.forReader') || '(for Reader feature)'}</span>
                    </label>
                    <label className="btn" style={{ 
                      border: '1px solid var(--border)', 
                      background: 'var(--card)', 
                      cursor: 'pointer', 
                      padding: '0.35rem 0.75rem', 
                      fontSize: '0.8rem', 
                      borderRadius: '0.5rem', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.4rem' 
                    }}>
                      {uploadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>{uploadingPdf ? (t('academicBooks.uploading') || 'Uploading...') : (t('academicBooks.uploadPdf') || 'Upload PDF')}</span>
                      <input type="file" accept="application/pdf" onChange={handlePdfUpload} style={{ display: 'none' }} disabled={actionLoading || uploadingPdf} />
                    </label>
                  </div>
                  <input 
                    type="url" 
                    className="input" 
                    value={formState.pdfUrl} 
                    onChange={(e) => setFormState({...formState, pdfUrl: e.target.value})} 
                    disabled={actionLoading} 
                    placeholder={t('academicBooks.pdfUrlPlaceholder') || "https://example.com/curriculum-book.pdf"}
                  />
                  {formState.pdfUrl && (
                    <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={13} /> {t('academicBooks.pdfAttached') || 'PDF URL is attached'}
                    </span>
                  )}
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    {t('academicBooks.bookDesc') || 'Book Description'}
                  </label>
                  <textarea 
                    className="input" 
                    value={formState.description} 
                    onChange={(e) => setFormState({...formState, description: e.target.value})} 
                    disabled={actionLoading} 
                    rows={3}
                    style={{ height: 'auto', padding: '0.65rem 0.85rem', fontFamily: 'inherit', resize: 'vertical' }}
                    placeholder={t('academicBooks.descPlaceholder') || "Standard curriculum syllabus textbook for secondary educational grades..."}
                  />
                </div>

                {/* Active Status Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                  <button
                    type="button"
                    onClick={() => setFormState(p => ({ ...p, isActive: !p.isActive }))}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '99px',
                      border: 'none',
                      cursor: 'pointer',
                      background: formState.isActive ? 'var(--primary)' : 'var(--muted)',
                      position: 'relative',
                      transition: 'background 0.2s',
                      flexShrink: 0,
                    }}
                    aria-label={t('academicBooks.toggleStatus') || "Toggle Active Status"}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '3px',
                        left: formState.isActive ? '22px' : '3px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'white',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                      }}
                    />
                  </button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    {formState.isActive 
                      ? (t('academicBooks.statusActiveLabel') || 'Active (Visible to Students & Staff)') 
                      : (t('academicBooks.statusInactiveLabel') || 'Inactive (Draft / Hidden)')}
                  </span>
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
                    {actionLoading && <Loader2 size={16} className="animate-spin" />} 
                    {actionLoading 
                      ? (t('academicBooks.saving') || 'Saving...') 
                      : modalMode === 'add' 
                        ? (t('academicBooks.createBook') || 'Create Book') 
                        : (t('common.saveChanges') || 'Save Changes')}
                  </button>
                </div>
              </form>
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
                  {t('academicBooks.deleteHeading') || 'Delete Academic Book?'}
                </h2>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  {t('academicBooks.deleteConfirmPrefix') || 'Are you sure you want to permanently delete textbook'}{' '}
                  <strong style={{ color: 'var(--foreground)' }}>&ldquo;{deleteModal.title}&rdquo;</strong>?{' '}
                  {t('academicBooks.deleteConfirmSuffix') || 'Students and staff will no longer be able to access this material.'}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', padding: '1.25rem 1.75rem 1.75rem 1.75rem' }}>
              <button
                className="btn"
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.9rem' }}
                onClick={() => setDeleteModal({ open: false, id: '', title: '' })}
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
                {deleteLoading ? (t('academicBooks.deleting') || 'Deleting...') : (t('academicBooks.delete') || 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
