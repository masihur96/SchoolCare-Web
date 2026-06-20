"use client";

import React from 'react';
import { Bell, Search, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="navbar glass">
      <div className="marquee-container glass-card">
        <div className="marquee-content">
          <span>🚨 Important: Final term exams start next week. Please review syllabus!</span>
        </div>
      </div>

      <div className="navbar-actions">
        <div className="search-bar glass-card">
          <Search size={18} className="text-muted-foreground" />
          <input type="text" placeholder="Search..." className="search-input" />
        </div>

        <button 
          className="icon-btn glass-card"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle Theme"
        >
          <Sun size={20} className="sun-icon" />
          <Moon size={20} className="moon-icon" />
        </button>

        <button className="icon-btn glass-card relative" aria-label="Notifications">
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>

        <div className="user-profile glass-card">
          <div className="avatar">A</div>
          <div className="user-info">
            <span className="user-name">Admin</span>
            <span className="user-role">Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
