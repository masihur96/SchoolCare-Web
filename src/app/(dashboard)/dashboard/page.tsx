'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Users, GraduationCap, BookOpen, ClipboardList,
  Calendar, Clock, ChevronRight, ChevronLeft,
  FileText, Megaphone, Loader2, BarChart2, Brain,
  Sparkles, UserCheck, ArrowLeftRight, BarChart3, CheckCircle, AlertCircle, Settings2,
  AlertTriangle, ArrowRight,
  BookCopy, LayoutGrid, ClipboardCheck, Star
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
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
interface Notice { id: string; title: string; content: string; targetAudience: string; isImportent: boolean; postedBy: string; createdAt: string; }
interface Homework { id: string; title: string; description: string; dueDate: string; classInfo?: { name: string }; subjectInfo?: { name: string }; sectionInfo?: { name: string }; }
interface ExamAssignment { id: string; class: { name: string }; subject: { name: string }; examiner: { name: string }; date: string; syllabus: string; }
interface Exam { id: string; exam_name: string; description: string; start_date: string; end_date: string; isPublished: boolean; status: string; assignments: ExamAssignment[]; }
interface DashboardData {
  attendTeacher: AttendanceInfo;
  attendStudent: AttendanceInfo;
  recentNotice: Notice[];
  recentHomework: Homework[];
  currentExam: Exam[];
}
interface UserProfile { id: string; name: string; email: string; role: string; schoolId: string; phone: string; avatar: string | null; designation: string | null; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
}

function getGreeting(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const emoji = h < 12 ? '☀️' : h < 17 ? '👋' : '🌙';
  return { greeting: g, emoji, name: name.split(' ')[0] };
}

function getMonthName(m: number) {
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m];
}

// ─── Mini Sparkline ───────────────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const w = 80; const h = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / (max - min + 0.001)) * (h * 0.85);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ pct, color, size = 100 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const cx = size / 2; const cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  );
}

// ─── Area Chart ───────────────────────────────────────────────────────────────
function AreaChart({ data, height = 320 }: { data: { label: string, value: number, subLabel?: string, subColor?: string, stats?: { present: number, absent: number, leave: number, late: number, total: number } }[], height?: number }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      }, 0);
    }
  }, [data]);

  const w = 600;
  const h = height;
  const padX = 30;
  const padY = 40;

  if (!data || data.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data</div>;

  const maxVal = 100;
  const getX = (i: number) => padX + (i / (data.length - 1 || 1)) * (w - padX * 2);
  const getY = (v: number) => h - padY - (v / maxVal) * (h - padY * 2 - 20);

  const getCurve = () => {
    let dStr = `M ${getX(0)},${getY(data[0].value)}`;
    for (let i = 0; i < data.length - 1; i++) {
      const x0 = getX(i); const y0 = getY(data[i].value);
      const x1 = getX(i + 1); const y1 = getY(data[i + 1].value);
      const cp1x = x0 + (x1 - x0) / 2; const cp1y = y0;
      const cp2x = x1 - (x1 - x0) / 2; const cp2y = y1;
      dStr += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x1},${y1}`;
    }
    return dStr;
  };

  const path = getCurve();
  const area = `${path} L ${getX(data.length - 1)},${h - padY} L ${getX(0)},${h - padY} Z`;

  return (
    <div ref={scrollRef} style={{ width: '100%', overflowX: 'auto', overflowY: 'visible', position: 'relative' }}>
      <svg width={Math.max(w, data.length * 40)} height={h} viewBox={`0 0 ${Math.max(w, data.length * 40)} ${h}`} preserveAspectRatio="none" style={{ minWidth: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = getY(pct * 100);
          return (
            <g key={pct}>
              <text x={padX - 5} y={y + 4} fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="600">{pct * 100}%</text>
              <line x1={padX + 5} y1={y} x2={Math.max(w, data.length * 40) - padX} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" />
            </g>
          );
        })}

        <path d={area} fill="url(#gradPurple)" />
        <path d={path} fill="none" stroke="#a855f7" strokeWidth="3" />
        
        {data.map((d, i) => {
          const x = getX(i);
          const y = getY(d.value);
          const [dayName, dayNum] = d.label.split(' ');
          const isHovered = hoverIndex === i;
          
          return (
            <g 
              key={i}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Invisible interactive area */}
              <rect x={x - 20} y={0} width={40} height={h} fill="transparent" />
              
              <circle cx={x} cy={y} r={isHovered ? 7 : 5} fill="#fff" stroke="#a855f7" strokeWidth={isHovered ? 3 : 2} style={{ transition: 'all 0.2s' }} />
              {dayNum ? (
                <>
                  <text x={x} y={h - 22} fontSize="10" fill={isHovered ? "#64748b" : "#94a3b8"} textAnchor="middle" fontWeight={isHovered ? "bold" : "normal"}>{dayName}</text>
                  <text x={x} y={h - 10} fontSize="11" fill={isHovered ? "#0f172a" : "#64748b"} textAnchor="middle" fontWeight="bold">
                    {dayNum}
                  </text>
                </>
              ) : (
                <text x={x} y={h - 15} fontSize="11" fill={isHovered ? "#0f172a" : "#64748b"} textAnchor="middle" fontWeight="bold">
                  {d.label}
                </text>
              )}
              {d.subLabel && (
                <text x={x} y={h - 0} fontSize="10" fill={d.subColor || '#94a3b8'} textAnchor="middle" fontWeight="bold">
                  {d.subLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      
      {hoverIndex !== null && data[hoverIndex]?.stats && (
        <div style={{
          position: 'absolute',
          left: Math.min(getX(hoverIndex) + 15, Math.max(w, data.length * 40) - 150),
          top: Math.max(10, getY(data[hoverIndex].value) - 80),
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '0.75rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          pointerEvents: 'none',
          zIndex: 10,
          minWidth: '130px'
        }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.25rem' }}>
            {data[hoverIndex].label.replace(' ', ', ')} - {data[hoverIndex].value}%
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
            <span style={{ color: '#10b981' }}>Present:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{Math.round((data[hoverIndex].stats.present / data[hoverIndex].stats.total) * 100)}% ({data[hoverIndex].stats.present})</span>
            
            <span style={{ color: '#ef4444' }}>Absent:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{Math.round((data[hoverIndex].stats.absent / data[hoverIndex].stats.total) * 100)}% ({data[hoverIndex].stats.absent})</span>
            
            <span style={{ color: '#f59e0b' }}>Leave:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{Math.round((data[hoverIndex].stats.leave / data[hoverIndex].stats.total) * 100)}% ({data[hoverIndex].stats.leave})</span>
            
            <span style={{ color: '#8b5cf6' }}>Late:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{Math.round((data[hoverIndex].stats.late / data[hoverIndex].stats.total) * 100)}% ({data[hoverIndex].stats.late})</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: { label: string; avg: number; top: number }[] }) {
  return (
    <div style={{ position: 'relative', paddingBottom: '20px' }}>
      {/* Y-axis guide lines */}
      {[0, 25, 50, 75, 100].map(v => (
        <div key={v} style={{ position: 'absolute', left: 0, right: 0, bottom: `${20 + (v / 100) * 70}px`, borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: '#94a3b8', position: 'absolute', left: 0, transform: 'translateY(-50%)' }}>{v}</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '90px', paddingLeft: '20px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
            <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '70px' }}>
              <div style={{ width: '10px', background: '#6366f1', borderRadius: '3px 3px 0 0', height: `${(d.avg / 100) * 70}px`, transition: 'height 0.7s ease' }} />
              <div style={{ width: '10px', background: '#c7d2fe', borderRadius: '3px 3px 0 0', height: `${(d.top / 100) * 70}px`, transition: 'height 0.7s ease' }} />
            </div>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Calendar Widget ──────────────────────────────────────────────────────────
function CalendarWidget({ today }: { today: Date }) {
  const [viewDate, setViewDate] = useState(today);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const prev = () => setViewDate(new Date(year, month - 1, 1));
  const next = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div>
      <div className="nd-cal-header">
        <button className="nd-cal-nav" onClick={prev}><ChevronLeft size={14} /></button>
        <span className="nd-cal-title">{getMonthName(month)} {year}</span>
        <button className="nd-cal-nav" onClick={next}><ChevronRight size={14} /></button>
      </div>
      <div className="nd-cal-grid">
        {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
          <div key={d} className="nd-cal-dow">{d}</div>
        ))}
        {days.map((day, i) => {
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <div key={i} className={`nd-cal-day${day === null ? ' empty' : ''}${isToday ? ' today' : ''}`}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [studentAttendanceView, setStudentAttendanceView] = useState<'month' | 'year'>('month');
  const [teacherAttendanceView, setTeacherAttendanceView] = useState<'month' | 'year'>('month');
  const [teacherAttendanceData, setTeacherAttendanceData] = useState<any[]>([]);
  const today = new Date();

  async function fetchProfile(): Promise<UserProfile | null> {
    try {
      const res = await fetch('https://smart-school-backend-production.up.railway.app/auth/profile',
        { headers: { Authorization: `Bearer ${getToken()}`, Accept: '*/*' } });
      if (!res.ok) return null;
      const json = await res.json();
      setUserProfile(json.data);
      return json.data;
    } catch { return null; }
  }

  useEffect(() => {
    async function init() {
      await fetchProfile();
      try {
        const mm = today.getMonth() + 1;
        const yyyy = today.getFullYear();
        const res = await fetch(`https://smart-school-backend-production.up.railway.app/dashboard/admin?month=${mm}&year=${yyyy}`,
          { headers: { Authorization: `Bearer ${getToken()}`, Accept: '*/*' } });
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }

        const daysInMonth = new Date(yyyy, mm, 0).getDate();
        const startD = `01-${mm.toString().padStart(2, '0')}-${yyyy}`;
        const endD = `${daysInMonth.toString().padStart(2, '0')}-${mm.toString().padStart(2, '0')}-${yyyy}`;
        const tRes = await fetch(`https://smart-school-backend-production.up.railway.app/admin/teacher-attendance?startDate=${startD}&endDate=${endD}`,
          { headers: { Authorization: `Bearer ${getToken()}`, Accept: '*/*' } });
        if (tRes.ok) {
          const tJson = await tRes.json();
          setTeacherAttendanceData(tJson.data || []);
        }
      } catch { /* use dummy data */ }
      finally { setLoading(false); }
    }
    init();
  }, []);

  // ── Dummy fallback data ────────────────────────────────────────────────────
  const dummy: DashboardData = {
    attendTeacher: { date: today.toISOString(), totalTeachers: 24, present: 21, absent: 3, attendanceRate: 87 },
    attendStudent: { date: today.toISOString(), totalStudents: 128, present: 115, absent: 10, leave: 3, recorded: 128, attendanceRate: 90 },
    recentNotice: [
      { id: '1', title: 'Annual Sports Day announced', content: '', targetAudience: 'ALL', isImportent: true, postedBy: 'Admin', createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: '2', title: 'Parent-Teacher meeting scheduled', content: '', targetAudience: 'PARENT', isImportent: false, postedBy: 'Admin', createdAt: new Date(Date.now() - 7200000).toISOString() },
      { id: '3', title: 'Holiday on Eid-ul-Adha', content: '', targetAudience: 'ALL', isImportent: true, postedBy: 'Admin', createdAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    recentHomework: [
      { id: '1', title: 'Physics Chapter 5 Exercises', description: '', dueDate: new Date(Date.now() + 172800000).toISOString(), classInfo: { name: 'Class 10A' }, subjectInfo: { name: 'Physics' } },
      { id: '2', title: 'Algebra Problem Set', description: '', dueDate: new Date(Date.now() + 86400000).toISOString(), classInfo: { name: 'Class 11B' }, subjectInfo: { name: 'Mathematics' } },
    ],
    currentExam: [
      { id: '1', exam_name: 'Mid-Term Examination', description: 'Chapters 1-8', start_date: new Date(Date.now() + 604800000).toISOString(), end_date: new Date(Date.now() + 864000000).toISOString(), isPublished: true, status: 'UPCOMING', assignments: [{ id: '1', class: { name: 'Class 10' }, subject: { name: 'Physics' }, examiner: { name: 'Mr. Ahmed' }, date: '', syllabus: '' }] },
    ]
  };

  const d = data || dummy;
  const { greeting, emoji, name } = getGreeting(userProfile?.name || 'Admin');

  // Static supporting data
  const upcomingActivities = [
    { month: 'OCT', day: 10, title: 'Physics Practical – Lab Session', sub: 'Class 10A · 09:30 AM – 11:00 AM', color: '#6366f1' },
    { month: 'OCT', day: 12, title: 'Chemistry Quiz', sub: 'Class 11B · 10:30 AM – 11:00 AM', color: '#10b981' },
    { month: 'OCT', day: 14, title: 'Maths Worksheet Discussion', sub: 'Class 9C · 11:15 AM – 12:00 PM', color: '#f59e0b' },
    { month: 'OCT', day: 15, title: 'Parent-Teacher Meeting', sub: 'Virtual · 04:00 PM – 06:00 PM', color: '#ec4899' },
  ];

  const hwStats = { total: 34, submitted: 26, pending: 8, overdue: 3 };
  const hwPct = Math.round((hwStats.submitted / hwStats.total) * 100);

  const perfData = [
    { label: '10A', avg: 72, top: 88 },
    { label: '10B', avg: 65, top: 82 },
    { label: '11A', avg: 78, top: 91 },
    { label: '11B', avg: 60, top: 79 },
    { label: '12A', avg: 82, top: 95 },
  ];

  const riskStudents = [
    { name: 'Rohan Mehta (10A)', risk: 'High Risk', color: '#ef4444', bg: '#fef2f2', reason: 'Declining in Physics & Maths' },
    { name: 'Aisha Khan (11B)', risk: 'Medium Risk', color: '#f59e0b', bg: '#fffbeb', reason: 'Low assignment submission' },
    { name: 'Karan Verma (9C)', risk: 'Low Risk', color: '#10b981', bg: '#f0fdf4', reason: 'Needs improvement in Tests' },
  ];

  const notifications = [
    { icon: ClipboardCheck, color: '#6366f1', title: 'New assignment submitted', sub: 'Arjun Singh submitted Physics Worksheet', time: '10 min ago', unread: true },
    { icon: UserCheck, color: '#10b981', title: 'Leave request received', sub: '2 leave requests need your approval', time: '1 hr ago', unread: true },
    { icon: Star, color: '#f59e0b', title: 'Grades are ready to publish', sub: 'Chemistry Quiz results are ready', time: '2 hr ago', unread: false },
    { icon: Calendar, color: '#8b5cf6', title: 'Timetable updated', sub: 'New schedule published for Class 10A', time: '3 hr ago', unread: false },
  ];

  const schedule = [
    { start: '08:30 AM', end: '09:15 AM', subject: 'Class 9C – Physics', room: 'Room 204', active: false },
    { start: '09:30 AM', end: '10:15 AM', subject: 'Class 10A – Physics', room: 'Room 205', active: true },
    { start: '11:15 AM', end: '12:00 PM', subject: 'Class 11B – Physics', room: 'Lab 1', active: false },
    { start: '02:00 PM', end: '02:45 PM', subject: 'Class 12A – Physics', room: 'Room 206', active: false },
  ];

  const reminders = [
    { icon: BookOpen, color: '#6366f1', bg: '#eef2ff', title: 'Upcoming Lecture', sub: 'Class 10A · Physics in 15 mins' },
    { icon: ClipboardList, color: '#f59e0b', bg: '#fffbeb', title: 'Pending Evaluations', sub: '12 assignments to grade' },
    { icon: Clock, color: '#10b981', bg: '#f0fdf4', title: 'Next Free Slot', sub: 'Today 12:00 PM – 02:00 PM' },
  ];

  const quickLinks = [
    { icon: Users,         label: 'Students',   href: '/students',          color: '#6366f1', bg: '#eef2ff' },
    { icon: LayoutGrid,    label: 'Timetable',  href: '/routine',           color: '#10b981', bg: '#f0fdf4' },
    { icon: BookCopy,      label: 'Homework',   href: '/notices',           color: '#8b5cf6', bg: '#f5f3ff' },
    { icon: UserCheck,     label: 'Attendance', href: '/attendance',        color: '#f59e0b', bg: '#fffbeb' },
    { icon: FileText,      label: 'Exams',      href: '/exams',             color: '#ec4899', bg: '#fdf2f8' },
    { icon: BarChart2,     label: 'Reports',    href: '/dashboard',         color: '#06b6d4', bg: '#ecfeff' },
    { icon: Brain,         label: 'AI Tools',   href: '/dashboard',         color: '#6366f1', bg: '#eef2ff' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={36} style={{ animation: 'nd-spin 1s linear infinite', color: 'var(--primary)' }} />
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Loading dashboard…</p>
        <style>{`@keyframes nd-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const studentStats = studentAttendanceView === 'month' && (d.attendStudent as any)?.monthlySummary
    ? {
        rate: Math.round((d.attendStudent as any).monthlySummary.attendanceRate) || 0,
        total: (d.attendStudent as any).monthlySummary.totalStudents || 0,
        present: (d.attendStudent as any).monthlySummary.totalPresent || 0,
        absent: (d.attendStudent as any).monthlySummary.totalAbsent || 0,
      }
    : {
        rate: Math.round(d.attendStudent?.attendanceRate) || 0,
        total: d.attendStudent?.totalStudents || 0,
        present: d.attendStudent?.present || 0,
        absent: d.attendStudent?.absent || 0,
      };

  const teacherStats = teacherAttendanceView === 'month' && (d.attendTeacher as any)?.monthlySummary
    ? {
        rate: Math.round((d.attendTeacher as any).monthlySummary.attendanceRate) || 0,
        total: (d.attendTeacher as any).monthlySummary.totalTeachers || 0,
        present: (d.attendTeacher as any).monthlySummary.totalPresent || 0,
        absent: (d.attendTeacher as any).monthlySummary.totalAbsent || 0,
      }
    : {
        rate: Math.round(d.attendTeacher?.attendanceRate) || 0,
        total: d.attendTeacher?.totalTeachers || 0,
        present: d.attendTeacher?.present || 0,
        absent: d.attendTeacher?.absent || 0,
      };

  const getDayName = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  const _dailyData = ((d.attendStudent as any)?.dailyAttendance || (d.attendStudent as any)?.data || [])
    .filter((record: any) => record.hasData !== false && record.recorded !== false)
    .map((record: any) => {
    const total = record.present + record.absent + (record.leave || 0) + (record.late || 0);
    const rate = total > 0 ? Math.round((record.present / total) * 100) : 0;
    return {
      label: `${getDayName(record.date)} ${new Date(record.date).getDate()}`,
      value: rate,
      subLabel: `${rate}%`,
      subColor: rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444',
      stats: { present: record.present || 0, absent: record.absent || 0, leave: record.leave || 0, late: record.late || 0, total: total || 1 }
    };
  });

  const generateMonthlyDays = () => {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }).map((_, i) => {
      const dd = new Date(today.getFullYear(), today.getMonth(), i + 1);
      return {
        label: `${dd.toLocaleDateString('en-US', { weekday: 'short' })} ${dd.getDate()}`,
        value: 0,
        subLabel: '-',
        subColor: '#94a3b8'
      };
    });
  };

    const generateDummyYearlyStats = (value: number) => {
    const total = 100;
    const present = Math.round(total * (value / 100));
    const absent = total - present;
    return { present, absent, leave: 0, late: 0, total };
  };

  const dummyYearlyData = [
    { label: 'Jan', value: 0 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 0 },
    { label: 'Apr', value: 0 }, { label: 'May', value: 48 }, { label: 'Jun', value: 74 },
    { label: 'Jul', value: 46 }, { label: 'Aug', value: 82 }, { label: 'Sep', value: 85 },
    { label: 'Oct', value: 78 }, { label: 'Nov', value: 0 }, { label: 'Dec', value: 0 }
  ].map(d => ({ ...d, subLabel: d.value > 0 ? `${d.value}%` : '-', subColor: d.value >= 80 ? '#10b981' : d.value >= 60 ? '#f59e0b' : '#ef4444', stats: generateDummyYearlyStats(d.value) }));

  const _dailyTeacherData = ((d.attendTeacher as any)?.dailyAttendance || (d.attendTeacher as any)?.data || (d.attendTeacher as any)?.recentRecords || [])
    .filter((record: any) => record.hasData !== false && record.recorded !== false)
    .map((record: any) => {
    const total = record.present + record.absent + (record.leave || 0) + (record.late || 0);
    const rate = total > 0 ? Math.round((record.present / total) * 100) : 0;
    return {
      label: `${getDayName(record.date)} ${new Date(record.date).getDate()}`,
      value: rate,
      subLabel: `${rate}%`,
      subColor: rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444',
      stats: { present: record.present || 0, absent: record.absent || 0, leave: record.leave || 0, late: record.late || 0, total: total || 1 }
    };
  });

  let computedDailyTeacherData: any[] = [];
  if (teacherAttendanceData && teacherAttendanceData.length > 0) {
    const grouped = teacherAttendanceData.reduce((acc, curr) => {
      if (!curr.date) return acc;
      const dStr = curr.date.split('T')[0];
      if (!acc[dStr]) acc[dStr] = new Set();
      acc[dStr].add(curr.teacherId);
      return acc;
    }, {} as Record<string, Set<string>>);
    
    computedDailyTeacherData = Object.entries(grouped).map(([dateStr, teacherSet]) => {
      const presentCount = teacherSet.size;
      const totalCount = d.attendTeacher?.totalTeachers || 24;
      const absentCount = Math.max(0, totalCount - presentCount);
      const total = presentCount + absentCount;
      const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
      
      return {
        label: `${getDayName(dateStr)} ${new Date(dateStr).getDate()}`,
        value: rate,
        subLabel: `${rate}%`,
        subColor: rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444',
        stats: { present: presentCount, absent: absentCount, leave: 0, late: 0, total: total },
        dateStr
      };
    }).sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());
  }

  const studentChartData = studentAttendanceView === 'month' 
    ? (_dailyData.length > 0 ? _dailyData : generateMonthlyDays())
    : dummyYearlyData;

  const teacherChartData = teacherAttendanceView === 'month'
    ? (computedDailyTeacherData.length > 0 ? computedDailyTeacherData : (_dailyTeacherData.length > 0 ? _dailyTeacherData : generateMonthlyDays()))
    : dummyYearlyData;

  return (
    <div className="nd-root">
      {/* ── Page Title ── */}
      {/* <h1 className="nd-page-title">Dashboard Overview</h1> */ }

      {/* ── Two-column layout: main + right panel ── */}
      <div className="nd-layout">

        {/* ══ Main Column ══ */}
        <div className="nd-main">

                    {/* ── Attendance Overview ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
            
            {/* Student Attendance Chart Card */}
            <div className="nd-section-card" style={{ padding: '1.5rem', background: '#fff', borderRadius: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: '#f3e8ff', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <BarChart3 size={24} color="#a855f7" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                      {studentAttendanceView === 'month' ? `${getMonthName(today.getMonth())} ${today.getFullYear()}` : 'Monthly Overview'}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
                      Student Attendance
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setStudentAttendanceView(studentAttendanceView === 'month' ? 'year' : 'month')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  <ArrowLeftRight size={14} /> {studentAttendanceView === 'month' ? 'Monthly' : 'Daily'}
                </button>
              </div>

              {true && (
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a855f7' }}>{(d.attendStudent as any)?.monthlySummary?.daysRecorded || 0}/{(d.attendStudent as any)?.monthlySummary?.daysInMonth || 31}d</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Recorded</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>{(d.attendStudent as any)?.monthlySummary?.totalPresent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Present</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>{(d.attendStudent as any)?.monthlySummary?.totalAbsent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Absent</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>{(d.attendStudent as any)?.monthlySummary?.totalLeave || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Leave</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8b5cf6' }}>{(d.attendStudent as any)?.monthlySummary?.totalLate || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Late</p>
                  </div>
                </div>
              )}

              <div style={{ height: '320px', marginTop: '3rem' }}>
                <AreaChart data={studentChartData} height={320} />
              </div>
            </div>

            {/* Teacher Attendance Chart Card */}
            <div className="nd-section-card" style={{ padding: '1.5rem', background: '#fff', borderRadius: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: '#f3e8ff', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <BarChart3 size={24} color="#a855f7" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                      {teacherAttendanceView === 'month' ? `${getMonthName(today.getMonth())} ${today.getFullYear()}` : 'Monthly Overview'}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
                      Teacher Attendance
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setTeacherAttendanceView(teacherAttendanceView === 'month' ? 'year' : 'month')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  <ArrowLeftRight size={14} /> {teacherAttendanceView === 'month' ? 'Monthly' : 'Daily'}
                </button>
              </div>

              {true && (
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a855f7' }}>{(d.attendTeacher as any)?.monthlySummary?.daysRecorded || 0}/{(d.attendTeacher as any)?.monthlySummary?.daysInMonth || 31}d</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Recorded</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>{(d.attendTeacher as any)?.monthlySummary?.totalPresent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Present</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>{(d.attendTeacher as any)?.monthlySummary?.totalAbsent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Absent</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>{(d.attendTeacher as any)?.monthlySummary?.totalLeave || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Leave</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8b5cf6' }}>{(d.attendTeacher as any)?.monthlySummary?.totalLate || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Late</p>
                  </div>
                </div>
              )}

              <div style={{ height: '320px', marginTop: '3rem' }}>
                <AreaChart data={teacherChartData} height={320} />
              </div>
            </div>

          </div>
          
          {/* ── Stat Cards ── */}
          <div className="nd-stats-row">
            {[
              { label: "Today's Classes",       value: d.currentExam.length + 3,       sub: 'Next: Physics – 10A · 09:30 AM',   icon: BookOpen,      color: '#6366f1', bg: '#eef2ff', spark: [2,3,2,4,3,3,4] },
              { label: 'Student Count',          value: d.attendStudent.totalStudents ?? 128, sub: `Across ${d.currentExam.length+3} classes`, icon: Users, color: '#10b981', bg: '#f0fdf4', spark: [100,115,110,125,120,128,128] },
              { label: 'Assignments to Grade',   value: hwStats.pending,                sub: 'Due within 3 days',                icon: ClipboardList, color: '#f59e0b', bg: '#fffbeb', spark: [5,8,6,10,9,8,8] },
              { label: 'Pending Leave Requests', value: 2,                              sub: 'Requires your approval',           icon: UserCheck,     color: '#ec4899', bg: '#fdf2f8', spark: [1,2,1,3,2,2,2] },
            ].map((s, i) => (
              <div key={i} className="nd-stat-card">
                <div className="nd-stat-top">
                  <div style={{ flex: 1 }}>
                    <p className="nd-stat-label">{s.label}</p>
                    <p className="nd-stat-value">{s.value}</p>
                    <p className="nd-stat-sub">{s.sub}</p>
                  </div>
                  <div className="nd-stat-icon" style={{ background: s.bg }}>
                    <s.icon size={20} color={s.color} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <Sparkline values={s.spark} color={s.color} />
                </div>
              </div>
            ))}
          </div>

          {/* ── Quick Links ── */}
          <div className="nd-section-card">
            <div className="nd-section-head">
              <h3>Quick Links</h3>
              <button className="nd-text-btn"><Settings2 size={13} /> Customize</button>
            </div>
            <div className="nd-ql-row">
              {quickLinks.map((ql, i) => (
                <Link key={i} href={ql.href} className="nd-ql-item">
                  <div className="nd-ql-icon" style={{ background: ql.bg }}>
                    <ql.icon size={22} color={ql.color} />
                  </div>
                  <span>{ql.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── 3-col grid ── */}
          <div className="nd-3col">

            {/* Upcoming Activities */}
            <div className="nd-section-card">
              <div className="nd-section-head">
                <h3>Upcoming Activities</h3>
                <button className="nd-text-btn">View All</button>
              </div>
              <div className="nd-act-list">
                {upcomingActivities.map((a, i) => (
                  <div key={i} className="nd-act-item">
                    <div className="nd-act-date" style={{ background: a.color + '18', color: a.color }}>
                      <span className="nd-act-mon">{a.month}</span>
                      <span className="nd-act-day">{a.day}</span>
                    </div>
                    <div>
                      <p className="nd-act-title">{a.title}</p>
                      <p className="nd-act-sub">{a.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="nd-outline-btn">
                <Calendar size={13} /> View Full Calendar
              </button>
            </div>

            {/* Homework Submissions */}
            <div className="nd-section-card">
              <div className="nd-section-head">
                <h3>Homework Submissions</h3>
                <button className="nd-text-btn">View All</button>
              </div>
              <div className="nd-hw-body">
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <DonutChart pct={hwPct} color="#6366f1" size={100} />
                  <div className="nd-hw-center">
                    <span className="nd-hw-pct">{hwPct}%</span>
                    <span className="nd-hw-pct-sub">Submitted</span>
                  </div>
                </div>
                <div className="nd-hw-stats">
                  {[
                    { label: 'Total Assigned', val: hwStats.total,     color: '#475569' },
                    { label: 'Submitted',       val: hwStats.submitted, color: '#10b981' },
                    { label: 'Pending',         val: hwStats.pending,   color: '#f59e0b' },
                    { label: 'Overdue',         val: hwStats.overdue,   color: '#ef4444' },
                  ].map((s, i) => (
                    <div key={i} className="nd-hw-row">
                      <span className="nd-hw-lbl">{s.label}</span>
                      <span style={{ color: s.color, fontWeight: 700, fontSize: '0.9rem' }}>{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Student Performance Overview */}
            <div className="nd-section-card">
              <div className="nd-section-head">
                <h3>Student Performance</h3>
                <button className="nd-text-btn">This Month ▾</button>
              </div>
              <MiniBarChart data={perfData} />
              <div className="nd-legend">
                <span className="nd-legend-dot" style={{ background: '#6366f1' }} />
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Class Avg %</span>
                <span className="nd-legend-dot" style={{ background: '#c7d2fe', marginLeft: '8px' }} />
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Top Score %</span>
              </div>
            </div>
          </div>

          {/* ── 2-col grid ── */}
          <div className="nd-2col">

            {/* AI Student Risk Alerts */}
            <div className="nd-section-card">
              <div className="nd-section-head">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AlertTriangle size={14} color="#ef4444" /> AI Student Risk Alerts
                </h3>
                <button className="nd-text-btn">View All</button>
              </div>
              <div className="nd-risk-list">
                {riskStudents.map((s, i) => (
                  <div key={i} className="nd-risk-item">
                    <div className="nd-risk-avatar">{s.name.charAt(0)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="nd-risk-name">{s.name}</p>
                      <p className="nd-risk-reason">{s.reason}</p>
                    </div>
                    <span className="nd-risk-badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>{s.risk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="nd-section-card">
              <div className="nd-section-head">
                <h3>Notifications</h3>
                <button className="nd-text-btn">View All</button>
              </div>
              <div className="nd-notif-list">
                {notifications.map((n, i) => (
                  <div key={i} className="nd-notif-item">
                    <div className="nd-notif-icon" style={{ background: n.color + '18' }}>
                      <n.icon size={15} color={n.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="nd-notif-title">{n.title}</p>
                      <p className="nd-notif-sub">{n.sub}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span className="nd-notif-time">{n.time}</span>
                      {n.unread && <span className="nd-notif-dot" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══ Right Panel ══ */}
        <div className="nd-right-panel">

          {/* Calendar */}
          <div className="nd-section-card">
            <p className="nd-rp-section-title">Calendar</p>
            <CalendarWidget today={today} />
          </div>

          {/* Today's Schedule */}
          <div className="nd-section-card">
            <div className="nd-section-head">
              <h3>Today's Schedule</h3>
              <button className="nd-text-btn" style={{ fontSize: '0.7rem' }}>View Timetable</button>
            </div>
            <div className="nd-sch-list">
              {schedule.map((s, i) => (
                <div key={i} className={`nd-sch-item${s.active ? ' active' : ''}`}>
                  <div className="nd-sch-time">
                    <span>{s.start}</span>
                    <span>{s.end}</span>
                  </div>
                  <div className="nd-sch-bar" style={{ background: s.active ? '#6366f1' : '#e2e8f0' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="nd-sch-subj">{s.subject}</p>
                    <p className="nd-sch-room">{s.room}</p>
                  </div>
                  {s.active && <span className="nd-sch-now">Now</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Smart Reminders */}
          <div className="nd-section-card">
            <div className="nd-section-head">
              <h3>Smart Reminders</h3>
            </div>
            <div className="nd-rem-list">
              {reminders.map((r, i) => (
                <div key={i} className="nd-rem-item">
                  <div className="nd-rem-icon" style={{ background: r.bg }}>
                    <r.icon size={15} color={r.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="nd-rem-title">{r.title}</p>
                    <p className="nd-rem-sub">{r.sub}</p>
                  </div>
                  <ChevronRight size={15} color="#94a3b8" />
                </div>
              ))}
            </div>
            <button className="nd-outline-btn" style={{ marginTop: '0.5rem' }}>View All Reminders</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes nd-spin { to { transform: rotate(360deg); } }

        /* ── Root & Layout ── */
        .nd-root { display: flex; flex-direction: column; gap: 1.25rem; padding-bottom: 2.5rem; }
        .nd-page-title { font-size: 1.45rem; font-weight: 800; color: var(--foreground); }
        .nd-layout { display: grid; grid-template-columns: 1fr 272px; gap: 1.25rem; align-items: start; }
        @media (max-width: 1150px) { .nd-layout { grid-template-columns: 1fr; } }
        .nd-main { display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; }

        /* ── Cards ── */
        .nd-section-card { background: var(--card); border: 1px solid var(--border); border-radius: 1rem; padding: 1.15rem 1.2rem; box-shadow: 0 1px 6px rgba(0,0,0,0.04); }
        .nd-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
        .nd-section-head h3 { font-size: 0.9rem; font-weight: 700; color: var(--foreground); }
        .nd-rp-section-title { font-size: 0.9rem; font-weight: 700; color: var(--foreground); margin-bottom: 1rem; }
        .nd-text-btn { background: none; border: none; cursor: pointer; font-size: 0.75rem; color: #6366f1; font-weight: 600; display: inline-flex; align-items: center; gap: 3px; padding: 0.2rem 0.5rem; border-radius: 6px; transition: background 0.15s; font-family: inherit; }
        .nd-text-btn:hover { background: #eef2ff; }
        .nd-outline-btn { width: 100%; border: 1px solid var(--border); background: none; border-radius: 0.6rem; padding: 0.5rem; font-size: 0.78rem; font-weight: 600; cursor: pointer; color: #64748b; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; transition: background 0.15s; font-family: inherit; }
        .nd-outline-btn:hover { background: var(--muted); }

        /* ── Hero ── */
        .nd-hero { background: linear-gradient(135deg, #eef2ff 0%, #fdf4ff 55%, #fff1f5 100%); border-radius: 1.25rem; padding: 1.75rem; display: flex; gap: 1.5rem; align-items: stretch; border: 1px solid #e0e7ff; position: relative; overflow: hidden; }
        .nd-hero::before { content: ''; position: absolute; top: -60px; left: 50%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%); border-radius: 50%; }
        .nd-hero-left { display: flex; gap: 1.25rem; align-items: center; flex: 1; min-width: 0; }
        .nd-hero-avatar { width: 86px; height: 86px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 20px rgba(99,102,241,0.18); border: 3px solid white; }
        .nd-hero-text { min-width: 0; }
        .nd-hero-greeting { font-size: 1.4rem; font-weight: 800; color: #1e1b4b; margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nd-hero-sub { color: #64748b; font-size: 0.88rem; margin-bottom: 0.4rem; }
        .nd-hero-info { font-size: 0.85rem; color: #475569; margin-bottom: 0.9rem; }
        .nd-hero-link { color: #6366f1; font-weight: 700; text-decoration: none; }
        .nd-hero-link:hover { text-decoration: underline; }
        .nd-hero-btn { display: inline-flex; align-items: center; gap: 0.4rem; background: #6366f1; color: white; border: none; border-radius: 0.6rem; padding: 0.5rem 1.1rem; font-size: 0.83rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: background 0.2s, transform 0.15s; font-family: inherit; }
        .nd-hero-btn:hover { background: #4f46e5; transform: translateY(-1px); }
        .nd-hero-right { display: flex; flex-direction: column; gap: 0.7rem; width: 240px; flex-shrink: 0; }
        @media (max-width: 900px) { .nd-hero { flex-direction: column; } .nd-hero-right { width: auto; flex-direction: row; } }
        @media (max-width: 580px) { .nd-hero-right { flex-direction: column; } .nd-hero-left { flex-direction: column; align-items: flex-start; } }

        /* AI Cards */
        .nd-ai-card { background: white; border-radius: 0.85rem; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.45rem; border: 1px solid #e0e7ff; flex: 1; box-shadow: 0 1px 5px rgba(99,102,241,0.07); }
        .nd-ai-icon-wrap { width: 34px; height: 34px; border-radius: 0.55rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nd-ai-title { font-size: 0.82rem; font-weight: 700; color: var(--foreground); }
        .nd-ai-sub { font-size: 0.72rem; color: #64748b; line-height: 1.4; }
        .nd-ai-btn { align-self: flex-start; background: none; border: 1px solid; border-radius: 6px; padding: 0.28rem 0.7rem; font-size: 0.72rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 2px; transition: opacity 0.15s; font-family: inherit; }
        .nd-ai-btn:hover { opacity: 0.7; }

        /* ── Stats ── */
        .nd-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        @media (max-width: 1000px) { .nd-stats-row { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px)  { .nd-stats-row { grid-template-columns: 1fr 1fr; } }
        .nd-stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 1rem; padding: 1rem 1.1rem 0.85rem; box-shadow: 0 1px 6px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s; }
        .nd-stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(0,0,0,0.08); }
        .nd-stat-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; }
        .nd-stat-label { font-size: 0.7rem; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.15rem; }
        .nd-stat-value { font-size: 1.8rem; font-weight: 800; line-height: 1; margin-bottom: 0.15rem; color: var(--foreground); }
        .nd-stat-sub { font-size: 0.68rem; color: #94a3b8; }
        .nd-stat-icon { width: 42px; height: 42px; border-radius: 0.7rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* ── Quick Links ── */
        .nd-ql-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .nd-ql-item { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; text-decoration: none; color: var(--foreground); font-size: 0.75rem; font-weight: 600; min-width: 58px; transition: transform 0.15s; }
        .nd-ql-item:hover { transform: translateY(-2px); }
        .nd-ql-icon { width: 48px; height: 48px; border-radius: 0.8rem; display: flex; align-items: center; justify-content: center; transition: box-shadow 0.15s; }
        .nd-ql-item:hover .nd-ql-icon { box-shadow: 0 4px 14px rgba(0,0,0,0.1); }

        /* ── 3-col ── */
        .nd-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.1rem; }
        @media (max-width: 960px) { .nd-3col { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 580px) { .nd-3col { grid-template-columns: 1fr; } }

        /* Activities */
        .nd-act-list { display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 0.9rem; }
        .nd-act-item { display: flex; gap: 0.8rem; align-items: center; }
        .nd-act-date { min-width: 44px; height: 44px; border-radius: 0.6rem; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
        .nd-act-mon { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.75; }
        .nd-act-day { font-size: 1.05rem; line-height: 1; }
        .nd-act-title { font-size: 0.8rem; font-weight: 600; color: var(--foreground); margin-bottom: 0.1rem; }
        .nd-act-sub { font-size: 0.7rem; color: #94a3b8; }

        /* Homework */
        .nd-hw-body { display: flex; gap: 1rem; align-items: center; }
        .nd-hw-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .nd-hw-pct { font-size: 1.15rem; font-weight: 800; color: #6366f1; }
        .nd-hw-pct-sub { font-size: 0.62rem; color: #94a3b8; font-weight: 500; }
        .nd-hw-stats { flex: 1; display: flex; flex-direction: column; gap: 0.55rem; }
        .nd-hw-row { display: flex; justify-content: space-between; align-items: center; }
        .nd-hw-lbl { font-size: 0.78rem; color: #64748b; }

        /* Performance */
        .nd-legend { display: flex; align-items: center; gap: 4px; margin-top: 0.5rem; }
        .nd-legend-dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }

        /* ── 2-col ── */
        .nd-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; }
        @media (max-width: 640px) { .nd-2col { grid-template-columns: 1fr; } }

        /* Risk */
        .nd-risk-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .nd-risk-item { display: flex; align-items: center; gap: 0.75rem; }
        .nd-risk-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem; flex-shrink: 0; }
        .nd-risk-name { font-size: 0.8rem; font-weight: 600; color: var(--foreground); margin-bottom: 0.1rem; }
        .nd-risk-reason { font-size: 0.7rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nd-risk-badge { font-size: 0.68rem; font-weight: 700; padding: 0.22rem 0.6rem; border-radius: 999px; white-space: nowrap; }

        /* Notifications */
        .nd-notif-list { display: flex; flex-direction: column; gap: 0.7rem; }
        .nd-notif-item { display: flex; align-items: flex-start; gap: 0.75rem; }
        .nd-notif-icon { width: 34px; height: 34px; border-radius: 0.6rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nd-notif-title { font-size: 0.8rem; font-weight: 600; color: var(--foreground); margin-bottom: 0.1rem; }
        .nd-notif-sub { font-size: 0.7rem; color: #94a3b8; }
        .nd-notif-time { font-size: 0.65rem; color: #94a3b8; white-space: nowrap; }
        .nd-notif-dot { width: 7px; height: 7px; border-radius: 50%; background: #6366f1; }

        /* ── Right Panel ── */
        .nd-right-panel { display: flex; flex-direction: column; gap: 1.25rem; position: sticky; top: 1rem; max-height: calc(100vh - 80px); overflow-y: auto; scrollbar-width: none; }
        .nd-right-panel::-webkit-scrollbar { display: none; }
        @media (max-width: 1150px) { .nd-right-panel { position: static; max-height: none; display: grid; grid-template-columns: 1fr 1fr; } }
        @media (max-width: 640px) { .nd-right-panel { grid-template-columns: 1fr; } }

        /* Calendar */
        .nd-cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
        .nd-cal-title { font-size: 0.85rem; font-weight: 700; color: var(--foreground); }
        .nd-cal-nav { background: none; border: 1px solid var(--border); border-radius: 0.4rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: background 0.15s; }
        .nd-cal-nav:hover { background: var(--muted); }
        .nd-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
        .nd-cal-dow { font-size: 0.58rem; font-weight: 700; color: #94a3b8; text-align: center; padding: 0.2rem 0; }
        .nd-cal-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 500; color: var(--foreground); border-radius: 50%; cursor: default; transition: background 0.15s; }
        .nd-cal-day:not(.empty):hover { background: var(--muted); }
        .nd-cal-day.empty { color: transparent; cursor: default; }
        .nd-cal-day.today { background: #6366f1; color: white !important; font-weight: 700; }

        /* Schedule */
        .nd-sch-list { display: flex; flex-direction: column; gap: 0.6rem; }
        .nd-sch-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.7rem; border-radius: 0.65rem; border: 1px solid var(--border); transition: border-color 0.15s; }
        .nd-sch-item.active { border-color: #6366f1; background: #eef2ff; }
        .nd-sch-time { display: flex; flex-direction: column; align-items: flex-end; font-size: 0.63rem; color: #94a3b8; min-width: 50px; line-height: 1.6; }
        .nd-sch-item.active .nd-sch-time { color: #6366f1; }
        .nd-sch-bar { width: 3px; height: 32px; border-radius: 3px; flex-shrink: 0; }
        .nd-sch-subj { font-size: 0.77rem; font-weight: 600; color: var(--foreground); margin-bottom: 0.1rem; }
        .nd-sch-room { font-size: 0.68rem; color: #94a3b8; }
        .nd-sch-now { font-size: 0.62rem; font-weight: 700; background: #6366f1; color: white; padding: 0.18rem 0.45rem; border-radius: 999px; }

        /* Reminders */
        .nd-rem-list { display: flex; flex-direction: column; gap: 0.7rem; }
        .nd-rem-item { display: flex; align-items: center; gap: 0.7rem; cursor: pointer; padding: 0.25rem 0; }
        .nd-rem-item:hover .nd-rem-title { color: #6366f1; }
        .nd-rem-icon { width: 34px; height: 34px; border-radius: 0.6rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nd-rem-title { font-size: 0.8rem; font-weight: 600; color: var(--foreground); margin-bottom: 0.1rem; transition: color 0.15s; }
        .nd-rem-sub { font-size: 0.7rem; color: #94a3b8; }
      `}</style>
    </div>
  );
}
