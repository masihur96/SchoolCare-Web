"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  Receipt, TrendingUp, TrendingDown,
  Plus, Search, User, CheckCircle2,
  Clock, AlertCircle, Printer,
  Edit3, Trash2, RefreshCw, Check, X, Layers, Settings,
  ShieldCheck, CheckSquare, Square, DollarSign, Building
} from 'lucide-react';
import { getPdfTools } from '@/lib/pdf';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const DEFAULT_FALLBACK_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkYTBjM2ZmZi1hZTU5LTQ2YTMtYTAzNy0xOWZhNjgwMDNjNmIiLCJyb2xlIjoiYWRtaW4iLCJzY2hvb2xJZCI6IjI5ZjA1ZWRiLThlMGItNDM0Yy1hNDcxLWFhNzc2MzA4YTFjMSIsImNsYXNzSWRzIjpbXSwic2VjdGlvbklkcyI6W10sImlhdCI6MTc5MjcyOTY4NiwiZXhwIjoxNzkyODE2MDg2fQ.Wm2jsm2FoTTAIKirT-eLKwkizroQ4Kcx8UeFnKy0qaY';

const getApiToken = () => {
  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('accessToken') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('access_token');
    if (token) return token;
  }
  return DEFAULT_FALLBACK_TOKEN;
};

const getUserSchoolId = () => {
  try {
    const token = getApiToken();
    if (!token) return '29f05edb-8e0b-434c-a471-aa776308a1c1';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.schoolId || '29f05edb-8e0b-434c-a471-aa776308a1c1';
  } catch {
    return '29f05edb-8e0b-434c-a471-aa776308a1c1';
  }
};

// Types & Interfaces
interface FeeInvoice {
  id: string;
  invoiceNumber?: string;
  title: string;
  description?: string;
  feeType: string;
  amount: number;
  discountAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
  status?: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
  month?: string;
  year?: number;
  dueDate: string;
  paymentMode?: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  studentId?: string;
  studentName?: string;
  studentRoll?: string;
  createdAt: string;
  updatedAt?: string;
}

interface FeeStructure {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  feeType: string;
  amount: number;
  classIds?: string[];
  classId?: string;
  className?: string;
  frequency?: string;
  createdAt?: string;
}

interface FeeStatsSummary {
  totalCollections: number;
  totalDues: number;
  totalInvoices: number;
  paidInvoicesCount: number;
  unpaidInvoicesCount: number;
  overdueInvoicesCount: number;
}

interface PersonalPaymentInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  routingNumber: string;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  cashCounterLocation: string;
  instructions: string;
}

interface SchoolCarePaymentInfo {
  enabled: boolean;
  merchantId: string;
  gatewayUrl: string;
  instructions: string;
}

interface PaymentSettings {
  defaultPaymentMode: 'PERSONAL_PAYMENT' | 'SCHOOL_CARE_PAYMENT';
  personalPaymentInfo: PersonalPaymentInfo;
  schoolCarePaymentInfo: SchoolCarePaymentInfo;
  lateFeeFinePerDay: number;
  currency: string;
}

interface ClassOption {
  id: string;
  name: string;
  schoolId: string;
}

interface SectionOption {
  id: string;
  name: string;
  classId: string;
}

interface StudentOption {
  id: string;
  name: string;
  rollNumber?: string;
  email?: string;
  classIds?: string[];
  sectionIds?: string[];
}

const MONTHS_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const FEE_TYPES = [
  { value: 'TUITION', label: 'Tuition Fee' },
  { value: 'ADMISSION', label: 'Admission Fee' },
  { value: 'EXAM', label: 'Examination Fee' },
  { value: 'TRANSPORT', label: 'Transportation Fee' },
  { value: 'LIBRARY', label: 'Library Fee' },
  { value: 'HOSTEL', label: 'Hostel Fee' },
  { value: 'LAB', label: 'Laboratory / Computer Fee' },
  { value: 'FINE', label: 'Late Fine / Penalty' },
  { value: 'OTHER', label: 'Other General Fee' },
];

export default function FeesManagementPage() {
  const { t, language } = useLanguage();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'invoices' | 'structures' | 'history' | 'settings'>('invoices');

  // Stats
  const [stats, setStats] = useState<FeeStatsSummary>({
    totalCollections: 0,
    totalDues: 0,
    totalInvoices: 0,
    paidInvoicesCount: 0,
    unpaidInvoicesCount: 0,
    overdueInvoicesCount: 0,
  });

  // Invoices list state
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('2026');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceLimit] = useState(10);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0);

  // Fee Structures state
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [structuresLoading, setStructuresLoading] = useState(false);

  // Payment Settings state
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    defaultPaymentMode: 'PERSONAL_PAYMENT',
    personalPaymentInfo: {
      bankName: 'Sonali Bank',
      accountName: 'Dhaka Ideal School & College',
      accountNumber: '1234567890123',
      branch: 'Motijheel Branch',
      routingNumber: '125272635',
      bkashNumber: '01712345678',
      nagadNumber: '01812345678',
      rocketNumber: '01912345678',
      cashCounterLocation: 'Accounts Office, Room 102 (9 AM - 2 PM)',
      instructions: 'Please send money to our bKash/Nagad number with Student Roll Number as Reference, or deposit directly into our bank account.',
    },
    schoolCarePaymentInfo: {
      enabled: true,
      merchantId: 'SCHOOL_CARE_MERCHANT_001',
      gatewayUrl: 'https://gateway.schoolcare.app/api/v1',
      instructions: 'Pay seamlessly using automated School Care online payment gateway.',
    },
    lateFeeFinePerDay: 10,
    currency: 'BDT',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Student history state
  const [historyClassId, setHistoryClassId] = useState('');
  const [historySectionId, setHistorySectionId] = useState('');
  const [historyStudentId, setHistoryStudentId] = useState('');
  const [studentHistoryInvoices, setStudentHistoryInvoices] = useState<FeeInvoice[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Class & Section data
  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [sectionsList, setSectionsList] = useState<SectionOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // -------------------------------------------------------------
  // GENERATE FEES MODAL STATE (The exact cURL payload requirement)
  // -------------------------------------------------------------
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    targetMode: 'class_section' as 'class_section' | 'specific_students' | 'single_student',
    classId: '',
    sectionId: '',
    studentId: '',
    studentIds: [] as string[],
    title: 'Monthly Tuition Fee - October 2026',
    description: 'Includes computer lab fee and library charges',
    feeType: 'TUITION',
    feeStructureId: '',
    amount: 1500,
    discountAmount: 0,
    month: 'October',
    year: 2026,
    dueDate: '2026-10-31T23:59:59.000Z',
    paymentMode: 'PERSONAL_PAYMENT',
  });

  // RECORD PAYMENT MODAL STATE
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<FeeInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [recordPaymentLoading, setRecordPaymentLoading] = useState(false);

  // CREATE / EDIT STRUCTURE MODAL
  const [structureModalOpen, setStructureModalOpen] = useState(false);
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);
  const [structureForm, setStructureForm] = useState({
    name: '',
    description: '',
    feeType: 'TUITION',
    amount: 1500,
    frequency: 'MONTHLY',
    classIds: [] as string[],
  });
  const [savingStructure, setSavingStructure] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(invoiceSearch);
      setInvoicePage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [invoiceSearch]);

  // Clear notification after 5s
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(t);
  }, [notification]);

  // Helpers
  const formatCurrency = useCallback((amount: number | string | undefined) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    if (isNaN(num)) return language === 'bn' ? '৳০' : '৳0';
    return (
      '৳' +
      new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Math.abs(num))
    );
  }, [language]);

  const formatDate = useCallback((dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, [language]);

  // Fetch Classes, Sections and Students
  const fetchMetadata = useCallback(async () => {
    const schoolId = getUserSchoolId();
    const token = getApiToken();
    const headers = { accept: '*/*', Authorization: `Bearer ${token}` };

    try {
      const [clsRes, secRes, stuRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/classes`, { headers }),
        fetch(`${API_BASE_URL}/admin/sections?schoolId=${schoolId}`, { headers }),
        fetch(`${API_BASE_URL}/admin/users?role=student&limit=200`, { headers }),
      ]);

      if (clsRes.ok) {
        const clsJson = await clsRes.json();
        const rawCls = Array.isArray(clsJson) ? clsJson : clsJson.data || [];
        setClassesList(rawCls.filter((c: any) => !schoolId || c.schoolId === schoolId));
      }

      if (secRes.ok) {
        const secJson = await secRes.json();
        const rawSec = Array.isArray(secJson) ? secJson : secJson.data || [];
        setSectionsList(rawSec);
      }

      if (stuRes.ok) {
        const stuJson = await stuRes.json();
        const rawStu = stuJson.data?.data || stuJson.data || [];
        setAllStudents(rawStu);
      }
    } catch (e) {
      console.error('Failed to load classes/sections/students metadata', e);
    }
  }, []);

  // Fetch Stats Summary: GET /fees/stats/summary
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/fees/stats/summary`, {
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setStats({
          totalCollections: data.totalCollections ?? data.totalCollected ?? data.totalIncome ?? 0,
          totalDues: data.totalDues ?? data.pendingDues ?? data.totalPending ?? 0,
          totalInvoices: data.totalInvoices ?? data.count ?? 0,
          paidInvoicesCount: data.paidInvoicesCount ?? data.paidCount ?? 0,
          unpaidInvoicesCount: data.unpaidInvoicesCount ?? data.unpaidCount ?? 0,
          overdueInvoicesCount: data.overdueInvoicesCount ?? data.overdueCount ?? 0,
        });
      }
    } catch (e) {
      console.warn('Could not fetch /fees/stats/summary, will compute from invoices:', e);
    }
  }, []);

  // Fetch Invoices: GET /fees/invoices
  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClass) params.set('classId', filterClass);
      if (filterSection) params.set('sectionId', filterSection);
      if (filterMonth) params.set('month', filterMonth);
      if (filterYear) params.set('year', filterYear);
      if (filterStatus && filterStatus !== 'ALL') params.set('status', filterStatus);
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('page', invoicePage.toString());
      params.set('limit', invoiceLimit.toString());

      const res = await fetch(`${API_BASE_URL}/fees/invoices?${params.toString()}`, {
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const list: FeeInvoice[] = Array.isArray(data.invoices)
          ? data.invoices
          : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        setInvoices(list);
        setTotalInvoicesCount(data.total || data.pagination?.total || list.length);

        setStats(prev => {
          if (prev.totalInvoices > 0) return prev;
          const collected = list.reduce((acc, inv) => acc + (inv.paidAmount || (inv.status === 'PAID' ? inv.amount : 0)), 0);
          const dues = list.reduce((acc, inv) => acc + (inv.dueAmount || (inv.status !== 'PAID' ? inv.amount : 0)), 0);
          return {
            totalCollections: collected,
            totalDues: dues,
            totalInvoices: list.length,
            paidInvoicesCount: list.filter(i => i.status === 'PAID').length,
            unpaidInvoicesCount: list.filter(i => i.status === 'UNPAID').length,
            overdueInvoicesCount: list.filter(i => i.status === 'OVERDUE').length,
          };
        });
      } else {
        setInvoices([]);
        setTotalInvoicesCount(0);
      }
    } catch (e) {
      console.error('Failed to load /fees/invoices', e);
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }, [filterClass, filterSection, filterMonth, filterYear, filterStatus, debouncedSearch, invoicePage, invoiceLimit]);

  // Fetch Fee Structures: GET /fees/structures
  const fetchStructures = useCallback(async () => {
    setStructuresLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/fees/structures`, {
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const list = Array.isArray(data) ? data : data.structures || [];
        setStructures(list);
      } else {
        setStructures([]);
      }
    } catch (e) {
      console.error('Failed to load /fees/structures', e);
      setStructures([]);
    } finally {
      setStructuresLoading(false);
    }
  }, []);

  // Fetch Payment Settings: GET /fees/settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/fees/settings`, {
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data) {
          setPaymentSettings(prev => ({
            ...prev,
            ...data,
            defaultPaymentMode: data.defaultPaymentMode || data.paymentMode || prev.defaultPaymentMode,
            personalPaymentInfo: {
              ...prev.personalPaymentInfo,
              ...(data.personalPaymentInfo || {}),
            },
            schoolCarePaymentInfo: {
              ...prev.schoolCarePaymentInfo,
              ...(data.schoolCarePaymentInfo || {}),
            },
            lateFeeFinePerDay: data.lateFeeFinePerDay ?? prev.lateFeeFinePerDay,
            currency: data.currency || prev.currency,
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load /fees/settings', e);
    }
  }, []);

  // Initial Data Loading
  useEffect(() => {
    fetchMetadata();
    fetchStats();
    fetchInvoices();
    fetchStructures();
    fetchSettings();
  }, [fetchMetadata, fetchStats, fetchInvoices, fetchStructures, fetchSettings]);

  // Filter sections dynamically based on class in generator
  const availableSectionsForGen = useMemo(() => {
    if (!generateForm.classId) return sectionsList;
    return sectionsList.filter(s => s.classId === generateForm.classId);
  }, [generateForm.classId, sectionsList]);

  // Filter students dynamically based on class & section in generator
  const availableStudentsForGen = useMemo(() => {
    let result = allStudents;
    if (generateForm.classId) {
      result = result.filter(s => s.classIds?.includes(generateForm.classId));
    }
    if (generateForm.sectionId) {
      result = result.filter(s => s.sectionIds?.includes(generateForm.sectionId));
    }
    return result;
  }, [allStudents, generateForm.classId, generateForm.sectionId]);

  // Handle Fee Structure selection in Generate Form
  const handleSelectStructureForGen = (structureId: string) => {
    const selected = structures.find(s => s.id === structureId);
    if (selected) {
      setGenerateForm(prev => ({
        ...prev,
        feeStructureId: selected.id,
        title: selected.name || selected.title || prev.title,
        amount: selected.amount || prev.amount,
        feeType: selected.feeType || prev.feeType,
        description: selected.description || prev.description,
        classId: (selected.classIds && selected.classIds[0]) || selected.classId || prev.classId,
      }));
    } else {
      setGenerateForm(prev => ({ ...prev, feeStructureId: '' }));
    }
  };

  // -------------------------------------------------------------
  // POST /fees/generate - The Core Required API
  // -------------------------------------------------------------
  const handleGenerateFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateForm.title.trim()) {
      setNotification({ type: 'error', message: 'Please provide a fee invoice title.' });
      return;
    }
    if (generateForm.amount <= 0) {
      setNotification({ type: 'error', message: 'Amount must be greater than 0.' });
      return;
    }

    setGenerateLoading(true);
    try {
      const payload: any = {
        title: generateForm.title.trim(),
        description: generateForm.description.trim() || undefined,
        feeType: generateForm.feeType,
        amount: Number(generateForm.amount),
        discountAmount: Number(generateForm.discountAmount || 0),
        month: generateForm.month,
        year: Number(generateForm.year),
        dueDate: new Date(generateForm.dueDate).toISOString(),
        paymentMode: generateForm.paymentMode,
      };

      if (generateForm.feeStructureId) {
        payload.feeStructureId = generateForm.feeStructureId;
      }
      if (generateForm.classId) {
        payload.classId = generateForm.classId;
      }
      if (generateForm.sectionId) {
        payload.sectionId = generateForm.sectionId;
      }

      if (generateForm.targetMode === 'single_student' && generateForm.studentId) {
        payload.studentId = generateForm.studentId;
      } else if (generateForm.targetMode === 'specific_students' && generateForm.studentIds.length > 0) {
        payload.studentIds = generateForm.studentIds;
        payload.studentId = generateForm.studentIds[0];
      }

      const res = await fetch(`${API_BASE_URL}/fees/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = Array.isArray(resJson.message)
          ? resJson.message.join('; ')
          : (resJson.message || `Failed to generate fees (Status ${res.status})`);
        throw new Error(errorMsg);
      }

      setNotification({
        type: 'success',
        message: resJson.message || `Successfully generated fees for ${generateForm.month} ${generateForm.year}!`,
      });
      setIsGenerateModalOpen(false);
      fetchInvoices();
      fetchStats();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error occurred while generating fees',
      });
    } finally {
      setGenerateLoading(false);
    }
  };

  // -------------------------------------------------------------
  // POST /fees/invoices/{id}/payments - Record Payment
  // -------------------------------------------------------------
  const handleOpenRecordPayment = (inv: FeeInvoice) => {
    setPaymentInvoice(inv);
    const due = inv.dueAmount !== undefined ? inv.dueAmount : (inv.amount - (inv.paidAmount || 0));
    setPaymentAmount(due > 0 ? due : inv.amount);
    setPaymentMethod('CASH');
    setPaymentRef('');
    setPaymentNote('');
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    if (paymentAmount <= 0) {
      setNotification({ type: 'error', message: 'Payment amount must be greater than 0.' });
      return;
    }

    setRecordPaymentLoading(true);
    try {
      const payload = {
        amount: Number(paymentAmount),
        paymentMethod,
        transactionRef: paymentRef.trim() || undefined,
        note: paymentNote.trim() || undefined,
        paidAt: new Date().toISOString(),
      };

      const res = await fetch(`${API_BASE_URL}/fees/invoices/${paymentInvoice.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resJson.message || `Failed to record payment (Status ${res.status})`);
      }

      setNotification({
        type: 'success',
        message: `Payment of ${formatCurrency(paymentAmount)} recorded successfully!`,
      });
      setPaymentModalOpen(false);
      setPaymentInvoice(null);
      fetchInvoices();
      fetchStats();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error recording payment',
      });
    } finally {
      setRecordPaymentLoading(false);
    }
  };

  // -------------------------------------------------------------
  // GET /fees/invoices/{id}/print - Print / PDF Receipt
  // -------------------------------------------------------------
  const handlePrintInvoice = async (inv: FeeInvoice) => {
    try {
      const { jsPDF } = await getPdfTools();
      const doc = new jsPDF('portrait');

      // Header Brand
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, 210, 32, 'F');

      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('SCHOOLCARE AI - FEE INVOICE & RECEIPT SLIP', 14, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Fee Statement & Payment Receipt', 14, 25);

      // Student and invoice meta
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);

      const y = 45;
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice Number:', 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(inv.invoiceNumber || inv.id.slice(0, 8).toUpperCase(), 55, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Date Issued:', 130, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(inv.createdAt), 165, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Student Name:', 14, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(inv.studentName || 'Student', 55, y + 8);

      doc.setFont('helvetica', 'bold');
      doc.text('Roll Number:', 130, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(inv.studentRoll || '—', 165, y + 8);

      doc.setFont('helvetica', 'bold');
      doc.text('Class & Section:', 14, y + 16);
      doc.setFont('helvetica', 'normal');
      doc.text(`${inv.className || 'General'} ${inv.sectionName ? `(${inv.sectionName})` : ''}`, 55, y + 16);

      doc.setFont('helvetica', 'bold');
      doc.text('Billing Month/Year:', 130, y + 16);
      doc.setFont('helvetica', 'normal');
      doc.text(`${inv.month || ''} ${inv.year || ''}`, 165, y + 16);

      // Table breakdown
      doc.setFillColor(243, 244, 246);
      doc.rect(14, y + 26, 182, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Fee Description', 18, y + 33);
      doc.text('Fee Type', 100, y + 33);
      doc.text('Amount (BDT)', 160, y + 33);

      doc.setFont('helvetica', 'normal');
      doc.text(inv.title, 18, y + 46);
      doc.text(inv.feeType, 100, y + 46);
      doc.text(formatCurrency(inv.amount), 160, y + 46);

      doc.setDrawColor(220, 220, 220);
      doc.line(14, y + 54, 196, y + 54);

      let totY = y + 64;
      doc.text('Base Amount:', 120, totY);
      doc.text(formatCurrency(inv.amount), 165, totY);

      if (inv.discountAmount && inv.discountAmount > 0) {
        totY += 8;
        doc.text('Discount / Concession:', 120, totY);
        doc.text(`- ${formatCurrency(inv.discountAmount)}`, 165, totY);
      }

      totY += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Paid Amount:', 120, totY);
      doc.setTextColor(22, 163, 74);
      doc.text(formatCurrency(inv.paidAmount || (inv.status === 'PAID' ? inv.amount : 0)), 165, totY);

      totY += 8;
      doc.setTextColor(220, 38, 38);
      doc.text('Remaining Due:', 120, totY);
      const due = inv.dueAmount !== undefined ? inv.dueAmount : (inv.status === 'PAID' ? 0 : inv.amount);
      doc.text(formatCurrency(due), 165, totY);

      // Signatures
      const sigY = 230;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setDrawColor(180, 180, 180);
      doc.line(20, sigY, 70, sigY);
      doc.line(140, sigY, 190, sigY);
      doc.text('Accountant / Authorized Signature', 22, sigY + 6);
      doc.text('Parent / Student Signature', 146, sigY + 6);

      doc.save(`fee_invoice_${inv.invoiceNumber || inv.id.slice(0, 8)}.pdf`);
    } catch (e) {
      console.error('Error generating PDF receipt', e);
      setNotification({ type: 'error', message: 'Could not generate printable receipt.' });
    }
  };

  // -------------------------------------------------------------
  // PATCH /fees/settings - Update School Payment Mode
  // -------------------------------------------------------------
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const payload = {
        defaultPaymentMode: paymentSettings.defaultPaymentMode,
        personalPaymentInfo: {
          bankName: paymentSettings.personalPaymentInfo.bankName || '',
          accountName: paymentSettings.personalPaymentInfo.accountName || '',
          accountNumber: paymentSettings.personalPaymentInfo.accountNumber || '',
          branch: paymentSettings.personalPaymentInfo.branch || '',
          routingNumber: paymentSettings.personalPaymentInfo.routingNumber || '',
          bkashNumber: paymentSettings.personalPaymentInfo.bkashNumber || '',
          nagadNumber: paymentSettings.personalPaymentInfo.nagadNumber || '',
          rocketNumber: paymentSettings.personalPaymentInfo.rocketNumber || '',
          cashCounterLocation: paymentSettings.personalPaymentInfo.cashCounterLocation || '',
          instructions: paymentSettings.personalPaymentInfo.instructions || '',
        },
        schoolCarePaymentInfo: {
          enabled: Boolean(paymentSettings.schoolCarePaymentInfo.enabled),
          merchantId: paymentSettings.schoolCarePaymentInfo.merchantId || '',
          gatewayUrl: paymentSettings.schoolCarePaymentInfo.gatewayUrl || '',
          instructions: paymentSettings.schoolCarePaymentInfo.instructions || '',
        },
        lateFeeFinePerDay: Number(paymentSettings.lateFeeFinePerDay || 0),
        currency: paymentSettings.currency || 'BDT',
      };

      const res = await fetch(`${API_BASE_URL}/fees/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = Array.isArray(resJson.message)
          ? resJson.message.join('; ')
          : (resJson.message || `Failed to update settings (Status ${res.status})`);
        throw new Error(errorMsg);
      }

      setNotification({ type: 'success', message: 'School payment configuration updated successfully!' });
      fetchSettings();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error updating settings' });
    } finally {
      setSavingSettings(false);
    }
  };

  // -------------------------------------------------------------
  // POST & PATCH /fees/structures - Fee Structure Templates
  // -------------------------------------------------------------
  const handleOpenAddStructure = () => {
    setEditingStructureId(null);
    setStructureForm({
      name: '',
      description: '',
      feeType: 'TUITION',
      amount: 1500,
      frequency: 'MONTHLY',
      classIds: [],
    });
    setStructureModalOpen(true);
  };

  const handleOpenEditStructure = (st: FeeStructure) => {
    setEditingStructureId(st.id);
    setStructureForm({
      name: st.name || st.title || '',
      description: st.description || '',
      feeType: st.feeType || 'TUITION',
      amount: st.amount || 1500,
      frequency: st.frequency || 'MONTHLY',
      classIds: st.classIds || (st.classId ? [st.classId] : []),
    });
    setStructureModalOpen(true);
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structureForm.name.trim()) {
      setNotification({ type: 'error', message: 'Template name is required.' });
      return;
    }
    if (structureForm.amount <= 0) {
      setNotification({ type: 'error', message: 'Amount must be greater than 0.' });
      return;
    }

    setSavingStructure(true);
    try {
      const isEdit = !!editingStructureId;
      const url = isEdit
        ? `${API_BASE_URL}/fees/structures/${editingStructureId}`
        : `${API_BASE_URL}/fees/structures`;
      const method = isEdit ? 'PATCH' : 'POST';

      const payload = {
        name: structureForm.name.trim(),
        feeType: structureForm.feeType,
        description: structureForm.description.trim() || undefined,
        amount: Number(structureForm.amount),
        frequency: structureForm.frequency,
        classIds: structureForm.classIds,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = Array.isArray(resJson.message)
          ? resJson.message.join('; ')
          : (resJson.message || `Failed to save structure (Status ${res.status})`);
        throw new Error(errorMsg);
      }

      setNotification({
        type: 'success',
        message: isEdit ? 'Fee structure template updated!' : 'Fee structure template created!',
      });
      setStructureModalOpen(false);
      fetchStructures();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error saving fee structure' });
    } finally {
      setSavingStructure(false);
    }
  };

  const handleDeleteStructure = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee structure template?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/fees/structures/${id}`, {
        method: 'DELETE',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to delete');
      }
      setNotification({ type: 'success', message: 'Fee structure deleted successfully.' });
      fetchStructures();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error deleting structure' });
    }
  };

  // -------------------------------------------------------------
  // GET /fees/students/{studentId}/history - Student Fee History
  // -------------------------------------------------------------
  const handleFetchStudentHistory = async () => {
    if (!historyStudentId) {
      setNotification({ type: 'error', message: 'Please select a student first.' });
      return;
    }

    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/fees/students/${historyStudentId}/history`, {
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const list = Array.isArray(data) ? data : data.invoices || [];
        setStudentHistoryInvoices(list);
      } else {
        setStudentHistoryInvoices([]);
        setNotification({ type: 'error', message: 'No fee history found for this student.' });
      }
    } catch (e: any) {
      console.error('Error fetching student fee history', e);
      setNotification({ type: 'error', message: 'Failed to fetch student fee history.' });
    } finally {
      setHistoryLoading(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
            <CheckCircle2 size={13} /> Paid
          </span>
        );
      case 'PARTIAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(234, 179, 8, 0.12)', color: '#ca8a04', border: '1px solid rgba(234, 179, 8, 0.25)' }}>
            <Clock size={13} /> Partial
          </span>
        );
      case 'OVERDUE':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <AlertCircle size={13} /> Overdue
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(249, 115, 22, 0.12)', color: '#ea580c', border: '1px solid rgba(249, 115, 22, 0.25)' }}>
            <Clock size={13} /> Unpaid
          </span>
        );
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* Top Banner Notifications */}
      {notification && (
        <div style={{
          marginBottom: '1.25rem',
          padding: '0.9rem 1.25rem',
          borderRadius: '12px',
          background: notification.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${notification.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: notification.type === 'success' ? '#15803d' : '#b91c1c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.9rem', fontWeight: 600 }}>
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header section with Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)', margin: 0, letterSpacing: '-0.02em' }}>
                {t('nav.feesManagement') || 'Fees Management'}
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', margin: '0.15rem 0 0 0' }}>
                Generate student invoices, track collections, manage fee structures & school payment settings
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              fetchStats();
              fetchInvoices();
              fetchStructures();
            }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 0.9rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--foreground)' }}
            title="Refresh All Data"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAddStructure}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 0.95rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--foreground)' }}
          >
            <Layers size={16} />
            <span>+ Fee Structure</span>
          </button>

          {/* GENERATE FEES PRIMARY BUTTON */}
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 700,
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            <Plus size={18} />
            <span>Generate Fees</span>
          </button>
        </div>
      </div>

      {/* Top Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.15rem', marginBottom: '2rem' }}>
        
        {/* Total Collections */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.1rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Total Collected</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.2, marginTop: '0.15rem' }}>
              {formatCurrency(stats.totalCollections)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
              From paid & partial invoices
            </div>
          </div>
        </div>

        {/* Total Outstanding Dues */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.1rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingDown size={24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Outstanding Dues</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', lineHeight: 1.2, marginTop: '0.15rem' }}>
              {formatCurrency(stats.totalDues)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
              Uncollected student balances
            </div>
          </div>
        </div>

        {/* Invoices Count */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.1rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Receipt size={24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Total Invoices</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.2, marginTop: '0.15rem' }}>
              {stats.totalInvoices || totalInvoicesCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
              Generated across all classes
            </div>
          </div>
        </div>

        {/* Payment Mode Status */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.1rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Payment Gateway Mode</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669', lineHeight: 1.3, marginTop: '0.15rem' }}>
              {paymentSettings.defaultPaymentMode === 'PERSONAL_PAYMENT' ? 'Personal Payment' : 'School Care Pay'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
              Configured for current school
            </div>
          </div>
        </div>

      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.75rem', gap: '0.5rem', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('invoices')}
          style={{
            padding: '0.75rem 1.2rem',
            borderBottom: activeTab === 'invoices' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'invoices' ? 'var(--primary)' : 'var(--muted-foreground)',
            fontWeight: activeTab === 'invoices' ? 700 : 500,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
          }}
        >
          <Receipt size={17} />
          <span>Invoices & Collections</span>
        </button>

        <button
          onClick={() => setActiveTab('structures')}
          style={{
            padding: '0.75rem 1.2rem',
            borderBottom: activeTab === 'structures' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'structures' ? 'var(--primary)' : 'var(--muted-foreground)',
            fontWeight: activeTab === 'structures' ? 700 : 500,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
          }}
        >
          <Layers size={17} />
          <span>Fee Structures (Templates)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.75rem 1.2rem',
            borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'history' ? 'var(--primary)' : 'var(--muted-foreground)',
            fontWeight: activeTab === 'history' ? 700 : 500,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
          }}
        >
          <User size={17} />
          <span>Student Fee History</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '0.75rem 1.2rem',
            borderBottom: activeTab === 'settings' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'settings' ? 'var(--primary)' : 'var(--muted-foreground)',
            fontWeight: activeTab === 'settings' ? 700 : 500,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
          }}
        >
          <Settings size={17} />
          <span>School Payment Settings</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: INVOICES & COLLECTIONS                             */}
      {/* ========================================================= */}
      {activeTab === 'invoices' && (
        <div>
          {/* Filters Bar */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.1rem', marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center' }}>
            
            {/* Search Input */}
            <div style={{ flex: '1 1 240px', minWidth: '220px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
              <input
                type="text"
                placeholder="Search invoice, student name, roll..."
                value={invoiceSearch}
                onChange={e => setInvoiceSearch(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
              />
            </div>

            {/* Class filter */}
            <select
              value={filterClass}
              onChange={e => {
                setFilterClass(e.target.value);
                setFilterSection('');
                setInvoicePage(1);
              }}
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
            >
              <option value="">All Classes</option>
              {classesList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Section filter */}
            <select
              value={filterSection}
              onChange={e => {
                setFilterSection(e.target.value);
                setInvoicePage(1);
              }}
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
            >
              <option value="">All Sections</option>
              {sectionsList
                .filter(s => !filterClass || s.classId === filterClass)
                .map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>

            {/* Month filter */}
            <select
              value={filterMonth}
              onChange={e => {
                setFilterMonth(e.target.value);
                setInvoicePage(1);
              }}
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
            >
              <option value="">All Months</option>
              {MONTHS_LIST.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => {
                setFilterStatus(e.target.value);
                setInvoicePage(1);
              }}
              style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="UNPAID">Unpaid</option>
              <option value="OVERDUE">Overdue</option>
            </select>

            {/* Clear Filters */}
            {(filterClass || filterSection || filterMonth || filterStatus !== 'ALL' || invoiceSearch) && (
              <button
                onClick={() => {
                  setFilterClass('');
                  setFilterSection('');
                  setFilterMonth('');
                  setFilterStatus('ALL');
                  setInvoiceSearch('');
                  setInvoicePage(1);
                }}
                style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px dashed var(--border)', background: 'none', color: 'var(--muted-foreground)', fontSize: '0.825rem', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Invoices Table Card */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.9rem 1rem' }}>#</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Student Details</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Fee Title / Type</th>
                    <th style={{ padding: '0.9rem 1rem' }}>Month & Due Date</th>
                    <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Total (BDT)</th>
                    <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Paid / Due</th>
                    <th style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesLoading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
                        <div>Loading fee invoices...</div>
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3.5rem', textAlign: 'center' }}>
                        <Receipt size={40} style={{ margin: '0 auto 0.75rem auto', color: 'var(--muted-foreground)', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>No fee invoices found</h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                          Generate fees for a class or section to create official student fee invoices.
                        </p>
                        <button
                          onClick={() => setIsGenerateModalOpen(true)}
                          style={{
                            padding: '0.6rem 1.15rem',
                            borderRadius: '8px',
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                          }}
                        >
                          <Plus size={16} /> Generate School Fees
                        </button>
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv, idx) => {
                      const paid = inv.paidAmount || (inv.status === 'PAID' ? inv.amount : 0);
                      const due = inv.dueAmount !== undefined ? inv.dueAmount : (inv.status === 'PAID' ? 0 : inv.amount - paid);
                      return (
                        <tr key={inv.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.9rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
                            {(invoicePage - 1) * invoiceLimit + idx + 1}
                          </td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>
                              {inv.studentName || 'Student'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                              <span>Roll: {inv.studentRoll || '—'}</span>
                              <span>•</span>
                              <span>{inv.className || 'Class'} {inv.sectionName ? `(${inv.sectionName})` : ''}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{inv.title}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>
                              Type: <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{inv.feeType}</span>
                            </div>
                          </td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{inv.month || '—'} {inv.year || ''}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                              Due: {formatDate(inv.dueDate)}
                            </div>
                          </td>
                          <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                            {formatCurrency(inv.amount)}
                            {inv.discountAmount ? (
                              <div style={{ fontSize: '0.7rem', color: '#16a34a' }}>
                                Disc: -{formatCurrency(inv.discountAmount)}
                              </div>
                            ) : null}
                          </td>
                          <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                            <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>
                              Paid: {formatCurrency(paid)}
                            </div>
                            <div style={{ color: due > 0 ? '#dc2626' : 'var(--muted-foreground)', fontWeight: due > 0 ? 700 : 500, fontSize: '0.75rem' }}>
                              Due: {formatCurrency(due)}
                            </div>
                          </td>
                          <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                            {renderStatusBadge(inv.status)}
                          </td>
                          <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              {inv.status !== 'PAID' && (
                                <button
                                  onClick={() => handleOpenRecordPayment(inv)}
                                  title="Record Payment"
                                  style={{
                                    padding: '0.4rem 0.65rem',
                                    borderRadius: '6px',
                                    background: '#16a34a',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                  }}
                                >
                                  <DollarSign size={13} /> Pay
                                </button>
                              )}
                              <button
                                onClick={() => handlePrintInvoice(inv)}
                                title="Print Invoice / Receipt"
                                style={{
                                  padding: '0.4rem 0.5rem',
                                  borderRadius: '6px',
                                  background: 'var(--muted)',
                                  color: 'var(--foreground)',
                                  border: '1px solid var(--border)',
                                  cursor: 'pointer',
                                }}
                              >
                                <Printer size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {invoices.length > 0 && (
              <div style={{ padding: '0.9rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>
                  Showing {invoices.length} of {totalInvoicesCount} invoices
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    disabled={invoicePage <= 1}
                    onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                    style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', cursor: invoicePage <= 1 ? 'not-allowed' : 'pointer', opacity: invoicePage <= 1 ? 0.5 : 1 }}
                  >
                    Previous
                  </button>
                  <span style={{ fontWeight: 600 }}>Page {invoicePage}</span>
                  <button
                    disabled={invoices.length < invoiceLimit}
                    onClick={() => setInvoicePage(p => p + 1)}
                    style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', cursor: invoices.length < invoiceLimit ? 'not-allowed' : 'pointer', opacity: invoices.length < invoiceLimit ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: FEE STRUCTURES (TEMPLATES)                         */}
      {/* ========================================================= */}
      {activeTab === 'structures' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Fee Structure Templates</h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)', margin: '0.2rem 0 0 0' }}>
                Define recurring fee templates per class to quickly generate fees with standard amounts.
              </p>
            </div>
            <button
              onClick={handleOpenAddStructure}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} /> Create Template
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {structuresLoading ? (
              <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
                Loading fee structure templates...
              </div>
            ) : structures.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', background: 'var(--card)', border: '1px dashed var(--border)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                <Layers size={36} style={{ margin: '0 auto 0.75rem auto', color: 'var(--muted-foreground)', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>No fee structure templates yet</h3>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.825rem', margin: '0.25rem 0 1.25rem 0' }}>
                  Create templates for monthly tuition fees, admission fees, or term exam fees.
                </p>
                <button
                  onClick={handleOpenAddStructure}
                  style={{ padding: '0.55rem 1rem', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add First Template
                </button>
              </div>
            ) : (
              structures.map(st => {
                const cls = classesList.find(c => c.id === st.classId);
                return (
                  <div key={st.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
                          {st.feeType || 'TUITION'}
                        </span>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleOpenEditStructure(st)}
                            style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.2rem' }}
                            title="Edit"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteStructure(st.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--foreground)' }}>
                        {st.name || st.title}
                      </h3>
                      {st.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                          {st.description}
                        </p>
                      )}

                      <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'flex', flexDirection: 'column', gap: '0.25rem', margin: '0.75rem 0' }}>
                        <div>
                          Classes:{' '}
                          <strong style={{ color: 'var(--foreground)' }}>
                            {st.classIds && st.classIds.length > 0
                              ? classesList.filter(c => st.classIds?.includes(c.id)).map(c => c.name).join(', ') || `${st.classIds.length} classes`
                              : cls?.name || 'All Classes'}
                          </strong>
                        </div>
                        <div>Frequency: <strong style={{ color: 'var(--foreground)' }}>{st.frequency || 'Monthly'}</strong></div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>Standard Amount</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)' }}>
                        {formatCurrency(st.amount)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: STUDENT FEE HISTORY                                */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        <div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>Student Historical Fee Ledger</h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)', margin: '0 0 1.25rem 0' }}>
              Select a student to view complete past billing statements, payments, and clearance records.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.35rem' }}>
                  Filter by Class
                </label>
                <select
                  value={historyClassId}
                  onChange={e => {
                    setHistoryClassId(e.target.value);
                    setHistorySectionId('');
                    setHistoryStudentId('');
                  }}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                >
                  <option value="">All Classes</option>
                  {classesList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.35rem' }}>
                  Filter by Section
                </label>
                <select
                  value={historySectionId}
                  onChange={e => {
                    setHistorySectionId(e.target.value);
                    setHistoryStudentId('');
                  }}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                >
                  <option value="">All Sections</option>
                  {sectionsList
                    .filter(s => !historyClassId || s.classId === historyClassId)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.35rem' }}>
                  Select Student *
                </label>
                <select
                  value={historyStudentId}
                  onChange={e => setHistoryStudentId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                >
                  <option value="">Choose a student...</option>
                  {allStudents
                    .filter(s => (!historyClassId || s.classIds?.includes(historyClassId)) && (!historySectionId || s.sectionIds?.includes(historySectionId)))
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.rollNumber ? `(Roll: ${s.rollNumber})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <button
                  onClick={handleFetchStudentHistory}
                  disabled={!historyStudentId || historyLoading}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: !historyStudentId || historyLoading ? 'not-allowed' : 'pointer',
                    opacity: !historyStudentId || historyLoading ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                  }}
                >
                  {historyLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                  <span>View Fee Ledger</span>
                </button>
              </div>
            </div>
          </div>

          {/* Student History Results */}
          {studentHistoryInvoices.length > 0 ? (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Invoice</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Fee Title</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Month / Year</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total (BDT)</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Paid (BDT)</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Print</th>
                  </tr>
                </thead>
                <tbody>
                  {studentHistoryInvoices.map((inv, i) => (
                    <tr key={inv.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                        {inv.invoiceNumber || inv.id?.slice(0, 8)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>{inv.title}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{inv.month} {inv.year}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(inv.amount)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                        {formatCurrency(inv.paidAmount || (inv.status === 'PAID' ? inv.amount : 0))}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {renderStatusBadge(inv.status)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handlePrintInvoice(inv)}
                          style={{ padding: '0.35rem 0.55rem', borderRadius: '6px', background: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
                        >
                          <Printer size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
              <User size={36} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
              <div>Select a student to load historical fee records.</div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SCHOOL PAYMENT SETTINGS                            */}
      {/* ========================================================= */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: '880px' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.35rem 0' }}>School Payment Configuration</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', margin: 0 }}>
                  Configure how parents and students pay fees (Direct Personal Payment vs Automated School Care Gateway).
                </p>
              </div>
              <button
                type="button"
                onClick={fetchSettings}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', cursor: 'pointer' }}
              >
                <RefreshCw size={14} />
                <span>Reload Settings</span>
              </button>
            </div>

            <form onSubmit={handleSaveSettings}>
              {/* Mode Selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.65rem' }}>
                  Default Payment Mode *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  
                  {/* Personal Payment Card */}
                  <div
                    onClick={() => setPaymentSettings(s => ({ ...s, defaultPaymentMode: 'PERSONAL_PAYMENT' }))}
                    style={{
                      border: paymentSettings.defaultPaymentMode === 'PERSONAL_PAYMENT' ? '2px solid #2563eb' : '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '1rem',
                      cursor: 'pointer',
                      background: paymentSettings.defaultPaymentMode === 'PERSONAL_PAYMENT' ? 'rgba(37, 99, 235, 0.05)' : 'var(--background)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <strong style={{ fontSize: '0.95rem' }}>Personal Payment</strong>
                      <input
                        type="radio"
                        checked={paymentSettings.defaultPaymentMode === 'PERSONAL_PAYMENT'}
                        onChange={() => setPaymentSettings(s => ({ ...s, defaultPaymentMode: 'PERSONAL_PAYMENT' }))}
                      />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.4 }}>
                      Direct payment to school accounts (Cash counters, manual bKash/Nagad personal/merchant, bank transfer).
                    </p>
                  </div>

                  {/* School Care Gateway Card */}
                  <div
                    onClick={() => setPaymentSettings(s => ({ ...s, defaultPaymentMode: 'SCHOOL_CARE_PAYMENT' }))}
                    style={{
                      border: paymentSettings.defaultPaymentMode === 'SCHOOL_CARE_PAYMENT' ? '2px solid #2563eb' : '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '1rem',
                      cursor: 'pointer',
                      background: paymentSettings.defaultPaymentMode === 'SCHOOL_CARE_PAYMENT' ? 'rgba(37, 99, 235, 0.05)' : 'var(--background)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <strong style={{ fontSize: '0.95rem' }}>School Care Payment</strong>
                      <input
                        type="radio"
                        checked={paymentSettings.defaultPaymentMode === 'SCHOOL_CARE_PAYMENT'}
                        onChange={() => setPaymentSettings(s => ({ ...s, defaultPaymentMode: 'SCHOOL_CARE_PAYMENT' }))}
                      />
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.4 }}>
                      Automated online collection gateway integrated directly with student portals & automatic receipt generation.
                    </p>
                  </div>
                </div>
              </div>

              {/* ---------------- SECTION 1: PERSONAL PAYMENT INFO ---------------- */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--background)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Building size={18} color="#2563eb" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Personal & Direct Payment Information</h3>
                </div>

                {/* Mobile Financial Services (MFS) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      bKash Number
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.personalPaymentInfo?.bkashNumber || ''}
                      onChange={e => setPaymentSettings(s => ({
                        ...s,
                        personalPaymentInfo: { ...s.personalPaymentInfo, bkashNumber: e.target.value }
                      }))}
                      placeholder="e.g. 01712345678"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Nagad Number
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.personalPaymentInfo?.nagadNumber || ''}
                      onChange={e => setPaymentSettings(s => ({
                        ...s,
                        personalPaymentInfo: { ...s.personalPaymentInfo, nagadNumber: e.target.value }
                      }))}
                      placeholder="e.g. 01812345678"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Rocket Number
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.personalPaymentInfo?.rocketNumber || ''}
                      onChange={e => setPaymentSettings(s => ({
                        ...s,
                        personalPaymentInfo: { ...s.personalPaymentInfo, rocketNumber: e.target.value }
                      }))}
                      placeholder="e.g. 01912345678"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Bank Details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.personalPaymentInfo?.bankName || ''}
                      onChange={e => setPaymentSettings(s => ({
                        ...s,
                        personalPaymentInfo: { ...s.personalPaymentInfo, bankName: e.target.value }
                      }))}
                      placeholder="e.g. Sonali Bank"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Account Name / Title
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.personalPaymentInfo?.accountName || ''}
                      onChange={e => setPaymentSettings(s => ({
                        ...s,
                        personalPaymentInfo: { ...s.personalPaymentInfo, accountName: e.target.value }
                      }))}
                      placeholder="e.g. Dhaka Ideal School & College"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.personalPaymentInfo?.accountNumber || ''}
                      onChange={e => setPaymentSettings(s => ({
                        ...s,
                        personalPaymentInfo: { ...s.personalPaymentInfo, accountNumber: e.target.value }
                      }))}
                      placeholder="e.g. 1234567890123"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Branch Name
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.personalPaymentInfo?.branch || ''}
                      onChange={e => setPaymentSettings(s => ({
                        ...s,
                        personalPaymentInfo: { ...s.personalPaymentInfo, branch: e.target.value }
                      }))}
                      placeholder="e.g. Motijheel Branch"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Routing Number
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.personalPaymentInfo?.routingNumber || ''}
                      onChange={e => setPaymentSettings(s => ({
                        ...s,
                        personalPaymentInfo: { ...s.personalPaymentInfo, routingNumber: e.target.value }
                      }))}
                      placeholder="e.g. 125272635"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Cash Counter Location
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.personalPaymentInfo?.cashCounterLocation || ''}
                      onChange={e => setPaymentSettings(s => ({
                        ...s,
                        personalPaymentInfo: { ...s.personalPaymentInfo, cashCounterLocation: e.target.value }
                      }))}
                      placeholder="e.g. Accounts Office, Room 102 (9 AM - 2 PM)"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Personal Payment Instructions (Shown on invoices & parent portal)
                  </label>
                  <textarea
                    rows={2}
                    value={paymentSettings.personalPaymentInfo?.instructions || ''}
                    onChange={e => setPaymentSettings(s => ({
                      ...s,
                      personalPaymentInfo: { ...s.personalPaymentInfo, instructions: e.target.value }
                    }))}
                    placeholder="Please send money to our bKash/Nagad number with Student Roll Number as Reference..."
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* ---------------- SECTION 2: SCHOOL CARE PAYMENT INFO ---------------- */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--background)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={18} color="#16a34a" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>School Care Gateway Settings</h3>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(paymentSettings.schoolCarePaymentInfo?.enabled)}
                      onChange={e => setPaymentSettings(s => ({
                        ...s,
                        schoolCarePaymentInfo: { ...s.schoolCarePaymentInfo, enabled: e.target.checked }
                      }))}
                    />
                    <span>Gateway Enabled</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Merchant ID
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.schoolCarePaymentInfo?.merchantId || ''}
                      onChange={e => setPaymentSettings(s => ({
                        ...s,
                        schoolCarePaymentInfo: { ...s.schoolCarePaymentInfo, merchantId: e.target.value }
                      }))}
                      placeholder="e.g. SCHOOL_CARE_MERCHANT_001"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Gateway API Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.schoolCarePaymentInfo?.gatewayUrl || ''}
                      onChange={e => setPaymentSettings(s => ({
                        ...s,
                        schoolCarePaymentInfo: { ...s.schoolCarePaymentInfo, gatewayUrl: e.target.value }
                      }))}
                      placeholder="e.g. https://gateway.schoolcare.app/api/v1"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    School Care Gateway Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={paymentSettings.schoolCarePaymentInfo?.instructions || ''}
                    onChange={e => setPaymentSettings(s => ({
                      ...s,
                      schoolCarePaymentInfo: { ...s.schoolCarePaymentInfo, instructions: e.target.value }
                    }))}
                    placeholder="Pay seamlessly using automated School Care online payment gateway."
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* ---------------- SECTION 3: FINE & CURRENCY POLICIES ---------------- */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Late Fee Fine Per Day (BDT)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={paymentSettings.lateFeeFinePerDay ?? 10}
                    onChange={e => setPaymentSettings(s => ({ ...s, lateFeeFinePerDay: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Currency Code
                  </label>
                  <input
                    type="text"
                    value={paymentSettings.currency || 'BDT'}
                    onChange={e => setPaymentSettings(s => ({ ...s, currency: e.target.value }))}
                    placeholder="BDT"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                style={{
                  padding: '0.7rem 1.6rem',
                  borderRadius: '8px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: savingSettings ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {savingSettings ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                <span>Save Payment Configuration</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: GENERATE FEES (THE REQUIRED C-URL COMPONENT)     */}
      {/* ========================================================= */}
      {isGenerateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', animation: 'popover-up 0.2s ease-out' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Generate School Fees</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                    POST /fees/generate - Create batch or individual student invoices
                  </span>
                </div>
              </div>
              <button onClick={() => setIsGenerateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleGenerateFees} style={{ padding: '1.5rem' }}>
              
              {/* Target Selection Mode */}
              <div style={{ marginBottom: '1.25rem', background: 'var(--background)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Generation Target *
                </label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="targetMode"
                      checked={generateForm.targetMode === 'class_section'}
                      onChange={() => setGenerateForm(f => ({ ...f, targetMode: 'class_section' }))}
                    />
                    <span>All Students in Class & Section</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="targetMode"
                      checked={generateForm.targetMode === 'specific_students'}
                      onChange={() => setGenerateForm(f => ({ ...f, targetMode: 'specific_students' }))}
                    />
                    <span>Multiple Specific Students</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="targetMode"
                      checked={generateForm.targetMode === 'single_student'}
                      onChange={() => setGenerateForm(f => ({ ...f, targetMode: 'single_student' }))}
                    />
                    <span>Single Student</span>
                  </label>
                </div>
              </div>

              {/* Class & Section Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Class *
                  </label>
                  <select
                    required
                    value={generateForm.classId}
                    onChange={e => setGenerateForm(f => ({ ...f, classId: e.target.value, sectionId: '', studentId: '', studentIds: [] }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  >
                    <option value="">Select Class...</option>
                    {classesList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Section
                  </label>
                  <select
                    value={generateForm.sectionId}
                    onChange={e => setGenerateForm(f => ({ ...f, sectionId: e.target.value, studentId: '', studentIds: [] }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  >
                    <option value="">All / Select Section...</option>
                    {availableSectionsForGen.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Specific Student Selection if selected */}
              {generateForm.targetMode === 'single_student' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Select Student *
                  </label>
                  <select
                    required
                    value={generateForm.studentId}
                    onChange={e => setGenerateForm(f => ({ ...f, studentId: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  >
                    <option value="">Choose student...</option>
                    {availableStudentsForGen.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.rollNumber ? `(Roll: ${s.rollNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {generateForm.targetMode === 'specific_students' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Select Students ({generateForm.studentIds.length} selected)
                  </label>
                  <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem', background: 'var(--background)' }}>
                    {availableStudentsForGen.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', padding: '0.5rem' }}>
                        No students found for chosen class/section.
                      </div>
                    ) : (
                      availableStudentsForGen.map(s => {
                        const isChecked = generateForm.studentIds.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setGenerateForm(f => ({
                                ...f,
                                studentIds: isChecked
                                  ? f.studentIds.filter(id => id !== s.id)
                                  : [...f.studentIds, s.id],
                              }));
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: '4px', cursor: 'pointer', background: isChecked ? 'rgba(37, 99, 235, 0.08)' : 'transparent' }}
                          >
                            {isChecked ? <CheckSquare size={16} color="#2563eb" /> : <Square size={16} color="var(--muted-foreground)" />}
                            <span style={{ fontSize: '0.85rem', fontWeight: isChecked ? 600 : 400 }}>
                              {s.name} {s.rollNumber ? `• Roll ${s.rollNumber}` : ''}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Template Quick Loader */}
              {structures.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Load from Fee Structure Template (Optional)
                  </label>
                  <select
                    value={generateForm.feeStructureId}
                    onChange={e => handleSelectStructureForGen(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  >
                    <option value="">Custom Fee (No Template)</option>
                    {structures.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.name || st.title} — {formatCurrency(st.amount)} ({st.feeType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fee Title & Fee Type */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Fee Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={generateForm.title}
                    onChange={e => setGenerateForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Monthly Tuition Fee - October 2026"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Fee Type *
                  </label>
                  <select
                    value={generateForm.feeType}
                    onChange={e => setGenerateForm(f => ({ ...f, feeType: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  >
                    {FEE_TYPES.map(ft => (
                      <option key={ft.value} value={ft.value}>{ft.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Payment Mode *
                  </label>
                  <select
                    value={generateForm.paymentMode}
                    onChange={e => setGenerateForm(f => ({ ...f, paymentMode: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  >
                    <option value="PERSONAL_PAYMENT">PERSONAL_PAYMENT</option>
                    <option value="SCHOOL_CARE_PAYMENT">SCHOOL_CARE_PAYMENT</option>
                  </select>
                </div>
              </div>

              {/* Amount, Discount, Month, Year */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Amount (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={generateForm.amount}
                    onChange={e => setGenerateForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Discount (BDT)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={generateForm.discountAmount}
                    onChange={e => setGenerateForm(f => ({ ...f, discountAmount: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Month *
                  </label>
                  <select
                    value={generateForm.month}
                    onChange={e => setGenerateForm(f => ({ ...f, month: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  >
                    {MONTHS_LIST.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Year *
                  </label>
                  <input
                    type="number"
                    required
                    value={generateForm.year}
                    onChange={e => setGenerateForm(f => ({ ...f, year: parseInt(e.target.value, 10) || 2026 }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              {/* Due Date & Description */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={generateForm.dueDate ? generateForm.dueDate.slice(0, 10) : '2026-10-31'}
                  onChange={e => {
                    const d = new Date(e.target.value);
                    d.setHours(23, 59, 59, 0);
                    setGenerateForm(f => ({ ...f, dueDate: d.toISOString() }));
                  }}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  value={generateForm.description}
                  onChange={e => setGenerateForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Includes computer lab fee and library charges..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', color: 'var(--foreground)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generateLoading}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: generateLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  {generateLoading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                  <span>Generate Fees Now</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RECORD PAYMENT (POST /fees/invoices/{id}/payments)*/}
      {/* ========================================================= */}
      {paymentModalOpen && paymentInvoice && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Record Fee Payment</h3>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ padding: '1.5rem' }}>
              {/* Invoice Summary Box */}
              <div style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.9rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Student:</span>
                  <strong>{paymentInvoice.studentName || 'Student'} (Roll {paymentInvoice.studentRoll || '—'})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Fee Title:</span>
                  <span>{paymentInvoice.title}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '0.35rem', marginTop: '0.35rem' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Total Amount:</span>
                  <strong>{formatCurrency(paymentInvoice.amount)}</strong>
                </div>
              </div>

              {/* Amount to pay */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Payment Amount (BDT) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '1rem', fontWeight: 700 }}
                />
              </div>

              {/* Payment Method */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                >
                  <option value="CASH">Cash Counter</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="BANK_TRANSFER">Bank Deposit / Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              {/* Ref Number */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Transaction / Money Receipt No.
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  placeholder="e.g. TR-998822 / Money Receipt # 104"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                />
              </div>

              {/* Note */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Payment Remarks / Note
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  placeholder="e.g. Paid in full at office"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  style={{ padding: '0.6rem 1.15rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentLoading}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: recordPaymentLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  {recordPaymentLoading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>Confirm Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CREATE / EDIT FEE STRUCTURE                      */}
      {/* ========================================================= */}
      {structureModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '540px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--muted)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                {editingStructureId ? 'Edit Fee Structure' : 'New Fee Structure Template'}
              </h3>
              <button onClick={() => setStructureModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStructure} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={structureForm.name}
                  onChange={e => setStructureForm(s => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Monthly Tuition Fee - High School"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Fee Type *
                  </label>
                  <select
                    value={structureForm.feeType}
                    onChange={e => setStructureForm(s => ({ ...s, feeType: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  >
                    {FEE_TYPES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Frequency *
                  </label>
                  <select
                    value={structureForm.frequency}
                    onChange={e => setStructureForm(s => ({ ...s, frequency: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="ONE_TIME">ONE_TIME</option>
                    <option value="TERMLY">TERMLY</option>
                    <option value="YEARLY">YEARLY</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Standard Amount (BDT) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={structureForm.amount}
                  onChange={e => setStructureForm(s => ({ ...s, amount: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                    Applicable Classes ({structureForm.classIds.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (structureForm.classIds.length === classesList.length) {
                        setStructureForm(s => ({ ...s, classIds: [] }));
                      } else {
                        setStructureForm(s => ({ ...s, classIds: classesList.map(c => c.id) }));
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    {structureForm.classIds.length === classesList.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '110px', overflowY: 'auto', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--background)' }}>
                  {classesList.map(c => {
                    const isSelected = structureForm.classIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setStructureForm(s => ({
                            ...s,
                            classIds: isSelected
                              ? s.classIds.filter(id => id !== c.id)
                              : [...s.classIds, c.id]
                          }));
                        }}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          border: isSelected ? '1px solid #2563eb' : '1px solid var(--border)',
                          background: isSelected ? 'rgba(37, 99, 235, 0.12)' : 'var(--card)',
                          color: isSelected ? '#2563eb' : 'var(--foreground)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        {isSelected && <Check size={12} />}
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  value={structureForm.description}
                  onChange={e => setStructureForm(s => ({ ...s, description: e.target.value }))}
                  placeholder="Standard monthly tuition charge for grades 9-10..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setStructureModalOpen(false)}
                  style={{ padding: '0.6rem 1.15rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStructure}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: savingStructure ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  {savingStructure ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{editingStructureId ? 'Update Template' : 'Create Template'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
