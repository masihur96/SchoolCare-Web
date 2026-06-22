"use client";

import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, AlertCircle, Info } from 'lucide-react';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

interface Student {
  id: string;
  name: string;
  rollNumber: string;
}

interface Routine {
  id: string;
  classEntity: { id: string; name: string };
  sectionEntity: { id: string; name: string };
  subjectEntity: { name: string; code?: string };
  startTime: string;
  endTime: string;
}

interface AttendanceModalProps {
  routine: Routine;
  onClose: () => void;
}

export default function AttendanceModal({ routine, onClose }: AttendanceModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [isAttendanceTaken, setIsAttendanceTaken] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Students
  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const headers = {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`
        };
        const res = await fetch(`${API_BASE_URL}/admin/users?role=student&limit=1000&classId=${routine.classEntity.id}&sectionId=${routine.sectionEntity.id}`, { headers });
        const json = await res.json();
        
        let fetchedStudents: Student[] = [];
        if (json.data?.data && Array.isArray(json.data.data)) {
          fetchedStudents = json.data.data;
        } else if (json.data && Array.isArray(json.data)) {
          fetchedStudents = json.data;
        } else if (Array.isArray(json)) {
          fetchedStudents = json;
        }
        
        fetchedStudents.sort((a, b) => {
          const rA = parseInt(a.rollNumber) || 0;
          const rB = parseInt(b.rollNumber) || 0;
          return rA - rB;
        });

        setStudents(fetchedStudents);
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to load students.');
      } finally {
        setLoadingStudents(false);
      }
    };
    
    fetchStudents();
  }, [routine]);

  // Fetch Existing Attendance
  useEffect(() => {
    if (students.length === 0) return;
    
    const fetchExistingAttendance = async () => {
      setLoadingAttendance(true);
      setIsAttendanceTaken(false);
      try {
        const headers = { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` };
        const res = await fetch(`${API_BASE_URL}/admin/attendance/period?routineId=${routine.id}&date=${date}&limit=1000`, { headers });
        const json = await res.json();
        
        let records: any[] = [];
        if (json.data?.data && Array.isArray(json.data.data)) {
          records = json.data.data;
        } else if (json.data && Array.isArray(json.data)) {
          records = json.data;
        } else if (Array.isArray(json)) {
          records = json;
        }
        
        const newAtt: Record<string, string> = {};
        let taken = false;
        
        if (records.length > 0) {
          taken = true;
          records.forEach(r => {
            if (r.studentId && r.status) {
              newAtt[r.studentId] = r.status.toLowerCase();
            }
          });
        }
        
        // Fill missing students with 'present' default
        students.forEach(s => {
          if (!newAtt[s.id]) {
            newAtt[s.id] = 'present';
          }
        });
        
        setAttendance(newAtt);
        setIsAttendanceTaken(taken);
      } catch (err) {
        console.error("Failed to fetch existing attendance:", err);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchExistingAttendance();
  }, [students, routine.id, date]);

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    const records = Object.keys(attendance).map(studentId => ({
      studentId,
      status: attendance[studentId]
    }));
    
    const payload = {
      routineId: routine.id,
      date,
      records
    };
    
    try {
      const res = await fetch(`${API_BASE_URL}/admin/attendance/period`, {
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
        setSuccessMsg('Attendance submitted successfully!');
        setIsAttendanceTaken(true); // Since we just submitted it
        setTimeout(() => onClose(), 1500);
      } else {
        setErrorMsg(json.message || 'Failed to submit attendance.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred during submission.');
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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>Take Attendance</h2>
              {isAttendanceTaken && !loadingAttendance && (
                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <Check size={14} /> Already Taken
                </span>
              )}
            </div>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--muted-foreground)' }}>
              {routine.subjectEntity?.name} • {routine.classEntity?.name} ({routine.sectionEntity?.name})
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '0.5rem' }}>
            <X size={24} />
          </button>
        </div>
        
        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--card)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Attendance Date:</label>
            <input 
              type="date" 
              className="input" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              style={{ width: 'auto', height: '36px' }}
            />
          </div>

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

          {loadingStudents || loadingAttendance ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', gap: '1rem' }}>
              <Loader2 size={32} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--muted-foreground)' }}>{loadingStudents ? 'Loading assigned students...' : 'Loading existing attendance...'}</p>
            </div>
          ) : students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted-foreground)' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)' }}>No students found</p>
              <p>There are no students assigned to this class and section.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Roll No</th>
                  <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Student Name</th>
                  <th style={{ textAlign: 'center', padding: '1rem', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{student.rollNumber || '-'}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{student.name}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {['present', 'absent', 'late', 'leave'].map(status => {
                          const isSelected = attendance[student.id] === status;
                          let bg = 'var(--background)';
                          let color = 'var(--foreground)';
                          let borderColor = 'var(--border)';
                          
                          if (isSelected) {
                            color = 'white';
                            if (status === 'present') { bg = '#10b981'; borderColor = '#10b981'; }
                            if (status === 'absent') { bg = '#ef4444'; borderColor = '#ef4444'; }
                            if (status === 'late') { bg = '#f59e0b'; borderColor = '#f59e0b'; }
                            if (status === 'leave') { bg = '#8b5cf6'; borderColor = '#8b5cf6'; }
                          }
                          
                          return (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(student.id, status)}
                              style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '9999px',
                                border: `1px solid ${borderColor}`,
                                background: bg,
                                color: color,
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                              }}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)' }}>
          <div>
            {isAttendanceTaken && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Info size={14} /> You can update existing attendance by re-submitting.
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn" onClick={onClose} disabled={submitting} style={{ border: '1px solid var(--border)', background: 'transparent' }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || students.length === 0 || loadingStudents || loadingAttendance} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (submitting || students.length === 0 || loadingStudents || loadingAttendance) ? 0.7 : 1 }}>
              {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={18} />}
              {submitting ? 'Submitting...' : isAttendanceTaken ? 'Update Attendance' : 'Submit Attendance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
