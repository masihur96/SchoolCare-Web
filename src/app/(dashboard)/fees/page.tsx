"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  TrendingDown, TrendingUp, Wallet, Search, Filter, RefreshCw,
  Calendar, CreditCard, X, ChevronLeft, ChevronRight,
  AlertCircle, FileText, CheckCircle2, Tag, Download, Plus,
  Layers, LayoutGrid, FileSpreadsheet, ChevronDown,
  Edit3, Trash2, Eye, AlertTriangle, Printer,
  Receipt
} from 'lucide-react';
import { getPdfTools } from '@/lib/pdf';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('access_token') ||
      ''
    );
  }
  return '';
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

interface Transaction {
  id: string;
  walletId?: string;
  schoolId?: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  category: string;
  title: string;
  description?: string | null;
  paymentMethod: string;
  referenceNumber?: string | null;
  transactionDate: string;
  performedById?: string;
  performedByName?: string;
  attachmentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SummaryData {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalCount: number;
}

const CATEGORIES = [
  'All Categories',
  'Electricity Bill',
  'Salary',
  'Tuition Fee Collection',
  'Rent',
  'Maintenance & Repairs',
  'Internet & Utilities',
  'Stationery & Supplies',
  'Lab Equipment',
  'Sports & Extracurricular',
  'Transportation & Fuel',
  'Software & IT',
  'Exam Expenses',
  'Event & Celebrations',
  'Food & Refreshment',
  'Medical & First Aid',
  'Printing & Photocopy',
  'Other',
];

const FORM_CATEGORIES = CATEGORIES.filter(c => c !== 'All Categories');

const PAYMENT_METHODS = [
  { value: 'ALL', label: 'All Methods' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CARD', label: 'Credit/Debit Card' },
];

const FORM_PAYMENT_METHODS = PAYMENT_METHODS.filter(m => m.value !== 'ALL');

export default function ExpenseTrackingPage() {
  const { t, language } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode: Table vs Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Summary State
  const [summary, setSummary] = useState<SummaryData>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    totalCount: 0,
  });

  // Filter States
  const [typeFilter, setTypeFilter] = useState<'EXPENSE' | 'INCOME' | 'ALL'>('EXPENSE');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('transactionDate');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');

  // Toggle Filters Visibility
  const [showFilters, setShowFilters] = useState(false);

  // Export dropdown
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewTx, setViewTx] = useState<Transaction | null>(null);

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Success Notification banner
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    type: 'EXPENSE' as 'EXPENSE' | 'INCOME',
    title: '',
    category: 'Electricity Bill',
    amount: '',
    paymentMethod: 'CASH',
    referenceNumber: '',
    transactionDate: new Date().toISOString().slice(0, 16),
    description: '',
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Click outside listener for export dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch transactions from API
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const schoolId = getUserSchoolId();
      const params = new URLSearchParams();

      if (schoolId) params.set('schoolId', schoolId);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (category && category !== 'All Categories') params.set('category', category);
      if (paymentMethod && paymentMethod !== 'ALL') params.set('paymentMethod', paymentMethod);
      if (month) params.set('month', month);
      if (year) params.set('year', year);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (debouncedSearch) params.set('search', debouncedSearch);

      params.set('page', page.toString());
      params.set('limit', limit.toString());
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const url = `${API_BASE_URL}/wallet/transactions?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${getApiToken()}`,
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Failed to load transactions (Status ${res.status})`);
      }

      const json = await res.json();
      const data = json.data;

      if (data) {
        const txList: Transaction[] = Array.isArray(data.transactions)
          ? data.transactions
          : Array.isArray(data)
          ? data
          : [];
        setTransactions(txList);

        if (data.pagination) {
          setTotal(data.pagination.total || txList.length);
          setTotalPages(data.pagination.totalPages || Math.ceil((data.pagination.total || txList.length) / limit) || 1);
        } else {
          setTotal(txList.length);
          setTotalPages(Math.ceil(txList.length / limit) || 1);
        }

        if (data.summary) {
          setSummary(data.summary);
        }
      } else {
        setTransactions([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong fetching transactions');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, category, paymentMethod, month, year, startDate, endDate, debouncedSearch, page, limit, sortBy, sortOrder]);

  // Initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  // Clear banner timeout
  useEffect(() => {
    if (!successBanner) return;
    const timer = setTimeout(() => setSuccessBanner(null), 4000);
    return () => clearTimeout(timer);
  }, [successBanner]);

  // Helpers
  const formatNumber = useCallback((num: number | string) => {
    if (language === 'bn') {
      const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(num).replace(/\d/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
    }
    return String(num);
  }, [language]);

  const formatCurrency = useCallback((amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return language === 'bn' ? '৳০' : '৳0';
    return (
      '৳' +
      new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Math.abs(num))
    );
  }, [language]);

  const formatSingleLineDate = useCallback((dateString?: string) => {
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
  }, [language]);

  const getCategoryLabel = useCallback((cat: string) => {
    switch (cat) {
      case 'All Categories': return t('fees.cat.all');
      case 'Electricity Bill': return t('fees.cat.electricity');
      case 'Salary': return t('fees.cat.salary');
      case 'Tuition Fee Collection': return t('fees.cat.tuitionFee');
      case 'Rent': return t('fees.cat.rent');
      case 'Maintenance & Repairs': return t('fees.cat.maintenance');
      case 'Internet & Utilities': return t('fees.cat.utilities');
      case 'Stationery & Supplies': return t('fees.cat.stationery');
      case 'Lab Equipment': return t('fees.cat.labEquipment');
      case 'Sports & Extracurricular': return t('fees.cat.sports');
      case 'Transportation & Fuel': return t('fees.cat.transportation');
      case 'Software & IT': return t('fees.cat.softwareIt');
      case 'Exam Expenses': return t('fees.cat.examExpenses');
      case 'Event & Celebrations': return t('fees.cat.events');
      case 'Food & Refreshment': return t('fees.cat.food');
      case 'Medical & First Aid': return t('fees.cat.medical');
      case 'Printing & Photocopy': return t('fees.cat.printing');
      case 'Other': return t('fees.cat.other');
      default: return cat;
    }
  }, [t]);

  const getPaymentMethodLabel = useCallback((method: string) => {
    switch (method?.toUpperCase()) {
      case 'ALL': return t('fees.pm.all');
      case 'CASH': return t('fees.pm.cash');
      case 'BANK_TRANSFER': return t('fees.pm.bankTransfer');
      case 'BKASH': return t('fees.pm.bkash');
      case 'NAGAD': return t('fees.pm.nagad');
      case 'CHEQUE': return t('fees.pm.cheque');
      case 'CARD': return t('fees.pm.card');
      default: return method?.replace('_', ' ') || method;
    }
  }, [t]);

  const getMonthName = useCallback((monthNum: string) => {
    const key = `fees.month.${monthNum}`;
    return t(key) || monthNum;
  }, [t]);

  const handleResetFilters = () => {
    setTypeFilter('EXPENSE');
    setCategory('All Categories');
    setPaymentMethod('ALL');
    setMonth('');
    setYear('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setDebouncedSearch('');
    setSortBy('transactionDate');
    setSortOrder('DESC');
    setPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'EXPENSE') count++;
    if (category !== 'All Categories') count++;
    if (paymentMethod !== 'ALL') count++;
    if (startDate) count++;
    if (endDate) count++;
    if (month) count++;
    if (year) count++;
    if (debouncedSearch) count++;
    return count;
  }, [typeFilter, category, paymentMethod, startDate, endDate, month, year, debouncedSearch]);

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      type: 'EXPENSE',
      title: '',
      category: 'Electricity Bill',
      amount: '',
      paymentMethod: 'CASH',
      referenceNumber: '',
      transactionDate: new Date().toISOString().slice(0, 16),
      description: '',
    });
    setSelectedTx(null);
    setFormMode('create');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (tx: Transaction) => {
    setSelectedTx(tx);
    setFormData({
      type: tx.type || 'EXPENSE',
      title: tx.title || '',
      category: tx.category || 'Electricity Bill',
      amount: tx.amount ? tx.amount.toString() : '',
      paymentMethod: tx.paymentMethod || 'CASH',
      referenceNumber: tx.referenceNumber || '',
      transactionDate: tx.transactionDate
        ? new Date(tx.transactionDate).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      description: tx.description || '',
    });
    setFormMode('edit');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Details Modal
  const openDetailsModal = (tx: Transaction) => {
    setViewTx(tx);
    setDetailsModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (tx: Transaction) => {
    setTxToDelete(tx);
    setDeleteModalOpen(true);
  };

  // Form submit (Create or Update)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError(t('fees.titleRequired'));
      return;
    }
    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError(t('fees.amountInvalid'));
      return;
    }

    setFormLoading(true);
    try {
      const schoolId = getUserSchoolId();
      const payload = {
        schoolId,
        type: formData.type,
        title: formData.title.trim(),
        category: formData.category,
        amount: parsedAmount,
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.referenceNumber.trim() || undefined,
        transactionDate: new Date(formData.transactionDate).toISOString(),
        description: formData.description.trim() || undefined,
      };

      const url =
        formMode === 'create'
          ? `${API_BASE_URL}/wallet/transactions`
          : `${API_BASE_URL}/wallet/transactions/${selectedTx?.id}`;

      const res = await fetch(url, {
        method: formMode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getApiToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to save transaction (Status ${res.status})`);
      }

      setIsFormModalOpen(false);
      setSuccessBanner(
        formMode === 'create'
          ? (formData.type === 'EXPENSE'
              ? `${t('fees.successCreatedExpense')} ${formatCurrency(parsedAmount)}.`
              : `${t('fees.successCreatedIncome')} ${formatCurrency(parsedAmount)}.`)
          : t('fees.successUpdated')
      );
      fetchTransactions();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error submitting transaction');
    } finally {
      setFormLoading(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!txToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/wallet/transactions/${txToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getApiToken()}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete (Status ${res.status})`);
      }

      setDeleteModalOpen(false);
      setTxToDelete(null);
      setSuccessBanner(t('fees.successDeleted'));
      fetchTransactions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting transaction');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Export current view to CSV
  const handleExportCSV = () => {
    setExportDropdownOpen(false);
    if (transactions.length === 0) return;

    const headers = [
      t('fees.sl'),
      t('fees.dateTime'),
      t('fees.type'),
      t('fees.titleReference'),
      t('fees.category'),
      `${t('fees.amount')} (BDT)`,
      t('fees.paymentMethod'),
      t('fees.referenceNo'),
      t('fees.handledBy'),
      t('fees.notesDetails'),
    ];
    const rows = transactions.map((tx, idx) => [
      formatNumber((page - 1) * limit + idx + 1),
      `"${formatSingleLineDate(tx.transactionDate)}"`,
      `"${tx.type === 'EXPENSE' ? t('fees.expenses') : t('fees.income')}"`,
      `"${(tx.title || '').replace(/"/g, '""')}"`,
      `"${getCategoryLabel(tx.category || '').replace(/"/g, '""')}"`,
      tx.amount.toString(),
      `"${getPaymentMethodLabel(tx.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(tx.referenceNumber || '').replace(/"/g, '""')}"`,
      `"${(tx.performedByName || 'Admin').replace(/"/g, '""')}"`,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `expense_ledger_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current view to PDF report
  const handleExportPDF = async () => {
    setExportDropdownOpen(false);
    if (transactions.length === 0) return;

    const { jsPDF, autoTable } = await getPdfTools();
    const doc = new jsPDF('landscape');

    doc.setFontSize(16);
    doc.setTextColor(239, 68, 68);
    doc.text(t('fees.export.reportTitle') || 'Expense Tracking & Institutional Ledger Report', 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const subtitleParts = [
      `Page: ${formatNumber(page)} of ${formatNumber(totalPages)}`,
      `Total Entries: ${formatNumber(total)}`,
      `Filter: ${typeFilter === 'EXPENSE' ? t('fees.expenses') : typeFilter === 'INCOME' ? t('fees.income') : t('fees.all')}`,
      `Total Expense: ${formatCurrency(summary.totalExpense)}`,
      `Total Income: ${formatCurrency(summary.totalIncome)}`,
      `Net Cashflow: ${formatCurrency(summary.netBalance)}`,
      `Generated: ${new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    ];
    doc.text(subtitleParts.join(' | '), 14, 25);

    const tableColumn = ['#', 'Date & Time', 'Type', 'Title', 'Category', 'Payment Method', 'Reference', 'Handled By', 'Amount'];
    const tableRows = transactions.map((tx, idx) => [
      formatNumber((page - 1) * limit + idx + 1),
      formatSingleLineDate(tx.transactionDate),
      tx.type === 'EXPENSE' ? t('fees.expenses') : t('fees.income'),
      tx.title || 'Untitled',
      getCategoryLabel(tx.category || 'Other'),
      getPaymentMethodLabel(tx.paymentMethod || 'CASH'),
      tx.referenceNumber || '—',
      tx.performedByName || 'Admin',
      `${tx.type === 'EXPENSE' ? '-' : '+'} ${formatCurrency(tx.amount)}`,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      didDrawPage: data => {
        const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.width - 25,
          doc.internal.pageSize.height - 10
        );
      },
    });

    doc.save(`expense_ledger_page_${page}.pdf`);
  };

  // Download printable voucher PDF for a single transaction
  const handleDownloadVoucher = async (tx: Transaction) => {
    const { jsPDF, autoTable } = await getPdfTools();
    const doc = new jsPDF('portrait');
    const isExpense = tx.type === 'EXPENSE';

    // Header Color Band
    doc.setFillColor(isExpense ? 239 : 22, isExpense ? 68 : 163, isExpense ? 68 : 74);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTITUTIONAL TRANSACTION VOUCHER', 14, 17);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(isExpense ? 'DEBIT / EXPENDITURE RECEIPT' : 'CREDIT / COLLECTION RECEIPT', 14, 23);

    // Detail rows
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10.5);

    const startY = 42;
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction ID:', 14, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(tx.id || 'N/A', 60, startY);

    doc.setFont('helvetica', 'bold');
    doc.text('Date & Time:', 14, startY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(formatSingleLineDate(tx.transactionDate), 60, startY + 10);

    doc.setFont('helvetica', 'bold');
    doc.text('Title / Payee:', 14, startY + 20);
    doc.setFont('helvetica', 'normal');
    doc.text(tx.title || 'Untitled', 60, startY + 20);

    doc.setFont('helvetica', 'bold');
    doc.text('Category:', 14, startY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(tx.category || 'General', 60, startY + 30);

    doc.setFont('helvetica', 'bold');
    doc.text('Payment Method:', 14, startY + 40);
    doc.setFont('helvetica', 'normal');
    doc.text(tx.paymentMethod?.replace('_', ' ') || 'CASH', 60, startY + 40);

    doc.setFont('helvetica', 'bold');
    doc.text('Reference No:', 14, startY + 50);
    doc.setFont('helvetica', 'normal');
    doc.text(tx.referenceNumber || '—', 60, startY + 50);

    doc.setFont('helvetica', 'bold');
    doc.text('Handled By:', 14, startY + 60);
    doc.setFont('helvetica', 'normal');
    doc.text(tx.performedByName || 'Admin Staff', 60, startY + 60);

    if (tx.description) {
      doc.setFont('helvetica', 'bold');
      doc.text('Remarks / Notes:', 14, startY + 70);
      doc.setFont('helvetica', 'normal');
      doc.text(tx.description, 60, startY + 70, { maxWidth: 135 });
    }

    // Amount Banner
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, startY + 90, 182, 30, 4, 4, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('TOTAL AMOUNT:', 25, startY + 108);

    doc.setFontSize(18);
    doc.setTextColor(isExpense ? 220 : 22, isExpense ? 38 : 163, isExpense ? 38 : 74);
    doc.text(`${isExpense ? '-' : '+'} ${formatCurrency(tx.amount)}`, 130, startY + 109);

    // Signatures
    const sigY = startY + 155;
    doc.setDrawColor(180, 180, 180);
    doc.line(20, sigY, 75, sigY);
    doc.line(135, sigY, 190, sigY);

    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Authorized Signature', 26, sigY + 6);
    doc.text('Received / Verified By', 140, sigY + 6);

    doc.save(`voucher_${tx.referenceNumber || tx.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* ── Top Metric Summary Cards (Directly at top without duplicate page header) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* Total Expenses Card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingDown size={26} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.totalExpense')}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ef4444', lineHeight: 1.15, marginTop: '0.15rem' }}>
              {formatCurrency(summary.totalExpense)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t('fees.recordedPayouts')}
            </div>
          </div>
        </div>

        {/* Total Collections / Income Card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={26} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.totalIncome')}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.15, marginTop: '0.15rem' }}>
              {formatCurrency(summary.totalIncome)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t('fees.tuitionAdmissions')}
            </div>
          </div>
        </div>

        {/* Net Cashflow / Balance Card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: summary.netBalance >= 0 ? '#eff6ff' : '#fff7ed', color: summary.netBalance >= 0 ? '#2563eb' : '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wallet size={26} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.netBalance')}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: summary.netBalance >= 0 ? '#2563eb' : '#ea580c', lineHeight: 1.15, marginTop: '0.15rem' }}>
              {summary.netBalance >= 0 ? '+' : '-'} {formatCurrency(summary.netBalance)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {summary.netBalance >= 0 ? t('fees.positiveReserve') : t('fees.deficitAlert')}
            </div>
          </div>
        </div>

        {/* Total Transactions Count Card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.15rem', padding: '1.35rem', display: 'flex', alignItems: 'center', gap: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(79, 70, 229, 0.08)', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Receipt size={26} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.totalRecords')}</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.15, marginTop: '0.15rem' }}>
              {formatNumber(summary.totalCount || total)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t('fees.recordedEntries')}
            </div>
          </div>
        </div>

      </div>

      {/* Success Banner */}
      {successBanner && (
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
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Main Data Wrapper (Similar style to Students Page) ── */}
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
                  placeholder={t('fees.searchPlaceholder')} 
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
                    onClick={() => { setSearchTerm(''); setDebouncedSearch(''); }}
                    style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Toolbar Action Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              
              {/* Type Switcher Segmented Pills */}
              <div style={{ display: 'flex', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3px', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => { setTypeFilter('EXPENSE'); setPage(1); }}
                  style={{
                    padding: '0 0.75rem',
                    height: '34px',
                    borderRadius: '0.55rem',
                    border: 'none',
                    background: typeFilter === 'EXPENSE' ? '#ef4444' : 'transparent',
                    color: typeFilter === 'EXPENSE' ? '#ffffff' : 'var(--muted-foreground)',
                    fontSize: '0.82rem',
                    fontWeight: typeFilter === 'EXPENSE' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s'
                  }}
                >
                  <TrendingDown size={14} /> {t('fees.expenses')}
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeFilter('ALL'); setPage(1); }}
                  style={{
                    padding: '0 0.75rem',
                    height: '34px',
                    borderRadius: '0.55rem',
                    border: 'none',
                    background: typeFilter === 'ALL' ? '#4f46e5' : 'transparent',
                    color: typeFilter === 'ALL' ? '#ffffff' : 'var(--muted-foreground)',
                    fontSize: '0.82rem',
                    fontWeight: typeFilter === 'ALL' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s'
                  }}
                >
                  <FileText size={14} /> {t('fees.all')}
                </button>
                <button
                  type="button"
                  onClick={() => { setTypeFilter('INCOME'); setPage(1); }}
                  style={{
                    padding: '0 0.75rem',
                    height: '34px',
                    borderRadius: '0.55rem',
                    border: 'none',
                    background: typeFilter === 'INCOME' ? '#16a34a' : 'transparent',
                    color: typeFilter === 'INCOME' ? '#ffffff' : 'var(--muted-foreground)',
                    fontSize: '0.82rem',
                    fontWeight: typeFilter === 'INCOME' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s'
                  }}
                >
                  <TrendingUp size={14} /> {t('fees.income')}
                </button>
              </div>

              {/* Filters Toggle Button */}
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
                <span>{t('fees.filters')}</span>
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

              {/* View Mode Toggle (Table / Cards) */}
              <div style={{ display: 'flex', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3px' }}>
                <button
                  type="button"
                  title={t('fees.tableView')}
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
                  title={t('fees.cardsView')}
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

              {/* Export Dropdown */}
              <div ref={exportRef} style={{ position: 'relative' }}>
                <button 
                  type="button"
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  disabled={transactions.length === 0}
                  title={t('fees.export')}
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
                    opacity: transactions.length === 0 ? 0.6 : 1,
                    cursor: transactions.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Download size={15} />
                  <span>{t('fees.export')}</span>
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
                      <span>{t('fees.exportCsv')}</span>
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
                      <span>{t('fees.exportPdf')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Rows Per Page Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid var(--border)', borderRadius: '0.75rem', height: '42px', padding: '0 0.75rem', background: 'var(--background)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{t('fees.show')}</span>
                <select 
                  value={limit} 
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: 'var(--foreground)', cursor: 'pointer', fontWeight: 600 }}
                >
                  <option value={10}>{formatNumber(10)}</option>
                  <option value={20}>{formatNumber(20)}</option>
                  <option value={50}>{formatNumber(50)}</option>
                  <option value={100}>{formatNumber(100)}</option>
                </select>
              </div>

              {/* Primary Action Button: Record Expense / Add Transaction */}
              <button 
                type="button"
                onClick={openCreateModal}
                style={{ 
                  height: '42px',
                  padding: '0 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.35)',
                  cursor: 'pointer'
                }}
              >
                <Plus size={17} />
                <span>{t('fees.recordExpense')}</span>
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => fetchTransactions()}
                title={t('fees.refreshLedger')}
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

          {/* ── Advanced Filter Drawer ────────────────────────────── */}
          {showFilters && (
            <div
              style={{
                marginTop: '0.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                alignItems: 'flex-end'
              }}
            >
              {/* Category */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('fees.category')}
                </label>
                <select
                  value={category}
                  onChange={e => { setCategory(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{getCategoryLabel(c)}</option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('fees.paymentMethod')}
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => { setPaymentMethod(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{getPaymentMethodLabel(m.value)}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('fees.startDate')}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                />
              </div>

              {/* End Date */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('fees.endDate')}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                />
              </div>

              {/* Specific Month */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('fees.specificMonth')}
                </label>
                <select
                  value={month}
                  onChange={e => { setMonth(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                >
                  <option value="">{t('common.allMonths') || 'All Months'}</option>
                  {[
                    '1', '2', '3', '4', '5', '6',
                    '7', '8', '9', '10', '11', '12'
                  ].map(m => (
                    <option key={m} value={m}>{getMonthName(m)}</option>
                  ))}
                </select>
              </div>

              {/* Sort By & Order */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.35rem' }}>
                  {t('fees.sortOrder')}
                </label>
                <select
                  value={`${sortBy}:${sortOrder}`}
                  onChange={e => {
                    const [by, order] = e.target.value.split(':');
                    setSortBy(by);
                    setSortOrder(order as 'DESC' | 'ASC');
                    setPage(1);
                  }}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', borderRadius: '0.55rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.85rem' }}
                >
                  <option value="transactionDate:DESC">{t('fees.sortNewest')}</option>
                  <option value="transactionDate:ASC">{t('fees.sortOldest')}</option>
                  <option value="amount:DESC">{t('fees.sortAmountHighest')}</option>
                  <option value="amount:ASC">{t('fees.sortAmountLowest')}</option>
                </select>
              </div>

              {/* Reset Filter button */}
              <div style={{ display: 'flex' }}>
                <button
                  type="button"
                  onClick={handleResetFilters}
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
                  {t('fees.resetFilters')}
                </button>
              </div>

            </div>
          )}

          {/* ── Active Filter Badges ────────────────────────────── */}
          {activeFiltersCount > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', paddingTop: '0.25rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.activeFilters')}</span>
              
              {debouncedSearch && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#eff6ff', color: '#2563eb', borderRadius: '99px', fontSize: '0.76rem', fontWeight: 600 }}>
                  {t('fees.filters')}: &ldquo;{debouncedSearch}&rdquo;
                  <button onClick={() => { setSearchTerm(''); setDebouncedSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#2563eb', display: 'flex' }}><X size={12} /></button>
                </span>
              )}

              {category !== 'All Categories' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#fef2f2', color: '#dc2626', borderRadius: '99px', fontSize: '0.76rem', fontWeight: 600 }}>
                  {t('fees.category')}: {getCategoryLabel(category)}
                  <button onClick={() => setCategory('All Categories')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#dc2626', display: 'flex' }}><X size={12} /></button>
                </span>
              )}

              {paymentMethod !== 'ALL' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '99px', fontSize: '0.76rem', fontWeight: 600 }}>
                  {t('fees.paymentMethod')}: {getPaymentMethodLabel(paymentMethod)}
                  <button onClick={() => setPaymentMethod('ALL')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#16a34a', display: 'flex' }}><X size={12} /></button>
                </span>
              )}

              {(startDate || endDate) && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#fff7ed', color: '#ea580c', borderRadius: '99px', fontSize: '0.76rem', fontWeight: 600 }}>
                  {startDate || t('fees.startDate')} {t('fees.to')} {endDate || t('fees.endDate')}
                  <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#ea580c', display: 'flex' }}><X size={12} /></button>
                </span>
              )}

              {month && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#eef2ff', color: '#4f46e5', borderRadius: '99px', fontSize: '0.76rem', fontWeight: 600 }}>
                  {t('fees.specificMonth')}: {getMonthName(month)}
                  <button onClick={() => setMonth('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#4f46e5', display: 'flex' }}><X size={12} /></button>
                </span>
              )}

              {year && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.65rem', background: '#f1f5f9', color: '#475569', borderRadius: '99px', fontSize: '0.76rem', fontWeight: 600 }}>
                  {formatNumber(year)}
                  <button onClick={() => setYear('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#475569', display: 'flex' }}><X size={12} /></button>
                </span>
              )}

              <button
                onClick={handleResetFilters}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: '0 0.25rem' }}
              >
                {t('fees.clearAll')}
              </button>
            </div>
          )}

        </div>

        {/* ── Table / Grid Content ───────────────────────────────── */}
        {loading ? (
          <div style={{ padding: '2.5rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '1.25rem', padding: '1rem 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                <div style={{ width: '130px', height: '18px', background: 'var(--muted)', borderRadius: '6px', opacity: 0.6 }} />
                <div style={{ width: '220px', height: '18px', background: 'var(--muted)', borderRadius: '6px', opacity: 0.6 }} />
                <div style={{ width: '120px', height: '18px', background: 'var(--muted)', borderRadius: '6px', opacity: 0.6 }} />
                <div style={{ width: '90px', height: '18px', background: 'var(--muted)', borderRadius: '6px', opacity: 0.6 }} />
                <div style={{ width: '100px', height: '18px', background: 'var(--muted)', borderRadius: '6px', opacity: 0.6, marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <AlertCircle size={34} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>{t('fees.failedToLoad')}</h3>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '0.4rem', fontSize: '0.9rem', maxWidth: '450px' }}>{error}</p>
            <button
              onClick={() => fetchTransactions()}
              style={{ marginTop: '1.25rem', padding: '0.65rem 1.4rem', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={15} /> {t('fees.tryAgain')}
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6.5rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', opacity: 0.7 }}>
              <Receipt size={36} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>{t('fees.noTransactions')}</h3>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '0.4rem', fontSize: '0.9rem', maxWidth: '420px' }}>
              {t('fees.noMatchingDesc')}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={handleResetFilters}
                style={{ padding: '0.65rem 1.25rem', background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer' }}
              >
                {t('fees.resetFilters')}
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                style={{ padding: '0.65rem 1.25rem', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={16} /> {t('fees.recordExpense')}
              </button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* ── Table View ────────────────────────────────────────── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1.25rem', width: '50px' }}>{t('fees.sl')}</th>
                  <th style={{ padding: '0.9rem 1.25rem', whiteSpace: 'nowrap' }}>{t('fees.dateTime')}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{t('fees.titleReference')}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{t('fees.category')}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{t('fees.paymentMethod')}</th>
                  <th style={{ padding: '0.9rem 1rem' }}>{t('fees.handledBy')}</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>{t('fees.amount')}</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', width: '120px' }}>{t('fees.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => {
                  const isExpense = tx.type === 'EXPENSE';

                  return (
                    <tr
                      key={tx.id}
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
                          <span style={{ whiteSpace: 'nowrap' }}>{formatSingleLineDate(tx.transactionDate)}</span>
                        </div>
                      </td>

                      {/* Title & Payee */}
                      <td style={{ padding: '1rem 1rem', minWidth: '180px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>
                          {tx.title || t('fees.untitled')}
                        </div>
                        {tx.description && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', marginTop: '0.15rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.description}
                          </div>
                        )}
                        {tx.referenceNumber && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                            Ref: {tx.referenceNumber}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '1rem 1rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '99px',
                            background: isExpense ? '#fef2f2' : '#f0fdf4',
                            color: isExpense ? '#dc2626' : '#16a34a',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {getCategoryLabel(tx.category || 'Other')}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td style={{ padding: '1rem 1rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.78rem',
                            color: 'var(--foreground)',
                            fontWeight: 600,
                            background: 'var(--background)',
                            border: '1px solid var(--border)',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <CreditCard size={12} style={{ color: 'var(--muted-foreground)' }} />
                          {getPaymentMethodLabel(tx.paymentMethod || 'CASH')}
                        </span>
                      </td>

                      {/* Handled By */}
                      <td style={{ padding: '1rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {tx.performedByName || 'Admin'}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '1rem',
                            fontWeight: 800,
                            color: isExpense ? '#ef4444' : '#16a34a',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span>{isExpense ? '-' : '+'}</span>
                          <span>{formatCurrency(tx.amount)}</span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {tx.type === 'EXPENSE' ? t('fees.expenses') : t('fees.income')}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {/* View Voucher / Details */}
                          <button
                            type="button"
                            title={t('fees.viewVoucher')}
                            onClick={() => openDetailsModal(tx)}
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

                          {/* Edit */}
                          <button
                            type="button"
                            title={t('fees.editTransaction')}
                            onClick={() => openEditModal(tx)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--background)',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--background)')}
                          >
                            <Edit3 size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            title={t('fees.deleteTransaction')}
                            onClick={() => openDeleteModal(tx)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--background)',
                              color: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--background)')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Cards / Grid View ──────────────────────────────────── */
          <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {transactions.map(tx => {
              const isExpense = tx.type === 'EXPENSE';

              return (
                <div
                  key={tx.id}
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
                  {/* Top card row: Category & Type badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '99px',
                        background: isExpense ? '#fef2f2' : '#f0fdf4',
                        color: isExpense ? '#dc2626' : '#16a34a',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                      }}
                    >
                      {getCategoryLabel(tx.category || 'Other')}
                    </span>
                    <span
                      style={{
                        padding: '0.15rem 0.55rem',
                        borderRadius: '6px',
                        background: 'var(--muted)',
                        color: 'var(--muted-foreground)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {tx.type === 'EXPENSE' ? t('fees.expenses') : t('fees.income')}
                    </span>
                  </div>

                  {/* Amount Callout */}
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isExpense ? '#ef4444' : '#16a34a', lineHeight: 1.15 }}>
                      {isExpense ? '-' : '+'} {formatCurrency(tx.amount)}
                    </div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--foreground)', marginTop: '0.35rem' }}>
                      {tx.title || t('fees.untitled')}
                    </div>
                    {tx.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: '0.25rem 0 0', lineHeight: 1.4 }}>
                        {tx.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Row: Date & Reference */}
                  <div style={{ paddingTop: '0.65rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                      <Calendar size={13} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap' }}>{formatSingleLineDate(tx.transactionDate)}</span>
                    </div>
                    {tx.referenceNumber && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'monospace' }}>
                        <Tag size={13} style={{ flexShrink: 0 }} />
                        <span>Ref: {tx.referenceNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer: Payment method & Action buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px'
                      }}
                    >
                      <CreditCard size={11} style={{ color: 'var(--muted-foreground)' }} />
                      {getPaymentMethodLabel(tx.paymentMethod || 'CASH')}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        title={t('fees.viewVoucher')}
                        onClick={() => openDetailsModal(tx)}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '0.45rem',
                          border: '1px solid var(--border)',
                          background: 'var(--background)',
                          color: 'var(--foreground)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        title={t('fees.editTransaction')}
                        onClick={() => openEditModal(tx)}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '0.45rem',
                          border: '1px solid var(--border)',
                          background: 'var(--background)',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        title={t('fees.deleteTransaction')}
                        onClick={() => openDeleteModal(tx)}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '0.45rem',
                          border: '1px solid var(--border)',
                          background: 'var(--background)',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* ── Table Footer & Pagination ─────────────────────────── */}
        {!loading && transactions.length > 0 && (
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
              {t('fees.showing')} <strong>{formatNumber(transactions.length)}</strong> {t('fees.of')} <strong>{formatNumber(total)}</strong> {t('fees.transactionsCount')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', marginRight: '0.5rem' }}>
                {t('fees.page')} {formatNumber(page)} {t('fees.of')} {formatNumber(totalPages || 1)}
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

      {/* ── Modal: Record / Edit Transaction ─────────────────────── */}
      {isFormModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
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
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: formData.type === 'EXPENSE' ? '#fef2f2' : '#f0fdf4', color: formData.type === 'EXPENSE' ? '#ef4444' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {formData.type === 'EXPENSE' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                    {formMode === 'create' ? (formData.type === 'EXPENSE' ? t('fees.modalCreateExpenseTitle') : t('fees.modalCreateIncomeTitle')) : t('fees.modalEditTitle')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
                    {formMode === 'create' ? t('fees.modalCreateDesc') : t('fees.modalEditDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleFormSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              
              {formError && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '0.65rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Type Toggle (Expense vs Income) */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.4rem' }}>
                  {t('fees.transactionType')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'EXPENSE', category: 'Electricity Bill' })}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '0.65rem',
                      border: formData.type === 'EXPENSE' ? '2px solid #ef4444' : '1px solid var(--border)',
                      background: formData.type === 'EXPENSE' ? 'rgba(239, 68, 68, 0.08)' : 'var(--background)',
                      color: formData.type === 'EXPENSE' ? '#ef4444' : 'var(--muted-foreground)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem'
                    }}
                  >
                    <TrendingDown size={16} /> {t('fees.expenseDebit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'INCOME', category: 'Tuition Fee Collection' })}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '0.65rem',
                      border: formData.type === 'INCOME' ? '2px solid #16a34a' : '1px solid var(--border)',
                      background: formData.type === 'INCOME' ? 'rgba(22, 163, 74, 0.08)' : 'var(--background)',
                      color: formData.type === 'INCOME' ? '#16a34a' : 'var(--muted-foreground)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem'
                    }}
                  >
                    <TrendingUp size={16} /> {t('fees.incomeCredit')}
                  </button>
                </div>
              </div>

              {/* Title / Payee */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.4rem' }}>
                  {t('fees.titlePayee')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder={t('fees.titlePayeePlaceholder')}
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none' }}
                  required
                />
              </div>

              {/* Amount & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.4rem' }}>
                    {t('fees.amount')} (৳) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none', fontWeight: 700 }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.4rem' }}>
                    {t('fees.category')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none' }}
                  >
                    {FORM_CATEGORIES.map(c => (
                      <option key={c} value={c}>{getCategoryLabel(c)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method & Reference Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.4rem' }}>
                    {t('fees.paymentMethod')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none' }}
                  >
                    {FORM_PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{getPaymentMethodLabel(m.value)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.4rem' }}>
                    {t('fees.referenceVoucher')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('fees.referencePlaceholder')}
                    value={formData.referenceNumber}
                    onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Transaction Date */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.4rem' }}>
                  {t('fees.transactionDateTime')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.transactionDate}
                  onChange={e => setFormData({ ...formData, transactionDate: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none' }}
                  required
                />
              </div>

              {/* Description / Notes */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '0.4rem' }}>
                  {t('fees.notesDetails')}
                </label>
                <textarea
                  rows={3}
                  placeholder={t('fees.notesPlaceholder')}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.88rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={formLoading}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {t('fees.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '0.65rem',
                    border: 'none',
                    background: formData.type === 'EXPENSE' ? '#ef4444' : '#16a34a',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: formLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  {formLoading && <RefreshCw size={14} className="animate-spin" />}
                  <span>{formMode === 'create' ? t('fees.saveTransaction') : t('fees.updateRecord')}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Transaction Voucher & Details ─────────────────── */}
      {detailsModalOpen && viewTx && (
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
            {/* Header Banner */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: viewTx.type === 'EXPENSE' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9, fontWeight: 700 }}>
                  {t('fees.ledgerVoucher')} &bull; {viewTx.type === 'EXPENSE' ? t('fees.expenses') : t('fees.income')}
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.15rem 0 0' }}>
                  {viewTx.type === 'EXPENSE' ? '-' : '+'} {formatCurrency(viewTx.amount)}
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

            {/* Voucher Body Details */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.titlePayee')}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--foreground)', marginTop: '0.15rem' }}>
                  {viewTx.title || t('fees.untitled')}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0.85rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.category')}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--foreground)', marginTop: '0.15rem' }}>
                    {getCategoryLabel(viewTx.category || 'Other')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.paymentMethod')}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--foreground)', marginTop: '0.15rem' }}>
                    {getPaymentMethodLabel(viewTx.paymentMethod || 'CASH')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.referenceNo')}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--foreground)', marginTop: '0.15rem' }}>
                    {viewTx.referenceNumber || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.recordedBy')}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--foreground)', marginTop: '0.15rem' }}>
                    {viewTx.performedByName || 'Admin Staff'}
                  </div>
                </div>
              </div>

              {/* Date */}
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.transactionDate')}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                  <Calendar size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>{formatSingleLineDate(viewTx.transactionDate)}</span>
                </div>
              </div>

              {/* Notes */}
              {viewTx.description && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{t('fees.remarksNotes')}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--foreground)', marginTop: '0.2rem', padding: '0.65rem 0.85rem', background: 'var(--muted)', borderRadius: '0.5rem', lineHeight: 1.4 }}>
                    {viewTx.description}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => handleDownloadVoucher(viewTx)}
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
                  <Printer size={15} />
                  <span>{t('fees.downloadVoucher')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailsModalOpen(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '0.65rem', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer' }}
                >
                  {t('fees.close')}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirmation ───────────────────────────── */}
      {deleteModalOpen && txToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
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
              maxWidth: '440px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              textAlign: 'center'
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
              {t('fees.deletePrompt')}
            </h3>

            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.88rem', margin: '0.5rem 0 1.25rem', lineHeight: 1.45 }}>
              {t('fees.deleteConfirmPrefix')} <strong>&ldquo;{txToDelete.title || t('fees.untitled')}&rdquo;</strong> {t('fees.deleteConfirmOf')}{' '}
              <strong style={{ color: txToDelete.type === 'EXPENSE' ? '#ef4444' : '#16a34a' }}>
                {formatCurrency(txToDelete.amount)}
              </strong>
              {t('fees.deleteConfirmSuffix')}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setTxToDelete(null); }}
                disabled={deleteLoading}
                style={{ padding: '0.65rem 1.25rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                {t('fees.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                style={{ padding: '0.65rem 1.4rem', borderRadius: '0.65rem', border: 'none', background: '#ef4444', color: '#ffffff', fontWeight: 700, fontSize: '0.88rem', cursor: deleteLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {deleteLoading && <RefreshCw size={14} className="animate-spin" />}
                <span>{t('fees.deleteEntry')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
