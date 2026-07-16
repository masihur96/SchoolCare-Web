"use client";

import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

interface TeacherEntity {
  id: string;
  name: string;
}

interface CreateTeacherAttendanceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTeacherAttendanceModal({ onClose, onSuccess }: CreateTeacherAttendanceModalProps) {
  const [teachers, setTeachers] = useState<TeacherEntity[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [teacherId, setTeacherId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('clock-in');
  const [startTimeStr, setStartTimeStr] = useState('08:00');
  const [endTimeStr, setEndTimeStr] = useState('14:00');

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const headers = { 'accept': '*/*', 'Authorization': `Bearer ${getApiToken()}` };
        const res = await fetch(`${API_BASE_URL}/admin/users?role=teacher&limit=1000`, { headers });
        const json = await res.json();
        const data = json.data?.data || json.data || json || [];
        setTeachers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to load teachers.');
      } finally {
        setLoadingTeachers(false);
      }
    };
    fetchTeachers();
  }, []);

  const handleSubmit = async () => {
    if (!teacherId) {
      setErrorMsg('Please select a teacher.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Create full ISO strings for times based on selected date
      const startDateTime = new Date(`${date}T${startTimeStr}:00`).toISOString();
      let endDateTime = null;
      if (endTimeStr) {
        endDateTime = new Date(`${date}T${endTimeStr}:00`).toISOString();
      }

      const payload = {
        teacherId,
        date,
        status,
        startTime: startDateTime,
        endTime: endDateTime,
        time: startDateTime
      };

      const res = await fetch(`${API_BASE_URL}/admin/teacher-attendance`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (e) {}
      
      if (res.ok) {
        setSuccessMsg('Attendance created successfully!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(json.message || json.error || 'Failed to create attendance.');
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
      <div className="modal-content" style={{ maxWidth: '500px', width: '100%' }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>Create Attendance</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '0.5rem' }}>
            <X size={24} />
          </button>
        </div>
        
        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {errorMsg && (
            <div style={{ padding: '1rem', background: 'var(--destructive)', color: 'white', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}
          
          {successMsg && (
            <div style={{ padding: '1rem', background: '#10b981', color: 'white', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={18} /> {successMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>Teacher</label>
            <select 
              className="input" 
              value={teacherId} 
              onChange={(e) => setTeacherId(e.target.value)}
              disabled={loadingTeachers}
            >
              <option value="">Select a teacher</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>Date</label>
            <input 
              type="date" 
              className="input" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>Status</label>
            <select 
              className="input" 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="clock-in">Clock In</option>
              <option value="clock-out">Clock Out</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>Start Time</label>
              <input 
                type="time" 
                className="input" 
                value={startTimeStr} 
                onChange={(e) => setStartTimeStr(e.target.value)} 
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>End Time</label>
              <input 
                type="time" 
                className="input" 
                value={endTimeStr} 
                onChange={(e) => setEndTimeStr(e.target.value)} 
              />
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--card)' }}>
          <button className="btn" onClick={onClose} disabled={submitting} style={{ border: '1px solid var(--border)', background: 'transparent' }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={18} />}
            {submitting ? 'Creating...' : 'Create Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
}
