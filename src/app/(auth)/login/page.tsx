import React from 'react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="auth-card glass-card">
      <div className="auth-header">
        <h1>Welcome Back</h1>
        <p>Log in to access your dashboard</p>
      </div>

      <form className="auth-form" action="/dashboard">
        <div className="form-group">
          <label htmlFor="email">Email or Phone</label>
          <input type="text" id="email" className="input" placeholder="Enter email or phone number" required />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" className="input" placeholder="••••••••" required />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
          Log In
        </button>
      </form>

      <div className="auth-footer">
        Don't have an account? <Link href="/register" className="auth-link">Register</Link>
      </div>
    </div>
  );
}
