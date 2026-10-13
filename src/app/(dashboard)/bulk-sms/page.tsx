"use client";

import React, { useState } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  Send, Users, MessageSquare, CheckCircle, Clock, AlertTriangle,
  Smartphone, Filter, Search, Plus, RefreshCw, Copy, Check,
  Sparkles, ShieldCheck, ChevronRight, FileText, Calendar,
  CreditCard, Info, ArrowUpRight, Radio, Bell, GraduationCap, UserCheck
} from 'lucide-react';

interface SMSCampaign {
  id: string;
  title: string;
  targetGroup: string;
  recipientsCount: number;
  smsCount: number;
  totalCredits: number;
  sentAt: string;
  status: 'delivered' | 'processing' | 'scheduled' | 'failed';
  deliveryRate: number;
  senderId: string;
}

interface SMSTemplate {
  id: string;
  title: string;
  category: 'Attendance' | 'Fees' | 'Examination' | 'General' | 'Emergency';
  content: string;
  charCount: number;
}

const STATIC_CAMPAIGNS: SMSCampaign[] = [
  {
    id: 'CMP-2026-089',
    title: 'Monthly Tuition Fee Reminder - May',
    targetGroup: 'Unpaid Students (All Classes)',
    recipientsCount: 342,
    smsCount: 1,
    totalCredits: 342,
    sentAt: '2026-05-10 10:30 AM',
    status: 'delivered',
    deliveryRate: 99.4,
    senderId: 'SCHOOLCARE',
  },
  {
    id: 'CMP-2026-088',
    title: 'Class 10 Model Test Examination Schedule',
    targetGroup: 'Class 10 (All Sections)',
    recipientsCount: 180,
    smsCount: 2,
    totalCredits: 360,
    sentAt: '2026-05-08 04:15 PM',
    status: 'delivered',
    deliveryRate: 100,
    senderId: 'SCHOOLCARE',
  },
  {
    id: 'CMP-2026-087',
    title: 'Daily Absentee Notification - May 08',
    targetGroup: 'Absent Students (Daily)',
    recipientsCount: 28,
    smsCount: 1,
    totalCredits: 28,
    sentAt: '2026-05-08 11:00 AM',
    status: 'delivered',
    deliveryRate: 96.4,
    senderId: 'SCHOOLCARE',
  },
  {
    id: 'CMP-2026-086',
    title: 'Parent-Teacher Meeting (PTM) Invitation',
    targetGroup: 'Class 6 - Class 8 Parents',
    recipientsCount: 520,
    smsCount: 1,
    totalCredits: 520,
    sentAt: '2026-05-05 02:00 PM',
    status: 'delivered',
    deliveryRate: 98.8,
    senderId: 'SCHOOLCARE',
  },
  {
    id: 'CMP-2026-085',
    title: 'Urgent Weather Advisory - School Closes at 1 PM',
    targetGroup: 'All Students & Staff',
    recipientsCount: 1420,
    smsCount: 1,
    totalCredits: 1420,
    sentAt: '2026-05-02 09:10 AM',
    status: 'delivered',
    deliveryRate: 99.8,
    senderId: 'SCHOOLCARE',
  },
  {
    id: 'CMP-2026-084',
    title: 'Summer Vacation Orientation Notice',
    targetGroup: 'All Parents',
    recipientsCount: 1350,
    smsCount: 1,
    totalCredits: 1350,
    sentAt: '2026-05-15 09:00 AM',
    status: 'scheduled',
    deliveryRate: 0,
    senderId: 'SCHOOLCARE',
  },
];

const STATIC_TEMPLATES: SMSTemplate[] = [
  {
    id: 'TMP-001',
    title: 'Daily Absence Alert',
    category: 'Attendance',
    content: 'Dear Parent, your child {student_name} (Class: {class}, Roll: {roll_no}) is marked ABSENT today ({date}). Please inform the school if unexpected. - {school_name}',
    charCount: 153,
  },
  {
    id: 'TMP-002',
    title: 'Tuition Fee Due Reminder',
    category: 'Fees',
    content: 'Dear Parent, tuition fees for {student_name} of BDT {due_amount} for this month is pending. Kindly clear dues before {date} to avoid late fines. - {school_name}',
    charCount: 158,
  },
  {
    id: 'TMP-003',
    title: 'Exam Routine & Admit Card',
    category: 'Examination',
    content: 'Notice: Term Final Exam begins on {date}. Admit cards for {student_name} have been published. Check routine on the student portal. - {school_name}',
    charCount: 143,
  },
  {
    id: 'TMP-004',
    title: 'Emergency Holiday Announcement',
    category: 'Emergency',
    content: 'Urgent: Due to unavoidable weather conditions, {school_name} will remain closed on {date}. Regular classes resume the following day.',
    charCount: 135,
  },
  {
    id: 'TMP-005',
    title: 'Parent-Teacher Meeting (PTM)',
    category: 'General',
    content: 'Dear Guardian, you are cordially invited to the Parent-Teacher Meeting for {student_name} on {date} at 10:00 AM. Your presence is vital. - {school_name}',
    charCount: 157,
  },
];

const DYNAMIC_TAGS = [
  { tag: '{student_name}', label: 'Student Name', sample: 'Tahmid Rahman' },
  { tag: '{class}', label: 'Class', sample: 'Class 9' },
  { tag: '{section}', label: 'Section', sample: 'Section A' },
  { tag: '{roll_no}', label: 'Roll No', sample: '14' },
  { tag: '{due_amount}', label: 'Due Amount', sample: '3,500' },
  { tag: '{date}', label: 'Date', sample: '15 May 2026' },
  { tag: '{school_name}', label: 'School Name', sample: 'SchoolCare Academy' },
];

export default function BulkSMSPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'templates' | 'settings'>('compose');

  // Compose State
  const [targetAudience, setTargetAudience] = useState<'all' | 'class' | 'teachers' | 'custom'>('all');
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [selectedSection, setSelectedSection] = useState('All Sections');
  const [senderId, setSenderId] = useState('SCHOOLCARE');
  const [message, setMessage] = useState(
    'Dear Parent, your child {student_name} (Class: {class}, Roll: {roll_no}) is marked ABSENT today ({date}). Please inform the school if unexpected. - {school_name}'
  );
  const [scheduleType, setScheduleType] = useState<'instant' | 'scheduled'>('instant');
  const [scheduledDateTime, setScheduledDateTime] = useState('2026-05-15T09:00');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Search in History
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');

  // Copy Template State
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  // Calculation helpers
  const charLength = message.length;
  const isUnicode = /[^\u0000-\u007f]/.test(message);
  const charsPerSMS = isUnicode ? 70 : 160;
  const smsParts = Math.max(1, Math.ceil(charLength / charsPerSMS));

  const getRecipientCount = () => {
    switch (targetAudience) {
      case 'all': return 1350;
      case 'class': return 120;
      case 'teachers': return 68;
      case 'custom': return 45;
    }
  };

  const totalRecipients = getRecipientCount();
  const totalCreditsRequired = totalRecipients * smsParts;

  // Render live preview replacing tags with samples
  const getRenderedPreview = () => {
    let preview = message;
    DYNAMIC_TAGS.forEach(({ tag, sample }) => {
      preview = preview.replaceAll(tag, sample);
    });
    return preview;
  };

  const handleInsertTag = (tag: string) => {
    setMessage(prev => prev + ' ' + tag);
  };

  const handleApplyTemplate = (tpl: SMSTemplate) => {
    setMessage(tpl.content);
    setActiveTab('compose');
  };

  const handleCopyTemplate = (tpl: SMSTemplate) => {
    navigator.clipboard.writeText(tpl.content);
    setCopiedTemplateId(tpl.id);
    setTimeout(() => setCopiedTemplateId(null), 2000);
  };

  const handleSendBroadcast = () => {
    if (!message.trim()) return;
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 4000);
    }, 1200);
  };

  const filteredCampaigns = STATIC_CAMPAIGNS.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      c.targetGroup.toLowerCase().includes(historySearch.toLowerCase());
    const matchesFilter = historyFilter === 'all' || c.status === historyFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* ── Page Header ────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.65rem', background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700 }}>
              <Radio size={13} className="animate-pulse" /> Telecomm Gateway
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Approved Masking: <strong>SCHOOLCARE</strong></span>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.025em' }}>
            Bulk SMS Broadcast
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.35rem', fontSize: '0.98rem' }}>
            Send instant notices, emergency broadcasts, attendance alerts, and fee reminders to thousands of parents in one click.
          </p>
        </div>

        {/* Top Header Actions / Balance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.85rem', padding: '0.65rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.balance')}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.1 }}>8,450 <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#10b981' }}>Credits</span></div>
            </div>
          </div>

          <button
            onClick={() => alert('Opening Secure Telecom Payment Gateway... (Simulation)')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.75rem 1.35rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.85rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px -3px rgba(79,70,229,0.35)' }}
          >
            <Plus size={16} /> Recharge Credits
          </button>
        </div>
      </div>

      {/* ── KPI Stats Cards ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.1rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.sentThisMonth')}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--foreground)' }}>24,180</div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>↑ +14.2% vs last month</div>
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.1rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.deliveryRate')}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--foreground)' }}>99.4%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>24,035 Successful</div>
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.1rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Scheduled Campaigns</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--foreground)' }}>3</div>
            <div style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 600 }}>Next: May 15 at 9:00 AM</div>
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.1rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Failed / Invalid Numbers</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--foreground)' }}>42</div>
            <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>0.6% bounce rate</div>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '2rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { key: 'compose', label: 'Compose Broadcast', icon: Send },
          { key: 'history', label: 'Sent Campaigns & Logs', icon: Clock },
          { key: 'templates', label: 'Message Templates', icon: FileText },
          { key: 'settings', label: 'Gateway Configuration', icon: ShieldCheck },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.85rem 1.4rem',
                border: 'none',
                background: 'none',
                color: isActive ? '#4f46e5' : 'var(--muted-foreground)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.92rem',
                cursor: 'pointer',
                borderBottom: isActive ? '3px solid #4f46e5' : '3px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: Compose Broadcast ───────────────────────────── */}
      {activeTab === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(360px, 1fr)', gap: '2rem', alignItems: 'start' }}>
          
          {/* Left Form: Configuration */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '2rem', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.04)' }}>
            
            {broadcastSuccess && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'fadeIn 0.3s ease-out' }}>
                <CheckCircle size={22} color="#16a34a" />
                <div>
                  <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.95rem' }}>Broadcast Successfully Queued!</div>
                  <div style={{ fontSize: '0.82rem', color: '#15803d' }}>
                    Sent to {totalRecipients} recipients ({totalCreditsRequired} credits deducted). Delivery reports are updating live.
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* 1. Target Audience */}
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--foreground)', display: 'block', marginBottom: '0.5rem' }}>
                  1. Select Target Audience
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                  {[
                    { id: 'all', label: 'All Parents', count: '1,350', icon: Users },
                    { id: 'class', label: 'Specific Class', count: '120', icon: GraduationCap },
                    { id: 'teachers', label: 'Staff & Teachers', count: '68', icon: UserCheck },
                    { id: 'custom', label: 'Custom List', count: 'Manual', icon: Smartphone },
                  ].map(aud => {
                    const isSelected = targetAudience === aud.id;
                    return (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => setTargetAudience(aud.id as any)}
                        style={{
                          padding: '0.85rem 0.65rem',
                          borderRadius: '0.75rem',
                          border: isSelected ? '2px solid #4f46e5' : '1px solid var(--border)',
                          background: isSelected ? 'rgba(79, 70, 229, 0.05)' : 'var(--background)',
                          color: isSelected ? '#4f46e5' : 'var(--foreground)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.18s',
                        }}
                      >
                        <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{aud.label}</span>
                        <span style={{ fontSize: '0.72rem', color: isSelected ? '#4f46e5' : 'var(--muted-foreground)', background: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'rgba(0,0,0,0.04)', padding: '0.1rem 0.5rem', borderRadius: '99px' }}>
                          {aud.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-selectors for Class & Section */}
                {targetAudience === 'class' && (
                  <div style={{ marginTop: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.3rem' }}>Select Class</label>
                      <select
                        value={selectedClass}
                        onChange={e => setSelectedClass(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none' }}
                      >
                        {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'HSC 1st Year', 'HSC 2nd Year'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.3rem' }}>Select Section</label>
                      <select
                        value={selectedSection}
                        onChange={e => setSelectedSection(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none' }}
                      >
                        {['All Sections', 'Section A (Padma)', 'Section B (Meghna)', 'Section C (Jamuna)'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Sender ID & Template */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--foreground)', display: 'block', marginBottom: '0.5rem' }}>
                    2. Sender ID (Masking)
                  </label>
                  <select
                    value={senderId}
                    onChange={e => setSenderId(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="SCHOOLCARE">SCHOOLCARE (Masked - Approved)</option>
                    <option value="EDUALERT">EDUALERT (Emergency Masking)</option>
                    <option value="Non-Masking">01888-XXXXXX (Non-masking)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--foreground)', display: 'block', marginBottom: '0.5rem' }}>
                    Load Template
                  </label>
                  <select
                    onChange={e => {
                      const tpl = STATIC_TEMPLATES.find(t => t.id === e.target.value);
                      if (tpl) setMessage(tpl.content);
                    }}
                    defaultValue=""
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="" disabled>Choose quick template...</option>
                    {STATIC_TEMPLATES.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.title} ({tpl.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Dynamic Variables Pills */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    3. Dynamic Personalization Tags
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Click to append at cursor</span>
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  {DYNAMIC_TAGS.map(item => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => handleInsertTag(item.tag)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '99px',
                        background: 'rgba(79, 70, 229, 0.08)',
                        color: '#4f46e5',
                        border: '1px solid rgba(79, 70, 229, 0.2)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      title={`Replaces with e.g. "${item.sample}"`}
                    >
                      + {item.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Message Content Box */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    4. Message Content
                  </label>
                  <span style={{ fontSize: '0.75rem', color: isUnicode ? '#ea580c' : '#16a34a', fontWeight: 600 }}>
                    {isUnicode ? '● Unicode (Bangla/Special characters detected)' : '● Standard GSM (English/ASCII)'}
                  </span>
                </div>

                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Type your SMS broadcast text here..."
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.92rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Character & Parts Count Footbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.4rem 0.5rem', background: 'var(--background)', borderRadius: '0.55rem', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  <span>
                    Characters: <strong style={{ color: 'var(--foreground)' }}>{charLength}</strong> / {charsPerSMS} max per SMS
                  </span>
                  <span>
                    Parts: <strong style={{ color: '#4f46e5' }}>{smsParts} SMS</strong> ({smsParts > 1 ? 'Multi-part message' : 'Single message'})
                  </span>
                </div>
              </div>

              {/* 5. Dispatch Scheduling */}
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--foreground)', display: 'block', marginBottom: '0.5rem' }}>
                  5. Dispatch Schedule
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--foreground)' }}>
                    <input
                      type="radio"
                      name="scheduleType"
                      checked={scheduleType === 'instant'}
                      onChange={() => setScheduleType('instant')}
                    />
                    Send Instantly
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--foreground)' }}>
                    <input
                      type="radio"
                      name="scheduleType"
                      checked={scheduleType === 'scheduled'}
                      onChange={() => setScheduleType('scheduled')}
                    />
                    Schedule for Later
                  </label>

                  {scheduleType === 'scheduled' && (
                    <input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={e => setScheduledDateTime(e.target.value)}
                      style={{ padding: '0.5rem 0.8rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    />
                  )}
                </div>
              </div>

              {/* Summary & Submit Button */}
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Estimated Cost:</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--foreground)' }}>
                    {totalCreditsRequired} Credits <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>({totalRecipients} recipients × {smsParts} SMS)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  disabled={isBroadcasting || !message.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    padding: '0.85rem 1.85rem',
                    borderRadius: '0.85rem',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: isBroadcasting || !message.trim() ? 'not-allowed' : 'pointer',
                    opacity: isBroadcasting || !message.trim() ? 0.6 : 1,
                    boxShadow: '0 4px 16px -2px rgba(79,70,229,0.4)',
                    transition: 'all 0.18s',
                  }}
                >
                  {isBroadcasting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" /> Transmitting Broadcast...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Broadcast to {totalRecipients} Recipients
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Column: Live Mobile Mockup */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'sticky', top: '1.5rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem', color: 'var(--muted-foreground)', fontSize: '0.85rem', fontWeight: 600 }}>
              <Smartphone size={16} /> Live Recipient Phone Preview
            </div>

            {/* Smartphone Case Mockup */}
            <div
              style={{
                width: '320px',
                height: '620px',
                background: '#0f172a',
                borderRadius: '44px',
                padding: '12px',
                boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Smartphone Inner Screen */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '34px',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Phone Speaker Notch */}
                <div style={{ height: '24px', background: 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '4px' }}>
                  <div style={{ width: '80px', height: '14px', background: '#0f172a', borderRadius: '12px' }} />
                </div>

                {/* SMS App Header */}
                <div style={{ padding: '0.5rem 0.85rem 0.75rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.25rem', boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}>
                    SC
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.2 }}>
                    {senderId}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Verified SMS Sender
                  </div>
                </div>

                {/* Messages Chat Area */}
                <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                  {/* Timestamp Badge */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '99px' }}>
                      Today 3:45 PM
                    </span>
                  </div>

                  {/* SMS Bubble */}
                  <div
                    style={{
                      background: '#ffffff',
                      color: '#1e293b',
                      borderRadius: '16px 16px 16px 4px',
                      padding: '0.85rem 1rem',
                      maxWidth: '88%',
                      alignSelf: 'flex-start',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.82rem',
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                      animation: 'fadeIn 0.2s ease-out',
                    }}
                  >
                    {message.trim() ? (
                      getRenderedPreview()
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        Start typing message on the left to preview live...
                      </span>
                    )}
                    <div style={{ textAlign: 'right', marginTop: '0.35rem', fontSize: '0.62rem', color: '#94a3b8' }}>
                      Delivered • Just now
                    </div>
                  </div>

                </div>

                {/* Bottom Input Mock */}
                <div style={{ padding: '0.65rem 0.85rem', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '18px', padding: '0.4rem 0.85rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Text Message...
                  </div>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <ArrowUpRight size={14} />
                  </div>
                </div>

                {/* Home Indicator */}
                <div style={{ height: '14px', background: '#ffffff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '100px', height: '4px', background: '#cbd5e1', borderRadius: '99px' }} />
                </div>
              </div>
            </div>

            {/* Telco Route Status */}
            <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--muted-foreground)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> GP Direct
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Robi/Airtel
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Banglalink
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Teletalk
              </span>
            </div>

          </div>

        </div>
      )}

      {/* ── TAB 2: Sent Campaigns & Logs ───────────────────────── */}
      {activeTab === 'history' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.04)' }}>
          
          {/* Table Header Filter Controls */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '0.9rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Filter size={15} style={{ color: 'var(--muted-foreground)' }} />
              <select
                value={historyFilter}
                onChange={e => setHistoryFilter(e.target.value)}
                style={{ padding: '0.55rem 0.9rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none' }}
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="scheduled">Scheduled</option>
                <option value="processing">Processing</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '1rem 1.5rem' }}>Campaign & ID</th>
                  <th style={{ padding: '1rem 1rem' }}>Target Audience</th>
                  <th style={{ padding: '1rem 1rem' }}>Recipients</th>
                  <th style={{ padding: '1rem 1rem' }}>Credits</th>
                  <th style={{ padding: '1rem 1rem' }}>Date & Time</th>
                  <th style={{ padding: '1rem 1rem' }}>{t('bulkSms.deliveryRate')}</th>
                  <th style={{ padding: '1rem 1rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map(cmp => (
                  <tr key={cmp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1.1rem 1.5rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>{cmp.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>{cmp.id} • {cmp.senderId}</div>
                    </td>
                    <td style={{ padding: '1.1rem 1rem', color: 'var(--foreground)', fontWeight: 500 }}>
                      {cmp.targetGroup}
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{cmp.recipientsCount.toLocaleString()}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}> ({cmp.smsCount} SMS/recp)</span>
                    </td>
                    <td style={{ padding: '1.1rem 1rem', fontWeight: 700, color: '#4f46e5' }}>
                      {cmp.totalCredits.toLocaleString()}
                    </td>
                    <td style={{ padding: '1.1rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>
                      {cmp.sentAt}
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      {cmp.status === 'scheduled' ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Pending</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div style={{ width: '60px', height: '6px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ width: `${cmp.deliveryRate}%`, height: '100%', background: cmp.deliveryRate > 95 ? '#10b981' : '#f59e0b' }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--foreground)' }}>{cmp.deliveryRate}%</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1.1rem 1rem' }}>
                      {cmp.status === 'delivered' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '99px', background: '#f0fdf4', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>
                          <CheckCircle size={12} /> Delivered
                        </span>
                      )}
                      {cmp.status === 'scheduled' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '99px', background: '#eff6ff', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700 }}>
                          <Clock size={12} /> Scheduled
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1.1rem 1.5rem', textAlign: 'right' }}>
                      <button
                        onClick={() => alert(`Showing delivery logs for campaign: ${cmp.title}`)}
                        style={{ padding: '0.4rem 0.8rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Delivery Log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: Message Templates ───────────────────────────── */}
      {activeTab === 'templates' && (
        <div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>Pre-approved Templates</h2>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Choose a telecom regulator approved template to broadcast in seconds.</p>
            </div>
            <button
              onClick={() => alert('Template creation request sent to telecom authority for review.')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.15rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.65rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <Plus size={15} /> Request New Template
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {STATIC_TEMPLATES.map(tpl => {
              const categoryColors: Record<string, { bg: string; text: string }> = {
                Attendance: { bg: '#eef2ff', text: '#4f46e5' },
                Fees: { bg: '#f0fdf4', text: '#16a34a' },
                Examination: { bg: '#fff7ed', text: '#ea580c' },
                Emergency: { bg: '#fef2f2', text: '#dc2626' },
                General: { bg: '#f1f5f9', text: '#475569' },
              };
              const col = categoryColors[tpl.category] || categoryColors.General;

              return (
                <div
                  key={tpl.id}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '1.1rem',
                    padding: '1.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '99px', background: col.bg, color: col.text, fontSize: '0.75rem', fontWeight: 700 }}>
                        {tpl.category}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                        {tpl.id}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--foreground)' }}>
                      {tpl.title}
                    </h3>

                    <div style={{ background: 'var(--background)', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', fontSize: '0.84rem', color: 'var(--foreground)', lineHeight: 1.5, marginBottom: '0.85rem' }}>
                      {tpl.content}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                      Length: <strong>{tpl.charCount}</strong> chars (1 SMS Part)
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <button
                      onClick={() => handleApplyTemplate(tpl)}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0',
                        borderRadius: '0.6rem',
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Send size={14} /> Use Template
                    </button>
                    <button
                      onClick={() => handleCopyTemplate(tpl)}
                      style={{
                        padding: '0.55rem 0.85rem',
                        borderRadius: '0.6rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                      title="Copy text"
                    >
                      {copiedTemplateId === tpl.id ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: Gateway Configuration ───────────────────────── */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--foreground)' }}>Telecom Gateway Status</h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>Primary carrier connection</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Gateway Provider</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>SSL Wireless Telecom Hub</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Connection Health</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} /> Operational (Ping 38ms)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Masking Approval</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>SCHOOLCARE (BTRC Active)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Throughput Rate</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>500 SMS / second</span>
              </div>
            </div>

            <button
              onClick={() => alert('Ping Test: Connection healthy! Latency: 38ms.')}
              style={{ marginTop: '1.25rem', width: '100%', padding: '0.65rem 0', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
            >
              Test Gateway Ping
            </button>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--foreground)' }}>Automatic Event Triggers</h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>Auto-send SMS on school actions</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { title: 'Auto Absentee Alert', desc: 'Trigger SMS automatically when student marked absent by teacher', active: true },
                { title: 'Fee Payment Confirmation', desc: 'Send receipt SMS instantly when accountant collects tuition', active: true },
                { title: 'Exam Routine Publication', desc: 'Broadcast to parents when exam schedule is published', active: false },
              ].map((ev, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--foreground)' }}>{ev.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', maxWidth: '280px' }}>{ev.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={ev.active}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </div>
  );
}
