"use client";

import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, Users, Loader2 } from 'lucide-react';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

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

interface SectionEntity {
  id: string;
  name: string;
  classId: string;
}

interface StudentEntity {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  rollNumber?: string;
  roll_number?: string;
}

interface ExamRoutineModalProps {
  exam: Exam;
  onClose: () => void;
}

export default function ExamRoutineModal({ exam, onClose }: ExamRoutineModalProps) {
  const [activeTab, setActiveTab] = useState<'routine' | 'results'>('routine');
  
  // Results Tab State
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [sections, setSections] = useState<SectionEntity[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [marksForm, setMarksForm] = useState<Record<string, { marksObtained: number | string, totalMarks: number | string, loading?: boolean }>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  
  const [students, setStudents] = useState<StudentEntity[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Derived unique classes from exam assignments
  const uniqueClasses = Array.from(
    new Map(
      exam.assignments
        ?.filter(a => a.class?.uuid && a.class?.name)
        .map(a => [a.class.uuid, a.class])
    ).values()
  );

  const classSubjects = Array.from(
    new Map(
      exam.assignments
        ?.filter(a => a.class?.uuid === selectedClassId && a.subject?.uuid)
        .map(a => [a.subject.uuid, a.subject])
    ).values()
  );

  const handleSaveMarks = async (studentId: string) => {
    const form = marksForm[studentId];
    if (!form || form.marksObtained === '' || form.totalMarks === '') {
      alert('Please enter both marks obtained and total marks');
      return;
    }

    const assignment = exam.assignments.find(a => a.class?.uuid === selectedClassId && a.subject?.uuid === selectedSubjectId);
    if (!assignment || !assignment.examiner?.uuid) {
      alert('Examiner not found for this subject');
      return;
    }

    setMarksForm(prev => ({ ...prev, [studentId]: { ...prev[studentId], loading: true } }));

    try {
      const payload = {
        examId: exam.id,
        teacherId: assignment.examiner.uuid,
        schoolId: getUserSchoolId(),
        marks: [
          {
            studentId: studentId,
            subjectId: selectedSubjectId,
            marksObtained: Number(form.marksObtained),
            totalMarks: Number(form.totalMarks)
          }
        ]
      };

      const res = await fetch(`${API_BASE_URL}/admin/marks`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to save marks');
      }

      alert('Marks saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save marks');
    } finally {
      setMarksForm(prev => ({ ...prev, [studentId]: { ...prev[studentId], loading: false } }));
    }
  };

  const handleSaveAllMarks = async () => {
    const marksPayload = [];
    
    for (const student of students) {
      const form = marksForm[student.id];
      if (form && form.marksObtained !== '' && form.totalMarks !== '') {
        marksPayload.push({
          studentId: student.id,
          subjectId: selectedSubjectId,
          marksObtained: Number(form.marksObtained),
          totalMarks: Number(form.totalMarks)
        });
      }
    }

    if (marksPayload.length === 0) {
      alert('No marks entered to save');
      return;
    }

    const assignment = exam.assignments.find(a => a.class?.uuid === selectedClassId && a.subject?.uuid === selectedSubjectId);
    if (!assignment || !assignment.examiner?.uuid) {
      alert('Examiner not found for this subject');
      return;
    }

    setIsSavingAll(true);

    try {
      const payload = {
        examId: exam.id,
        teacherId: assignment.examiner.uuid,
        schoolId: getUserSchoolId(),
        marks: marksPayload
      };

      const res = await fetch(`${API_BASE_URL}/admin/marks`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${getApiToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to save all marks');
      }

      alert('All marks saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save all marks');
    } finally {
      setIsSavingAll(false);
    }
  };

  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(getApiToken().split('.')[1]));
      return payload.schoolId;
    } catch (e) {
      return null;
    }
  };

  // Fetch sections when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      setSelectedSubjectId('');
      setStudents([]);
      return;
    }

    const fetchSections = async () => {
      setLoadingSections(true);
      setSelectedSectionId('');
      setSelectedSubjectId('');
      setStudents([]);
      try {
        const userSchoolId = getUserSchoolId();
        const res = await fetch(`${API_BASE_URL}/admin/sections?schoolId=${userSchoolId}&limit=1000`, {
          headers: {
            'accept': '*/*',
            'Authorization': `Bearer ${getApiToken()}`
          }
        });
        const json = await res.json();
        let fetchedSections: SectionEntity[] = json.data?.data || json.data || json || [];
        if (!Array.isArray(fetchedSections)) fetchedSections = [];
        
        // Filter sections for the selected class
        const classSections = fetchedSections.filter(s => s.classId === selectedClassId);
        setSections(classSections);
      } catch (err) {
        console.error('Failed to fetch sections:', err);
      } finally {
        setLoadingSections(false);
      }
    };

    fetchSections();
  }, [selectedClassId]);

  // Fetch students when section changes
  useEffect(() => {
    if (!selectedClassId || !selectedSectionId) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await fetch(`${API_BASE_URL}/general/students/${selectedClassId}?sectionId=${selectedSectionId}`, {
          headers: {
            'accept': '*/*',
            'Authorization': `Bearer ${getApiToken()}`
          }
        });
        const json = await res.json();
        let fetchedStudents: StudentEntity[] = json.data?.data || json.data || json || [];
        if (!Array.isArray(fetchedStudents)) fetchedStudents = [];
        setStudents(fetchedStudents);
      } catch (err) {
        console.error('Failed to fetch students:', err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedClassId, selectedSectionId]);

  useEffect(() => {
    if (!selectedClassId || !selectedSectionId || !selectedSubjectId || students.length === 0) {
      return;
    }

    const fetchMarks = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/marks?examId=${exam.id}`, {
          headers: {
            'accept': '*/*',
            'Authorization': `Bearer ${getApiToken()}`
          }
        });
        const json = await res.json();
        
        const marksData = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
        
        const newMarksForm: Record<string, any> = {};
        
        marksData.forEach((mark: any) => {
          if (mark.subjectId === selectedSubjectId) {
            newMarksForm[mark.studentId] = {
              marksObtained: mark.marksObtained,
              totalMarks: mark.totalMarks
            };
          }
        });

        setMarksForm(prev => {
          const merged = { ...prev };
          for (const studentId of Object.keys(newMarksForm)) {
            if (!merged[studentId] || merged[studentId].marksObtained === '' || merged[studentId].totalMarks === '') {
              merged[studentId] = newMarksForm[studentId];
            }
          }
          return merged;
        });
      } catch (err) {
        console.error('Failed to fetch existing marks:', err);
      }
    };

    fetchMarks();
  }, [exam.id, selectedClassId, selectedSectionId, selectedSubjectId, students]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBA';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content" style={{ maxWidth: '72rem', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.015)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <FileText size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                {exam.exam_name}
              </h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                {formatDate(exam.start_date)} - {formatDate(exam.end_date)}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '0.5rem', borderRadius: '0.5rem', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='var(--muted)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 1.5rem', background: 'var(--background)' }}>
          <button 
            onClick={() => setActiveTab('routine')}
            style={{ 
              padding: '1rem 1.5rem', 
              border: 'none', 
              background: 'transparent', 
              fontWeight: 600, 
              fontSize: '0.95rem',
              color: activeTab === 'routine' ? 'var(--primary)' : 'var(--muted-foreground)',
              borderBottom: activeTab === 'routine' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Calendar size={18} /> Exam Routine
          </button>
          <button 
            onClick={() => setActiveTab('results')}
            style={{ 
              padding: '1rem 1.5rem', 
              border: 'none', 
              background: 'transparent', 
              fontWeight: 600, 
              fontSize: '0.95rem',
              color: activeTab === 'results' ? 'var(--primary)' : 'var(--muted-foreground)',
              borderBottom: activeTab === 'results' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Users size={18} /> Manage Results
          </button>
        </div>
        
        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: 'var(--background)' }}>
          
          {activeTab === 'routine' && (
            <div className="animate-fade-in">
              {(!exam.assignments || exam.assignments.length === 0) ? (
                <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                  <Calendar size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                  <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No routine found</p>
                  <p>There are no subjects assigned to this exam yet.</p>
                </div>
              ) : (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)' }}>
                      <tr>
                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Date</th>
                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Class</th>
                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Subject</th>
                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Examiner</th>
                        <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Syllabus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exam.assignments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((assignment) => (
                        <tr key={assignment.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 500, color: 'var(--foreground)' }}>
                            {formatDate(assignment.date)}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--foreground)' }}>
                            {assignment.class?.name || '-'}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--foreground)', fontWeight: 500 }}>
                            {assignment.subject?.name || '-'}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                            {assignment.examiner?.name || '-'}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                            {assignment.syllabus || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'results' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
              
              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--card)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Select Class</label>
                  <select 
                    className="input" 
                    value={selectedClassId} 
                    onChange={(e) => setSelectedClassId(e.target.value)}
                  >
                    <option value="">-- Choose Class --</option>
                    {uniqueClasses.map(c => (
                      <option key={c.uuid} value={c.uuid}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    Select Section {loadingSections && <Loader2 size={12} className="animate-spin inline" />}
                  </label>
                  <select 
                    className="input" 
                    value={selectedSectionId} 
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    disabled={!selectedClassId || loadingSections}
                  >
                    <option value="">-- Choose Section --</option>
                    {sections.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Select Subject</label>
                  <select 
                    className="input" 
                    value={selectedSubjectId} 
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    disabled={!selectedClassId}
                  >
                    <option value="">-- Choose Subject --</option>
                    {classSubjects.map(s => (
                      <option key={s.uuid} value={s.uuid}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Students List */}
              <div style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                
                {!selectedClassId || !selectedSectionId || !selectedSubjectId ? (
                  <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--muted-foreground)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Users size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Select Class, Section and Subject</p>
                    <p>Choose a class, section and subject above to view students and manage results.</p>
                  </div>
                ) : loadingStudents ? (
                  <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--muted-foreground)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={32} className="animate-spin text-primary" style={{ marginBottom: '1rem' }} />
                    <p>Loading students...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--muted-foreground)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No students found</p>
                    <p>There are no students enrolled in this section.</p>
                  </div>
                ) : (
                  <div style={{ overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Roll No.</th>
                          <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Student Name</th>
                          <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Marks Obtained</th>
                          <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Total Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>
                              {student.rollNumber || student.roll_number || '-'}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.95rem', fontWeight: 500, color: 'var(--foreground)' }}>
                              {student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim()}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <input 
                                type="number" 
                                className="input" 
                                style={{ width: '100px', padding: '0.4rem 0.75rem', fontSize: '0.9rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--background)' }} 
                                placeholder="0"
                                value={marksForm[student.id]?.marksObtained ?? ''}
                                onChange={(e) => setMarksForm(prev => ({ ...prev, [student.id]: { ...prev[student.id], marksObtained: e.target.value } }))}
                              />
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <input 
                                type="number" 
                                className="input" 
                                style={{ width: '100px', padding: '0.4rem 0.75rem', fontSize: '0.9rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--background)' }} 
                                placeholder="100"
                                value={marksForm[student.id]?.totalMarks ?? ''}
                                onChange={(e) => setMarksForm(prev => ({ ...prev, [student.id]: { ...prev[student.id], totalMarks: e.target.value } }))}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: 0, zIndex: 10 }}>
                      <button 
                        className="btn" 
                        style={{ padding: '0.6rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isSavingAll ? 'not-allowed' : 'pointer', opacity: isSavingAll ? 0.7 : 1 }}
                        onClick={handleSaveAllMarks}
                        disabled={isSavingAll}
                      >
                        {isSavingAll ? <Loader2 size={16} className="animate-spin" /> : null}
                        Submit All Marks
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
