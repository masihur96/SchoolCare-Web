"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  Search, Plus, Edit3, Trash2, Layers, BookOpen, Loader2, Eye, X,
  UserPlus, UserCog, Users, Download, ChevronDown, ChevronLeft, ChevronRight,
  RefreshCw, FileSpreadsheet, FileText, Filter, Check, GraduationCap
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

interface ClassEntity {
  id: string;
  name: string;
  schoolId: string;
  description?: string;
}

interface SectionEntity {
  id: string;
  name: string;
  classId: string;
}

interface SubjectEntity {
  id: string;
  name: string;
  classId: string;
  code?: string;
}

interface SchoolEntity {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  schoolId?: string;
}

interface ProcessedClass {
  id: string;
  name: string;
  description: string;
  sections: SectionEntity[];
  subjects: SubjectEntity[];
  students: number;
}

export default function ClassesPage() {
  const { t } = useLanguage();
  const [classesData, setClassesData] = useState<ProcessedClass[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolEntity | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [assignActionLoading, setAssignActionLoading] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterSectionStatus, setFilterSectionStatus] = useState<'all' | 'with-sections' | 'without-sections'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'students-desc' | 'sections-desc'>('name-asc');
  const [showFilters, setShowFilters] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals state for Classes
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Partial<ClassEntity> | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingClass, setViewingClass] = useState<ProcessedClass | null>(null);

  // Modals state for creating entities
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', description: '' });

  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [newSection, setNewSection] = useState({ name: '', classId: '' });

  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', code: '', classId: '' });

  // Modals state for editing/deleting Sections and Subjects
  const [isEditSectionModalOpen, setIsEditSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Partial<SectionEntity> | null>(null);
  const [isDeleteSectionModalOpen, setIsDeleteSectionModalOpen] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);

  const [isEditSubjectModalOpen, setIsEditSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Partial<SubjectEntity> | null>(null);
  const [isDeleteSubjectModalOpen, setIsDeleteSubjectModalOpen] = useState(false);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);

  // Modals state for Assign User
  const [isAssignUserModalOpen, setIsAssignUserModalOpen] = useState(false);
  const [assignUserForm, setAssignUserForm] = useState({ userId: '', rollNumber: '', classId: '', sectionId: '' });

  const [isAssignTeacherModalOpen, setIsAssignTeacherModalOpen] = useState(false);
  const [assignTeacherForm, setAssignTeacherForm] = useState({ userId: '', classId: '', sectionId: '' });

  // Decode user school ID from token
  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(getApiToken().split('.')[1]));
      return payload.schoolId;
    } catch (e) {
      return null;
    }
  };
  const userSchoolId = getUserSchoolId();

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.class-export-dd')) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportDropdownOpen]);

  const fetchData = useCallback(async () => {
    if (!userSchoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const headers = {
        accept: '*/*',
        Authorization: `Bearer ${getApiToken()}`,
      };

      const [classesRes, sectionsRes, subjectsRes, schoolsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/classes`, { headers }),
        fetch(`${API_BASE_URL}/admin/sections?schoolId=${userSchoolId}`, { headers }),
        fetch(`${API_BASE_URL}/admin/subjects`, { headers }),
        fetch(`${API_BASE_URL}/admin/schools`, { headers }),
      ]);

      const classesJson = await classesRes.json();
      const sectionsJson = await sectionsRes.json();
      const subjectsJson = await subjectsRes.json();
      const schoolsJson = await schoolsRes.json();

      const classes: ClassEntity[] = Array.isArray(classesJson) ? classesJson : classesJson.data || [];
      const sections: SectionEntity[] = Array.isArray(sectionsJson) ? sectionsJson : sectionsJson.data || [];
      const subjects: SubjectEntity[] = Array.isArray(subjectsJson) ? subjectsJson : subjectsJson.data || [];
      const schools: SchoolEntity[] = Array.isArray(schoolsJson) ? schoolsJson : schoolsJson.data || [];

      const mappedClasses: ProcessedClass[] = classes
        .filter((cls) => cls.schoolId === userSchoolId)
        .map((cls) => {
          const clsSections = sections.filter((sec) => sec.classId === cls.id);
          const uniqueSections = Array.from(new Map(clsSections.map((item) => [item.id, item])).values());
          const clsSubjects = subjects.filter((sub) => sub.classId === cls.id);

          return {
            id: cls.id,
            name: cls.name,
            description: cls.description || '',
            sections: uniqueSections,
            subjects: clsSubjects,
            students: 0,
          };
        });

      mappedClasses.sort((a, b) => a.name.localeCompare(b.name));
      setClassesData(mappedClasses);

      const school = schools.find((s) => s.schoolId === userSchoolId || s.id === userSchoolId);
      if (school) setSchoolInfo(school);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [userSchoolId]);

  const fetchStudentsList = useCallback(async () => {
    if (!userSchoolId) return;
    try {
      const headers = { accept: '*/*', Authorization: `Bearer ${getApiToken()}` };
      const [resS, resT] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/users?role=student&limit=1000&schoolId=${userSchoolId}`, { headers }),
        fetch(`${API_BASE_URL}/admin/users?role=teacher&limit=1000&schoolId=${userSchoolId}`, { headers }),
      ]);
      const jsonS = await resS.json();
      const jsonT = await resT.json();

      if (jsonS.statusCode === 200 || jsonS.data) {
        setStudentsList(jsonS.data?.data || jsonS.data || []);
      }
      if (jsonT.statusCode === 200 || jsonT.data) {
        setTeachersList(jsonT.data?.data || jsonT.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [userSchoolId]);

  useEffect(() => {
    fetchData();
    fetchStudentsList();
  }, [fetchData, fetchStudentsList]);

  // Keep viewing class updated
  useEffect(() => {
    if (viewingClass && isViewModalOpen) {
      const updatedClass = classesData.find((c) => c.id === viewingClass.id);
      if (updatedClass) {
        setViewingClass(updatedClass);
      } else {
        setIsViewModalOpen(false);
      }
    }
  }, [classesData, isViewModalOpen, viewingClass]);

  // Filtered & Sorted Classes
  const filteredAndSortedClasses = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    let result = classesData
      .map((c) => {
        const studentCount = studentsList.filter((st) => st.classes?.some((cls: any) => cls.id === c.id)).length;
        return { ...c, students: studentCount };
      })
      .filter((c) => {
        const matchesSearch =
          !term ||
          c.name.toLowerCase().includes(term) ||
          c.description.toLowerCase().includes(term) ||
          c.sections.some((s) => s.name.toLowerCase().includes(term)) ||
          c.subjects.some((sub) => sub.name.toLowerCase().includes(term));

        if (!matchesSearch) return false;

        if (filterSectionStatus === 'with-sections') return c.sections.length > 0;
        if (filterSectionStatus === 'without-sections') return c.sections.length === 0;

        return true;
      });

    result.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name, undefined, { numeric: true });
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name, undefined, { numeric: true });
      if (sortBy === 'students-desc') return b.students - a.students;
      if (sortBy === 'sections-desc') return b.sections.length - a.sections.length;
      return 0;
    });

    return result;
  }, [classesData, studentsList, debouncedSearch, filterSectionStatus, sortBy]);

  const total = filteredAndSortedClasses.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedClasses = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredAndSortedClasses.slice(start, start + limit);
  }, [filteredAndSortedClasses, page, limit]);

  const activeFiltersCount =
    (debouncedSearch ? 1 : 0) +
    (filterSectionStatus !== 'all' ? 1 : 0) +
    (sortBy !== 'name-asc' ? 1 : 0);

  const resetAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setFilterSectionStatus('all');
    setSortBy('name-asc');
    setPage(1);
  };

  // Metrics summary
  const summaryMetrics = useMemo(() => {
    const totalClassesCount = classesData.length;
    const totalSectionsCount = classesData.reduce((acc, c) => acc + (c.sections?.length || 0), 0);
    const totalSubjectsCount = classesData.reduce((acc, c) => acc + (c.subjects?.length || 0), 0);
    const assignedStudentsCount = studentsList.filter((st) => st.classes && st.classes.length > 0).length;
    return {
      totalClasses: totalClassesCount,
      totalSections: totalSectionsCount,
      totalSubjects: totalSubjectsCount,
      totalStudents: assignedStudentsCount,
    };
  }, [classesData, studentsList]);

  // Export CSV
  const handleExportCSV = () => {
    setExportDropdownOpen(false);
    if (filteredAndSortedClasses.length === 0) return;
    const headers = ['#', t('classes.className'), t('classes.descriptionLabel'), t('classes.totalSections'), t('classes.totalSubjects'), t('classes.assignedStudents')];
    const rows = filteredAndSortedClasses.map((c, i) => [
      (i + 1).toString(),
      `"${c.name.replace(/"/g, '""')}"`,
      `"${(c.description || '').replace(/"/g, '""')}"`,
      `"${c.sections.map((s) => s.name).join(', ')}"`,
      c.subjects.length.toString(),
      c.students.toString(),
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'classes_and_sections.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF
  const handleExportPDF = () => {
    setExportDropdownOpen(false);
    if (filteredAndSortedClasses.length === 0) return;
    const doc = new jsPDF('landscape');
    const schoolName = schoolInfo?.name || 'Smart School Management System';
    const schoolAddress = schoolInfo?.address || '';
    const schoolContact = [schoolInfo?.phone, schoolInfo?.email].filter(Boolean).join(' | ');

    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(schoolName, 14, 18);

    let y = 26;
    if (schoolAddress || schoolContact) {
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      if (schoolAddress) {
        doc.text(schoolAddress, 14, y);
        y += 5;
      }
      if (schoolContact) {
        doc.text(schoolContact, 14, y);
        y += 5;
      }
      y += 2;
    }

    doc.setFontSize(15);
    doc.setTextColor(50, 50, 50);
    doc.text(t('classes.curriculumReportTitle'), 14, y);
    y += 7;

    autoTable(doc, {
      head: [['#', t('classes.className'), t('classes.descriptionLabel'), t('classes.totalSections'), t('classes.totalSubjects'), t('classes.assignedStudents')]],
      body: filteredAndSortedClasses.map((c, i) => [
        (i + 1).toString(),
        c.name,
        c.description || '—',
        c.sections.map((s) => s.name).join(', ') || t('students.none'),
        `${c.subjects.length} ${c.subjects.length === 1 ? t('classes.subjectSingle') : t('classes.subjectPlural')}`,
        c.students.toString(),
      ]),
      startY: y,
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      didDrawPage: (data) => {
        const pages = (doc.internal as any).getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`${t('students.page')} ${data.pageNumber} ${t('students.of')} ${pages}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);
      },
    });
    doc.save('classes_and_curriculum.pdf');
  };

  // Handlers for Classes
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/classes`, {
        method: 'POST',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newClass, schoolId: userSchoolId }),
      });
      if (response.ok) {
        setIsAddClassModalOpen(false);
        setNewClass({ name: '', description: '' });
        fetchData();
      } else {
        alert(t('classes.failedToAddClass'));
      }
    } catch (err) {
      alert(t('classes.errorAddingClass'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editingClass.id) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/classes/${editingClass.id}`, {
        method: 'PUT',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingClass.name, description: editingClass.description }),
      });
      if (response.ok) {
        setIsEditModalOpen(false);
        fetchData();
      } else {
        alert(t('classes.failedToUpdateClass'));
      }
    } catch (err) {
      alert(t('classes.errorUpdatingClass'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingClassId) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/classes/${deletingClassId}`, {
        method: 'DELETE',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
      });
      if (response.ok) {
        setIsDeleteModalOpen(false);
        fetchData();
      } else {
        alert(t('classes.failedToDeleteClass'));
      }
    } catch (err) {
      alert(t('classes.errorDeletingClass'));
    } finally {
      setActionLoading(false);
    }
  };

  // Section Handlers
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sections`, {
        method: 'POST',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSection, schoolId: userSchoolId }),
      });
      if (response.ok) {
        setIsAddSectionModalOpen(false);
        setNewSection({ name: '', classId: '' });
        fetchData();
      } else {
        alert(t('classes.failedToAddSection'));
      }
    } catch (err) {
      alert(t('classes.errorAddingSection'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection || !editingSection.id) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sections/${editingSection.id}`, {
        method: 'PUT',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSection.name, classId: editingSection.classId }),
      });
      if (response.ok) {
        setIsEditSectionModalOpen(false);
        fetchData();
      } else {
        alert(t('classes.failedToUpdateSection'));
      }
    } catch (err) {
      alert(t('classes.errorUpdatingSection'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSectionConfirm = async () => {
    if (!deletingSectionId) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sections/${deletingSectionId}`, {
        method: 'DELETE',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
      });
      if (response.ok) {
        setIsDeleteSectionModalOpen(false);
        fetchData();
      } else {
        alert(t('classes.failedToDeleteSection'));
      }
    } catch (err) {
      alert(t('classes.errorDeletingSection'));
    } finally {
      setActionLoading(false);
    }
  };

  // Subject Handlers
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/subjects`, {
        method: 'POST',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSubject, schoolId: userSchoolId }),
      });
      if (response.ok) {
        setIsAddSubjectModalOpen(false);
        setNewSubject({ name: '', code: '', classId: '' });
        fetchData();
      } else {
        alert(t('classes.failedToAddSubject'));
      }
    } catch (err) {
      alert(t('classes.errorAddingSubject'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editingSubject.id) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/subjects/${editingSubject.id}`, {
        method: 'PUT',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSubject.name, code: editingSubject.code, classId: editingSubject.classId }),
      });
      if (response.ok) {
        setIsEditSubjectModalOpen(false);
        fetchData();
      } else {
        alert(t('classes.failedToUpdateSubject'));
      }
    } catch (err) {
      alert(t('classes.errorUpdatingSubject'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubjectConfirm = async () => {
    if (!deletingSubjectId) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/subjects/${deletingSubjectId}`, {
        method: 'DELETE',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
      });
      if (response.ok) {
        setIsDeleteSubjectModalOpen(false);
        fetchData();
      } else {
        alert(t('classes.failedToDeleteSubject'));
      }
    } catch (err) {
      alert(t('classes.errorDeletingSubject'));
    } finally {
      setActionLoading(false);
    }
  };

  // Assignment Handlers
  const handleAssignStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserForm.userId) return;
    setAssignActionLoading(true);

    try {
      const student = studentsList.find((s) => s.id === assignUserForm.userId);
      if (!student) throw new Error('Student not found');

      const classIds = Array.from(new Set([...(student.classes?.map((c: any) => c.id) || []), assignUserForm.classId]));
      const sectionIds = Array.from(new Set([...(student.sections?.map((s: any) => s.id) || []), assignUserForm.sectionId]));

      const payload = {
        name: student.name,
        email: student.email,
        phone: student.phone,
        designation: student.designation,
        avatar: student.avatar,
        rollNumber: assignUserForm.rollNumber,
        classIds: classIds,
        sectionIds: sectionIds,
        role: 'student',
        schoolId: userSchoolId,
      };

      const response = await fetch(`${API_BASE_URL}/admin/users/${assignUserForm.userId}`, {
        method: 'PUT',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsAssignUserModalOpen(false);
        fetchStudentsList();
        alert(t('classes.studentAssignedSuccess'));
      } else {
        const err = await response.json();
        alert(`${t('classes.failedToAssignStudent')}: ${err.message || 'Unknown'}`);
      }
    } catch (e: any) {
      alert(`${t('classes.errorAssigningStudent')}: ${e.message}`);
    } finally {
      setAssignActionLoading(false);
    }
  };

  const handleAssignTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTeacherForm.userId) return;
    setAssignActionLoading(true);

    try {
      const teacher = teachersList.find((t) => t.id === assignTeacherForm.userId);
      if (!teacher) throw new Error('Teacher not found');

      const classIds = Array.from(new Set([...(teacher.classes?.map((c: any) => c.id) || []), assignTeacherForm.classId]));
      const sectionIds = Array.from(new Set([...(teacher.sections?.map((s: any) => s.id) || []), assignTeacherForm.sectionId]));

      const payload = {
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        designation: teacher.designation,
        avatar: teacher.avatar,
        classIds: classIds,
        sectionIds: sectionIds,
        role: 'teacher',
        schoolId: userSchoolId,
      };

      const response = await fetch(`${API_BASE_URL}/admin/users/${assignTeacherForm.userId}`, {
        method: 'PUT',
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsAssignTeacherModalOpen(false);
        fetchStudentsList();
        alert(t('classes.teacherAssignedSuccess'));
      } else {
        const err = await response.json();
        alert(`${t('classes.failedToAssignTeacher')}: ${err.message || 'Unknown'}`);
      }
    } catch (e: any) {
      alert(`${t('classes.errorAssigningTeacher')}: ${e.message}`);
    } finally {
      setAssignActionLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>

      {/* ── Stats Strip ─────────────────────────────────────── */}
      {!loading && classesData.length > 0 && (
        <div
          className="animate-fade-in"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {[
            { label: t('classes.totalClasses'), value: summaryMetrics.totalClasses, color: 'var(--primary)', icon: <BookOpen size={16} /> },
            { label: t('classes.totalSections'), value: summaryMetrics.totalSections, color: '#10b981', icon: <Layers size={16} /> },
            { label: t('classes.totalSubjects'), value: summaryMetrics.totalSubjects, color: '#8b5cf6', icon: <GraduationCap size={16} /> },
            { label: t('classes.assignedStudents'), value: summaryMetrics.totalStudents, color: '#f59e0b', icon: <Users size={16} /> },
          ].map((s) => (
            <div
              key={s.label}
              className="glass-card"
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--muted-foreground)' }}>
                <span style={{ fontSize: '0.775rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {s.label}
                </span>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <span style={{ fontSize: '1.85rem', fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Main Card ───────────────────────────────────────── */}
      <div
        className="data-table-wrapper glass-card"
        style={{
          background: 'var(--card)',
          borderRadius: '1.25rem',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        {/* ── Toolbar ─────────────────────────────────────── */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '400px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  padding: '0 0.875rem',
                  height: '42px',
                  background: 'var(--background)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <Search size={18} style={{ color: 'var(--muted-foreground)', marginRight: '0.625rem', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={t('classes.searchPlaceholder')}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    color: 'var(--foreground)',
                    fontSize: '0.9rem',
                  }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.25rem',
                      cursor: 'pointer',
                      color: 'var(--muted-foreground)',
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Action buttons row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Filters Toggle Button */}
              <button
                className="btn"
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  border: showFilters || activeFiltersCount > 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                  gap: '0.5rem',
                  borderRadius: '0.75rem',
                  height: '42px',
                  padding: '0 1rem',
                  background: showFilters ? 'var(--primary)' : 'var(--background)',
                  color: showFilters ? 'var(--primary-foreground)' : 'var(--foreground)',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Filter size={16} />
                <span>{t('students.filters')}</span>
                {activeFiltersCount > 0 && (
                  <span
                    style={{
                      background: showFilters ? '#ffffff' : 'var(--primary)',
                      color: showFilters ? 'var(--primary)' : '#ffffff',
                      fontSize: '0.75rem',
                      borderRadius: '999px',
                      padding: '0.1rem 0.5rem',
                      fontWeight: 700,
                    }}
                  >
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Export Dropdown */}
              <div className="class-export-dd" style={{ position: 'relative' }}>
                <button
                  className="btn"
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  disabled={filteredAndSortedClasses.length === 0}
                  style={{
                    background: exportDropdownOpen ? 'var(--muted)' : 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                    height: '42px',
                    padding: '0 0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    borderRadius: '0.75rem',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    opacity: filteredAndSortedClasses.length === 0 ? 0.6 : 1,
                    cursor: filteredAndSortedClasses.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Download size={16} />
                  <span>{t('common.export')}</span>
                  <ChevronDown
                    size={14}
                    style={{
                      opacity: 0.7,
                      transform: exportDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
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
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      padding: '0.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                    }}
                  >
                    {[
                      { label: t('students.exportCsv'), icon: <FileSpreadsheet size={15} style={{ color: '#10b981' }} />, fn: handleExportCSV },
                      { label: t('students.exportPdf'), icon: <FileText size={15} style={{ color: '#ef4444' }} />, fn: handleExportPDF },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.fn}
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
                          textAlign: 'left',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Section Button */}
              <button
                className="btn"
                onClick={() => setIsAddSectionModalOpen(true)}
                style={{
                  height: '42px',
                  padding: '0 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                <Plus size={16} />
                <span>{t('classes.addSection')}</span>
              </button>

              {/* Add Subject Button */}
              <button
                className="btn"
                onClick={() => setIsAddSubjectModalOpen(true)}
                style={{
                  height: '42px',
                  padding: '0 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                <Plus size={16} />
                <span>{t('classes.addSubject')}</span>
              </button>

              {/* Add Class Button */}
              <button
                className="btn btn-primary"
                onClick={() => setIsAddClassModalOpen(true)}
                style={{
                  height: '42px',
                  padding: '0 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  boxShadow: '0 4px 15px rgba(79, 70, 229, 0.35)',
                }}
              >
                <Plus size={18} />
                <span>{t('classes.addClass')}</span>
              </button>

              {/* Refresh Button */}
              <button
                className="btn"
                onClick={() => {
                  fetchData();
                  fetchStudentsList();
                }}
                title={t('common.refresh')}
                style={{
                  height: '42px',
                  width: '42px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                }}
              >
                <RefreshCw size={16} />
              </button>

              {/* Page Sizer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  height: '42px',
                  padding: '0 0.75rem',
                  background: 'var(--background)',
                }}
              >
                <span style={{ fontSize: '0.825rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{t('students.show')}</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.85rem',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted-foreground)',
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {t('students.clearAll')}
                </button>
              )}
            </div>
          </div>

          {/* ── Collapsible Filter Tray ───────────────────── */}
          {showFilters && (
            <div
              className="animate-fade-in"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                padding: '1.25rem',
                background: 'var(--background)',
                borderRadius: '0.875rem',
                border: '1px solid var(--border)',
              }}
            >
              {/* Filter by Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('classes.filterBySectionStatus')}
                </label>
                <select
                  className="input"
                  value={filterSectionStatus}
                  onChange={(e) => {
                    setFilterSectionStatus(e.target.value as any);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="all">{t('common.allClasses')}</option>
                  <option value="with-sections">{t('classes.hasSections')}</option>
                  <option value="without-sections">{t('classes.noSectionsYet')}</option>
                </select>
              </div>

              {/* Sort Order */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  {t('classes.sortOrder')}
                </label>
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setPage(1);
                  }}
                  style={{ height: '38px', borderRadius: '0.5rem' }}
                >
                  <option value="name-asc">{t('classes.nameAsc')}</option>
                  <option value="name-desc">{t('classes.nameDesc')}</option>
                  <option value="students-desc">{t('classes.mostStudents')}</option>
                  <option value="sections-desc">{t('classes.mostSections')}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Table Layout ────────────────────────────────────────── */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                {[
                  { label: '#', w: '52px' },
                  { label: t('classes.classAndDetails') },
                  { label: t('classes.totalSections') },
                  { label: t('classes.totalSubjects'), w: '160px' },
                  { label: t('classes.assignedStudents'), w: '140px' },
                  { label: t('common.actions'), w: '140px', align: 'right' as const },
                ].map((col) => (
                  <th
                    key={col.label}
                    style={{
                      padding: '0.875rem 1.25rem',
                      color: 'var(--muted-foreground)',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      width: col.w,
                      textAlign: col.align || 'left',
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '20px', margin: 0 }} />
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="shimmer shimmer-block" style={{ width: '40px', height: '40px', borderRadius: '0.6rem' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '130px' }}>
                          <div className="shimmer shimmer-text" />
                          <div className="shimmer shimmer-text short" style={{ margin: 0 }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <div className="shimmer shimmer-block" style={{ width: '50px', height: '24px', borderRadius: '999px' }} />
                        <div className="shimmer shimmer-block" style={{ width: '50px', height: '24px', borderRadius: '999px' }} />
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '80px', margin: 0 }} />
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '60px', margin: 0 }} />
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }} />
                        <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }} />
                        <div className="shimmer shimmer-block" style={{ width: '32px', height: '32px', borderRadius: '0.5rem' }} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginatedClasses.length > 0 ? (
                paginatedClasses.map((c, index) => {
                  const sl = (page - 1) * limit + index + 1;

                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* SL */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                        {sl}
                      </td>

                      {/* Class Name & Details */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '0.65rem',
                              background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(129,140,248,0.2))',
                              border: '1.5px solid var(--border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '1.05rem',
                              color: 'var(--primary)',
                              flexShrink: 0,
                            }}
                          >
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                color: 'var(--foreground)',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                setViewingClass(c);
                                setIsViewModalOpen(true);
                              }}
                              title={t('classes.viewOverview')}
                            >
                              {c.name}
                            </span>
                            {c.description ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.description}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                                {t('classes.noDescription')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Sections */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          {c.sections.length > 0 ? (
                            c.sections.map((s) => (
                              <span
                                key={s.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '999px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: 'rgba(79, 70, 229, 0.08)',
                                  color: 'var(--primary)',
                                  border: '1px solid rgba(79, 70, 229, 0.18)',
                                }}
                              >
                                {s.name}
                              </span>
                            ))
                          ) : (
                            <button
                              onClick={() => {
                                setNewSection({ name: '', classId: c.id });
                                setIsAddSectionModalOpen(true);
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px dashed var(--border)',
                                borderRadius: '999px',
                                padding: '0.2rem 0.6rem',
                                fontSize: '0.75rem',
                                color: 'var(--muted-foreground)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <Plus size={12} /> {t('classes.addSectionShort')}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Subjects */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <BookOpen size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                            {c.subjects.length}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                            {c.subjects.length === 1 ? t('classes.subjectSingle') : t('classes.subjectPlural')}
                          </span>
                        </div>
                      </td>

                      {/* Students */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <Users size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                            {c.students}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                            {c.students === 1 ? t('classes.studentSingle') : t('classes.studentPlural')}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            className="action-btn"
                            title={t('classes.viewClassTooltip')}
                            onClick={() => {
                              setViewingClass(c);
                              setIsViewModalOpen(true);
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--background)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: 'var(--foreground)',
                            }}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="action-btn"
                            title={t('classes.editClassTooltip')}
                            onClick={() => {
                              setEditingClass({ id: c.id, name: c.name, description: c.description });
                              setIsEditModalOpen(true);
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--background)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: 'var(--foreground)',
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            className="action-btn"
                            title={t('classes.deleteClassTooltip')}
                            onClick={() => {
                              setDeletingClassId(c.id);
                              setIsDeleteModalOpen(true);
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '0.5rem',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              background: 'rgba(239, 68, 68, 0.05)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#ef4444',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '4.5rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', maxWidth: '380px', margin: '0 auto' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: 'var(--muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--muted-foreground)',
                        }}
                      >
                        <Layers size={28} />
                      </div>
                      <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                        {t('classes.noClasses')}
                      </p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                        {activeFiltersCount > 0
                          ? t('classes.tryAdjusting')
                          : t('classes.noClassesYet')}
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={resetAllFilters}
                          className="btn"
                          style={{
                            marginTop: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'var(--background)',
                            fontSize: '0.85rem',
                          }}
                        >
                          {t('students.clearFilters')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ──────────────────────────── */}
        {!loading && total > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              background: 'var(--background)',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
              {t('students.showing')} <strong style={{ color: 'var(--foreground)' }}>{((page - 1) * limit) + 1}</strong> {t('students.to')}{' '}
              <strong style={{ color: 'var(--foreground)' }}>{Math.min(page * limit, total)}</strong> {t('students.of')}{' '}
              <strong style={{ color: 'var(--foreground)' }}>{total}</strong> {t('classes.classesCount')}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginRight: '0.5rem' }}>
                {t('students.page')} {page} {t('students.of')} {totalPages}
              </span>

              <button
                className="btn"
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.4 : 1,
                  background: 'var(--card)',
                  borderRadius: '0.5rem',
                }}
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title={t('students.prevPage')}
              >
                <ChevronLeft size={16} />
              </button>

              <button
                className="btn"
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.4 : 1,
                  background: 'var(--card)',
                  borderRadius: '0.5rem',
                }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title={t('students.nextPage')}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── VIEW / MANAGE CLASS MODAL ────────────────────────── */}
      {isViewModalOpen && viewingClass && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              background: 'var(--card)',
              width: '100%',
              maxWidth: '750px',
              borderRadius: '1.25rem',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--background)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '0.6rem',
                    background: 'rgba(79, 70, 229, 0.1)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BookOpen size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                    {viewingClass.name} — {t('classes.curriculumOverview')}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>
                    {t('classes.manageCurriculumSub')}
                  </p>
                </div>
              </div>
              <button
                className="action-btn"
                onClick={() => setIsViewModalOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--card)',
                  cursor: 'pointer',
                  color: 'var(--foreground)',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {viewingClass.description && (
                <div style={{ padding: '0.85rem 1rem', background: 'var(--background)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>{t('classes.descriptionLabel')}</span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--foreground)' }}>{viewingClass.description}</p>
                </div>
              )}

              <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {/* Sections Card */}
                <div
                  style={{
                    background: 'var(--background)',
                    padding: '1.25rem',
                    borderRadius: '0.875rem',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                      <Layers size={16} style={{ color: 'var(--primary)' }} /> {t('classes.totalSections')} ({viewingClass.sections.length})
                    </h4>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setNewSection({ name: '', classId: viewingClass.id });
                        setIsAddSectionModalOpen(true);
                      }}
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Plus size={13} /> {t('common.add')}
                    </button>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
                    {viewingClass.sections.length > 0 ? (
                      viewingClass.sections.map((s) => {
                        const assignedTeachers = teachersList.filter((t) => t.sections?.some((sec: any) => sec.id === s.id));
                        const assignedStudents = studentsList.filter((st) => st.sections?.some((sec: any) => sec.id === s.id));

                        return (
                          <li
                            key={s.id}
                            style={{
                              padding: '0.75rem',
                              background: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '0.6rem',
                              fontSize: '0.85rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.45rem',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{t('common.section')} {s.name}</span>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button
                                  onClick={() => {
                                    setAssignUserForm({ userId: '', rollNumber: '', classId: viewingClass.id, sectionId: s.id });
                                    setIsAssignUserModalOpen(true);
                                  }}
                                  style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                                  title={t('classes.assignStudent')}
                                >
                                  <UserPlus size={15} />
                                </button>
                                <button
                                  onClick={() => {
                                    setAssignTeacherForm({ userId: '', classId: viewingClass.id, sectionId: s.id });
                                    setIsAssignTeacherModalOpen(true);
                                  }}
                                  style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                                  title={t('classes.assignTeacher')}
                                >
                                  <UserCog size={15} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSection(s);
                                    setIsEditSectionModalOpen(true);
                                  }}
                                  style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                                  title={t('classes.editSection')}
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeletingSectionId(s.id);
                                    setIsDeleteSectionModalOpen(true);
                                  }}
                                  style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                  title={t('classes.deleteSection')}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>

                            {(assignedTeachers.length > 0 || assignedStudents.length > 0) && (
                              <div style={{ paddingTop: '0.4rem', borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                {assignedTeachers.length > 0 && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                    <strong style={{ color: 'var(--foreground)' }}>{t('classes.teachersLabel')}:</strong> {assignedTeachers.map((t) => t.name).join(', ')}
                                  </div>
                                )}
                                {assignedStudents.length > 0 && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                    <strong style={{ color: 'var(--foreground)' }}>{t('classes.studentsLabel')} ({assignedStudents.length}):</strong>{' '}
                                    {assignedStudents.slice(0, 3).map((st) => st.name).join(', ')}
                                    {assignedStudents.length > 3 ? ` +${assignedStudents.length - 3} ${t('classes.moreCount')}` : ''}
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', margin: 0, padding: '0.5rem 0' }}>
                        {t('classes.noSectionsInClass')}
                      </p>
                    )}
                  </ul>
                </div>

                {/* Subjects Card */}
                <div
                  style={{
                    background: 'var(--background)',
                    padding: '1.25rem',
                    borderRadius: '0.875rem',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                      <BookOpen size={16} style={{ color: 'var(--primary)' }} /> {t('classes.totalSubjects')} ({viewingClass.subjects.length})
                    </h4>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setNewSubject({ name: '', code: '', classId: viewingClass.id });
                        setIsAddSubjectModalOpen(true);
                      }}
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Plus size={13} /> {t('common.add')}
                    </button>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
                    {viewingClass.subjects.length > 0 ? (
                      viewingClass.subjects.map((sub) => (
                        <li
                          key={sub.id}
                          style={{
                            padding: '0.65rem 0.75rem',
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '0.6rem',
                            fontSize: '0.85rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            {sub.code && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '0.3rem',
                                  background: 'rgba(79, 70, 229, 0.08)',
                                  color: 'var(--primary)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  fontFamily: 'monospace',
                                  marginRight: '0.45rem',
                                  verticalAlign: 'middle',
                                }}
                              >
                                {sub.code}
                              </span>
                            )}
                            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{sub.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => {
                                setEditingSubject(sub);
                                setIsEditSubjectModalOpen(true);
                              }}
                              style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                              title={t('classes.editSubject')}
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingSubjectId(sub.id);
                                setIsDeleteSubjectModalOpen(true);
                              }}
                              style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                              title={t('classes.deleteSubject')}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </li>
                      ))
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', margin: 0, padding: '0.5rem 0' }}>
                        {t('classes.noSubjectsInClass')}
                      </p>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CLASS MODAL ──────────────────────────────────── */}
      {isAddClassModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '440px', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{t('classes.addClassModalTitle')}</h2>
              <button className="action-btn" onClick={() => setIsAddClassModalOpen(false)} disabled={actionLoading} style={{ borderRadius: '50%', width: 32, height: 32 }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddClass} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.className')}</label>
                <input
                  type="text"
                  className="input"
                  placeholder={t('classes.classNamePlaceholder')}
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  required
                  disabled={actionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.descriptionOptional')}</label>
                <textarea
                  className="input"
                  style={{ minHeight: '80px', padding: '0.75rem', resize: 'vertical', borderRadius: '0.5rem' }}
                  placeholder={t('classes.descriptionPlaceholder')}
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  disabled={actionLoading}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsAddClassModalOpen(false)} disabled={actionLoading}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />}
                  {t('classes.createClassBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD SECTION MODAL ────────────────────────────────── */}
      {isAddSectionModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '440px', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{t('classes.addSectionModalTitle')}</h2>
              <button className="action-btn" onClick={() => setIsAddSectionModalOpen(false)} disabled={actionLoading} style={{ borderRadius: '50%', width: 32, height: 32 }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddSection} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.sectionName')}</label>
                <input
                  type="text"
                  className="input"
                  placeholder={t('classes.sectionNamePlaceholder')}
                  value={newSection.name}
                  onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                  required
                  disabled={actionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.assignToClass')}</label>
                <select
                  className="input"
                  value={newSection.classId}
                  onChange={(e) => setNewSection({ ...newSection, classId: e.target.value })}
                  required
                  disabled={actionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                >
                  <option value="" disabled>{t('classes.chooseClass')}</option>
                  {classesData.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsAddSectionModalOpen(false)} disabled={actionLoading}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />}
                  {t('classes.addSectionBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD SUBJECT MODAL ────────────────────────────────── */}
      {isAddSubjectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '440px', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{t('classes.addSubjectModalTitle')}</h2>
              <button className="action-btn" onClick={() => setIsAddSubjectModalOpen(false)} disabled={actionLoading} style={{ borderRadius: '50%', width: 32, height: 32 }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddSubject} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.subjectName')}</label>
                <input
                  type="text"
                  className="input"
                  placeholder={t('classes.subjectNamePlaceholder')}
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  required
                  disabled={actionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.subjectCodeOptional')}</label>
                <input
                  type="text"
                  className="input"
                  placeholder={t('classes.subjectCodePlaceholder')}
                  value={newSubject.code}
                  onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                  disabled={actionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.assignToClass')}</label>
                <select
                  className="input"
                  value={newSubject.classId}
                  onChange={(e) => setNewSubject({ ...newSubject, classId: e.target.value })}
                  required
                  disabled={actionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                >
                  <option value="" disabled>{t('classes.chooseClass')}</option>
                  {classesData.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsAddSubjectModalOpen(false)} disabled={actionLoading}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />}
                  {t('classes.addSubjectBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT CLASS MODAL ─────────────────────────────────── */}
      {isEditModalOpen && editingClass && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '440px', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{t('classes.editClassModalTitle')}</h2>
              <button className="action-btn" onClick={() => setIsEditModalOpen(false)} disabled={actionLoading} style={{ borderRadius: '50%', width: 32, height: 32 }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.className')}</label>
                <input
                  type="text"
                  className="input"
                  value={editingClass.name || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                  required
                  disabled={actionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.descriptionLabel')}</label>
                <textarea
                  className="input"
                  style={{ minHeight: '80px', padding: '0.75rem', resize: 'vertical', borderRadius: '0.5rem' }}
                  value={editingClass.description || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, description: e.target.value })}
                  disabled={actionLoading}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsEditModalOpen(false)} disabled={actionLoading}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />}
                  {t('common.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT SECTION MODAL ───────────────────────────────── */}
      {isEditSectionModalOpen && editingSection && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '440px', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{t('classes.editSectionModalTitle')}</h2>
              <button className="action-btn" onClick={() => setIsEditSectionModalOpen(false)} disabled={actionLoading} style={{ borderRadius: '50%', width: 32, height: 32 }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditSectionSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.sectionName')}</label>
                <input
                  type="text"
                  className="input"
                  value={editingSection.name || ''}
                  onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                  required
                  disabled={actionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('common.class')}</label>
                <select
                  className="input"
                  value={editingSection.classId || ''}
                  onChange={(e) => setEditingSection({ ...editingSection, classId: e.target.value })}
                  required
                  disabled={actionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                >
                  {classesData.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsEditSectionModalOpen(false)} disabled={actionLoading}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />}
                  {t('classes.saveSectionBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT SUBJECT MODAL ───────────────────────────────── */}
      {isEditSubjectModalOpen && editingSubject && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '440px', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{t('classes.editSubjectModalTitle')}</h2>
              <button className="action-btn" onClick={() => setIsEditSubjectModalOpen(false)} disabled={actionLoading} style={{ borderRadius: '50%', width: 32, height: 32 }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditSubjectSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.subjectName')}</label>
                <input
                  type="text"
                  className="input"
                  value={editingSubject.name || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  required
                  disabled={actionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.subjectCode')}</label>
                <input
                  type="text"
                  className="input"
                  value={editingSubject.code || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value })}
                  disabled={actionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('common.class')}</label>
                <select
                  className="input"
                  value={editingSubject.classId || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, classId: e.target.value })}
                  required
                  disabled={actionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                >
                  {classesData.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsEditSubjectModalOpen(false)} disabled={actionLoading}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />}
                  {t('classes.saveSubjectBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODALS ────────────────────────────────────── */}
      {isDeleteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.75rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <Trash2 size={26} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('classes.deleteClassHeading')}</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                {t('classes.deleteClassConfirm')}
              </p>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--background)', display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={() => setIsDeleteModalOpen(false)} disabled={actionLoading}>
                {t('common.cancel')}
              </button>
              <button className="btn" style={{ flex: 1, background: '#ef4444', color: 'white' }} onClick={handleDeleteConfirm} disabled={actionLoading}>
                {actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />} {t('classes.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteSectionModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.75rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <Trash2 size={26} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('classes.deleteSectionHeading')}</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0 }}>
                {t('classes.deleteSectionConfirm')}
              </p>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--background)', display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={() => setIsDeleteSectionModalOpen(false)} disabled={actionLoading}>
                {t('common.cancel')}
              </button>
              <button className="btn" style={{ flex: 1, background: '#ef4444', color: 'white' }} onClick={handleDeleteSectionConfirm} disabled={actionLoading}>
                {actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />} {t('classes.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteSubjectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.75rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <Trash2 size={26} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('classes.deleteSubjectHeading')}</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', margin: 0 }}>
                {t('classes.deleteSubjectConfirm')}
              </p>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--background)', display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={() => setIsDeleteSubjectModalOpen(false)} disabled={actionLoading}>
                {t('common.cancel')}
              </button>
              <button className="btn" style={{ flex: 1, background: '#ef4444', color: 'white' }} onClick={handleDeleteSubjectConfirm} disabled={actionLoading}>
                {actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />} {t('classes.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSIGN USER (STUDENT) MODAL ───────────────────────── */}
      {isAssignUserModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '440px', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{t('classes.assignStudentTitle')}</h2>
              <button className="action-btn" onClick={() => setIsAssignUserModalOpen(false)} disabled={assignActionLoading} style={{ borderRadius: '50%', width: 32, height: 32 }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAssignStudentSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.selectStudent')}</label>
                <select
                  className="input"
                  value={assignUserForm.userId}
                  onChange={(e) => setAssignUserForm({ ...assignUserForm, userId: e.target.value })}
                  required
                  disabled={assignActionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('classes.chooseStudent')}</option>
                  {studentsList.map((st: any) => (
                    <option key={st.id} value={st.id}>{st.name} {st.email ? `(${st.email})` : ''}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.rollNumber')}</label>
                <input
                  type="text"
                  className="input"
                  placeholder={t('classes.rollNumberPlaceholder')}
                  value={assignUserForm.rollNumber}
                  onChange={(e) => setAssignUserForm({ ...assignUserForm, rollNumber: e.target.value })}
                  required
                  disabled={assignActionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsAssignUserModalOpen(false)} disabled={assignActionLoading}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={assignActionLoading}>
                  {assignActionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />}
                  {t('classes.assignStudentBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN TEACHER MODAL ─────────────────────────────── */}
      {isAssignTeacherModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '440px', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{t('classes.assignTeacherTitle')}</h2>
              <button className="action-btn" onClick={() => setIsAssignTeacherModalOpen(false)} disabled={assignActionLoading} style={{ borderRadius: '50%', width: 32, height: 32 }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAssignTeacherSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('classes.selectTeacher')}</label>
                <select
                  className="input"
                  value={assignTeacherForm.userId}
                  onChange={(e) => setAssignTeacherForm({ ...assignTeacherForm, userId: e.target.value })}
                  required
                  disabled={assignActionLoading}
                  style={{ height: '40px', borderRadius: '0.5rem' }}
                >
                  <option value="">{t('classes.chooseTeacher')}</option>
                  {teachersList.map((st: any) => (
                    <option key={st.id} value={st.id}>{st.name} {st.designation ? `(${st.designation})` : ''}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsAssignTeacherModalOpen(false)} disabled={assignActionLoading}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={assignActionLoading}>
                  {assignActionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />}
                  {t('classes.assignTeacherBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
