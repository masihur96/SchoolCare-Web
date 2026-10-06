"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import { useLanguage } from '@/components/language-provider';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  const navItems = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.students'), href: '/students', icon: Users },
    { name: t('nav.teachers'), href: '/teachers', icon: GraduationCap },
    { name: t('nav.classes'), href: '/classes', icon: BookOpen },
    { name: t('nav.attendance'), href: '/attendance', icon: CheckCircle },
    { name: t('nav.teacherAttendance'), href: '/teacher-attendance', icon: UserCheck },
    { name: t('nav.routine'), href: '/routine', icon: Calendar },
    { name: t('nav.exams'), href: '/exams', icon: FileText },
    { name: t('nav.notices'), href: '/notices', icon: BellRing },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ];

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
                key={item.href}
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
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              sessionStorage.removeItem('access_token');
              router.push('/login');
            }}
            className="nav-item logout-item w-full text-left bg-transparent border-none cursor-pointer"
            style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            <LogOut size={20} className="nav-icon" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {isOpen && (
        <div className="sidebar-overlay animate-fade-in" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
