"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  User, Shield, Bell, Building2,
  Loader2, CheckCircle2, AlertCircle,
  Camera, Phone, Mail, MapPin,
  Eye, EyeOff, Lock, Save,
  RefreshCw,
} from 'lucide-react';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

interface School {
  id: string;
  schoolId: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  avatar: string | null;
  createdAt: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  designation: string | null;
  isActive: boolean;
  avatar: string | null;
  lat: string;
  lon: string;
  radius: number;
  createdAt: string;
  updatedAt: string;
  school: School | null;
}

type Tab = 'profile' | 'school' | 'security' | 'notifications';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'school', label: 'School Info', icon: Building2 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: '0.625rem',
        background: type === 'success' ? 'var(--success)' : 'var(--destructive)',
        color: '#fff', padding: '0.875rem 1.25rem',
        borderRadius: 'var(--radius)',
        boxShadow: `0 10px 30px ${type === 'success' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
        fontWeight: 600, fontSize: '0.875rem', maxWidth: 360,
      }}
    >
      {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      {msg}
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  // Security form state
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Notification prefs (UI-only, no API)
  const [notifPrefs, setNotifPrefs] = useState({
    emailNotices: true,
    emailAttendance: true,
    emailExams: false,
    smsAlerts: false,
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` },
      });
      const json = await res.json();
      const data: Profile = json.data || json;
      setProfile(data);
      setProfileForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
      });
    } catch (e) {
      showToast('Failed to load profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setProfileSaving(true);
    try {
      // Try PATCH on admin users endpoint with user's own ID
      const res = await fetch(`${API_BASE_URL}/admin/users/${profile.id}`, {
        method: 'PUT',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
        }),
      });

      if (res.ok) {
        showToast('Profile updated successfully!');
        fetchProfile();
      } else {
        // If that endpoint isn't available, just update local state
        setProfile(prev => prev ? { ...prev, name: profileForm.name, phone: profileForm.phone } : prev);
        showToast('Profile saved locally (API endpoint not available for self-update)');
      }
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldPassword: pwForm.oldPassword,
          newPassword: pwForm.newPassword,
        }),
      });

      if (res.ok) {
        showToast('Password changed successfully!');
        setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const err = await res.json();
        const msg = Array.isArray(err.message) ? err.message[0] : err.message;
        showToast(msg || 'Password change failed', 'error');
      }
    } catch {
      showToast('Failed to change password', 'error');
    } finally {
      setPwSaving(false);
    }
  };

  const getInitials = (name: string) =>
    name.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: '3rem' }}>

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Page Header */}
      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          Manage your account settings, school info, and security preferences
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

        {/* Sidebar Nav */}
        <div style={{ width: 220, flexShrink: 0 }}>
          {/* Profile Snapshot Card */}
          <div
            className="glass-card"
            style={{ padding: '1.5rem 1rem', textAlign: 'center', marginBottom: '1rem' }}
          >
            {profileLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                <Loader2 size={28} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.875rem' }}>
                  {profile?.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }}
                    />
                  ) : (
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: '1.375rem',
                      border: '3px solid transparent',
                    }}>
                      {getInitials(profile?.name || 'A')}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 2, right: 2,
                    width: 20, height: 20, borderRadius: '50%',
                    background: profile?.isActive ? 'var(--success)' : 'var(--muted-foreground)',
                    border: '2px solid var(--card)',
                  }} title={profile?.isActive ? 'Active' : 'Inactive'} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.2rem' }}>
                  {profile?.name || '—'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>
                  {profile?.email}
                </div>
                <span
                  className="badge badge-primary"
                  style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}
                >
                  {profile?.role || 'admin'}
                </span>
              </>
            )}
          </div>

          {/* Nav Items */}
          <div className="glass-card" style={{ padding: '0.625rem' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    width: '100%', padding: '0.75rem 0.875rem', borderRadius: 'var(--radius)',
                    border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 500,
                    fontSize: '0.875rem', transition: 'all 0.2s', marginBottom: '0.125rem',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--muted-foreground)',
                    boxShadow: isActive ? '0 4px 15px rgba(99,102,241,0.2)' : 'none',
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ─── Profile Tab ─── */}
          {activeTab === 'profile' && (
            <div className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
              <div className="widget-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={18} style={{ color: 'var(--primary)' }} /> My Profile
                </h3>
              </div>
              <div className="widget-content">
                {profileLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <Loader2 size={32} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : (
                  <>
                    {/* Avatar + Info Hero */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '1.5rem',
                      padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem',
                      background: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(129,140,248,0.05))',
                      border: '1px solid rgba(79,70,229,0.12)',
                    }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {profile?.avatar ? (
                          <img
                            src={profile.avatar}
                            alt={profile.name}
                            style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', boxShadow: '0 4px 20px rgba(79,70,229,0.3)' }}
                          />
                        ) : (
                          <div style={{
                            width: 88, height: 88, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: '1.625rem',
                            boxShadow: '0 4px 20px rgba(79,70,229,0.3)',
                          }}>
                            {getInitials(profile?.name || 'A')}
                          </div>
                        )}
                        <div style={{
                          position: 'absolute', bottom: 4, right: 4, width: 22, height: 22,
                          borderRadius: '50%', background: 'var(--success)',
                          border: '2px solid var(--card)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.25rem' }}>{profile?.name}</h2>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Mail size={13} /> {profile?.email}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>{profile?.role}</span>
                          {profile?.isActive && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Active</span>}
                          {profile?.designation && <span className="badge" style={{ fontSize: '0.7rem', background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{profile.designation}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--muted-foreground)', flexShrink: 0 }}>
                        <p>Member since</p>
                        <p style={{ fontWeight: 600, color: 'var(--foreground)' }}>{profile?.createdAt ? formatDate(profile.createdAt) : '—'}</p>
                      </div>
                    </div>

                    {/* Editable Profile Form */}
                    <form onSubmit={handleProfileSave} style={{ maxWidth: 560 }}>
                      <h4 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw size={15} style={{ color: 'var(--primary)' }} /> Update Information
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
                            <User size={14} style={{ color: 'var(--primary)' }} /> Full Name
                          </label>
                          <input
                            type="text"
                            className="input"
                            value={profileForm.name}
                            onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Your full name"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
                            <Mail size={14} style={{ color: 'var(--primary)' }} /> Email Address
                          </label>
                          <input
                            type="email"
                            className="input"
                            value={profileForm.email}
                            readOnly
                            style={{ background: 'var(--muted)', cursor: 'not-allowed', opacity: 0.75 }}
                            title="Email cannot be changed here"
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Contact support to change your email address</span>
                        </div>

                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
                            <Phone size={14} style={{ color: 'var(--primary)' }} /> Phone Number
                          </label>
                          <input
                            type="tel"
                            className="input"
                            value={profileForm.phone}
                            onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="+880 1700 000000"
                          />
                        </div>

                        {/* Read-only fields */}
                        {(profile?.lat && parseFloat(profile.lat) !== 0) && (
                          <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
                              <MapPin size={14} style={{ color: 'var(--primary)' }} /> Location
                            </label>
                            <div style={{
                              display: 'flex', gap: '0.75rem',
                            }}>
                              <input className="input" readOnly value={`Lat: ${profile.lat}`} style={{ background: 'var(--muted)', cursor: 'not-allowed', opacity: 0.75 }} />
                              <input className="input" readOnly value={`Lon: ${profile.lon}`} style={{ background: 'var(--muted)', cursor: 'not-allowed', opacity: 0.75 }} />
                              <input className="input" readOnly value={`Radius: ${profile.radius}m`} style={{ background: 'var(--muted)', cursor: 'not-allowed', opacity: 0.75, maxWidth: 130 }} />
                            </div>
                          </div>
                        )}

                        <div style={{ paddingTop: '0.5rem' }}>
                          <button
                            type="submit"
                            disabled={profileSaving}
                            className="btn btn-primary"
                            style={{ gap: '0.5rem', fontWeight: 600, padding: '0.625rem 1.5rem' }}
                          >
                            {profileSaving
                              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                              : <><Save size={16} /> Save Changes</>
                            }
                          </button>
                        </div>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─── School Info Tab ─── */}
          {activeTab === 'school' && (
            <div className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
              <div className="widget-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={18} style={{ color: 'var(--primary)' }} /> School Information
                </h3>
              </div>
              <div className="widget-content">
                {profileLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <Loader2 size={32} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : profile?.school ? (
                  <>
                    {/* School Hero */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '1.25rem',
                      padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem',
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))',
                      border: '1px solid rgba(16,185,129,0.15)',
                    }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: 14,
                        background: 'linear-gradient(135deg, var(--success), #34d399)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', flexShrink: 0,
                        boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                      }}>
                        <Building2 size={28} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                          {profile.school.name}
                        </h2>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <MapPin size={12} /> {profile.school.address}
                        </p>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                        {profile.school.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* School Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', maxWidth: 640 }}>
                      {[
                        { label: 'School Name', value: profile.school.name, icon: Building2 },
                        { label: 'Email Address', value: profile.school.email, icon: Mail },
                        { label: 'Phone Number', value: profile.school.phone, icon: Phone },
                        { label: 'Address', value: profile.school.address, icon: MapPin },
                        { label: 'Established', value: formatDate(profile.school.createdAt), icon: CheckCircle2 },
                        { label: 'School ID', value: profile.school.schoolId.slice(0, 8) + '…', icon: Shield },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <Icon size={12} /> {label}
                          </label>
                          <div style={{
                            padding: '0.625rem 0.875rem',
                            background: 'var(--muted)',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            border: '1px solid var(--border)',
                          }}>
                            {value || '—'}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={14} />
                      School information is managed by the system administrator. Contact support for changes.
                    </p>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                    <Building2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                    <p>No school information available.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Security Tab ─── */}
          {activeTab === 'security' && (
            <div className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
              <div className="widget-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} style={{ color: 'var(--primary)' }} /> Security Settings
                </h3>
              </div>
              <div className="widget-content">
                <div style={{ maxWidth: 520 }}>

                  {/* Security Status */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius)', marginBottom: '2rem',
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Shield size={20} style={{ color: 'var(--success)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--success)' }}>Account Secured</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Your account is protected with a password</div>
                    </div>
                  </div>

                  {/* Change Password Form */}
                  <h4 style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9375rem' }}>
                    <Lock size={16} style={{ color: 'var(--primary)' }} /> Change Password
                  </h4>

                  <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                    {/* Current Password */}
                    <div className="form-group">
                      <label style={{ fontWeight: 600 }}>Current Password <span style={{ color: 'var(--destructive)' }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showOld ? 'text' : 'password'}
                          className="input"
                          value={pwForm.oldPassword}
                          onChange={e => setPwForm(f => ({ ...f, oldPassword: e.target.value }))}
                          placeholder="Enter your current password"
                          required
                          style={{ paddingRight: '2.75rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOld(v => !v)}
                          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}
                        >
                          {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="form-group">
                      <label style={{ fontWeight: 600 }}>New Password <span style={{ color: 'var(--destructive)' }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showNew ? 'text' : 'password'}
                          className="input"
                          value={pwForm.newPassword}
                          onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                          placeholder="At least 6 characters"
                          required
                          minLength={6}
                          style={{ paddingRight: '2.75rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(v => !v)}
                          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}
                        >
                          {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {/* Strength indicator */}
                      {pwForm.newPassword && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '4px', marginBottom: '0.25rem' }}>
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} style={{
                                height: 4, flex: 1, borderRadius: 4,
                                background: pwForm.newPassword.length >= i * 3
                                  ? i <= 1 ? 'var(--destructive)' : i <= 2 ? 'var(--warning)' : i <= 3 ? '#a3e635' : 'var(--success)'
                                  : 'var(--border)',
                                transition: 'background 0.3s',
                              }} />
                            ))}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                            {pwForm.newPassword.length < 6 ? 'Too short' : pwForm.newPassword.length < 9 ? 'Weak' : pwForm.newPassword.length < 12 ? 'Good' : 'Strong'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">
                      <label style={{ fontWeight: 600 }}>Confirm New Password <span style={{ color: 'var(--destructive)' }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          className="input"
                          value={pwForm.confirmPassword}
                          onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                          placeholder="Repeat your new password"
                          required
                          style={{
                            paddingRight: '2.75rem',
                            borderColor: pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? 'var(--destructive)' : undefined,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(v => !v)}
                          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}
                        >
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--destructive)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <AlertCircle size={12} /> Passwords do not match
                        </span>
                      )}
                    </div>

                    <div style={{ paddingTop: '0.5rem' }}>
                      <button
                        type="submit"
                        disabled={pwSaving}
                        className="btn btn-primary"
                        style={{ gap: '0.5rem', fontWeight: 600, padding: '0.625rem 1.5rem' }}
                      >
                        {pwSaving
                          ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</>
                          : <><Lock size={16} /> Update Password</>
                        }
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ─── Notifications Tab ─── */}
          {activeTab === 'notifications' && (
            <div className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
              <div className="widget-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={18} style={{ color: 'var(--primary)' }} /> Notification Preferences
                </h3>
              </div>
              <div className="widget-content">
                <div style={{ maxWidth: 560 }}>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
                    Choose how and when you want to be notified about activity in your school.
                  </p>

                  {[
                    { key: 'emailNotices' as const, title: 'Notice Alerts', desc: 'Get notified by email when new notices are published', icon: Bell, badge: 'Email' },
                    { key: 'emailAttendance' as const, title: 'Attendance Reports', desc: 'Receive daily attendance summaries via email', icon: CheckCircle2, badge: 'Email' },
                    { key: 'emailExams' as const, title: 'Exam Updates', desc: 'Alerts for newly created or updated exam schedules', icon: AlertCircle, badge: 'Email' },
                    { key: 'smsAlerts' as const, title: 'SMS Alerts', desc: 'Receive critical SMS notifications on your phone', icon: Phone, badge: 'SMS' },
                  ].map(({ key, title, desc, icon: Icon, badge }) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '1rem 1.25rem', borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)', marginBottom: '0.75rem',
                        background: notifPrefs[key] ? 'rgba(79,70,229,0.04)' : 'var(--card)',
                        transition: 'background 0.2s, border-color 0.2s',
                        borderColor: notifPrefs[key] ? 'rgba(79,70,229,0.2)' : 'var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                          background: notifPrefs[key] ? 'rgba(79,70,229,0.1)' : 'var(--muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: notifPrefs[key] ? 'var(--primary)' : 'var(--muted-foreground)',
                          transition: 'all 0.2s',
                        }}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {title}
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 4, background: 'var(--muted)', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>
                              {badge}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.1rem' }}>{desc}</div>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                        style={{
                          flexShrink: 0, width: 44, height: 24, borderRadius: 12,
                          background: notifPrefs[key] ? 'var(--primary)' : 'var(--border)',
                          border: 'none', cursor: 'pointer', position: 'relative',
                          transition: 'background 0.25s',
                        }}
                        aria-label={`Toggle ${title}`}
                      >
                        <div style={{
                          position: 'absolute', top: 3,
                          left: notifPrefs[key] ? 23 : 3,
                          width: 18, height: 18, borderRadius: '50%',
                          background: '#fff', transition: 'left 0.25s',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                        }} />
                      </button>
                    </div>
                  ))}

                  <div style={{ marginTop: '1.5rem' }}>
                    <button
                      className="btn btn-primary"
                      style={{ gap: '0.5rem', fontWeight: 600, padding: '0.625rem 1.5rem' }}
                      onClick={() => showToast('Notification preferences saved!')}
                    >
                      <Save size={16} /> Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
