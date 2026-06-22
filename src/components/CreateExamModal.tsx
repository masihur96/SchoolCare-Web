"use client";

import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, AlertCircle, Plus, Trash2, Calendar } from 'lucide-react';

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
  schoolId?: string;
}

interface SubjectEntity {
  id: string;
  name: string;
  classId: string;
  code?: string;
}

interface TeacherEntity {
  id: string;
  name: string;
}

interface AssignmentInput {
  id: string | number;
  class_uid: string;
  subject_uid: string;
  examiner_uid: string;
  date: string;
  syllabus: string;
}

interface Exam {
  id: string;
  exam_name: string;
  description: string;
  start_date: string;
  end_date: string;
  isPublished: boolean;
  assignments: {
    id: string;
    class: { name: string; uuid: string };
    subject: { name: string; uuid: string };
    examiner: { name: string; uuid: string };
    date: string;
    syllabus: string;
  }[];
}

interface CreateExamModalProps {
  examToEdit?: Exam | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateExamModal({ examToEdit, onClose, onSuccess }: CreateExamModalProps) {
  const [examName, setExamName] = useState(examToEdit?.exam_name || '');
  const [description, setDescription] = useState(examToEdit?.description || '');
  const [startDate, setStartDate] = useState(examToEdit?.start_date?.split('T')[0] || '');
  const [endDate, setEndDate] = useState(examToEdit?.end_date?.split('T')[0] || '');
  const [isPublished, setIsPublished] = useState(examToEdit?.isPublished || false);
  
  const [assignments, setAssignments] = useState<AssignmentInput[]>(
    examToEdit?.assignments && examToEdit.assignments.length > 0
      ? examToEdit.assignments.map(a => ({
          id: a.id,
          class_uid: a.class?.uuid || '',
          subject_uid: a.subject?.uuid || '',
          examiner_uid: a.examiner?.uuid || '',
          date: a.date?.split('T')[0] || '',
          syllabus: a.syllabus || ''
        }))
      : [{
          id: Date.now(),
          class_uid: '',
          subject_uid: '',
          examiner_uid: '',
          date: '',
          syllabus: ''
        }]
  );

  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [subjects, setSubjects] = useState<SubjectEntity[]>([]);
  const [teachers, setTeachers] = useState<TeacherEntity[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(getApiToken().split('.')[1]));
      return payload.schoolId;
    } catch (e) {
      return null;
    }
  };

  const userSchoolId = getUserSchoolId();

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const headers = {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`
        };
        
        const [classesRes, subjectsRes, teachersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/classes?schoolId=${userSchoolId}&limit=1000`, { headers }),
          fetch(`${API_BASE_URL}/admin/subjects?schoolId=${userSchoolId}&limit=1000`, { headers }),
          fetch(`${API_BASE_URL}/admin/users?role=teacher&limit=1000&schoolId=${userSchoolId}`, { headers })
        ]);
        
        const classesJson = await classesRes.json();
        const subjectsJson = await subjectsRes.json();
        const teachersJson = await teachersRes.json();
        
        let fetchedClasses = classesJson.data?.data || classesJson.data || classesJson || [];
        if (!Array.isArray(fetchedClasses)) fetchedClasses = [];
        if (userSchoolId) {
          fetchedClasses = fetchedClasses.filter((c: any) => c.schoolId === userSchoolId);
        }
        
        let fetchedSubjects = subjectsJson.data?.data || subjectsJson.data || subjectsJson || [];
        if (!Array.isArray(fetchedSubjects)) fetchedSubjects = [];
        
        let fetchedTeachers = teachersJson.data?.data || teachersJson.data || teachersJson || [];
        if (!Array.isArray(fetchedTeachers)) fetchedTeachers = [];
        
        setClasses(fetchedClasses);
        setSubjects(fetchedSubjects);
        setTeachers(fetchedTeachers);
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to load classes, subjects, or teachers.');
      } finally {
        setLoadingData(false);
      }
    };
    
    if (userSchoolId) {
      fetchData();
    }
  }, [userSchoolId]);

  const handleAddAssignment = () => {
    setAssignments([...assignments, {
      id: Date.now(),
      class_uid: '',
      subject_uid: '',
      examiner_uid: '',
      date: '',
      syllabus: ''
    }]);
  };

  const handleRemoveAssignment = (id: string | number) => {
    if (assignments.length === 1) return;
    setAssignments(assignments.filter(a => a.id !== id));
  };

  const updateAssignment = (id: string | number, field: keyof AssignmentInput, value: string) => {
    setAssignments(assignments.map(a => {
      if (a.id === id) {
        if (field === 'class_uid') {
          return { ...a, class_uid: value, subject_uid: '' };
        }
        return { ...a, [field]: value };
      }
      return a;
    }));
  };

  const handleSubmit = async () => {
    if (!examName || !startDate || !endDate) {
      setErrorMsg('Please fill in exam name, start date, and end date.');
      return;
    }

    // Validate assignments
    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      if (!a.class_uid || !a.subject_uid || !a.examiner_uid || !a.date) {
        setErrorMsg(`Please fill in all required fields for assignment #${i + 1}`);
        return;
      }
    }
    
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const payload = {
        exam_name: examName,
        description: description,
        start_date: startDate,
        end_date: endDate,
        isPublished: isPublished,
        assignments: assignments.map(a => {
          const payloadAssignment: any = {
            class_uid: a.class_uid,
            subject_uid: a.subject_uid,
            examiner_uid: a.examiner_uid,
            date: a.date,
            syllabus: a.syllabus || ''
          };
          if (examToEdit && typeof a.id === 'string') {
            payloadAssignment.id = a.id;
          }
          return payloadAssignment;
        })
      };

      const url = examToEdit 
        ? `${API_BASE_URL}/admin/exams/${examToEdit.id}`
        : `${API_BASE_URL}/admin/exams`;

      const res = await fetch(url, {
        method: examToEdit ? 'PUT' : 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.message || `Failed to ${examToEdit ? 'update' : 'create'} exam`);
      }
      
      setSuccessMsg(`Exam ${examToEdit ? 'updated' : 'created'} successfully!`);
      setTimeout(() => {
        onSuccess();
      }, 1500);
      
    } catch (err: any) {
      console.error(err);
      let errorText = err.message || 'An error occurred during submission.';
      if (Array.isArray(err.message)) {
          errorText = err.message.join(', ');
      }
      setErrorMsg(errorText);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content" style={{ maxWidth: '64rem' }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.015)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Calendar size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                {examToEdit ? 'Edit Exam' : 'Create New Exam'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                {examToEdit ? 'Update exam details and routines.' : 'Set up exam details and attach class/subject routines.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '0.5rem', borderRadius: '0.5rem', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='var(--muted)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <X size={24} />
          </button>
        </div>
        
        {/* Body */}
        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div style={{ padding: '1rem', background: 'var(--destructive)', color: 'white', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}
          
          {successMsg && (
            <div style={{ padding: '1rem', background: 'var(--success)', color: 'white', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={18} /> {successMsg}
            </div>
          )}

          {loadingData ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', gap: '1rem' }}>
              <Loader2 size={32} className="text-primary" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--muted-foreground)' }}>Loading form data...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Main Exam Info */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: 'white', fontSize: '0.75rem' }}>1</span>
                  Exam Details
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', background: 'var(--card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Exam Name *</label>
                    <input type="text" className="input" value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="e.g. Mid-Term Exam 2026" />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Description</label>
                    <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Briefly describe this exam..." style={{ minHeight: '80px', padding: '0.75rem' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Start Date *</label>
                    <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>End Date *</label>
                    <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                    <input type="checkbox" id="isPublished" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                    <label htmlFor="isPublished" style={{ fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>Publish Immediately (Visible to students/teachers)</label>
                  </div>
                </div>
              </div>

              {/* Assignments Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: '0.75rem' }}>2</span>
                    Assignments & Routines
                  </h3>
                  <button onClick={handleAddAssignment} className="btn" style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}>
                    <Plus size={16} /> Add Class
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {assignments.map((assignment, index) => (
                    <div key={assignment.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: '1rem', alignItems: 'end', background: 'rgba(0,0,0,0.015)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>Class *</label>
                        <select className="input" value={assignment.class_uid} onChange={(e) => updateAssignment(assignment.id, 'class_uid', e.target.value)} style={{ padding: '0.5rem', height: '38px', fontSize: '0.85rem' }}>
                          <option value="">Select Class</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>Subject *</label>
                        <select className="input" value={assignment.subject_uid} onChange={(e) => updateAssignment(assignment.id, 'subject_uid', e.target.value)} style={{ padding: '0.5rem', height: '38px', fontSize: '0.85rem' }} disabled={!assignment.class_uid}>
                          <option value="">Select Subject</option>
                          {subjects.filter(s => s.classId === assignment.class_uid).map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>Examiner *</label>
                        <select className="input" value={assignment.examiner_uid} onChange={(e) => updateAssignment(assignment.id, 'examiner_uid', e.target.value)} style={{ padding: '0.5rem', height: '38px', fontSize: '0.85rem' }}>
                          <option value="">Select Teacher</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>Exam Date *</label>
                        <input type="date" className="input" value={assignment.date} onChange={(e) => updateAssignment(assignment.id, 'date', e.target.value)} style={{ padding: '0.5rem', height: '38px', fontSize: '0.85rem' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>Syllabus</label>
                        <input type="text" className="input" value={assignment.syllabus} onChange={(e) => updateAssignment(assignment.id, 'syllabus', e.target.value)} placeholder="e.g. Chapter 1-5" style={{ padding: '0.5rem', height: '38px', fontSize: '0.85rem' }} />
                      </div>

                      <div style={{ paddingBottom: '2px' }}>
                        <button 
                          onClick={() => handleRemoveAssignment(assignment.id)} 
                          className="btn" 
                          disabled={assignments.length === 1}
                          style={{ width: '38px', height: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: assignments.length === 1 ? 'var(--muted)' : 'rgba(239, 68, 68, 0.1)', color: assignments.length === 1 ? 'var(--muted-foreground)' : 'var(--destructive)', border: 'none' }}
                          title="Remove assignment"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.015)' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn" onClick={onClose} disabled={submitting} style={{ border: '1px solid var(--border)', background: 'transparent' }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || loadingData} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {submitting ? 'Saving...' : examToEdit ? 'Update Exam' : 'Create Exam'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
