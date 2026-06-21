"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

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
        body: JSON.stringify({
          identifier,
          password
        })
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
        localStorage.setItem('token', accessToken); // for backward compatibility
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
    <div className="auth-card glass-card">
      <div className="auth-header">
        <h1>Welcome Back</h1>
        <p>Log in to access your dashboard</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="identifier">Email or Phone</label>
          <input 
            type="text" 
            id="identifier" 
            className="input" 
            placeholder="Enter email or phone number" 
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required 
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              id="password" 
              className="input" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary, #6b7280)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <div className="auth-footer">
        Don't have an account? <Link href="/register" className="auth-link">Register</Link>
      </div>
    </div>
  );
}
