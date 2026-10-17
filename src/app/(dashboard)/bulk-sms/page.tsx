"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  Send, Users, MessageSquare, Clock, AlertTriangle,
  Smartphone, Filter, Search, Plus, RefreshCw, Copy, Check,
  ShieldCheck, FileText, Calendar, CreditCard,
  Bell, GraduationCap, UserCheck,
  Layers, LayoutGrid, FileSpreadsheet, ChevronDown, ChevronLeft,
  ChevronRight, X, Download, CheckCircle2, Eye, RotateCcw
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  messageText?: string;
}

interface SMSTemplate {
  id: string;
  title: string;
  category: 'Attendance' | 'Fees' | 'Examination' | 'General' | 'Emergency';
  content: string;
  charCount: number;
}

const INITIAL_CAMPAIGNS: SMSCampaign[] = [
  {
    id: 'CMP-2026-089',
    title: 'Monthly Tuition Fee Reminder - May',
    targetGroup: 'Unpaid Students (All Classes)',
    recipientsCount: 342,
    smsCount: 1,
    totalCredits: 342,
    sentAt: '2026-05-10T10:30:00',
    status: 'delivered',
    deliveryRate: 99.4,
    senderId: 'SCHOOLCARE',
    messageText: 'Dear Parent, tuition fees for {student_name} of BDT {due_amount} for this month is pending. Kindly clear dues before {date} to avoid late fines. - SchoolCare Academy',
  },
  {
    id: 'CMP-2026-088',
    title: 'Class 10 Model Test Examination Schedule',
    targetGroup: 'Class 10 (All Sections)',
    recipientsCount: 180,
    smsCount: 2,
    totalCredits: 360,
    sentAt: '2026-05-08T16:15:00',
    status: 'delivered',
    deliveryRate: 100,
    senderId: 'SCHOOLCARE',
    messageText: 'Notice: Term Final Exam begins on {date}. Admit cards for {student_name} have been published. Check routine on the student portal. - SchoolCare Academy',
  },
  {
    id: 'CMP-2026-087',
    title: 'Daily Absentee Notification - May 08',
    targetGroup: 'Absent Students (Daily)',
    recipientsCount: 28,
    smsCount: 1,
    totalCredits: 28,
    sentAt: '2026-05-08T11:00:00',
    status: 'delivered',
    deliveryRate: 96.4,
    senderId: 'SCHOOLCARE',
    messageText: 'Dear Parent, your child {student_name} (Class: {class}, Roll: {roll_no}) is marked ABSENT today ({date}). Please inform the school if unexpected. - SchoolCare Academy',
  },
  {
    id: 'CMP-2026-086',
    title: 'Parent-Teacher Meeting (PTM) Invitation',
    targetGroup: 'Class 6 - Class 8 Parents',
    recipientsCount: 520,
    smsCount: 1,
    totalCredits: 520,
    sentAt: '2026-05-05T14:00:00',
    status: 'delivered',
    deliveryRate: 98.8,
    senderId: 'SCHOOLCARE',
    messageText: 'Dear Guardian, you are cordially invited to the Parent-Teacher Meeting for {student_name} on {date} at 10:00 AM. Your presence is vital. - SchoolCare Academy',
  },
  {
    id: 'CMP-2026-085',
    title: 'Urgent Weather Advisory - School Closes at 1 PM',
    targetGroup: 'All Students & Staff',
    recipientsCount: 1420,
    smsCount: 1,
    totalCredits: 1420,
    sentAt: '2026-05-02T09:10:00',
    status: 'delivered',
    deliveryRate: 99.8,
    senderId: 'SCHOOLCARE',
    messageText: 'Urgent: Due to unavoidable weather conditions, SchoolCare Academy will remain closed on {date}. Regular classes resume the following day.',
  },
  {
    id: 'CMP-2026-084',
    title: 'Summer Vacation Orientation Notice',
    targetGroup: 'All Parents',
    recipientsCount: 1350,
    smsCount: 1,
    totalCredits: 1350,
    sentAt: '2026-05-15T09:00:00',
    status: 'scheduled',
    deliveryRate: 0,
    senderId: 'SCHOOLCARE',
    messageText: 'Dear Parents, please be advised that the annual Summer Vacation starts next week. Review holiday assignments on the student portal. - SchoolCare Academy',
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
  const { t, language } = useLanguage();
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>(INITIAL_CAMPAIGNS);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'gateway'>('campaigns');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [loading, setLoading] = useState(false);

  // Helper for Bengali number conversion
  const formatNumber = (num: number | string) => {
    if (num === null || num === undefined || num === '') return '';
    const numStr = typeof num === 'number' ? num.toLocaleString('en-US') : num.toString();
    if (language !== 'bn') return numStr;
    const banglaDigits: { [key: string]: string } = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    return numStr.replace(/[0-9]/g, (w) => banglaDigits[w] || w);
  };

  const getStatusLabel = (status: SMSCampaign['status']) => {
    switch (status) {
      case 'delivered':
        return t('bulkSms.statusDelivered') || 'Delivered';
      case 'scheduled':
        return t('bulkSms.statusScheduled') || 'Scheduled';
      case 'processing':
        return t('bulkSms.statusProcessing') || 'Processing';
      case 'failed':
        return t('bulkSms.statusFailed') || 'Failed';
      default:
        return status;
    }
  };

  const getCategoryLabel = (category: SMSTemplate['category']) => {
    switch (category) {
      case 'Attendance':
        return t('bulkSms.categoryAttendance') || 'Attendance';
      case 'Fees':
        return t('bulkSms.categoryFees') || 'Fees';
      case 'Examination':
        return t('bulkSms.categoryExamination') || 'Examination';
      case 'Emergency':
        return t('bulkSms.categoryEmergency') || 'Emergency';
      case 'General':
        return t('bulkSms.categoryGeneral') || 'General';
      default:
        return category;
    }
  };

  // Balance & KPIs
  const [creditsBalance, setCreditsBalance] = useState(8450);
  const [sentThisMonth, setSentThisMonth] = useState(24180);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Export dropdown
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<SMSCampaign | null>(null);

  // Compose State
  const [targetAudience, setTargetAudience] = useState<'all' | 'class' | 'teachers' | 'custom'>('all');
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [selectedSection, setSelectedSection] = useState('All Sections');
  const [senderId, setSenderId] = useState('SCHOOLCARE');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [message, setMessage] = useState(
    'Dear Parent, your child {student_name} (Class: {class}, Roll: {roll_no}) is marked ABSENT today ({date}). Please inform the school if unexpected. - {school_name}'
  );
  const [scheduleType, setScheduleType] = useState<'instant' | 'scheduled'>('instant');
  const [scheduledDateTime, setScheduledDateTime] = useState('2026-05-15T09:00');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // Notification Banner
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Copy template indicator
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  // Calculations for Compose
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

  // Close export dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear banner timeout
  useEffect(() => {
    if (!bannerMessage) return;
    const timer = setTimeout(() => setBannerMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [bannerMessage]);

  const formatSingleLineDate = (dateString?: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const datePart = d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart} • ${timePart}`;
  };

  // Insert tag into message
  const handleInsertTag = (tag: string) => {
    setMessage(prev => prev + ' ' + tag);
  };

  // Apply template in compose modal
  const handleApplyTemplate = (tpl: SMSTemplate) => {
    setMessage(tpl.content);
    setCampaignTitle(tpl.title);
    setIsComposeModalOpen(true);
  };

  const handleCopyTemplate = (tpl: SMSTemplate) => {
    navigator.clipboard.writeText(tpl.content);
    setCopiedTemplateId(tpl.id);
    setTimeout(() => setCopiedTemplateId(null), 2000);
  };

  // Handle Send Broadcast
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastError(null);

    if (!message.trim()) {
      setBroadcastError(t('bulkSms.alertEmptyMessage') || 'Please enter message content to broadcast.');
      return;
    }

    if (totalCreditsRequired > creditsBalance) {
      const errMsg = (t('bulkSms.alertInsufficientCredits') || 'Insufficient SMS credits. Required: {required}, Available: {available}. Please recharge.')
        .replace('{required}', formatNumber(totalCreditsRequired))
        .replace('{available}', formatNumber(creditsBalance));
      setBroadcastError(errMsg);
      return;
    }

    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);

      const newId = `CMP-2026-${String(campaigns.length + 90).padStart(3, '0')}`;
      const title = campaignTitle.trim() || `Broadcast to ${targetAudience === 'all' ? 'All Parents' : targetAudience === 'class' ? selectedClass : 'Custom Audience'}`;
      const newCampaign: SMSCampaign = {
        id: newId,
        title,
        targetGroup: targetAudience === 'all' ? 'All Parents & Guardians' : targetAudience === 'class' ? `${selectedClass} (${selectedSection})` : 'Teachers & Staff',
        recipientsCount: totalRecipients,
        smsCount: smsParts,
        totalCredits: totalCreditsRequired,
        sentAt: scheduleType === 'scheduled' ? scheduledDateTime : new Date().toISOString(),
        status: scheduleType === 'scheduled' ? 'scheduled' : 'delivered',
        deliveryRate: scheduleType === 'scheduled' ? 0 : 99.6,
        senderId,
        messageText: message,
      };

      setCampaigns(prev => [newCampaign, ...prev]);
      setCreditsBalance(prev => Math.max(0, prev - totalCreditsRequired));
      if (scheduleType === 'instant') {
        setSentThisMonth(prev => prev + totalRecipients);
      }

      setIsComposeModalOpen(false);
      const successMsg = (t('bulkSms.alertQueued') || 'Campaign "{title}" successfully queued to {recipients} recipients ({credits} credits deducted).')
        .replace('{title}', title)
        .replace('{recipients}', formatNumber(totalRecipients))
        .replace('{credits}', formatNumber(totalCreditsRequired));
      setBannerMessage(successMsg);
    }, 1200);
  };

  // Recharge credits simulation
  const handleRechargeCredits = (amount: number) => {
    setCreditsBalance(prev => prev + amount);
    setIsRechargeModalOpen(false);
    const rechargeMsg = (t('bulkSms.alertRecharged') || 'Successfully recharged {amount} SMS credits to account.')
      .replace('{amount}', formatNumber(amount));
    setBannerMessage(rechargeMsg);
  };

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.targetGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.senderId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesAudience = audienceFilter === 'all' || c.targetGroup.toLowerCase().includes(audienceFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesAudience;
    });
  }, [campaigns, searchTerm, statusFilter, audienceFilter]);

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (audienceFilter !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);

  const resetAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setAudienceFilter('all');
    setPage(1);
  };

  // Paginated campaigns
  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / limit));
  const paginatedCampaigns = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredCampaigns.slice(start, start + limit);
  }, [filteredCampaigns, page, limit]);

  // Export to CSV
  const handleExportCSV = () => {
    setExportDropdownOpen(false);
    if (filteredCampaigns.length === 0) return;

    const headers = [
      '#',
      t('bulkSms.colCampaignId') || 'Campaign ID',
      t('common.title') || 'Title',
      t('bulkSms.colAudience') || 'Audience',
      t('bulkSms.colRecipients') || 'Recipients',
      t('bulkSms.parts') || 'SMS Parts',
      t('bulkSms.colCredits') || 'Credits',
      t('bulkSms.colDateTime') || 'Sent Date',
      t('bulkSms.colStatus') || 'Status',
      t('bulkSms.colDeliveryRate') || 'Delivery Rate'
    ];
    const rows = filteredCampaigns.map((c, idx) => [
      formatNumber(idx + 1),
      `"${c.id}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.targetGroup.replace(/"/g, '""')}"`,
      formatNumber(c.recipientsCount),
      formatNumber(c.smsCount),
      formatNumber(c.totalCredits),
      `"${formatSingleLineDate(c.sentAt)}"`,
      `"${getStatusLabel(c.status)}"`,
      `"${formatNumber(c.deliveryRate)}%"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sms_campaigns_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to PDF
  const handleExportPDF = () => {
    setExportDropdownOpen(false);
    if (filteredCampaigns.length === 0) return;

    const doc = new jsPDF('landscape');

    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229);
    doc.text('Bulk SMS Broadcasts & Campaigns Report', 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const subtitle = `Total Campaigns: ${formatNumber(filteredCampaigns.length)} | Available Credits: ${formatNumber(creditsBalance)} | Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    doc.text(subtitle, 14, 25);

    const tableColumn = ['#', 'Campaign ID', 'Title', 'Audience', 'Recipients', 'Credits', 'Date & Time', 'Status', 'Rate'];
    const tableRows = filteredCampaigns.map((c, idx) => [
      formatNumber(idx + 1),
      c.id,
      c.title,
      c.targetGroup,
      formatNumber(c.recipientsCount),
      formatNumber(c.totalCredits),
      formatSingleLineDate(c.sentAt),
      c.status.toUpperCase(),
      `${formatNumber(c.deliveryRate)}%`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      didDrawPage: data => {
        const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
      }
    });

    doc.save(`sms_campaigns_report.pdf`);
  };

  // Download single campaign voucher / delivery report
  const handleDownloadCampaignPDF = (c: SMSCampaign) => {
    const doc = new jsPDF('portrait');

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 26, 'F');

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('BULK SMS DISPATCH REPORT', 14, 16);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`CAMPAIGN AUDIT VOUCHER • SENDER: ${c.senderId}`, 14, 22);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10.5);

    const startY = 38;
    doc.setFont('helvetica', 'bold');
    doc.text('Campaign Title:', 14, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(c.title, 60, startY);

    doc.setFont('helvetica', 'bold');
    doc.text('Campaign ID:', 14, startY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(c.id, 60, startY + 10);

    doc.setFont('helvetica', 'bold');
    doc.text('Target Audience:', 14, startY + 20);
    doc.setFont('helvetica', 'normal');
    doc.text(c.targetGroup, 60, startY + 20);

    doc.setFont('helvetica', 'bold');
    doc.text('Dispatched At:', 14, startY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(formatSingleLineDate(c.sentAt), 60, startY + 30);

    doc.setFont('helvetica', 'bold');
    doc.text('Recipients Count:', 14, startY + 40);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatNumber(c.recipientsCount)} Contacts (${formatNumber(c.smsCount)} SMS/recp)`, 60, startY + 40);

    doc.setFont('helvetica', 'bold');
    doc.text('Total Credits Used:', 14, startY + 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatNumber(c.totalCredits)} Credits`, 60, startY + 50);

    doc.setFont('helvetica', 'bold');
    doc.text('Delivery Success Rate:', 14, startY + 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatNumber(c.deliveryRate)}% (${formatNumber(Math.round((c.recipientsCount * c.deliveryRate) / 100))} Delivered)`, 60, startY + 60);

    // Message box
    doc.setFont('helvetica', 'bold');
    doc.text('Dispatched Message:', 14, startY + 74);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, startY + 80, 182, 36, 3, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(70, 70, 70);
    doc.text(c.messageText || 'Standard broadcast message transmitted via telecomm gateway.', 18, startY + 90, { maxWidth: 174 });

    doc.save(`sms_campaign_${c.id}.pdf`);
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* ── Top Metric Summary Cards (Directly at top without page title header) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* Available Credits Card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', minWidth: 0 }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CreditCard size={26} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.balance') || 'SMS Balance'}</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.15, marginTop: '0.15rem' }}>
                {formatNumber(creditsBalance)} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16a34a' }}>{t('bulkSms.credits') || 'Credits'}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('bulkSms.masking') || 'Masking'}: <strong>SCHOOLCARE</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRechargeModalOpen(true)}
            style={{ padding: '0.35rem 0.65rem', borderRadius: '0.55rem', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {t('bulkSms.topUp') || '+ Top Up'}
          </button>
        </div>

        {/* Sent This Month Card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send size={26} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.sentThisMonth') || 'Sent This Month'}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.15, marginTop: '0.15rem' }}>
              {formatNumber(sentThisMonth)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '0.2rem', whiteSpace: 'nowrap' }}>
              ↑ +{formatNumber('14.2')}% {t('bulkSms.vsLastMonth') || 'vs last month'}
            </div>
          </div>
        </div>

        {/* Delivery Rate Card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={26} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.deliveryRate') || 'Delivery Rate'}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.15, marginTop: '0.15rem' }}>
              {formatNumber('99.4')}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem', whiteSpace: 'nowrap' }}>
              {formatNumber(24035)} {t('bulkSms.successfulDeliveries') || 'Successful deliveries'}
            </div>
          </div>
        </div>

        {/* Scheduled Campaigns Card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={26} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.scheduledCampaigns') || 'Scheduled Campaigns'}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.15, marginTop: '0.15rem' }}>
              {formatNumber(campaigns.filter(c => c.status === 'scheduled').length)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 600, marginTop: '0.2rem', whiteSpace: 'nowrap' }}>
              {t('bulkSms.nextScheduled') || 'Next'}: {language === 'bn' ? '১৫ মে • সকাল ৯:০০' : 'May 15 • 9:00 AM'}
            </div>
          </div>
        </div>

      </div>

      {/* Success / Info Banner */}
      {bannerMessage && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '0.9rem 1.25rem',
          borderRadius: '0.85rem',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={18} />
            <span>{bannerMessage}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Main Data Wrapper ──────────────────────────────────── */}
      <div className="data-table-wrapper glass-card" style={{ background: 'var(--card)', borderRadius: '1.25rem', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        
        {/* Table Toolbar Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '380px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                border: '1px solid var(--border)', 
                borderRadius: '0.75rem', 
                padding: '0 0.875rem', 
                height: '42px', 
                background: 'var(--background)',
                transition: 'all 0.2s',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <Search size={17} style={{ color: 'var(--muted-foreground)', marginRight: '0.625rem', flexShrink: 0 }} />
                <input 
                  type="text" 
                  placeholder={t('bulkSms.searchPlaceholder') || 'Search campaigns, ID, or audience...'} 
                  style={{ 
                    border: 'none', 
                    outline: 'none', 
                    background: 'transparent', 
                    width: '100%', 
                    color: 'var(--foreground)',
                    fontSize: '0.9rem'
                  }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Toolbar Action Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              
              {/* Module Sub-Tabs (Campaigns, Templates, Gateway) */}
              <div style={{ display: 'flex', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3px', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('campaigns')}
                  style={{
                    padding: '0 0.8rem',
                    height: '34px',
                    borderRadius: '0.55rem',
                    border: 'none',
                    background: activeTab === 'campaigns' ? '#4f46e5' : 'transparent',
                    color: activeTab === 'campaigns' ? '#ffffff' : 'var(--muted-foreground)',
                    fontSize: '0.82rem',
                    fontWeight: activeTab === 'campaigns' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s'
                  }}
                >
                  <Clock size={14} /> {t('bulkSms.tabCampaigns') || 'Campaigns'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('templates')}
                  style={{
                    padding: '0 0.8rem',
                    height: '34px',
                    borderRadius: '0.55rem',
                    border: 'none',
                    background: activeTab === 'templates' ? '#4f46e5' : 'transparent',
                    color: activeTab === 'templates' ? '#ffffff' : 'var(--muted-foreground)',
                    fontSize: '0.82rem',
                    fontWeight: activeTab === 'templates' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s'
                  }}
                >
                  <FileText size={14} /> {t('bulkSms.tabTemplates') || 'Templates'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('gateway')}
                  style={{
                    padding: '0 0.8rem',
                    height: '34px',
                    borderRadius: '0.55rem',
                    border: 'none',
                    background: activeTab === 'gateway' ? '#4f46e5' : 'transparent',
                    color: activeTab === 'gateway' ? '#ffffff' : 'var(--muted-foreground)',
                    fontSize: '0.82rem',
                    fontWeight: activeTab === 'gateway' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s'
                  }}
                >
                  <ShieldCheck size={14} /> {t('bulkSms.tabGateway') || 'Gateway'}
                </button>
              </div>

              {/* Filters Toggle Button (for Campaigns tab) */}
              {activeTab === 'campaigns' && (
                <button 
                  type="button"
                  onClick={() => setShowFilters(!showFilters)} 
                  style={{ 
                    border: showFilters || activeFiltersCount > 0 ? '1px solid #4f46e5' : '1px solid var(--border)', 
                    gap: '0.45rem', 
                    borderRadius: '0.75rem',
                    height: '42px',
                    padding: '0 0.95rem',
                    background: showFilters ? '#4f46e5' : 'var(--background)', 
                    color: showFilters ? '#ffffff' : 'var(--foreground)',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <Filter size={15} />
                  <span>{t('bulkSms.filters') || 'Filters'}</span>
                  {activeFiltersCount > 0 && (
                    <span style={{ 
                      background: showFilters ? '#ffffff' : '#4f46e5', 
                      color: showFilters ? '#4f46e5' : '#ffffff', 
                      fontSize: '0.72rem', 
                      borderRadius: '999px', 
                      padding: '0.1rem 0.45rem',
                      fontWeight: 700
                    }}>
                      {formatNumber(activeFiltersCount)}
                    </span>
                  )}
                </button>
              )}

              {/* View Mode Toggle (Table / Cards) */}
              {activeTab === 'campaigns' && (
                <div style={{ display: 'flex', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3px' }}>
                  <button
                    type="button"
                    title={t('bulkSms.tableView') || 'Table View'}
                    onClick={() => setViewMode('table')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '34px',
                      borderRadius: '0.55rem',
                      border: 'none',
                      background: viewMode === 'table' ? 'var(--card)' : 'transparent',
                      color: viewMode === 'table' ? '#4f46e5' : 'var(--muted-foreground)',
                      boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Layers size={16} />
                  </button>
                  <button
                    type="button"
                    title={t('bulkSms.cardsView') || 'Cards View'}
                    onClick={() => setViewMode('cards')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '34px',
                      borderRadius: '0.55rem',
                      border: 'none',
                      background: viewMode === 'cards' ? 'var(--card)' : 'transparent',
                      color: viewMode === 'cards' ? '#4f46e5' : 'var(--muted-foreground)',
                      boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>
              )}

              {/* Export Dropdown */}
              {activeTab === 'campaigns' && (
                <div ref={exportRef} style={{ position: 'relative' }}>
                  <button 
                    type="button"
                    onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                    disabled={filteredCampaigns.length === 0}
                    title={t('bulkSms.export') || 'Export Options'}
                    style={{ 
                      background: exportDropdownOpen ? 'var(--muted)' : 'var(--background)', 
                      border: '1px solid var(--border)', 
                      color: 'var(--foreground)',
                      height: '42px',
                      padding: '0 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      borderRadius: '0.75rem',
                      fontWeight: 500,
                      fontSize: '0.86rem',
                      opacity: filteredCampaigns.length === 0 ? 0.6 : 1,
                      cursor: filteredCampaigns.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Download size={15} />
                    <span>{t('bulkSms.export') || 'Export'}</span>
                    <ChevronDown size={14} style={{ opacity: 0.7, transform: exportDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {exportDropdownOpen && (
                    <div 
                      className="glass-card animate-fade-in"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        zIndex: 50,
                        minWidth: '165px',
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.75rem',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        padding: '0.35rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.2rem'
                      }}
                    >
                      <button
                        onClick={handleExportCSV}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--foreground)',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <FileSpreadsheet size={15} style={{ color: '#10b981' }} />
                        <span>{t('bulkSms.exportCSV') || 'Export as CSV'}</span>
                      </button>
                      <button
                        onClick={handleExportPDF}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--foreground)',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <FileText size={15} style={{ color: '#ef4444' }} />
                        <span>{t('bulkSms.exportPDF') || 'Export as PDF'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Rows Per Page Selector */}
              {activeTab === 'campaigns' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid var(--border)', borderRadius: '0.75rem', height: '42px', padding: '0 0.75rem', background: 'var(--background)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{t('bulkSms.show') || 'Show:'}</span>
                  <select 
                    value={limit} 
                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: 'var(--foreground)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    <option value={10}>{formatNumber(10)}</option>
                    <option value={20}>{formatNumber(20)}</option>
                    <option value={50}>{formatNumber(50)}</option>
                  </select>
                </div>
              )}

              {/* Primary Action Button: Compose Broadcast */}
              <button 
                type="button"
                onClick={() => {
                  setBroadcastError(null);
                  setIsComposeModalOpen(true);
                }}
                style={{ 
                  height: '42px',
                  padding: '0 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(79, 70, 229, 0.35)',
                  cursor: 'pointer'
                }}
              >
                <Plus size={17} />
                <span>{t('bulkSms.newCampaign') || 'New SMS Campaign'}</span>
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => setLoading(false), 500);
                }}
                title={t('bulkSms.refresh') || 'Refresh Campaigns'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '42px',
                  height: '42px',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--background)')}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>

            </div>

          </div>

          {/* ── Advanced Filter Drawer (Campaigns) ────────────────── */}
          {activeTab === 'campaigns' && showFilters && (
            <div
              style={{
                marginTop: '0.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                alignItems: 'flex-end'
              }}
            >
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('bulkSms.filterStatus') || 'Delivery Status'}
                </label>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                >
                  <option value="all">{t('bulkSms.allStatuses') || 'All Statuses'}</option>
                  <option value="delivered">{t('bulkSms.statusDelivered') || 'Delivered'}</option>
                  <option value="scheduled">{t('bulkSms.statusScheduled') || 'Scheduled'}</option>
                  <option value="processing">{t('bulkSms.statusProcessing') || 'Processing'}</option>
                  <option value="failed">{t('bulkSms.statusFailed') || 'Failed'}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('bulkSms.filterAudience') || 'Audience Group'}
                </label>
                <select
                  value={audienceFilter}
                  onChange={e => { setAudienceFilter(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                >
                  <option value="all">{t('bulkSms.allAudiences') || 'All Audiences'}</option>
                  <option value="Parents">{t('bulkSms.audParents') || 'Parents & Guardians'}</option>
                  <option value="Class">{t('bulkSms.audClass') || 'Specific Classes'}</option>
                  <option value="Staff">{t('bulkSms.audStaff') || 'Staff & Teachers'}</option>
                  <option value="Absent">{t('bulkSms.audAbsent') || 'Absent Students'}</option>
                </select>
              </div>

              <div style={{ display: 'flex' }}>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 1rem',
                    borderRadius: '0.55rem',
                    border: '1px solid var(--border)',
                    background: 'var(--muted)',
                    color: 'var(--foreground)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t('bulkSms.resetFilters') || 'Reset Filters'}
                </button>
              </div>
            </div>
          )}

          {/* Active Filter Badges */}
          {activeTab === 'campaigns' && activeFiltersCount > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', paddingTop: '0.25rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.activeFilters') || 'Active Filters:'}</span>
              
              {searchTerm && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#eff6ff', color: '#2563eb', borderRadius: '99px', fontSize: '0.76rem', fontWeight: 600 }}>
                  {t('bulkSms.filterLabelSearch') || 'Search:'} &ldquo;{searchTerm}&rdquo;
                  <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#2563eb', display: 'flex' }}><X size={12} /></button>
                </span>
              )}

              {statusFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '99px', fontSize: '0.76rem', fontWeight: 600 }}>
                  {t('bulkSms.filterLabelStatus') || 'Status:'} {getStatusLabel(statusFilter as SMSCampaign['status'])}
                  <button onClick={() => setStatusFilter('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#16a34a', display: 'flex' }}><X size={12} /></button>
                </span>
              )}

              {audienceFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#fff7ed', color: '#ea580c', borderRadius: '99px', fontSize: '0.76rem', fontWeight: 600 }}>
                  {t('bulkSms.filterLabelAudience') || 'Audience:'} {audienceFilter}
                  <button onClick={() => setAudienceFilter('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#ea580c', display: 'flex' }}><X size={12} /></button>
                </span>
              )}

              <button
                onClick={resetAllFilters}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: '0 0.25rem' }}
              >
                {t('bulkSms.clearAll') || 'Clear all'}
              </button>
            </div>
          )}

        </div>

        {/* ── Tab Content 1: Campaigns & Logs ──────────────────── */}
        {activeTab === 'campaigns' && (
          filteredCampaigns.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6.5rem 2rem', textAlign: 'center' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', opacity: 0.7 }}>
                <MessageSquare size={36} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
                {t('bulkSms.noCampaignsFound') || 'No SMS Campaigns Found'}
              </h3>
              <p style={{ color: 'var(--muted-foreground)', marginTop: '0.4rem', fontSize: '0.9rem', maxWidth: '420px' }}>
                {t('bulkSms.noCampaignsDesc') || 'No broadcast records match your search query or filter parameters.'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  style={{ padding: '0.65rem 1.25rem', background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer' }}
                >
                  {t('bulkSms.resetFilters') || 'Reset Filters'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsComposeModalOpen(true)}
                  style={{ padding: '0.65rem 1.25rem', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Plus size={16} /> {t('bulkSms.newBroadcast') || 'New Broadcast'}
                </button>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.9rem 1.25rem', width: '45px' }}>#</th>
                    <th style={{ padding: '0.9rem 1.25rem', whiteSpace: 'nowrap' }}>{t('bulkSms.colDateTime') || 'Date & Time'}</th>
                    <th style={{ padding: '0.9rem 1rem' }}>{t('bulkSms.colCampaignId') || 'Campaign & ID'}</th>
                    <th style={{ padding: '0.9rem 1rem' }}>{t('bulkSms.colAudience') || 'Target Audience'}</th>
                    <th style={{ padding: '0.9rem 1rem' }}>{t('bulkSms.colRecipients') || 'Recipients'}</th>
                    <th style={{ padding: '0.9rem 1rem' }}>{t('bulkSms.colCredits') || 'Credits'}</th>
                    <th style={{ padding: '0.9rem 1rem' }}>{t('bulkSms.colDeliveryRate') || 'Delivery Rate'}</th>
                    <th style={{ padding: '0.9rem 1rem' }}>{t('bulkSms.colStatus') || 'Status'}</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', width: '120px' }}>{t('bulkSms.colActions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCampaigns.map((cmp, idx) => (
                    <tr
                      key={cmp.id}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Index */}
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>
                        {formatNumber((page - 1) * limit + idx + 1)}
                      </td>

                      {/* Date & Time - Strictly Single Line */}
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                          <Calendar size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                          <span style={{ whiteSpace: 'nowrap' }}>{formatSingleLineDate(cmp.sentAt)}</span>
                        </div>
                      </td>

                      {/* Campaign Title & Masking */}
                      <td style={{ padding: '1rem 1rem', minWidth: '200px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>
                          {cmp.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.2rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                            {cmp.id}
                          </span>
                          <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'var(--muted)', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                            {cmp.senderId}
                          </span>
                        </div>
                      </td>

                      {/* Target Audience */}
                      <td style={{ padding: '1rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '99px',
                          background: 'rgba(79, 70, 229, 0.08)',
                          color: '#4f46e5',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}>
                          {cmp.targetGroup}
                        </span>
                      </td>

                      {/* Recipients & SMS Parts */}
                      <td style={{ padding: '1rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>
                          {formatNumber(cmp.recipientsCount)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                          {formatNumber(cmp.smsCount)} {t('bulkSms.smsPerRecipient') || 'SMS / recipient'}
                        </div>
                      </td>

                      {/* Credits */}
                      <td style={{ padding: '1rem 1rem', fontWeight: 800, color: '#4f46e5', whiteSpace: 'nowrap' }}>
                        {formatNumber(cmp.totalCredits)}
                      </td>

                      {/* Delivery Rate */}
                      <td style={{ padding: '1rem 1rem', whiteSpace: 'nowrap' }}>
                        {cmp.status === 'scheduled' ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{t('bulkSms.statusPending') || 'Pending'}</span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <div style={{ width: '56px', height: '6px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{ width: `${cmp.deliveryRate}%`, height: '100%', background: cmp.deliveryRate > 95 ? '#10b981' : '#f59e0b' }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--foreground)' }}>{formatNumber(cmp.deliveryRate)}%</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1rem', whiteSpace: 'nowrap' }}>
                        {cmp.status === 'delivered' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '99px', background: '#f0fdf4', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <CheckCircle2 size={12} /> {t('bulkSms.statusDelivered') || 'Delivered'}
                          </span>
                        )}
                        {cmp.status === 'scheduled' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '99px', background: '#eff6ff', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <Clock size={12} /> {t('bulkSms.statusScheduled') || 'Scheduled'}
                          </span>
                        )}
                        {cmp.status === 'processing' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '99px', background: '#fff7ed', color: '#ea580c', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <RefreshCw size={12} className="animate-spin" /> {t('bulkSms.statusProcessing') || 'Processing'}
                          </span>
                        )}
                        {cmp.status === 'failed' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '99px', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <AlertTriangle size={12} /> {t('bulkSms.statusFailed') || 'Failed'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            title={t('bulkSms.viewReport') || 'View Report & Log'}
                            onClick={() => {
                              setSelectedCampaign(cmp);
                              setDetailsModalOpen(true);
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--background)',
                              color: 'var(--foreground)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--background)')}
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            type="button"
                            title={t('bulkSms.cloneResend') || 'Clone & Resend'}
                            onClick={() => {
                              setMessage(cmp.messageText || cmp.title);
                              setCampaignTitle(`Copy of ${cmp.title}`);
                              setIsComposeModalOpen(true);
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--background)',
                              color: '#4f46e5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#eef2ff')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--background)')}
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Cards View */
            <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {paginatedCampaigns.map(cmp => (
                <div
                  key={cmp.id}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '1rem',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    transition: 'transform 0.15s, box-shadow 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '99px',
                      background: 'rgba(79, 70, 229, 0.08)',
                      color: '#4f46e5',
                      fontSize: '0.74rem',
                      fontWeight: 700
                    }}>
                      {cmp.targetGroup}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                      {cmp.id}
                    </span>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.35rem', color: 'var(--foreground)' }}>
                      {cmp.title}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                      <Calendar size={13} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap' }}>{formatSingleLineDate(cmp.sentAt)}</span>
                    </div>
                  </div>

                  {/* Delivery Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--muted-foreground)' }}>{t('bulkSms.deliveryRate') || 'Delivery Rate'}:</span>
                      <strong style={{ color: 'var(--foreground)' }}>{formatNumber(cmp.deliveryRate)}%</strong>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: `${cmp.deliveryRate}%`, height: '100%', background: cmp.deliveryRate > 95 ? '#10b981' : '#f59e0b' }} />
                    </div>
                  </div>

                  {/* Footer Stats & Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>{t('bulkSms.recipientsCredits') || 'Recipients / Credits'}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--foreground)' }}>
                        {formatNumber(cmp.recipientsCount)} <span style={{ color: '#4f46e5' }}>({formatNumber(cmp.totalCredits)} {t('bulkSms.crShort') || 'cr'})</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        title={t('bulkSms.viewReport') || 'View Report & Log'}
                        onClick={() => {
                          setSelectedCampaign(cmp);
                          setDetailsModalOpen(true);
                        }}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          background: 'var(--background)',
                          color: 'var(--foreground)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        title={t('bulkSms.cloneResend') || 'Clone & Resend'}
                        onClick={() => {
                          setMessage(cmp.messageText || cmp.title);
                          setCampaignTitle(`Copy of ${cmp.title}`);
                          setIsComposeModalOpen(true);
                        }}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          background: 'var(--background)',
                          color: '#4f46e5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Tab Content 2: Pre-approved Templates ────────────── */}
        {activeTab === 'templates' && (
          <div style={{ padding: '1.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
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
                      borderRadius: '1rem',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '99px', background: col.bg, color: col.text, fontSize: '0.74rem', fontWeight: 700 }}>
                          {getCategoryLabel(tpl.category)}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>
                          {tpl.id}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--foreground)' }}>
                        {tpl.title}
                      </h4>

                      <div style={{ background: 'var(--background)', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', fontSize: '0.84rem', color: 'var(--foreground)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                        {tpl.content}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                        {t('bulkSms.templateLength') || 'Length:'} <strong>{formatNumber(tpl.charCount)}</strong> {t('bulkSms.chars') || 'chars'} ({formatNumber(1)} {t('bulkSms.smsPart') || 'SMS Part'})
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        style={{
                          flex: 1,
                          padding: '0.55rem 0',
                          borderRadius: '0.6rem',
                          background: '#4f46e5',
                          color: 'white',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Send size={14} /> {t('bulkSms.useTemplate') || 'Use Template'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyTemplate(tpl)}
                        style={{
                          padding: '0.55rem 0.85rem',
                          borderRadius: '0.6rem',
                          border: '1px solid var(--border)',
                          background: 'var(--background)',
                          color: 'var(--foreground)',
                          fontWeight: 600,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                        title={t('bulkSms.copyTemplate') || 'Copy Template'}
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

        {/* ── Tab Content 3: Gateway Configuration ─────────────── */}
        {activeTab === 'gateway' && (
          <div style={{ padding: '1.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--foreground)' }}>
                    {t('bulkSms.gatewayStatus') || 'Telecom Gateway Status'}
                  </h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                    {t('bulkSms.carrierConnection') || 'Primary carrier connection'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{t('bulkSms.gatewayProvider') || 'Gateway Provider'}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>SSL Wireless Telecom Hub</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{t('bulkSms.connectionHealth') || 'Connection Health'}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} /> {t('bulkSms.operational') || 'Operational (Ping 38ms)'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{t('bulkSms.maskingApproval') || 'Masking Approval'}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>{t('bulkSms.activeBtrc') || 'SCHOOLCARE (BTRC Active)'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{t('bulkSms.throughputRate') || 'Throughput Rate'}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>{formatNumber(500)} {t('bulkSms.smsPerSecond') || 'SMS / second'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBannerMessage(t('bulkSms.alertPingSuccess') || 'Gateway Ping Successful! Server latency is 38ms.')}
                style={{ marginTop: '1.25rem', width: '100%', padding: '0.65rem 0', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                {t('bulkSms.testPing') || 'Test Gateway Ping'}
              </button>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--foreground)' }}>
                    {t('bulkSms.autoTriggers') || 'Automatic Event Triggers'}
                  </h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                    {t('bulkSms.autoSendDesc') || 'Auto-send SMS on school actions'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { title: t('bulkSms.triggerAbsenteeTitle') || 'Auto Absentee Alert', desc: t('bulkSms.triggerAbsenteeDesc') || 'Trigger SMS automatically when student marked absent by teacher', active: true },
                  { title: t('bulkSms.triggerFeeTitle') || 'Fee Payment Confirmation', desc: t('bulkSms.triggerFeeDesc') || 'Send receipt SMS instantly when accountant collects tuition', active: true },
                  { title: t('bulkSms.triggerExamTitle') || 'Exam Routine Publication', desc: t('bulkSms.triggerExamDesc') || 'Broadcast to parents when exam schedule is published', active: false },
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

        {/* ── Table Footer & Pagination ─────────────────────────── */}
        {activeTab === 'campaigns' && filteredCampaigns.length > 0 && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              fontSize: '0.85rem',
              color: 'var(--muted-foreground)',
            }}
          >
            <div>
              {t('bulkSms.showing') || 'Showing'} <strong>{formatNumber(paginatedCampaigns.length)}</strong> {t('bulkSms.of') || 'of'} <strong>{formatNumber(filteredCampaigns.length)}</strong> {t('bulkSms.campaignsCount') || 'campaigns'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', marginRight: '0.5rem' }}>
                {t('bulkSms.page') || 'Page'} {formatNumber(page)} {t('bulkSms.of') || 'of'} {formatNumber(totalPages)}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Modal: Compose Broadcast (with Live Smartphone Mockup) ── */}
      {isComposeModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.25rem',
        }}>
          <div
            className="glass-card animate-fade-in"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '1.25rem',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                    {t('bulkSms.composeTitle') || 'Compose SMS Broadcast'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                    {t('bulkSms.composeSubtitle') || 'Transmit notices, fee reminders, or emergency alerts via telecom gateway'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsComposeModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Two Column (Form + Smartphone Preview) */}
            <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(300px, 0.85fr)', gap: '1.75rem', alignItems: 'start' }}>
              
              {/* Left Column: Form */}
              <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                
                {broadcastError && (
                  <div style={{ padding: '0.75rem 1rem', borderRadius: '0.65rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>{broadcastError}</span>
                  </div>
                )}

                {/* Campaign Title */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                    {t('bulkSms.campaignTitleLabel') || 'Campaign Title'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t('bulkSms.campaignTitlePlaceholder') || 'e.g. Monthly Tuition Fee Reminder, PTM Meeting'}
                    value={campaignTitle}
                    onChange={e => setCampaignTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none' }}
                    required
                  />
                </div>

                {/* Target Audience Tabs */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                    {t('bulkSms.targetAudienceLabel') || 'Target Audience'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {[
                      { id: 'all', label: t('bulkSms.audAllParents') || 'All Parents', count: formatNumber(1350), icon: Users },
                      { id: 'class', label: t('bulkSms.audClassOption') || 'Class', count: formatNumber(120), icon: GraduationCap },
                      { id: 'teachers', label: t('bulkSms.audStaffOption') || 'Staff', count: formatNumber(68), icon: UserCheck },
                      { id: 'custom', label: t('bulkSms.audCustomOption') || 'Custom', count: formatNumber(45), icon: Smartphone },
                    ].map(aud => {
                      const isSelected = targetAudience === aud.id;
                      return (
                        <button
                          key={aud.id}
                          type="button"
                          onClick={() => setTargetAudience(aud.id as 'all' | 'class' | 'teachers' | 'custom')}
                          style={{
                            padding: '0.65rem 0.4rem',
                            borderRadius: '0.65rem',
                            border: isSelected ? '2px solid #4f46e5' : '1px solid var(--border)',
                            background: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'var(--background)',
                            color: isSelected ? '#4f46e5' : 'var(--foreground)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{aud.label}</span>
                          <span style={{ fontSize: '0.7rem', color: isSelected ? '#4f46e5' : 'var(--muted-foreground)' }}>{aud.count}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-selector for Class */}
                  {targetAudience === 'class' && (
                    <div style={{ marginTop: '0.65rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <select
                        value={selectedClass}
                        onChange={e => setSelectedClass(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.84rem' }}
                      >
                        {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'HSC 1st Year', 'HSC 2nd Year'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <select
                        value={selectedSection}
                        onChange={e => setSelectedSection(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.84rem' }}
                      >
                        {['All Sections', 'Section A (Padma)', 'Section B (Meghna)', 'Section C (Jamuna)'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Sender ID & Load Template */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                      {t('bulkSms.senderMaskingLabel') || 'Sender Masking'}
                    </label>
                    <select
                      value={senderId}
                      onChange={e => setSenderId(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    >
                      <option value="SCHOOLCARE">SCHOOLCARE ({t('bulkSms.masked') || 'Masked'})</option>
                      <option value="EDUALERT">EDUALERT ({t('bulkSms.emergency') || 'Emergency'})</option>
                      <option value="01888-XXXXXX">01888-XXXXXX ({t('bulkSms.nonMask') || 'Non-mask'})</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                      {t('bulkSms.insertTemplateLabel') || 'Insert Template'}
                    </label>
                    <select
                      onChange={e => {
                        const tpl = STATIC_TEMPLATES.find(t => t.id === e.target.value);
                        if (tpl) {
                          setMessage(tpl.content);
                          if (!campaignTitle) setCampaignTitle(tpl.title);
                        }
                      }}
                      defaultValue=""
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    >
                      <option value="" disabled>{t('bulkSms.chooseTemplate') || 'Choose template...'}</option>
                      {STATIC_TEMPLATES.map(tpl => (
                        <option key={tpl.id} value={tpl.id}>{tpl.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dynamic Variables */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>
                      {t('bulkSms.personalizationTags') || 'Personalization Tags'}
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>{t('bulkSms.clickToAppend') || 'Click to append'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {DYNAMIC_TAGS.map(item => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handleInsertTag(item.tag)}
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '99px',
                          background: 'rgba(79, 70, 229, 0.08)',
                          color: '#4f46e5',
                          border: '1px solid rgba(79, 70, 229, 0.2)',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        + {item.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Content */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {t('bulkSms.smsContentLabel') || 'SMS Content'} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.72rem', color: isUnicode ? '#ea580c' : '#16a34a', fontWeight: 600 }}>
                      {isUnicode ? (t('bulkSms.unicodeBadge') || '● Unicode (Bangla/Special)') : (t('bulkSms.standardGsmBadge') || '● Standard GSM')}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={t('bulkSms.typeBroadcastPlaceholder') || 'Type broadcast text here...'}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none', resize: 'vertical', lineHeight: 1.45 }}
                    required
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.76rem', color: 'var(--muted-foreground)' }}>
                    <span>{t('bulkSms.characters') || 'Characters:'} <strong>{formatNumber(charLength)}</strong> / {formatNumber(charsPerSMS)} {t('bulkSms.perSms') || 'per SMS'}</span>
                    <span>{t('bulkSms.parts') || 'Parts:'} <strong style={{ color: '#4f46e5' }}>{formatNumber(smsParts)} {t('bulkSms.smsPart') || 'SMS'}</strong></span>
                  </div>
                </div>

                {/* Dispatch Schedule */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.35rem' }}>
                    {t('bulkSms.dispatchTimeLabel') || 'Dispatch Time'}
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="scheduleType"
                        checked={scheduleType === 'instant'}
                        onChange={() => setScheduleType('instant')}
                      />
                      {t('bulkSms.sendImmediately') || 'Send Immediately'}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="scheduleType"
                        checked={scheduleType === 'scheduled'}
                        onChange={() => setScheduleType('scheduled')}
                      />
                      {t('bulkSms.scheduleForLater') || 'Schedule for Later'}
                    </label>
                    {scheduleType === 'scheduled' && (
                      <input
                        type="datetime-local"
                        value={scheduledDateTime}
                        onChange={e => setScheduledDateTime(e.target.value)}
                        style={{ padding: '0.35rem 0.65rem', borderRadius: '0.45rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.8rem' }}
                      />
                    )}
                  </div>
                </div>

                {/* Submit Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{t('bulkSms.requiredCost') || 'Required Cost:'}</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--foreground)' }}>
                      {formatNumber(totalCreditsRequired)} {t('bulkSms.credits') || 'Credits'} <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>({formatNumber(totalRecipients)} × {formatNumber(smsParts)})</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsComposeModalOpen(false)}
                      style={{ padding: '0.6rem 1rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {t('common.cancel') || 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isBroadcasting}
                      style={{
                        padding: '0.6rem 1.35rem',
                        borderRadius: '0.65rem',
                        border: 'none',
                        background: '#4f46e5',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: isBroadcasting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        boxShadow: '0 4px 15px rgba(79, 70, 229, 0.35)'
                      }}
                    >
                      {isBroadcasting ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>{t('bulkSms.transmitting') || 'Transmitting...'}</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>{t('bulkSms.broadcastNow') || 'Broadcast Now'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </form>

              {/* Right Column: Live Recipient Smartphone Mockup */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem', fontSize: '0.78rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                  <Smartphone size={15} /> {t('bulkSms.livePhonePreview') || 'Live Phone Preview'}
                </div>

                <div
                  style={{
                    width: '280px',
                    height: '520px',
                    background: '#0f172a',
                    borderRadius: '38px',
                    padding: '10px',
                    boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.4)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '28px',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Notch */}
                    <div style={{ height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ width: '65px', height: '10px', background: '#0f172a', borderRadius: '10px' }} />
                    </div>

                    {/* App Header */}
                    <div style={{ padding: '0.4rem 0.75rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                        SC
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>{senderId}</div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>{t('bulkSms.verifiedTelecomSender') || 'Verified Telecom Sender'}</div>
                    </div>

                    {/* Chat Area */}
                    <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600, background: '#e2e8f0', padding: '0.1rem 0.45rem', borderRadius: '99px' }}>
                          {t('bulkSms.todayTime') || 'Today 10:30 AM'}
                        </span>
                      </div>

                      <div
                        style={{
                          background: '#ffffff',
                          color: '#1e293b',
                          borderRadius: '14px 14px 14px 4px',
                          padding: '0.75rem 0.85rem',
                          maxWidth: '92%',
                          alignSelf: 'flex-start',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.78rem',
                          lineHeight: 1.45,
                          wordBreak: 'break-word'
                        }}
                      >
                        {message.trim() ? (
                          getRenderedPreview()
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            {t('bulkSms.previewPlaceholder') || 'Type message on left to preview...'}
                          </span>
                        )}
                        <div style={{ textAlign: 'right', marginTop: '0.25rem', fontSize: '0.6rem', color: '#94a3b8' }}>
                          {t('bulkSms.statusDelivered') || 'Delivered'}
                        </div>
                      </div>
                    </div>

                    {/* Phone Footer */}
                    <div style={{ height: '12px', background: '#ffffff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ width: '80px', height: '3px', background: '#cbd5e1', borderRadius: '99px' }} />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Campaign Report & Details ─────────────────────── */}
      {detailsModalOpen && selectedCampaign && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem',
        }}>
          <div
            className="glass-card animate-fade-in"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '1.25rem',
              width: '100%',
              maxWidth: '520px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9, fontWeight: 700 }}>
                  {t('bulkSms.campaignReport') || 'Campaign Report'} &bull; {selectedCampaign.senderId}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.15rem 0 0' }}>
                  {selectedCampaign.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#ffffff', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0.85rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.colCampaignId') || 'Campaign ID'}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--foreground)', marginTop: '0.15rem' }}>
                    {selectedCampaign.id}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.targetGroup') || 'Target Group'}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)', marginTop: '0.15rem' }}>
                    {selectedCampaign.targetGroup}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.colRecipients') || 'Recipients'}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)', marginTop: '0.15rem' }}>
                    {formatNumber(selectedCampaign.recipientsCount)} {t('bulkSms.contacts') || 'Contacts'} ({formatNumber(selectedCampaign.smsCount)} {t('bulkSms.smsPerRecipient') || 'SMS/recp'})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.creditsDeducted') || 'Credits Deducted'}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', marginTop: '0.15rem' }}>
                    {formatNumber(selectedCampaign.totalCredits)} {t('bulkSms.credits') || 'Credits'}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.sentDateTime') || 'Sent Date & Time'}</div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                  <Calendar size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>{formatSingleLineDate(selectedCampaign.sentAt)}</span>
                </div>
              </div>

              {selectedCampaign.messageText && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('bulkSms.broadcastMessage') || 'Broadcast Message'}</div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--foreground)', marginTop: '0.2rem', padding: '0.75rem', background: 'var(--muted)', borderRadius: '0.5rem', lineHeight: 1.45 }}>
                    {selectedCampaign.messageText}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => handleDownloadCampaignPDF(selectedCampaign)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.6rem 1rem',
                    borderRadius: '0.65rem',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={15} />
                  <span>{t('bulkSms.downloadReportPDF') || 'Download Report (PDF)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailsModalOpen(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '0.65rem', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer' }}
                >
                  {t('common.close') || 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Recharge Credits ──────────────────────────────── */}
      {isRechargeModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem',
        }}>
          <div
            className="glass-card animate-fade-in"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '1.25rem',
              width: '100%',
              maxWidth: '480px',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                    {t('bulkSms.rechargeTitle') || 'Recharge SMS Credits'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                    {t('bulkSms.rechargeSubtitle') || 'Choose a package to recharge instantly'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRechargeModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { credits: 5000, price: 1750, perSmsRate: '0.35', popular: false },
                { credits: 15000, price: 4800, perSmsRate: '0.32', popular: true },
                { credits: 30000, price: 9000, perSmsRate: '0.30', popular: false },
                { credits: 60000, price: 16800, perSmsRate: '0.28', popular: false },
              ].map(pkg => (
                <div
                  key={pkg.credits}
                  onClick={() => handleRechargeCredits(pkg.credits)}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    border: pkg.popular ? '2px solid #4f46e5' : '1px solid var(--border)',
                    background: pkg.popular ? 'rgba(79, 70, 229, 0.05)' : 'var(--background)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#4f46e5')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = pkg.popular ? '#4f46e5' : 'var(--border)')}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)' }}>
                        {formatNumber(pkg.credits)} {t('bulkSms.credits') || 'Credits'}
                      </span>
                      {pkg.popular && (
                        <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '99px', background: '#4f46e5', color: 'white', fontWeight: 700 }}>
                          {t('bulkSms.bestValue') || 'Best Value'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>
                      ৳ {formatNumber(pkg.perSmsRate)} {t('bulkSms.perSmsCost') || '/ SMS'}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>
                    ৳ {formatNumber(pkg.price)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsRechargeModalOpen(false)}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                {t('common.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
