"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ChevronRight } from 'lucide-react';

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

      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <Link href="/" className="lp-nav-brand">
          <span className="lp-nav-logo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </span>
          AK
        </Link>

        <ul className="lp-nav-links">
          <li><Link href="/">Home</Link></li>
          <li><Link href="#features">Features</Link></li>
          <li><Link href="#pricing">Pricing</Link></li>
          <li><Link href="#download">Download</Link></li>
          <li><Link href="#blog">Blog</Link></li>
          <li><Link href="#contact">Contact</Link></li>
        </ul>

        <div className="lp-nav-actions">
          {/* Theme icon */}
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', display: 'flex', padding: 0 }} aria-label="Toggle theme">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1"  x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22"   x2="5.64"  y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1"  y1="12" x2="3"  y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
              <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
            </svg>
          </button>
          <Link href="/login"     className="lp-nav-ghost-link">Login</Link>
          <Link href="/register"  className="lp-nav-signup">Sign Up</Link>
        </div>
      </nav>

      {/* ── Main card ── */}
      <main className="lp-main">
        <div className="lp-card">

          <h1 className="lp-card-title">Get Started</h1>
          <p className="lp-card-subtitle">
            Join us now and create an account to access<br />exclusive content!
          </p>

          {/* Social buttons */}
          <button className="lp-social-btn" type="button">
            {/* Google "G" SVG */}
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button className="lp-social-btn" type="button">
            {/* Apple SVG */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.365 14.781c-.019-2.584 2.115-3.826 2.213-3.882-1.196-1.752-3.059-1.99-3.738-2.015-1.583-.162-3.092.932-3.896.932-.803 0-2.046-.897-3.344-.871-1.689.023-3.245.981-4.113 2.492-1.761 3.052-.451 7.574 1.266 10.052.841 1.213 1.836 2.576 3.167 2.525 1.282-.051 1.777-.828 3.315-.828 1.528 0 1.993.828 3.335.803 1.371-.026 2.223-1.226 3.054-2.438 1.052-1.536 1.488-3.024 1.51-3.1-.035-.015-2.75-1.055-2.769-4.223h.001zM14.996 5.516c.692-.838 1.157-2.001 1.03-3.164-1.006.041-2.214.67-2.923 1.503-.635.738-1.199 1.928-1.049 3.068 1.127.087 2.249-.569 2.942-1.407z"/>
            </svg>
            Continue with Apple
          </button>

          <div className="lp-divider">or</div>

          {/* Login form */}
          <form onSubmit={handleSubmit} noValidate>
            {error && <div className="lp-error">{error}</div>}

            <div className="lp-field">
              <label htmlFor="identifier" className="lp-label">Email</label>
              <input
                id="identifier"
                type="text"
                className="lp-input"
                placeholder="johndoe@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="lp-field">
              <label htmlFor="password" className="lp-label">Password</label>
              <div className="lp-pw-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="lp-input"
                  placeholder="••••••••"
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
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="lp-submit" disabled={isLoading}>
              {isLoading ? 'Logging in…' : 'Continue'}
              {!isLoading && <ChevronRight size={16} />}
            </button>
          </form>

          <p className="lp-footer-text">
            Already have an account?&nbsp;<Link href="/login">Login</Link>
          </p>

          <p className="lp-terms">
            By Proceeding, you agree to the<br />
            <Link href="#">Terms &amp; Condition</Link> and <Link href="#">Privacy Policy</Link>
          </p>

        </div>
      </main>
    </div>
  );
}
