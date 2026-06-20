import React from 'react';
import Link from 'next/link';

export default function ChangePasswordPage() {
  return (
    <div className="auth-card glass-card">
      <div className="auth-header">
        <h1>Change Password</h1>
        <p>Secure your account with a new password</p>
      </div>

      <form className="auth-form" action="/dashboard">
        <div className="form-group">
          <label htmlFor="current-password">Current Password</label>
          <input type="password" id="current-password" className="input" placeholder="••••••••" required />
        </div>

        <div className="form-group">
          <label htmlFor="new-password">New Password</label>
          <input type="password" id="new-password" className="input" placeholder="••••••••" required />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirm-password">Confirm New Password</label>
          <input type="password" id="confirm-password" className="input" placeholder="••••••••" required />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
          Update Password
        </button>
      </form>

      <div className="auth-footer">
        <Link href="/dashboard" className="auth-link">Back to Dashboard</Link>
      </div>
    </div>
  );
}
