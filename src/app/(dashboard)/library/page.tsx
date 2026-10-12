"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Search, X, BookMarked, User,
  Hash, AlertCircle, RefreshCw, Filter, Tag, Plus, Loader2, Pencil, CheckCircle
} from 'lucide-react';

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
  [key: string]: unknown;
}

interface BookForm {
  title: string;
  author: string;
  isbn: string;
  category: string;
  coverImageUrl: string;
  isAvailable: boolean;
  description: string;
}

const BOOK_CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Science', 'Mathematics',
  'History', 'Literature', 'Technology', 'Arts', 'Religion', 'Reference',
];
const FILTER_CATEGORIES = ['All', ...BOOK_CATEGORIES];

const EMPTY_FORM: BookForm = {
  title: '', author: '', isbn: '', category: 'Fiction',
  coverImageUrl: '', isAvailable: true, description: '',
};

// ── Shared modal form ────────────────────────────────────────────────────────
function BookModal({
  mode,
  initialForm,
  onClose,
  onSuccess,
  bookId,
}: {
  mode: 'create' | 'edit';
  initialForm: BookForm;
  onClose: () => void;
  onSuccess: () => void;
  bookId?: string;
}) {
  const [form, setForm] = useState<BookForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleFormChange = (field: keyof BookForm, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.9rem',
    border: '1px solid var(--border)', borderRadius: '0.6rem',
    background: 'var(--background)', color: 'var(--foreground)',
    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)',
    marginBottom: '0.35rem', display: 'block',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setSubmitError('Title is required.'); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body = {
        title: form.title.trim(),
        author: form.author.trim(),
        isbn: form.isbn.trim(),
        category: form.category,
        coverImageUrl: form.coverImageUrl.trim(),
        isAvailable: form.isAvailable,
        description: form.description.trim(),
      };
      const url = mode === 'edit'
        ? `${API_BASE_URL}/library/books/${bookId}`
        : `${API_BASE_URL}/library/books`;
      const method = mode === 'edit' ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Request failed (${res.status})`);
      }
      setSubmitSuccess(true);
      onSuccess();
      setTimeout(() => onClose(), 1500);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = mode === 'edit';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div style={{ background: 'var(--background, #fff)', borderRadius: '1.25rem', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px -12px rgba(0,0,0,0.25)', animation: 'modal-in 0.22s cubic-bezier(0.16,1,0.3,1)' }}>
        {/* Header */}
        <div style={{ padding: '1.5rem 1.75rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)' }}>
              {isEdit ? 'Update Book' : 'Add New Book'}
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
              {isEdit ? 'Edit the book details below.' : 'Fill in the details to add a book to the library.'}
            </p>
          </div>
          <button onClick={() => !submitting && onClose()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '0.25rem', borderRadius: '6px', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Success */}
        {submitSuccess ? (
          <div style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircle size={32} color="#16a34a" />
            </div>
            <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--foreground)', fontSize: '1.1rem' }}>
              {isEdit ? 'Book Updated Successfully!' : 'Book Added Successfully!'}
            </h3>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
              {isEdit ? 'The book details have been saved.' : 'The book has been added to the library.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              {/* Title */}
              <div>
                <label style={labelStyle}>Title <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" placeholder="e.g. The Great Gatsby" value={form.title}
                  onChange={e => handleFormChange('title', e.target.value)} required style={inputStyle} />
              </div>

              {/* Author */}
              <div>
                <label style={labelStyle}>Author</label>
                <input type="text" placeholder="e.g. F. Scott Fitzgerald" value={form.author}
                  onChange={e => handleFormChange('author', e.target.value)} style={inputStyle} />
              </div>

              {/* ISBN & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>ISBN</label>
                  <input type="text" placeholder="e.g. 9780743273565" value={form.isbn}
                    onChange={e => handleFormChange('isbn', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={form.category} onChange={e => handleFormChange('category', e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    {BOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Cover Image URL */}
              <div>
                <label style={labelStyle}>Cover Image URL</label>
                <input type="url" placeholder="https://example.com/cover.jpg" value={form.coverImageUrl}
                  onChange={e => handleFormChange('coverImageUrl', e.target.value)} style={inputStyle} />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea placeholder="Brief description of the book..." value={form.description}
                  onChange={e => handleFormChange('description', e.target.value)}
                  rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              {/* Is Available toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button type="button" onClick={() => handleFormChange('isAvailable', !form.isAvailable)}
                  style={{ width: '44px', height: '24px', borderRadius: '99px', border: 'none', cursor: 'pointer', background: form.isAvailable ? '#4f46e5' : '#d1d5db', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                  aria-label="Toggle availability">
                  <span style={{ position: 'absolute', top: '3px', left: form.isAvailable ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                </button>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  {form.isAvailable ? 'Available for borrowing' : 'Not available'}
                </span>
              </div>

              {/* Error */}
              {submitError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: '0.6rem', border: '1px solid #fecaca' }}>
                  <AlertCircle size={16} color="#ef4444" />
                  <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 500 }}>{submitError}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => !submitting && onClose()} disabled={submitting}
                style={{ padding: '0.65rem 1.4rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding: '0.65rem 1.6rem', borderRadius: '0.65rem', background: isEdit ? '#0ea5e9' : '#4f46e5', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem', opacity: submitting ? 0.75 : 1 }}>
                {submitting
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {isEdit ? 'Saving...' : 'Adding...'}</>
                  : isEdit
                    ? <><Pencil size={15} /> Save Changes</>
                    : <><Plus size={16} /> Add Book</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('All');

  // Modal state
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; book?: Book } | null>(null);

  const fetchBooks = useCallback(async (searchVal: string, categoryVal: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchVal) params.set('search', searchVal);
      if (categoryVal && categoryVal !== 'All') params.set('category', categoryVal);
      const url = `${API_BASE_URL}/library/books${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Failed to fetch books (${res.status})`);
      const json = await res.json();
      let fetched: Book[] = [];
      if (Array.isArray(json)) fetched = json;
      else if (json.data && Array.isArray(json.data)) fetched = json.data;
      else if (json.books && Array.isArray(json.books)) fetched = json.books;
      setBooks(fetched);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBooks(search, category); }, [search, category, fetchBooks]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSearch(searchInput.trim()); };
  const clearSearch = () => { setSearchInput(''); setSearch(''); };

  const getCategoryColor = (cat?: string) => {
    const colors: Record<string, string> = {
      Fiction: '#6366f1', 'Non-Fiction': '#0ea5e9', Science: '#10b981',
      Mathematics: '#f59e0b', History: '#8b5cf6', Literature: '#ec4899',
      Technology: '#14b8a6', Arts: '#f97316', Religion: '#84cc16', Reference: '#64748b',
    };
    return colors[cat || ''] || '#94a3b8';
  };

  const openCreate = () => setModal({ mode: 'create' });
  const openEdit = (book: Book) => setModal({ mode: 'edit', book });
  const closeModal = () => setModal(null);
  const onSuccess = () => fetchBooks(search, category);

  const getEditForm = (book: Book): BookForm => ({
    title: book.title || '',
    author: book.author || '',
    isbn: book.isbn || '',
    category: book.category || 'Fiction',
    coverImageUrl: (book.coverImageUrl || book.coverImage || '') as string,
    isAvailable: book.isAvailable !== false,
    description: book.description || '',
  });

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.025em' }}>
            Library
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.4rem', fontSize: '1rem' }}>
            Browse and manage the school book collection.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => fetchBooks(search, category)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--background)')}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={openCreate}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.35rem', borderRadius: '0.65rem', background: '#4f46e5', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px -4px rgba(79,70,229,0.4)' }}
          >
            <Plus size={18} /> Add Book
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ flex: '1 1 280px', display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Search by title, author..." value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: searchInput ? '2.5rem' : '0.9rem', paddingTop: '0.65rem', paddingBottom: '0.65rem', border: '1px solid var(--border)', borderRadius: '0.65rem', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
            {searchInput && (
              <button type="button" onClick={clearSearch} style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', padding: 0 }}>
                <X size={15} />
              </button>
            )}
          </div>
          <button type="submit" style={{ padding: '0.65rem 1.2rem', borderRadius: '0.65rem', background: '#4f46e5', color: 'white', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
            Search
          </button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={15} style={{ color: 'var(--muted-foreground)' }} />
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ padding: '0.65rem 1rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}>
            {FILTER_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Active filter pills */}
      {(search || category !== 'All') && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {search && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.75rem', borderRadius: '99px', background: '#eef2ff', color: '#4f46e5', fontSize: '0.82rem', fontWeight: 600 }}>
              <Search size={12} /> &ldquo;{search}&rdquo;
              <button onClick={clearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', padding: 0, display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          {category !== 'All' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.75rem', borderRadius: '99px', background: '#f0fdf4', color: '#16a34a', fontSize: '0.82rem', fontWeight: 600 }}>
              <Tag size={12} /> {category}
              <button onClick={() => setCategory('All')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: 0, display: 'flex' }}><X size={12} /></button>
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
              <div style={{ height: '150px', background: 'var(--muted)', animation: 'lib-pulse 1.5s ease-in-out infinite' }} />
              <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[70, 50, 40].map((w, j) => (
                  <div key={j} style={{ height: j === 0 ? '16px' : '13px', background: 'var(--muted)', borderRadius: '4px', width: `${w}%`, animation: 'lib-pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', background: 'var(--card)', borderRadius: '1.25rem', border: '1px dashed var(--border)', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <AlertCircle size={36} color="#ef4444" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>Failed to Load Books</h3>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', fontSize: '0.95rem' }}>{error}</p>
          <button onClick={() => fetchBooks(search, category)} style={{ marginTop: '1.5rem', padding: '0.65rem 1.5rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      ) : books.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8rem 2rem', background: 'var(--card)', borderRadius: '1.25rem', border: '1px dashed var(--border)', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', opacity: 0.5 }}>
            <BookOpen size={40} />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>No Books Found</h3>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
            {search || category !== 'All' ? 'Try adjusting your search or filter.' : 'The library collection is currently empty.'}
          </p>
          <button onClick={openCreate} style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.5rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
            <Plus size={16} /> Add First Book
          </button>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Showing <strong>{books.length}</strong> book{books.length !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1.5rem' }}>
            {books.map((book) => (
              <div
                key={book.id}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden', transition: 'transform 0.22s, box-shadow 0.22s', display: 'flex', flexDirection: 'column' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 28px -8px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Cover */}
                <div style={{ height: '150px', position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${getCategoryColor(book.category)}22, ${getCategoryColor(book.category)}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(book.coverImage || book.coverImageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(book.coverImage || book.coverImageUrl) as string} alt={book.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <BookMarked size={52} color={getCategoryColor(book.category)} style={{ opacity: 0.6 }} />
                  )}
                  {book.category && (
                    <span style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', background: getCategoryColor(book.category), color: 'white', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px' }}>
                      {book.category}
                    </span>
                  )}
                  {book.isAvailable === false && (
                    <span style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', background: '#ef4444', color: 'white', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px' }}>
                      Unavailable
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--foreground)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {book.title}
                  </h3>
                  {book.author && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--muted-foreground)', fontSize: '0.84rem' }}>
                      <User size={13} /> <span>{book.author}</span>
                    </div>
                  )}
                  {book.isbn && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>
                      <Hash size={13} /> <span>ISBN: {book.isbn}</span>
                    </div>
                  )}
                  {book.description && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', margin: '0.25rem 0 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {book.description}
                    </p>
                  )}

                  {/* Availability */}
                  {(book.quantity !== undefined || book.available !== undefined) && (
                    <div style={{ paddingTop: '0.6rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>Available</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: (book.available ?? book.quantity ?? 0) > 0 ? '#16a34a' : '#ef4444' }}>
                        {book.available ?? book.quantity ?? 0}
                        {book.quantity !== undefined && book.available !== undefined ? ` / ${book.quantity}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Update Button */}
                  <button
                    onClick={() => openEdit(book)}
                    style={{
                      marginTop: 'auto',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      padding: '0.55rem 0', width: '100%',
                      borderRadius: '0.6rem', border: '1px solid #bfdbfe',
                      background: '#eff6ff', color: '#2563eb',
                      fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                      transition: 'background 0.18s, border-color 0.18s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                  >
                    <Pencil size={14} /> Update
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Shared Modal */}
      {modal && (
        <BookModal
          mode={modal.mode}
          initialForm={modal.mode === 'edit' && modal.book ? getEditForm(modal.book) : EMPTY_FORM}
          bookId={modal.book?.id}
          onClose={closeModal}
          onSuccess={onSuccess}
        />
      )}

      <style>{`
        @keyframes lib-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
