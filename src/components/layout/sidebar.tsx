'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, BookOpen, BellRing, Calendar, CheckCircle,
  FileText, Settings, Menu, X, GraduationCap, LogOut, UserCheck,
  ClipboardList, BrainCircuit, Activity, Clock, MessageSquare, Book,
  BarChart2, PieChart, ChevronLeft, ChevronRight, MessageCircle,
  MoreVertical, User, Key
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false); // Mobile toggle
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop toggle
  const { t } = useLanguage();

  const [profile, setProfile] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function getToken() {
      if (typeof window === 'undefined') return '';
      return (
        localStorage.getItem('accessToken') ||
        localStorage.getItem('access_token') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('access_token') ||
        ''
      );
    }

    async function fetchProfile() {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch('https://smart-school-backend-production.up.railway.app/auth/profile', {
          headers: { Authorization: `Bearer ${token}`, Accept: '*/*' }
        });
        if (res.ok) {
          const json = await res.json();
          setProfile(json.data);
        }
      } catch (e) {
        console.error('Failed to fetch profile', e);
      }
    }
    fetchProfile();
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navItems = [
    { name: t('nav.dashboard') || 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Classes', href: '/classes', icon: BookOpen },
    { name: t('nav.students') || 'Students', href: '/students', icon: Users },
    { name: t('nav.attendance') || 'Attendance', href: '/attendance', icon: CheckCircle },
    { name: 'Lesson Plans', href: '/lesson-plans', icon: ClipboardList, dummy: true },
    { name: 'Assignments', href: '/assignments', icon: FileText, dummy: true },
    { name: 'AI Quiz Builder', href: '/quiz-builder', icon: BrainCircuit, dummy: true },
    { name: 'Results & Grades', href: '/exams', icon: Activity },
    { name: 'Timetable', href: '/routine', icon: Calendar },
    { name: 'Homework', href: '/homework', icon: Clock, dummy: true },
    { name: 'Communication', href: '/notices', icon: MessageSquare },
    { name: 'Library', href: '/library', icon: Book, dummy: true },
    { name: 'Reports & Analytics', href: '/reports', icon: BarChart2, dummy: true },
    { name: 'Leave Management', href: '/teacher-attendance', icon: UserCheck },
    { name: 'Fees (View)', href: '/fees', icon: PieChart, dummy: true },
    { name: t('nav.settings') || 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('access_token');
    router.push('/login');
  };

  return (
    <>
      {/* Mobile toggle */}
      <button 
        className="mobile-menu-btn glass"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar container */}
      <aside className={`nd-sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        
        {/* Header / Logo */}
        <div className="nd-sidebar-header">
          <div className="nd-logo-wrapper">
            <div className="nd-logo-icon">
              <img src="/schoolcare-logo.jpg" alt="App Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
            </div>
            {!isCollapsed && <h2 className="nd-logo-text">SchoolCare AI <span className="nd-erp">ERP</span></h2>}
          </div>
        </div>

        {/* Navigation list */}
        <nav className="nd-sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href) && item.href !== '/';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nd-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? item.name : undefined}
              >
                <div className="nd-nav-icon-wrapper">
                  <Icon size={18} className="nd-nav-icon" />
                </div>
                {!isCollapsed && <span className="nd-nav-text">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer Area */}
        <div className="nd-sidebar-footer">
          {/* AI Banner */}
          {!isCollapsed && (
            <div className="nd-ai-banner">
              <p className="nd-ai-title">Meet Nova AI</p>
              <p className="nd-ai-desc">Your AI Teaching Assistant for smarter & faster teaching.</p>
              <div className="nd-ai-bot-icon">
                <MessageCircle size={28} color="#6366f1" fill="#eef2ff" />
              </div>
              <button className="nd-ai-btn">Chat with Nova AI</button>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="nd-bottom-actions" ref={profileRef} style={{ position: 'relative' }}>
            <div 
              className={`nd-sidebar-profile ${isCollapsed ? 'collapsed' : ''}`}
              onClick={() => !isCollapsed && setIsProfileOpen(!isProfileOpen)}
            >
              <div className="nd-profile-avatar">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Avatar" />
                ) : (
                  <span>{profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}</span>
                )}
              </div>
              
              {!isCollapsed && (
                <>
                  <div className="nd-profile-info">
                    <span className="nd-profile-name">{profile?.name || 'User'}</span>
                    <span className="nd-profile-role">{profile?.role === 'admin' ? 'Super Admin' : (profile?.role || 'Staff')}</span>
                  </div>
                  <button 
                    className="nd-profile-more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProfileOpen(!isProfileOpen);
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Popover */}
            {isProfileOpen && !isCollapsed && (
              <div className="nd-profile-popover">
                <div className="nd-popover-header">
                  <div className="nd-profile-avatar">
                    {profile?.avatar ? (
                      <img src={profile.avatar} alt="Avatar" />
                    ) : (
                      <span>{profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </div>
                  <div className="nd-profile-info">
                    <span className="nd-profile-name">{profile?.name || 'User'}</span>
                    <span className="nd-profile-email">{profile?.email || 'user@example.com'}</span>
                  </div>
                </div>
                
                <div className="nd-popover-divider"></div>
                
                <div className="nd-popover-menu">
                  <Link href="/profile" className="nd-popover-item" onClick={() => setIsProfileOpen(false)}>
                    <User size={16} />
                    <span>Profile</span>
                  </Link>
                  <Link href="/change-password" className="nd-popover-item" onClick={() => setIsProfileOpen(false)}>
                    <Key size={16} />
                    <span>Change Password</span>
                  </Link>
                </div>
                
                <div className="nd-popover-divider"></div>
                
                <div className="nd-popover-menu">
                  <button onClick={handleLogout} className="nd-popover-item nd-popover-logout">
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="nd-collapse-btn"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="sidebar-overlay animate-fade-in" onClick={() => setIsOpen(false)} />
      )}

      {/* Global CSS overrides to make this work with existing layout */}
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --nd-sidebar-width: 270px;
          --nd-sidebar-collapsed-width: 80px;
        }
        
        .app-layout:has(.nd-sidebar:not(.collapsed)) .main-content {
          margin-left: var(--nd-sidebar-width);
        }
        
        .app-layout:has(.nd-sidebar.collapsed) .main-content {
          margin-left: var(--nd-sidebar-collapsed-width);
        }
        
        /* Reset old sidebar width styles */
        .sidebar { display: none !important; } 
        
        .nd-sidebar {
          width: var(--nd-sidebar-width);
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 50;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-right: 1px solid #f1f5f9;
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          overflow-x: hidden;
        }

        .nd-sidebar.collapsed {
          width: var(--nd-sidebar-collapsed-width);
        }

        .nd-sidebar-header {
          padding: 1.5rem 1.25rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .nd-logo-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          height: 32px;
        }

        .nd-sidebar.collapsed .nd-logo-wrapper {
          justify-content: center;
        }

        .nd-logo-icon {
          width: 32px;
          height: 32px;
          background: #1e40af;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(30, 64, 175, 0.2);
        }

        .nd-logo-text {
          font-size: 1.15rem;
          font-weight: 800;
          color: #1e293b;
          white-space: nowrap;
        }
        
        .nd-erp {
          font-size: 0.7rem;
          background: #e2e8f0;
          color: #64748b;
          padding: 2px 6px;
          border-radius: 4px;
          vertical-align: super;
        }


        .nd-sidebar-nav {
          flex: 1;
          padding: 0 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        
        .nd-sidebar-nav:hover {
          scrollbar-color: #cbd5e1 transparent;
        }

        .nd-nav-item {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.65rem 0.75rem;
          border-radius: 10px;
          color: #64748b;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.9rem;
          width: 100%;
        }

        .nd-sidebar.collapsed .nd-nav-item {
          justify-content: center;
          padding: 0.85rem 0;
        }

        .nd-nav-item:hover {
          color: #3b82f6;
          background: #f8fafc;
        }

        .nd-nav-item.active {
          background: #eef2ff;
          color: #4f46e5;
          font-weight: 600;
        }

        .nd-nav-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nd-nav-text {
          white-space: nowrap;
          flex: 1;
          text-align: left;
        }

        .nd-sidebar-footer {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border-top: 1px solid #f1f5f9;
          background: #ffffff;
        }

        .nd-ai-banner {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.25rem;
          text-align: center;
          position: relative;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .nd-ai-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }

        .nd-ai-desc {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .nd-ai-bot-icon {
          margin: 0 auto 1rem;
        }

        .nd-ai-btn {
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s;
        }

        .nd-ai-btn:hover {
          background: #4338ca;
        }

        .nd-bottom-actions {
          display: flex;
          gap: 0.5rem;
        }

        .nd-sidebar.collapsed .nd-bottom-actions {
          flex-direction: column;
        }

        .nd-logout-item {
          flex: 1;
        }
        
        .nd-logout-item:hover {
          color: #ef4444;
          background: #fef2f2;
        }

        .nd-collapse-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #f1f5f9;
          border: none;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .nd-collapse-btn:hover {
          background: #e2e8f0;
          color: #334155;
        }

        .nd-sidebar.collapsed .nd-collapse-btn {
          width: 100%;
        }
        
        /* User Profile */
        .nd-sidebar-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s;
          flex: 1;
        }
        .nd-sidebar-profile:hover {
          background: #f8fafc;
        }
        .nd-sidebar-profile.collapsed {
          justify-content: center;
          padding: 0.5rem 0;
        }
        .nd-profile-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .nd-profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .nd-profile-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }
        .nd-profile-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nd-profile-role, .nd-profile-email {
          font-size: 0.75rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-transform: capitalize;
        }
        .nd-profile-more-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .nd-profile-more-btn:hover {
          background: #e2e8f0;
          color: #475569;
        }
        
        .nd-profile-popover {
          position: absolute;
          bottom: calc(100% + 0.5rem);
          left: 0;
          width: 240px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          z-index: 100;
          overflow: hidden;
          animation: popover-up 0.2s ease-out;
        }
        @keyframes popover-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .nd-popover-header {
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .nd-popover-divider {
          height: 1px;
          background: #f1f5f9;
          width: 100%;
        }
        
        .nd-popover-menu {
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .nd-popover-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          color: #475569;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.2s;
          border: none;
          background: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
        }
        .nd-popover-item:hover {
          background: #f8fafc;
          color: #0f172a;
        }
        .nd-popover-logout {
          color: #ef4444;
        }
        .nd-popover-logout:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        /* Mobile specific */
        @media (max-width: 1024px) {
          .nd-sidebar {
            transform: translateX(-100%);
          }
          .nd-sidebar.open {
            transform: translateX(0);
          }
          .app-layout:has(.nd-sidebar) .main-content {
            margin-left: 0 !important;
          }
          .nd-collapse-btn {
            display: none;
          }
        }
      `}} />
    </>
  );
}
