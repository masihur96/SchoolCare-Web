"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ChevronRight, GraduationCap, Users, BookOpen, Award, Star } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="login-fullpage">

      {/* ── Top Navbar ── */}
      <nav className="lp-nav">
        <Link href="/" className="lp-nav-brand">
          <span className="lp-nav-logo">
            <GraduationCap size={16} />
          </span>
          SchoolCare
        </Link>

        <ul className="lp-nav-links">
          <li><Link href="/">Home</Link></li>
          <li><Link href="#features">Features</Link></li>
          <li><Link href="#pricing">Pricing</Link></li>
          <li><Link href="#about">About</Link></li>
          <li><Link href="#contact">Contact</Link></li>
        </ul>

        <div className="lp-nav-actions">
          <Link href="/login" className="lp-nav-ghost-link">Login</Link>
          <Link href="/register" className="lp-nav-signup">Get started →</Link>
        </div>
      </nav>

      {/* ── Two-column layout ── */}
      <div className="lp-page-wrapper">

        {/* ── Left dark panel ── */}
        <div className="lp-left-panel">
          <div>
            <div className="lp-left-badge">
              <Star size={11} />
              Trusted by 500+ Schools
            </div>

            <h1 className="lp-left-heading">
              Manage Your School <span>Smarter</span> &amp; Faster
            </h1>
            <p className="lp-left-sub">
              SchoolCare brings together attendance, student management, staff records,
              and performance analytics — all in one powerful platform.
            </p>

            {/* Stats */}
            <div className="lp-stat-row" style={{ marginBottom: '2.5rem' }}>
              <div className="lp-stat">
                <span className="lp-stat-num">500+</span>
                <span className="lp-stat-label">Schools</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat-num">120k+</span>
                <span className="lp-stat-label">Students</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat-num">99.9%</span>
                <span className="lp-stat-label">Uptime</span>
              </div>
            </div>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { icon: <Users size={14} />, text: 'Attendance & Student Management' },
                { icon: <BookOpen size={14} />, text: 'Exam & Grade Tracking' },
                { icon: <Award size={14} />, text: 'Staff & Payroll Management' },
              ].map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  fontSize: '0.82rem', color: '#9ca3af',
                }}>
                  <span style={{ color: '#818cf8' }}>{f.icon}</span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="lp-testimonial">
            <p className="lp-testimonial-text">
              "SchoolCare has completely transformed how we manage our school.
              Attendance tracking and report generation now takes minutes instead of hours."
            </p>
            <div className="lp-testimonial-author">
              <div className="lp-testimonial-avatar">RK</div>
              <div>
                <div className="lp-testimonial-name">Rahul Khan</div>
                <div className="lp-testimonial-role">Principal, Greenfield Academy</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="lp-right-panel">
          <div className="lp-card lp-animate">

            {/* Card logo */}
            <div className="lp-card-logo">
              <div className="lp-card-logo-icon">
                <GraduationCap size={16} />
              </div>
              <span className="lp-card-logo-text">SchoolCare</span>
            </div>

            <h1 className="lp-card-title">Welcome back</h1>
            <p className="lp-card-subtitle">
              Sign in to your account to continue managing your school.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {error && <div className="lp-error">{error}</div>}

              {/* Email / Phone */}
              <div className="lp-field">
                <label htmlFor="identifier" className="lp-label">Email or Phone</label>
                <input
                  id="identifier"
                  type="text"
                  className="lp-input"
                  placeholder="admin@school.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="lp-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label htmlFor="password" className="lp-label" style={{ margin: 0 }}>Password</label>
                  <Link href="#" style={{ fontSize: '0.75rem', color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
                    Forgot password?
                  </Link>
                </div>
                <div className="lp-pw-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="lp-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    className="lp-pw-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="lp-submit" disabled={isLoading}>
                {isLoading ? 'Signing in…' : 'Sign in'}
                {!isLoading && <ChevronRight size={16} />}
              </button>
            </form>

            <p className="lp-footer-text" style={{ marginTop: '1.5rem' }}>
              Don&apos;t have an account?{' '}
              <Link href="/register">Create one free</Link>
            </p>

            {/* Trusted badge */}
            <div style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'center',
            }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12} fill="#fbbf24" color="#fbbf24" />
              ))}
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginLeft: '0.25rem' }}>
                4.9/5 from 200+ reviews
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
