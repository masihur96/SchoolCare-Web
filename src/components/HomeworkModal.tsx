"use client";

import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, AlertCircle, FileText } from 'lucide-react';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

interface Routine {
  id: string;
  classEntity: { id: string; name: string };
  sectionEntity: { id: string; name: string };
  subjectEntity: { id: string; name: string; code?: string };
  teacherEntity: { id: string; name: string };
  startTime: string;
  endTime: string;
}

interface HomeworkModalProps {
  routine: Routine;
  onClose: () => void;
}

export default function HomeworkModal({ routine, onClose }: HomeworkModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Assigned');
  const [studentId, setStudentId] = useState('All');
  const [students, setStudents] = useState<any[]>([]);
  
  const [isExisting, setIsExisting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(getApiToken().split('.')[1]));
      return payload.schoolId;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const fetchStudents = async () => {
      const schoolId = getUserSchoolId();
      if (!schoolId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/admin/users?role=student&limit=1000&schoolId=${schoolId}`, {
          headers: { 'Authorization': `Bearer ${getApiToken()}` }
        });
        const json = await res.json();
        let allStudents = json.data?.data || json.data || [];
        const sectionStudents = allStudents.filter((st: any) => 
          st.sections?.some((sec: any) => sec.id === routine.sectionEntity?.id)
        );
        setStudents(sectionStudents);
      } catch (err) {
        console.error(err);
      }
    };
    if (routine.sectionEntity?.id) {
      fetchStudents();
    }
  }, [routine.sectionEntity?.id]);

  useEffect(() => {
    const fetchExistingHomework = async () => {
      if (!dueDate) return;
      const schoolId = getUserSchoolId();
      if (!schoolId) return;

      setLoading(true);
      setIsExisting(false);
      
      try {
        const queryParams = new URLSearchParams({
          classId: routine.classEntity?.id || '',
          sectionId: routine.sectionEntity?.id || '',
          subjectId: routine.subjectEntity?.id || '',
          date: dueDate,
          schoolId: schoolId
        });
        if (studentId !== 'All') {
          queryParams.append('studentId', studentId);
        }
        
        const headers = { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` };
        const res = await fetch(`${API_BASE_URL}/admin/homework?${queryParams.toString()}`, { headers });
        const json = await res.json();
        
        let records: any[] = [];
        if (json.data?.data && Array.isArray(json.data.data)) {
          records = json.data.data;
        } else if (json.data && Array.isArray(json.data)) {
          records = json.data;
        } else if (Array.isArray(json)) {
          records = json;
        }
        
        if (records.length > 0) {
          const hw = records[0];
          setTitle(hw.title || '');
          setDescription(hw.description || '');
          if (hw.status) setStatus(hw.status);
          setIsExisting(true);
        } else {
          setTitle('');
          setDescription('');
          setStatus('Assigned');
          setIsExisting(false);
        }
      } catch (err) {
        console.error("Failed to fetch existing homework:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchExistingHomework();
  }, [dueDate, routine.classEntity?.id, routine.sectionEntity?.id, routine.subjectEntity?.id, studentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !dueDate) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    const schoolId = getUserSchoolId();
    if (!schoolId) {
      setErrorMsg('Authentication error. Could not retrieve School ID.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    const payload: any = {
      classId: routine.classEntity?.id,
      subjectId: routine.subjectEntity?.id,
      teacherId: routine.teacherEntity?.id,
      title,
      description,
      dueDate,
      sectionId: routine.sectionEntity?.id,
      schoolId,
      status
    };
    
    if (studentId !== 'All') {
      payload.studentId = studentId;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/admin/homework`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (res.ok && (json.statusCode === 201 || json.statusCode === 200)) {
        setSuccessMsg('Homework assigned successfully!');
        setTimeout(() => onClose(), 1500);
      } else {
        setErrorMsg(json.message || 'Failed to assign homework.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content">
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <FileText size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>Assign Homework</h2>
                  {isExisting && !loading && (
                    <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <Check size={14} /> Already Assigned
                    </span>
                  )}
                </div>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--muted-foreground)' }}>
                  {routine.subjectEntity?.name} • {routine.classEntity?.name} ({routine.sectionEntity?.name})
                </p>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '0.5rem' }}>
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
            <div style={{ padding: '1rem', background: '#10b981', color: 'white', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={18} /> {successMsg}
            </div>
          )}

          <form id="homework-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)' }}>Homework Title <span style={{ color: 'var(--destructive)' }}>*</span></label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Mathematics Chapter 3 – Algebra"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)' }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)' }}>Description / Instructions <span style={{ color: 'var(--destructive)' }}>*</span></label>
              <textarea 
                className="input" 
                placeholder="e.g. Solve exercises 1 to 10 from Chapter 3."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', resize: 'vertical' }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)' }}>Student</label>
                <select 
                  className="input" 
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)' }}
                >
                  <option value="All">All Students</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Roll: {s.rollNumber || 'N/A'})</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)' }}>Status</label>
                <select 
                  className="input" 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)' }}
                >
                  <option value="Assigned">Assigned</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Late">Late</option>
                </select>
              </div>

              <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)' }}>Due Date <span style={{ color: 'var(--destructive)' }}>*</span></label>
                <input 
                  type="date" 
                  className="input" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)' }}
                  required
                />
              </div>
            </div>

          </form>

        </div>
        
        {/* Footer */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--card)' }}>
          <button type="button" className="btn" onClick={onClose} disabled={submitting} style={{ border: '1px solid var(--border)', background: 'transparent' }}>
            Cancel
          </button>
          <button type="submit" form="homework-form" className="btn btn-primary" disabled={submitting || loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (submitting || loading) ? 0.7 : 1 }}>
            {(submitting || loading) ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={18} />}
            {submitting ? 'Assigning...' : isExisting ? 'Update Homework' : 'Assign Homework'}
          </button>
        </div>
      </div>
    </div>
  );
}
