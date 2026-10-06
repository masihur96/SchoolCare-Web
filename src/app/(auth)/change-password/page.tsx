"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap, Eye, EyeOff, Lock, ShieldCheck,
  CheckCircle2, ArrowLeft, KeyRound, Sparkles, ArrowRight,
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [show, setShow] = useState({
    current: false,
    newPw: false,
    confirm: false,
  });
  const [focused, setFocused] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const setFocusState = (field: string, val: boolean) =>
    setFocused(prev => ({ ...prev, [field]: val }));

  const isActive = (field: string) => focused[field] || !!form[field as keyof typeof form];

  const toggleShow = (field: keyof typeof show) =>
    setShow(prev => ({ ...prev, [field]: !prev[field] }));

  const pwStrength = (() => {
    const p = form.newPassword;
    let score = 0;
    if (p.length >= 8)          score++;
    if (/[A-Z]/.test(p))        score++;
    if (/[0-9]/.test(p))        score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength];
  const strengthColor = ['', '#ef4444', '#fbbf24', '#34d399', '#10b981'][pwStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError(t('auth.cp.noMatch'));
      return;
    }
    if (pwStrength < 2) {
      setError('Password is too weak. Please choose a stronger password.');
      return;
    }

    setLoading(true);
    try {
      const token =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('accessToken') || localStorage.getItem('token'))) || '';

      const response = await fetch(
        'https://smart-school-backend-production.up.railway.app/auth/change-password',
        {
          method: 'POST',
          headers: {
            accept: '*/*',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.message || 'Failed to update password. Please check your current password.'
        );
      }

      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hints = [
    { label: t('auth.cp.tip1'),        ok: form.newPassword.length >= 8 },
    { label: t('auth.cp.tip2'),          ok: /[A-Z]/.test(form.newPassword) },
    { label: t('auth.cp.tip3'),                    ok: /[0-9]/.test(form.newPassword) },
    { label: t('auth.cp.tip4'),         ok: /[^A-Za-z0-9]/.test(form.newPassword) },
  ];

  const fields = [
    { id: 'currentPassword', label: t('auth.cp.currentPw'), showKey: 'current' as const, icon: <KeyRound size={15} /> },
    { id: 'newPassword',     label: t('auth.cp.newPw'),     showKey: 'newPw'   as const, icon: <Lock size={15} /> },
    { id: 'confirmPassword', label: t('auth.cp.confirmPw'), showKey: 'confirm' as const, icon: <ShieldCheck size={15} /> },
  ];

  return (
    <div className="cp-root">

      {/* ── Background ── */}
      <div className="cp-bg-mesh" aria-hidden="true">
        <div className="cp-orb cp-orb-1" />
        <div className="cp-orb cp-orb-2" />
        <div className="cp-orb cp-orb-3" />
        <div className="cp-grid" />
      </div>

      {/* ── Navbar ── */}
      <nav className="cp-nav">
        <Link href="/dashboard" className="cp-brand">
          <div className="cp-brand-icon"><GraduationCap size={18} strokeWidth={2.2} /></div>
          <span>SchoolCare</span>
        </Link>
        <Link href="/dashboard" className="cp-back-link">
          <ArrowLeft size={14} />
          <span>{t('auth.cp.back')}</span>
        </Link>
      </nav>

      {/* ── Body ── */}
      <div className="cp-body">

        {/* ── LEFT panel ── */}
        <div className="cp-left">
          <div className="cp-left-inner">

            <div className="cp-trust-badge">
              <ShieldCheck size={13} />
              <span>{t('auth.cp.encrypted')}</span>
            </div>

            <h1 className="cp-headline">
              {t('auth.cp.title')}
            </h1>

            <p className="cp-sub">
              {t('auth.cp.sub')}
            </p>

            {/* Security tips */}
            <div className="cp-tips-section">
              <div className="cp-tips-title">{t('auth.cp.tipsTitle')}</div>
              <div className="cp-tips">
                {[
                  { icon: <CheckCircle2 size={14} />, text: t('auth.cp.tip1') },
                  { icon: <CheckCircle2 size={14} />, text: t('auth.cp.tip2') },
                  { icon: <CheckCircle2 size={14} />, text: t('auth.cp.tip3') },
                  { icon: <CheckCircle2 size={14} />, text: t('auth.cp.tip4') },
                  { icon: <CheckCircle2 size={14} />, text: t('auth.cp.tip5') },
                ].map((tip, i) => (
                  <div key={i} className="cp-tip">
                    <span className="cp-tip-icon">{tip.icon}</span>
                    <span>{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security badges */}
            <div className="cp-security-badges">
              {[
                { icon: <ShieldCheck size={14} />, label: t('auth.cp.badge1') },
                { icon: <Sparkles size={14} />,    label: t('auth.cp.badge2') },
                { icon: <KeyRound size={14} />,    label: t('auth.cp.badge3') },
              ].map((b, i) => (
                <div key={i} className="cp-badge">
                  <span className="cp-badge-icon">{b.icon}</span>
                  <span>{b.label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── RIGHT card ── */}
        <div className="cp-right">
          <div className={`cp-card ${mounted ? 'mounted' : ''}`}>

            {/* Card header */}
            <div className="cp-card-header">
              <div className="cp-card-brand">
                <div className="cp-card-brand-icon">
                  <GraduationCap size={16} strokeWidth={2.2} />
                </div>
                <span>SchoolCare</span>
              </div>
              <div className="cp-secure-pill">
                <ShieldCheck size={11} /> {t('auth.cp.secure')}
              </div>
            </div>

            {/* SUCCESS state */}
            {success ? (
              <div className="cp-success">
                <div className="cp-success-icon">
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="cp-success-title">{t('auth.cp.successTitle')}</h2>
                <p className="cp-success-sub">
                  {t('auth.cp.successSub')}
                </p>
                <div className="cp-redirect-bar">
                  <div className="cp-redirect-fill" />
                </div>
              </div>
            ) : (
              <>
                <h2 className="cp-card-title">{t('auth.cp.formTitle')}</h2>
                <p className="cp-card-subtitle">
                  {t('auth.cp.formSub')}
                </p>

                {error && (
                  <div className="cp-error" role="alert">
                    <span className="cp-error-dot" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="cp-form" noValidate>

                  {fields.map((f) => (
                    <div key={f.id} className={`cp-field ${isActive(f.id) ? 'active' : ''}`}>
                      <div className="cp-field-icon">{f.icon}</div>
                      <input
                        id={f.id}
                        type={show[f.showKey] ? 'text' : 'password'}
                        className="cp-input"
                        value={form[f.id as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [f.id]: e.target.value })}
                        onFocus={() => setFocusState(f.id, true)}
                        onBlur={() => setFocusState(f.id, false)}
                        required
                        autoComplete={f.id === 'currentPassword' ? 'current-password' : 'new-password'}
                        placeholder=" "
                        style={{ paddingRight: '44px' }}
                        disabled={loading}
                      />
                      <label htmlFor={f.id} className="cp-float-label">{f.label}</label>
                      <div className="cp-field-line" />
                      <button
                        type="button"
                        className="cp-pw-toggle"
                        onClick={() => toggleShow(f.showKey)}
                        aria-label={show[f.showKey] ? 'Hide' : 'Show'}
                        tabIndex={-1}
                      >
                        {show[f.showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  ))}

                  {/* Password strength meter */}
                  {form.newPassword.length > 0 && (
                    <div className="cp-strength">
                      <div className="cp-strength-bars">
                        {[1, 2, 3, 4].map((n) => (
                          <div
                            key={n}
                            className="cp-strength-bar"
                            style={{
                              background: n <= pwStrength ? strengthColor : 'rgba(255,255,255,0.08)',
                              transition: 'background 0.3s',
                            }}
                          />
                        ))}
                      </div>
                      <span className="cp-strength-label" style={{ color: strengthColor }}>
                        {strengthLabel}
                      </span>
                    </div>
                  )}

                  {/* Password hints */}
                  {form.newPassword.length > 0 && (
                    <div className="cp-hints">
                      {hints.map((h, i) => (
                        <div key={i} className={`cp-hint ${h.ok ? 'ok' : ''}`}>
                          <CheckCircle2 size={11} />
                          <span>{h.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Match indicator */}
                  {form.confirmPassword.length > 0 && (
                    <div className={`cp-match ${form.newPassword === form.confirmPassword ? 'ok' : 'fail'}`}>
                      {form.newPassword === form.confirmPassword
                        ? <><CheckCircle2 size={12} /> {t('auth.cp.match')}</>
                        : <><span className="cp-x">✕</span> {t('auth.cp.noMatch')}</>}
                    </div>
                  )}

                  <button
                    id="cp-submit-btn"
                    type="submit"
                    className={`cp-submit ${loading ? 'loading' : ''}`}
                    disabled={loading}
                  >
                    {loading ? (
                      <><span className="cp-spinner" /><span>{t('auth.cp.updating')}</span></>
                    ) : (
                      <><ShieldCheck size={16} /><span>{t('auth.cp.submit')}</span><ArrowRight size={15} /></>
                    )}
                  </button>
                </form>

                <div className="cp-footer">
                  <Link href="/dashboard" className="cp-footer-link">
                    <ArrowLeft size={13} /> {t('auth.cp.back')}
                  </Link>
                </div>
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
