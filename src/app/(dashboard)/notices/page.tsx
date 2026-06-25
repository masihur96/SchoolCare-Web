"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, AlertCircle, Calendar, Trash2, Edit, Loader2,
  Bell, Users, User, GraduationCap, X, CheckCircle2,
  Megaphone, Clock
} from 'lucide-react';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

const getUserSchoolId = () => {
  try {
    const payload = JSON.parse(atob(getApiToken().split('.')[1]));
    return payload.schoolId;
  } catch {
    return null;
  }
};

interface Notice {
  _id: string;
  title: string;
  content: string;
  targetAudience: string;
  isImportent: boolean;
  postedBy: string;
  schoolId: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

const AUDIENCE_OPTIONS = [
  { value: 'All', label: 'Everyone', icon: Users, color: 'var(--primary)', bg: 'rgba(79, 70, 229, 0.1)' },
  { value: 'Students', label: 'Students', icon: GraduationCap, color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.1)' },
  { value: 'Teachers', label: 'Teachers', icon: User, color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.1)' },
  { value: 'Parents', label: 'Parents', icon: Users, color: 'var(--accent)', bg: 'rgba(129, 140, 248, 0.1)' },
];

const getAudienceStyle = (audience: string) => {
  return AUDIENCE_OPTIONS.find(a => a.value === audience) || AUDIENCE_OPTIONS[0];
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
  if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getInitials = (name: string) => name.trim().charAt(0).toUpperCase();

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Ref so handleSubmit always reads the latest editingId without stale closure
  const editingIdRef = useRef<string | null>(null);
  const [filterAudience, setFilterAudience] = useState('All');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetAudience: 'All',
    isImportent: false,
    postedBy: '',
  });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const fetchNotices = async () => {
    const schoolId = getUserSchoolId();
    if (!schoolId) { setLoading(false); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/general/notices?schoolId=${schoolId}`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` }
      });
      const data = await res.json();
      let list: Notice[] = Array.isArray(data) ? data : (data?.data || []);
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setNotices(list);
    } catch (e) {
      console.error('Failed to fetch notices', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotices(); }, []);

  const resetForm = () => {
    setFormData({ title: '', content: '', targetAudience: 'All', isImportent: false, postedBy: '' });
    editingIdRef.current = null;
    setEditingId(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    if (showForm && !editingIdRef.current) { resetForm(); return; }
    editingIdRef.current = null;
    setEditingId(null);
    setFormData({ title: '', content: '', targetAudience: 'All', isImportent: false, postedBy: '' });
    setShowForm(true);
  };

  const handleEditClick = (notice: Notice) => {
    // Set both state (for UI reactivity) and ref (for reliable reads in async handlers)
    editingIdRef.current = notice._id;
    setEditingId(notice._id);
    setFormData({
      title: notice.title,
      content: notice.content,
      targetAudience: notice.targetAudience || 'All',
      isImportent: !!notice.isImportent,
      postedBy: notice.postedBy || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'isImportent') {
      setFormData(f => ({ ...f, isImportent: value === 'true' }));
    } else {
      setFormData(f => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = getUserSchoolId();
    if (!schoolId) return;

    // Read from ref — always up-to-date regardless of React render cycle
    const currentEditingId = editingIdRef.current;

    setActionLoading(true);
    try {
      const url = currentEditingId
        ? `${API_BASE_URL}/general/notices/${currentEditingId}`
        : `${API_BASE_URL}/general/notices`;

      const method = currentEditingId ? 'PUT' : 'POST';

      console.log(`[Notice] ${method} → ${url}`);

      const res = await fetch(url, {
        method,
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, schoolId, avatar: 'https://example.com/avatar.jpg' }),
      });

      if (res.ok) {
        showSuccess(currentEditingId ? 'Notice updated successfully!' : 'Notice published successfully!');
        resetForm();
        fetchNotices();
      } else {
        const errText = await res.text();
        console.error(`[Notice] Save failed (${res.status}):`, errText);
      }
    } catch (e) {
      console.error('Failed to save notice', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    setDeleteLoadingId(id);
    try {
      const token = getApiToken();
      console.log(`[Notice] DELETE → ${API_BASE_URL}/general/notices/${id}`);
      const res = await fetch(`${API_BASE_URL}/general/notices/${id}`, {
        method: 'DELETE',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      // Accept 200, 201, 204 as success
      if (res.ok || res.status === 204) {
        showSuccess('Notice deleted.');
        // Optimistically remove from local list immediately
        setNotices(prev => prev.filter(n => n._id !== id));
        fetchNotices();
      } else {
        const errText = await res.text();
        console.error(`[Notice] Delete failed (${res.status}):`, errText);
        alert(`Delete failed: ${res.status} — ${errText}`);
      }
    } catch (e) {
      console.error('Failed to delete notice', e);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const filteredNotices = filterAudience === 'All'
    ? notices
    : notices.filter(n => n.targetAudience === filterAudience);

  const importantCount = notices.filter(n => n.isImportent).length;

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: '3rem' }}>

      {/* ── Success Toast ── */}
      {successMsg && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--success)', color: '#fff',
            padding: '0.875rem 1.25rem', borderRadius: 'var(--radius)',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.35)',
            fontWeight: 600, fontSize: '0.875rem',
          }}
        >
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 className="text-2xl font-bold" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0,
              }}>
                <Megaphone size={18} />
              </div>
              School Notices
            </h1>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
              Broadcast announcements to students, teachers, and parents
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={openCreateForm}
            style={{ gap: '0.5rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 600 }}
          >
            {showForm && !editingId ? <><X size={16} /> Close</> : <><Plus size={16} /> New Notice</>}
          </button>
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Notices', value: notices.length, color: 'var(--primary)', icon: Bell },
            { label: 'Important', value: importantCount, color: 'var(--destructive)', icon: AlertCircle },
            { label: 'For Students', value: notices.filter(n => n.targetAudience === 'Students').length, color: 'var(--success)', icon: GraduationCap },
            { label: 'For Teachers', value: notices.filter(n => n.targetAudience === 'Teachers').length, color: 'var(--warning)', icon: User },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="glass-card stat-card"
                style={{ flex: '1 1 140px', minWidth: 130, padding: '1rem 1.25rem', gap: '0.875rem' }}
              >
                <div className="stat-icon" style={{ background: `${stat.color}18`, color: stat.color, width: 40, height: 40, borderRadius: 10 }}>
                  <Icon size={18} />
                </div>
                <div className="stat-info">
                  <h3 style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{stat.label}</h3>
                  <span className="stat-value" style={{ fontSize: '1.375rem' }}>{loading ? '—' : stat.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

        {/* ── Notices List Panel ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="glass-card" style={{ overflow: 'hidden' }}>

            {/* Panel Header with Filters */}
            <div className="widget-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={18} style={{ color: 'var(--primary)' }} />
                Announcements
                <span style={{
                  marginLeft: '0.5rem', background: 'var(--primary)', color: '#fff',
                  fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.5rem',
                  borderRadius: 9999, lineHeight: 1.8,
                }}>
                  {loading ? '…' : filteredNotices.length}
                </span>
              </h3>

              {/* Audience Filter Pills */}
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {['All', 'Students', 'Teachers', 'Parents'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilterAudience(tab)}
                    style={{
                      padding: '0.3rem 0.85rem', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600,
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      background: filterAudience === tab ? 'var(--primary)' : 'var(--muted)',
                      color: filterAudience === tab ? '#fff' : 'var(--muted-foreground)',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Notices Content */}
            <div className="widget-content" style={{ padding: '1.25rem' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: 'var(--muted-foreground)' }}>
                  <Loader2 size={36} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Loading announcements…</span>
                </div>
              ) : filteredNotices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'var(--muted)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', margin: '0 auto 1.25rem',
                    color: 'var(--muted-foreground)',
                  }}>
                    <Bell size={28} />
                  </div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No notices found</h4>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', maxWidth: 320, margin: '0 auto 1.5rem' }}>
                    {filterAudience !== 'All'
                      ? `No notices for "${filterAudience}" yet.`
                      : 'No notices published yet. Create your first announcement.'}
                  </p>
                  {filterAudience === 'All' && (
                    <button className="btn btn-primary" style={{ gap: '0.5rem', fontSize: '0.875rem' }} onClick={openCreateForm}>
                      <Plus size={16} /> Create First Notice
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filteredNotices.map((notice, idx) => {
                    const audienceStyle = getAudienceStyle(notice.targetAudience);
                    const AudienceIcon = audienceStyle.icon;
                    return (
                      <div
                        key={notice._id}
                        className="animate-fade-in"
                        style={{
                          animationDelay: `${idx * 40}ms`,
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          overflow: 'hidden',
                          transition: 'box-shadow 0.2s, transform 0.2s',
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)';
                          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Important indicator stripe */}
                        {notice.isImportent && (
                          <div style={{ height: 3, background: 'linear-gradient(90deg, var(--destructive), #f87171)', width: '100%' }} />
                        )}

                        <div style={{ padding: '1rem 1.25rem' }}>
                          {/* Top row */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.625rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 0 }}>
                              {/* Avatar */}
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                              }}>
                                {getInitials(notice.postedBy || 'A')}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{
                                  fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.35,
                                  color: 'var(--foreground)', display: '-webkit-box',
                                  WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                }}>
                                  {notice.title}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <User size={11} /> {notice.postedBy}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Clock size={11} /> {formatDate(notice.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Badges + Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                              {notice.isImportent && (
                                <span className="badge badge-destructive" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <AlertCircle size={11} /> Important
                                </span>
                              )}
                              <span
                                className="badge"
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem', background: audienceStyle.bg, color: audienceStyle.color }}
                              >
                                <AudienceIcon size={11} /> {notice.targetAudience}
                              </span>

                              {/* Edit */}
                              <button
                                className="action-btn"
                                onClick={() => handleEditClick(notice)}
                                title="Edit"
                                style={{ width: 30, height: 30 }}
                              >
                                <Edit size={14} />
                              </button>

                              {/* Delete */}
                              <button
                                className="action-btn"
                                onClick={() => handleDelete(notice._id)}
                                disabled={deleteLoadingId === notice._id}
                                title="Delete"
                                style={{ width: 30, height: 30, color: 'var(--destructive)', borderColor: 'transparent' }}
                              >
                                {deleteLoadingId === notice._id
                                  ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                  : <Trash2 size={14} />
                                }
                              </button>
                            </div>
                          </div>

                          {/* Content */}
                          <p style={{
                            fontSize: '0.8125rem', color: 'var(--muted-foreground)', lineHeight: 1.65,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            paddingLeft: '2.75rem',
                          }}>
                            {notice.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Create / Edit Form Panel ── */}
        {showForm && (
          <div
            className="glass-card animate-fade-in"
            style={{ width: 380, flexShrink: 0, position: 'sticky', top: '1.5rem', overflow: 'hidden' }}
          >
            {/* Form Header */}
            <div className="widget-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                {editingId
                  ? <><Edit size={16} style={{ color: 'var(--primary)' }} /> Edit Notice</>
                  : <><Megaphone size={16} style={{ color: 'var(--primary)' }} /> New Notice</>
                }
              </h3>
              <button
                className="icon-btn"
                onClick={resetForm}
                style={{ width: 32, height: 32 }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <div className="widget-content">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

                {/* Title */}
                <div className="form-group">
                  <label>Notice Title <span style={{ color: 'var(--destructive)' }}>*</span></label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="input"
                    placeholder="E.g., Holiday Announcement"
                    required
                  />
                </div>

                {/* Audience + Priority row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  <div className="form-group">
                    <label>Audience <span style={{ color: 'var(--destructive)' }}>*</span></label>
                    <select
                      name="targetAudience"
                      value={formData.targetAudience}
                      onChange={handleChange}
                      className="input"
                      style={{ background: 'transparent', cursor: 'pointer' }}
                    >
                      <option value="All">Everyone</option>
                      <option value="Students">Students</option>
                      <option value="Teachers">Teachers</option>
                      <option value="Parents">Parents</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      name="isImportent"
                      value={formData.isImportent ? 'true' : 'false'}
                      onChange={handleChange}
                      className="input"
                      style={{
                        background: 'transparent', cursor: 'pointer',
                        color: formData.isImportent ? 'var(--destructive)' : undefined,
                        borderColor: formData.isImportent ? 'var(--destructive)' : undefined,
                      }}
                    >
                      <option value="false">Standard</option>
                      <option value="true">⚠ Important</option>
                    </select>
                  </div>
                </div>

                {/* Posted By */}
                <div className="form-group">
                  <label>Posted By <span style={{ color: 'var(--destructive)' }}>*</span></label>
                  <input
                    type="text"
                    name="postedBy"
                    value={formData.postedBy}
                    onChange={handleChange}
                    className="input"
                    placeholder="E.g., Principal"
                    required
                  />
                </div>

                {/* Content */}
                <div className="form-group">
                  <label>Message <span style={{ color: 'var(--destructive)' }}>*</span></label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    className="input"
                    style={{ height: 130, resize: 'vertical', paddingTop: '0.625rem', lineHeight: 1.6 }}
                    placeholder="Write your full announcement here…"
                    required
                  />
                </div>

                {/* Important notice preview indicator */}
                {formData.isImportent && (
                  <div style={{
                    padding: '0.625rem 0.875rem', borderRadius: 'var(--radius)',
                    background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontSize: '0.8rem', color: 'var(--destructive)', fontWeight: 500,
                  }}>
                    <AlertCircle size={14} />
                    This notice will be marked as important
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn"
                    style={{ flex: 1, background: 'var(--muted)', color: 'var(--muted-foreground)', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ flex: 2, gap: '0.5rem', fontWeight: 600, position: 'relative' }}
                  >
                    {actionLoading
                      ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                      : editingId
                        ? <><CheckCircle2 size={16} /> Save Changes</>
                        : <><Megaphone size={16} /> Publish</>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
