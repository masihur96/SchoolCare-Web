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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identifier, password })
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
    <div className="login-page-container">
      <style dangerouslySetInnerHTML={{__html: `
        .login-page-container {
          position: fixed;
          inset: 0;
          z-index: 100;
          background-color: #09090b;
          color: #fafafa;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          overflow-y: auto;
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 33.33vw 33.33vh;
          background-position: center top;
        }
        
        /* Navbar */
        .login-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 3rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(9, 9, 11, 0.8);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        
        .login-nav-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 700;
          font-size: 1.125rem;
          letter-spacing: -0.5px;
        }
        
        .login-nav-center {
          display: flex;
          gap: 2.5rem;
          font-size: 0.875rem;
          color: #a1a1aa;
        }
        
        .login-nav-center a {
          text-decoration: none;
          color: inherit;
          transition: color 0.2s;
        }
        
        .login-nav-center a:hover {
          color: #fff;
        }
        
        .login-nav-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        
        .login-nav-btn {
          background: #fff;
          color: #000;
          padding: 0.5rem 1.25rem;
          border-radius: 9999px;
          font-weight: 600;
          font-size: 0.875rem;
          text-decoration: none;
          transition: opacity 0.2s;
        }
        
        .login-nav-btn:hover {
          opacity: 0.9;
        }
        
        .login-link-nav {
          text-decoration: none;
          color: #fff;
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        /* Main content */
        .login-main {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 80px);
          padding: 2rem;
          position: relative;
        }
        
        /* Center Card */
        .login-card {
          width: 100%;
          max-width: 440px;
          background: #000000;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 2.5rem 2rem;
          position: relative;
          z-index: 10;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .login-header h1 {
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          letter-spacing: -0.5px;
        }
        
        .login-header p {
          color: #a1a1aa;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        
        .social-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          padding: 0.6rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          margin-bottom: 0.75rem;
          transition: background 0.2s;
        }
        
        .social-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        
        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1.5rem 0;
          color: #52525b;
          font-size: 0.75rem;
        }
        
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .divider::before {
          margin-right: 1em;
        }
        
        .divider::after {
          margin-left: 1em;
        }
        
        .input-group {
          margin-bottom: 1.25rem;
          text-align: left;
        }
        
        .input-group label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #fff;
        }
        
        .login-input {
          width: 100%;
          background: #18181b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 0.7rem 1rem;
          color: #fff;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }
        
        .login-input:focus {
          outline: none;
          border-color: #0066ff;
        }
        
        .login-input::placeholder {
          color: #52525b;
        }
        
        .submit-btn {
          width: 100%;
          background: #0066ff;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0.7rem;
          font-size: 0.9rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: background 0.2s;
          margin-top: 1.5rem;
        }
        
        .submit-btn:hover {
          background: #0052cc;
        }
        
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .login-footer {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.875rem;
          color: #a1a1aa;
        }
        
        .login-footer a {
          color: #fff;
          font-weight: 600;
          text-decoration: none;
        }
        
        .terms-text {
          text-align: center;
          font-size: 0.75rem;
          color: #71717a;
          margin-top: 2rem;
          line-height: 1.6;
        }
        
        .terms-text a {
          color: #3b82f6;
          text-decoration: none;
        }
        
        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          margin-bottom: 1.25rem;
          text-align: center;
        }

        /* Glow effect behind card */
        .glow-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80vw;
          height: 80vh;
          background: radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 60%);
          z-index: 1;
          pointer-events: none;
        }
        
        @media (max-width: 768px) {
          .login-nav-center {
            display: none;
          }
          .login-nav {
            padding: 1rem;
          }
        }
      `}} />

      <nav className="login-nav">
        <div className="login-nav-left">
          <div style={{ width: '28px', height: '28px', background: '#fff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </div>
          AK
        </div>
        <div className="login-nav-center">
          <Link href="/">Home</Link>
          <Link href="#features">Features</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="#download">Download</Link>
          <Link href="#blog">Blog</Link>
          <Link href="#contact">Contact</Link>
        </div>
        <div className="login-nav-right">
          <button style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          </button>
          <Link href="/login" className="login-link-nav">Login</Link>
          <Link href="/register" className="login-nav-btn">Sign Up</Link>
        </div>
      </nav>

      <main className="login-main">
        <div className="glow-bg"></div>
        <div className="login-card">
          <div className="login-header">
            <h1>Get Started</h1>
            <p>Join us now and create an account to access<br/>exclusive content!</p>
          </div>

          <button className="social-btn" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button className="social-btn" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.365 14.781c-.019-2.584 2.115-3.826 2.213-3.882-1.196-1.752-3.059-1.99-3.738-2.015-1.583-.162-3.092.932-3.896.932-.803 0-2.046-.897-3.344-.871-1.689.023-3.245.981-4.113 2.492-1.761 3.052-.451 7.574 1.266 10.052.841 1.213 1.836 2.576 3.167 2.525 1.282-.051 1.777-.828 3.315-.828 1.528 0 1.993.828 3.335.803 1.371-.026 2.223-1.226 3.054-2.438 1.052-1.536 1.488-3.024 1.51-3.1-.035-.015-2.75-1.055-2.769-4.223h.001zM14.996 5.516c.692-.838 1.157-2.001 1.03-3.164-1.006.041-2.214.67-2.923 1.503-.635.738-1.199 1.928-1.049 3.068 1.127.087 2.249-.569 2.942-1.407z"/>
            </svg>
            Continue with Apple
          </button>

          <div className="divider">or</div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="input-group">
              <label htmlFor="identifier">Email</label>
              <input 
                type="text" 
                id="identifier" 
                className="login-input" 
                placeholder="johndoe@example.com" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required 
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password" 
                  className="login-input" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#52525b',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Continue'} 
              {!isLoading && <ChevronRight size={16} />}
            </button>
          </form>

          <div className="login-footer">
            Don't have an account? <Link href="/register">Sign Up</Link>
          </div>

          <div className="terms-text">
            By Proceeding, you agree to the<br/>
            <Link href="#">Terms & Condition</Link> and <Link href="#">Privacy Policy</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

