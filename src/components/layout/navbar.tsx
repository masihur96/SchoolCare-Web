"use client";

import React, {
  useState, useEffect, useRef, useCallback, useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, Search, Sun, Moon, X, CheckCheck, RefreshCw,
  Info, AlertTriangle, BookOpen, GraduationCap, Megaphone,
  LayoutDashboard, Users, Calendar, CheckCircle, FileText,
  BellRing, Settings, UserCheck, Loader2, Clock,
} from 'lucide-react';
import { useTheme } from 'next-themes';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Notification {
  id: string;
  title?: string;
  message?: string;
  body?: string;
  type?: string;
  isRead?: boolean;
  read?: boolean;
  createdAt?: string;
  created_at?: string;
}

interface SearchResult {
  id: string;
  kind: 'notice' | 'homework' | 'exam' | 'page';
  title: string;
  subtitle?: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('accessToken') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('access_token') ||
    ''
  );
}

function notifIcon(type?: string) {
  const t = type?.toLowerCase() ?? '';
  if (t.includes('exam'))    return <GraduationCap size={15} />;
  if (t.includes('homework') || t.includes('assignment')) return <BookOpen size={15} />;
  if (t.includes('warn') || t.includes('alert')) return <AlertTriangle size={15} />;
  if (t.includes('notice') || t.includes('announ')) return <Megaphone size={15} />;
  return <Info size={15} />;
}
function notifColor(type?: string): string {
  const t = type?.toLowerCase() ?? '';
  if (t.includes('exam'))    return '#6366f1';
  if (t.includes('homework') || t.includes('assignment')) return '#10b981';
  if (t.includes('warn') || t.includes('alert')) return '#f59e0b';
  if (t.includes('notice') || t.includes('announ')) return '#ec4899';
  return 'var(--primary)';
}

// ─── Static page index ────────────────────────────────────────────────────────
const PAGES: SearchResult[] = [
  { id: 'p-dashboard',         kind: 'page', title: 'Dashboard',          subtitle: 'Overview & stats',           href: '/dashboard',          icon: LayoutDashboard, color: '#6366f1' },
  { id: 'p-students',          kind: 'page', title: 'Students',            subtitle: 'Manage student records',     href: '/students',           icon: Users,           color: '#10b981' },
  { id: 'p-teachers',          kind: 'page', title: 'Teachers',            subtitle: 'Manage teaching staff',      href: '/teachers',           icon: GraduationCap,   color: '#f59e0b' },
  { id: 'p-classes',           kind: 'page', title: 'Classes & Subjects',  subtitle: 'Classes, subjects, sections', href: '/classes',           icon: BookOpen,        color: '#8b5cf6' },
  { id: 'p-attendance',        kind: 'page', title: 'Attendance',          subtitle: 'Student attendance records', href: '/attendance',         icon: CheckCircle,     color: '#06b6d4' },
  { id: 'p-teacher-attendance',kind: 'page', title: 'Teacher Attendance',  subtitle: 'Faculty attendance records', href: '/teacher-attendance', icon: UserCheck,       color: '#ec4899' },
  { id: 'p-routine',           kind: 'page', title: 'Routine',             subtitle: 'Class schedule & timetable', href: '/routine',            icon: Calendar,        color: '#f97316' },
  { id: 'p-exams',             kind: 'page', title: 'Exams',               subtitle: 'Exam schedule & results',    href: '/exams',              icon: FileText,        color: '#ef4444' },
  { id: 'p-notices',           kind: 'page', title: 'Notices',             subtitle: 'School announcements',       href: '/notices',            icon: BellRing,        color: '#f59e0b' },
  { id: 'p-settings',          kind: 'page', title: 'Settings',            subtitle: 'Account & school settings',  href: '/settings',           icon: Settings,        color: '#6b7280' },
];

// ─── Search hook ──────────────────────────────────────────────────────────────
function useSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (q: string) => {
    const trimmed = q.trim().toLowerCase();

    // Empty → show top pages
    if (!trimmed) {
      setResults(PAGES.slice(0, 5));
      return;
    }

    // Page matches (instant, no API)
    const pageMatches = PAGES.filter(
      (p) =>
        p.title.toLowerCase().includes(trimmed) ||
        (p.subtitle ?? '').toLowerCase().includes(trimmed)
    );

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${getToken()}`, Accept: '*/*' };

      const [noticeRes, hwRes, examRes] = await Promise.allSettled([
        fetch('https://smart-school-backend-production.up.railway.app/notices', { headers }),
        fetch('https://smart-school-backend-production.up.railway.app/homework', { headers }),
        fetch('https://smart-school-backend-production.up.railway.app/exam', { headers }),
      ]);

      const dataResults: SearchResult[] = [];

      // Notices
      if (noticeRes.status === 'fulfilled' && noticeRes.value.ok) {
        const json = await noticeRes.value.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        list
          .filter((n: { title?: string; content?: string; targetAudience?: string }) =>
            (n.title ?? '').toLowerCase().includes(trimmed) ||
            (n.content ?? '').toLowerCase().includes(trimmed) ||
            (n.targetAudience ?? '').toLowerCase().includes(trimmed)
          )
          .slice(0, 4)
          .forEach((n: { id: string; title?: string; targetAudience?: string }) => {
            dataResults.push({
              id: `notice-${n.id}`,
              kind: 'notice',
              title: n.title ?? 'Untitled Notice',
              subtitle: n.targetAudience ? `Audience: ${n.targetAudience}` : undefined,
              href: '/notices',
              icon: BellRing,
              color: '#f59e0b',
            });
          });
      }

      // Homework
      if (hwRes.status === 'fulfilled' && hwRes.value.ok) {
        const json = await hwRes.value.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        list
          .filter((h: { title?: string; description?: string; classInfo?: { name?: string }; subjectInfo?: { name?: string } }) =>
            (h.title ?? '').toLowerCase().includes(trimmed) ||
            (h.description ?? '').toLowerCase().includes(trimmed) ||
            (h.classInfo?.name ?? '').toLowerCase().includes(trimmed) ||
            (h.subjectInfo?.name ?? '').toLowerCase().includes(trimmed)
          )
          .slice(0, 4)
          .forEach((h: { id: string; title?: string; classInfo?: { name?: string }; subjectInfo?: { name?: string } }) => {
            const sub = [h.classInfo?.name, h.subjectInfo?.name].filter(Boolean).join(' · ');
            dataResults.push({
              id: `hw-${h.id}`,
              kind: 'homework',
              title: h.title ?? 'Untitled Homework',
              subtitle: sub || undefined,
              href: '/dashboard',
              icon: BookOpen,
              color: '#8b5cf6',
            });
          });
      }

      // Exams
      if (examRes.status === 'fulfilled' && examRes.value.ok) {
        const json = await examRes.value.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        list
          .filter((e: { exam_name?: string; description?: string }) =>
            (e.exam_name ?? '').toLowerCase().includes(trimmed) ||
            (e.description ?? '').toLowerCase().includes(trimmed)
          )
          .slice(0, 3)
          .forEach((e: { id: string; exam_name?: string; status?: string }) => {
            dataResults.push({
              id: `exam-${e.id}`,
              kind: 'exam',
              title: e.exam_name ?? 'Untitled Exam',
              subtitle: e.status ? `Status: ${e.status}` : undefined,
              href: '/exams',
              icon: FileText,
              color: '#ec4899',
            });
          });
      }

      setResults([...pageMatches, ...dataResults]);
    } catch {
      setResults(pageMatches);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(query), 280);
    return () => clearTimeout(t);
  }, [query, run]);

  // Show top pages on mount
  useEffect(() => {
    setResults(PAGES.slice(0, 5));
  }, []);

  return { results, loading };
}

// ─── KIND label ───────────────────────────────────────────────────────────────
const KIND_LABEL: Record<string, string> = {
  page: 'Page',
  notice: 'Notice',
  homework: 'Homework',
  exam: 'Exam',
};

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export function Navbar() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ── Search state ──
  const [query, setQuery]           = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIdx, setActiveIdx]   = useState(-1);
  const { results, loading: searchLoading } = useSearch(query);

  const searchRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLUListElement>(null);

  // ── Notification state ──
  const [notifOpen, setNotifOpen]   = useState(false);
  const [notifs, setNotifs]         = useState<Notification[]>([]);
  const [notifLoading, setNLoding]  = useState(false);
  const [notifError, setNError]     = useState('');
  const [readIds, setReadIds]       = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef  = useRef<HTMLButtonElement>(null);

  // ── Search: close on outside click ──
  useEffect(() => {
    function h(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Search: keyboard nav ──
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!searchOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = activeIdx >= 0 ? results[activeIdx] : results[0];
      if (target) navigate(target.href);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
      inputRef.current?.blur();
    }
  }

  // scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  function navigate(href: string) {
    setSearchOpen(false);
    setQuery('');
    startTransition(() => router.push(href));
  }

  // ── Notification fetch ──
  const fetchNotifs = useCallback(async () => {
    setNLoding(true);
    setNError('');
    try {
      const res = await fetch(
        'https://smart-school-backend-production.up.railway.app/notifications',
        { headers: { Authorization: `Bearer ${getToken()}`, Accept: '*/*' } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: Notification[] = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      setNotifs(list);
    } catch (e: unknown) {
      setNError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setNLoding(false);
    }
  }, []);

  useEffect(() => { if (notifOpen) fetchNotifs(); }, [notifOpen, fetchNotifs]);

  // close notif panel on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current  && !bellRef.current.contains(e.target as Node)
      ) setNotifOpen(false);
    }
    if (notifOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [notifOpen]);

  // Escape closes both
  useEffect(() => {
    function h(e: KeyboardEvent) {
      if (e.key === 'Escape') { setNotifOpen(false); setSearchOpen(false); }
    }
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const unreadCount = notifs.filter((n) => !(n.isRead || n.read || readIds.has(n.id))).length;
  const markRead    = (id: string) => setReadIds((p) => new Set([...p, id]));
  const markAllRead = () => setReadIds(new Set(notifs.map((n) => n.id)));

  // ── Group results by kind ──
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = r.kind;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const flatResults = Object.values(grouped).flat();

  return (
    <>
      <header className="navbar glass">
        <div className="navbar-actions" style={{ marginLeft: 'auto' }}>

          {/* ── Search ── */}
          <div ref={searchRef} className="sr-wrap">
            <div className={`sr-bar glass-card${searchOpen ? ' sr-bar-open' : ''}`}>
              {searchLoading
                ? <Loader2 size={17} className="sr-icon sr-spin" />
                : <Search size={17} className="sr-icon" />
              }
              <input
                ref={inputRef}
                id="global-search-input"
                type="text"
                placeholder="Search pages, notices, exams…"
                className="search-input sr-input"
                value={query}
                autoComplete="off"
                onChange={(e) => { setQuery(e.target.value); setActiveIdx(-1); }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={handleKeyDown}
                aria-label="Global search"
                aria-expanded={searchOpen}
                aria-autocomplete="list"
              />
              {query && (
                <button
                  className="sr-clear"
                  onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              {!query && <kbd className="sr-kbd">⌘K</kbd>}
            </div>

            {/* ── Dropdown ── */}
            {searchOpen && (
              <div className="sr-dropdown glass" role="listbox" aria-label="Search results">
                {/* header */}
                <div className="sr-drop-head">
                  {query
                    ? <span>{flatResults.length} result{flatResults.length !== 1 ? 's' : ''} for "<strong>{query}</strong>"</span>
                    : <span>Quick navigation</span>
                  }
                  <kbd className="sr-kbd-esc">esc</kbd>
                </div>
                <div className="sr-drop-divider" />

                {flatResults.length === 0 && !searchLoading && (
                  <div className="sr-empty">
                    <Search size={24} />
                    <p>No results found</p>
                    <span>Try a different keyword</span>
                  </div>
                )}

                {searchLoading && query && (
                  <div className="sr-loading-row">
                    <Loader2 size={16} className="sr-spin" />
                    <span>Searching…</span>
                  </div>
                )}

                <ul ref={listRef} className="sr-list">
                  {Object.entries(grouped).map(([kind, items]) => (
                    <React.Fragment key={kind}>
                      <li className="sr-group-label">{KIND_LABEL[kind] ?? kind}</li>
                      {items.map((r) => {
                        const globalIdx = flatResults.indexOf(r);
                        const Icon = r.icon;
                        const isActive = globalIdx === activeIdx;
                        return (
                          <li
                            key={r.id}
                            role="option"
                            aria-selected={isActive}
                            className={`sr-item${isActive ? ' sr-item-active' : ''}`}
                            style={{ '--sr-color': r.color } as React.CSSProperties}
                            onMouseEnter={() => setActiveIdx(globalIdx)}
                            onMouseDown={(e) => { e.preventDefault(); navigate(r.href); }}
                          >
                            <span className="sr-item-icon" style={{ background: `${r.color}18`, color: r.color }}>
                              <Icon size={15} />
                            </span>
                            <span className="sr-item-body">
                              <span className="sr-item-title">{highlight(r.title, query)}</span>
                              {r.subtitle && <span className="sr-item-sub">{r.subtitle}</span>}
                            </span>
                            {isActive && <span className="sr-enter-hint">↵</span>}
                          </li>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </ul>

                <div className="sr-drop-footer">
                  <span><kbd>↑↓</kbd> navigate</span>
                  <span><kbd>↵</kbd> select</span>
                  <span><kbd>esc</kbd> close</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Theme toggle ── */}
          <button
            className="icon-btn glass-card"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle Theme"
          >
            <Sun size={20} className="sun-icon" />
            <Moon size={20} className="moon-icon" />
          </button>

          {/* ── Notification Bell ── */}
          <div className="nb-wrap">
            <button
              ref={bellRef}
              id="notif-bell-btn"
              className={`icon-btn glass-card nb-bell-btn${notifOpen ? ' nb-bell-active' : ''}`}
              aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>

            {notifOpen && (
              <div ref={panelRef} className="nb-panel glass" role="dialog" aria-label="Notifications panel">
                <div className="nb-panel-head">
                  <div className="nb-panel-title">
                    <div className="nb-panel-icon"><Bell size={16} /></div>
                    <span>Notifications</span>
                    {unreadCount > 0 && <span className="nb-unread-chip">{unreadCount} new</span>}
                  </div>
                  <div className="nb-panel-actions">
                    {notifs.length > 0 && unreadCount > 0 && (
                      <button className="nb-action-btn" onClick={markAllRead} title="Mark all read">
                        <CheckCheck size={15} /><span>All read</span>
                      </button>
                    )}
                    <button className="nb-action-btn" onClick={fetchNotifs} title="Refresh" disabled={notifLoading}>
                      <RefreshCw size={14} className={notifLoading ? 'nb-spinning' : ''} />
                    </button>
                    <button className="nb-action-btn nb-close-btn" onClick={() => setNotifOpen(false)} title="Close">
                      <X size={15} />
                    </button>
                  </div>
                </div>
                <div className="nb-divider" />
                <div className="nb-panel-body">
                  {notifLoading && (
                    <div className="nb-center"><div className="nb-loader" /><p>Loading…</p></div>
                  )}
                  {!notifLoading && notifError && (
                    <div className="nb-center nb-error">
                      <AlertTriangle size={28} /><p>{notifError}</p>
                      <button className="nb-retry-btn" onClick={fetchNotifs}>Retry</button>
                    </div>
                  )}
                  {!notifLoading && !notifError && notifs.length === 0 && (
                    <div className="nb-center nb-empty">
                      <div className="nb-empty-icon"><Bell size={28} /></div>
                      <p className="nb-empty-title">All caught up!</p>
                      <p className="nb-empty-sub">No notifications right now.</p>
                    </div>
                  )}
                  {!notifLoading && !notifError && notifs.length > 0 && (
                    <ul className="nb-list">
                      {notifs.map((n, idx) => {
                        const isRead  = n.isRead || n.read || readIds.has(n.id);
                        const color   = notifColor(n.type);
                        const text    = n.message || n.body || '';
                        const date    = n.createdAt || n.created_at;
                        return (
                          <li
                            key={n.id || idx}
                            className={`nb-item${isRead ? ' nb-item-read' : ''}`}
                            style={{ '--notif-color': color } as React.CSSProperties}
                            onClick={() => markRead(n.id)}
                          >
                            <div className="nb-item-icon" style={{ background: `${color}18`, color }}>
                              {notifIcon(n.type)}
                            </div>
                            <div className="nb-item-body">
                              {n.title && <p className="nb-item-title">{n.title}</p>}
                              {text     && <p className="nb-item-text">{text}</p>}
                              <div className="nb-item-meta">
                                {n.type && (
                                  <span className="nb-type-chip" style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
                                    {n.type}
                                  </span>
                                )}
                                <span className="nb-item-time">
                                  <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
                                  {timeAgo(date)}
                                </span>
                              </div>
                            </div>
                            {!isRead && <span className="nb-unread-dot" />}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {notifs.length > 0 && (
                  <div className="nb-panel-footer">
                    {notifs.length} notification{notifs.length !== 1 ? 's' : ''} total
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── User ── */}
          <div className="user-profile glass-card">
            <div className="avatar">A</div>
            <div className="user-info">
              <span className="user-name">Admin</span>
              <span className="user-role">Super Admin</span>
            </div>
          </div>
        </div>
      </header>

      <style>{`
        /* ════ Search ════════════════════════════════════════════════════ */
        .sr-wrap { position: relative; }

        .sr-bar {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0 0.85rem;
          height: 40px;
          border-radius: 20px;
          width: 260px;
          transition: width 0.25s ease, box-shadow 0.2s;
          border: 1px solid transparent;
        }
        .sr-bar-open {
          width: 320px;
          border-color: rgba(99,102,241,0.35);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
        .sr-icon { color: var(--muted-foreground); flex-shrink: 0; }
        .sr-input {
          border: none;
          background: transparent;
          outline: none;
          color: var(--foreground);
          width: 100%;
          font-size: 0.875rem;
        }
        .sr-input::placeholder { color: var(--muted-foreground); }
        .sr-clear {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted-foreground);
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 4px;
          flex-shrink: 0;
          transition: color 0.15s;
        }
        .sr-clear:hover { color: var(--foreground); }
        .sr-kbd {
          font-size: 0.6rem;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          background: var(--muted);
          color: var(--muted-foreground);
          border: 1px solid var(--border);
          flex-shrink: 0;
          font-family: inherit;
          letter-spacing: 0.03em;
        }
        @keyframes sr-spin { to { transform: rotate(360deg); } }
        .sr-spin { animation: sr-spin 0.7s linear infinite; }

        /* Dropdown */
        .sr-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          width: 440px;
          max-height: 480px;
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 9998;
          animation: nb-slide-in 0.18s cubic-bezier(0.22,1,0.36,1);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: var(--card);
        }
        .sr-drop-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 1rem;
          font-size: 0.75rem;
          color: var(--muted-foreground);
        }
        .sr-drop-head strong { color: var(--foreground); }
        .sr-kbd-esc {
          font-size: 0.6rem;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          background: var(--muted);
          color: var(--muted-foreground);
          border: 1px solid var(--border);
          font-family: inherit;
        }
        .sr-drop-divider { height: 1px; background: var(--border); opacity: 0.4; }

        .sr-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          gap: 0.4rem;
          color: var(--muted-foreground);
          text-align: center;
        }
        .sr-empty p { font-weight: 600; color: var(--foreground); font-size: 0.88rem; margin: 0; }
        .sr-empty span { font-size: 0.78rem; }

        .sr-loading-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          font-size: 0.82rem;
          color: var(--muted-foreground);
        }

        .sr-list {
          list-style: none;
          margin: 0;
          padding: 0.3rem 0;
          overflow-y: auto;
          flex: 1;
        }
        .sr-list::-webkit-scrollbar { width: 4px; }
        .sr-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .sr-group-label {
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted-foreground);
          padding: 0.5rem 1rem 0.25rem;
        }

        .sr-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.55rem 1rem;
          cursor: pointer;
          border-radius: 0;
          transition: background 0.12s;
          position: relative;
        }
        .sr-item:hover, .sr-item-active {
          background: var(--muted);
        }
        .sr-item-active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 10%;
          height: 80%;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: var(--sr-color, var(--primary));
        }
        .sr-item-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sr-item-body {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          flex: 1;
          min-width: 0;
        }
        .sr-item-title {
          font-size: 0.84rem;
          font-weight: 600;
          color: var(--foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sr-item-title mark {
          background: rgba(99,102,241,0.2);
          color: #6366f1;
          border-radius: 2px;
          padding: 0 1px;
          font-style: normal;
        }
        .sr-item-sub {
          font-size: 0.73rem;
          color: var(--muted-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sr-enter-hint {
          font-size: 0.7rem;
          color: var(--muted-foreground);
          background: var(--muted);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 0.1rem 0.3rem;
          flex-shrink: 0;
        }

        .sr-drop-footer {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem 1rem;
          border-top: 1px solid var(--border);
          font-size: 0.68rem;
          color: var(--muted-foreground);
        }
        .sr-drop-footer kbd {
          font-size: 0.6rem;
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
          background: var(--muted);
          border: 1px solid var(--border);
          font-family: inherit;
          margin-right: 2px;
        }

        @media (max-width: 640px) {
          .sr-bar { width: 180px; }
          .sr-bar-open { width: 220px; }
          .sr-dropdown { width: calc(100vw - 24px); left: auto; right: 0; transform: none; }
        }

        /* ════ Notification panel ════════════════════════════════════════ */
        .nb-wrap { position: relative; }
        .nb-bell-btn { position: relative; transition: all 0.2s; }
        .nb-bell-active {
          color: var(--primary) !important;
          background: rgba(99,102,241,0.1) !important;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2) !important;
        }
        .nb-panel {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 380px;
          max-height: 520px;
          border-radius: 1.1rem;
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 9999;
          animation: nb-slide-in 0.22s cubic-bezier(0.22,1,0.36,1);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: var(--card);
        }
        @keyframes nb-slide-in {
          from { opacity:0; transform: translateY(-10px) scale(0.97); }
          to   { opacity:1; transform: translateY(0)     scale(1);    }
        }
        .nb-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.1rem 0.75rem;
          gap: 0.5rem;
        }
        .nb-panel-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--foreground);
        }
        .nb-panel-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(99,102,241,0.12); color: #6366f1;
          display: flex; align-items: center; justify-content: center;
        }
        .nb-unread-chip {
          font-size: 0.62rem; font-weight: 700;
          padding: 0.15rem 0.5rem; border-radius: 999px;
          background: #ef44441a; color: #ef4444;
          border: 1px solid #ef444430; letter-spacing: 0.04em;
        }
        .nb-panel-actions { display: flex; align-items: center; gap: 0.2rem; }
        .nb-action-btn {
          display: flex; align-items: center; gap: 0.3rem;
          padding: 0.3rem 0.55rem; border-radius: 8px; border: none;
          background: transparent; color: var(--muted-foreground);
          cursor: pointer; font-size: 0.75rem; font-weight: 500; transition: all 0.15s;
        }
        .nb-action-btn:hover:not(:disabled) { background: var(--muted); color: var(--foreground); }
        .nb-action-btn:disabled { opacity: 0.5; cursor: default; }
        .nb-close-btn:hover { background: rgba(239,68,68,0.1) !important; color: #ef4444 !important; }
        @keyframes nb-spin { to { transform: rotate(360deg); } }
        .nb-spinning { animation: nb-spin 0.8s linear infinite; }
        .nb-divider { height: 1px; background: var(--border); opacity: 0.5; }
        .nb-panel-body { flex: 1; overflow-y: auto; overflow-x: hidden; }
        .nb-panel-body::-webkit-scrollbar { width: 4px; }
        .nb-panel-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        .nb-center {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 2.5rem 1rem; gap: 0.6rem;
          color: var(--muted-foreground); text-align: center; font-size: 0.85rem;
        }
        .nb-error { color: #ef4444; }
        .nb-retry-btn {
          margin-top: 0.4rem; padding: 0.4rem 1rem; border-radius: 8px;
          border: 1px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.08);
          color: #ef4444; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.15s;
        }
        .nb-retry-btn:hover { background: rgba(239,68,68,0.15); }
        .nb-loader {
          width: 28px; height: 28px; border: 3px solid var(--border);
          border-top-color: var(--primary); border-radius: 50%;
          animation: nb-spin 0.8s linear infinite;
        }
        .nb-empty-icon {
          width: 52px; height: 52px; border-radius: 50%; background: var(--muted);
          display: flex; align-items: center; justify-content: center;
          color: var(--muted-foreground); margin-bottom: 0.25rem;
        }
        .nb-empty-title { font-weight: 700; color: var(--foreground); font-size: 0.9rem; }
        .nb-empty-sub { font-size: 0.8rem; }
        .nb-list { list-style: none; padding: 0.4rem 0; margin: 0; }
        .nb-item {
          display: flex; align-items: flex-start; gap: 0.7rem;
          padding: 0.75rem 1.1rem; cursor: pointer;
          transition: background 0.15s; position: relative;
          border-bottom: 1px solid var(--border); opacity: 1;
        }
        .nb-item:last-child { border-bottom: none; }
        .nb-item:hover { background: var(--muted); }
        .nb-item-read { opacity: 0.6; }
        .nb-item-icon {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px;
        }
        .nb-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
        .nb-item-title {
          font-size: 0.83rem; font-weight: 700; color: var(--foreground);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0;
        }
        .nb-item-text {
          font-size: 0.78rem; color: var(--muted-foreground); line-height: 1.4;
          overflow: hidden; display: -webkit-box;
          -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin: 0;
        }
        .nb-item-meta {
          display: flex; align-items: center; gap: 0.4rem;
          margin-top: 0.15rem; flex-wrap: wrap;
        }
        .nb-type-chip {
          font-size: 0.58rem; font-weight: 700;
          padding: 0.1rem 0.45rem; border-radius: 4px;
          letter-spacing: 0.06em; text-transform: uppercase;
        }
        .nb-item-time { font-size: 0.72rem; color: var(--muted-foreground); }
        .nb-unread-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--notif-color, #6366f1); flex-shrink: 0; margin-top: 4px;
          box-shadow: 0 0 6px var(--notif-color, #6366f1);
        }
        .nb-panel-footer {
          padding: 0.6rem 1.1rem; border-top: 1px solid var(--border);
          font-size: 0.72rem; color: var(--muted-foreground); text-align: center;
        }
        @media (max-width: 480px) {
          .nb-panel { width: calc(100vw - 24px); right: -8px; }
        }
      `}</style>
    </>
  );
}

// ─── Highlight helper ─────────────────────────────────────────────────────────
function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part
  );
}
