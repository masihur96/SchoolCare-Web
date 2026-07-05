'use client';

import React, { useEffect, useState } from 'react';
import {
  Users, GraduationCap, BookOpen, Bell, ClipboardList,
  TrendingUp, TrendingDown, Calendar, Clock, ChevronRight,
  AlertCircle, CheckCircle2, XCircle, Activity, Award,
  FileText, Megaphone, BookMarked, Loader2, Plus, X, Radio
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MarqueeItem {
  id: string;
  text: string;
  type: string;
  schoolId?: string;
  createdAt?: string;
}

interface AttendanceInfo {
  date: string;
  totalTeachers?: number;
  totalStudents?: number;
  present: number;
  absent: number;
  leave?: number;
  recorded?: number;
  attendanceRate: number;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  targetAudience: string;
  isImportent: boolean;
  postedBy: string;
  createdAt: string;
}

interface Homework {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classInfo?: { name: string };
  subjectInfo?: { name: string };
  sectionInfo?: { name: string };
}

interface ExamAssignment {
  id: string;
  class: { name: string };
  subject: { name: string };
  examiner: { name: string };
  date: string;
  syllabus: string;
}

interface Exam {
  id: string;
  exam_name: string;
  description: string;
  start_date: string;
  end_date: string;
  isPublished: boolean;
  status: string;
  assignments: ExamAssignment[];
}

interface DashboardData {
  attendTeacher: AttendanceInfo;
  attendStudent: AttendanceInfo;
  recentNotice: Notice[];
  recentHomework: Homework[];
  currentExam: Exam[];
  superAdminInfo?: {
    name: string;
    email: string;
    role: string;
  };
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId: string;
  phone: string;
  avatar: string | null;
  designation: string | null;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  gradient: string;
  sub?: string;
  trend?: number;
  delay?: number;
}

function StatCard({ label, value, icon: Icon, color, gradient, sub, trend, delay = 0 }: StatCardProps) {
  return (
    <div
      className="db-stat-card glass-card animate-fade-in"
      style={{ animationDelay: `${delay}ms`, '--card-color': color } as React.CSSProperties}
    >
      <div className="db-stat-icon-wrap" style={{ background: gradient }}>
        <Icon size={22} color="#fff" strokeWidth={2} />
      </div>
      <div className="db-stat-body">
        <p className="db-stat-label">{label}</p>
        <p className="db-stat-value">{value}</p>
        {sub && <p className="db-stat-sub">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`db-stat-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
          {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  );
}

interface AttendanceRingProps {
  rate: number;
  present: number;
  absent: number;
  total: number;
  label: string;
  color: string;
}

function AttendanceRing({ rate, present, absent, total, label, color }: AttendanceRingProps) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (rate / 100) * circ;

  return (
    <div className="db-att-ring-card glass-card">
      <div className="db-att-ring-chart">
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle
            cx="45" cy="45" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 45 45)"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="db-att-ring-center">
          <span className="db-att-ring-pct" style={{ color }}>{rate}%</span>
        </div>
      </div>
      <div className="db-att-ring-info">
        <p className="db-att-ring-label">{label}</p>
        <div className="db-att-ring-stats">
          <span className="db-att-pill present"><CheckCircle2 size={12} /> {present} Present</span>
          <span className="db-att-pill absent"><XCircle size={12} /> {absent} Absent</span>
          <span className="db-att-pill total"><Activity size={12} /> {total} Total</span>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="db-page skeleton-page">
      {/* ── Header ── */}
      <div className="db-header">
        <div style={{ flex: 1 }}>
          <div className="shimmer shimmer-text title"></div>
          <div className="shimmer shimmer-text short" style={{ width: '150px' }}></div>
        </div>
        <div className="shimmer shimmer-block" style={{ width: '100px', height: '32px', borderRadius: '999px' }}></div>
      </div>

      {/* ── Marquee Banner ── */}
      <div className="shimmer shimmer-block" style={{ height: '44px', borderRadius: '22px' }}></div>

      {/* ── Stat Cards ── */}
      <div className="db-stats-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="db-stat-card glass-card">
            <div className="shimmer shimmer-circle" style={{ width: '52px', height: '52px', flexShrink: 0 }}></div>
            <div className="db-stat-body" style={{ flex: 1 }}>
              <div className="shimmer shimmer-text short"></div>
              <div className="shimmer shimmer-text title" style={{ marginBottom: '4px', height: '28px', width: '50%' }}></div>
              <div className="shimmer shimmer-text" style={{ width: '70%', margin: 0 }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Attendance Section ── */}
      <div className="db-section-header">
        <div className="shimmer shimmer-text title" style={{ width: '250px', margin: 0 }}></div>
      </div>
      <div className="db-att-grid">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="db-att-ring-card glass-card">
            <div className="shimmer shimmer-circle" style={{ width: '90px', height: '90px', flexShrink: 0 }}></div>
            <div className="db-att-ring-info" style={{ flex: 1, paddingLeft: '1rem' }}>
              <div className="shimmer shimmer-text short" style={{ width: '120px', marginBottom: '1rem' }}></div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="shimmer shimmer-block" style={{ height: '24px', width: '80px', borderRadius: '12px' }}></div>
                <div className="shimmer shimmer-block" style={{ height: '24px', width: '80px', borderRadius: '12px' }}></div>
                <div className="shimmer shimmer-block" style={{ height: '24px', width: '80px', borderRadius: '12px' }}></div>
              </div>
            </div>
          </div>
        ))}
        <div className="db-att-breakdown glass-card">
          <div className="shimmer shimmer-text short" style={{ marginBottom: '1.5rem', width: '150px' }}></div>
          {Array.from({ length: 4 }).map((_, i) => (
             <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
               <div className="shimmer shimmer-text" style={{ width: '80px', margin: 0 }}></div>
               <div className="shimmer shimmer-block" style={{ height: '8px', flex: 1 }}></div>
               <div className="shimmer shimmer-text" style={{ width: '40px', margin: 0 }}></div>
             </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Grid ── */}
      <div className="db-bottom-grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="db-widget glass-card">
            <div className="db-widget-head" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="shimmer shimmer-circle" style={{ width: '32px', height: '32px', flexShrink: 0 }}></div>
              <div className="shimmer shimmer-text short" style={{ margin: 0, height: '20px', width: '150px' }}></div>
            </div>
            <div className="db-widget-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="shimmer shimmer-circle" style={{ width: '40px', height: '40px', flexShrink: 0 }}></div>
                  <div style={{ flex: 1 }}>
                     <div className="shimmer shimmer-text" style={{ width: '80%' }}></div>
                     <div className="shimmer shimmer-text short" style={{ margin: 0 }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Marquee state ──
  const [marqueeItems, setMarqueeItems] = useState<MarqueeItem[]>([]);
  const [showMarqueeModal, setShowMarqueeModal] = useState(false);
  const [marqueeForm, setMarqueeForm] = useState({ text: '', type: 'STUDENT' });
  const [marqueeSubmitting, setMarqueeSubmitting] = useState(false);
  const [marqueeError, setMarqueeError] = useState('');
  const [marqueeSuccess, setMarqueeSuccess] = useState(false);

  // ── User profile state ──
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  async function fetchProfile(): Promise<UserProfile | null> {
    try {
      const res = await fetch(
        'https://smart-school-backend-production.up.railway.app/auth/profile',
        { headers: { Authorization: `Bearer ${getToken()}`, Accept: '*/*' } }
      );
      if (!res.ok) return null;
      const json = await res.json();
      const profile: UserProfile = json.data;
      setUserProfile(profile);
      return profile;
    } catch {
      return null;
    }
  }

  async function fetchMarquee(schoolId: string) {
    if (!schoolId) return;
    try {
      const res = await fetch(
        `https://smart-school-backend-production.up.railway.app/general/marquee/${schoolId}`,
        { headers: { Authorization: `Bearer ${getToken()}`, Accept: '*/*' } }
      );
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.data)) setMarqueeItems(json.data);
    } catch { /* silent */ }
  }

  async function handleCreateMarquee(e: React.FormEvent) {
    e.preventDefault();
    if (!marqueeForm.text.trim()) return;
    setMarqueeSubmitting(true);
    setMarqueeError('');
    setMarqueeSuccess(false);
    try {
      const res = await fetch(
        'https://smart-school-backend-production.up.railway.app/general/marquee',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            Accept: '*/*',
          },
          body: JSON.stringify({
            text: marqueeForm.text,
            type: marqueeForm.type,
            schoolId: userProfile?.schoolId || '',
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
      setMarqueeSuccess(true);
      setMarqueeForm({ text: '', type: 'STUDENT' });
      const profile = userProfile || await fetchProfile();
      if (profile) await fetchMarquee(profile.schoolId);
      setTimeout(() => { setShowMarqueeModal(false); setMarqueeSuccess(false); }, 1500);
    } catch (err: unknown) {
      setMarqueeError(err instanceof Error ? err.message : 'Failed to create marquee');
    } finally {
      setMarqueeSubmitting(false);
    }
  }

  useEffect(() => {
    async function init() {
      // Fetch profile first to get real schoolId, then fetch marquee
      const profile = await fetchProfile();
      if (profile?.schoolId) {
        fetchMarquee(profile.schoolId);
      }

      // Fetch dashboard data in parallel
      try {
        const res = await fetch(
          'https://smart-school-backend-production.up.railway.app/dashboard/admin',
          { headers: { Authorization: `Bearer ${getToken()}`, Accept: '*/*' } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json.data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);



  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="db-error glass-card">
        <AlertCircle size={32} color="var(--destructive)" />
        <p>Could not load dashboard data: {error}</p>
      </div>
    );
  }

  const { attendTeacher, attendStudent, recentNotice, recentHomework, currentExam } = data;
  const today = new Date(attendTeacher.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="db-page">

      {/* ── Header ── */}
      <div className="db-header animate-fade-in">
        <div>
          <h1 className="db-title">Dashboard Overview</h1>
          <p className="db-subtitle">
            <Calendar size={14} />
            <span>{today}</span>
          </p>
        </div>
        <div className="db-header-badge glass">
          <Activity size={16} color="var(--success)" />
          <span>Live Data</span>
        </div>
      </div>

      {/* ── Marquee Banner ── */}
      <div className="db-marquee-banner animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="db-marquee-left">
          <span className="db-marquee-icon-wrap">
            <Radio size={14} />
          </span>
          <span className="db-marquee-live">LIVE</span>
        </div>
        <div className="db-marquee-track">
          {marqueeItems.length > 0 ? (
            <div className="db-marquee-scroll-wrap">
              <div
                className="db-marquee-scroll-inner"
                style={{ '--item-count': marqueeItems.length } as React.CSSProperties}
              >
                {/* Duplicate items for seamless loop */}
                {[...marqueeItems, ...marqueeItems].map((item, idx) => (
                  <span key={idx} className="db-marquee-item">
                    <span className={`db-marquee-type-badge type-${item.type?.toLowerCase()}`}>
                      {item.type}
                    </span>
                    <span className="db-marquee-item-text">{item.text}</span>
                    <span className="db-marquee-separator">✦</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="db-marquee-scroll-wrap">
              <span className="db-marquee-empty">📢 No announcements yet — add one using the button!</span>
            </div>
          )}
        </div>
        <button
          id="add-marquee-btn"
          className="db-marquee-add-btn"
          onClick={() => { setShowMarqueeModal(true); setMarqueeError(''); setMarqueeSuccess(false); }}
          title="Add new marquee announcement"
        >
          <Plus size={14} />
          <span>Add</span>
        </button>
      </div>

      {/* ── Add Marquee Modal ── */}
      {showMarqueeModal && (
        <div className="modal-overlay" onClick={() => setShowMarqueeModal(false)}>
          <div className="db-marquee-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="db-marquee-modal-head">
              <div className="db-marquee-modal-icon">
                <Megaphone size={18} />
              </div>
              <div>
                <h3>New Announcement</h3>
                <p>Add a scrolling marquee message</p>
              </div>
              <button
                className="db-marquee-modal-close"
                onClick={() => setShowMarqueeModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMarquee} className="db-marquee-form">
              <div className="db-mf-group">
                <label htmlFor="mq-text">Announcement Text <span>*</span></label>
                <textarea
                  id="mq-text"
                  className="db-mf-textarea"
                  placeholder="e.g. Final exams start next Monday. All students must be present."
                  rows={3}
                  value={marqueeForm.text}
                  onChange={(e) => setMarqueeForm(f => ({ ...f, text: e.target.value }))}
                  required
                />
              </div>

              <div className="db-mf-group">
                <label htmlFor="mq-type">Audience Type <span>*</span></label>
                <select
                  id="mq-type"
                  className="db-mf-select"
                  value={marqueeForm.type}
                  onChange={(e) => setMarqueeForm(f => ({ ...f, type: e.target.value }))}
                >
                  <option value="STUDENT">Students</option>
                  <option value="TEACHER">Teachers</option>
                  <option value="PARENT">Parents</option>
                  <option value="ALL">Everyone</option>
                </select>
              </div>

              {marqueeError && (
                <div className="db-mf-error">
                  <AlertCircle size={14} /> {marqueeError}
                </div>
              )}
              {marqueeSuccess && (
                <div className="db-mf-success">
                  <CheckCircle2 size={14} /> Marquee created successfully!
                </div>
              )}

              <div className="db-mf-actions">
                <button
                  type="button"
                  className="btn db-mf-cancel"
                  onClick={() => setShowMarqueeModal(false)}
                  disabled={marqueeSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary db-mf-submit"
                  disabled={marqueeSubmitting || !marqueeForm.text.trim()}
                >
                  {marqueeSubmitting ? <Loader2 size={15} className="db-spinner" /> : <Megaphone size={15} />}
                  {marqueeSubmitting ? 'Publishing…' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="db-stats-grid">
        <StatCard
          label="Total Students"
          value={attendStudent.totalStudents ?? 0}
          icon={Users}
          color="#6366f1"
          gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
          sub="Enrolled this session"
          trend={12}
          delay={0}
        />
        <StatCard
          label="Total Teachers"
          value={attendTeacher.totalTeachers ?? 0}
          icon={GraduationCap}
          color="#10b981"
          gradient="linear-gradient(135deg, #10b981, #059669)"
          sub="Active faculty members"
          trend={2}
          delay={80}
        />
        <StatCard
          label="Recent Notices"
          value={recentNotice.length}
          icon={Megaphone}
          color="#f59e0b"
          gradient="linear-gradient(135deg, #f59e0b, #d97706)"
          sub="Posted this week"
          delay={160}
        />
        <StatCard
          label="Upcoming Exams"
          value={currentExam.length}
          icon={Award}
          color="#ec4899"
          gradient="linear-gradient(135deg, #ec4899, #db2777)"
          sub="Scheduled exams"
          delay={240}
        />
        <StatCard
          label="Recent Homework"
          value={recentHomework.length}
          icon={BookOpen}
          color="#8b5cf6"
          gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
          sub="Assigned this week"
          delay={320}
        />
        <StatCard
          label="Student Attendance"
          value={`${attendStudent.attendanceRate}%`}
          icon={CheckCircle2}
          color="#06b6d4"
          gradient="linear-gradient(135deg, #06b6d4, #0891b2)"
          sub="Today's rate"
          trend={attendStudent.attendanceRate}
          delay={400}
        />
      </div>

      {/* ── Attendance Section ── */}
      <div className="db-section-header animate-fade-in" style={{ animationDelay: '400ms' }}>
        <h2><Activity size={18} /> Today's Attendance</h2>
      </div>
      <div className="db-att-grid animate-fade-in" style={{ animationDelay: '450ms' }}>
        <AttendanceRing
          rate={attendStudent.attendanceRate}
          present={attendStudent.present}
          absent={attendStudent.absent}
          total={attendStudent.totalStudents ?? 0}
          label="Student Attendance"
          color="#6366f1"
        />
        <AttendanceRing
          rate={attendTeacher.attendanceRate}
          present={attendTeacher.present}
          absent={attendTeacher.absent}
          total={attendTeacher.totalTeachers ?? 0}
          label="Teacher Attendance"
          color="#10b981"
        />

        {/* Attendance breakdown bars */}
        <div className="db-att-breakdown glass-card">
          <h4 className="db-att-breakdown-title">Student Breakdown</h4>
          {[
            { label: 'Present', val: attendStudent.present, total: attendStudent.totalStudents ?? 1, color: '#10b981' },
            { label: 'Absent', val: attendStudent.absent, total: attendStudent.totalStudents ?? 1, color: '#ef4444' },
            { label: 'Leave', val: attendStudent.leave ?? 0, total: attendStudent.totalStudents ?? 1, color: '#f59e0b' },
            { label: 'Not Recorded', val: (attendStudent.totalStudents ?? 0) - (attendStudent.recorded ?? 0), total: attendStudent.totalStudents ?? 1, color: '#6366f1' },
          ].map(({ label, val, total, color }) => (
            <div key={label} className="db-bar-row">
              <span className="db-bar-label">{label}</span>
              <div className="db-bar-track">
                <div
                  className="db-bar-fill"
                  style={{
                    width: `${Math.min(100, (val / total) * 100)}%`,
                    background: color,
                  }}
                />
              </div>
              <span className="db-bar-val">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Grid (Notices | Homework | Exams) ── */}
      <div className="db-bottom-grid animate-fade-in" style={{ animationDelay: '500ms' }}>

        {/* Recent Notices */}
        <div className="db-widget glass-card">
          <div className="db-widget-head">
            <span className="db-widget-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <Bell size={16} />
            </span>
            <h3>Recent Notices</h3>
            <span className="db-widget-count">{recentNotice.length}</span>
          </div>
          <div className="db-widget-body">
            {recentNotice.length === 0 ? (
              <p className="db-empty">No notices yet</p>
            ) : (
              recentNotice.map((n) => (
                <div key={n.id} className="db-notice-item">
                  <div className="db-notice-dot" style={{ background: n.isImportent ? '#ef4444' : '#6366f1' }} />
                  <div className="db-notice-content">
                    <p className="db-notice-title">{n.title}</p>
                    <p className="db-notice-meta">
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                        {n.targetAudience}
                      </span>
                      {n.isImportent && (
                        <span className="badge badge-destructive" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                          Important
                        </span>
                      )}
                      <span className="db-notice-time">
                        <Clock size={11} /> {timeAgo(n.createdAt)}
                      </span>
                    </p>
                  </div>
                  <ChevronRight size={14} className="db-item-arrow" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Homework */}
        <div className="db-widget glass-card">
          <div className="db-widget-head">
            <span className="db-widget-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
              <ClipboardList size={16} />
            </span>
            <h3>Recent Homework</h3>
            <span className="db-widget-count">{recentHomework.length}</span>
          </div>
          <div className="db-widget-body">
            {recentHomework.length === 0 ? (
              <p className="db-empty">No homework assigned</p>
            ) : (
              recentHomework.map((hw) => (
                <div key={hw.id} className="db-hw-item">
                  <div className="db-hw-icon">
                    <BookMarked size={14} color="#8b5cf6" />
                  </div>
                  <div className="db-hw-content">
                    <p className="db-hw-title">{hw.title}</p>
                    <p className="db-hw-meta">
                      {hw.classInfo?.name && <span>{hw.classInfo.name}</span>}
                      {hw.subjectInfo?.name && <span>• {hw.subjectInfo.name}</span>}
                      {hw.sectionInfo?.name && <span>• {hw.sectionInfo.name}</span>}
                    </p>
                    <p className="db-hw-due">
                      <Calendar size={11} />
                      Due: {formatDate(hw.dueDate)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Current Exams */}
        <div className="db-widget glass-card">
          <div className="db-widget-head">
            <span className="db-widget-icon" style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899' }}>
              <FileText size={16} />
            </span>
            <h3>Upcoming Exams</h3>
            <span className="db-widget-count">{currentExam.length}</span>
          </div>
          <div className="db-widget-body">
            {currentExam.length === 0 ? (
              <p className="db-empty">No upcoming exams</p>
            ) : (
              currentExam.map((exam) => (
                <div key={exam.id} className="db-exam-item">
                  <div className="db-exam-header">
                    <p className="db-exam-name">{exam.exam_name}</p>
                    <span className={`badge ${exam.isPublished ? 'badge-success' : 'badge-warning'}`}>
                      {exam.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="db-exam-dates">
                    <Calendar size={12} />
                    {formatDate(exam.start_date)} → {formatDate(exam.end_date)}
                  </p>
                  {exam.description && (
                    <p className="db-exam-desc">{exam.description}</p>
                  )}
                  <p className="db-exam-slots">
                    <BookOpen size={12} /> {exam.assignments.length} subject{exam.assignments.length !== 1 ? 's' : ''} assigned
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        /* ── Page Shell ── */
        .db-page {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          padding-bottom: 2rem;
        }

        /* ── Loading / Error ── */
        .db-loading, .db-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          min-height: 60vh;
          color: var(--muted-foreground);
        }
        .db-spinner {
          animation: spin 1s linear infinite;
          color: var(--primary);
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Header ── */
        .db-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }
        .db-title {
          font-size: 1.75rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--foreground) 0%, var(--muted-foreground) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.35rem;
        }
        .db-subtitle {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--muted-foreground);
          font-size: 0.85rem;
        }
        .db-header-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 1rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--success);
          white-space: nowrap;
          border: 1px solid rgba(16,185,129,0.25);
        }

        /* ── Stat Cards Grid ── */
        .db-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }
        @media (max-width: 1100px) { .db-stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px)  { .db-stats-grid { grid-template-columns: 1fr; } }

        .db-stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.35rem 1.5rem;
          border-radius: 1.1rem;
          background: var(--card);
          border: 1px solid var(--border);
          box-shadow: 0 2px 16px rgba(0,0,0,0.06);
          transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s;
          position: relative;
          overflow: hidden;
        }
        .db-stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--card-color, var(--primary));
          border-radius: 3px 3px 0 0;
        }
        .db-stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.12);
        }
        .db-stat-icon-wrap {
          width: 52px; height: 52px;
          border-radius: 0.9rem;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .db-stat-body { flex: 1; min-width: 0; }
        .db-stat-label {
          font-size: 0.78rem;
          color: var(--muted-foreground);
          font-weight: 500;
          margin-bottom: 0.2rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .db-stat-value {
          font-size: 1.65rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 0.2rem;
        }
        .db-stat-sub {
          font-size: 0.73rem;
          color: var(--muted-foreground);
        }
        .db-stat-trend {
          display: flex; align-items: center; gap: 3px;
          font-size: 0.75rem; font-weight: 700;
          padding: 0.25rem 0.5rem;
          border-radius: 999px;
        }
        .db-stat-trend.positive { background: rgba(16,185,129,0.1); color: #10b981; }
        .db-stat-trend.negative { background: rgba(239,68,68,0.1); color: #ef4444; }

        /* ── Section Header ── */
        .db-section-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .db-section-header h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--foreground);
        }

        /* ── Attendance Grid ── */
        .db-att-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1.25rem;
        }
        @media (max-width: 1000px) { .db-att-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 640px)  { .db-att-grid { grid-template-columns: 1fr; } }

        .db-att-ring-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          border-radius: 1.1rem;
          background: var(--card);
          border: 1px solid var(--border);
        }
        .db-att-ring-chart {
          position: relative;
          flex-shrink: 0;
        }
        .db-att-ring-center {
          position: absolute;
          inset: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .db-att-ring-pct {
          font-size: 0.9rem;
          font-weight: 800;
        }
        .db-att-ring-info { flex: 1; min-width: 0; }
        .db-att-ring-label {
          font-size: 0.85rem;
          font-weight: 700;
          margin-bottom: 0.6rem;
        }
        .db-att-ring-stats {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .db-att-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 500;
          color: var(--muted-foreground);
        }
        .db-att-pill.present { color: #10b981; }
        .db-att-pill.absent  { color: #ef4444; }

        .db-att-breakdown {
          padding: 1.5rem;
          border-radius: 1.1rem;
          background: var(--card);
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .db-att-breakdown-title {
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        .db-bar-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .db-bar-label {
          font-size: 0.75rem;
          color: var(--muted-foreground);
          width: 80px;
          flex-shrink: 0;
        }
        .db-bar-track {
          flex: 1;
          height: 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
          overflow: hidden;
        }
        .db-bar-fill {
          height: 100%;
          border-radius: 999px;
          min-width: 4px;
          transition: width 1s ease;
        }
        .db-bar-val {
          font-size: 0.78rem;
          font-weight: 700;
          width: 24px;
          text-align: right;
          color: var(--foreground);
        }

        /* ── Bottom Grid ── */
        .db-bottom-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
          align-items: start;
        }
        @media (max-width: 1100px) { .db-bottom-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 700px)  { .db-bottom-grid { grid-template-columns: 1fr; } }

        /* ── Widget ── */
        .db-widget {
          border-radius: 1.1rem;
          background: var(--card);
          border: 1px solid var(--border);
          overflow: hidden;
        }
        .db-widget-head {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 1.1rem 1.25rem;
          border-bottom: 1px solid var(--border);
        }
        .db-widget-head h3 {
          font-size: 0.95rem;
          font-weight: 700;
          flex: 1;
        }
        .db-widget-icon {
          width: 30px; height: 30px;
          border-radius: 0.6rem;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .db-widget-count {
          font-size: 0.75rem;
          font-weight: 700;
          background: var(--muted);
          color: var(--muted-foreground);
          padding: 0.15rem 0.6rem;
          border-radius: 999px;
        }
        .db-widget-body {
          padding: 0.5rem 0;
          max-height: 340px;
          overflow-y: auto;
        }
        .db-empty {
          padding: 2rem;
          text-align: center;
          color: var(--muted-foreground);
          font-size: 0.85rem;
        }

        /* ── Notice Items ── */
        .db-notice-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
          cursor: pointer;
        }
        .db-notice-item:last-child { border-bottom: none; }
        .db-notice-item:hover { background: rgba(255,255,255,0.03); }
        .db-notice-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 5px;
        }
        .db-notice-content { flex: 1; min-width: 0; }
        .db-notice-title {
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.4rem;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .db-notice-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.35rem;
        }
        .db-notice-time {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 0.7rem;
          color: var(--muted-foreground);
          margin-left: auto;
        }
        .db-item-arrow { color: var(--muted-foreground); flex-shrink: 0; margin-top: 2px; }

        /* ── Homework Items ── */
        .db-hw-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .db-hw-item:last-child { border-bottom: none; }
        .db-hw-item:hover { background: rgba(255,255,255,0.03); }
        .db-hw-icon {
          width: 30px; height: 30px;
          border-radius: 0.6rem;
          background: rgba(139,92,246,0.1);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .db-hw-content { flex: 1; min-width: 0; }
        .db-hw-title {
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .db-hw-meta {
          font-size: 0.72rem;
          color: var(--muted-foreground);
          margin-bottom: 0.2rem;
        }
        .db-hw-due {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 0.7rem;
          color: var(--warning);
          font-weight: 500;
        }

        /* ── Exam Items ── */
        .db-exam-item {
          padding: 0.9rem 1.25rem;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .db-exam-item:last-child { border-bottom: none; }
        .db-exam-item:hover { background: rgba(255,255,255,0.03); }
        .db-exam-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.35rem;
        }
        .db-exam-name {
          font-size: 0.88rem;
          font-weight: 700;
          text-transform: capitalize;
        }
        .db-exam-dates {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.73rem;
          color: var(--muted-foreground);
          margin-bottom: 0.25rem;
        }
        .db-exam-desc {
          font-size: 0.73rem;
          color: var(--muted-foreground);
          margin-bottom: 0.3rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .db-exam-slots {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          color: #ec4899;
          font-weight: 500;
        }

        /* ── Marquee Banner ── */
        .db-marquee-banner {
          display: flex;
          align-items: center;
          gap: 0;
          border-radius: 0.9rem;
          border: 1px solid rgba(245,158,11,0.25);
          background: linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(251,191,36,0.04) 100%);
          overflow: hidden;
          height: 42px;
          box-shadow: 0 2px 12px rgba(245,158,11,0.08);
        }
        .db-marquee-left {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0 1rem;
          border-right: 1px solid rgba(245,158,11,0.2);
          height: 100%;
          background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.08));
          flex-shrink: 0;
        }
        .db-marquee-icon-wrap {
          color: #f59e0b;
          display: flex;
          align-items: center;
          animation: pulse-glow 2s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .db-marquee-live {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #f59e0b;
          background: rgba(245,158,11,0.15);
          padding: 0.1rem 0.45rem;
          border-radius: 4px;
          border: 1px solid rgba(245,158,11,0.3);
        }
        .db-marquee-track {
          flex: 1;
          overflow: hidden;
          height: 100%;
          position: relative;
          display: flex;
          align-items: center;
        }
        /* ── Horizontal scroll ticker ── */
        .db-marquee-scroll-wrap {
          width: 100%;
          overflow: hidden;
          height: 100%;
          display: flex;
          align-items: center;
          /* fade edges */
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%);
        }
        .db-marquee-scroll-inner {
          display: flex;
          align-items: center;
          white-space: nowrap;
          /* speed: 8s per item; total = items * 8s (only half used → loop seamless) */
          animation: marquee-scroll calc(var(--item-count, 1) * 30s) linear infinite;
          will-change: transform;
        }
        .db-marquee-scroll-inner:hover {
          animation-play-state: paused;
        }
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .db-marquee-item {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0 1.5rem;
          flex-shrink: 0;
        }
        .db-marquee-item-text {
          font-size: 0.84rem;
          font-weight: 500;
          color: var(--foreground);
          white-space: nowrap;
        }
        .db-marquee-separator {
          font-size: 0.6rem;
          color: rgba(245,158,11,0.5);
          margin-left: 0.5rem;
        }
        .db-marquee-empty {
          font-size: 0.84rem;
          font-weight: 500;
          color: var(--muted-foreground);
          padding: 0 1rem;
          white-space: nowrap;
        }
        .db-marquee-type-badge {
          display: inline-flex;
          align-items: center;
          font-size: 0.62rem;
          font-weight: 800;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          letter-spacing: 0.07em;
          flex-shrink: 0;
          text-transform: uppercase;
        }
        .db-marquee-type-badge.type-student {
          background: rgba(99,102,241,0.12);
          color: #6366f1;
          border: 1px solid rgba(99,102,241,0.25);
        }
        .db-marquee-type-badge.type-teacher {
          background: rgba(16,185,129,0.12);
          color: #10b981;
          border: 1px solid rgba(16,185,129,0.25);
        }
        .db-marquee-type-badge.type-parent {
          background: rgba(236,72,153,0.12);
          color: #ec4899;
          border: 1px solid rgba(236,72,153,0.25);
        }
        .db-marquee-type-badge.type-all {
          background: rgba(245,158,11,0.12);
          color: #f59e0b;
          border: 1px solid rgba(245,158,11,0.25);
        }
        .db-marquee-add-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0 1.1rem;
          height: 100%;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #fff;
          border: none;
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          flex-shrink: 0;
          transition: opacity 0.2s;
          border-left: 1px solid rgba(245,158,11,0.3);
        }
        .db-marquee-add-btn:hover { opacity: 0.85; }

        /* ── Marquee Modal ── */
        .db-marquee-modal {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 1.2rem;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.25);
          overflow: hidden;
          animation: fade-in 0.2s ease;
        }
        .db-marquee-modal-head {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(135deg, rgba(245,158,11,0.06), transparent);
        }
        .db-marquee-modal-head h3 {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 0.1rem;
        }
        .db-marquee-modal-head p {
          font-size: 0.75rem;
          color: var(--muted-foreground);
        }
        .db-marquee-modal-icon {
          width: 40px; height: 40px;
          border-radius: 0.75rem;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(245,158,11,0.3);
        }
        .db-marquee-modal-close {
          margin-left: auto;
          width: 34px; height: 34px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted-foreground);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .db-marquee-modal-close:hover {
          background: var(--destructive);
          color: #fff;
          border-color: var(--destructive);
        }
        .db-marquee-form {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }
        .db-mf-group {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          flex: 1;
        }
        .db-mf-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--foreground);
        }
        .db-mf-group label span { color: var(--destructive); }
        .db-mf-optional { color: var(--muted-foreground) !important; font-weight: 400; }
        .db-mf-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 480px) { .db-mf-row { grid-template-columns: 1fr; } }
        .db-mf-textarea,
        .db-mf-input,
        .db-mf-select {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border-radius: 0.65rem;
          border: 1px solid var(--border);
          background: var(--background);
          color: var(--foreground);
          font-size: 0.85rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
          font-family: inherit;
          resize: vertical;
        }
        .db-mf-textarea:focus,
        .db-mf-input:focus,
        .db-mf-select:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.15);
        }
        .db-mf-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 0.9rem;
          border-radius: 0.65rem;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          color: var(--destructive);
          font-size: 0.8rem;
          font-weight: 500;
        }
        .db-mf-success {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 0.9rem;
          border-radius: 0.65rem;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.25);
          color: var(--success);
          font-size: 0.8rem;
          font-weight: 500;
        }
        .db-mf-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 0.25rem;
          border-top: 1px solid var(--border);
          margin-top: 0.25rem;
        }
        .db-mf-cancel {
          background: var(--muted);
          color: var(--foreground);
          padding: 0.55rem 1.2rem;
          font-size: 0.85rem;
        }
        .db-mf-cancel:hover { opacity: 0.8; }
        .db-mf-submit {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.4rem;
          font-size: 0.85rem;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
        }
        .db-mf-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
      `}</style>
    </div>
  );
}
