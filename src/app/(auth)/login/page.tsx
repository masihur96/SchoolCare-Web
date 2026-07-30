"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, GraduationCap, Users, BookOpen, Award,
  ShieldCheck, TrendingUp, Clock, ArrowRight, CheckCircle2,
  Sparkles, Sun, Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [identifierFocused, setIdentifierFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const testimonials = [
    {
      quote: "SchoolCare transformed how we manage attendance and grades. What used to take hours now takes minutes.",
      name: "Rahul Khan",
      role: "Principal, Greenfield Academy",
      initials: "RK",
      color: "from-violet-500 to-purple-600",
    },
    {
      quote: "The analytics dashboard gives us real-time insights into student performance we never had before.",
      name: "Priya Sharma",
      role: "Director, Horizon Public School",
      initials: "PS",
      color: "from-emerald-500 to-teal-600",
    },
    {
      quote: "Payroll and staff management is seamless. Our admin team loves how intuitive the platform is.",
      name: "Ahmed Siddiqui",
      role: "Head Admin, Crescent High School",
      initials: "AS",
      color: "from-blue-500 to-cyan-600",
    },
  ];

  const features = [
    { icon: <Users size={15} />, text: 'Smart Attendance Tracking', color: '#818cf8' },
    { icon: <BookOpen size={15} />, text: 'Exam & Grade Analytics', color: '#34d399' },
    { icon: <Award size={15} />, text: 'Staff & Payroll System', color: '#f472b6' },
    { icon: <TrendingUp size={15} />, text: 'Performance Insights', color: '#fbbf24' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('https://smart-school-backend-production.up.railway.app/auth/login', {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Login failed. Please check your credentials and try again.');
      }

      const data = await response.json();

      const accessToken = data.accessToken || data.token || data.data?.accessToken || data.data?.token;
      const refreshToken = data.refreshToken || data.data?.refreshToken;

      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-v2-root">

      {/* ── Animated background mesh ── */}
      <div className="login-v2-bg-mesh" aria-hidden="true">
        <div className="mesh-orb mesh-orb-1" />
        <div className="mesh-orb mesh-orb-2" />
        <div className="mesh-orb mesh-orb-3" />
        <div className="mesh-grid" />
      </div>

      {/* ── Top Navbar ── */}
      <nav className="login-v2-nav">
        <Link href="/" className="login-v2-brand">
          <div className="login-v2-brand-icon">
            <GraduationCap size={18} strokeWidth={2.2} />
          </div>
          <span>SchoolCare</span>
        </Link>

        <ul className="login-v2-nav-links">
          <li><Link href="/">Home</Link></li>
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/#pricing">Pricing</Link></li>
          <li><Link href="/#about">About</Link></li>
        </ul>

        <div className="login-v2-nav-actions">
          {mounted && (
            <button
              className="icon-btn glass-card"
              style={{ marginRight: '8px', width: '36px', height: '36px' }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle Theme"
            >
              <Sun size={18} className="sun-icon" />
              <Moon size={18} className="moon-icon" />
            </button>
          )}
          <Link href="/login" className="login-v2-nav-ghost">Sign in</Link>
          <Link href="/register" className="login-v2-nav-cta">
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── Page body: two columns ── */}
      <div className="login-v2-body">

        {/* ── LEFT PANEL ── */}
        <div className="login-v2-left">

          {/* Floating trust badge */}
          <div className="login-v2-trust-badge">
            <Sparkles size={12} />
            <span>Trusted by 500+ Schools Worldwide</span>
          </div>

          <h1 className="login-v2-headline">
            The Modern Platform for <span className="login-v2-highlight">School Excellence</span>
          </h1>

          <p className="login-v2-subheadline">
            Streamline operations, empower educators, and elevate student outcomes
            — all from one unified dashboard.
          </p>

          {/* Stats row */}
          <div className="login-v2-stats">
            {[
              { value: '500+', label: 'Schools', icon: <GraduationCap size={14} /> },
              { value: '120k+', label: 'Students', icon: <Users size={14} /> },
              { value: '99.9%', label: 'Uptime', icon: <ShieldCheck size={14} /> },
              { value: '< 3min', label: 'Setup', icon: <Clock size={14} /> },
            ].map((s, i) => (
              <div key={i} className="login-v2-stat">
                <div className="login-v2-stat-icon">{s.icon}</div>
                <div className="login-v2-stat-value">{s.value}</div>
                <div className="login-v2-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className="login-v2-features">
            {features.map((f, i) => (
              <div key={i} className="login-v2-feature-item">
                <CheckCircle2 size={15} className="login-v2-check" />
                <span style={{ color: '#cbd5e1' }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Testimonial carousel */}
          <div className="login-v2-testimonial">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className={`login-v2-testimonial-slide ${i === activeTestimonial ? 'active' : ''}`}
              >
                <div className="login-v2-quote-mark">"</div>
                <p className="login-v2-testimonial-text">{t.quote}</p>
                <div className="login-v2-testimonial-author">
                  <div className={`login-v2-avatar bg-gradient-to-br ${t.color}`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="login-v2-author-name">{t.name}</div>
                    <div className="login-v2-author-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Dots */}
            <div className="login-v2-dots">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  className={`login-v2-dot ${i === activeTestimonial ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(i)}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="login-v2-right">
          <div className={`login-v2-card ${mounted ? 'mounted' : ''}`}>

            {/* Card header */}
            <div className="login-v2-card-header">
              <div className="login-v2-card-brand">
                <div className="login-v2-card-brand-icon">
                  <GraduationCap size={18} strokeWidth={2.2} />
                </div>
                <span>SchoolCare</span>
              </div>
              <div className="login-v2-secure-badge">
                <ShieldCheck size={11} />
                <span>256-bit SSL</span>
              </div>
            </div>

            <h2 className="login-v2-card-title">Welcome back</h2>
            <p className="login-v2-card-subtitle">
              Sign in to your school management account to continue.
            </p>

            {/* Error message */}
            {error && (
              <div className="login-v2-error" role="alert">
                <span className="login-v2-error-dot" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="login-v2-form">

              {/* Identifier field */}
              <div className={`login-v2-field-wrap ${identifierFocused || identifier ? 'active' : ''}`}>
                <input
                  id="login-identifier"
                  type="text"
                  className="login-v2-input"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onFocus={() => setIdentifierFocused(true)}
                  onBlur={() => setIdentifierFocused(false)}
                  required
                  autoComplete="email"
                  placeholder=" "
                />
                <label htmlFor="login-identifier" className="login-v2-float-label">
                  Email or Phone number
                </label>
                <div className="login-v2-field-line" />
              </div>

              {/* Password field */}
              <div className={`login-v2-field-wrap ${passwordFocused || password ? 'active' : ''}`}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-v2-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '44px' }}
                  placeholder=" "
                />
                <label htmlFor="login-password" className="login-v2-float-label">
                  Password
                </label>
                <div className="login-v2-field-line" />
                <button
                  type="button"
                  className="login-v2-pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Forgot password */}
              <div className="login-v2-forgot-row">
                <Link href="/change-password" className="login-v2-forgot-link">
                  Forgot password?
                </Link>
              </div>

              {/* Submit button */}
              <button
                id="login-submit-btn"
                type="submit"
                className={`login-v2-submit ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="login-v2-spinner" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to SchoolCare</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="login-v2-divider">
              <span>New to SchoolCare?</span>
            </div>

            {/* Register CTA */}
            <Link href="/register" className="login-v2-register-btn">
              Create a free account
            </Link>

            {/* Trust footer */}
            <div className="login-v2-card-footer">
              <div className="login-v2-footer-item">
                <ShieldCheck size={12} />
                <span>Enterprise Security</span>
              </div>
              <div className="login-v2-footer-sep" />
              <div className="login-v2-footer-item">
                <Clock size={12} />
                <span>99.9% Uptime SLA</span>
              </div>
              <div className="login-v2-footer-sep" />
              <div className="login-v2-footer-item">
                <CheckCircle2 size={12} />
                <span>GDPR Compliant</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
