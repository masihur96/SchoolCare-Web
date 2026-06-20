import React from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="auth-card glass-card">
      <div className="auth-header">
        <h1>Admin Registration</h1>
        <p>Create a new admin account for the EMS</p>
      </div>

      <form className="auth-form" action="/dashboard">
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input type="text" id="name" className="input" placeholder="John Doe" required />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" className="input" placeholder="admin@example.com" required />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" className="input" placeholder="••••••••" required />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
          Register
        </button>
      </form>

      <div className="auth-footer">
        Already have an account? <Link href="/login" className="auth-link">Log In</Link>
      </div>
    </div>
  );
}
