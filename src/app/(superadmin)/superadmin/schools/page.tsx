"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  X,
  ExternalLink,
  Layers,
  AlertTriangle,
  Loader2,
  Upload,
  ImageIcon,
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';
import { sanitizeCode, sanitizeDisplayName, isTechnicalId, generateUUID } from '@/lib/formatters';
import SchoolAvatar from '@/components/superadmin/school-avatar';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

interface SchoolItem {
  id: string;
  schoolId?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  avatar?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function SuperadminSchoolsPage() {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolItem | null>(null);

  // Form states
  const [formState, setFormState] = useState({
    schoolId: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    avatar: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const token = getStoredToken();
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE_URL}/general/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
        body: fd,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      const json = await res.json();
      // Handle both { url } and { data: { url } } response shapes
      const url: string = json?.url || json?.data?.url || json?.fileUrl || json?.data?.fileUrl || '';
      if (!url) throw new Error('No URL returned from upload');
      setFormState((prev) => ({ ...prev, avatar: url }));
    } catch (err: any) {
      setFormError(err?.message || 'Logo upload failed. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };



  const fetchSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/schools`, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });
      if (!res.ok) {
        throw new Error(`Failed to load schools: ${res.statusText}`);
      }
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      setSchools(list);
    } catch (err: any) {
      setError(err?.message || 'Error fetching schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleOpenCreate = () => {
    setFormState({
      schoolId: generateUUID(),
      name: '',
      address: '',
      phone: '',
      email: '',
      avatar: '',
      isActive: true,
    });
    setFormError(null);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (school: SchoolItem) => {
    setSelectedSchool(school);
    setFormState({
      schoolId: sanitizeCode(school.schoolId) || '',
      name: school.name || '',
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
      avatar: school.avatar || '',
      isActive: school.isActive !== false,
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleOpenDelete = (school: SchoolItem) => {
    setSelectedSchool(school);
    setDeleteModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      setFormError('School Name is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const token = getStoredToken();
      const payloadSchoolId = formState.schoolId && isTechnicalId(formState.schoolId)
        ? formState.schoolId
        : generateUUID();

      const res = await fetch(`${API_BASE_URL}/superadmin/schools`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
        body: JSON.stringify({
          schoolId: payloadSchoolId,
          name: formState.name.trim(),
          address: formState.address.trim() || undefined,
          phone: formState.phone.trim() || undefined,
          email: formState.email.trim() || undefined,
          avatar: formState.avatar.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to create school');
      }

      setCreateModalOpen(false);
      fetchSchools();
    } catch (err: any) {
      setFormError(err.message || 'Error creating school');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const token = getStoredToken();
      const schoolTargetId = selectedSchool.id || selectedSchool.schoolId;
      const res = await fetch(`${API_BASE_URL}/superadmin/schools/${schoolTargetId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
        body: JSON.stringify({
          name: formState.name.trim(),
          address: formState.address.trim() || undefined,
          phone: formState.phone.trim() || undefined,
          email: formState.email.trim() || undefined,
          isActive: formState.isActive,
          avatar: formState.avatar.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to update school');
      }

      setEditModalOpen(false);
      fetchSchools();
    } catch (err: any) {
      setFormError(err.message || 'Error updating school');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSchool) return;
    setSubmitting(true);
    try {
      const token = getStoredToken();
      const schoolTargetId = selectedSchool.id || selectedSchool.schoolId;
      const res = await fetch(`${API_BASE_URL}/superadmin/schools/${schoolTargetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: '*/*',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to delete school');
      }

      setDeleteModalOpen(false);
      fetchSchools();
    } catch (err: any) {
      alert(err.message || 'Failed to soft delete school');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const matchSearch =
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.schoolId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

      const isActive = s.isActive !== false;
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? isActive
          : !isActive;

      return matchSearch && matchStatus;
    });
  }, [schools, searchTerm, statusFilter]);

  const activeCount = schools.filter((s) => s.isActive !== false).length;
  const inactiveCount = schools.length - activeCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>
            Schools Directory
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            Manage registered tenant institutions, contact details, and platform access
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={fetchSchools}
            disabled={loading}
            className="icon-btn"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--foreground)',
              fontSize: '0.85rem',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleOpenCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              color: '#ffffff',
              padding: '9px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
            }}
          >
            <Plus size={16} /> Register School
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setStatusFilter('ALL')}
          style={{
            background: statusFilter === 'ALL' ? 'rgba(124, 58, 237, 0.12)' : 'var(--card)',
            border: statusFilter === 'ALL' ? '2px solid #7c3aed' : '1px solid var(--border)',
            borderRadius: '10px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--foreground)',
          }}
        >
          <Building2 size={16} color="#7c3aed" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>All Schools:</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{schools.length}</span>
        </button>

        <button
          onClick={() => setStatusFilter('ACTIVE')}
          style={{
            background: statusFilter === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'var(--card)',
            border: statusFilter === 'ACTIVE' ? '2px solid #10b981' : '1px solid var(--border)',
            borderRadius: '10px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--foreground)',
          }}
        >
          <CheckCircle2 size={16} color="#10b981" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active:</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{activeCount}</span>
        </button>

        <button
          onClick={() => setStatusFilter('INACTIVE')}
          style={{
            background: statusFilter === 'INACTIVE' ? 'rgba(239, 68, 68, 0.12)' : 'var(--card)',
            border: statusFilter === 'INACTIVE' ? '2px solid #ef4444' : '1px solid var(--border)',
            borderRadius: '10px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--foreground)',
          }}
        >
          <XCircle size={16} color="#ef4444" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Inactive:</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{inactiveCount}</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '8px 14px',
        }}
      >
        <Search size={18} color="var(--muted-foreground)" />
        <input
          type="text"
          placeholder="Search by school name, ID, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '0.875rem',
            color: 'var(--foreground)',
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted-foreground)',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#ef4444',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Schools Table / Grid */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Loading registered schools...</p>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Building2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>No schools found</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              {searchTerm ? 'Try adjusting your search criteria.' : 'Click "Register School" to add your first institution.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Institution</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>School Code</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Contact Info</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Address</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school) => {
                  const isActive = school.isActive !== false;
                  return (
                    <tr
                      key={school.id || school.schoolId}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Name & Avatar */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <SchoolAvatar
                            avatar={school.avatar}
                            name={school.name}
                            size={38}
                            radius={8}
                          />
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--foreground)', display: 'block' }}>
                              {school.name}
                            </span>
                            {school.createdAt && (
                              <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                                Registered: {new Date(school.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td style={{ padding: '14px 16px' }}>
                        {sanitizeCode(school.schoolId) ? (
                          <span
                            style={{
                              background: 'rgba(124, 58, 237, 0.08)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#7c3aed',
                              border: '1px solid rgba(124, 58, 237, 0.2)',
                            }}
                          >
                            {sanitizeCode(school.schoolId)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                            Standard
                          </span>
                        )}
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {school.email && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--foreground)' }}>
                              <Mail size={12} color="var(--muted-foreground)" /> {school.email}
                            </span>
                          )}
                          {school.phone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted-foreground)' }}>
                              <Phone size={12} /> {school.phone}
                            </span>
                          )}
                          {!school.email && !school.phone && (
                            <span style={{ color: 'var(--muted-foreground)' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td style={{ padding: '14px 16px', maxWidth: '200px' }}>
                        <span
                          style={{
                            color: 'var(--foreground)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {school.address || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isActive ? '#10b981' : '#ef4444',
                          }}
                        >
                          {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Link
                            href={`/superadmin/sms/schools/${school.id || school.schoolId}`}
                            title="Manage School SMS Quota"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              background: 'var(--muted)',
                              color: '#7c3aed',
                              display: 'flex',
                              alignItems: 'center',
                              textDecoration: 'none',
                            }}
                          >
                            <Layers size={14} />
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(school)}
                            title="Edit School"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              background: 'var(--muted)',
                              border: 'none',
                              color: 'var(--foreground)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(school)}
                            title="Soft-Delete (Move to Trash)"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={14} />
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
      </div>

      {/* CREATE SCHOOL MODAL */}
      {createModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  Register New School
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  Creates tenant entity for a new institutional campus
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                  School Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Greenfield International Academy"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +8801700000000"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="admin@school.com"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                  Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12 Lake View Road, Dhaka"
                  value={formState.address}
                  onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              {/* School Logo Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--foreground)' }}>
                  School Logo
                </label>
                <div
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    background: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  {/* Preview */}
                  {formState.avatar ? (
                    <img
                      src={formState.avatar}
                      alt="School logo"
                      style={{ width: 48, height: 48, borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '8px', background: 'var(--background)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ImageIcon size={20} style={{ color: 'var(--muted-foreground)' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {formState.avatar ? (
                      <p style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 600, marginBottom: 2 }}>✓ Logo uploaded</p>
                    ) : (
                      <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', marginBottom: 2 }}>PNG, JPG or SVG · Max 5 MB</p>
                    )}
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: avatarUploading ? 'var(--muted-foreground)' : '#7c3aed',
                        cursor: avatarUploading ? 'not-allowed' : 'pointer',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: avatarUploading ? 'var(--border)' : '#7c3aed',
                        background: 'transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      {avatarUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      {avatarUploading ? 'Uploading…' : formState.avatar ? 'Replace Logo' : 'Upload Logo'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={avatarUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAvatarUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>

                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--muted)',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Register School
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SCHOOL MODAL */}
      {editModalOpen && selectedSchool && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  Edit School Details
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  Updating {selectedSchool.name}
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                  School Name *
                </label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                  Address
                </label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              {/* Active Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--muted)',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', display: 'block' }}>
                    Active Status
                  </span>
                  <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                    Enable or disable administrative login for this campus
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#7c3aed' }}
                />
              </div>

              {/* School Logo Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--foreground)' }}>
                  School Logo
                </label>
                <div
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    background: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  {formState.avatar ? (
                    <img
                      src={formState.avatar}
                      alt="School logo"
                      style={{ width: 48, height: 48, borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '8px', background: 'var(--background)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ImageIcon size={20} style={{ color: 'var(--muted-foreground)' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {formState.avatar ? (
                      <p style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 600, marginBottom: 2 }}>✓ Logo uploaded</p>
                    ) : (
                      <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', marginBottom: 2 }}>PNG, JPG or SVG · Max 5 MB</p>
                    )}
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: avatarUploading ? 'var(--muted-foreground)' : '#7c3aed',
                        cursor: avatarUploading ? 'not-allowed' : 'pointer',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: avatarUploading ? 'var(--border)' : '#7c3aed',
                        background: 'transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      {avatarUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      {avatarUploading ? 'Uploading…' : formState.avatar ? 'Replace Logo' : 'Upload Logo'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={avatarUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAvatarUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>

                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--muted)',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && selectedSchool && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  Soft-Delete School?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  This will move the school to the system Trash.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: 'var(--muted)',
                borderRadius: '8px',
                marginBottom: '1rem',
              }}
            >
              <SchoolAvatar avatar={selectedSchool.avatar} name={selectedSchool.name} size={36} radius={6} />
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: '0.875rem', color: 'var(--foreground)', display: 'block' }}>
                  {selectedSchool.name}
                </strong>
                {selectedSchool.email && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    {selectedSchool.email}
                  </span>
                )}
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--foreground)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to soft-delete this institution? You can restore it anytime from the <strong>Trash & Restore</strong> module.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--muted)',
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
