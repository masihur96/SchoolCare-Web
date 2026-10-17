"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  Search, Plus, Edit3, Trash2, Eye, Filter,
  ChevronLeft, ChevronRight, Loader2, X, Upload, AlertTriangle,
  BookOpen, BookMarked, Download, FileSpreadsheet, FileText,
  ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, User
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

interface Book {
  id: string;
  title: string;
  author?: string;
  category?: string;
  isbn?: string;
  description?: string;
  quantity?: number;
  available?: number;
  coverImage?: string;
  coverImageUrl?: string;
  isAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface BookFormState {
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverImageUrl: string;
  isAvailable: boolean;
  description: string;
  quantity: string | number;
  available: string | number;
}

const BOOK_CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Science', 'Mathematics',
  'History', 'Literature', 'Technology', 'Arts', 'Religion', 'Reference',
];

const getCategoryBadgeStyle = (cat?: string) => {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    'Fiction': { bg: 'rgba(99, 102, 241, 0.12)', text: '#6366f1', border: 'rgba(99, 102, 241, 0.25)' },
    'Non-Fiction': { bg: 'rgba(14, 165, 233, 0.12)', text: '#0ea5e9', border: 'rgba(14, 165, 233, 0.25)' },
    'Science': { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.25)' },
    'Mathematics': { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.25)' },
    'History': { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.25)' },
    'Literature': { bg: 'rgba(236, 72, 153, 0.12)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.25)' },
    'Technology': { bg: 'rgba(20, 184, 166, 0.12)', text: '#0d9488', border: 'rgba(20, 184, 166, 0.25)' },
    'Arts': { bg: 'rgba(249, 115, 22, 0.12)', text: '#ea580c', border: 'rgba(249, 115, 22, 0.25)' },
    'Religion': { bg: 'rgba(132, 204, 22, 0.12)', text: '#65a30d', border: 'rgba(132, 204, 22, 0.25)' },
    'Reference': { bg: 'rgba(100, 116, 139, 0.12)', text: '#475569', border: 'rgba(100, 116, 139, 0.25)' },
  };
  return styles[cat || ''] || { bg: 'rgba(148, 163, 184, 0.12)', text: '#64748b', border: 'rgba(148, 163, 184, 0.25)' };
};

export default function LibraryPage() {
  const { t, language } = useLanguage();

  const formatNumber = useCallback((num: number | string | undefined | null) => {
    if (num === undefined || num === null || num === '') return '';
    return language === 'bn' ? Number(num).toLocaleString('bn-BD') : num.toString();
  }, [language]);

  const getCategoryLabel = useCallback((cat?: string) => {
    if (!cat) return t('library.categoryGeneral') || 'General';
    const keyMap: Record<string, string> = {
      'Fiction': 'library.cat.fiction',
      'Non-Fiction': 'library.cat.nonFiction',
      'Science': 'library.cat.science',
      'Mathematics': 'library.cat.mathematics',
      'History': 'library.cat.history',
      'Literature': 'library.cat.literature',
      'Technology': 'library.cat.technology',
      'Arts': 'library.cat.arts',
      'Religion': 'library.cat.religion',
      'Reference': 'library.cat.reference',
    };
    const key = keyMap[cat];
    if (key) {
      const translated = t(key);
      if (translated && translated !== key) return translated;
    }
    return cat;
  }, [t]);

  const getModalTitle = () => {
    if (modalMode === 'add') return t('library.addNewBook') || 'Add New Book';
    if (modalMode === 'edit') return t('library.editBookTitle') || 'Edit Book Details';
    return t('library.bookDetails') || 'Book Details';
  };

  const getModalSubtitle = () => {
    if (modalMode === 'view') return t('library.viewSubtitle') || 'Read-only book information';
    return t('library.formSubtitle') || 'Fill in the information below to continue';
  };

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAvailability, setFilterAvailability] = useState(''); // 'available', 'unavailable', ''
  const [sortBy, setSortBy] = useState<'title-asc' | 'title-desc' | 'qty-desc' | 'qty-asc' | 'none'>('title-asc');
  const [titleSortOrder, setTitleSortOrder] = useState<'asc' | 'desc' | 'none'>('asc');

  // Toggle filters visibility
  const [showFilters, setShowFilters] = useState(false);

  // Export dropdown
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; title: string; isbn: string }>({
    open: false,
    id: '',
    title: '',
    isbn: ''
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form State
  const [formState, setFormState] = useState<BookFormState>({
    title: '',
    author: '',
    isbn: '',
    category: 'Fiction',
    coverImageUrl: '',
    isAvailable: true,
    description: '',
    quantity: '',
    available: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);

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
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.export-dropdown-container')) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportDropdownOpen]);

  // Fetch books
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {
        'accept': '*/*',
        'Authorization': `Bearer ${getApiToken()}`
      };

      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterCategory && filterCategory !== 'All') params.set('category', filterCategory);

      const url = `${API_BASE_URL}/library/books${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { headers, cache: 'no-store' });

      if (response.ok) {
        const json = await response.json();
        let fetched: Book[] = [];
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
    } catch (error) {
      console.error('Failed to fetch books:', error);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterCategory]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Reset form
  const resetForm = () => {
    setFormState({
      title: '',
      author: '',
      isbn: '',
      category: 'Fiction',
      coverImageUrl: '',
      isAvailable: true,
      description: '',
      quantity: '',
      available: ''
    });
    setSelectedBook(null);
    setSubmitError(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (book: Book) => {
    setFormState({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      category: book.category || 'Fiction',
      coverImageUrl: (book.coverImageUrl || book.coverImage || '') as string,
      isAvailable: book.isAvailable !== false,
      description: book.description || '',
      quantity: book.quantity !== undefined ? book.quantity : '',
      available: book.available !== undefined ? book.available : ''
    });
    setSelectedBook(book);
    setSubmitError(null);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openViewModal = (book: Book) => {
    setSelectedBook(book);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = (book: Book) => {
    setDeleteModal({
      open: true,
      id: book.id,
      title: book.title || (t('library.untitledBook') || 'Untitled Book'),
      isbn: book.isbn || (t('common.na') || 'N/A')
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/library/books/${deleteModal.id}`, {
        method: 'DELETE',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`
        }
      });
      if (response.ok) {
        setDeleteModal({ open: false, id: '', title: '', isbn: '' });
        fetchBooks();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`${t('library.deleteFailed') || 'Failed to delete book'}: ${errorData.message || t('common.unknownError') || 'Unknown error'}`);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : (t('library.deleteError') || 'Error deleting book.'));
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
    setUploadingImage(true);

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
        alert(t('library.uploadFailed') || 'Failed to upload image.');
      }
    } catch {
      alert(t('library.uploadError') || 'Error uploading image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;
    if (!formState.title.trim()) {
      setSubmitError(t('library.titleRequired') || 'Book title is required.');
      return;
    }

    setActionLoading(true);
    setSubmitError(null);

    const body: Record<string, unknown> = {
      title: formState.title.trim(),
      author: formState.author.trim(),
      isbn: formState.isbn.trim(),
      category: formState.category,
      coverImageUrl: formState.coverImageUrl.trim(),
      isAvailable: formState.isAvailable,
      description: formState.description.trim(),
    };

    if (formState.quantity !== '' && !isNaN(Number(formState.quantity))) {
      body.quantity = Number(formState.quantity);
    }
    if (formState.available !== '' && !isNaN(Number(formState.available))) {
      body.available = Number(formState.available);
    }

    try {
      const isEdit = modalMode === 'edit' && selectedBook?.id;
      const url = isEdit
        ? `${API_BASE_URL}/library/books/${selectedBook.id}`
        : `${API_BASE_URL}/library/books`;
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchBooks();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setSubmitError(errorData.message || `Request failed (${response.status})`);
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : (t('library.saveError') || 'Error saving book information.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered and Sorted books
  const filteredAndSortedBooks = useMemo(() => {
    let result = [...books];

    // Client-side search across title, author, isbn, category
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(b =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.isbn && b.isbn.toLowerCase().includes(q)) ||
        (b.category && b.category.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (filterCategory && filterCategory !== 'All') {
      result = result.filter(b => b.category?.toLowerCase() === filterCategory.toLowerCase());
    }

    // Availability filter
    if (filterAvailability === 'available') {
      result = result.filter(b => b.isAvailable !== false && (b.available === undefined || b.available > 0));
    } else if (filterAvailability === 'unavailable') {
      result = result.filter(b => b.isAvailable === false || (b.available !== undefined && b.available <= 0));
    }

    // Sorting
    if (sortBy === 'title-asc' || (sortBy === 'none' && titleSortOrder === 'asc')) {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'title-desc' || (sortBy === 'none' && titleSortOrder === 'desc')) {
      result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    } else if (sortBy === 'qty-desc') {
      result.sort((a, b) => ((b.available ?? b.quantity ?? 0) - (a.available ?? a.quantity ?? 0)));
    } else if (sortBy === 'qty-asc') {
      result.sort((a, b) => ((a.available ?? a.quantity ?? 0) - (b.available ?? b.quantity ?? 0)));
    }

    return result;
  }, [books, debouncedSearch, filterCategory, filterAvailability, sortBy, titleSortOrder]);

  const total = filteredAndSortedBooks.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const paginatedBooks = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredAndSortedBooks.slice(startIndex, startIndex + limit);
  }, [filteredAndSortedBooks, page, limit]);

  const toggleTitleSort = () => {
    setTitleSortOrder(current => {
      const next = current === 'asc' ? 'desc' : current === 'desc' ? 'none' : 'asc';
      if (next === 'asc') setSortBy('title-asc');
      else if (next === 'desc') setSortBy('title-desc');
      else setSortBy('none');
      return next;
    });
  };

  const activeFiltersCount =
    (filterCategory && filterCategory !== 'All' ? 1 : 0) +
    (filterAvailability !== '' ? 1 : 0) +
    (debouncedSearch ? 1 : 0) +
    (sortBy !== 'title-asc' ? 1 : 0);

  const resetAllFilters = () => {
    setFilterCategory('All');
    setFilterAvailability('');
    setSortBy('title-asc');
    setTitleSortOrder('asc');
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
  };

  // Export current view to CSV
  const handleExportCSV = () => {
    setExportDropdownOpen(false);
    if (paginatedBooks.length === 0) return;

    const headers = [
      t('library.exportSl') || "SL",
      t('library.exportTitle') || "Title",
      t('library.exportAuthor') || "Author",
      t('library.exportCategory') || "Category",
      t('library.exportIsbn') || "ISBN",
      t('library.exportTotalQuantity') || "Total Quantity",
      t('library.exportAvailableCopies') || "Available Copies",
      t('library.exportStatus') || "Status"
    ];
    const rows = paginatedBooks.map((b, idx) => [
      ((page - 1) * limit + idx + 1).toString(),
      `"${(b.title || '').replace(/"/g, '""')}"`,
      `"${(b.author || '').replace(/"/g, '""')}"`,
      `"${(getCategoryLabel(b.category) || '').replace(/"/g, '""')}"`,
      `"${(b.isbn || '').replace(/"/g, '""')}"`,
      b.quantity !== undefined ? b.quantity.toString() : (t('common.na') || 'N/A'),
      b.available !== undefined ? b.available.toString() : (t('common.na') || 'N/A'),
      b.isAvailable !== false ? (t('library.available') || "Available") : (t('library.unavailable') || "Unavailable")
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `library_books_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current view to PDF
  const handleExportPDF = async () => {
    setExportDropdownOpen(false);
    if (paginatedBooks.length === 0) return;

    const { jsPDF, autoTable } = await getPdfTools();
    const doc = new jsPDF('portrait');

    // Header
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(t('library.reportTitle') || "Library Books Report", 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const subtitleParts = [
      `${t('library.page') || 'Page'}: ${formatNumber(page)} ${t('library.of') || 'of'} ${formatNumber(totalPages)}`,
      `${t('library.total') || 'Total'}: ${formatNumber(total)} ${t('library.booksCount') || 'books'}`,
      `${t('library.generated') || 'Generated'}: ${new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')}`
    ];
    if (filterCategory && filterCategory !== 'All') {
      subtitleParts.push(`${t('library.category') || 'Category'}: ${getCategoryLabel(filterCategory)}`);
    }
    if (filterAvailability) {
      subtitleParts.push(`${t('library.status') || 'Status'}: ${filterAvailability === 'available' ? (t('library.available') || 'Available') : (t('library.unavailable') || 'Unavailable')}`);
    }
    doc.text(subtitleParts.join(' | '), 14, 25);

    const tableColumn = [
      "#",
      t('library.exportTitle') || "Title",
      t('library.exportAuthor') || "Author",
      t('library.exportCategory') || "Category",
      t('library.exportIsbn') || "ISBN",
      t('library.exportTotalQuantity') || "Quantity",
      t('library.exportAvailableCopies') || "Available",
      t('library.exportStatus') || "Status"
    ];
    const tableRows = paginatedBooks.map((b, idx) => [
      formatNumber((page - 1) * limit + idx + 1),
      b.title || (t('common.na') || 'N/A'),
      b.author || (t('common.na') || 'N/A'),
      getCategoryLabel(b.category) || (t('common.na') || 'N/A'),
      b.isbn || (t('common.na') || 'N/A'),
      b.quantity !== undefined ? formatNumber(b.quantity) : (t('common.na') || 'N/A'),
      b.available !== undefined ? formatNumber(b.available) : (t('common.na') || 'N/A'),
      b.isAvailable !== false ? (t('library.available') || 'Available') : (t('library.unavailable') || 'Unavailable')
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
          `${t('library.page') || 'Page'} ${formatNumber(data.pageNumber)} ${t('library.of') || 'of'} ${formatNumber(pageCount)}`,
          doc.internal.pageSize.width - 25,
          doc.internal.pageSize.height - 10
        );
      }
    });

    doc.save(`library_books_page_${page}.pdf`);
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
                  placeholder={t('library.searchPlaceholder') || "Search book title, author, category, or ISBN..."}
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
                    aria-label={t('library.clearAll') || 'Clear search'}
                    style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter, Export & Add Buttons */}
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
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <Filter size={16} />
                <span>{t('library.filters') || 'Filters'}</span>
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
                  disabled={paginatedBooks.length === 0}
                  title={t('library.exportOptions') || "Export Options"}
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
                    opacity: paginatedBooks.length === 0 ? 0.6 : 1,
                    cursor: paginatedBooks.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Download size={16} />
                  <span>{t('library.export') || 'Export'}</span>
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
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <FileSpreadsheet size={15} style={{ color: '#10b981' }} />
                      <span>{t('library.exportCsv') || 'Export as CSV'}</span>
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
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <FileText size={15} style={{ color: '#ef4444' }} />
                      <span>{t('library.exportPdf') || 'Export as PDF'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Add Book Button */}
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
                  boxShadow: '0 4px 15px rgba(79, 70, 229, 0.35)',
                  cursor: 'pointer'
                }}
              >
                <Plus size={18} /> {t('library.addBook') || 'Add Book'}
              </button>

              {/* Page Sizer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.75rem', height: '42px', padding: '0 0.75rem', background: 'var(--background)' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{t('library.show') || 'Show:'}</span>
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
                  {t('library.clearAll') || 'Clear all'}
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
              {/* Category Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('library.category') || 'Category'}
                </label>
                <select
                  className="input"
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="All">{t('library.allCategories') || 'All Categories'}</option>
                  {BOOK_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                  ))}
                </select>
              </div>

              {/* Availability Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('library.availabilityStatus') || 'Availability Status'}
                </label>
                <select
                  className="input"
                  value={filterAvailability}
                  onChange={(e) => {
                    setFilterAvailability(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('library.allStatuses') || 'All Statuses'}</option>
                  <option value="available">{t('library.availableForBorrowing') || 'Available for Borrowing'}</option>
                  <option value="unavailable">{t('library.currentlyUnavailable') || 'Currently Unavailable'}</option>
                </select>
              </div>

              {/* Sort Order */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('library.sortOrder') || 'Sort Order'}
                </label>
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'title-asc' | 'title-desc' | 'qty-desc' | 'qty-asc' | 'none')}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="title-asc">{t('library.sortTitleAsc') || 'Title: A to Z'}</option>
                  <option value="title-desc">{t('library.sortTitleDesc') || 'Title: Z to A'}</option>
                  <option value="qty-desc">{t('library.sortQtyDesc') || 'Available Stock: High to Low'}</option>
                  <option value="qty-asc">{t('library.sortQtyAsc') || 'Available Stock: Low to High'}</option>
                  <option value="none">{t('library.sortNone') || 'Original Order'}</option>
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
                  {t('library.sl') || '#'}
                </th>
                <th
                  onClick={toggleTitleSort}
                  title={t('library.clickToSortTitle') || "Click to sort by Title"}
                  style={{
                    padding: '0.875rem 1.25rem',
                    color: titleSortOrder !== 'none' ? 'var(--primary)' : 'var(--muted-foreground)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{t('library.bookDetails') || 'Book Details'}</span>
                    {titleSortOrder === 'asc' ? (
                      <ArrowUp size={14} style={{ color: 'var(--primary)' }} />
                    ) : titleSortOrder === 'desc' ? (
                      <ArrowDown size={14} style={{ color: 'var(--primary)' }} />
                    ) : (
                      <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                    )}
                  </div>
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '140px' }}>
                  {t('library.category') || 'Category'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '160px' }}>
                  {t('library.isbn') || 'ISBN'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '160px' }}>
                  {t('library.stockAndQuantity') || 'Stock & Quantity'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '120px' }}>
                  {t('library.status') || 'Status'}
                </th>
                <th style={{ padding: '0.875rem 1.25rem', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', width: '140px' }}>
                  {t('library.actions') || 'Actions'}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div className="shimmer shimmer-block" style={{ width: '42px', height: '42px', flexShrink: 0, borderRadius: '0.5rem' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '180px' }}>
                          <div className="shimmer shimmer-text"></div>
                          <div className="shimmer shimmer-text short" style={{ margin: 0 }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-block" style={{ width: '85px', height: '24px', borderRadius: '999px' }}></div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '100px', margin: 0 }}></div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '65px', margin: 0 }}></div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-block" style={{ width: '75px', height: '22px', borderRadius: '999px' }}></div>
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
                  const catStyle = getCategoryBadgeStyle(book.category);
                  const isAvail = book.isAvailable !== false && (book.available === undefined || book.available > 0);
                  const coverSrc = (book.coverImageUrl || book.coverImage) as string;

                  return (
                    <tr
                      key={book.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* SL No */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        {formatNumber(sl)}
                      </td>

                      {/* Book Details (Cover + Title + Author) */}
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
                            {coverSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={coverSrc}
                                alt={book.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <BookMarked size={20} style={{ color: 'var(--primary)' }} />
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span
                              style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.925rem', cursor: 'pointer' }}
                              onClick={() => openViewModal(book)}
                              title={t('library.clickToViewDetails') || "Click to view full details"}
                            >
                              {book.title}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <User size={12} />
                              {book.author ? book.author : (t('library.unknownAuthor') || 'Unknown author')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {book.category ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: catStyle.bg,
                            color: catStyle.text,
                            border: `1px solid ${catStyle.border}`
                          }}>
                            {getCategoryLabel(book.category)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)' }}>{t('library.categoryGeneral') || 'General'}</span>
                        )}
                      </td>

                      {/* ISBN */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {book.isbn ? (
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
                            {book.isbn}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)' }}>—</span>
                        )}
                      </td>

                      {/* Stock & Quantity */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                            {book.available !== undefined ? formatNumber(book.available) : (book.quantity !== undefined ? formatNumber(book.quantity) : '—')}
                            {book.quantity !== undefined && book.available !== undefined ? (
                              <span style={{ color: 'var(--muted-foreground)', fontWeight: 400, fontSize: '0.8rem' }}> / {formatNumber(book.quantity)}</span>
                            ) : ''}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                            {book.available !== undefined && book.quantity !== undefined
                              ? `${formatNumber(Math.max(0, book.quantity - book.available))} ${t('library.borrowed') || 'borrowed'}`
                              : (t('library.copiesRegistered') || 'copies registered')}
                          </span>
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
                          background: isAvail ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: isAvail ? '#10b981' : '#ef4444',
                          border: `1px solid ${isAvail ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: isAvail ? '#10b981' : '#ef4444'
                          }}></span>
                          {isAvail ? (t('library.available') || 'Available') : (t('library.unavailable') || 'Unavailable')}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            className="action-btn"
                            title={t('library.viewBookDetails') || "View book details"}
                            aria-label={t('library.viewBookDetails') || "View book details"}
                            onClick={() => openViewModal(book)}
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
                            title={t('library.editBook') || "Edit book"}
                            aria-label={t('library.editBook') || "Edit book"}
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
                            title={t('library.deleteBook') || "Delete book"}
                            aria-label={t('library.deleteBook') || "Delete book"}
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
                        <BookOpen size={28} />
                      </div>
                      <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                        {t('library.noBooks') || 'No books found'}
                      </p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                        {searchTerm || (filterCategory && filterCategory !== 'All') || filterAvailability
                          ? (t('library.tryAdjusting') || 'Try adjusting your search keywords or resetting filters.')
                          : (t('library.noBooksYet') || 'No books have been added to the library yet. Click "Add Book" to begin.')}
                      </p>
                      {(searchTerm || (filterCategory && filterCategory !== 'All') || filterAvailability) && (
                        <button
                          onClick={resetAllFilters}
                          className="btn"
                          style={{ marginTop: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '0.85rem' }}
                        >
                          {t('library.clearFilters') || 'Clear Filters'}
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
              {t('library.showing') || 'Showing'} <strong style={{ color: 'var(--foreground)' }}>{formatNumber(((page - 1) * limit) + 1)}</strong> {t('library.to') || 'to'} <strong style={{ color: 'var(--foreground)' }}>{formatNumber(Math.min(page * limit, total))}</strong> {t('library.of') || 'of'} <strong style={{ color: 'var(--foreground)' }}>{formatNumber(total)}</strong> {t('library.booksCount') || 'books'}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginRight: '0.5rem' }}>
                {t('library.page') || 'Page'} {formatNumber(page)} {t('library.of') || 'of'} {formatNumber(totalPages)}
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
                title={t('library.prevPage') || "Previous page"}
                aria-label={t('library.prevPage') || "Previous page"}
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
                title={t('library.nextPage') || "Next page"}
                aria-label={t('library.nextPage') || "Next page"}
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
            maxWidth: modalMode === 'view' ? '600px' : '680px',
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
                    {getModalTitle()}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>
                    {getModalSubtitle()}
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
              {modalMode === 'view' && selectedBook ? (
                /* View Only Profile Card */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', borderRadius: '1rem', background: 'var(--background)', border: '1px solid var(--border)' }}>
                    <div style={{
                      width: '64px',
                      height: '76px',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(129,140,248,0.2))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1.5px solid var(--border)',
                      flexShrink: 0
                    }}>
                      {(selectedBook.coverImageUrl || selectedBook.coverImage) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={(selectedBook.coverImageUrl || selectedBook.coverImage) as string}
                          alt={selectedBook.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <BookMarked size={32} style={{ color: 'var(--primary)' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                        {selectedBook.title}
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                        {selectedBook.author ? `${t('library.byAuthor') || t('dashboard.by') || 'by'} ${selectedBook.author}` : (t('library.unknownAuthor') || 'Unknown author')}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '0.15rem 0.55rem',
                          borderRadius: '999px',
                          fontSize: '0.725rem',
                          fontWeight: 600,
                          background: selectedBook.isAvailable !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: selectedBook.isAvailable !== false ? '#10b981' : '#ef4444',
                        }}>
                          {selectedBook.isAvailable !== false ? (t('library.available') || 'Available') : (t('library.unavailable') || 'Unavailable')}
                        </span>
                        {selectedBook.category && (
                          <span style={{
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            background: getCategoryBadgeStyle(selectedBook.category).bg,
                            color: getCategoryBadgeStyle(selectedBook.category).text,
                          }}>
                            {getCategoryLabel(selectedBook.category)}
                          </span>
                        )}
                        {selectedBook.isbn && (
                          <span style={{
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            background: 'rgba(79, 70, 229, 0.1)',
                            color: 'var(--primary)',
                            fontFamily: 'monospace'
                          }}>
                            {t('library.isbn') || 'ISBN'}: {selectedBook.isbn}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('library.category') || 'Category'}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--foreground)' }}>
                        {getCategoryLabel(selectedBook.category)}
                      </div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('library.isbnOrCode') || 'ISBN / Code'}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--foreground)', fontFamily: 'monospace' }}>
                        {selectedBook.isbn || (t('library.notSpecified') || 'Not specified')}
                      </div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('library.availableCopies') || 'Available Copies'}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: (selectedBook.available ?? selectedBook.quantity ?? 0) > 0 ? '#10b981' : '#ef4444' }}>
                        {selectedBook.available !== undefined ? formatNumber(selectedBook.available) : (selectedBook.quantity !== undefined ? formatNumber(selectedBook.quantity) : (t('common.na') || 'N/A'))}
                      </div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('library.totalCopies') || 'Total Registered Copies'}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--foreground)' }}>
                        {selectedBook.quantity !== undefined ? formatNumber(selectedBook.quantity) : (t('common.na') || 'N/A')}
                      </div>
                    </div>
                  </div>

                  {selectedBook.description && (
                    <div style={{ padding: '1.1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--background)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: '0.4rem' }}>
                        {t('library.description') || 'Description'}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--foreground)', lineHeight: 1.6 }}>
                        {selectedBook.description}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.5rem 1.25rem' }}
                      onClick={() => setIsModalOpen(false)}
                    >
                      {t('common.close') || 'Close'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem' }}
                      onClick={() => openEditModal(selectedBook)}
                    >
                      <Edit3 size={16} /> {t('library.editBook') || 'Edit Book'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Form for Add and Edit */
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* Cover Photo & Identity Section */}
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1rem', background: 'var(--background)', borderRadius: '0.875rem', border: '1px solid var(--border)' }}>
                    <div style={{
                      width: '56px',
                      height: '66px',
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
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={formState.coverImageUrl} alt={t('library.coverPreview') || "Cover Preview"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <BookMarked size={24} style={{ color: 'var(--muted-foreground)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                        {t('library.coverImage') || 'Book Cover Image'}
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
                          {uploadingImage ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                          <span>{uploadingImage ? (t('library.uploading') || 'Uploading...') : (t('library.uploadCover') || 'Upload Cover')}</span>
                          <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={actionLoading || uploadingImage} />
                        </label>
                        {formState.coverImageUrl && (
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setFormState(prev => ({ ...prev, coverImageUrl: '' }))}
                            style={{
                              border: '1px solid var(--border)',
                              background: 'transparent',
                              color: 'var(--destructive)',
                              padding: '0.4rem 0.75rem',
                              fontSize: '0.825rem',
                              borderRadius: '0.5rem',
                              cursor: 'pointer'
                            }}
                          >
                            {t('common.remove') || 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Direct Cover Image URL */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem', display: 'block' }}>
                      {t('library.orCoverUrl') || 'Or Cover Image URL'}
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/book-cover.jpg"
                      value={formState.coverImageUrl}
                      onChange={(e) => setFormState(prev => ({ ...prev, coverImageUrl: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.9rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.6rem',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem', display: 'block' }}>
                      {t('library.bookTitle') || 'Book Title'} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={t('library.titlePlaceholder') || "e.g. To Kill a Mockingbird"}
                      value={formState.title}
                      onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.9rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.6rem',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Author */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem', display: 'block' }}>
                      {t('library.author') || 'Author'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder={t('library.authorPlaceholder') || "e.g. Harper Lee"}
                        value={formState.author}
                        onChange={(e) => setFormState(prev => ({ ...prev, author: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.9rem',
                          border: '1px solid var(--border)',
                          borderRadius: '0.6rem',
                          background: 'var(--background)',
                          color: 'var(--foreground)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* ISBN and Category in 2-column grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem', display: 'block' }}>
                        {t('library.isbn') || 'ISBN'}
                      </label>
                      <input
                        type="text"
                        placeholder={t('library.isbnPlaceholder') || "e.g. 9780061120084"}
                        value={formState.isbn}
                        onChange={(e) => setFormState(prev => ({ ...prev, isbn: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.9rem',
                          border: '1px solid var(--border)',
                          borderRadius: '0.6rem',
                          background: 'var(--background)',
                          color: 'var(--foreground)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem', display: 'block' }}>
                        {t('library.category') || 'Category'}
                      </label>
                      <select
                        value={formState.category}
                        onChange={(e) => setFormState(prev => ({ ...prev, category: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.9rem',
                          border: '1px solid var(--border)',
                          borderRadius: '0.6rem',
                          background: 'var(--background)',
                          color: 'var(--foreground)',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        {BOOK_CATEGORIES.map(c => (
                          <option key={c} value={c}>{getCategoryLabel(c)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Total Quantity & Available Copies */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem', display: 'block' }}>
                        {t('library.totalQuantity') || 'Total Quantity'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder={t('library.quantityPlaceholder') || "e.g. 10"}
                        value={formState.quantity}
                        onChange={(e) => setFormState(prev => ({ ...prev, quantity: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.9rem',
                          border: '1px solid var(--border)',
                          borderRadius: '0.6rem',
                          background: 'var(--background)',
                          color: 'var(--foreground)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem', display: 'block' }}>
                        {t('library.availableForBorrowing') || 'Available for Borrowing'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder={t('library.availablePlaceholder') || "e.g. 8"}
                        value={formState.available}
                        onChange={(e) => setFormState(prev => ({ ...prev, available: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.9rem',
                          border: '1px solid var(--border)',
                          borderRadius: '0.6rem',
                          background: 'var(--background)',
                          color: 'var(--foreground)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.35rem', display: 'block' }}>
                      {t('library.description') || 'Description'}
                    </label>
                    <textarea
                      placeholder={t('library.descriptionPlaceholder') || "Brief summary or description of the book..."}
                      value={formState.description}
                      onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.9rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.6rem',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Availability Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                    <button
                      type="button"
                      onClick={() => setFormState(prev => ({ ...prev, isAvailable: !prev.isAvailable }))}
                      style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '99px',
                        border: 'none',
                        cursor: 'pointer',
                        background: formState.isAvailable ? 'var(--primary)' : 'var(--muted)',
                        position: 'relative',
                        transition: 'background 0.2s',
                        flexShrink: 0
                      }}
                      aria-label={t('library.toggleAvailability') || "Toggle availability"}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '3px',
                        left: formState.isAvailable ? '22px' : '3px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'white',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
                      }} />
                    </button>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {formState.isAvailable ? (t('library.availableForBorrowing') || 'Available for borrowing') : (t('library.notAvailable') || 'Not available')}
                    </span>
                  </div>

                  {/* Error Notification */}
                  {submitError && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      background: 'rgba(239, 68, 68, 0.08)',
                      borderRadius: '0.6rem',
                      border: '1px solid rgba(239, 68, 68, 0.25)'
                    }}>
                      <AlertTriangle size={16} color="#ef4444" />
                      <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 500 }}>{submitError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={() => !actionLoading && setIsModalOpen(false)}
                      disabled={actionLoading}
                      style={{
                        padding: '0.65rem 1.4rem',
                        borderRadius: '0.65rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      {t('common.cancel') || 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      style={{
                        padding: '0.65rem 1.6rem',
                        borderRadius: '0.65rem',
                        background: 'var(--primary)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        opacity: actionLoading ? 0.75 : 1,
                        boxShadow: '0 4px 15px rgba(79, 70, 229, 0.35)'
                      }}
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{modalMode === 'edit' ? (t('library.saving') || 'Saving...') : (t('library.adding') || 'Adding...')}</span>
                        </>
                      ) : (
                        <>
                          {modalMode === 'edit' ? <Edit3 size={15} /> : <Plus size={16} />}
                          <span>{modalMode === 'edit' ? (t('library.saveChanges') || 'Save Changes') : (t('library.addBook') || 'Add Book')}</span>
                        </>
                      )}
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
                  {t('library.deleteHeading') || 'Delete Book Record'}
                </h2>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  {t('library.deleteConfirmPrefix') || 'Are you sure you want to permanently delete'} <strong style={{ color: 'var(--foreground)' }}>{deleteModal.title}</strong>
                  {deleteModal.isbn && deleteModal.isbn !== 'N/A' && deleteModal.isbn !== '—' ? ` (${t('library.isbn') || 'ISBN'}: ${deleteModal.isbn})` : ''}? {t('library.deleteConfirmSuffix') || 'This will remove it from the library catalog.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', padding: '1.25rem 1.75rem 1.75rem 1.75rem' }}>
              <button
                className="btn"
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.9rem' }}
                onClick={() => setDeleteModal({ open: false, id: '', title: '', isbn: '' })}
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
                  fontWeight: 600,
                  cursor: deleteLoading ? 'not-allowed' : 'pointer'
                }}
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>{deleteLoading ? (t('library.deleting') || 'Deleting...') : (t('library.delete') || 'Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
