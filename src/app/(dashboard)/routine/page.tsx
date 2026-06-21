"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, Loader2, BookOpen, User, Filter, CheckSquare, FileText } from 'lucide-react';
import AttendanceModal from '@/components/AttendanceModal';
import HomeworkModal from '@/components/HomeworkModal';
import CreateRoutineModal from '@/components/CreateRoutineModal';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkYTBjM2ZmZi1hZTU5LTQ2YTMtYTAzNy0xOWZhNjgwMDNjNmIiLCJyb2xlIjoiYWRtaW4iLCJzY2hvb2xJZCI6IjI5ZjA1ZWRiLThlMGItNDM0Yy1hNDcxLWFhNzc2MzA4YTFjMSIsImNsYXNzSWRzIjpbXSwic2VjdGlvbklkcyI6W10sImlhdCI6MTc4MjA0MzA3NiwiZXhwIjoxNzgyMTI5NDc2fQ.AaOYBh65Rkp88CvK1S2_1uRNfk2NSM1wEi8xKtedw48';

interface ClassEntity {
  id: string;
  name: string;
}

interface SectionEntity {
  id: string;
  name: string;
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

interface Routine {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  classEntity: ClassEntity;
  sectionEntity: SectionEntity;
  subjectEntity: SubjectEntity;
  teacherEntity: TeacherEntity;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function RoutinePage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [availableClasses, setAvailableClasses] = useState<{ id: string, name: string, sections: {id: string, name: string}[] }[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<{ id: string, name: string }[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  
  const [activeAttendanceRoutine, setActiveAttendanceRoutine] = useState<Routine | null>(null);
  const [activeHomeworkRoutine, setActiveHomeworkRoutine] = useState<Routine | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(API_TOKEN.split('.')[1]));
      return payload.schoolId;
    } catch (e) {
      return null;
    }
  };

  const userSchoolId = getUserSchoolId();

  const fetchRoutines = useCallback(async () => {
    if (!userSchoolId) return;
    setLoading(true);
    try {
      const headers = {
        'accept': '*/*',
        'Authorization': `Bearer ${API_TOKEN}`
      };
      
      const response = await fetch(`${API_BASE_URL}/general/routine?schoolId=${userSchoolId}`, { headers });
      const json = await response.json();

      let fetchedRoutines: Routine[] = [];
      if (json.data && Array.isArray(json.data)) {
        fetchedRoutines = json.data;
      } else if (Array.isArray(json)) {
        fetchedRoutines = json;
      }

      setRoutines(fetchedRoutines);
      
      // Extract unique classes, sections, and teachers
      const classMap = new Map<string, { id: string, name: string, sections: Map<string, {id: string, name: string}> }>();
      const teacherMap = new Map<string, { id: string, name: string }>();
      
      fetchedRoutines.forEach(r => {
        // Classes & Sections
        if (r.classEntity && r.sectionEntity) {
          if (!classMap.has(r.classEntity.id)) {
            classMap.set(r.classEntity.id, {
              id: r.classEntity.id,
              name: r.classEntity.name,
              sections: new Map()
            });
          }
          const classEntry = classMap.get(r.classEntity.id)!;
          if (!classEntry.sections.has(r.sectionEntity.id)) {
            classEntry.sections.set(r.sectionEntity.id, {
              id: r.sectionEntity.id,
              name: r.sectionEntity.name
            });
          }
        }
        
        // Teachers
        if (r.teacherEntity && !teacherMap.has(r.teacherEntity.id)) {
          teacherMap.set(r.teacherEntity.id, {
            id: r.teacherEntity.id,
            name: r.teacherEntity.name
          });
        }
      });
      
      const parsedClasses = Array.from(classMap.values()).map(c => ({
        id: c.id,
        name: c.name,
        sections: Array.from(c.sections.values())
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      const parsedTeachers = Array.from(teacherMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      
      setAvailableClasses(parsedClasses);
      setAvailableTeachers(parsedTeachers);
      
      // Intentionally NOT setting default class/section so "All" is default, making it easier to search
      
    } catch (error) {
      console.error("Failed to fetch routines:", error);
    } finally {
      setLoading(false);
    }
  }, [userSchoolId]);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(e.target.value);
    setSelectedSectionId(''); // Reset section when class changes
  };

  const selectedClassObj = availableClasses.find(c => c.id === selectedClassId);
  const availableSections = selectedClassObj ? selectedClassObj.sections : [];

  // Filter routines by selected class, section, and teacher
  const filteredRoutines = routines.filter(r => {
    const matchClass = selectedClassId ? r.classEntity?.id === selectedClassId : true;
    const matchSection = selectedSectionId ? r.sectionEntity?.id === selectedSectionId : true;
    const matchTeacher = selectedTeacherId ? r.teacherEntity?.id === selectedTeacherId : true;
    return matchClass && matchSection && matchTeacher;
  });

  // Group by day and sort by start time
  const routinesByDay = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = filteredRoutines
      .filter(r => r.day.toLowerCase() === day.toLowerCase())
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {} as Record<string, Routine[]>);

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    return `${formattedH}:${minutes} ${ampm}`;
  };

  const colors = [
    { bg: 'bg-primary/5', border: 'border-primary/20', accent: 'bg-primary', text: 'text-primary' },
    { bg: 'bg-accent/5', border: 'border-accent/20', accent: 'bg-accent', text: 'text-accent' },
    { bg: 'bg-warning/5', border: 'border-warning/20', accent: 'bg-warning', text: 'text-warning' },
    { bg: 'bg-success/5', border: 'border-success/20', accent: 'bg-success', text: 'text-success' },
    { bg: 'bg-destructive/5', border: 'border-destructive/20', accent: 'bg-destructive', text: 'text-destructive' },
  ];

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.025em' }}>
            Class Routine
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', fontSize: '1.1rem' }}>Manage and view weekly schedules for classes and teachers</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: 'fit-content' }}
        >
          <Calendar size={18} />
          Create Routine
        </button>
      </div>

      <div className="widget glass-card" style={{ overflow: 'visible', border: '1px solid var(--border)', borderRadius: '1rem', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}>
        
        {/* FILTERS SECTION */}
        <div className="widget-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.015)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: 'auto' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Filter size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>Filter Routine</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>Narrow down by class or teacher</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teacher</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                <select 
                  className="input" 
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  disabled={loading || availableTeachers.length === 0}
                  style={{ width: '100%', paddingLeft: '2.5rem', height: '44px', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', fontWeight: 500, cursor: 'pointer' }}
                >
                  <option value="">All Teachers</option>
                  {availableTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Class</label>
              <div style={{ position: 'relative' }}>
                <BookOpen size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                <select 
                  className="input" 
                  value={selectedClassId}
                  onChange={handleClassChange}
                  disabled={loading || availableClasses.length === 0}
                  style={{ width: '100%', paddingLeft: '2.5rem', height: '44px', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', fontWeight: 500, cursor: 'pointer' }}
                >
                  <option value="">All Classes</option>
                  {availableClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Section</label>
              <select 
                className="input" 
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={!selectedClassId || availableSections.length === 0}
                style={{ width: '100%', height: '44px', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', fontWeight: 500, cursor: selectedClassId ? 'pointer' : 'not-allowed', opacity: selectedClassId ? 1 : 0.6 }}
              >
                <option value="">All Sections</option>
                {availableSections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ROUTINE VIEW */}
        <div className="widget-content" style={{ padding: '2rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6rem 0', gap: '1rem' }}>
              <Loader2 size={40} className="text-primary" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--muted-foreground)', fontSize: '1.1rem', fontWeight: 500 }}>Loading school routine...</p>
            </div>
          ) : filteredRoutines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--muted-foreground)' }}>
              <Calendar size={64} style={{ opacity: 0.15, margin: '0 auto 1.5rem' }} />
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--foreground)' }}>No routine blocks found</p>
              <p style={{ fontSize: '0.95rem', maxWidth: '400px', margin: '0.5rem auto 0' }}>Try adjusting your Class, Section, or Teacher filters above to find what you are looking for.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {DAYS_OF_WEEK.map((day) => {
                const dayRoutines = routinesByDay[day] || [];
                if (dayRoutines.length === 0) return null;

                return (
                  <div key={day} className="day-section" style={{ position: 'relative' }}>
                    
                    {/* Prominent Day Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--foreground)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                        {day}
                      </h4>
                      <div style={{ flex: 1, height: '2px', background: 'linear-gradient(to right, var(--primary), transparent)', opacity: 0.2 }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted-foreground)', background: 'var(--card)', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid var(--border)' }}>
                        {dayRoutines.length} {dayRoutines.length === 1 ? 'class' : 'classes'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                      {dayRoutines.map((routine, index) => {
                        const colorTheme = colors[index % colors.length];
                        return (
                          <div 
                            key={routine.id} 
                            className={`group ${colorTheme.bg} border ${colorTheme.border}`}
                            style={{ position: 'relative', borderRadius: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-4px)';
                              e.currentTarget.style.boxShadow = '0 12px 24px -10px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            {/* Color Accent Top Bar */}
                            <div className={`${colorTheme.accent}`} style={{ height: '4px', width: '100%' }} />
                            
                            <div style={{ padding: '1.25rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                  <h5 className={`${colorTheme.text}`} style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <BookOpen size={18} />
                                    {routine.subjectEntity?.name || 'Subject Unknown'}
                                  </h5>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ background: 'var(--background)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                      {routine.classEntity?.name} {routine.sectionEntity?.name && `- ${routine.sectionEntity.name}`}
                                    </span>
                                  </div>
                                </div>
                                <span className={`${colorTheme.text}`} style={{ fontSize: '0.75rem', fontWeight: 700, background: 'var(--background)', padding: '0.35rem 0.6rem', borderRadius: '9999px', opacity: 0.9, border: `1px solid var(--border)` }}>
                                  {routine.subjectEntity?.code || 'N/A'}
                                </span>
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'var(--background)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--foreground)' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', opacity: 0.1, position: 'absolute' }} />
                                  <Clock size={16} className={`${colorTheme.text}`} style={{ zIndex: 1, marginLeft: '6px' }} />
                                  <span style={{ fontSize: '0.9rem', fontWeight: 700, zIndex: 1 }}>
                                    {formatTime(routine.startTime)} <span style={{ opacity: 0.5, margin: '0 0.2rem' }}>—</span> {formatTime(routine.endTime)}
                                  </span>
                                </div>
                                
                                <div style={{ height: '1px', background: 'var(--border)' }} />
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--muted-foreground)' }}>
                                  <User size={16} />
                                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                    {routine.teacherEntity?.name || 'No Teacher Assigned'}
                                  </span>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--muted-foreground)' }}>
                                  <MapPin size={16} />
                                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                    {routine.roomNumber ? `Room: ${routine.roomNumber}` : 'Room TBA'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div style={{ display: 'flex', borderTop: `1px solid var(--border)`, marginTop: 'auto' }}>
                              <button 
                                onClick={() => setActiveAttendanceRoutine(routine)}
                                style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', borderRight: `1px solid var(--border)`, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <CheckSquare size={16} className={`${colorTheme.text}`} />
                                Attendance
                              </button>
                              <button 
                                onClick={() => setActiveHomeworkRoutine(routine)}
                                style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <FileText size={16} className={`${colorTheme.text}`} />
                                Homework
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {activeAttendanceRoutine && (
        <AttendanceModal 
          routine={activeAttendanceRoutine} 
          onClose={() => setActiveAttendanceRoutine(null)} 
        />
      )}
      
      {activeHomeworkRoutine && (
        <HomeworkModal 
          routine={activeHomeworkRoutine} 
          onClose={() => setActiveHomeworkRoutine(null)} 
        />
      )}

      {isCreateModalOpen && (
        <CreateRoutineModal 
          onClose={() => setIsCreateModalOpen(false)} 
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchRoutines();
          }} 
        />
      )}
    </div>
  );
}


