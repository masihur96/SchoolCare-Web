"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Search, X, BookMarked, User,
  Hash, AlertCircle, RefreshCw, Filter, Tag, Plus, Loader2,
  Pencil, Trash2, Eye, ExternalLink, Calendar, FileText, CheckCircle,
  GraduationCap, Layers
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

function formatFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Modal Form (Create / Edit) ───────────────────────────────────────────────
function BookFormModal({
  mode,
  initialForm,
  bookId,
  classes,
  subjects,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  initialForm: AcademicBookForm;
  bookId?: string;
  classes: ClassEntity[];
  subjects: SubjectEntity[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<AcademicBookForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  const isEdit = mode === 'edit';

  const handleChange = (field: keyof AcademicBookForm, value: string | number | boolean) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'subject') {
        const matched = subjects.find(s => s.name.toLowerCase() === String(value).toLowerCase());
        if (matched) {
          updated.subjectId = matched.id || matched.uuid || '';
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrorMsg('Book title is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        author: form.author.trim(),
        classId: form.classId || undefined,
        subjectId: form.subjectId || undefined,
        subject: form.subject.trim(),
        edition: form.edition.trim(),
        coverImageUrl: form.coverImageUrl.trim(),
        pdfUrl: form.pdfUrl.trim(),
        description: form.description.trim(),
        isActive: form.isActive,
      };

      if (form.fileSize) {
        body.fileSize = Number(form.fileSize);
      }
      if (form.totalPages) {
        body.totalPages = Number(form.totalPages);
      }
      if (form.publishedYear) {
        body.publishedYear = Number(form.publishedYear);
      }

      const url = isEdit
        ? `${API_BASE_URL}/academic-ebooks/${bookId}`
        : `${API_BASE_URL}/academic-ebooks`;
      const method = isEdit ? 'PATCH' : 'POST';

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
        throw new Error(errJson.message || `Request failed with status ${res.status}`);
      }

      setSuccessMsg(true);
      onSuccess();
      setTimeout(() => onClose(), 1400);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.9rem',
    border: '1px solid var(--border)',
    borderRadius: '0.6rem',
    background: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--foreground)',
    marginBottom: '0.35rem',
    display: 'block',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--background, #fff)',
          borderRadius: '1.25rem',
          width: '100%',
          maxWidth: '580px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 24px 60px -12px rgba(0,0,0,0.25)',
          animation: 'academic-modal-in 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 1.75rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)' }}>
              {isEdit ? 'Edit Academic Book' : 'Add Academic Book'}
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
              {isEdit ? 'Update details for this curriculum textbook.' : 'Publish a new academic e-book for students.'}
            </p>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted-foreground)',
              padding: '0.25rem',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Success */}
        {successMsg ? (
          <div style={{ padding: '3.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircle size={32} color="#16a34a" />
            </div>
            <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--foreground)', fontSize: '1.15rem' }}>
              {isEdit ? 'Book Updated Successfully!' : 'Academic Book Created!'}
            </h3>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
              The book changes have been saved and applied.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              {/* Title */}
              <div>
                <label style={labelStyle}>Book Title <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Class 9 Higher Mathematics"
                  value={form.title}
                  onChange={e => handleChange('title', e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              {/* Author */}
              <div>
                <label style={labelStyle}>Author / Publisher</label>
                <input
                  type="text"
                  placeholder="e.g. National Curriculum and Textbook Board (NCTB)"
                  value={form.author}
                  onChange={e => handleChange('author', e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Class & Subject */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Class</label>
                  <select
                    value={form.classId}
                    onChange={e => handleChange('classId', e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">Select Class...</option>
                    {classes.map(c => {
                      const cId = c.id || c.uuid || '';
                      return (
                        <option key={cId} value={cId}>{c.name}</option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Subject</label>
                  <input
                    type="text"
                    list="subjects-datalist"
                    placeholder="e.g. Higher Mathematics"
                    value={form.subject}
                    onChange={e => handleChange('subject', e.target.value)}
                    style={inputStyle}
                  />
                  <datalist id="subjects-datalist">
                    {subjects.map((s, idx) => (
                      <option key={s.id || s.uuid || idx} value={s.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Edition & Published Year */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Edition</label>
                  <input
                    type="text"
                    placeholder="e.g. 2024 Edition"
                    value={form.edition}
                    onChange={e => handleChange('edition', e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Published Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 2024"
                    value={form.publishedYear}
                    onChange={e => handleChange('publishedYear', e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Total Pages & File Size */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Total Pages</label>
                  <input
                    type="number"
                    placeholder="e.g. 280"
                    value={form.totalPages}
                    onChange={e => handleChange('totalPages', e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>File Size (in bytes)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15485760 (15 MB)"
                    value={form.fileSize}
                    onChange={e => handleChange('fileSize', e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Cover Image URL */}
              <div>
                <label style={labelStyle}>Cover Image URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={form.coverImageUrl}
                  onChange={e => handleChange('coverImageUrl', e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* PDF URL */}
              <div>
                <label style={labelStyle}>PDF Document URL <span style={{ color: '#4f46e5', fontSize: '0.75rem' }}>(for Reading Feature)</span></label>
                <input
                  type="url"
                  placeholder="https://example.com/book.pdf"
                  value={form.pdfUrl}
                  onChange={e => handleChange('pdfUrl', e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  placeholder="Standard syllabus textbook for secondary education..."
                  value={form.description}
                  onChange={e => handleChange('description', e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {/* Active Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => handleChange('isActive', !form.isActive)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '99px',
                    border: 'none',
                    cursor: 'pointer',
                    background: form.isActive ? '#4f46e5' : '#d1d5db',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                  aria-label="Toggle Active Status"
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: form.isActive ? '22px' : '3px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'white',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                    }}
                  />
                </button>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  {form.isActive ? 'Active (Visible to Students)' : 'Inactive (Hidden)'}
                </span>
              </div>

              {/* Error */}
              {errorMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: '0.6rem', border: '1px solid #fecaca' }}>
                  <AlertCircle size={16} color="#ef4444" />
                  <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 500 }}>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => !submitting && onClose()}
                disabled={submitting}
                style={{
                  padding: '0.65rem 1.4rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.65rem 1.6rem',
                  borderRadius: '0.65rem',
                  background: isEdit ? '#0ea5e9' : '#4f46e5',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  opacity: submitting ? 0.75 : 1,
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'academic-spin 1s linear infinite' }} />
                    {isEdit ? 'Saving...' : 'Publishing...'}
                  </>
                ) : isEdit ? (
                  <>
                    <Pencil size={15} /> Save Changes
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Add Book
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Reading Feature Modal ───────────────────────────────────────────────────
function BookReaderModal({
  book,
  onClose,
  onEdit,
}: {
  book: AcademicBook;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        padding: isFullscreen ? '0' : '1.25rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: 'var(--background, #fff)',
          borderRadius: isFullscreen ? '0' : '1.25rem',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Reader Topbar */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--card, #fff)',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', overflow: 'hidden' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0,
              }}
            >
              <BookOpen size={20} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--foreground)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {book.title}
                </h2>
                {book.edition && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: '#e0e7ff',
                      color: '#4338ca',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {book.edition}
                  </span>
                )}
              </div>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {book.subject ? `${book.subject} • ` : ''}
                {book.author || 'Academic Textbook'}
                {book.totalPages ? ` • ${book.totalPages} pages` : ''}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {book.pdfUrl && (
              <>
                <a
                  href={book.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.55rem',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={14} /> Open in New Tab
                </a>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.55rem',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#f1f5f9',
                border: 'none',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Close Reader"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Reader Canvas / Body */}
        <div style={{ flex: 1, position: 'relative', background: '#334155', overflow: 'hidden' }}>
          {book.pdfUrl ? (
            <iframe
              src={book.pdfUrl}
              title={`Read ${book.title}`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#fff',
              }}
            />
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                textAlign: 'center',
                color: '#f8fafc',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <BookOpen size={42} color="#94a3b8" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>No PDF Attached</h3>
              <p style={{ maxWidth: '440px', marginTop: '0.5rem', color: '#94a3b8', fontSize: '0.95rem' }}>
                This book does not have a PDF document link attached yet. Edit the book to provide a valid PDF document URL for reading.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                style={{
                  marginTop: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1.4rem',
                  borderRadius: '0.75rem',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                <Pencil size={15} /> Edit Book to Add PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Academic Books Page Component ──────────────────────────────────────
export default function AcademicBooksPage() {
  const [books, setBooks] = useState<AcademicBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Dropdown options
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [subjects, setSubjects] = useState<SubjectEntity[]>([]);

  // Modals
  const [formModal, setFormModal] = useState<{ mode: 'create' | 'edit'; book?: AcademicBook } | null>(null);
  const [readingBook, setReadingBook] = useState<AcademicBook | null>(null);
  const [bookToDelete, setBookToDelete] = useState<AcademicBook | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Classes and Subjects for dropdowns
  useEffect(() => {
    const fetchOptions = async () => {
      const schoolId = getUserSchoolId();
      const headers = { accept: '*/*', Authorization: `Bearer ${getApiToken()}` };

      try {
        const [clsRes, subRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/classes${schoolId ? `?schoolId=${schoolId}&limit=1000` : '?limit=1000'}`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/admin/subjects${schoolId ? `?schoolId=${schoolId}&limit=1000` : '?limit=1000'}`, { headers }).catch(() => null),
        ]);

        if (clsRes && clsRes.ok) {
          const json = await clsRes.json();
          let list = json.data?.data || json.data || json || [];
          if (Array.isArray(list)) {
            if (schoolId) list = list.filter((c: any) => !c.schoolId || c.schoolId === schoolId);
            setClasses(list);
          }
        }

        if (subRes && subRes.ok) {
          const json = await subRes.json();
          const list = json.data?.data || json.data || json || [];
          if (Array.isArray(list)) setSubjects(list);
        }
      } catch (e) {
        console.error('Failed to load classes/subjects filter list:', e);
      }
    };

    fetchOptions();
  }, []);

  // Fetch Books
  const fetchBooks = useCallback(async (searchQuery: string, classFilter: string, subjectFilter: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (classFilter) params.set('classId', classFilter);
      if (subjectFilter) params.set('subject', subjectFilter);

      const url = `${API_BASE_URL}/academic-ebooks${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch academic books (${res.status})`);
      }

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong fetching academic books');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks(search, selectedClassId, selectedSubject);
  }, [search, selectedClassId, selectedSubject, fetchBooks]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
  };

  // Delete Book
  const handleDeleteBook = async () => {
    if (!bookToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/academic-ebooks/${bookToDelete.id}`, {
        method: 'DELETE',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to delete (${res.status})`);
      }

      setBookToDelete(null);
      fetchBooks(search, selectedClassId, selectedSubject);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete book');
    } finally {
      setDeleting(false);
    }
  };

  const getClassName = (book: AcademicBook) => {
    if (book.class?.name) return book.class.name;
    if (book.classId) {
      const found = classes.find(c => (c.id || c.uuid) === book.classId);
      if (found) return found.name;
    }
    return null;
  };

  const getInitialEditForm = (book: AcademicBook): AcademicBookForm => ({
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

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              margin: 0,
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.025em',
            }}
          >
            Academic Books
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.4rem', fontSize: '1rem' }}>
            Curriculum textbooks, digital syllabuses, and interactive e-books for all classes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchBooks(search, selectedClassId, selectedSubject)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1.2rem',
              borderRadius: '0.65rem',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--background)')}
          >
            <RefreshCw size={16} /> Refresh
          </button>

          <button
            onClick={() => setFormModal({ mode: 'create' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.35rem',
              borderRadius: '0.65rem',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px -4px rgba(79,70,229,0.4)',
            }}
          >
            <Plus size={18} /> Add Academic Book
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 260px', display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted-foreground)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search by title, author, or subject..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '2.5rem',
                paddingRight: searchInput ? '2.5rem' : '0.9rem',
                paddingTop: '0.65rem',
                paddingBottom: '0.65rem',
                border: '1px solid var(--border)',
                borderRadius: '0.65rem',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  right: '0.7rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted-foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button
            type="submit"
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '0.65rem',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>

        {/* Class Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <GraduationCap size={16} style={{ color: 'var(--muted-foreground)' }} />
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '0.65rem',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Classes</option>
            {classes.map(c => {
              const cId = c.id || c.uuid || '';
              return (
                <option key={cId} value={cId}>{c.name}</option>
              );
            })}
          </select>
        </div>

        {/* Subject Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Filter size={15} style={{ color: 'var(--muted-foreground)' }} />
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '0.65rem',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Subjects</option>
            {subjects.map((s, idx) => (
              <option key={s.id || s.uuid || idx} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Badges */}
      {(search || selectedClassId || selectedSubject) && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {search && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '99px',
                background: '#eef2ff',
                color: '#4f46e5',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <Search size={12} /> &ldquo;{search}&rdquo;
              <button onClick={clearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', padding: 0, display: 'flex' }}>
                <X size={12} />
              </button>
            </span>
          )}
          {selectedClassId && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '99px',
                background: '#f0fdf4',
                color: '#16a34a',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <GraduationCap size={12} />
              {classes.find(c => (c.id || c.uuid) === selectedClassId)?.name || 'Class'}
              <button onClick={() => setSelectedClassId('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: 0, display: 'flex' }}>
                <X size={12} />
              </button>
            </span>
          )}
          {selectedSubject && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '99px',
                background: '#fff7ed',
                color: '#ea580c',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <Tag size={12} />
              {selectedSubject}
              <button onClick={() => setSelectedSubject('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ea580c', padding: 0, display: 'flex' }}>
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
              <div style={{ height: '170px', background: 'var(--muted)', animation: 'academic-pulse 1.5s ease-in-out infinite' }} />
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ height: '18px', background: 'var(--muted)', borderRadius: '4px', width: '75%', animation: 'academic-pulse 1.5s ease-in-out infinite' }} />
                <div style={{ height: '13px', background: 'var(--muted)', borderRadius: '4px', width: '50%', animation: 'academic-pulse 1.5s ease-in-out infinite' }} />
                <div style={{ height: '13px', background: 'var(--muted)', borderRadius: '4px', width: '40%', animation: 'academic-pulse 1.5s ease-in-out infinite' }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6rem 2rem',
            background: 'var(--card)',
            borderRadius: '1.25rem',
            border: '1px dashed var(--border)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <AlertCircle size={36} color="#ef4444" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>Failed to Load Academic Books</h3>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', fontSize: '0.95rem' }}>{error}</p>
          <button
            onClick={() => fetchBooks(search, selectedClassId, selectedSubject)}
            style={{
              marginTop: '1.5rem',
              padding: '0.65rem 1.5rem',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      ) : books.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '7rem 2rem',
            background: 'var(--card)',
            borderRadius: '1.25rem',
            border: '1px dashed var(--border)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              opacity: 0.6,
            }}
          >
            <BookMarked size={42} />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>No Academic Books Found</h3>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', fontSize: '0.95rem', maxWidth: '420px' }}>
            {search || selectedClassId || selectedSubject
              ? 'Try modifying your filters to find curriculum books.'
              : 'Start by publishing academic textbooks and syllabus materials for your students.'}
          </p>
          <button
            onClick={() => setFormModal({ mode: 'create' })}
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.65rem 1.5rem',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Add First Academic Book
          </button>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Showing <strong>{books.length}</strong> academic book{books.length !== 1 ? 's' : ''}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.5rem' }}>
            {books.map(book => {
              const className = getClassName(book);

              return (
                <div
                  key={book.id}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '1.1rem',
                    overflow: 'hidden',
                    transition: 'transform 0.22s, box-shadow 0.22s',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 14px 30px -10px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Book Banner / Cover */}
                  <div
                    style={{
                      height: '165px',
                      position: 'relative',
                      overflow: 'hidden',
                      background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(6, 182, 212, 0.25))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {book.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={book.coverImageUrl}
                        alt={book.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
                        <BookMarked size={52} color="#4f46e5" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', letterSpacing: '0.05em' }}>
                          E-BOOK
                        </span>
                      </div>
                    )}

                    {/* Class badge */}
                    {className && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '0.65rem',
                          left: '0.65rem',
                          background: 'rgba(15, 23, 42, 0.75)',
                          backdropFilter: 'blur(4px)',
                          color: '#fff',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                        }}
                      >
                        {className}
                      </span>
                    )}

                    {/* Subject badge */}
                    {book.subject && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '0.65rem',
                          right: '0.65rem',
                          background: '#4f46e5',
                          color: 'white',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '99px',
                        }}
                      >
                        {book.subject}
                      </span>
                    )}

                    {/* Inactive tag */}
                    {book.isActive === false && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '0.65rem',
                          left: '0.65rem',
                          background: '#ef4444',
                          color: 'white',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        Draft / Inactive
                      </span>
                    )}
                  </div>

                  {/* Book Info */}
                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div>
                      <h3
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          margin: 0,
                          color: 'var(--foreground)',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {book.title}
                      </h3>
                      {book.edition && (
                        <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 600, marginTop: '0.2rem', display: 'inline-block' }}>
                          {book.edition}
                        </span>
                      )}
                    </div>

                    {book.author && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--muted-foreground)', fontSize: '0.84rem' }}>
                        <User size={13} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</span>
                      </div>
                    )}

                    {/* Metadata tags: Pages & File size */}
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                      {book.totalPages && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--muted-foreground)', background: 'rgba(0,0,0,0.03)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          <FileText size={12} /> {book.totalPages} Pages
                        </span>
                      )}
                      {book.fileSize && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--muted-foreground)', background: 'rgba(0,0,0,0.03)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          <Layers size={12} /> {formatFileSize(book.fileSize)}
                        </span>
                      )}
                      {book.publishedYear && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--muted-foreground)', background: 'rgba(0,0,0,0.03)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          <Calendar size={12} /> {book.publishedYear}
                        </span>
                      )}
                    </div>

                    {book.description && (
                      <p
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--muted-foreground)',
                          margin: '0.2rem 0 0',
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {book.description}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div style={{ marginTop: 'auto', paddingTop: '0.85rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {/* Reading Feature Button */}
                      <button
                        onClick={() => setReadingBook(book)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          padding: '0.65rem 0',
                          borderRadius: '0.65rem',
                          background: '#4f46e5',
                          color: 'white',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                          transition: 'background 0.18s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#4338ca')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#4f46e5')}
                      >
                        <Eye size={16} /> Read Book
                      </button>

                      {/* Edit and Delete Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setFormModal({ mode: 'edit', book })}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            padding: '0.48rem 0',
                            borderRadius: '0.6rem',
                            border: '1px solid #bfdbfe',
                            background: '#eff6ff',
                            color: '#2563eb',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            transition: 'background 0.18s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#dbeafe')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#eff6ff')}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => setBookToDelete(book)}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            padding: '0.48rem 0',
                            borderRadius: '0.6rem',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            transition: 'background 0.18s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Reader Modal */}
      {readingBook && (
        <BookReaderModal
          book={readingBook}
          onClose={() => setReadingBook(null)}
          onEdit={() => {
            const b = readingBook;
            setReadingBook(null);
            setFormModal({ mode: 'edit', book: b });
          }}
        />
      )}

      {/* Form Modal (Create / Edit) */}
      {formModal && (
        <BookFormModal
          mode={formModal.mode}
          initialForm={formModal.mode === 'edit' && formModal.book ? getInitialEditForm(formModal.book) : EMPTY_FORM}
          bookId={formModal.book?.id}
          classes={classes}
          subjects={subjects}
          onClose={() => setFormModal(null)}
          onSuccess={() => fetchBooks(search, selectedClassId, selectedSubject)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {bookToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 260,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={e => {
            if (e.target === e.currentTarget && !deleting) setBookToDelete(null);
          }}
        >
          <div
            style={{
              background: 'var(--background, #fff)',
              borderRadius: '1.25rem',
              width: '100%',
              maxWidth: '440px',
              padding: '1.75rem',
              boxShadow: '0 24px 60px -12px rgba(0,0,0,0.25)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Trash2 size={28} color="#dc2626" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--foreground)' }}>
              Delete Academic Book?
            </h3>
            <p style={{ margin: '0.5rem 0 1.5rem', fontSize: '0.88rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>&ldquo;{bookToDelete.title}&rdquo;</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                disabled={deleting}
                style={{
                  padding: '0.65rem 1.4rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBook}
                disabled={deleting}
                style={{
                  padding: '0.65rem 1.6rem',
                  borderRadius: '0.65rem',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  opacity: deleting ? 0.75 : 1,
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'academic-spin 1s linear infinite' }} /> Deleting...
                  </>
                ) : (
                  'Delete Book'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes academic-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes academic-modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes academic-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
