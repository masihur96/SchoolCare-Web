"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, Eye, EyeOff, Filter, ChevronLeft, ChevronRight, Loader2, X, Upload } from 'lucide-react';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkYTBjM2ZmZi1hZTU5LTQ2YTMtYTAzNy0xOWZhNjgwMDNjNmIiLCJyb2xlIjoiYWRtaW4iLCJzY2hvb2xJZCI6IjI5ZjA1ZWRiLThlMGItNDM0Yy1hNDcxLWFhNzc2MzA4YTFjMSIsImNsYXNzSWRzIjpbXSwic2VjdGlvbklkcyI6W10sImlhdCI6MTc4MjAxOTkxMSwiZXhwIjoxNzgyMTA2MzExfQ.Q6MlzH1TyhbM2HurOeEqvCvOUZfOKIQ8DPCL50E42Z8';

interface ClassEntity {
  id: string;
  name: string;
  schoolId: string;
}

interface SectionEntity {
  id: string;
  name: string;
  classId: string;
}

interface StudentEntity {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  isActive: boolean;
  avatar?: string;
  classes: ClassEntity[];
  sections: SectionEntity[];
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentEntity[]>([]);
  const [classesData, setClassesData] = useState<ClassEntity[]>([]);
  const [sectionsData, setSectionsData] = useState<SectionEntity[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterIsActive, setFilterIsActive] = useState(''); // 'true', 'false', ''
  
  // Toggle filters visibility
  const [showFilters, setShowFilters] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    avatar: '',
    rollNumber: '',
    classIds: [] as string[],
    sectionIds: [] as string[]
  });
  const [showPassword, setShowPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(API_TOKEN.split('.')[1]));
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
      setPage(1); // Reset page on search change
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchFiltersData = useCallback(async () => {
    if (!userSchoolId) return;
    try {
      const headers = {
        'accept': '*/*',
        'Authorization': `Bearer ${API_TOKEN}`
      };
      const [classesRes, sectionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/classes`, { headers }),
        fetch(`${API_BASE_URL}/admin/sections?schoolId=${userSchoolId}`, { headers })
      ]);
      const classesJson = await classesRes.json();
      const sectionsJson = await sectionsRes.json();

      const classes: ClassEntity[] = Array.isArray(classesJson) ? classesJson : classesJson.data || [];
      const sections: SectionEntity[] = Array.isArray(sectionsJson) ? sectionsJson : sectionsJson.data || [];

      setClassesData(classes.filter(c => c.schoolId === userSchoolId));
      setSectionsData(sections);
    } catch (error) {
      console.error("Failed to fetch filters data:", error);
    }
  }, [userSchoolId]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {
        'accept': '*/*',
        'Authorization': `Bearer ${API_TOKEN}`
      };
      
      const queryParams = new URLSearchParams({
        role: 'student',
        page: page.toString(),
        limit: limit.toString(),
      });

      if (debouncedSearch) queryParams.append('search', debouncedSearch);
      if (filterClass) queryParams.append('classIds', filterClass);
      if (filterSection) queryParams.append('sectionIds', filterSection);
      if (filterIsActive !== '') queryParams.append('isActive', filterIsActive);

      const response = await fetch(`${API_BASE_URL}/admin/users?${queryParams.toString()}`, { headers });
      const json = await response.json();

      if (json.statusCode === 200) {
        setStudents(json.data.data);
        setTotal(json.data.total);
      } else {
        setStudents([]);
        setTotal(0);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, filterClass, filterSection, filterIsActive]);

  useEffect(() => {
    fetchFiltersData();
  }, [fetchFiltersData]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const resetForm = () => {
    setNewStudent({
      name: '', email: '', password: '', phone: '', designation: '', 
      avatar: '', rollNumber: '', classIds: [], sectionIds: []
    });
    setSelectedStudentId(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (student: StudentEntity) => {
    setNewStudent({
      name: student.name,
      email: student.email,
      password: '', // blank password for edit unless they type a new one
      phone: (student as any).phone || '',
      designation: (student as any).designation || '',
      avatar: student.avatar || '',
      rollNumber: student.rollNumber || '',
      classIds: student.classes?.map(c => c.id) || [],
      sectionIds: student.sections?.map(s => s.id) || []
    });
    setSelectedStudentId(student.id);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openViewModal = (student: StudentEntity) => {
    setNewStudent({
      name: student.name,
      email: student.email,
      password: '', 
      phone: (student as any).phone || '',
      designation: (student as any).designation || '',
      avatar: student.avatar || '',
      rollNumber: student.rollNumber || '',
      classIds: student.classes?.map(c => c.id) || [],
      sectionIds: student.sections?.map(s => s.id) || []
    });
    setSelectedStudentId(student.id);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`
        }
      });
      if (res.ok) {
        fetchStudents();
      } else {
        alert('Failed to delete student.');
      }
    } catch (e) {
      alert('Error deleting student.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (modalMode === 'view') return;
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    setUploadingAvatar(true);
    try {
      const response = await fetch(`${API_BASE_URL}/general/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`
        },
        body: formData
      });
      const result = await response.json();
      if (result.statusCode === 200 && result.data?.url) {
        setNewStudent(prev => ({ ...prev, avatar: result.data.url }));
      } else {
        alert('Failed to upload image.');
      }
    } catch (err) {
      alert('Error uploading image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSchoolId || modalMode === 'view') return;
    setActionLoading(true);
    
    const payload: any = {
      ...newStudent,
      role: 'student',
      schoolId: userSchoolId,
    };

    if (modalMode === 'edit' && !payload.password) {
      delete payload.password;
    }

    try {
      const url = modalMode === 'edit' && selectedStudentId 
        ? `${API_BASE_URL}/admin/users/${selectedStudentId}`
        : `${API_BASE_URL}/admin/users`;
        
      const response = await fetch(url, {
        method: modalMode === 'edit' ? 'PUT' : 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchStudents();
      } else {
        const errorData = await response.json();
        alert(`Failed to save: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert("Error saving.");
    } finally {
      setActionLoading(false);
    }
  };

  // Derived sections based on selected class
  const availableSections = filterClass 
    ? sectionsData.filter(s => s.classId === filterClass)
    : sectionsData;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Students
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Manage and view student records</p>
        </div>
        <button className="btn btn-primary gap-2" onClick={openAddModal} style={{ boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>
          <Plus size={18} /> Add Student
        </button>
      </div>

      <div className="data-table-wrapper glass-card">
        <div className="data-table-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div className="search-bar" style={{ display: 'flex', width: '300px', border: '1px solid var(--border)', borderRadius: '9999px', overflow: 'hidden', padding: '0 1rem', height: '40px', background: 'var(--background)' }}>
              <Search size={18} style={{ color: 'var(--muted-foreground)', marginRight: '0.5rem', marginTop: 'auto', marginBottom: 'auto' }} />
              <input 
                type="text" 
                placeholder="Search by name, email or roll..." 
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', color: 'var(--foreground)' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn" onClick={() => setShowFilters(!showFilters)} style={{ border: '1px solid var(--border)', gap: '0.5rem', background: showFilters ? 'var(--primary)' : 'var(--card)', color: showFilters ? 'var(--primary-foreground)' : 'var(--foreground)' }}>
              <Filter size={18} /> Filters
            </button>
          </div>
          
          {showFilters && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Class</label>
                <select 
                  className="input" 
                  value={filterClass} 
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setFilterSection('');
                    setPage(1);
                  }}
                  style={{ height: '40px' }}
                >
                  <option value="">All Classes</option>
                  {classesData.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Section</label>
                <select 
                  className="input" 
                  value={filterSection} 
                  onChange={(e) => {
                    setFilterSection(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '40px' }}
                  disabled={!filterClass}
                >
                  <option value="">All Sections</option>
                  {availableSections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Status</label>
                <select 
                  className="input" 
                  value={filterIsActive} 
                  onChange={(e) => {
                    setFilterIsActive(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '40px' }}
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>SL No.</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Roll No</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Class & Section</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                      <p style={{ color: 'var(--muted-foreground)' }}>Loading students data...</p>
                    </div>
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((student, index) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>{(page - 1) * limit + index + 1}</td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>{student.rollNumber || 'N/A'}</td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: 'var(--muted)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {student.avatar ? (
                            <img src={student.avatar} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '1rem', fontWeight: 600 }}>{student.name.charAt(0)}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{student.name}</span>
                          <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{student.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          Class: {student.classes?.map(c => c.name).join(', ') || 'N/A'}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                          Sec: {student.sections?.map(s => s.name).join(', ') || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span className={`badge ${student.isActive ? 'badge-success' : 'badge-destructive'}`}>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <div className="action-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button className="action-btn" title="View" onClick={() => openViewModal(student)}><Eye size={16} /></button>
                        <button className="action-btn" title="Edit" onClick={() => openEditModal(student)}><Edit size={16} /></button>
                        <button className="action-btn" style={{ color: 'var(--destructive)' }} title="Delete" onClick={() => handleDelete(student.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Search size={40} style={{ color: 'var(--border)', marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>No students found</p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Try adjusting your search query or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} students
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn" 
                style={{ padding: '0.5rem', border: '1px solid var(--border)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                className="btn" 
                style={{ padding: '0.5rem', border: '1px solid var(--border)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '700px', borderRadius: '1rem', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                {modalMode === 'add' ? 'Add New Student' : modalMode === 'edit' ? 'Edit Student' : 'View Student'}
              </h2>
              <button className="action-btn" onClick={() => setIsModalOpen(false)} disabled={actionLoading}>
                <X size={20} />
              </button>
            </div>
            <div style={{ overflowY: 'auto' }}>
              <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Name *</label>
                    <input type="text" className="input" value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} required disabled={actionLoading || modalMode === 'view'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Email *</label>
                    <input type="email" className="input" value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})} required disabled={actionLoading || modalMode === 'view'} />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {modalMode !== 'view' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Password {modalMode === 'add' && '*'}</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input type={showPassword ? "text" : "password"} className="input" style={{ width: '100%', paddingRight: '2.5rem' }} value={newStudent.password} onChange={(e) => setNewStudent({...newStudent, password: e.target.value})} required={modalMode === 'add'} disabled={actionLoading} placeholder={modalMode === 'edit' ? "Leave blank to keep current" : ""} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Phone</label>
                    <input type="text" className="input" value={newStudent.phone} onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})} disabled={actionLoading || modalMode === 'view'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Designation</label>
                    <input type="text" className="input" value={newStudent.designation} onChange={(e) => setNewStudent({...newStudent, designation: e.target.value})} disabled={actionLoading || modalMode === 'view'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Roll Number</label>
                    <input type="text" className="input" value={newStudent.rollNumber} onChange={(e) => setNewStudent({...newStudent, rollNumber: e.target.value})} disabled={actionLoading || modalMode === 'view'} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Classes</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.5rem', minHeight: '60px' }}>
                      {classesData.map(c => (
                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                          <input 
                            type="checkbox" 
                            checked={newStudent.classIds.includes(c.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setNewStudent(prev => ({
                                ...prev,
                                classIds: checked 
                                  ? [...prev.classIds, c.id] 
                                  : prev.classIds.filter(id => id !== c.id)
                              }));
                            }}
                            disabled={actionLoading || modalMode === 'view'}
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Sections</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.5rem', minHeight: '60px' }}>
                      {sectionsData.filter(s => newStudent.classIds.includes(s.classId)).map(s => (
                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                          <input 
                            type="checkbox" 
                            checked={newStudent.sectionIds.includes(s.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setNewStudent(prev => ({
                                ...prev,
                                sectionIds: checked 
                                  ? [...prev.sectionIds, s.id] 
                                  : prev.sectionIds.filter(id => id !== s.id)
                              }));
                            }}
                            disabled={actionLoading || modalMode === 'view'}
                          />
                          {s.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Avatar Image</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label className="btn" style={{ border: '1px solid var(--border)', background: 'var(--card)', cursor: modalMode === 'view' ? 'default' : 'pointer', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: modalMode === 'view' ? 0.5 : 1 }}>
                      {uploadingAvatar ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                      {uploadingAvatar ? 'Uploading...' : 'Upload Image'}
                      <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={actionLoading || uploadingAvatar || modalMode === 'view'} />
                    </label>
                    {newStudent.avatar && (
                      <div style={{ width: '40px', height: '40px', borderRadius: '0.25rem', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                        <img src={newStudent.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                </div>
                
                {modalMode !== 'view' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <button type="button" className="btn" style={{ border: '1px solid var(--border)' }} onClick={() => setIsModalOpen(false)} disabled={actionLoading}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                      {actionLoading && <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/>} 
                      {modalMode === 'add' ? 'Add Student' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
