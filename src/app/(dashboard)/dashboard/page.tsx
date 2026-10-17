'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Users, GraduationCap, BookOpen, ClipboardList,
  Calendar, CalendarDays, Clock, ChevronRight, ChevronLeft, ChevronDown,
  FileText, Megaphone, Loader2, BarChart2, Brain,
  Sparkles, UserCheck, ArrowLeftRight, BarChart3, CheckCircle, AlertCircle, Settings2,
  AlertTriangle, ArrowRight, Award,
  BookCopy, LayoutGrid, ClipboardCheck, Star, MapPin, Video, Link as LinkIcon,
  MessageCircle, Send, X
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/components/language-provider';

const TeacherMap = dynamic(() => import('@/components/TeacherMap'), {
  ssr: false,
  loading: () => <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--muted)', color: 'var(--muted-foreground)', borderRadius: '0.75rem' }}>Loading map...</div>
});

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
  recentRecords?: any[];
  data?: any[];
}
interface Notice { id: string; title: string; content: string; targetAudience: string; isImportent: boolean; postedBy: string; createdAt: string; }
interface Homework { id: string; title: string; description: string; dueDate: string; classInfo?: { name: string }; subjectInfo?: { name: string }; sectionInfo?: { name: string }; }
interface ExamAssignment { id: string; class: { name: string }; subject: { name: string }; examiner: { name: string }; date: string; syllabus?: string; start_time?: string; end_time?: string; }
interface Exam { id: string; exam_name: string; description: string; start_date: string; end_date: string; isPublished: boolean; status: string; assignments: ExamAssignment[]; }
interface DashboardData {
  attendTeacher: AttendanceInfo;
  attendStudent: AttendanceInfo;
  recentNotice: Notice[];
  recentHomework: Homework[];
  currentExam: Exam[];
  upcomingMeeting?: any[];
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
  school?: {
    id?: string;
    name?: string;
    avatar?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
}

function getGreeting(name: string, t?: (k: string) => string) {
  const h = new Date().getHours();
  const g = t 
    ? (h < 12 ? t('dashboard.goodMorning') : h < 17 ? t('dashboard.goodAfternoon') : t('dashboard.goodEvening'))
    : (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  const emoji = h < 12 ? '☀️' : h < 17 ? '👋' : '🌙';
  return { greeting: g, emoji, name: name.split(' ')[0] };
}

function getSchoolId() {
  try {
    const token = getToken();
    if (!token) return '29f05edb-8e0b-434c-a471-aa776308a1c1';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.schoolId || '29f05edb-8e0b-434c-a471-aa776308a1c1';
  } catch {
    return '29f05edb-8e0b-434c-a471-aa776308a1c1';
  }
}

function formatRoutineTime(timeString?: string) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  if (isNaN(h)) return timeString;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedH = h % 12 || 12;
  return `${formattedH}:${minutes || '00'} ${ampm}`;
}

function isRoutineActiveNow(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) return false;
  const now = new Date();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMinutes = sh * 60 + (sm || 0);
  const endMinutes = eh * 60 + (em || 0);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

function getMonthName(m: number, lang: string = 'en') {
  if (lang === 'bn') {
    return ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'][m];
  }
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
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  );
}

// ─── Area Chart ───────────────────────────────────────────────────────────────
function AreaChart({ data, height = 320 }: { data: { label: string, value: number, subLabel?: string, subColor?: string, stats?: { present: number, absent: number, leave: number, late: number, total: number } }[], height?: number }) {
  const { t } = useLanguage();
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

  if (!data || data.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>{t('common.noData')}</div>;

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
              <text x={padX - 5} y={y + 4} fontSize="10" fill="var(--muted-foreground)" textAnchor="end" fontWeight="600">{pct * 100}%</text>
              <line x1={padX + 5} y1={y} x2={Math.max(w, data.length * 40) - padX} y2={y} stroke="var(--border)" strokeDasharray="4 4" />
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
              
              <circle cx={x} cy={y} r={isHovered ? 7 : 5} fill="var(--card)" stroke="#a855f7" strokeWidth={isHovered ? 3 : 2} style={{ transition: 'all 0.2s' }} />
              {dayNum ? (
                <>
                  <text x={x} y={h - 22} fontSize="10" fill={isHovered ? "var(--muted-foreground)" : "var(--muted-foreground)"} textAnchor="middle" fontWeight={isHovered ? "bold" : "normal"}>{dayName}</text>
                  <text x={x} y={h - 10} fontSize="11" fill={isHovered ? "var(--foreground)" : "var(--muted-foreground)"} textAnchor="middle" fontWeight="bold">
                    {dayNum}
                  </text>
                </>
              ) : (
                <text x={x} y={h - 15} fontSize="11" fill={isHovered ? "var(--foreground)" : "var(--muted-foreground)"} textAnchor="middle" fontWeight="bold">
                  {d.label}
                </text>
              )}
              {d.subLabel && (
                <text x={x} y={h - 0} fontSize="10" fill={d.subColor || 'var(--muted-foreground)'} textAnchor="middle" fontWeight="bold">
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
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '0.75rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
          zIndex: 10,
          minWidth: '130px'
        }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
            {data[hoverIndex].label.replace(' ', ', ')} - {data[hoverIndex].value}%
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
            <span style={{ color: '#10b981' }}>{t('common.present')}:</span>
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{Math.round((data[hoverIndex].stats.present / data[hoverIndex].stats.total) * 100)}% ({data[hoverIndex].stats.present})</span>
            
            <span style={{ color: '#ef4444' }}>{t('common.absent')}:</span>
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{Math.round((data[hoverIndex].stats.absent / data[hoverIndex].stats.total) * 100)}% ({data[hoverIndex].stats.absent})</span>
            
            <span style={{ color: '#f59e0b' }}>{t('common.leave')}:</span>
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{Math.round((data[hoverIndex].stats.leave / data[hoverIndex].stats.total) * 100)}% ({data[hoverIndex].stats.leave})</span>
            
            <span style={{ color: '#8b5cf6' }}>{t('common.late')}:</span>
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{Math.round((data[hoverIndex].stats.late / data[hoverIndex].stats.total) * 100)}% ({data[hoverIndex].stats.late})</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bar Chart (for Teacher Attendance) ─────────────────────────────────────────
function BarChart({ data, height = 320 }: { data: { label: string, value: number, subLabel?: string, subColor?: string, stats?: { present: number, absent: number, leave: number, late: number, total: number }, dateStr?: string }[], height?: number }) {
  const { t } = useLanguage();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      }, 0);
    }
  }, [data]);

  const h = height;
  const padX = 35;
  const padY = 40;
  const barWidth = data.length > 20 ? 18 : 28;
  const gap = data.length > 20 ? 12 : 18;
  const totalBarSpace = barWidth + gap;
  const dynamicW = Math.max(600, padX * 2 + data.length * totalBarSpace);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        {t('common.noData')}
      </div>
    );
  }

  const maxVal = 100;
  const getY = (v: number) => h - padY - (v / maxVal) * (h - padY * 2 - 20);
  const chartHeight = h - padY * 2 - 20;

  const getBarX = (i: number) => {
    if (data.length <= 1) return dynamicW / 2 - barWidth / 2;
    return padX + i * totalBarSpace;
  };

  return (
    <div ref={scrollRef} style={{ width: '100%', overflowX: 'auto', overflowY: 'visible', position: 'relative' }}>
      <svg width={dynamicW} height={h} viewBox={`0 0 ${dynamicW} ${h}`} preserveAspectRatio="none" style={{ minWidth: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="barGradPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines and labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = getY(pct * 100);
          return (
            <g key={pct}>
              <text x={padX - 8} y={y + 4} fontSize="10" fill="var(--muted-foreground)" textAnchor="end" fontWeight="600">{pct * 100}%</text>
              <line x1={padX} y1={y} x2={dynamicW - 15} y2={y} stroke="var(--border)" strokeDasharray="4 4" />
            </g>
          );
        })}

        {/* Vertical Bars */}
        {data.map((d, i) => {
          const x = getBarX(i);
          const barH = (Math.max(0, Math.min(100, d.value)) / maxVal) * chartHeight;
          const y = h - padY - barH;
          const isHovered = hoverIndex === i;
          const [dayName, dayNum] = d.label.split(' ');

          return (
            <g
              key={i}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Invisible interactive hit area */}
              <rect x={x - gap / 2} y={0} width={totalBarSpace} height={h} fill="transparent" />

              {/* Background Track Column */}
              <rect
                x={x}
                y={h - padY - chartHeight}
                width={barWidth}
                height={chartHeight}
                rx={barWidth / 3.5}
                ry={barWidth / 3.5}
                fill="var(--muted)"
                stroke="var(--border)"
                strokeWidth="1"
              />

              {/* Active Bar Fill */}
              {barH > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={barWidth / 3.5}
                  ry={barWidth / 3.5}
                  fill={isHovered ? "url(#barGradHover)" : "url(#barGradPurple)"}
                  style={{
                    transition: 'all 0.25s ease',
                    filter: isHovered ? 'drop-shadow(0 6px 12px rgba(168, 85, 247, 0.35))' : 'none'
                  }}
                />
              )}

              {/* Top Percentage Label */}
              {d.value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={Math.max(16, y - 6)}
                  fontSize="9.5"
                  fontWeight="700"
                  fill={isHovered ? "#a855f7" : "var(--muted-foreground)"}
                  textAnchor="middle"
                >
                  {d.value}%
                </text>
              )}

              {/* Bottom Day / Month Labels */}
              {dayNum ? (
                <>
                  <text x={x + barWidth / 2} y={h - 22} fontSize="10" fill="var(--muted-foreground)" textAnchor="middle" fontWeight={isHovered ? "bold" : "normal"}>
                    {dayName}
                  </text>
                  <text x={x + barWidth / 2} y={h - 10} fontSize="11" fill={isHovered ? "var(--foreground)" : "var(--muted-foreground)"} textAnchor="middle" fontWeight="bold">
                    {dayNum}
                  </text>
                </>
              ) : (
                <text x={x + barWidth / 2} y={h - 15} fontSize="11" fill={isHovered ? "var(--foreground)" : "var(--muted-foreground)"} textAnchor="middle" fontWeight="bold">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Detailed Tooltip */}
      {hoverIndex !== null && data[hoverIndex]?.stats && (
        <div style={{
          position: 'absolute',
          left: Math.min(getBarX(hoverIndex) + 20, dynamicW - 160),
          top: Math.max(10, getY(data[hoverIndex].value) - 80),
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '0.75rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
          zIndex: 10,
          minWidth: '140px'
        }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
            {data[hoverIndex].label.replace(' ', ', ')} - {data[hoverIndex].value}%
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
            <span style={{ color: '#10b981' }}>{t('common.present')}:</span>
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{Math.round((data[hoverIndex].stats.present / (data[hoverIndex].stats.total || 1)) * 100)}% ({data[hoverIndex].stats.present})</span>
            
            <span style={{ color: '#ef4444' }}>{t('common.absent')}:</span>
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{Math.round((data[hoverIndex].stats.absent / (data[hoverIndex].stats.total || 1)) * 100)}% ({data[hoverIndex].stats.absent})</span>
            
            {data[hoverIndex].stats.leave > 0 && (
              <>
                <span style={{ color: '#f59e0b' }}>{t('common.leave')}:</span>
                <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{data[hoverIndex].stats.leave}</span>
              </>
            )}
            
            {data[hoverIndex].stats.late > 0 && (
              <>
                <span style={{ color: '#8b5cf6' }}>{t('common.late')}:</span>
                <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{data[hoverIndex].stats.late}</span>
              </>
            )}
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
        <div key={v} style={{ position: 'absolute', left: 0, right: 0, bottom: `${20 + (v / 100) * 70}px`, borderTop: '1px dashed var(--border)', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: 'var(--muted-foreground)', position: 'absolute', left: 0, transform: 'translateY(-50%)' }}>{v}</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '90px', paddingLeft: '20px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
            <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '70px' }}>
              <div style={{ width: '10px', background: '#6366f1', borderRadius: '3px 3px 0 0', height: `${(d.avg / 100) * 70}px`, transition: 'height 0.7s ease' }} />
              <div style={{ width: '10px', background: 'rgba(99, 102, 241, 0.35)', borderRadius: '3px 3px 0 0', height: `${(d.top / 100) * 70}px`, transition: 'height 0.7s ease' }} />
            </div>
            <span style={{ fontSize: '10px', color: 'var(--muted-foreground)', fontWeight: 600 }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Academic Calendar Types & Config ─────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  schoolId?: string;
  title: string;
  description?: string;
  category: string; // "VACATION" | "HOLIDAY" | "EXAM" | "EVENT" | "ACADEMIC" | "OTHER"
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  isHoliday?: boolean;
  targetAudience?: string;
  classIds?: string[];
  classes?: { id: string; name: string }[];
  color?: string;
  location?: string;
  attachmentUrl?: string | null;
  academicYear?: string;
  term?: string;
}

const CALENDAR_CATEGORY_CONFIG: Record<
  string,
  { label: string; defaultColor: string; bg: string; border: string; text: string; icon: string }
> = {
  VACATION: {
    label: 'Vacation',
    defaultColor: '#E53935',
    bg: 'rgba(229, 57, 53, 0.1)',
    border: 'rgba(229, 57, 53, 0.3)',
    text: '#E53935',
    icon: '🏖️',
  },
  HOLIDAY: {
    label: 'Holiday',
    defaultColor: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    text: '#D97706',
    icon: '🎉',
  },
  EXAM: {
    label: 'Exam & Result',
    defaultColor: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.3)',
    text: '#7C3AED',
    icon: '📝',
  },
  EVENT: {
    label: 'School Event',
    defaultColor: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
    text: '#2563EB',
    icon: '🏆',
  },
  ACADEMIC: {
    label: 'Academic Schedule',
    defaultColor: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    text: '#059669',
    icon: '📚',
  },
  OTHER: {
    label: 'Other',
    defaultColor: '#6B7280',
    bg: 'rgba(107, 114, 128, 0.1)',
    border: 'rgba(107, 114, 128, 0.3)',
    text: '#4B5563',
    icon: '📌',
  },
};

const FALLBACK_ACADEMIC_EVENTS: CalendarEvent[] = [
  {
    id: 'demo-1',
    title: 'World Teachers’ Day Celebration',
    description: 'Special morning assembly and appreciation ceremony organized by the student council.',
    category: 'EVENT',
    startDate: '2026-10-05T00:00:00.000Z',
    endDate: '2026-10-05T00:00:00.000Z',
    startTime: '09:00',
    endTime: '12:00',
    isAllDay: false,
    isHoliday: false,
    targetAudience: 'ALL',
    color: '#3B82F6',
    location: 'Main Auditorium',
  },
  {
    id: 'demo-2',
    title: 'Science Fair & Tech Exhibition',
    description: 'Inter-class science model competition and robotics demonstrations for students.',
    category: 'EVENT',
    startDate: '2026-10-12T00:00:00.000Z',
    endDate: '2026-10-13T00:00:00.000Z',
    startTime: '10:00',
    endTime: '15:30',
    isAllDay: false,
    isHoliday: false,
    targetAudience: 'ALL',
    color: '#3B82F6',
    location: 'Science Complex',
  },
  {
    id: 'demo-3',
    title: 'Parent-Teacher Meeting (PTM)',
    description: 'Review of student attendance, coursework, and quarterly examination preparedness.',
    category: 'ACADEMIC',
    startDate: '2026-10-16T00:00:00.000Z',
    endDate: '2026-10-16T00:00:00.000Z',
    startTime: '14:00',
    endTime: '17:00',
    isAllDay: false,
    isHoliday: false,
    targetAudience: 'PARENT',
    color: '#10B981',
    location: 'Respective Classrooms',
  },
  {
    id: 'demo-4',
    title: 'Durga Puja & Autumn Vacation',
    description: 'School closed for autumn vacation. Administrative inquiries remain open via email.',
    category: 'VACATION',
    startDate: '2026-10-19T00:00:00.000Z',
    endDate: '2026-10-23T00:00:00.000Z',
    startTime: '00:00',
    endTime: '23:59',
    isAllDay: true,
    isHoliday: true,
    targetAudience: 'ALL',
    color: '#E53935',
    location: 'Campus Wide',
  },
  {
    id: 'demo-5',
    title: 'Mid-Term Examination 2026',
    description: 'Comprehensive mid-term exams across all core subjects. Admit cards required for entry.',
    category: 'EXAM',
    startDate: '2026-10-26T00:00:00.000Z',
    endDate: '2026-10-31T00:00:00.000Z',
    startTime: '09:00',
    endTime: '13:00',
    isAllDay: false,
    isHoliday: false,
    targetAudience: 'STUDENT',
    color: '#8B5CF6',
    location: 'Examination Halls',
  },
  {
    id: 'demo-6',
    title: 'Class Assessment & Revision Week',
    description: 'Subject-wise revision, syllabus check, and personalized student feedback.',
    category: 'ACADEMIC',
    startDate: '2026-11-08T00:00:00.000Z',
    endDate: '2026-11-12T00:00:00.000Z',
    startTime: '08:30',
    endTime: '14:00',
    isAllDay: true,
    isHoliday: false,
    targetAudience: 'ALL',
    color: '#10B981',
    location: 'All Classes',
  },
  {
    id: 'demo-7',
    title: 'Annual Sports Meet 2026',
    description: 'Track and field events, house competitions, and trophy presentation ceremony.',
    category: 'EVENT',
    startDate: '2026-11-18T00:00:00.000Z',
    endDate: '2026-11-20T00:00:00.000Z',
    startTime: '08:00',
    endTime: '16:00',
    isAllDay: false,
    isHoliday: false,
    targetAudience: 'ALL',
    color: '#3B82F6',
    location: 'Main Sports Stadium',
  },
  {
    id: 'demo-8',
    title: 'Victory Day (National Holiday)',
    description: 'National holiday in honor of Victory Day. School morning flag-raising ceremony.',
    category: 'HOLIDAY',
    startDate: '2026-12-16T00:00:00.000Z',
    endDate: '2026-12-16T00:00:00.000Z',
    startTime: '00:00',
    endTime: '23:59',
    isAllDay: true,
    isHoliday: true,
    targetAudience: 'ALL',
    color: '#F59E0B',
    location: 'Campus Flag Plaza',
  },
  {
    id: 'demo-9',
    title: 'Winter Vacation',
    description: 'Annual winter recess for students and faculty. Classes resume in January.',
    category: 'VACATION',
    startDate: '2026-12-20T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    startTime: '00:00',
    endTime: '23:59',
    isAllDay: true,
    isHoliday: true,
    targetAudience: 'ALL',
    color: '#E53935',
    location: 'Campus Wide',
  },
  {
    id: 'demo-10',
    title: 'Summer Vacation 2026',
    description: 'Annual summer break for all grades.',
    category: 'VACATION',
    startDate: '2026-06-01T00:00:00.000Z',
    endDate: '2026-06-15T00:00:00.000Z',
    startTime: '00:00',
    endTime: '23:59',
    isAllDay: true,
    isHoliday: true,
    targetAudience: 'ALL',
    color: '#E53935',
  },
  {
    id: 'demo-11',
    title: 'Eid-ul-Adha Holiday',
    description: 'Holy celebration of Eid-ul-Adha.',
    category: 'HOLIDAY',
    startDate: '2026-06-17T00:00:00.000Z',
    endDate: '2026-06-22T00:00:00.000Z',
    startTime: '00:00',
    endTime: '23:59',
    isAllDay: true,
    isHoliday: true,
    targetAudience: 'ALL',
    color: '#F59E0B',
  },
];

function formatEventDateRange(startStr?: string, endStr?: string, lang: string = 'en') {
  if (!startStr) return '';
  try {
    const s = new Date(startStr);
    const e = endStr ? new Date(endStr) : s;
    const opt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    if (s.toDateString() === e.toDateString()) {
      return s.toLocaleDateString(locale, { ...opt, year: 'numeric' });
    }
    const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysLabel = lang === 'bn' ? `${diffDays} দিন` : `${diffDays} days`;
    return `${s.toLocaleDateString(locale, opt)} – ${e.toLocaleDateString(locale, { ...opt, year: 'numeric' })} (${daysLabel})`;
  } catch {
    return `${startStr} - ${endStr}`;
  }
}

function formatHoverDate(dateStr: string, lang: string = 'en') {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// ─── Calendar Widget ──────────────────────────────────────────────────────────
function CalendarWidget({ today }: { today: Date }) {
  const { language } = useLanguage();
  const [viewDate, setViewDate] = useState(today);
  const [events, setEvents] = useState<CalendarEvent[]>(FALLBACK_ACADEMIC_EVENTS);
  const [loading, setLoading] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<{
    day: number;
    dateString: string;
    events: CalendarEvent[];
    rect: DOMRect;
  } | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Fetch academic calendar events from API
  useEffect(() => {
    let ignore = false;
    async function loadEvents() {
      setLoading(true);
      try {
        const token = getToken();
        const res = await fetch('https://smart-school-backend-production.up.railway.app/admin/academic-calendar', {
          headers: {
            accept: '*/*',
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          const list: CalendarEvent[] = Array.isArray(json) ? json : json.data || [];
          if (!ignore) {
            if (list.length > 0) {
              setEvents(list);
            } else {
              setEvents(FALLBACK_ACADEMIC_EVENTS);
            }
          }
        }
      } catch {
        // Fallback already populated
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadEvents();
    return () => {
      ignore = true;
    };
  }, []);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prev = () => setViewDate(new Date(year, month - 1, 1));
  const next = () => setViewDate(new Date(year, month + 1, 1));
  const goToToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const isCurrentMonthView = viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();

  // Events occurring in current view month
  const monthEvents = useMemo(() => {
    const mmStr = String(month + 1).padStart(2, '0');
    const startM = `${year}-${mmStr}-01`;
    const endM = `${year}-${mmStr}-${daysInMonth.toString().padStart(2, '0')}`;
    return events.filter((ev) => {
      if (!ev.startDate) return false;
      const s = ev.startDate.split('T')[0];
      const e = (ev.endDate || ev.startDate).split('T')[0];
      return s <= endM && e >= startM;
    }).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }, [events, year, month, daysInMonth]);

  const holidaysCount = useMemo(() => {
    return monthEvents.filter((e) => e.isHoliday || e.category === 'HOLIDAY' || e.category === 'VACATION').length;
  }, [monthEvents]);

  return (
    <div>
      {/* Month Navigation & Today button */}
      <div className="nd-cal-header" style={{ marginBottom: '0.6rem' }}>
        <button
          className="nd-cal-nav"
          onClick={prev}
          title={language === 'bn' ? 'পূর্ববর্তী মাস' : 'Previous Month'}
          type="button"
        >
          <ChevronLeft size={14} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="nd-cal-title">
            {getMonthName(month, language)} {year}
          </span>
          {loading && (
            <Loader2 size={12} style={{ animation: 'nd-spin 1s linear infinite', color: '#6366f1' }} />
          )}
          {!isCurrentMonthView && (
            <button
              onClick={goToToday}
              type="button"
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: '#6366f1',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '4px',
                padding: '1px 5px',
                cursor: 'pointer',
              }}
              title={language === 'bn' ? 'চলতি মাসে যান' : 'Go to current month'}
            >
              {language === 'bn' ? 'আজ' : 'Today'}
            </button>
          )}
        </div>
        <button
          className="nd-cal-nav"
          onClick={next}
          title={language === 'bn' ? 'পরবর্তী মাস' : 'Next Month'}
          type="button"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Month summary pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', padding: '0 2px' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>
          {monthEvents.length} {language === 'bn' ? 'টি ইভেন্ট' : monthEvents.length === 1 ? 'event' : 'events'}
          {holidaysCount > 0 && ` · ${holidaysCount} ${language === 'bn' ? 'ছুটি' : holidaysCount === 1 ? 'holiday' : 'holidays'}`}
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--muted-foreground)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
          {language === 'bn' ? 'হোভার করুন' : 'Hover for details'}
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="nd-cal-grid">
        {(language === 'bn' ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'] : ['SUN','MON','TUE','WED','THU','FRI','SAT']).map((d) => (
          <div key={d} className="nd-cal-dow">{d}</div>
        ))}
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="nd-cal-day empty" />;
          }

          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const matchingEvents = events.filter((ev) => {
            if (!ev.startDate) return false;
            const s = ev.startDate.split('T')[0];
            const e = (ev.endDate || ev.startDate).split('T')[0];
            return ds >= s && ds <= e;
          });
          const hasEvents = matchingEvents.length > 0;
          const isHolidayDay = matchingEvents.some((e) => e.isHoliday || e.category === 'HOLIDAY' || e.category === 'VACATION');

          return (
            <div
              key={`day-${day}`}
              className={`nd-cal-day${isToday ? ' today' : ''}${hasEvents ? ' has-events' : ''}${isHolidayDay ? ' holiday-day' : ''}`}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredDate({ day, dateString: ds, events: matchingEvents, rect });
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredDate({ day, dateString: ds, events: matchingEvents, rect });
              }}
              onMouseLeave={() => setHoveredDate(null)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px 0',
                cursor: 'pointer',
                borderRadius: '8px',
                transition: 'all 0.15s ease',
                ...(!isToday && isHolidayDay ? {
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px dashed rgba(239, 68, 68, 0.35)',
                } : !isToday && hasEvents ? {
                  background: 'rgba(99, 102, 241, 0.07)',
                  border: '1px solid rgba(99, 102, 241, 0.22)',
                } : {}),
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: isToday ? 800 : hasEvents ? 600 : 500,
                  color: isToday ? '#fff' : isHolidayDay ? '#ef4444' : 'var(--foreground)',
                  lineHeight: 1.1,
                }}
              >
                {day}
              </span>

              {/* Event category indicator dots */}
              {hasEvents && (
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                  {matchingEvents.slice(0, 3).map((ev, dotIdx) => {
                    const cfg = CALENDAR_CATEGORY_CONFIG[ev.category] || CALENDAR_CATEGORY_CONFIG.OTHER;
                    const dotColor = isToday ? '#ffffff' : (ev.color || cfg.defaultColor);
                    return (
                      <span
                        key={dotIdx}
                        style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          backgroundColor: dotColor,
                          boxShadow: isToday ? '0 0 2px rgba(0,0,0,0.4)' : 'none',
                        }}
                      />
                    );
                  })}
                  {matchingEvents.length > 3 && (
                    <span style={{ fontSize: '7px', fontWeight: 700, color: isToday ? '#fff' : 'var(--muted-foreground)', lineHeight: 1 }}>
                      +
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Hover Details Popover via Portal */}
      {hoveredDate && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            left: Math.max(12, Math.min(window.innerWidth - 312, hoveredDate.rect.left + hoveredDate.rect.width / 2 - 150)),
            top: hoveredDate.rect.top > 270
              ? hoveredDate.rect.top - 8
              : hoveredDate.rect.bottom + 8,
            transform: hoveredDate.rect.top > 270 ? 'translateY(-100%)' : 'none',
            width: '300px',
            maxWidth: 'calc(100vw - 24px)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '0.85rem',
            padding: '0.85rem',
            boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border)',
            pointerEvents: 'none',
            zIndex: 99999,
          }}
        >
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              [hoveredDate.rect.top > 270 ? 'bottom' : 'top']: '-6px',
              left: Math.max(
                16,
                Math.min(
                  270,
                  hoveredDate.rect.left + hoveredDate.rect.width / 2 - Math.max(12, Math.min(window.innerWidth - 312, hoveredDate.rect.left + hoveredDate.rect.width / 2 - 150))
                )
              ),
              transform: 'translateX(-50%) rotate(45deg)',
              width: '12px',
              height: '12px',
              background: 'var(--card)',
              borderRight: hoveredDate.rect.top > 270 ? '1px solid var(--border)' : 'none',
              borderBottom: hoveredDate.rect.top > 270 ? '1px solid var(--border)' : 'none',
              borderLeft: hoveredDate.rect.top > 270 ? 'none' : '1px solid var(--border)',
              borderTop: hoveredDate.rect.top > 270 ? 'none' : '1px solid var(--border)',
            }}
          />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.45rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CalendarDays size={14} color="#6366f1" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--foreground)' }}>
                {formatHoverDate(hoveredDate.dateString, language)}
              </span>
            </div>
            {hoveredDate.events.length > 0 ? (
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '999px',
                background: hoveredDate.events.some((e) => e.isHoliday) ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                color: hoveredDate.events.some((e) => e.isHoliday) ? '#ef4444' : '#6366f1',
                border: hoveredDate.events.some((e) => e.isHoliday) ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
              }}>
                {hoveredDate.events.length} {language === 'bn' ? 'টি ইভেন্ট' : hoveredDate.events.length === 1 ? 'Event' : 'Events'}
              </span>
            ) : (
              <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>
                {language === 'bn' ? 'স্বাভাবিক দিন' : 'Regular Day'}
              </span>
            )}
          </div>

          {/* Events or Empty */}
          {hoveredDate.events.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: '250px', overflowY: 'auto' }}>
              {hoveredDate.events.map((ev, idx) => {
                const cfg = CALENDAR_CATEGORY_CONFIG[ev.category] || CALENDAR_CATEGORY_CONFIG.OTHER;
                const color = ev.color || cfg.defaultColor;
                return (
                  <div
                    key={ev.id || idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      padding: '0.5rem 0.6rem',
                      borderRadius: '8px',
                      background: `${color}0D`,
                      border: `1px solid ${color}33`,
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    {/* Category + Holiday Tag */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </span>
                      {ev.isHoliday && (
                        <span style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          color: '#ef4444',
                          background: 'rgba(239, 68, 68, 0.12)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                        }}>
                          {language === 'bn' ? 'বিদ্যালয় বন্ধ' : 'School Closed'}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.3 }}>
                      {ev.title}
                    </div>

                    {/* Multi-day date range */}
                    {ev.startDate && ev.endDate && ev.startDate.split('T')[0] !== ev.endDate.split('T')[0] && (
                      <div style={{ fontSize: '0.66rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={11} color={color} />
                        <span>{formatEventDateRange(ev.startDate, ev.endDate, language)}</span>
                      </div>
                    )}

                    {/* Timing */}
                    <div style={{ fontSize: '0.66rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} color={color} />
                      <span>
                        {ev.isAllDay
                          ? (language === 'bn' ? 'সারাদিন' : 'All Day')
                          : `${formatRoutineTime(ev.startTime)} - ${formatRoutineTime(ev.endTime)}`}
                      </span>
                    </div>

                    {/* Location */}
                    {ev.location && (
                      <div style={{ fontSize: '0.66rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} color={color} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.location}</span>
                      </div>
                    )}

                    {/* Target Audience */}
                    {ev.targetAudience && ev.targetAudience !== 'ALL' && (
                      <div style={{ fontSize: '0.66rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={11} color={color} />
                        <span>{ev.targetAudience}</span>
                      </div>
                    )}

                    {/* Description */}
                    {ev.description && (
                      <div style={{
                        fontSize: '0.65rem',
                        color: 'var(--muted-foreground)',
                        marginTop: '2px',
                        lineHeight: 1.35,
                        maxHeight: '40px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {ev.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '0.35rem 0.2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', margin: 0 }}>
                {language === 'bn'
                  ? 'এই তারিখে কোনো নির্ধারিত একাডেমিক ইভেন্ট বা ছুটি নেই।'
                  : 'No academic events or holidays scheduled for this date.'}
              </p>
              <span style={{ fontSize: '0.64rem', color: '#10b981', fontWeight: 600, display: 'inline-block', marginTop: '4px' }}>
                ✓ {language === 'bn' ? 'স্বাভাবিক ক্লাসের সময়সূচি' : 'Regular academic schedule'}
              </span>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Category Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 10px',
        justifyContent: 'center',
        marginTop: '0.75rem',
        paddingTop: '0.6rem',
        borderTop: '1px solid var(--border)'
      }}>
        {Object.entries(CALENDAR_CATEGORY_CONFIG).slice(0, 5).map(([key, cfg]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.63rem', color: 'var(--muted-foreground)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cfg.defaultColor }} />
            <span>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Month Highlights List (if any) */}
      {monthEvents.length > 0 && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {language === 'bn' ? 'এই মাসের ইভেন্টসমূহ' : 'Events This Month'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '140px', overflowY: 'auto' }}>
            {monthEvents.slice(0, 3).map((ev, idx) => {
              const cfg = CALENDAR_CATEGORY_CONFIG[ev.category] || CALENDAR_CATEGORY_CONFIG.OTHER;
              const color = ev.color || cfg.defaultColor;
              const sDate = ev.startDate?.split('T')[0] || '';
              const eDate = ev.endDate?.split('T')[0] || sDate;
              const [, sm, sd] = sDate.split('-');
              const [, em, ed] = eDate.split('-');
              const startMonthName = getMonthName(parseInt(sm, 10) - 1, language).slice(0, 3);
              const endMonthName = getMonthName(parseInt(em, 10) - 1, language).slice(0, 3);
              const datePill = sDate === eDate
                ? `${sd} ${startMonthName}`
                : sm === em
                  ? `${sd}-${ed} ${startMonthName}`
                  : `${sd} ${startMonthName} - ${ed} ${endMonthName}`;

              return (
                <div
                  key={ev.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.35rem 0.5rem',
                    borderRadius: '6px',
                    background: 'var(--muted)',
                    border: '1px solid var(--border)',
                    fontSize: '0.7rem',
                  }}
                >
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: color,
                    background: `${color}1A`,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    {datePill}
                  </span>
                  <span style={{
                    fontWeight: 600,
                    color: 'var(--foreground)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}>
                    {ev.title}
                  </span>
                  {ev.isHoliday && (
                    <span style={{
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      color: '#ef4444',
                      background: 'rgba(239, 68, 68, 0.1)',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap'
                    }}>
                      {language === 'bn' ? 'ছুটি' : 'Holiday'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Link to full academic calendar */}
      <Link
        href="/academic-calendar"
        style={{
          marginTop: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '0.45rem',
          borderRadius: '0.5rem',
          background: 'var(--muted)',
          color: 'var(--foreground)',
          fontSize: '0.72rem',
          fontWeight: 600,
          textDecoration: 'none',
          border: '1px solid var(--border)',
          transition: 'all 0.15s ease',
        }}
      >
        <CalendarDays size={13} color="#6366f1" />
        <span>{language === 'bn' ? 'সম্পূর্ণ একাডেমিক ক্যালেন্ডার দেখুন' : 'Open Academic Calendar'}</span>
        <ChevronRight size={13} />
      </Link>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { language, t } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [studentAttendanceView, setStudentAttendanceView] = useState<'month' | 'year'>('month');
  const [teacherAttendanceView, setTeacherAttendanceView] = useState<'month' | 'year'>('month');
  const [hwFilterClass, setHwFilterClass] = useState('All');
  const [studentClassFilter, setStudentClassFilter] = useState('All');
  const [studentStatusFilter, setStudentStatusFilter] = useState('All');
  const [hoveredTeacher, setHoveredTeacher] = useState<{
    data: any;
    x: number;
    y: number;
    fitsAbove: boolean;
  } | null>(null);
  const [hoveredStudent, setHoveredStudent] = useState<{
    data: any;
    x: number;
    y: number;
    fitsAbove: boolean;
  } | null>(null);
  const [showTeacherMap, setShowTeacherMap] = useState(false);
  const [teacherAttendanceData, setTeacherAttendanceData] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [schedClassFilter, setSchedClassFilter] = useState('All');
  const [schedSectionFilter, setSchedSectionFilter] = useState('All');
  const [schedTeacherFilter, setSchedTeacherFilter] = useState('All');
  const [schedSubjectFilter, setSchedSubjectFilter] = useState('All');
  const [studentPerf, setStudentPerf] = useState<any[]>([]);
  const [teacherPerf, setTeacherPerf] = useState<any[]>([]);
  const [perfLoading, setPerfLoading] = useState(true);
  const [hoveredPerfStudent, setHoveredPerfStudent] = useState<any | null>(null);
  const [hoveredPerfTeacher, setHoveredPerfTeacher] = useState<any | null>(null);
  const [isNovaChatOpen, setIsNovaChatOpen] = useState(false);
  const [novaMessages, setNovaMessages] = useState<Array<{ role: 'ai' | 'user'; text: string; time: string }>>([
    {
      role: 'ai',
      text: 'Hello! I am Nova AI, your AI Teaching Assistant for SchoolCare. How can I help you with lesson plans, schedules, or classroom insights today?',
      time: 'Just now'
    }
  ]);
  const [novaInput, setNovaInput] = useState('');
  const [isNovaTyping, setIsNovaTyping] = useState(false);
  const [isNovaCardMinimized, setIsNovaCardMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  useEffect(() => {
    setMounted(true);
  }, []);

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
      } catch { /* use dummy data */ }

      try {
        const mRes = await fetch('https://smart-school-backend-production.up.railway.app/online-classes',
          { headers: { Authorization: `Bearer ${getToken()}`, Accept: '*/*' } });
        if (mRes.ok) {
          const mJson = await mRes.json();
          setMeetings(mJson.data || []);
        }
      } catch {}

      try {
        const sId = getSchoolId();
        const rRes = await fetch(`https://smart-school-backend-production.up.railway.app/general/routine?schoolId=${sId}`,
          { headers: { Authorization: `Bearer ${getToken()}`, Accept: '*/*' } });
        if (rRes.ok) {
          const rJson = await rRes.json();
          setRoutines(rJson.data || []);
        }
      } catch {}

      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchTeacherData() {
      const yyyy = today.getFullYear();
      let startD = '';
      let endD = '';
      
      if (teacherAttendanceView === 'month') {
        const mm = (today.getMonth() + 1).toString().padStart(2, '0');
        const daysInMonth = new Date(yyyy, today.getMonth() + 1, 0).getDate();
        startD = `${yyyy}-${mm}-01`;
        endD = `${yyyy}-${mm}-${daysInMonth.toString().padStart(2, '0')}`;
      } else {
        startD = `${yyyy}-01-01`;
        endD = `${yyyy}-12-31`;
      }

      try {
        const tRes = await fetch(`https://smart-school-backend-production.up.railway.app/admin/teacher-attendance?startDate=${startD}&endDate=${endD}`,
          { headers: { Authorization: `Bearer ${getToken()}`, Accept: '*/*' } });
        if (tRes.ok) {
          const tJson = await tRes.json();
          setTeacherAttendanceData(tJson.data || []);
        }
      } catch (err) {}
    }
    fetchTeacherData();
  }, [teacherAttendanceView]);

  useEffect(() => {
    const fetchPerf = async () => {
      setPerfLoading(true);
      try {
        const mm = today.getMonth() + 1;
        const yyyy = today.getFullYear();
        const headers = { accept: '*/*', Authorization: `Bearer ${getToken()}` };
        const [sRes, tRes] = await Promise.all([
          fetch(`https://smart-school-backend-production.up.railway.app/performance/student?month=${mm}&year=${yyyy}`, { headers }),
          fetch(`https://smart-school-backend-production.up.railway.app/performance/teacher?month=${mm}&year=${yyyy}`, { headers }),
        ]);
        const sJson = await sRes.json();
        const tJson = await tRes.json();
        const sData = Array.isArray(sJson) ? sJson : Array.isArray(sJson.data) ? sJson.data : sJson.data ? [sJson.data] : [];
        const tData = Array.isArray(tJson) ? tJson : Array.isArray(tJson.data) ? tJson.data : tJson.data ? [tJson.data] : [];
        setStudentPerf(sData);
        setTeacherPerf(tData);
      } catch (e) { console.error(e); }
      finally { setPerfLoading(false); }
    };
    fetchPerf();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const { greeting, emoji, name } = getGreeting(userProfile?.name || 'Admin', t);

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



  const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const todayRoutines = routines.filter(
    (r: any) => r.day && r.day.toLowerCase() === todayDayName.toLowerCase()
  );

  const availableClasses: string[] = Array.from(
    new Set(todayRoutines.map((r: any) => r.classEntity?.name).filter(Boolean))
  ).sort() as string[];

  const availableSections: string[] = Array.from(
    new Set(
      todayRoutines
        .filter((r: any) => schedClassFilter === 'All' || r.classEntity?.name === schedClassFilter)
        .map((r: any) => r.sectionEntity?.name)
        .filter(Boolean)
    )
  ).sort() as string[];

  const availableTeachers: string[] = Array.from(
    new Set(todayRoutines.map((r: any) => r.teacherEntity?.name).filter(Boolean))
  ).sort() as string[];

  const availableSubjects: string[] = Array.from(
    new Set(todayRoutines.map((r: any) => r.subjectEntity?.name).filter(Boolean))
  ).sort() as string[];

  const filteredTodayRoutines = todayRoutines
    .filter((r: any) => {
      if (schedClassFilter !== 'All' && r.classEntity?.name !== schedClassFilter) return false;
      if (schedSectionFilter !== 'All' && r.sectionEntity?.name !== schedSectionFilter) return false;
      if (schedTeacherFilter !== 'All' && r.teacherEntity?.name !== schedTeacherFilter) return false;
      if (schedSubjectFilter !== 'All' && r.subjectEntity?.name !== schedSubjectFilter) return false;
      return true;
    })
    .sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''));

  const schoolName = userProfile?.school?.name || 'SchoolCare Academy';

  useEffect(() => {
    if (userProfile?.school?.name) {
      setNovaMessages(prev => {
        if (prev.length === 1 && prev[0].role === 'ai') {
          return [
            {
              role: 'ai',
              text: `Hello! I am Nova AI, your dedicated teaching assistant for ${userProfile.school?.name}, powered by SchoolCare. How can I assist you today?`,
              time: 'Just now'
            }
          ];
        }
        return prev;
      });
    }
  }, [userProfile?.school?.name]);

  useEffect(() => {
    if (isNovaChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [novaMessages, isNovaChatOpen]);

  const handleSendNovaMessage = (overrideText?: string) => {
    const text = (overrideText || novaInput).trim();
    if (!text || isNovaTyping) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNovaMessages(prev => [...prev, { role: 'user', text, time: nowTime }]);
    if (!overrideText) setNovaInput('');
    setIsNovaTyping(true);

    setTimeout(() => {
      let reply = `Here to assist ${schoolName} with SchoolCare!`;
      const lower = text.toLowerCase();
      if (lower.includes('schedule') || lower.includes('routine')) {
        reply = `For today at ${schoolName}, you have ${filteredTodayRoutines.length} classes scheduled. Check the ${t('dashboard.todaySchedule')} section on the dashboard for details!`;
      } else if (lower.includes('lesson') || lower.includes('plan')) {
        reply = `Nova AI Lesson Tip for ${schoolName}: Structure your upcoming session with: 1) 5-min recap, 2) 15-min core topic teaching, 3) 15-min interactive student activity, and 4) 5-min wrap-up & homework briefing.`;
      } else if (lower.includes('attendance')) {
        reply = `Today's attendance at ${schoolName}: Teachers: ${d.attendTeacher?.present ?? 0}/${d.attendTeacher?.totalTeachers ?? 0} (${d.attendTeacher?.attendanceRate ?? 0}%), Students: ${d.attendStudent?.present ?? 0}/${d.attendStudent?.totalStudents ?? 0} (${d.attendStudent?.attendanceRate ?? 0}%).`;
      } else if (lower.includes('homework')) {
        reply = `There are ${d.recentHomework?.length || 0} homework assignments posted today for ${schoolName}. All records are synced with SchoolCare.`;
      } else {
        reply = `I have noted that for ${schoolName}! SchoolCare Nova AI is learning your classroom preferences to assist you smarter & faster.`;
      }
      setNovaMessages(prev => [...prev, {
        role: 'ai',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsNovaTyping(false);
    }, 600);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={36} style={{ animation: 'nd-spin 1s linear infinite', color: 'var(--primary)' }} />
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Loading map...</p>
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

  const getDayName = (dateStr: string) => new Date(dateStr).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short' });
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
        label: `${dd.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short' })} ${dd.getDate()}`,
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

  const monthLabels = language === 'bn'
    ? ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dummyYearlyData = [
    { label: monthLabels[0], value: 0 }, { label: monthLabels[1], value: 0 }, { label: monthLabels[2], value: 0 },
    { label: monthLabels[3], value: 0 }, { label: monthLabels[4], value: 48 }, { label: monthLabels[5], value: 74 },
    { label: monthLabels[6], value: 46 }, { label: monthLabels[7], value: 82 }, { label: monthLabels[8], value: 85 },
    { label: monthLabels[9], value: 78 }, { label: monthLabels[10], value: 0 }, { label: monthLabels[11], value: 0 }
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
  if (teacherAttendanceData) {
    const grouped = (teacherAttendanceData || []).reduce((acc, curr) => {
      if (!curr.date) return acc;
      const dStr = curr.date.split('T')[0];
      if (!acc[dStr]) acc[dStr] = new Set();
      acc[dStr].add(curr.teacherId);
      return acc;
    }, {} as Record<string, Set<string>>);
    
    computedDailyTeacherData = Array.from({ length: today.getDate() }).map((_, i) => {
      const iterDate = new Date(today.getFullYear(), today.getMonth(), i + 1);
      const dateStr = `${iterDate.getFullYear()}-${(iterDate.getMonth()+1).toString().padStart(2,'0')}-${iterDate.getDate().toString().padStart(2,'0')}`;
      
      const presentCount = grouped[dateStr] ? grouped[dateStr].size : 0;
      const totalCount = d.attendTeacher?.totalTeachers || 24;
      const absentCount = Math.max(0, totalCount - presentCount);
      const total = presentCount + absentCount;
      const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
      
      return {
        label: `${getDayName(dateStr)} ${iterDate.getDate()}`,
        value: rate,
        subLabel: `${rate}%`,
        subColor: rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444',
        stats: { present: presentCount, absent: absentCount, leave: 0, late: 0, total: total },
        dateStr
      };
    }).filter(item => item.stats.present > 0);
  }

  let computedYearlyTeacherData: any[] = [];
  if (teacherAttendanceData && teacherAttendanceView === 'year') {
    computedYearlyTeacherData = monthLabels.map((monthName, index) => {
      const mm = (index + 1).toString().padStart(2, '0');
      const recordsInMonth = (teacherAttendanceData || []).filter(curr => curr.date && curr.date.startsWith(`${today.getFullYear()}-${mm}`));
      
      const groupedByDate = recordsInMonth.reduce((acc, curr) => {
        const dStr = curr.date.split('T')[0];
        if (!acc[dStr]) acc[dStr] = new Set();
        acc[dStr].add(curr.teacherId);
        return acc;
      }, {} as Record<string, Set<string>>);

      const daysRecorded = Object.keys(groupedByDate).length;
      let averageRate = 0;
      const totalCount = d.attendTeacher?.totalTeachers || 24;

      if (daysRecorded > 0) {
        let sumRates = 0;
        Object.values(groupedByDate).forEach((set: any) => {
          sumRates += (set.size / totalCount) * 100;
        });
        averageRate = Math.round(sumRates / daysRecorded);
      }
      
      const presentCount = Object.values(groupedByDate).reduce((sum: number, set: any) => sum + set.size, 0);
      const absentCount = (daysRecorded * totalCount) - presentCount;
      const totalPossible = daysRecorded * totalCount;
      
      return {
        label: monthName,
        value: averageRate,
        subLabel: averageRate > 0 ? `${averageRate}%` : '-',
        subColor: averageRate >= 80 ? '#10b981' : averageRate >= 60 ? '#f59e0b' : '#ef4444',
        stats: { present: presentCount, absent: absentCount, leave: 0, late: 0, total: totalPossible }
      };
    });
  }

  const studentChartData = studentAttendanceView === 'month' 
    ? (_dailyData.length > 0 ? _dailyData : generateMonthlyDays())
    : dummyYearlyData;

  const teacherChartData = teacherAttendanceView === 'month'
    ? (computedDailyTeacherData.length > 0 ? computedDailyTeacherData : (_dailyTeacherData.length > 0 ? _dailyTeacherData : generateMonthlyDays()))
    : (computedYearlyTeacherData.length > 0 ? computedYearlyTeacherData : dummyYearlyData);

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
            
            {/* {t('dashboard.studentAttendance')} Chart Card */}
            <div className="nd-section-card" style={{ padding: '1.5rem', borderRadius: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <BarChart3 size={24} color="#a855f7" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {studentAttendanceView === 'month' ? `${getMonthName(today.getMonth(), language)} ${today.getFullYear()}` : t('dashboard.monthlyOverview')}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
                      {t('dashboard.studentAttendance')}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setStudentAttendanceView(studentAttendanceView === 'month' ? 'year' : 'month')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  <ArrowLeftRight size={14} /> {studentAttendanceView === 'month' ? t('dashboard.monthly') : t('dashboard.daily')}
                </button>
              </div>

              {true && (
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a855f7' }}>{(d.attendStudent as any)?.monthlySummary?.daysRecorded || 0}/{(d.attendStudent as any)?.monthlySummary?.daysInMonth || 31}d</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t('dashboard.recorded')}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>{(d.attendStudent as any)?.monthlySummary?.totalPresent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t('common.present')}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>{(d.attendStudent as any)?.monthlySummary?.totalAbsent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t('common.absent')}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>{(d.attendStudent as any)?.monthlySummary?.totalLeave || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t('common.leave')}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8b5cf6' }}>{(d.attendStudent as any)?.monthlySummary?.totalLate || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t('common.late')}</p>
                  </div>
                </div>
              )}

              <div style={{ height: '320px', marginTop: '3rem' }}>
                <AreaChart data={studentChartData} height={320} />
              </div>
            </div>

            {/* {t('dashboard.teacherAttendance')} Chart Card */}
            <div className="nd-section-card" style={{ padding: '1.5rem', borderRadius: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <BarChart3 size={24} color="#a855f7" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      {teacherAttendanceView === 'month' ? `${getMonthName(today.getMonth(), language)} ${today.getFullYear()}` : t('dashboard.monthlyOverview')}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
                      {t('dashboard.teacherAttendance')}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                  <button 
                    onClick={() => setShowTeacherMap(!showTeacherMap)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: showTeacherMap ? '#a855f7' : 'var(--muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    <MapPin size={14} /> {showTeacherMap ? t('dashboard.hideMap') : t('dashboard.map')}
                  </button>
                  <button 
                    onClick={() => setTeacherAttendanceView(teacherAttendanceView === 'month' ? 'year' : 'month')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    <ArrowLeftRight size={14} /> {teacherAttendanceView === 'month' ? t('dashboard.monthly') : t('dashboard.daily')}
                  </button>
                </div>
              </div>

              {true && (
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a855f7' }}>{(d.attendTeacher as any)?.monthlySummary?.daysRecorded || 0}/{(d.attendTeacher as any)?.monthlySummary?.daysInMonth || 31}d</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t('dashboard.recorded')}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>{(d.attendTeacher as any)?.monthlySummary?.totalPresent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t('common.present')}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>{(d.attendTeacher as any)?.monthlySummary?.totalAbsent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t('common.absent')}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>{(d.attendTeacher as any)?.monthlySummary?.totalLeave || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t('common.leave')}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8b5cf6' }}>{(d.attendTeacher as any)?.monthlySummary?.totalLate || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t('common.late')}</p>
                  </div>
                </div>
              )}

              <div style={{ height: '320px', marginTop: '3rem' }}>
                {showTeacherMap ? (
                  <TeacherMap data={teacherAttendanceData} />
                ) : (
                  <BarChart data={teacherChartData} height={320} />
                )}
              </div>
            </div>

          </div>
          
          {/* ── 3-col grid ── */}
          <div className="nd-3col">

            {/* {t('dashboard.teacherAttendance')} */}
            <div className="nd-section-card" style={{ position: 'relative' }}>
              <div className="nd-section-head">
                <h3>{t('dashboard.teacherAttendance')}</h3>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div className="nd-progress-labels">
                  <span>{t('common.present')}: {d.attendTeacher?.present ?? 0} / {d.attendTeacher?.totalTeachers ?? 0}</span>
                  <span>{d.attendTeacher?.attendanceRate ?? 0}%</span>
                </div>
                <div className="nd-progress-container">
                  <div className="nd-progress-bar" style={{ width: `${d.attendTeacher?.attendanceRate ?? 0}%`, background: '#10b981' }} />
                </div>
              </div>
              <div className="nd-avatar-grid" onScroll={() => setHoveredTeacher(null)}>
                {d.attendTeacher?.recentRecords?.map((r: any, i: number) => {
                  const t = r.teacher;
                  if (!t) return null;
                  return (
                    <div 
                      key={i} 
                      className="nd-avatar-item"
                      onMouseEnter={(e) => {
                        const card = e.currentTarget.closest('.nd-section-card') as HTMLElement;
                        if (!card) return;
                        const cRect = card.getBoundingClientRect();
                        const iRect = e.currentTarget.getBoundingClientRect();
                        const x = Math.max(105, Math.min(cRect.width - 105, (iRect.left - cRect.left) + iRect.width / 2));
                        const y = iRect.top - cRect.top;
                        const fitsAbove = y > 180;
                        setHoveredTeacher({
                          data: { ...r, teacher: t },
                          x,
                          y: fitsAbove ? y - 8 : (iRect.bottom - cRect.top) + 8,
                          fitsAbove,
                        });
                      }}
                      onMouseLeave={() => setHoveredTeacher(null)}
                      onClick={(e) => {
                        const card = e.currentTarget.closest('.nd-section-card') as HTMLElement;
                        if (!card) return;
                        const cRect = card.getBoundingClientRect();
                        const iRect = e.currentTarget.getBoundingClientRect();
                        const x = Math.max(105, Math.min(cRect.width - 105, (iRect.left - cRect.left) + iRect.width / 2));
                        const y = iRect.top - cRect.top;
                        const fitsAbove = y > 180;
                        setHoveredTeacher(prev => (prev?.data?.teacher?.id === t.id ? null : {
                          data: { ...r, teacher: t },
                          x,
                          y: fitsAbove ? y - 8 : (iRect.bottom - cRect.top) + 8,
                          fitsAbove,
                        }));
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        {t.avatar ? (
                          <img src={t.avatar} alt={t.name} className="nd-avatar-circle" style={{ objectFit: 'cover' }} />
                        ) : (
                          <div className="nd-avatar-circle" style={{ background: '#10b981' }}>{t.name?.charAt(0) || 'T'}</div>
                        )}
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#10b981', border: '2px solid var(--card)' }} />
                      </div>
                      <span className="nd-avatar-name">{t.name}</span>
                    </div>
                  );
                })}
              </div>

              {hoveredTeacher && (
                <div
                  style={{
                    position: 'absolute',
                    top: hoveredTeacher.y,
                    left: hoveredTeacher.x,
                    transform: hoveredTeacher.fitsAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    padding: '0.75rem',
                    borderRadius: '0.6rem',
                    width: '200px',
                    zIndex: 60,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.4rem',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      [hoveredTeacher.fitsAbove ? 'top' : 'bottom']: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      borderWidth: '6px',
                      borderStyle: 'solid',
                      borderColor: hoveredTeacher.fitsAbove
                        ? 'var(--card) transparent transparent transparent'
                        : 'transparent transparent var(--card) transparent',
                    }}
                  />
                  {hoveredTeacher.data.teacher?.avatar ? (
                    <img src={hoveredTeacher.data.teacher.avatar} alt={hoveredTeacher.data.teacher.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 600 }}>
                      {hoveredTeacher.data.teacher?.name?.charAt(0) || 'T'}
                    </div>
                  )}
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--foreground)', textAlign: 'center' }}>{hoveredTeacher.data.teacher?.name}</span>
                  <div style={{ width: '100%', fontSize: '0.68rem', color: 'var(--muted-foreground)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {hoveredTeacher.data.status && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{t('common.status')}</span>
                        <span style={{ textTransform: 'capitalize' }}>{hoveredTeacher.data.status}</span>
                      </div>
                    )}
                    {hoveredTeacher.data.teacher?.phone && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{t('common.phone')}</span>
                        <span>{hoveredTeacher.data.teacher.phone}</span>
                      </div>
                    )}
                    {hoveredTeacher.data.teacher?.email && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{t('common.email')}</span>
                        <span>{hoveredTeacher.data.teacher.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* {t('dashboard.studentAttendance')} */}
            <div className="nd-section-card" style={{ position: 'relative' }}>
              <div className="nd-section-head" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                <h3>{t('dashboard.studentAttendance')}</h3>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <select className="nd-hw-filter" value={studentClassFilter} onChange={(e) => setStudentClassFilter(e.target.value)}>
                    <option value="All">{t('common.allClasses')}</option>
                    {Array.from(new Set(d.attendStudent?.data?.map((s: any) => s.class?.name).filter(Boolean))).map((cls: any, i: number) => (
                      <option key={i} value={cls}>{cls}</option>
                    ))}
                  </select>
                  <select className="nd-hw-filter" value={studentStatusFilter} onChange={(e) => setStudentStatusFilter(e.target.value)}>
                    <option value="All">{t('dashboard.allStatus')}</option>
                    <option value="present">{t('common.present')}</option>
                    <option value="absent">{t('common.absent')}</option>
                    <option value="late">{t('common.late')}</option>
                    <option value="leave">{t('common.leave')}</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div className="nd-progress-labels">
                  <span>{t('common.present')}: {d.attendStudent?.present ?? 0} / {d.attendStudent?.totalStudents ?? 0}</span>
                  <span>{d.attendStudent?.attendanceRate ?? 0}%</span>
                </div>
                <div className="nd-progress-container">
                  <div className="nd-progress-bar" style={{ width: `${d.attendStudent?.attendanceRate ?? 0}%`, background: '#6366f1' }} />
                </div>
              </div>
              <div className="nd-avatar-grid" onScroll={() => setHoveredStudent(null)}>
                {d.attendStudent?.data
                  ?.filter((s: any) => {
                    if (studentClassFilter !== 'All' && s.class?.name !== studentClassFilter) return false;
                    if (studentStatusFilter !== 'All' && s.status !== studentStatusFilter) return false;
                    return true;
                  })
                  .map((s: any, i: number) => {
                    const st = s.student;
                    if (!st) return null;
                    const statusColor = s.status === 'present' ? '#10b981' : s.status === 'absent' ? '#ef4444' : s.status === 'late' ? '#f59e0b' : '#3b82f6';
                    return (
                      <div 
                        key={i} 
                        className="nd-avatar-item"
                        onMouseEnter={(e) => {
                          const card = e.currentTarget.closest('.nd-section-card') as HTMLElement;
                          if (!card) return;
                          const cRect = card.getBoundingClientRect();
                          const iRect = e.currentTarget.getBoundingClientRect();
                          const x = Math.max(105, Math.min(cRect.width - 105, (iRect.left - cRect.left) + iRect.width / 2));
                          const y = iRect.top - cRect.top;
                          const fitsAbove = y > 180;
                          setHoveredStudent({
                            data: s,
                            x,
                            y: fitsAbove ? y - 8 : (iRect.bottom - cRect.top) + 8,
                            fitsAbove,
                          });
                        }}
                        onMouseLeave={() => setHoveredStudent(null)}
                        onClick={(e) => {
                          const card = e.currentTarget.closest('.nd-section-card') as HTMLElement;
                          if (!card) return;
                          const cRect = card.getBoundingClientRect();
                          const iRect = e.currentTarget.getBoundingClientRect();
                          const x = Math.max(105, Math.min(cRect.width - 105, (iRect.left - cRect.left) + iRect.width / 2));
                          const y = iRect.top - cRect.top;
                          const fitsAbove = y > 180;
                          setHoveredStudent(prev => (prev?.data?.id === s.id ? null : {
                            data: s,
                            x,
                            y: fitsAbove ? y - 8 : (iRect.bottom - cRect.top) + 8,
                            fitsAbove,
                          }));
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          {st.avatar ? (
                            <img src={st.avatar} alt={st.name} className="nd-avatar-circle" style={{ objectFit: 'cover' }} />
                          ) : (
                            <div className="nd-avatar-circle" style={{ background: '#6366f1' }}>{st.name?.charAt(0) || 'S'}</div>
                          )}
                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: statusColor, border: '2px solid var(--card)' }} />
                        </div>
                        <span className="nd-avatar-name">{st.name}</span>
                      </div>
                    );
                  })}
              </div>

              {hoveredStudent && (
                <div
                  style={{
                    position: 'absolute',
                    top: hoveredStudent.y,
                    left: hoveredStudent.x,
                    transform: hoveredStudent.fitsAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    padding: '0.75rem',
                    borderRadius: '0.6rem',
                    width: '200px',
                    zIndex: 60,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.4rem',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      [hoveredStudent.fitsAbove ? 'top' : 'bottom']: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      borderWidth: '6px',
                      borderStyle: 'solid',
                      borderColor: hoveredStudent.fitsAbove
                        ? 'var(--card) transparent transparent transparent'
                        : 'transparent transparent var(--card) transparent',
                    }}
                  />
                  {hoveredStudent.data.student?.avatar ? (
                    <img src={hoveredStudent.data.student.avatar} alt={hoveredStudent.data.student.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 600 }}>
                      {hoveredStudent.data.student?.name?.charAt(0) || 'S'}
                    </div>
                  )}
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--foreground)', textAlign: 'center' }}>{hoveredStudent.data.student?.name}</span>
                  <div style={{ width: '100%', fontSize: '0.68rem', color: 'var(--muted-foreground)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {hoveredStudent.data.class?.name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{t('common.class')}</span>
                        <span>{hoveredStudent.data.class.name}</span>
                      </div>
                    )}
                    {hoveredStudent.data.section?.name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{t('common.section')}</span>
                        <span>{hoveredStudent.data.section.name}</span>
                      </div>
                    )}
                    {hoveredStudent.data.subject?.name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{t('common.subject')}</span>
                        <span>{hoveredStudent.data.subject.name}</span>
                      </div>
                    )}
                    {hoveredStudent.data.status && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{t('common.status')}</span>
                        <span style={{ textTransform: 'capitalize' }}>{hoveredStudent.data.status}</span>
                      </div>
                    )}
                    {hoveredStudent.data.student?.phone && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{t('common.phone')}</span>
                        <span>{hoveredStudent.data.student.phone}</span>
                      </div>
                    )}
                    {hoveredStudent.data.student?.email && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{t('common.email')}</span>
                        <span>{hoveredStudent.data.student.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* {t('dashboard.todayHomework')} */}
            <div className="nd-section-card">
              <div className="nd-section-head">
                <h3>{t('dashboard.todayHomework')}</h3>
                <select 
                  className="nd-hw-filter" 
                  value={hwFilterClass} 
                  onChange={(e) => setHwFilterClass(e.target.value)}
                >
                  <option value="All">{t('common.allClasses')}</option>
                  {Array.from(new Set(d.recentHomework?.map(h => h.classInfo?.name).filter(Boolean))).map((cls, i) => (
                    <option key={i} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div className="nd-progress-labels">
                  <span>{t('dashboard.submitted')}: {hwStats.submitted} / {hwStats.total}</span>
                  <span>{hwPct}%</span>
                </div>
                <div className="nd-progress-container">
                  <div className="nd-progress-bar" style={{ width: `${hwPct}%`, background: '#f59e0b' }} />
                </div>
              </div>
              <div className="nd-hw-list">
                {(hwFilterClass === 'All' ? d.recentHomework : d.recentHomework?.filter(h => h.classInfo?.name === hwFilterClass))?.map((hw, i) => (
                  <div key={i} className="nd-hw-item">
                    <h4 className="nd-hw-title">{hw.title}</h4>
                    {hw.description && <p className="nd-hw-desc">{hw.description}</p>}
                    <div className="nd-hw-meta">
                      {hw.classInfo?.name && <span className="nd-hw-badge">{hw.classInfo.name}</span>}
                      {hw.subjectInfo?.name && <span className="nd-hw-badge">{hw.subjectInfo.name}</span>}
                    </div>
                  </div>
                ))}
                {(!d.recentHomework || d.recentHomework.length === 0) && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textAlign: 'center', padding: '1rem 0' }}>{t('dashboard.noHomeworkToday')}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── {t('dashboard.todaySchedule')} ── */}
          <div className="nd-section-card">
            <div className="nd-section-head" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#6366f1" />
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>{t('dashboard.todaySchedule')}</h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '999px' }}>
                  {filteredTodayRoutines.length}
                </span>
              </div>
              <Link href="/routine" className="nd-text-btn" style={{ fontSize: '0.78rem' }}>
                <Calendar size={14} /> {t('dashboard.viewTimetable')}
              </Link>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <select
                className="nd-hw-filter"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                value={schedClassFilter}
                onChange={(e) => {
                  setSchedClassFilter(e.target.value);
                  setSchedSectionFilter('All');
                }}
              >
                <option value="All">{t('common.allClasses')}</option>
                {availableClasses.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>

              <select
                className="nd-hw-filter"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                value={schedSectionFilter}
                onChange={(e) => setSchedSectionFilter(e.target.value)}
              >
                <option value="All">{t('common.allSections')}</option>
                {availableSections.map((s, i) => (
                  <option key={i} value={s}>{s}</option>
                ))}
              </select>

              <select
                className="nd-hw-filter"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                value={schedTeacherFilter}
                onChange={(e) => setSchedTeacherFilter(e.target.value)}
              >
                <option value="All">{t('common.allTeachers')}</option>
                {availableTeachers.map((t, i) => (
                  <option key={i} value={t}>{t}</option>
                ))}
              </select>

              <select
                className="nd-hw-filter"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                value={schedSubjectFilter}
                onChange={(e) => setSchedSubjectFilter(e.target.value)}
              >
                <option value="All">{t('common.allSubjects')}</option>
                {availableSubjects.map((sub, i) => (
                  <option key={i} value={sub}>{sub}</option>
                ))}
              </select>

              {(schedClassFilter !== 'All' || schedSectionFilter !== 'All' || schedTeacherFilter !== 'All' || schedSubjectFilter !== 'All') && (
                <button
                  onClick={() => {
                    setSchedClassFilter('All');
                    setSchedSectionFilter('All');
                    setSchedTeacherFilter('All');
                    setSchedSubjectFilter('All');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    padding: '0.2rem 0.5rem',
                    textDecoration: 'underline',
                    fontWeight: 600
                  }}
                >
                  {t('dashboard.resetFilters')} ({filteredTodayRoutines.length} / {todayRoutines.length})
                </button>
              )}
            </div>

            {/* Routines Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredTodayRoutines.length > 0 ? (
                filteredTodayRoutines.map((r: any, i: number) => {
                  const isActive = isRoutineActiveNow(r.startTime, r.endTime);
                  return (
                    <div
                      key={r.id || i}
                      style={{
                        border: isActive ? '1.5px solid #6366f1' : '1px solid var(--border)',
                        borderRadius: '0.65rem',
                        padding: '0.75rem 0.85rem',
                        background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'var(--card)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'border-color 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--foreground)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.subjectEntity?.name || 'Class'}
                          </h4>
                          <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.classEntity?.name || 'Class'}{r.sectionEntity?.name ? ` (${r.sectionEntity.name})` : ''}
                          </p>
                        </div>
                        {isActive ? (
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, background: '#6366f1', color: '#ffffff', padding: '2px 6px', borderRadius: '999px', flexShrink: 0 }}>
                            {t('dashboard.now')}
                          </span>
                        ) : r.roomNumber ? (
                          <span style={{ fontSize: '0.62rem', fontWeight: 600, background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                            {r.roomNumber}
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: 'var(--muted-foreground)', paddingTop: '4px', borderTop: '1px dashed var(--border)', marginTop: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color={isActive ? '#6366f1' : '#94a3b8'} />
                          <span style={{ fontWeight: isActive ? 600 : 500, color: isActive ? '#6366f1' : 'var(--muted-foreground)' }}>
                            {formatRoutineTime(r.startTime)} – {formatRoutineTime(r.endTime)}
                          </span>
                        </div>
                        {r.teacherEntity?.name && (
                          <span style={{ color: 'var(--foreground)', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.teacherEntity.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 0', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
                  {todayRoutines.length === 0 ? t('dashboard.noClassesToday') : t('dashboard.noMatchingFilters')}
                </div>
              )}
            </div>
          </div>

          {/* ── 2-col grid: Upcoming Meetings & {t('dashboard.upcomingExams')} ── */}
          <div className="nd-2col">

            {/* Upcoming Meeting */}
            <div className="nd-section-card">
              <div className="nd-section-head">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Video size={16} color="#0f766e" /> {t('dashboard.onlineMeetings')}
                </h3>
                <Link href="/online-class" className="nd-text-btn">{t('dashboard.viewAll')}</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto' }}>
                {((d.upcomingMeeting && d.upcomingMeeting.length > 0) ? d.upcomingMeeting : meetings).length > 0 ? (
                  ((d.upcomingMeeting && d.upcomingMeeting.length > 0) ? d.upcomingMeeting : meetings).map((m: any, i: number) => {
                    const dStr = m.date ? new Date(m.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '';
                    return (
                      <div key={m.id || i} style={{ border: '1px solid var(--border)', borderRadius: '0.65rem', padding: '0.85rem', background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.title || 'Online Session'}
                            </h4>
                            {m.class && (
                              <p style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                                Class {m.class.name} {m.section ? `(${m.section.name})` : ''} {m.subject ? `· ${m.subject.name}` : ''}
                              </p>
                            )}
                          </div>
                          {m.meetLink && (
                            <a
                              href={m.meetLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'rgba(15, 118, 110, 0.12)',
                                color: '#0d9488',
                                border: '1px solid rgba(15, 118, 110, 0.25)',
                                borderRadius: '6px',
                                padding: '0.3rem 0.65rem',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                flexShrink: 0
                              }}
                            >
                              <LinkIcon size={12} />
                              {t('dashboard.joinMeeting')}
                            </a>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.7rem', color: 'var(--muted-foreground)', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} color="#94a3b8" />
                            <span>{dStr}</span>
                          </div>
                          {(m.startTime || m.start_time) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={13} color="#94a3b8" />
                              <span>{m.startTime || m.start_time} {m.endTime || m.end_time ? `– ${m.endTime || m.end_time}` : ''}</span>
                            </div>
                          )}
                        </div>

                        {m.host && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '4px', borderTop: '1px dashed var(--border)' }}>
                            {m.host.avatar ? (
                              <img src={m.host.avatar} alt="Host" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(15, 118, 110, 0.15)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
                                {m.host.name?.charAt(0) || 'H'}
                              </div>
                            )}
                            <span style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)' }}>{t('dashboard.host')}: <strong style={{ color: 'var(--foreground)' }}>{m.host.name}</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textAlign: 'center', padding: '2rem 0' }}>{t('dashboard.noMeetings')}</p>
                )}
              </div>
            </div>

            {/* Upcoming Exam */}
            <div className="nd-section-card">
              <div className="nd-section-head">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="#6366f1" /> {t('dashboard.upcomingExams')}
                </h3>
                <Link href="/exams" className="nd-text-btn">{t('dashboard.viewAll')}</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto' }}>
                {d.currentExam && d.currentExam.length > 0 ? (
                  d.currentExam.map((exam, i) => {
                    const start = exam.start_date ? new Date(exam.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
                    const end = exam.end_date ? new Date(exam.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                    return (
                      <div key={exam.id || i} style={{ border: '1px solid var(--border)', borderRadius: '0.65rem', padding: '0.85rem', background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div>
                            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
                              {exam.exam_name}
                            </h4>
                            <p style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                              {start} – {end}
                            </p>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '999px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', flexShrink: 0 }}>
                            {exam.assignments?.length ? `${exam.assignments.length} ${t('dashboard.papers')}` : t('dashboard.upcoming')}
                          </span>
                        </div>

                        {exam.description && (
                          <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.4 }}>
                            {exam.description}
                          </p>
                        )}

                        {exam.assignments && exam.assignments.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '2px' }}>
                            {exam.assignments.slice(0, 4).map((a, ai) => (
                              <span key={ai} style={{ fontSize: '0.65rem', background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px', color: 'var(--foreground)' }}>
                                {a.class?.name ? `${a.class.name}: ` : ''}{a.subject?.name}
                              </span>
                            ))}
                            {exam.assignments.length > 4 && (
                              <span style={{ fontSize: '0.65rem', color: '#6366f1', alignSelf: 'center', fontWeight: 600 }}>
                                +{exam.assignments.length - 4} {t('common.more')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textAlign: 'center', padding: '2rem 0' }}>{t('dashboard.noUpcomingExams')}</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ══ Right Panel ══ */}
        <div className="nd-right-panel">

          {/* Calendar */}
          <div className="nd-section-card">
            <div className="nd-section-head" style={{ marginBottom: '0.65rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                <CalendarDays size={15} color="#6366f1" />
                {language === 'bn' ? 'একাডেমিক ক্যালেন্ডার' : 'Academic Calendar'}
              </h3>
              <Link
                href="/academic-calendar"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#6366f1',
                  textDecoration: 'none',
                }}
              >
                <span>{language === 'bn' ? 'সব দেখুন' : 'View All'}</span>
                <ChevronRight size={13} />
              </Link>
            </div>
            <CalendarWidget today={today} />
          </div>


          {/* ── Student Performance Card ── */}
          <div className="nd-section-card">
            <div className="nd-section-head" style={{ marginBottom: '0.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                <GraduationCap size={15} color="#6366f1" /> {t('dashboard.studentPerformance')}
              </h3>
              <span style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)' }}>
                {getMonthName(today.getMonth(), language)} {today.getFullYear()}
              </span>
            </div>
            {perfLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                <Loader2 size={20} style={{ animation: 'nd-spin 1s linear infinite', color: '#6366f1' }} />
              </div>
            ) : studentPerf.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.8rem', padding: '1rem' }}>{t('dashboard.noStudentData')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflowY: 'auto' }}>
                {[...studentPerf]
                  .sort((a, b) => {
                    const avgA = ((a.attendance?.percentage ?? 0) + (a.exams?.percentage ?? 0) + (a.homework?.percentage ?? 0)) / 3;
                    const avgB = ((b.attendance?.percentage ?? 0) + (b.exams?.percentage ?? 0) + (b.homework?.percentage ?? 0)) / 3;
                    return avgB - avgA;
                  })
                  .map((s: any, i: number) => {
                    const att = s.attendance?.percentage ?? 0;
                    const exam = s.exams?.percentage ?? 0;
                    const hw = s.homework?.percentage ?? 0;
                    const avg = Math.round((att + exam + hw) / 3);
                    const clr = (v: number) => v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444';
                    const initials = (s.name || 'S').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                    const isHovered = hoveredPerfStudent === i;
                    return (
                      <div key={i}
                        onMouseEnter={() => setHoveredPerfStudent(i)}
                        onMouseLeave={() => setHoveredPerfStudent(null)}
                        style={{
                          padding: '0.5rem 0.55rem', borderRadius: '10px', background: isHovered ? 'var(--muted)' : 'var(--card)',
                          border: `1px solid ${isHovered ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer',
                          transition: 'all 0.2s', position: 'relative',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                          {/* Avatar */}
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `linear-gradient(135deg, ${clr(avg)}, ${clr(avg)}99)`, color: '#fff',
                            fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                          }}>{initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.76rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.name || 'Student'}
                            </div>
                            <div style={{ fontSize: '0.64rem', color: 'var(--muted-foreground)' }}>
                              {s.class?.name || ''}{s.section?.name ? ` · ${s.section.name}` : ''}{s.rollNumber ? ` · Roll ${s.rollNumber}` : ''}
                            </div>
                          </div>
                          {/* Overall badge */}
                          <div style={{
                            fontSize: '0.68rem', fontWeight: 700, color: clr(avg), background: `${clr(avg)}18`,
                            borderRadius: '6px', padding: '2px 6px',
                          }}>{avg}%</div>
                        </div>
                        {/* Mini bars */}
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {[[t('common.attShort'), att], [t('common.examShort'), exam], [t('common.hwShort'), hw]].map(([label, val]) => (
                            <div key={label as string} style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)' }}>{label}</span>
                                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: clr(val as number) }}>{Math.round(val as number)}%</span>
                              </div>
                              <div style={{ height: '3.5px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(val as number, 100)}%`, background: clr(val as number), borderRadius: '2px', transition: 'width 0.5s' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Hover tooltip */}
                        {isHovered && (
                          <div style={{
                            position: 'absolute', left: 0, right: 0, top: '100%', marginTop: '4px', zIndex: 50,
                            background: 'var(--card)', borderRadius: '10px', padding: '0.65rem', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                            border: '1px solid var(--border)',
                          }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.4rem' }}>
                              {s.name} — {t('dashboard.details')}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                              <div style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>{t('dashboard.attendance')}</div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: clr(att), textAlign: 'right' }}>
                                {s.attendance?.presentDays ?? '–'}/{s.attendance?.totalWorkingDays ?? '–'} days ({Math.round(att)}%)
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>{t('dashboard.exams')}</div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: clr(exam), textAlign: 'right' }}>
                                {s.exams?.totalMarksObtained ?? '–'}/{s.exams?.totalMaximumMarks ?? '–'} ({Math.round(exam)}%)
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>{t('dashboard.homework')}</div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: clr(hw), textAlign: 'right' }}>
                                {s.homework?.totalDone ?? '–'}/{s.homework?.totalAssigned ?? '–'} done ({Math.round(hw)}%)
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* ── Teacher Performance Card ── */}
          <div className="nd-section-card">
            <div className="nd-section-head" style={{ marginBottom: '0.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                <Award size={15} color="#10b981" /> {t('dashboard.teacherPerformance')}
              </h3>
              <span style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)' }}>
                {getMonthName(today.getMonth(), language)} {today.getFullYear()}
              </span>
            </div>
            {perfLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                <Loader2 size={20} style={{ animation: 'nd-spin 1s linear infinite', color: '#10b981' }} />
              </div>
            ) : teacherPerf.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.8rem', padding: '1rem' }}>{t('dashboard.noTeacherData')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflowY: 'auto' }}>
                {[...teacherPerf]
                  .sort((a, b) => {
                    const avgA = ((a.attendance?.percentage ?? 0) + (a.homework?.percentage ?? 0)) / 2;
                    const avgB = ((b.attendance?.percentage ?? 0) + (b.homework?.percentage ?? 0)) / 2;
                    return avgB - avgA;
                  })
                  .map((tItem: any, i: number) => {
                    const att = tItem.attendance?.percentage ?? 0;
                    const hw = tItem.homework?.percentage ?? 0;
                    const avg = Math.round((att + hw) / 2);
                    const clr = (v: number) => v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444';
                    const initials = (tItem.name || 'T').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                    const isHovered = hoveredPerfTeacher === i;
                    return (
                      <div key={i}
                        onMouseEnter={() => setHoveredPerfTeacher(i)}
                        onMouseLeave={() => setHoveredPerfTeacher(null)}
                        style={{
                          padding: '0.5rem 0.55rem', borderRadius: '10px', background: isHovered ? 'var(--muted)' : 'var(--card)',
                          border: `1px solid ${isHovered ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer',
                          transition: 'all 0.2s', position: 'relative',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                          {/* Avatar */}
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `linear-gradient(135deg, ${clr(avg)}, ${clr(avg)}99)`, color: '#fff',
                            fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                          }}>{initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.76rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tItem.name || 'Teacher'}
                            </div>
                            {tItem.designation && (
                              <div style={{ fontSize: '0.62rem', color: 'var(--muted-foreground)' }}>
                                {tItem.designation}
                              </div>
                            )}
                          </div>
                          {/* Overall badge */}
                          <div style={{
                            fontSize: '0.68rem', fontWeight: 700, color: clr(avg), background: `${clr(avg)}18`,
                            borderRadius: '6px', padding: '2px 6px',
                          }}>{avg}%</div>
                        </div>
                        {/* Mini bars */}
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {[[t('dashboard.attendance'), att], [t('dashboard.homework'), hw]].map(([label, val]) => (
                            <div key={label as string} style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)' }}>{label}</span>
                                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: clr(val as number) }}>{Math.round(val as number)}%</span>
                              </div>
                              <div style={{ height: '3.5px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(val as number, 100)}%`, background: clr(val as number), borderRadius: '2px', transition: 'width 0.5s' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Hover tooltip */}
                        {isHovered && (
                          <div style={{
                            position: 'absolute', left: 0, right: 0, top: '100%', marginTop: '4px', zIndex: 50,
                            background: 'var(--card)', borderRadius: '10px', padding: '0.65rem', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                            border: '1px solid var(--border)',
                          }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.4rem' }}>
                              {tItem.name} — {t('dashboard.details')}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                              <div style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>{t('dashboard.attendance')}</div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: clr(att), textAlign: 'right' }}>
                                {tItem.attendance?.presentDays ?? '–'}/{tItem.attendance?.totalWorkingDays ?? '–'} days ({Math.round(att)}%)
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>{t('dashboard.homeworkGiven')}</div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: clr(hw), textAlign: 'right' }}>
                                {tItem.homework?.totalProvided ?? '–'}/{tItem.homework?.target ?? '–'} target ({Math.round(hw)}%)
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* {t('dashboard.recentNotices')} */}
          <div className="nd-section-card">
            <div className="nd-section-head">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Megaphone size={16} color="#f59e0b" /> {t('dashboard.recentNotices')}
              </h3>
              <Link href="/notices" className="nd-text-btn">{t('dashboard.viewAll')}</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '360px', overflowY: 'auto' }}>
              {d.recentNotice && d.recentNotice.length > 0 ? (
                d.recentNotice.map((n, i) => {
                  const dStr = n.createdAt
                    ? new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : '';
                  return (
                    <div
                      key={n.id || i}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '0.65rem',
                        padding: '0.75rem',
                        background: 'var(--card)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground)', margin: 0, lineHeight: 1.3 }}>
                          {n.title}
                        </h4>
                        {(n.isImportent || (n as any).isImportant) && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1px 6px', borderRadius: '4px', flexShrink: 0 }}>
                            {t('dashboard.important')}
                          </span>
                        )}
                      </div>
                      {n.content && (
                        <p style={{
                          fontSize: '0.72rem',
                          color: 'var(--muted-foreground)',
                          margin: 0,
                          lineHeight: 1.45,
                          whiteSpace: 'pre-line',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {n.content}
                        </p>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--muted-foreground)', paddingTop: '4px', borderTop: '1px dashed var(--border)', marginTop: '2px' }}>
                        <span>{t('dashboard.by')} {n.postedBy || 'Admin'}</span>
                        {dStr && <span>{dStr}</span>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textAlign: 'center', padding: '1.5rem 0' }}>{t('dashboard.noRecentNotices')}</p>
              )}
            </div>
            <Link
              href="/notices"
              className="nd-outline-btn"
              style={{ marginTop: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
            >
              {t('dashboard.viewAll')}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Always Fixed on Right Bottom (Never Scrolls) ── */}
      {mounted && createPortal(
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
          {isNovaChatOpen ? (
            <div
              style={{
                width: '370px',
                maxWidth: 'calc(100vw - 32px)',
                height: '520px',
                maxHeight: 'calc(100vh - 110px)',
                background: 'var(--card)',
                borderRadius: '16px',
                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'nd-fade-in 0.2s ease',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '0.85rem 1rem',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Sparkles size={18} color="#ffffff" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>Nova AI</h4>
                    <p style={{ fontSize: '0.68rem', opacity: 0.9, margin: 0 }}>
                      SchoolCare • {schoolName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNovaChatOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 28, height: 28,
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title="Close chat"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                background: 'var(--background)',
              }}>
                {novaMessages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '82%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: msg.role === 'user' ? '#4f46e5' : 'var(--card)',
                        color: msg.role === 'user' ? '#ffffff' : 'var(--foreground)',
                        fontSize: '0.78rem',
                        lineHeight: 1.45,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.text}
                    </div>
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)', marginTop: '2px', padding: '0 4px' }}>
                      {msg.time}
                    </span>
                  </div>
                ))}
                {isNovaTyping && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366f1', fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}>
                    <Loader2 size={14} style={{ animation: 'nd-spin 1s linear infinite' }} />
                    <span>Nova AI is thinking...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Prompts */}
              <div style={{
                padding: '0.4rem 0.75rem',
                background: 'var(--card)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: '0.4rem',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}>
                {[
                  `📅 ${t('dashboard.todaySchedule')}`,
                  `📝 ${t('dashboard.lessonPlan')}`,
                  `📊 ${t('dashboard.attendance')}`,
                  `💡 ${t('dashboard.homeworkIdea')}`
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendNovaMessage(prompt)}
                    style={{
                      whiteSpace: 'nowrap',
                      fontSize: '0.66rem',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendNovaMessage();
                }}
                style={{
                  padding: '0.65rem 0.75rem',
                  background: 'var(--card)',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  value={novaInput}
                  onChange={(e) => setNovaInput(e.target.value)}
                  placeholder={t('dashboard.askAi')}
                  style={{
                    flex: 1,
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.78rem',
                    outline: 'none',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
                <button
                  type="submit"
                  disabled={!novaInput.trim() || isNovaTyping}
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    width: 34,
                    height: 34,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: !novaInput.trim() || isNovaTyping ? 'not-allowed' : 'pointer',
                    opacity: !novaInput.trim() || isNovaTyping ? 0.6 : 1,
                  }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          ) : isNovaCardMinimized ? (
            <button
              onClick={() => setIsNovaCardMinimized(false)}
              aria-label="Open Nova AI"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#ffffff',
                borderRadius: '999px',
                padding: '0.65rem 1.15rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(79, 70, 229, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(79, 70, 229, 0.35)';
              }}
            >
              <Sparkles size={16} />
              <span>{t('dashboard.meetNova')} • {schoolName}</span>
            </button>
          ) : (
            <div
              style={{
                width: '300px',
                maxWidth: 'calc(100vw - 32px)',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                boxShadow: '0 16px 40px -6px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                padding: '1rem',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '8px',
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)'
                  }}>
                    <Sparkles size={16} color="#ffffff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                      {t('dashboard.meetNova')}
                    </h3>
                    <span style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 600 }}>
                      {t('dashboard.assistant')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 700, background: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8', padding: '2px 7px', borderRadius: '999px',
                    border: '1px solid rgba(99, 102, 241, 0.25)'
                  }}>
                    {t('dashboard.online')}
                  </span>
                  <button
                    onClick={() => setIsNovaCardMinimized(true)}
                    title="Minimize"
                    style={{
                      background: 'var(--muted)',
                      border: 'none',
                      borderRadius: '4px',
                      width: 22, height: 22,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              {/* Description */}
              <p style={{
                fontSize: '0.74rem', color: 'var(--muted-foreground)', lineHeight: 1.45,
                margin: '0 0 0.85rem'
              }}>
                Your AI Teaching Assistant for <strong style={{ color: 'var(--foreground)' }}>{schoolName}</strong>, powered by <strong style={{ color: '#6366f1' }}>SchoolCare</strong> for smarter & faster teaching.
              </p>

              {/* Bot Icon */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: 'var(--card)',
                  border: '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.12)',
                  position: 'relative'
                }}>
                  <MessageCircle size={24} color="#6366f1" fill="rgba(99, 102, 241, 0.15)" />
                  <span style={{
                    position: 'absolute', bottom: 1, right: 1, width: 10, height: 10,
                    borderRadius: '50%', background: '#10b981', border: '2px solid var(--card)'
                  }} />
                </div>
              </div>

              {/* Chat Button */}
              <button
                onClick={() => setIsNovaChatOpen(true)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.65rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.92'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <Sparkles size={14} /> {t('dashboard.chatWithAi')}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

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
        .nd-text-btn:hover { background: var(--muted); }
        .nd-outline-btn { width: 100%; border: 1px solid var(--border); background: none; border-radius: 0.6rem; padding: 0.5rem; font-size: 0.78rem; font-weight: 600; cursor: pointer; color: var(--muted-foreground); display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; transition: background 0.15s; font-family: inherit; }
        .nd-outline-btn:hover { background: var(--muted); }

        /* ── Hero ── */
        .nd-hero { background: linear-gradient(135deg, #eef2ff 0%, #fdf4ff 55%, #fff1f5 100%); border-radius: 1.25rem; padding: 1.75rem; display: flex; gap: 1.5rem; align-items: stretch; border: 1px solid #e0e7ff; position: relative; overflow: hidden; }
        [data-theme='dark'] .nd-hero, .dark .nd-hero { background: linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(168, 85, 247, 0.1) 55%, rgba(236, 72, 153, 0.08) 100%); border-color: var(--border); }
        .nd-hero::before { content: ''; position: absolute; top: -60px; left: 50%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%); border-radius: 50%; }
        .nd-hero-left { display: flex; gap: 1.25rem; align-items: center; flex: 1; min-width: 0; }
        .nd-hero-avatar { width: 86px; height: 86px; border-radius: 50%; background: var(--card); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 20px rgba(99,102,241,0.18); border: 3px solid var(--border); }
        .nd-hero-text { min-width: 0; }
        .nd-hero-greeting { font-size: 1.4rem; font-weight: 800; color: var(--foreground); margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nd-hero-sub { color: var(--muted-foreground); font-size: 0.88rem; margin-bottom: 0.4rem; }
        .nd-hero-info { font-size: 0.85rem; color: var(--muted-foreground); margin-bottom: 0.9rem; }
        .nd-hero-link { color: #6366f1; font-weight: 700; text-decoration: none; }
        .nd-hero-link:hover { text-decoration: underline; }
        .nd-hero-btn { display: inline-flex; align-items: center; gap: 0.4rem; background: #6366f1; color: white; border: none; border-radius: 0.6rem; padding: 0.5rem 1.1rem; font-size: 0.83rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: background 0.2s, transform 0.15s; font-family: inherit; }
        .nd-hero-btn:hover { background: #4f46e5; transform: translateY(-1px); }
        .nd-hero-right { display: flex; flex-direction: column; gap: 0.7rem; width: 240px; flex-shrink: 0; }
        @media (max-width: 900px) { .nd-hero { flex-direction: column; } .nd-hero-right { width: auto; flex-direction: row; } }
        @media (max-width: 580px) { .nd-hero-right { flex-direction: column; } .nd-hero-left { flex-direction: column; align-items: flex-start; } }

        /* AI Cards */
        .nd-ai-card { background: var(--card); border-radius: 0.85rem; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.45rem; border: 1px solid var(--border); flex: 1; box-shadow: 0 1px 5px rgba(0,0,0,0.04); }
        .nd-ai-icon-wrap { width: 34px; height: 34px; border-radius: 0.55rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nd-ai-title { font-size: 0.82rem; font-weight: 700; color: var(--foreground); }
        .nd-ai-sub { font-size: 0.72rem; color: var(--muted-foreground); line-height: 1.4; }
        .nd-ai-btn { align-self: flex-start; background: none; border: 1px solid; border-radius: 6px; padding: 0.28rem 0.7rem; font-size: 0.72rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 2px; transition: opacity 0.15s; font-family: inherit; }
        .nd-ai-btn:hover { opacity: 0.7; }

        /* ── Stats ── */
        .nd-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        @media (max-width: 1000px) { .nd-stats-row { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px)  { .nd-stats-row { grid-template-columns: 1fr 1fr; } }
        .nd-stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 1rem; padding: 1rem 1.1rem 0.85rem; box-shadow: 0 1px 6px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s; }
        .nd-stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(0,0,0,0.08); }
        .nd-stat-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; }
        .nd-stat-label { font-size: 0.7rem; color: var(--muted-foreground); font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.15rem; }
        .nd-stat-value { font-size: 1.8rem; font-weight: 800; line-height: 1; margin-bottom: 0.15rem; color: var(--foreground); }
        .nd-stat-sub { font-size: 0.68rem; color: var(--muted-foreground); }
        .nd-stat-icon { width: 42px; height: 42px; border-radius: 0.7rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* ── Quick Links ── */
        .nd-ql-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.8rem; }
        .nd-ql-item-modern { display: flex; align-items: center; gap: 0.6rem; text-decoration: none; color: var(--foreground); font-size: 0.8rem; font-weight: 600; padding: 0.6rem 0.8rem; border: 1px solid var(--border); border-radius: 0.5rem; background: var(--card); transition: all 0.2s ease; }
        .nd-ql-item-modern:hover { border-color: var(--primary); box-shadow: 0 4px 12px rgba(0,0,0,0.06); transform: translateY(-1px); }
        .nd-ql-icon-modern { width: 32px; height: 32px; border-radius: 0.4rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nd-ql-label-modern { flex: 1; }
        .nd-ql-chevron { color: var(--muted-foreground); opacity: 0; transform: translateX(-4px); transition: all 0.2s ease; }
        .nd-ql-item-modern:hover .nd-ql-chevron { opacity: 1; transform: translateX(0); }

        /* ── 3-col ── */
        .nd-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.1rem; }
        @media (max-width: 960px) { .nd-3col { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 580px) { .nd-3col { grid-template-columns: 1fr; } }

        /* Linear Progress & Avatars */
        .nd-progress-container { width: 100%; height: 6px; background: var(--border); border-radius: 999px; overflow: hidden; margin-bottom: 1rem; }
        .nd-progress-bar { height: 100%; border-radius: 999px; transition: width 0.3s ease; }
        .nd-progress-labels { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); margin-bottom: 0.4rem; }
        .nd-avatar-row { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; scrollbar-width: none; }
        .nd-avatar-row::-webkit-scrollbar { display: none; }
        .nd-avatar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(48px, 1fr)); gap: 0.8rem 0.5rem; max-height: 220px; overflow-y: auto; padding-bottom: 0.5rem; scrollbar-width: none; }
        .nd-avatar-grid::-webkit-scrollbar { display: none; }
        .nd-avatar-item { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; min-width: 48px; position: relative; cursor: pointer; }
        .nd-avatar-circle { width: 40px; height: 40px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 600; flex-shrink: 0; }
        .nd-avatar-name { font-size: 0.65rem; color: var(--muted-foreground); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
        
        /* Homework List */
        .nd-hw-filter { padding: 0.2rem 0.4rem; border-radius: 0.4rem; border: 1px solid var(--border); font-size: 0.7rem; color: var(--foreground); background: var(--card); outline: none; }
        .nd-hw-list { display: flex; flex-direction: column; gap: 0.6rem; max-height: 200px; overflow-y: auto; scrollbar-width: none; }
        .nd-hw-list::-webkit-scrollbar { display: none; }
        .nd-hw-item { padding: 0.6rem; border: 1px solid var(--border); border-radius: 0.5rem; background: var(--muted); }
        .nd-hw-title { font-size: 0.8rem; font-weight: 600; color: var(--foreground); margin-bottom: 0.2rem; }
        .nd-hw-desc { font-size: 0.7rem; color: var(--muted-foreground); margin-bottom: 0.4rem; line-height: 1.3; }
        .nd-hw-meta { display: flex; gap: 0.4rem; font-size: 0.65rem; font-weight: 500; }
        .nd-hw-badge { background: var(--card); color: var(--muted-foreground); border: 1px solid var(--border); padding: 0.1rem 0.3rem; border-radius: 0.25rem; }
        .nd-legend-dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }

        /* ── 2-col ── */
        .nd-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; }
        @media (max-width: 640px) { .nd-2col { grid-template-columns: 1fr; } }

        /* Risk */
        .nd-risk-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .nd-risk-item { display: flex; align-items: center; gap: 0.75rem; }
        .nd-risk-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem; flex-shrink: 0; }
        .nd-risk-name { font-size: 0.8rem; font-weight: 600; color: var(--foreground); margin-bottom: 0.1rem; }
        .nd-risk-reason { font-size: 0.7rem; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nd-risk-badge { font-size: 0.68rem; font-weight: 700; padding: 0.22rem 0.6rem; border-radius: 999px; white-space: nowrap; }

        /* Notifications */
        .nd-notif-list { display: flex; flex-direction: column; gap: 0.7rem; }
        .nd-notif-item { display: flex; align-items: flex-start; gap: 0.75rem; }
        .nd-notif-icon { width: 34px; height: 34px; border-radius: 0.6rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nd-notif-title { font-size: 0.8rem; font-weight: 600; color: var(--foreground); margin-bottom: 0.1rem; }
        .nd-notif-sub { font-size: 0.7rem; color: var(--muted-foreground); }
        .nd-notif-time { font-size: 0.65rem; color: var(--muted-foreground); white-space: nowrap; }
        .nd-notif-dot { width: 7px; height: 7px; border-radius: 50%; background: #6366f1; }

        /* ── Right Panel ── */
        .nd-right-panel { display: flex; flex-direction: column; gap: 1.25rem; position: sticky; top: 1rem; max-height: calc(100vh - 80px); overflow-y: auto; scrollbar-width: none; }
        .nd-right-panel::-webkit-scrollbar { display: none; }
        @media (max-width: 1150px) { .nd-right-panel { position: static; max-height: none; display: grid; grid-template-columns: 1fr 1fr; } }
        @media (max-width: 640px) { .nd-right-panel { grid-template-columns: 1fr; } }

        /* Calendar */
        .nd-cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.7rem; }
        .nd-cal-title { font-size: 0.85rem; font-weight: 700; color: var(--foreground); }
        .nd-cal-nav { background: none; border: 1px solid var(--border); border-radius: 0.4rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--muted-foreground); transition: all 0.15s; }
        .nd-cal-nav:hover { background: var(--muted); color: var(--foreground); }
        .nd-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .nd-cal-dow { font-size: 0.58rem; font-weight: 700; color: var(--muted-foreground); text-align: center; padding: 0.2rem 0; }
        .nd-cal-day { min-height: 34px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 500; color: var(--foreground); border-radius: 8px; cursor: pointer; transition: all 0.15s ease; border: 1px solid transparent; }
        .nd-cal-day:not(.empty):hover { background: var(--muted); border-color: var(--primary); transform: scale(1.08); z-index: 2; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); }
        .nd-cal-day.empty { color: transparent; cursor: default; }
        .nd-cal-day.today { background: #6366f1 !important; color: white !important; font-weight: 700; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4); }
        @keyframes nd-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        /* Schedule */
        .nd-sch-list { display: flex; flex-direction: column; gap: 0.6rem; }
        .nd-sch-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.7rem; border-radius: 0.65rem; border: 1px solid var(--border); transition: border-color 0.15s; }
        .nd-sch-item.active { border-color: #6366f1; background: rgba(99, 102, 241, 0.12); }
        .nd-sch-time { display: flex; flex-direction: column; align-items: flex-end; font-size: 0.63rem; color: var(--muted-foreground); min-width: 50px; line-height: 1.6; }
        .nd-sch-item.active .nd-sch-time { color: #6366f1; }
        .nd-sch-bar { width: 3px; height: 32px; border-radius: 3px; flex-shrink: 0; }
        .nd-sch-subj { font-size: 0.77rem; font-weight: 600; color: var(--foreground); margin-bottom: 0.1rem; }
        .nd-sch-room { font-size: 0.68rem; color: var(--muted-foreground); }
        .nd-sch-now { font-size: 0.62rem; font-weight: 700; background: #6366f1; color: white; padding: 0.18rem 0.45rem; border-radius: 999px; }

        /* Reminders */
        .nd-rem-list { display: flex; flex-direction: column; gap: 0.7rem; }
        .nd-rem-item { display: flex; align-items: center; gap: 0.7rem; cursor: pointer; padding: 0.25rem 0; }
        .nd-rem-item:hover .nd-rem-title { color: #6366f1; }
        .nd-rem-icon { width: 34px; height: 34px; border-radius: 0.6rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .nd-rem-title { font-size: 0.8rem; font-weight: 600; color: var(--foreground); margin-bottom: 0.1rem; transition: color 0.15s; }
        .nd-rem-sub { font-size: 0.7rem; color: var(--muted-foreground); }
      `}</style>
    </div>
  );
}
