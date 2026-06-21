"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  BellRing, 
  Calendar, 
  CheckCircle,
  FileText,
  Settings,
  Menu,
  X,
  GraduationCap,
  LogOut,
  UserCheck
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Teachers', href: '/teachers', icon: GraduationCap },
  { name: 'Classes & Subjects', href: '/classes', icon: BookOpen },
  { name: 'Attendance', href: '/attendance', icon: CheckCircle },
  { name: 'Teacher Attendance', href: '/teacher-attendance', icon: UserCheck },
  { name: 'Routine', href: '/routine', icon: Calendar },
  { name: 'Exams', href: '/exams', icon: FileText },
  { name: 'Notices', href: '/notices', icon: BellRing },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className="mobile-menu-btn glass"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`sidebar glass ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-icon glass-card">
            <GraduationCap size={28} className="text-primary" />
          </div>
          <h2>SchoolCare</h2>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} className="nav-icon" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link
            href="/login"
            className="nav-item logout-item"
          >
            <LogOut size={20} className="nav-icon" />
            <span>Log Out</span>
          </Link>
        </div>
      </aside>

      {isOpen && (
        <div className="sidebar-overlay animate-fade-in" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
