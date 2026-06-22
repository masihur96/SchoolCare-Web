"use client";

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Layers, BookOpen, Loader2, Eye, X, UserPlus, UserCog, Users } from 'lucide-react';

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

interface ProcessedClass {
  id: string;
  name: string;
  description: string;
  sections: SectionEntity[];
  subjects: SubjectEntity[];
  students: number;
}

export default function ClassesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [classesData, setClassesData] = useState<ProcessedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [isAssignUserModalOpen, setIsAssignUserModalOpen] = useState(false);
  const [assignUserForm, setAssignUserForm] = useState({ userId: '', rollNumber: '', classId: '', sectionId: '' });
  const [assignActionLoading, setAssignActionLoading] = useState(false);

  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [isAssignTeacherModalOpen, setIsAssignTeacherModalOpen] = useState(false);
  const [assignTeacherForm, setAssignTeacherForm] = useState({ userId: '', classId: '', sectionId: '' });

  // Decode user school ID from token
  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(getApiToken().split('.')[1]));
      return payload.schoolId;
    } catch (e) {
      console.error("Failed to decode token", e);
      return null;
    }
  };

  const userSchoolId = getUserSchoolId();

  const fetchData = async () => {
    if (!userSchoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const headers = {
        'accept': '*/*',
        'Authorization': `Bearer ${getApiToken()}`
      };

      const [classesRes, sectionsRes, subjectsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/classes`, { headers }),
        fetch(`${API_BASE_URL}/admin/sections?schoolId=${userSchoolId}`, { headers }),
        fetch(`${API_BASE_URL}/admin/subjects`, { headers })
      ]);

      const classesJson = await classesRes.json();
      const sectionsJson = await sectionsRes.json();
      const subjectsJson = await subjectsRes.json();

      const classes: ClassEntity[] = Array.isArray(classesJson) ? classesJson : classesJson.data || [];
      const sections: SectionEntity[] = Array.isArray(sectionsJson) ? sectionsJson : sectionsJson.data || [];
      const subjects: SubjectEntity[] = Array.isArray(subjectsJson) ? subjectsJson : subjectsJson.data || [];

      // Process and map data, explicitly filtering by schoolId
      const mappedClasses: ProcessedClass[] = classes
        .filter(cls => cls.schoolId === userSchoolId)
        .map(cls => {
          const clsSections = sections.filter(sec => sec.classId === cls.id);
          // Only distinct objects if needed, but the IDs make them distinct
          const uniqueSections = Array.from(new Map(clsSections.map(item => [item.id, item])).values());
          
          const clsSubjects = subjects.filter(sub => sub.classId === cls.id);
          
          return {
            id: cls.id,
            name: cls.name,
            description: cls.description || '',
            sections: uniqueSections,
            subjects: clsSubjects,
            students: 0 // Default to 0
          };
        });

      mappedClasses.sort((a, b) => a.name.localeCompare(b.name));
      setClassesData(mappedClasses);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsList = async () => {
    if (!userSchoolId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users?role=student&limit=1000&schoolId=${userSchoolId}`, { 
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` } 
      });
      const json = await res.json();
      if (json.statusCode === 200) {
        setStudentsList(json.data.data || []);
      }

      const resT = await fetch(`${API_BASE_URL}/admin/users?role=teacher&limit=1000&schoolId=${userSchoolId}`, { 
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` } 
      });
      const jsonT = await resT.json();
      if (jsonT.statusCode === 200) {
        setTeachersList(jsonT.data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchStudentsList();
  }, [userSchoolId]);

  // Update viewing class when classesData updates
  useEffect(() => {
    if (viewingClass && isViewModalOpen) {
      const updatedClass = classesData.find(c => c.id === viewingClass.id);
      if (updatedClass) {
        setViewingClass(updatedClass);
      } else {
        setIsViewModalOpen(false); // Class was deleted
      }
    }
  }, [classesData]);

  // === CLASS HANDLERS ===
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/classes`, {
        method: 'POST',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newClass, schoolId: userSchoolId })
      });
      if (response.ok) {
        setIsAddClassModalOpen(false);
        setNewClass({ name: '', description: '' });
        fetchData();
      } else {
        alert("Failed to add class.");
      }
    } catch (err) {
      alert("Error adding class.");
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
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingClass.name, description: editingClass.description })
      });
      if (response.ok) {
        setIsEditModalOpen(false);
        fetchData();
      } else {
        alert("Failed to update class.");
      }
    } catch (err) {
      alert("Error updating class.");
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
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` }
      });
      if (response.ok) {
        setIsDeleteModalOpen(false);
        fetchData();
      } else {
        alert("Failed to delete class.");
      }
    } catch (err) {
      alert("Error deleting class.");
    } finally {
      setActionLoading(false);
    }
  };

  // === SECTION HANDLERS ===
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sections`, {
        method: 'POST',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSection, schoolId: userSchoolId })
      });
      if (response.ok) {
        setIsAddSectionModalOpen(false);
        setNewSection({ name: '', classId: '' });
        fetchData();
      } else {
        alert("Failed to add section.");
      }
    } catch (err) {
      alert("Error adding section.");
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
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSection.name, classId: editingSection.classId })
      });
      if (response.ok) {
        setIsEditSectionModalOpen(false);
        fetchData();
      } else {
        alert("Failed to update section.");
      }
    } catch (err) {
      alert("Error updating section.");
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
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` }
      });
      if (response.ok) {
        setIsDeleteSectionModalOpen(false);
        fetchData();
      } else {
        alert("Failed to delete section.");
      }
    } catch (err) {
      alert("Error deleting section.");
    } finally {
      setActionLoading(false);
    }
  };

  // === SUBJECT HANDLERS ===
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/subjects`, {
        method: 'POST',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSubject, schoolId: userSchoolId })
      });
      if (response.ok) {
        setIsAddSubjectModalOpen(false);
        setNewSubject({ name: '', code: '', classId: '' });
        fetchData();
      } else {
        alert("Failed to add subject.");
      }
    } catch (err) {
      alert("Error adding subject.");
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
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSubject.name, code: editingSubject.code, classId: editingSubject.classId })
      });
      if (response.ok) {
        setIsEditSubjectModalOpen(false);
        fetchData();
      } else {
        alert("Failed to update subject.");
      }
    } catch (err) {
      alert("Error updating subject.");
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
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` }
      });
      if (response.ok) {
        setIsDeleteSubjectModalOpen(false);
        fetchData();
      } else {
        alert("Failed to delete subject.");
      }
    } catch (err) {
      alert("Error deleting subject.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserForm.userId) return;
    setAssignActionLoading(true);

    try {
      const student = studentsList.find(s => s.id === assignUserForm.userId);
      if (!student) throw new Error("Student not found");

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
        schoolId: userSchoolId
      };

      const response = await fetch(`${API_BASE_URL}/admin/users/${assignUserForm.userId}`, {
        method: 'PUT',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsAssignUserModalOpen(false);
        fetchStudentsList(); 
        alert("Student successfully assigned!");
      } else {
        const err = await response.json();
        alert(`Failed to assign student: ${err.message || 'Unknown'}`);
      }
    } catch (e: any) {
      alert(`Error assigning student: ${e.message}`);
    } finally {
      setAssignActionLoading(false);
    }
  };

  const handleAssignTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTeacherForm.userId) return;
    setAssignActionLoading(true);

    try {
      const teacher = teachersList.find(t => t.id === assignTeacherForm.userId);
      if (!teacher) throw new Error("Teacher not found");

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
        schoolId: userSchoolId
      };

      const response = await fetch(`${API_BASE_URL}/admin/users/${assignTeacherForm.userId}`, {
        method: 'PUT',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsAssignTeacherModalOpen(false);
        fetchStudentsList(); // This also fetches teachers
        alert("Teacher successfully assigned!");
      } else {
        const err = await response.json();
        alert(`Failed to assign teacher: ${err.message || 'Unknown'}`);
      }
    } catch (e: any) {
      alert(`Error assigning teacher: ${e.message}`);
    } finally {
      setAssignActionLoading(false);
    }
  };

  const filteredClasses = classesData.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).map(c => {
    const studentCount = studentsList.filter(st => st.classes?.some((cls: any) => cls.id === c.id)).length;
    return { ...c, students: studentCount };
  });

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Classes & Curriculum
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Manage classes, sections, and subjects</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setIsAddSectionModalOpen(true)} style={{ background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Add Section
          </button>
          <button className="btn" onClick={() => setIsAddSubjectModalOpen(true)} style={{ background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Add Subject
          </button>
          <button className="btn btn-primary" onClick={() => setIsAddClassModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>
            <Plus size={16} /> Add Class
          </button>
        </div>
      </div>

      <div className="data-table-wrapper glass-card">
        <div className="data-table-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div className="search-bar" style={{ display: 'flex', width: '300px', border: '1px solid var(--border)', borderRadius: '9999px', overflow: 'hidden', padding: '0 1rem', height: '40px', background: 'var(--background)' }}>
            <Search size={18} style={{ color: 'var(--muted-foreground)', marginRight: '0.5rem', marginTop: 'auto', marginBottom: 'auto' }} />
            <input 
              type="text" 
              placeholder="Search classes..." 
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', color: 'var(--foreground)' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>
            Total Classes: {classesData.length}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Class Name</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Sections</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Subjects</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Students</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                      <p style={{ color: 'var(--muted-foreground)' }}>Loading curriculum data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredClasses.length > 0 ? (
                filteredClasses.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
                          {c.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--foreground)' }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {c.sections.length > 0 ? c.sections.map((s, i) => (
                          <span key={i} className="badge badge-primary">{s.name}</span>
                        )) : (
                          <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No sections</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)' }}>
                        <BookOpen size={18} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{c.subjects.length}</span>
                        <span style={{ fontSize: '0.875rem' }}>{c.subjects.length === 1 ? 'Subject' : 'Subjects'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)' }}>
                        <Users size={18} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{c.students}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <div className="action-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button 
                          className="action-btn" 
                          title="View Class Details & Manage"
                          onClick={() => { setViewingClass(c); setIsViewModalOpen(true); }}
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          className="action-btn" 
                          title="Edit Class"
                          onClick={() => { setEditingClass({ id: c.id, name: c.name, description: c.description }); setIsEditModalOpen(true); }}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="action-btn" 
                          style={{ color: 'var(--destructive)' }} 
                          title="Delete Class"
                          onClick={() => { setDeletingClassId(c.id); setIsDeleteModalOpen(true); }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Search size={40} style={{ color: 'var(--border)', marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>No classes found</p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Try adjusting your search query.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal with Manage Sections & Subjects */}
      {isViewModalOpen && viewingClass && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '700px', borderRadius: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Class Details</h2>
              <button className="action-btn" onClick={() => setIsViewModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{viewingClass.name}</h3>
                <p style={{ color: 'var(--muted-foreground)' }}>{viewingClass.description || 'No description provided.'}</p>
              </div>

              <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr 1fr' }}>
                {/* Sections List */}
                <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Layers size={18} style={{ color: 'var(--primary)' }}/> Sections
                    </h4>
                    <button className="btn" onClick={() => { setNewSection({ name: '', classId: viewingClass.id }); setIsAddSectionModalOpen(true); }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {viewingClass.sections.length > 0 ? viewingClass.sections.map(s => {
                      const assignedTeachers = teachersList.filter(t => t.sections?.some((sec: any) => sec.id === s.id));
                      const assignedStudents = studentsList.filter(st => st.sections?.some((sec: any) => sec.id === s.id));

                      return (
                        <li key={s.id} style={{ padding: '0.75rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.25rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{s.name}</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button onClick={() => { setAssignUserForm({ userId: '', rollNumber: '', classId: viewingClass.id, sectionId: s.id }); setIsAssignUserModalOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)' }} title="Assign Student"><UserPlus size={14} /></button>
                              <button onClick={() => { setAssignTeacherForm({ userId: '', classId: viewingClass.id, sectionId: s.id }); setIsAssignTeacherModalOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)' }} title="Assign Teacher"><UserCog size={14} /></button>
                              <button onClick={() => { setEditingSection(s); setIsEditSectionModalOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }} title="Edit"><Edit size={14} /></button>
                              <button onClick={() => { setDeletingSectionId(s.id); setIsDeleteSectionModalOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--destructive)' }} title="Delete"><Trash2 size={14} /></button>
                            </div>
                          </div>
                          
                          {(assignedTeachers.length > 0 || assignedStudents.length > 0) && (
                            <div style={{ marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {assignedTeachers.length > 0 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                  <span style={{ fontWeight: 600 }}>Teachers:</span> {assignedTeachers.map(t => t.name).join(', ')}
                                </div>
                              )}
                              {assignedStudents.length > 0 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                  <span style={{ fontWeight: 600 }}>Students:</span> {assignedStudents.map(st => `${st.name} (Roll: ${st.rollNumber || 'N/A'})`).join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    }) : <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>No sections assigned</p>}
                  </ul>
                </div>

                {/* Subjects List */}
                <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BookOpen size={18} style={{ color: 'var(--primary)' }}/> Subjects
                    </h4>
                    <button className="btn" onClick={() => { setNewSubject({ name: '', code: '', classId: viewingClass.id }); setIsAddSubjectModalOpen(true); }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {viewingClass.subjects.length > 0 ? viewingClass.subjects.map(s => (
                      <li key={s.id} style={{ padding: '0.5rem 0.75rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.25rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>{s.code || ''}</span>
                          {s.name}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => { setEditingSubject(s); setIsEditSubjectModalOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }} title="Edit"><Edit size={14} /></button>
                          <button onClick={() => { setDeletingSubjectId(s.id); setIsDeleteSubjectModalOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--destructive)' }} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </li>
                    )) : <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>No subjects assigned</p>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD MODALS --- */}
      {/* Add Class Modal */}
      {isAddClassModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Add New Class</h2>
              <button className="action-btn" onClick={() => setIsAddClassModalOpen(false)} disabled={actionLoading}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddClass} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Class Name</label>
                <input type="text" className="input" value={newClass.name} onChange={(e) => setNewClass({...newClass, name: e.target.value})} required disabled={actionLoading} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                <textarea className="input" style={{ minHeight: '80px', padding: '0.75rem', resize: 'vertical' }} value={newClass.description} onChange={(e) => setNewClass({...newClass, description: e.target.value})} disabled={actionLoading} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsAddClassModalOpen(false)} disabled={actionLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>{actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/>} Add Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {isAddSectionModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Add New Section</h2>
              <button className="action-btn" onClick={() => setIsAddSectionModalOpen(false)} disabled={actionLoading}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSection} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Section Name</label>
                <input type="text" className="input" value={newSection.name} onChange={(e) => setNewSection({...newSection, name: e.target.value})} required disabled={actionLoading} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Select Class</label>
                <select className="input" value={newSection.classId} onChange={(e) => setNewSection({...newSection, classId: e.target.value})} required disabled={actionLoading}>
                  <option value="" disabled>-- Choose a Class --</option>
                  {classesData.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsAddSectionModalOpen(false)} disabled={actionLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>{actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/>} Add Section</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {isAddSubjectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Add New Subject</h2>
              <button className="action-btn" onClick={() => setIsAddSubjectModalOpen(false)} disabled={actionLoading}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSubject} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Subject Name</label>
                <input type="text" className="input" value={newSubject.name} onChange={(e) => setNewSubject({...newSubject, name: e.target.value})} required disabled={actionLoading} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Subject Code</label>
                <input type="text" className="input" value={newSubject.code} onChange={(e) => setNewSubject({...newSubject, code: e.target.value})} disabled={actionLoading} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Select Class</label>
                <select className="input" value={newSubject.classId} onChange={(e) => setNewSubject({...newSubject, classId: e.target.value})} required disabled={actionLoading}>
                  <option value="" disabled>-- Choose a Class --</option>
                  {classesData.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsAddSubjectModalOpen(false)} disabled={actionLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>{actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/>} Add Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MODALS --- */}
      {isEditModalOpen && editingClass && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Edit Class</h2>
              <button className="action-btn" onClick={() => setIsEditModalOpen(false)} disabled={actionLoading}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Class Name</label>
                <input type="text" className="input" value={editingClass.name || ''} onChange={(e) => setEditingClass({...editingClass, name: e.target.value})} required disabled={actionLoading} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                <textarea className="input" style={{ minHeight: '80px', padding: '0.75rem', resize: 'vertical' }} value={editingClass.description || ''} onChange={(e) => setEditingClass({...editingClass, description: e.target.value})} disabled={actionLoading} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsEditModalOpen(false)} disabled={actionLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>{actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/>} Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditSectionModalOpen && editingSection && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Edit Section</h2>
              <button className="action-btn" onClick={() => setIsEditSectionModalOpen(false)} disabled={actionLoading}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSectionSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Section Name</label>
                <input type="text" className="input" value={editingSection.name || ''} onChange={(e) => setEditingSection({...editingSection, name: e.target.value})} required disabled={actionLoading} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Class</label>
                <select className="input" value={editingSection.classId || ''} onChange={(e) => setEditingSection({...editingSection, classId: e.target.value})} required disabled={actionLoading}>
                  {classesData.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsEditSectionModalOpen(false)} disabled={actionLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>{actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/>} Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditSubjectModalOpen && editingSubject && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Edit Subject</h2>
              <button className="action-btn" onClick={() => setIsEditSubjectModalOpen(false)} disabled={actionLoading}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubjectSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Subject Name</label>
                <input type="text" className="input" value={editingSubject.name || ''} onChange={(e) => setEditingSubject({...editingSubject, name: e.target.value})} required disabled={actionLoading} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Subject Code</label>
                <input type="text" className="input" value={editingSubject.code || ''} onChange={(e) => setEditingSubject({...editingSubject, code: e.target.value})} disabled={actionLoading} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Class</label>
                <select className="input" value={editingSubject.classId || ''} onChange={(e) => setEditingSubject({...editingSubject, classId: e.target.value})} required disabled={actionLoading}>
                  {classesData.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsEditSubjectModalOpen(false)} disabled={actionLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>{actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/>} Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE MODALS --- */}
      {isDeleteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--destructive)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <Trash2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Delete Class</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Are you sure you want to delete this class? This action cannot be undone.</p>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--background)', display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={() => setIsDeleteModalOpen(false)} disabled={actionLoading}>Cancel</button>
              <button className="btn" style={{ flex: 1, background: 'var(--destructive)', color: 'white' }} onClick={handleDeleteConfirm} disabled={actionLoading}>{actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/>} Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteSectionModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--destructive)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <Trash2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Delete Section</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Are you sure you want to delete this section?</p>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--background)', display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={() => setIsDeleteSectionModalOpen(false)} disabled={actionLoading}>Cancel</button>
              <button className="btn" style={{ flex: 1, background: 'var(--destructive)', color: 'white' }} onClick={handleDeleteSectionConfirm} disabled={actionLoading}>{actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/>} Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteSubjectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--destructive)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <Trash2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Delete Subject</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Are you sure you want to delete this subject?</p>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--background)', display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={() => setIsDeleteSubjectModalOpen(false)} disabled={actionLoading}>Cancel</button>
              <button className="btn" style={{ flex: 1, background: 'var(--destructive)', color: 'white' }} onClick={handleDeleteSubjectConfirm} disabled={actionLoading}>{actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/>} Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {isAssignUserModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Assign Student</h2>
              <button className="action-btn" onClick={() => setIsAssignUserModalOpen(false)} disabled={assignActionLoading}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAssignStudentSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Select Student</label>
                <select className="input" value={assignUserForm.userId} onChange={(e) => setAssignUserForm({...assignUserForm, userId: e.target.value})} required disabled={assignActionLoading}>
                  <option value="">-- Choose Student --</option>
                  {studentsList.map((st: any) => (
                    <option key={st.id} value={st.id}>{st.name} ({st.email})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Roll Number</label>
                <input type="text" className="input" value={assignUserForm.rollNumber} onChange={(e) => setAssignUserForm({...assignUserForm, rollNumber: e.target.value})} required disabled={assignActionLoading} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsAssignUserModalOpen(false)} disabled={assignActionLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={assignActionLoading}>{assignActionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/>} Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {isAssignTeacherModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Assign Teacher</h2>
              <button className="action-btn" onClick={() => setIsAssignTeacherModalOpen(false)} disabled={assignActionLoading}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAssignTeacherSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Select Teacher</label>
                <select className="input" value={assignTeacherForm.userId} onChange={(e) => setAssignTeacherForm({...assignTeacherForm, userId: e.target.value})} required disabled={assignActionLoading}>
                  <option value="">-- Choose Teacher --</option>
                  {teachersList.map((st: any) => (
                    <option key={st.id} value={st.id}>{st.name} ({st.email})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsAssignTeacherModalOpen(false)} disabled={assignActionLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={assignActionLoading}>{assignActionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/>} Assign</button>
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
        .data-table tbody tr:hover {
          background: rgba(79, 70, 229, 0.03) !important;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
