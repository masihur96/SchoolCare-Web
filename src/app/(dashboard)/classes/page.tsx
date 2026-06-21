"use client";

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Layers, BookOpen, Loader2, Eye, X } from 'lucide-react';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkYTBjM2ZmZi1hZTU5LTQ2YTMtYTAzNy0xOWZhNjgwMDNjNmIiLCJyb2xlIjoiYWRtaW4iLCJzY2hvb2xJZCI6IjI5ZjA1ZWRiLThlMGItNDM0Yy1hNDcxLWFhNzc2MzA4YTFjMSIsImNsYXNzSWRzIjpbXSwic2VjdGlvbklkcyI6W10sImlhdCI6MTc4MjAxOTkxMSwiZXhwIjoxNzgyMTA2MzExfQ.Q6MlzH1TyhbM2HurOeEqvCvOUZfOKIQ8DPCL50E42Z8';

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

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Partial<ClassEntity> | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingClass, setViewingClass] = useState<ProcessedClass | null>(null);

  // Decode user school ID from token
  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(API_TOKEN.split('.')[1]));
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
        'Authorization': `Bearer ${API_TOKEN}`
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
          // filter unique names for sections if desired, or keep objects
          const uniqueSections = Array.from(new Map(clsSections.map(item => [item.name, item])).values());
          
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

      // Sort classes alphabetically by name
      mappedClasses.sort((a, b) => a.name.localeCompare(b.name));

      setClassesData(mappedClasses);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editingClass.id) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/classes/${editingClass.id}`, {
        method: 'PUT',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingClass.name,
          description: editingClass.description
        })
      });

      if (response.ok) {
        setIsEditModalOpen(false);
        fetchData(); // Refresh list
      } else {
        console.error("Failed to update class", await response.text());
        alert("Failed to update class. Please try again.");
      }
    } catch (err) {
      console.error(err);
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
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${API_TOKEN}`
        }
      });

      if (response.ok) {
        setIsDeleteModalOpen(false);
        fetchData(); // Refresh list
      } else {
        console.error("Failed to delete class", await response.text());
        alert("Failed to delete class. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting class.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredClasses = classesData.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <button className="btn" style={{ background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Add Section
          </button>
          <button className="btn" style={{ background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Add Subject
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>
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
                        <Layers size={18} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{c.students}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <div className="action-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button 
                          className="action-btn" 
                          title="View Class"
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

      {/* View Modal */}
      {isViewModalOpen && viewingClass && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '600px', borderRadius: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
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
                {/* Assigned Sections */}
                <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Layers size={18} style={{ color: 'var(--primary)' }}/> Sections
                    </h4>
                    <span className="badge badge-primary">{viewingClass.sections.length}</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {viewingClass.sections.length > 0 ? viewingClass.sections.map(s => (
                      <li key={s.id} style={{ padding: '0.5rem 0.75rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
                        {s.name}
                      </li>
                    )) : <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>No sections assigned</p>}
                  </ul>
                </div>

                {/* Assigned Subjects */}
                <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BookOpen size={18} style={{ color: 'var(--primary)' }}/> Subjects
                    </h4>
                    <span className="badge badge-primary">{viewingClass.subjects.length}</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {viewingClass.subjects.length > 0 ? viewingClass.subjects.map(s => (
                      <li key={s.id} style={{ padding: '0.5rem 0.75rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
                        {s.name}
                      </li>
                    )) : <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>No subjects assigned</p>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingClass && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Edit Class</h2>
              <button className="action-btn" onClick={() => setIsEditModalOpen(false)} disabled={actionLoading}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Class Name</label>
                <input 
                  type="text" 
                  className="input" 
                  value={editingClass.name || ''} 
                  onChange={(e) => setEditingClass({...editingClass, name: e.target.value})}
                  required
                  disabled={actionLoading}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                <textarea 
                  className="input" 
                  style={{ minHeight: '80px', padding: '0.75rem', resize: 'vertical' }}
                  value={editingClass.description || ''} 
                  onChange={(e) => setEditingClass({...editingClass, description: e.target.value})}
                  disabled={actionLoading}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn" style={{ border: '1px solid var(--border)', background: 'var(--background)' }} onClick={() => setIsEditModalOpen(false)} disabled={actionLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card animate-fade-in" style={{ background: 'var(--card)', width: '100%', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--destructive)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <Trash2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Delete Class</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Are you sure you want to delete this class? This action cannot be undone.</p>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--background)', display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn" style={{ flex: 1, border: '1px solid var(--border)', background: 'var(--card)' }} onClick={() => setIsDeleteModalOpen(false)} disabled={actionLoading}>
                Cancel
              </button>
              <button className="btn" style={{ flex: 1, background: 'var(--destructive)', color: 'white' }} onClick={handleDeleteConfirm} disabled={actionLoading}>
                {actionLoading ? <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }}/> : null}
                Confirm Delete
              </button>
            </div>
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
