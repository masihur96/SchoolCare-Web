"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, GraduationCap, ArrowRight, ArrowLeft,
  ShieldCheck, CheckCircle2, User, Mail, Phone, Lock,
  Sparkles, Building2, BadgeCheck, Zap,
} from 'lucide-react';

type FormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  designation: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 = personal info, 2 = security
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'admin',
    designation: 'Principal',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState<Record<string, boolean>>({});

  useEffect(() => { setMounted(true); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const setFocusState = (field: string, val: boolean) =>
    setFocused(prev => ({ ...prev, [field]: val }));

  const isActiveField = (field: keyof FormData) =>
    focused[field] || !!formData[field];

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password) { setError('Please enter a password.'); return; }
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://smart-school-backend-production.up.railway.app/users', {
        method: 'POST',
        headers: { 'accept': '*/*', 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Registration failed. Please check your details.');
      }

      let token = '';
      let rToken = '';
      try {
        const data = await response.json();
        token = data.accessToken || data.token || data.data?.accessToken || data.data?.token || '';
        rToken = data.refreshToken || data.data?.refreshToken || '';
      } catch { /* ignore */ }

      if (token) { localStorage.setItem('accessToken', token); localStorage.setItem('token', token); }
      if (rToken) { localStorage.setItem('refreshToken', rToken); }

      if (!token) {
        const loginRes = await fetch('https://smart-school-backend-production.up.railway.app/auth/login', {
          method: 'POST',
          headers: { 'accept': '*/*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: formData.email, password: formData.password }),
        });
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          token = loginData.accessToken || loginData.token || loginData.data?.accessToken || loginData.data?.token || '';
          rToken = loginData.refreshToken || loginData.data?.refreshToken || '';
          if (token) { localStorage.setItem('accessToken', token); localStorage.setItem('token', token); }
          if (rToken) { localStorage.setItem('refreshToken', rToken); }
        }
      }

      router.push('/create-school');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    { icon: <Zap size={14} />, text: 'Setup in under 3 minutes' },
    { icon: <ShieldCheck size={14} />, text: 'Enterprise-grade security' },
    { icon: <BadgeCheck size={14} />, text: 'No credit card required' },
    { icon: <Building2 size={14} />, text: 'Unlimited school branches' },
  ];

  const steps = ['Your details', 'Set password'];

  return (
    <div className="reg-root">

      {/* ── Animated background ── */}
      <div className="reg-bg-mesh" aria-hidden="true">
        <div className="reg-orb reg-orb-1" />
        <div className="reg-orb reg-orb-2" />
        <div className="reg-orb reg-orb-3" />
        <div className="reg-grid" />
      </div>

      {/* ── Navbar ── */}
      <nav className="reg-nav">
        <Link href="/" className="reg-brand">
          <div className="reg-brand-icon"><GraduationCap size={18} strokeWidth={2.2} /></div>
          <span>SchoolCare</span>
        </Link>
        <div className="reg-nav-actions">
          <span className="reg-nav-hint">Already have an account?</span>
          <Link href="/login" className="reg-nav-login">Sign in <ArrowRight size={13} /></Link>
        </div>
      </nav>

      {/* ── Main body ── */}
      <div className="reg-body">

        {/* ── LEFT: value prop ── */}
        <div className="reg-left">
          <div className="reg-left-inner">
            <div className="reg-trust-badge">
              <Sparkles size={12} />
              <span>Free forever · No credit card</span>
            </div>

            <h1 className="reg-headline">
              Start managing your school <span className="reg-highlight">smarter today</span>
            </h1>

            <p className="reg-sub">
              Join 500+ schools that trust SchoolCare to handle attendance, grades,
              payroll, and analytics — all in one place.
            </p>

            {/* Perks */}
            <div className="reg-perks">
              {perks.map((p, i) => (
                <div key={i} className="reg-perk">
                  <div className="reg-perk-icon">{p.icon}</div>
                  <span>{p.text}</span>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="reg-social-proof">
              <div className="reg-avatars">
                {['RK', 'PS', 'AS', 'MJ', 'LT'].map((init, i) => (
                  <div
                    key={i}
                    className="reg-mini-avatar"
                    style={{ marginLeft: i === 0 ? 0 : '-10px', zIndex: 10 - i }}
                  >
                    {init}
                  </div>
                ))}
              </div>
              <div className="reg-social-text">
                <div className="reg-social-stars">{'★★★★★'}</div>
                <div className="reg-social-label">Loved by 120,000+ students & staff</div>
              </div>
            </div>

            {/* Feature highlight card */}
            <div className="reg-feature-card">
              <div className="reg-feature-card-header">
                <div className="reg-feature-dot green" />
                <div className="reg-feature-dot yellow" />
                <div className="reg-feature-dot red" />
                <span className="reg-feature-card-title">Live Dashboard Preview</span>
              </div>
              <div className="reg-feature-rows">
                {[
                  { label: 'Attendance Rate', value: '97.4%', color: '#34d399' },
                  { label: 'Exams This Month', value: '14', color: '#818cf8' },
                  { label: 'Staff On Leave', value: '2', color: '#fbbf24' },
                ].map((row, i) => (
                  <div key={i} className="reg-feature-row">
                    <span className="reg-feature-row-label">{row.label}</span>
                    <span className="reg-feature-row-value" style={{ color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: form card ── */}
        <div className="reg-right">
          <div className={`reg-card ${mounted ? 'mounted' : ''}`}>

            {/* Card brand row */}
            <div className="reg-card-header">
              <div className="reg-card-brand">
                <div className="reg-card-brand-icon">
                  <GraduationCap size={16} strokeWidth={2.2} />
                </div>
                <span>SchoolCare</span>
              </div>
              <div className="reg-free-badge">
                <CheckCircle2 size={11} /> Free account
              </div>
            </div>

            {/* Step indicator */}
            <div className="reg-stepper">
              {steps.map((label, i) => {
                const sNum = i + 1;
                const isDone = step > sNum;
                const isActive = step === sNum;
                return (
                  <React.Fragment key={i}>
                    <div className={`reg-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                      <div className="reg-step-circle">
                        {isDone ? <CheckCircle2 size={13} /> : sNum}
                      </div>
                      <span className="reg-step-label">{label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`reg-step-line ${isDone ? 'done' : ''}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <h2 className="reg-card-title">
              {step === 1 ? 'Create your account' : 'Secure your account'}
            </h2>
            <p className="reg-card-subtitle">
              {step === 1
                ? 'Enter your details to get started with SchoolCare.'
                : 'Choose a strong password to protect your account.'}
            </p>

            {/* Error */}
            {error && (
              <div className="reg-error" role="alert">
                <span className="reg-error-dot" />
                {error}
              </div>
            )}

            {/* ── STEP 1: Personal info ── */}
            {step === 1 && (
              <form onSubmit={handleStep1} className="reg-form" noValidate>

                {/* Full name */}
                <div className={`reg-field ${isActiveField('name') ? 'active' : ''}`}>
                  <div className="reg-field-icon"><User size={15} /></div>
                  <input
                    id="name"
                    type="text"
                    className="reg-input"
                    value={formData.name}
                    onChange={handleChange}
                    onFocus={() => setFocusState('name', true)}
                    onBlur={() => setFocusState('name', false)}
                    required
                    autoComplete="name"
                    placeholder=" "
                  />
                  <label htmlFor="name" className="reg-float-label">Full name</label>
                  <div className="reg-field-line" />
                </div>

                {/* Email */}
                <div className={`reg-field ${isActiveField('email') ? 'active' : ''}`}>
                  <div className="reg-field-icon"><Mail size={15} /></div>
                  <input
                    id="email"
                    type="email"
                    className="reg-input"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFocusState('email', true)}
                    onBlur={() => setFocusState('email', false)}
                    required
                    autoComplete="email"
                    placeholder=" "
                  />
                  <label htmlFor="email" className="reg-float-label">Work email address</label>
                  <div className="reg-field-line" />
                </div>

                {/* Phone */}
                <div className={`reg-field ${isActiveField('phone') ? 'active' : ''}`}>
                  <div className="reg-field-icon"><Phone size={15} /></div>
                  <input
                    id="phone"
                    type="tel"
                    className="reg-input"
                    value={formData.phone}
                    onChange={handleChange}
                    onFocus={() => setFocusState('phone', true)}
                    onBlur={() => setFocusState('phone', false)}
                    required
                    autoComplete="tel"
                    placeholder=" "
                  />
                  <label htmlFor="phone" className="reg-float-label">Phone number</label>
                  <div className="reg-field-line" />
                </div>

                <button id="reg-next-btn" type="submit" className="reg-submit">
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* ── STEP 2: Password ── */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="reg-form" noValidate>

                {/* Password field */}
                <div className={`reg-field ${isActiveField('password') ? 'active' : ''}`}>
                  <div className="reg-field-icon"><Lock size={15} /></div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="reg-input"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setFocusState('password', true)}
                    onBlur={() => setFocusState('password', false)}
                    required
                    autoComplete="new-password"
                    placeholder=" "
                    style={{ paddingRight: '44px' }}
                  />
                  <label htmlFor="password" className="reg-float-label">Password</label>
                  <div className="reg-field-line" />
                  <button
                    type="button"
                    className="reg-pw-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength hints */}
                <div className="reg-pw-hints">
                  {[
                    { label: 'At least 8 characters', ok: formData.password.length >= 8 },
                    { label: 'Contains a number', ok: /\d/.test(formData.password) },
                    { label: 'Contains a letter', ok: /[a-zA-Z]/.test(formData.password) },
                  ].map((h, i) => (
                    <div key={i} className={`reg-pw-hint ${h.ok ? 'ok' : ''}`}>
                      <CheckCircle2 size={11} />
                      <span>{h.label}</span>
                    </div>
                  ))}
                </div>

                <button
                  id="reg-submit-btn"
                  type="submit"
                  className={`reg-submit ${loading ? 'loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="reg-spinner" /><span>Creating account…</span></>
                  ) : (
                    <><span>Create free account</span><ArrowRight size={16} /></>
                  )}
                </button>

                <button
                  type="button"
                  className="reg-back-btn"
                  onClick={() => { setStep(1); setError(''); }}
                >
                  <ArrowLeft size={14} /> Back to details
                </button>
              </form>
            )}

            {/* Footer */}
            <p className="reg-terms">
              By creating an account, you agree to our{' '}
              <Link href="/terms">Terms of Service</Link> and{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
