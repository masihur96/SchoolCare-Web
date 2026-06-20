"use client";

import React from 'react';
import { User, Bell, Globe, Shield } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="page-container animate-fade-in">
      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account, notifications, and preferences</p>
      </div>

      <div className="dashboard-widgets" style={{ gridTemplateColumns: '1fr 3fr' }}>
        
        {/* Settings Navigation */}
        <div className="widget glass-card h-max">
          <div className="flex flex-col gap-2 p-4">
            <button className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 text-primary font-medium">
              <User size={18} /> Smart Profile
            </button>
            <button className="flex items-center gap-3 p-3 rounded-lg text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition">
              <Bell size={18} /> Notifications
            </button>
            <button className="flex items-center gap-3 p-3 rounded-lg text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition">
              <Globe size={18} /> Localization
            </button>
            <button className="flex items-center gap-3 p-3 rounded-lg text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition">
              <Shield size={18} /> Security
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="widget glass-card">
          <div className="widget-header">
            <h3>Smart Profile</h3>
          </div>
          <div className="widget-content">
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-border">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                A
              </div>
              <div>
                <h2 className="text-xl font-bold">Admin User</h2>
                <p className="text-muted-foreground mb-3">Super Administrator</p>
                <div className="flex gap-2">
                  <button className="btn btn-primary text-sm" style={{ padding: '0.25rem 1rem' }}>Upload Photo</button>
                  <button className="btn text-sm" style={{ padding: '0.25rem 1rem', border: '1px solid var(--border)' }}>Remove</button>
                </div>
              </div>
            </div>

            <form className="flex flex-col gap-6 max-w-xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" className="input" defaultValue="Admin" />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" className="input" defaultValue="User" />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="input" defaultValue="admin@schoolcare.com" />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" className="input" defaultValue="+1 234 567 8900" />
              </div>

              <div className="form-group">
                <label>Language Preference</label>
                <select className="input bg-transparent">
                  <option>English (US)</option>
                  <option>Spanish (ES)</option>
                  <option>French (FR)</option>
                  <option>Arabic (AR)</option>
                </select>
              </div>

              <button type="button" className="btn btn-primary w-max">Save Changes</button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
