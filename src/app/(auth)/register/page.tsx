"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    phone: '',
    designation: 'Principal',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Register the user
      const response = await fetch('https://smart-school-backend-production.up.railway.app/users', {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Registration failed. Please check your details.');
      }

      // Try to get tokens from registration response first
      let token = '';
      let rToken = '';
      try {
        const data = await response.json();
        token = data.accessToken || data.token || data.data?.accessToken || data.data?.token || '';
        rToken = data.refreshToken || data.data?.refreshToken || '';
      } catch (e) {
        // Ignore JSON parse error if response is empty
      }

      if (token) {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('token', token);
      }
      if (rToken) {
        localStorage.setItem('refreshToken', rToken);
      }

      // 2. If no token, auto-login to get one
      if (!token) {
        const loginResponse = await fetch('https://smart-school-backend-production.up.railway.app/auth/login', {
          method: 'POST',
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier: formData.email,
            password: formData.password
          }),
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          token = loginData.accessToken || loginData.token || loginData.data?.accessToken || loginData.data?.token || '';
          rToken = loginData.refreshToken || loginData.data?.refreshToken || '';
          
          if (token) {
            localStorage.setItem('accessToken', token);
            localStorage.setItem('token', token);
          }
          if (rToken) {
            localStorage.setItem('refreshToken', rToken);
          }
        }
      }

      // Navigate to create school UI
      router.push('/create-school');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card glass-card">
      <div className="auth-header">
        <h1>Admin Registration</h1>
        <p>Create a new admin account for the EMS</p>
      </div>

      {error && <div className="error-message" style={{ color: '#ff4d4f', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input type="text" id="name" className="input" placeholder="John Doe" value={formData.name} onChange={handleChange} required disabled={loading} />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" className="input" placeholder="admin@example.com" value={formData.email} onChange={handleChange} required disabled={loading} />
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input type="tel" id="phone" className="input" placeholder="+1234567890" value={formData.phone} onChange={handleChange} required disabled={loading} />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              id="password" 
              className="input" 
              placeholder="••••••••" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              disabled={loading} 
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
              disabled={loading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <div className="auth-footer">
        Already have an account? <Link href="/login" className="auth-link">Log In</Link>
      </div>
    </div>
  );
}
