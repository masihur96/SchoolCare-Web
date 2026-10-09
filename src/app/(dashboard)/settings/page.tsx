"use client";

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Trash2, CheckCircle2, AlertCircle, Loader2, Shield
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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

interface Profile {
  id: string;
  name: string;
  email: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` },
        });
        const json = await res.json();
        setProfile(json.data || json);
      } catch (e) {
        console.error('Failed to load profile', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleDeleteAccount = async () => {
    if (!profile) return;
    if (deleteConfirmEmail.trim().toLowerCase() !== profile.email.toLowerCase()) {
      showToast('Email does not match. Please try again.', 'error');
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${profile.id}`, {
        method: 'DELETE',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
        },
      });
      if (res.ok) {
        showToast('Account deleted successfully. Redirecting…');
        setTimeout(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 1500);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Failed to delete account. Please try again.', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader2 size={40} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 600, margin: '0 auto', paddingBottom: '3rem' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          Manage your account settings
        </p>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>Danger Zone</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Permanently delete your account</p>
          </div>
        </div>

        <div style={{
          padding: '1.5rem',
          borderRadius: 'var(--radius)',
          border: '1.5px solid rgba(239,68,68,0.35)',
          background: 'rgba(239,68,68,0.04)',
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
            Permanently delete your account and all associated data. This action is <strong>irreversible</strong> and required by Google Play Console policies.
          </p>
          
          <button
            type="button"
            onClick={() => { setDeleteConfirmEmail(''); setDeleteAccountModal(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', borderRadius: 'var(--radius)',
              background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.4)',
              color: '#ef4444', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
          >
            <Trash2 size={16} />
            Delete My Account
          </button>
        </div>
      </div>

      {/* ── Delete Account Modal ── */}
      {deleteAccountModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem'
        }}>
          <div className="animate-fade-in" style={{
            background: 'var(--card)', width: '100%', maxWidth: 440,
            borderRadius: '1rem', padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={24} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>Delete Account</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', margin: 0 }}>This action cannot be undone</p>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--foreground)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              You are about to permanently delete your account. All your personal data and school associations will be erased.
            </p>

            <div className="form-group">
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.5rem', display: 'block' }}>
                Type <strong style={{ color: '#ef4444' }}>{profile?.email}</strong> to confirm:
              </label>
              <input
                type="email"
                className="input"
                value={deleteConfirmEmail}
                onChange={e => setDeleteConfirmEmail(e.target.value)}
                placeholder={profile?.email}
                style={{ width: '100%', borderColor: deleteConfirmEmail && deleteConfirmEmail !== profile?.email ? 'var(--destructive)' : undefined }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
              <button
                type="button"
                onClick={() => setDeleteAccountModal(false)}
                className="btn"
                style={{ flex: 1, background: 'var(--muted)', color: 'var(--foreground)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmEmail.trim().toLowerCase() !== profile?.email.toLowerCase()}
                className="btn"
                style={{
                  flex: 1, background: '#ef4444', color: '#fff',
                  opacity: deleteConfirmEmail.trim().toLowerCase() !== profile?.email.toLowerCase() ? 0.5 : 1,
                }}
              >
                {deleteLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
