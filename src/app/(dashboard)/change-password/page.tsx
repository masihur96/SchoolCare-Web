"use client";

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, Loader2, Key, CheckCircle2 } from 'lucide-react';
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

export default function ChangePasswordPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      if (res.ok) {
        showToast('Password changed successfully!', 'success');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        setTimeout(() => {
           router.push('/dashboard');
        }, 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = Array.isArray(err.message) ? err.message[0] : err.message;
        showToast(msg || 'Password change failed. Please check your current password.', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 600, margin: '0 auto', paddingBottom: '3rem' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold">Change Password</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          Update your account password to maintain security.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Key size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>Secure your account</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Choose a strong password with at least 6 characters.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Current Password <span style={{ color: 'var(--destructive)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showOld ? 'text' : 'password'}
                className="input"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="Enter your current password"
                required
                style={{ paddingRight: '2.75rem', width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowOld(v => !v)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}
              >
                {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              New Password <span style={{ color: 'var(--destructive)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                className="input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                style={{ paddingRight: '2.75rem', width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {newPassword && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '0.25rem' }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      height: 4, flex: 1, borderRadius: 4,
                      background: newPassword.length >= i * 3
                        ? i <= 1 ? 'var(--destructive)' : i <= 2 ? 'var(--warning)' : i <= 3 ? '#a3e635' : 'var(--success)'
                        : 'var(--border)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                  {newPassword.length < 6 ? 'Too short' : newPassword.length < 9 ? 'Weak' : newPassword.length < 12 ? 'Good' : 'Strong'}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Confirm New Password <span style={{ color: 'var(--destructive)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                className="input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                required
                style={{
                  paddingRight: '2.75rem',
                  width: '100%',
                  borderColor: confirmPassword && confirmPassword !== newPassword ? 'var(--destructive)' : undefined,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <span style={{ fontSize: '0.75rem', color: 'var(--destructive)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                <AlertCircle size={14} /> Passwords do not match
              </span>
            )}
          </div>

          <div style={{ paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ gap: '0.5rem', fontWeight: 600, padding: '0.75rem 2rem', fontSize: '1rem' }}
            >
              {saving
                ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</>
                : <><Lock size={18} /> Update Password</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
