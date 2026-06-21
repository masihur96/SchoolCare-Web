"use client";

import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, AlertCircle, Calendar } from 'lucide-react';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkYTBjM2ZmZi1hZTU5LTQ2YTMtYTAzNy0xOWZhNjgwMDNjNmIiLCJyb2xlIjoiYWRtaW4iLCJzY2hvb2xJZCI6IjI5ZjA1ZWRiLThlMGItNDM0Yy1hNDcxLWFhNzc2MzA4YTFjMSIsImNsYXNzSWRzIjpbXSwic2VjdGlvbklkcyI6W10sImlhdCI6MTc4MjA0MzA3NiwiZXhwIjoxNzgyMTI5NDc2fQ.AaOYBh65Rkp88CvK1S2_1uRNfk2NSM1wEi8xKtedw48';

interface ClassEntity {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface SubjectEntity {
  id: string;
  name: string;
  code?: string;
}

interface TeacherEntity {
  id: string;
  name: string;
}

interface CreateRoutineModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function CreateRoutineModal({ onClose, onSuccess }: CreateRoutineModalProps) {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [subjects, setSubjects] = useState<SubjectEntity[]>([]);
  const [teachers, setTeachers] = useState<TeacherEntity[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(API_TOKEN.split('.')[1]));
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
          'Authorization': `Bearer ${API_TOKEN}`
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
        
        let fetchedSubjects = subjectsJson.data?.data || subjectsJson.data || subjectsJson || [];
        if (!Array.isArray(fetchedSubjects)) fetchedSubjects = [];
        
        let fetchedTeachers = teachersJson.data?.data || teachersJson.data || teachersJson || [];
        if (!Array.isArray(fetchedTeachers)) fetchedTeachers = [];
        
        setClasses(fetchedClasses);
        setSubjects(fetchedSubjects);
        setTeachers(fetchedTeachers);
        
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to load form data.');
      } finally {
        setLoadingData(false);
      }
    };
    
    if (userSchoolId) {
      fetchData();
    }
  }, [userSchoolId]);

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!selectedClassId || !selectedSectionId || !selectedSubjectId || !selectedTeacherId || selectedDays.length === 0 || !startTime || !endTime) {
      setErrorMsg('Please fill in all required fields and select at least one day.');
      return;
    }
    
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const headers = {
        'accept': '*/*',
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      };
      
      // Submit a request for each selected day
      const promises = selectedDays.map(day => {
        const payload = {
          classId: selectedClassId,
          sectionId: selectedSectionId,
          subjectId: selectedSubjectId,
          teacherId: selectedTeacherId,
          day: day,
          startTime: startTime,
          endTime: endTime,
          roomNumber: roomNumber || "TBA",
          schoolId: userSchoolId
        };
        
        return fetch(`${API_BASE_URL}/general/routine`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        }).then(async res => {
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.message || `Failed to create routine for ${day}`);
          }
          return json;
        });
      });
      
      await Promise.all(promises);
      
      setSuccessMsg('Routines created successfully!');
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

  const selectedClassObj = classes.find(c => c.id === selectedClassId);
  const availableSections = selectedClassObj?.sections || [];

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content">
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.015)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Calendar size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>Create Routine</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Assign a subject and teacher to specific timeslots</p>
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
            <div style={{ padding: '1rem', background: '#10b981', color: 'white', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={18} /> {successMsg}
            </div>
          )}

          {loadingData ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', gap: '1rem' }}>
              <Loader2 size={32} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--muted-foreground)' }}>Loading form data...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Class *</label>
                  <select className="input" value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSectionId(''); }} style={{ height: '44px' }}>
                    <option value="">Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Section *</label>
                  <select className="input" value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} disabled={!selectedClassId || availableSections.length === 0} style={{ height: '44px', opacity: selectedClassId ? 1 : 0.6 }}>
                    <option value="">Select Section</option>
                    {availableSections.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Subject *</label>
                  <select className="input" value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} style={{ height: '44px' }}>
                    <option value="">Select Subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Teacher *</label>
                  <select className="input" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} style={{ height: '44px' }}>
                    <option value="">Select Teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Start Time *</label>
                  <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ height: '44px' }} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>End Time *</label>
                  <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ height: '44px' }} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Room Number</label>
                  <input type="text" className="input" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. 101" style={{ height: '44px' }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Assign Days *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {DAYS_OF_WEEK.map(day => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => handleDayToggle(day)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '9999px',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'var(--primary)' : 'var(--background)',
                          color: isSelected ? 'white' : 'var(--foreground)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: isSelected ? '0 4px 10px -2px rgba(var(--primary-rgb), 0.3)' : 'none'
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
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
              {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={18} />}
              {submitting ? 'Creating...' : 'Create Routine'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
