"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  Calendar,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  BookOpen,
  User,
  Bell,
  MessageSquare,
  Send,
  Smartphone,
  Link2,
  AlertCircle,
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';
import { sanitizeCode, sanitizeDisplayName, formatFriendlyDate, formatFriendlyDateTime } from '@/lib/formatters';
import SchoolAvatar from '@/components/superadmin/school-avatar';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

interface UserEntity {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  guardianPhone?: string | null;
  classIds?: string[] | null;
  sectionIds?: string[] | null;
  rollNumber?: string | null;
  designation?: string | null;
  schoolId?: string | null;
  school?: {
    id?: string;
    schoolId?: string;
    name?: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    avatar?: string | null;
    isActive?: boolean;
    createdAt?: string;
  } | null;
  isActive?: boolean;
  avatar?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface SchoolItem {
  id: string;
  schoolId?: string;
  name: string;
  avatar?: string | null;
  address?: string | null;
}

export default function SuperadminUsersPage() {
  const [users, setUsers] = useState<UserEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // Server-side filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [schoolIdFilter, setSchoolIdFilter] = useState('ALL');
  const [schoolNameFilter, setSchoolNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // School dropdown list
  const [schoolsList, setSchoolsList] = useState<SchoolItem[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  // Preview modal state & communication tabs ('overview' | 'notification' | 'sms')
  const [previewUser, setPreviewUser] = useState<UserEntity | null>(null);
  const [modalTab, setModalTab] = useState<'overview' | 'notification' | 'sms'>('overview');

  // Notification form states
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifPath, setNotifPath] = useState('/home');
  const [notifImage, setNotifImage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState<string | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);

  // SMS form states
  const [smsNumbers, setSmsNumbers] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSenderId, setSmsSenderId] = useState('8809639228875');
  const [smsCampaignName, setSmsCampaignName] = useState('Admin Direct Notice');
  const [smsIsMasked, setSmsIsMasked] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState<string | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [smsWarning, setSmsWarning] = useState<string | null>(null);

  const handleOpenPreview = (u: UserEntity) => {
    setPreviewUser(u);
    setModalTab('overview');
    setNotifTitle('');
    setNotifMessage('');
    setNotifPath('/home');
    setNotifImage('');
    setNotifSuccess(null);
    setNotifError(null);
    setSmsNumbers(u.phone || u.guardianPhone || '');
    setSmsMessage('');
    setSmsSenderId('8809639228875');
    setSmsCampaignName('Admin Direct Notice');
    setSmsIsMasked(false);
    setSmsSuccess(null);
    setSmsError(null);
    setSmsWarning(null);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUser || !notifTitle.trim() || !notifMessage.trim()) return;
    setSendingNotif(true);
    setNotifSuccess(null);
    setNotifError(null);
    try {
      const token = getStoredToken();
      const payload: any = {
        receiver_uuid: previewUser.id,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        additional_data: {
          path: notifPath.trim() || '/home',
          uuid: previewUser.id,
        },
      };
      if (notifImage.trim()) {
        payload.image = notifImage.trim();
      }

      const res = await fetch(`${API_BASE_URL}/notifications/send`, {
        method: 'POST',
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || (json && json.statusCode && json.statusCode >= 400)) {
        throw new Error(json?.message || `Failed to send notification: ${res.statusText}`);
      }

      setNotifSuccess(`Notification dispatched successfully to ${previewUser.name}!`);
      setNotifTitle('');
      setNotifMessage('');
    } catch (err: any) {
      setNotifError(err?.message || 'Error sending notification');
    } finally {
      setSendingNotif(false);
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUser || !smsMessage.trim() || !smsNumbers.trim()) return;
    setSendingSms(true);
    setSmsSuccess(null);
    setSmsError(null);
    setSmsWarning(null);
    try {
      const token = getStoredToken();
      const numberList = smsNumbers
        .split(/[,\n]/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      if (numberList.length === 0) {
        throw new Error('Please enter at least one valid mobile number');
      }

      const payload = {
        mobNumbers: numberList,
        numbers: numberList,
        message: smsMessage.trim(),
        senderId: smsSenderId.trim() || '8809639228875',
        campaignName: smsCampaignName.trim() || 'Admin Notice',
        isMasked: smsIsMasked,
      };

      const res = await fetch(`${API_BASE_URL}/sms/send`, {
        method: 'POST',
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || (json && json.statusCode && json.statusCode >= 400)) {
        throw new Error(json?.message || `Failed to send SMS: ${res.statusText}`);
      }

      const resData = json?.data;
      if (resData?.gatewayResponse?.status === 'error') {
        const gwMsg = typeof resData.gatewayResponse.message === 'string'
          ? resData.gatewayResponse.message
          : 'SMS Gateway reported an issue (e.g. IP whitelist or credit balance)';
        const clientIp = resData.gatewayResponse.client_ip;
        if (clientIp) {
          setSmsWarning(`SMS recorded with system log ID, but Gateway reported: "${gwMsg}" (Active Outbound IP: ${clientIp}). Please add ${clientIp}/32 to your White Info BD IP Whitelist.`);
        } else {
          setSmsWarning(`SMS recorded with system log ID, but Gateway reported: "${gwMsg}"`);
        }
      } else {
        setSmsSuccess(`SMS queued successfully to ${numberList.length} recipient(s)!`);
        setSmsMessage('');
      }
    } catch (err: any) {
      setSmsError(err?.message || 'Error sending SMS');
    } finally {
      setSendingSms(false);
    }
  };

  // Advanced filter collapse
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Load available schools for filter dropdown
  const fetchSchools = async () => {
    setLoadingSchools(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/schools`, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setSchoolsList(list);
      }
    } catch {
      // silent fallback
    } finally {
      setLoadingSchools(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  // Fetch users with full server-side query parameter support
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      if (nameFilter.trim()) {
        params.set('name', nameFilter.trim());
      }
      if (roleFilter && roleFilter !== 'ALL') {
        params.set('role', roleFilter.toLowerCase());
      }
      if (schoolIdFilter && schoolIdFilter !== 'ALL') {
        params.set('schoolId', schoolIdFilter);
      }
      if (schoolNameFilter.trim()) {
        params.set('school', schoolNameFilter.trim());
      }
      if (statusFilter === 'ACTIVE') {
        params.set('status', 'active');
        params.set('isActive', 'true');
      } else if (statusFilter === 'INACTIVE') {
        params.set('status', 'inactive');
        params.set('isActive', 'false');
      }

      // Safeguard against TypeORM querybuilder missing FROM-clause for "fallbackschool"
      // If neither school, schoolId, search, nor name is provided, pass school=% so the join is made
      if (
        !params.has('school') &&
        !params.has('schoolId') &&
        !params.has('search') &&
        !params.has('name')
      ) {
        params.set('school', '%');
      }

      const res = await fetch(`${API_BASE_URL}/superadmin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || `Failed to load users: ${res.statusText}`);
      }

      const json = await res.json();
      const data = json.data || json;

      if (data && Array.isArray(data.users)) {
        setUsers(data.users);
        setTotal(typeof data.total === 'number' ? data.total : data.users.length);
        setLastPage(data.lastPage ?? Math.max(1, Math.ceil((data.total ?? data.users.length) / limit)));
      } else if (Array.isArray(data)) {
        setUsers(data);
        const t = json.total ?? data.length;
        setTotal(t);
        setLastPage(Math.max(1, Math.ceil(t / limit)));
      } else {
        setUsers([]);
        setTotal(0);
        setLastPage(1);
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching users from server');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, nameFilter, roleFilter, schoolIdFilter, schoolNameFilter, statusFilter]);

  // Fetch when page or limit changes
  useEffect(() => {
    fetchUsers();
  }, [page, limit]);

  // Manual trigger when user presses search or resets
  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setNameFilter('');
    setRoleFilter('ALL');
    setSchoolIdFilter('ALL');
    setSchoolNameFilter('');
    setStatusFilter('ALL');
    setPage(1);
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    nameFilter.trim() !== '' ||
    roleFilter !== 'ALL' ||
    schoolIdFilter !== 'ALL' ||
    schoolNameFilter.trim() !== '' ||
    statusFilter !== 'ALL';

  // Role Badge Styling
  const getRoleBadge = (role: string) => {
    const r = (role || '').toLowerCase();
    if (r === 'superadmin') {
      return (
        <span
          style={{
            background: 'rgba(124, 58, 237, 0.15)',
            color: '#7c3aed',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.725rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Shield size={11} /> Superadmin
        </span>
      );
    }
    if (r === 'admin') {
      return (
        <span
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.725rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Briefcase size={11} /> School Admin
        </span>
      );
    }
    if (r === 'teacher') {
      return (
        <span
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.725rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <GraduationCap size={11} /> Teacher
        </span>
      );
    }
    if (r === 'student') {
      return (
        <span
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '0.725rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <User size={11} /> Student
        </span>
      );
    }
    return (
      <span
        style={{
          background: 'var(--muted)',
          color: 'var(--muted-foreground)',
          padding: '3px 10px',
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

  const totalPages = Math.max(1, lastPage || Math.ceil(total / limit));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>
                  Global Users Directory
                </h2>
                <span
                  style={{
                    background: 'rgba(124, 58, 237, 0.1)',
                    color: '#7c3aed',
                    border: '1px solid rgba(124, 58, 237, 0.25)',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  {total.toLocaleString()} Users
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                Multi-tenant user records across all registered educational institutions
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Users size={16} color="#7c3aed" />
            <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
              Total Users:
            </span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--foreground)' }}>
              {total.toLocaleString()}
            </strong>
          </div>

          <button
            onClick={() => fetchUsers()}
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
              fontWeight: 600,
              transition: 'background 0.15s ease',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Filter Suite */}
      <form
        onSubmit={handleApplyFilters}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }}
      >
        {/* Row 1: Primary Search, Role, Status, and Controls */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* General Search */}
          <div
            style={{
              flex: '1 1 260px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
          >
            <Search size={16} color="var(--muted-foreground)" />
            <input
              type="text"
              placeholder="Search by keyword, email, phone..."
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
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* User Name Filter */}
          <div
            style={{
              flex: '1 1 180px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
          >
            <User size={16} color="var(--muted-foreground)" />
            <input
              type="text"
              placeholder="Filter by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.85rem',
                color: 'var(--foreground)',
              }}
            />
            {nameFilter && (
              <button
                type="button"
                onClick={() => setNameFilter('')}
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
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.825rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Roles</option>
              <option value="admin">School Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.825rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          {/* Toggle More Filters Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: showAdvancedFilters ? 'rgba(124, 58, 237, 0.1)' : 'var(--background)',
              color: showAdvancedFilters ? '#7c3aed' : 'var(--foreground)',
              cursor: 'pointer',
              fontSize: '0.825rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <SlidersHorizontal size={14} />
            Institutions
          </button>

          {/* Apply Filter Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '8px 16px',
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
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Filter
          </button>

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--muted)',
                color: 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '0.825rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          )}
        </div>

        {/* Row 2: Advanced Institution Filters (Dropdown + Free-text Search) */}
        {showAdvancedFilters && (
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--muted)',
              borderRadius: '10px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            {/* Institution Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 280px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--foreground)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Institution Select:
              </span>
              <select
                value={schoolIdFilter}
                onChange={(e) => setSchoolIdFilter(e.target.value)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Enrolled Institutions ({schoolsList.length})</option>
                {schoolsList.map((sch) => (
                  <option key={sch.id || sch.schoolId} value={sch.schoolId || sch.id}>
                    {sch.name} {sanitizeCode(sch.schoolId) ? `(${sanitizeCode(sch.schoolId)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* School Keyword Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--foreground)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                School Keyword:
              </span>
              <input
                type="text"
                placeholder="e.g. Cadet, High School, Academy"
                value={schoolNameFilter}
                onChange={(e) => setSchoolNameFilter(e.target.value)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  fontSize: '0.825rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* Active Filters Pill Row */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Active Filters:</span>
            {searchTerm && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 600 }}>
                Query: "{searchTerm}"
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
              </span>
            )}
            {nameFilter && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 600 }}>
                Name: "{nameFilter}"
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setNameFilter('')} />
              </span>
            )}
            {roleFilter !== 'ALL' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 600 }}>
                Role: {roleFilter}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setRoleFilter('ALL')} />
              </span>
            )}
            {schoolIdFilter !== 'ALL' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                Campus Selected
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSchoolIdFilter('ALL')} />
              </span>
            )}
            {schoolNameFilter && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                School: "{schoolNameFilter}"
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSchoolNameFilter('')} />
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>
                Status: {statusFilter}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')} />
              </span>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginLeft: 'auto' }}>
              Showing {users.length} of {total.toLocaleString()} matches
            </span>
          </div>
        )}
      </form>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '12px 16px',
            color: '#ef4444',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Users Data Table */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }}
      >
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#7c3aed' }} />
            <p style={{ fontWeight: 600, color: 'var(--foreground)' }}>Loading user records from server...</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Applying role, institution, and status filters</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Users size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--foreground)' }}>No users found</p>
            <p style={{ fontSize: '0.825rem', marginTop: '4px', maxWidth: '380px', margin: '4px auto 1rem' }}>
              No user records matched your current query criteria. Try clearing some filters or searching for another term.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--muted)',
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-foreground)' }}>User Details</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-foreground)' }}>Role</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-foreground)' }}>Assigned Institution</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-foreground)' }}>Contact & Academic</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-foreground)' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-foreground)' }}>Registered</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted-foreground)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isActive = u.isActive !== false;
                  const schoolName = sanitizeDisplayName(u.school?.name, u.role === 'superadmin' ? 'Platform Operations' : 'Institutional Staff');
                  const schoolCode = sanitizeCode(u.school?.schoolId);

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* User Cell */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1px solid var(--border)',
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
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
                          )}
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontWeight: 600, color: 'var(--foreground)', display: 'block' }}>
                              {u.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block' }}>
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Cell */}
                      <td style={{ padding: '14px 16px' }}>
                        {getRoleBadge(u.role)}
                      </td>

                      {/* School Cell with Avatar */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <SchoolAvatar
                            avatar={u.school?.avatar}
                            name={schoolName}
                            size={28}
                            radius={6}
                          />
                          <div>
                            <span style={{ color: 'var(--foreground)', fontWeight: 600, display: 'block' }}>
                              {schoolName}
                            </span>
                            {schoolCode ? (
                              <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                                Code: {schoolCode}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                                {u.role === 'superadmin' ? 'Global Scope' : 'Standard Campus'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact & Academic Details */}
                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          {u.phone ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--foreground)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} color="var(--muted-foreground)" />
                              {u.phone}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>No phone</span>
                          )}
                          {u.designation ? (
                            <span style={{ fontSize: '0.725rem', color: '#7c3aed', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                              {u.designation}
                            </span>
                          ) : u.rollNumber ? (
                            <span style={{ fontSize: '0.725rem', color: '#f59e0b', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                              Roll: #{u.rollNumber}
                            </span>
                          ) : null}
                        </div>
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

                      {/* Created Date */}
                      <td style={{ padding: '14px 16px', color: 'var(--muted-foreground)', fontSize: '0.78rem' }}>
                        {formatFriendlyDate(u.createdAt)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenPreview(u)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--muted)',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease',
                          }}
                          title="View user details"
                        >
                          <Eye size={13} />
                          Details
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
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            background: 'var(--muted)',
            borderTop: '1px solid var(--border)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
              Showing {total > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total.toLocaleString()} users
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Page Size:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: page <= 1 ? 'transparent' : 'var(--card)',
                color: page <= 1 ? 'var(--muted-foreground)' : 'var(--foreground)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <span style={{ padding: '0 8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)' }}>
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: page >= totalPages ? 'transparent' : 'var(--card)',
                color: page >= totalPages ? 'var(--muted-foreground)' : 'var(--foreground)',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE USER DETAILS & DIRECT COMMUNICATION MODAL */}
      {previewUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#7c3aed" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  User Profile Overview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewUser(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                padding: '4px',
                background: 'var(--muted)',
                borderRadius: '10px',
                marginBottom: '1.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => setModalTab('overview')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: modalTab === 'overview' ? 'var(--card)' : 'transparent',
                  color: modalTab === 'overview' ? 'var(--foreground)' : 'var(--muted-foreground)',
                  boxShadow: modalTab === 'overview' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                  fontWeight: modalTab === 'overview' ? 700 : 500,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <User size={14} />
                Profile
              </button>

              <button
                type="button"
                onClick={() => setModalTab('notification')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: modalTab === 'notification' ? 'var(--card)' : 'transparent',
                  color: modalTab === 'notification' ? '#7c3aed' : 'var(--muted-foreground)',
                  boxShadow: modalTab === 'notification' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                  fontWeight: modalTab === 'notification' ? 700 : 500,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Bell size={14} />
                Send Notification
              </button>

              <button
                type="button"
                onClick={() => setModalTab('sms')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: modalTab === 'sms' ? 'var(--card)' : 'transparent',
                  color: modalTab === 'sms' ? '#0ea5e9' : 'var(--muted-foreground)',
                  boxShadow: modalTab === 'sms' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                  fontWeight: modalTab === 'sms' ? 700 : 500,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <MessageSquare size={14} />
                Send SMS
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {modalTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Profile Card */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '1rem',
                    background: 'var(--muted)',
                    borderRadius: '12px',
                  }}
                >
                  {previewUser.avatar ? (
                    <img
                      src={previewUser.avatar}
                      alt={previewUser.name}
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #7c3aed',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.3rem',
                      }}
                    >
                      {previewUser.name ? previewUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {previewUser.name}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      {getRoleBadge(previewUser.role)}
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          background: previewUser.isActive !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: previewUser.isActive !== false ? '#10b981' : '#ef4444',
                        }}
                      >
                        {previewUser.isActive !== false ? 'Active Account' : 'Inactive Account'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Quick Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setModalTab('notification')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(124, 58, 237, 0.25)',
                      background: 'rgba(124, 58, 237, 0.08)',
                      color: '#7c3aed',
                      fontWeight: 600,
                      fontSize: '0.825rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Bell size={14} /> Send Notification
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('sms')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(14, 165, 233, 0.25)',
                      background: 'rgba(14, 165, 233, 0.08)',
                      color: '#0ea5e9',
                      fontWeight: 600,
                      fontSize: '0.825rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <MessageSquare size={14} /> Send SMS Message
                  </button>
                </div>

                {/* Personal & Contact Grid */}
                <div>
                  <h5 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '8px' }}>
                    Contact Information
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ background: 'var(--background)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', display: 'block' }}>Email Address:</span>
                      <strong style={{ color: 'var(--foreground)', wordBreak: 'break-all' }}>{previewUser.email}</strong>
                    </div>
                    <div style={{ background: 'var(--background)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', display: 'block' }}>Phone Number:</span>
                      <strong style={{ color: 'var(--foreground)' }}>{previewUser.phone || '—'}</strong>
                    </div>
                    {previewUser.address && (
                      <div style={{ gridColumn: 'span 2', background: 'var(--background)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', display: 'block' }}>Physical Address:</span>
                        <strong style={{ color: 'var(--foreground)' }}>{previewUser.address}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Family / Academic Details if student or teacher */}
                {(previewUser.fatherName || previewUser.motherName || previewUser.guardianPhone || previewUser.rollNumber || previewUser.designation) && (
                  <div>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '8px' }}>
                      Academic & Family Details
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                      {previewUser.rollNumber && (
                        <div style={{ background: 'var(--background)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', display: 'block' }}>Roll Number:</span>
                          <strong style={{ color: '#f59e0b' }}>#{previewUser.rollNumber}</strong>
                        </div>
                      )}
                      {previewUser.designation && (
                        <div style={{ background: 'var(--background)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', display: 'block' }}>Designation / Title:</span>
                          <strong style={{ color: '#7c3aed' }}>{previewUser.designation}</strong>
                        </div>
                      )}
                      {previewUser.fatherName && (
                        <div style={{ background: 'var(--background)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', display: 'block' }}>Father's Name:</span>
                          <strong style={{ color: 'var(--foreground)' }}>{previewUser.fatherName}</strong>
                        </div>
                      )}
                      {previewUser.motherName && (
                        <div style={{ background: 'var(--background)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', display: 'block' }}>Mother's Name:</span>
                          <strong style={{ color: 'var(--foreground)' }}>{previewUser.motherName}</strong>
                        </div>
                      )}
                      {previewUser.guardianPhone && (
                        <div style={{ background: 'var(--background)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)', display: 'block' }}>Guardian Phone:</span>
                          <strong style={{ color: 'var(--foreground)' }}>{previewUser.guardianPhone}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Enrolled School Card */}
                <div>
                  <h5 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '8px' }}>
                    Institutional Assignment
                  </h5>
                  <div
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <SchoolAvatar
                      avatar={previewUser.school?.avatar}
                      name={previewUser.school?.name}
                      size={42}
                      radius={8}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--foreground)', display: 'block' }}>
                        {sanitizeDisplayName(previewUser.school?.name, previewUser.role === 'superadmin' ? 'Global Platform Access' : 'Registered Institution')}
                      </strong>
                      {sanitizeCode(previewUser.school?.schoolId) && (
                        <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>
                          Code: {sanitizeCode(previewUser.school?.schoolId)}
                        </span>
                      )}
                      {previewUser.school?.email && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block', marginTop: '2px' }}>
                          {previewUser.school.email} {previewUser.school.phone ? `· ${previewUser.school.phone}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* System Audit Information */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted-foreground)', paddingTop: '6px' }}>
                  <span>Registered: {formatFriendlyDateTime(previewUser.createdAt)}</span>
                  {previewUser.updatedAt && (
                    <span>Updated: {formatFriendlyDateTime(previewUser.updatedAt)}</span>
                  )}
                </div>

                {/* Close Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setPreviewUser(null)}
                    style={{
                      padding: '8px 20px',
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
            )}

            {/* TAB 2: PUSH NOTIFICATION */}
            {modalTab === 'notification' && (
              <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Recipient Context */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    background: 'rgba(124, 58, 237, 0.08)',
                    borderRadius: '10px',
                    border: '1px solid rgba(124, 58, 237, 0.2)',
                  }}
                >
                  <Bell size={18} color="#7c3aed" />
                  <div style={{ fontSize: '0.825rem' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Recipient: </span>
                    <strong style={{ color: 'var(--foreground)' }}>{previewUser.name}</strong>
                    <span style={{ color: 'var(--muted-foreground)', marginLeft: '6px' }}>({previewUser.email})</span>
                  </div>
                </div>

                {/* Success Banner */}
                {notifSuccess && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      color: '#10b981',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{notifSuccess}</span>
                  </div>
                )}

                {/* Error Banner */}
                {notifError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: '#ef4444',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{notifError}</span>
                  </div>
                )}

                {/* Notification Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '6px' }}>
                    Notification Title <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="e.g. Schedule Update or Platform Announcement"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Notification Message */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '6px' }}>
                    Message Body <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Enter the notification message details..."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Target App Path & Image URL */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '6px' }}>
                      Target Route / Path
                    </label>
                    <input
                      type="text"
                      value={notifPath}
                      onChange={(e) => setNotifPath(e.target.value)}
                      placeholder="/home"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '6px' }}>
                      Image Attachment URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={notifImage}
                      onChange={(e) => setNotifImage(e.target.value)}
                      placeholder="https://example.com/banner.png"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setModalTab('overview')}
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
                    Back to Profile
                  </button>
                  <button
                    type="submit"
                    disabled={sendingNotif || !notifTitle.trim() || !notifMessage.trim()}
                    style={{
                      padding: '9px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: sendingNotif || !notifTitle.trim() || !notifMessage.trim() ? '#9ca3af' : '#7c3aed',
                      color: '#fff',
                      cursor: sendingNotif || !notifTitle.trim() || !notifMessage.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)',
                    }}
                  >
                    {sendingNotif ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        Dispatch Notification
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: DIRECT SMS */}
            {modalTab === 'sms' && (
              <form onSubmit={handleSendSms} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Recipient Context */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    background: 'rgba(14, 165, 233, 0.08)',
                    borderRadius: '10px',
                    border: '1px solid rgba(14, 165, 233, 0.2)',
                  }}
                >
                  <Smartphone size={18} color="#0ea5e9" />
                  <div style={{ fontSize: '0.825rem' }}>
                    <span style={{ color: 'var(--muted-foreground)' }}>Direct SMS Target: </span>
                    <strong style={{ color: 'var(--foreground)' }}>{previewUser.name}</strong>
                    {previewUser.phone && (
                      <span style={{ color: '#0ea5e9', marginLeft: '6px', fontWeight: 600 }}>({previewUser.phone})</span>
                    )}
                  </div>
                </div>

                {/* Success Banner */}
                {smsSuccess && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      color: '#10b981',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{smsSuccess}</span>
                  </div>
                )}

                {/* Gateway Warning Banner */}
                {smsWarning && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '10px 14px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      color: '#d97706',
                      fontSize: '0.825rem',
                      lineHeight: 1.4,
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{smsWarning}</span>
                  </div>
                )}

                {/* Error Banner */}
                {smsError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: '#ef4444',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{smsError}</span>
                  </div>
                )}

                {/* Mobile Numbers */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '6px' }}>
                    Recipient Mobile Number(s) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={smsNumbers}
                    onChange={(e) => setSmsNumbers(e.target.value)}
                    placeholder="e.g. 01713252758, 018XXXXXXXX"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: '4px', display: 'block' }}>
                    Separate multiple phone numbers with a comma.
                  </span>
                </div>

                {/* Sender ID & Campaign Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '6px' }}>
                      Sender ID
                    </label>
                    <input
                      type="text"
                      value={smsSenderId}
                      onChange={(e) => setSmsSenderId(e.target.value)}
                      placeholder="8809639228875"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '6px' }}>
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      value={smsCampaignName}
                      onChange={(e) => setSmsCampaignName(e.target.value)}
                      placeholder="Admin Direct Notice"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* SMS Message Text */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                      SMS Text Message <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.725rem', color: smsMessage.length > 160 ? '#f59e0b' : 'var(--muted-foreground)' }}>
                      {smsMessage.length} chars (approx. {Math.ceil(smsMessage.length / 160) || 1} SMS part{Math.ceil(smsMessage.length / 160) > 1 ? 's' : ''})
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Type the SMS content to be dispatched..."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Masked SMS Toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.825rem', color: 'var(--foreground)' }}>
                  <input
                    type="checkbox"
                    checked={smsIsMasked}
                    onChange={(e) => setSmsIsMasked(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Enable Masked Sender (Subject to gateway operator approval)</span>
                </label>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setModalTab('overview')}
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
                    Back to Profile
                  </button>
                  <button
                    type="submit"
                    disabled={sendingSms || !smsMessage.trim() || !smsNumbers.trim()}
                    style={{
                      padding: '9px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: sendingSms || !smsMessage.trim() || !smsNumbers.trim() ? '#9ca3af' : '#0ea5e9',
                      color: '#fff',
                      cursor: sendingSms || !smsMessage.trim() || !smsNumbers.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(14, 165, 233, 0.3)',
                    }}
                  >
                    {sendingSms ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Transmitting...
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        Transmit SMS
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
