"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Shield,
  GraduationCap,
  Briefcase,
  X,
  Loader2,
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

interface UserEntity {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  schoolId?: string;
  school?: {
    id: string;
    name: string;
    schoolId?: string;
  } | null;
  designation?: string;
  rollNumber?: string;
  isActive?: boolean;
  avatar?: string | null;
  createdAt?: string;
}

export default function SuperadminUsersPage() {
  const [users, setUsers] = useState<UserEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Preview modal
  const [previewUser, setPreviewUser] = useState<UserEntity | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(`${API_BASE_URL}/superadmin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });

      if (!res.ok) {
        throw new Error(`Failed to load users: ${res.statusText}`);
      }

      const json = await res.json();
      const data = json.data || json;

      if (Array.isArray(data)) {
        setUsers(data);
        setTotal(json.total || json.meta?.total || data.length);
      } else if (data && Array.isArray(data.users)) {
        setUsers(data.users);
        setTotal(data.total || data.meta?.total || data.users.length);
      } else if (data && Array.isArray(data.items)) {
        setUsers(data.items);
        setTotal(data.total || data.items.length);
      } else {
        setUsers([]);
        setTotal(0);
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, limit]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.school?.name || '').toLowerCase().includes(q) ||
        (u.schoolId || '').toLowerCase().includes(q);

      const r = (u.role || '').toLowerCase();
      const matchRole =
        roleFilter === 'ALL' ? true : r === roleFilter.toLowerCase();

      const isActive = u.isActive !== false;
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? isActive
          : !isActive;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const getRoleBadge = (role: string) => {
    const r = (role || '').toLowerCase();
    if (r === 'superadmin') {
      return (
        <span
          style={{
            background: 'rgba(124, 58, 237, 0.15)',
            color: '#7c3aed',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '0.725rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Shield size={10} /> Superadmin
        </span>
      );
    }
    if (r === 'admin') {
      return (
        <span
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '0.725rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Briefcase size={10} /> Admin
        </span>
      );
    }
    if (r === 'teacher') {
      return (
        <span
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '0.725rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <GraduationCap size={10} /> Teacher
        </span>
      );
    }
    if (r === 'student') {
      return (
        <span
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '0.725rem',
            fontWeight: 600,
          }}
        >
          Student
        </span>
      );
    }
    return (
      <span
        style={{
          background: 'var(--muted)',
          color: 'var(--muted-foreground)',
          padding: '3px 8px',
          borderRadius: '9999px',
          fontSize: '0.725rem',
          fontWeight: 500,
          textTransform: 'capitalize',
        }}
      >
        {role || 'User'}
      </span>
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>
            Global Users Directory
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            Superadmin directory of administrators, teachers, students, and staff across all institutions
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            color: 'var(--foreground)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '12px',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            flex: '1 1 280px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '6px 12px',
          }}
        >
          <Search size={16} color="var(--muted-foreground)" />
          <input
            type="text"
            placeholder="Search users by name, email, phone, school..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.85rem',
              color: 'var(--foreground)',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: '0.825rem',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Roles</option>
            <option value="superadmin">Superadmin</option>
            <option value="admin">School Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: '0.825rem',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
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

      {/* Users Table */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Loading user records...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Users size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>No users found</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Try adjusting your search criteria or pagination.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>User</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Role</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>School / Tenant</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Contact</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Registered</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isActive = u.isActive !== false;
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--foreground)', display: 'block' }}>
                              {u.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {getRoleBadge(u.role)}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={14} color="var(--muted-foreground)" />
                          <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
                            {u.school?.name || (u.role === 'superadmin' ? 'Platform Operations' : 'Institutional Staff')}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ color: u.phone ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                          {u.phone || '—'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isActive ? '#10b981' : '#ef4444',
                          }}
                        >
                          {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--muted-foreground)', fontSize: '0.775rem' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => setPreviewUser(u)}
                          title="View Details"
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            background: 'var(--muted)',
                            border: 'none',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--muted)',
            borderTop: '1px solid var(--border)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total users)
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* USER PREVIEW MODAL */}
      {previewUser && (
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
              maxWidth: '480px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)' }}>
                User Profile Preview
              </h3>
              <button
                onClick={() => setPreviewUser(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.2rem',
                  }}
                >
                  {previewUser.name ? previewUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {previewUser.name}
                  </h4>
                  <div style={{ marginTop: '4px' }}>{getRoleBadge(previewUser.role)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block' }}>Email:</span>
                  <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{previewUser.email}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block' }}>Phone:</span>
                  <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{previewUser.phone || '—'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block' }}>Assigned School:</span>
                  <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
                    {previewUser.school?.name || (previewUser.role === 'superadmin' ? 'Global Platform Access' : 'Registered Institution')}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block' }}>Designation:</span>
                  <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{previewUser.designation || 'Staff'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block' }}>Account Status:</span>
                  <span style={{ color: previewUser.isActive !== false ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {previewUser.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block' }}>Account Registered:</span>
                  <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
                    {previewUser.createdAt ? new Date(previewUser.createdAt).toLocaleDateString() : 'Verified Account'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setPreviewUser(null)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--muted)',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
