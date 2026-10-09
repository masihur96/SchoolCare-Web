"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  User, Building2, Loader2, CheckCircle2, AlertCircle,
  Phone, Mail, MapPin, Shield, Calendar, Camera, Save, X
} from 'lucide-react';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    role: '',
    avatar: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` },
      });
      const json = await res.json();
      const p = json.data || json;
      setProfile(p);
      setEditForm({
        name: p.name || '',
        email: p.email || '',
        phone: p.phone || '',
        designation: p.designation || '',
        role: p.role || '',
        avatar: p.avatar || '',
      });
    } catch (e) {
      console.error('Failed to load profile', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/general/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getApiToken()}` },
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        const url = json.data?.url || json.url || json;
        if (typeof url === 'string') {
          setEditForm(f => ({ ...f, avatar: url }));
          showToast('Photo uploaded successfully');
        } else {
          showToast('Failed to parse uploaded photo URL', 'error');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Failed to upload photo', 'error');
      }
    } catch {
      showToast('Network error during upload', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      // The API might expect fields like lat, lon, radius, role, classIds, etc.
      // We pass the existing fields + the modified editForm fields.
      const payload = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        role: editForm.role || profile.role,
        designation: editForm.designation,
        avatar: editForm.avatar,
        lat: Number(profile.lat) || 23.8103,
        lon: Number(profile.lon) || 90.4125,
        radius: profile.radius || 100,
        // Optional fields if the API absolutely requires them to not be null:
        classIds: [],
        sectionIds: [],
      };

      const res = await fetch(`${API_BASE_URL}/admin/users/${profile.id}`, {
        method: 'PUT',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Profile updated successfully');
        setIsEditing(false);
        fetchProfile();
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = Array.isArray(err.message) ? err.message[0] : err.message;
        showToast(msg || 'Failed to update profile', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) =>
    name.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader2 size={40} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted-foreground)' }}>
        <User size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
        <h2>Profile Not Found</h2>
        <p>Could not load your profile data.</p>
      </div>
    );
  }

  const currentAvatar = isEditing ? editForm.avatar : profile.avatar;
  const currentName = isEditing ? editForm.name : profile.name;

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 900, margin: '0 auto', paddingBottom: '3rem' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      
      {/* Page Header */}
      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          View and edit your personal details
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Personal Info Section */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="widget-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--primary)' }} /> Personal Details
            </h3>
          </div>
          
          <div className="widget-content">
            <div style={{
              display: 'flex', alignItems: 'center', gap: '1.5rem',
              padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(129,140,248,0.05))',
              border: '1px solid rgba(79,70,229,0.12)',
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={currentName}
                    style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', boxShadow: '0 4px 20px rgba(79,70,229,0.3)', opacity: uploading ? 0.5 : 1 }}
                  />
                ) : (
                  <div style={{
                    width: 88, height: 88, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '1.625rem',
                    boxShadow: '0 4px 20px rgba(79,70,229,0.3)',
                    opacity: uploading ? 0.5 : 1
                  }}>
                    {getInitials(currentName || 'A')}
                  </div>
                )}
                
                {isEditing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      position: 'absolute', bottom: -5, right: -5, width: 32, height: 32,
                      borderRadius: '50%', background: 'var(--primary)', color: '#fff',
                      border: '2px solid var(--card)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    }}
                  >
                    {uploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={16} />}
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/jpg"
                  style={{ display: 'none' }}
                />

                {!isEditing && (
                  <div style={{
                    position: 'absolute', bottom: 4, right: 4, width: 22, height: 22,
                    borderRadius: '50%', background: profile.isActive ? 'var(--success)' : 'var(--muted-foreground)',
                    border: '2px solid var(--card)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.25rem' }}>{currentName}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>{profile.role}</span>
                  {profile.isActive && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Active</span>}
                  {(isEditing ? editForm.designation : profile.designation) && (
                    <span className="badge" style={{ fontSize: '0.7rem', background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                      {isEditing ? editForm.designation : profile.designation}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--muted-foreground)', flexShrink: 0 }}>
                <p>Member since</p>
                <p style={{ fontWeight: 600, color: 'var(--foreground)' }}>{profile.createdAt ? formatDate(profile.createdAt) : '—'}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {[
                { key: 'name', label: 'Full Name', value: profile.name, icon: User },
                { key: 'email', label: 'Email Address', value: profile.email, icon: Mail },
                { key: 'phone', label: 'Phone Number', value: profile.phone || '', icon: Phone },
                { key: 'designation', label: 'Designation', value: profile.designation || '', icon: Shield },
              ].map(({ key, label, value, icon: Icon }) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Icon size={12} /> {label}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={editForm[key as keyof typeof editForm]}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                      placeholder={`Enter ${label.toLowerCase()}`}
                      style={{ width: '100%' }}
                    />
                  ) : (
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
                  )}
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        name: profile.name || '',
                        email: profile.email || '',
                        phone: profile.phone || '',
                        designation: profile.designation || '',
                        role: profile.role || '',
                        avatar: profile.avatar || '',
                      });
                    }}
                    className="btn"
                    disabled={saving}
                    style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                  >
                    <X size={16} style={{ marginRight: '4px' }} /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} style={{ marginRight: '4px' }} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* School Info Section */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="widget-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} style={{ color: 'var(--primary)' }} /> School Information
            </h3>
          </div>
          
          <div className="widget-content">
            {profile.school ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '1.25rem',
                  padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem',
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
                    {profile.school.avatar ? (
                      <img src={profile.school.avatar} alt={profile.school.name} style={{ width: '100%', height: '100%', borderRadius: 14, objectFit: 'cover' }} />
                    ) : (
                      <Building2 size={28} />
                    )}
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                  {[
                    { label: 'School Name', value: profile.school.name, icon: Building2 },
                    { label: 'Email Address', value: profile.school.email, icon: Mail },
                    { label: 'Phone Number', value: profile.school.phone, icon: Phone },
                    { label: 'Address', value: profile.school.address, icon: MapPin },
                    { label: 'Established', value: formatDate(profile.school.createdAt), icon: Calendar },
                    { label: 'School ID', value: profile.school.schoolId, icon: Shield },
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
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                <Building2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                <p>No school information is associated with your account.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
