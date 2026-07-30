"use client";

import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Users, Calendar, Clock, Loader2, Edit, FileText, CheckCircle, CircleDashed } from 'lucide-react';
import CreateExamModal from '@/components/CreateExamModal';
import ExamRoutineModal from '@/components/ExamRoutineModal';

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

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState<Exam | null>(null);
  const [examForRoutine, setExamForRoutine] = useState<Exam | null>(null);

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/admin/exams`, {
          headers: {
            'accept': '*/*',
            'Authorization': `Bearer ${getApiToken()}`
          },
          cache: 'no-store'
        });
        const json = await response.json();
        
        let fetchedExams: Exam[] = [];
        if (json.data && Array.isArray(json.data)) {
          fetchedExams = json.data;
        } else if (Array.isArray(json)) {
          fetchedExams = json;
        }
        
        // Sort by start_date descending (newest first)
        fetchedExams.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
        setExams(fetchedExams);
      } catch (error) {
        console.error('Failed to fetch exams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  const getStatusInfo = (exam: Exam) => {
    if (!exam.start_date || !exam.end_date) return { text: 'TBA', color: 'badge-warning', icon: <Clock size={14} /> };
    
    const start = new Date(exam.start_date).getTime();
    const end = new Date(exam.end_date).getTime();
    const today = new Date().getTime();
    
    if (today > end) {
      return { text: 'Completed', color: 'badge-primary', icon: <CheckCircle size={14} /> };
    } else if (today >= start && today <= end) {
      return { text: 'In Progress', color: 'badge-success', icon: <CircleDashed size={14} className="animate-spin" /> };
    } else {
      const diffTime = start - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { text: `Starts in ${diffDays} days`, color: 'badge-warning', icon: <Clock size={14} /> };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBA';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.025em' }}>
            Examination Board
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', fontSize: '1.1rem' }}>Manage all school assessments, routines, and results centrally.</p>
        </div>
        <button onClick={() => {
          setExamToEdit(null);
          setIsCreateModalOpen(true);
        }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontSize: '0.95rem', fontWeight: 600, boxShadow: '0 8px 16px -4px rgba(var(--primary-rgb), 0.3)' }}>
          <Plus size={20} /> Create New Exam
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '2rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="glass-card" style={{ display: 'flex', flexDirection: 'column', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div className="shimmer shimmer-block" style={{ height: '42px', width: '100%', borderRadius: '0' }}></div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '1.25rem' }}>
                  <div>
                    <div className="shimmer shimmer-text title" style={{ width: '60%', margin: '0 0 0.5rem 0' }}></div>
                    <div className="shimmer shimmer-text" style={{ width: '100%', margin: '0 0 4px 0' }}></div>
                    <div className="shimmer shimmer-text short" style={{ margin: 0 }}></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                    <div>
                      <div className="shimmer shimmer-text short" style={{ height: '12px', marginBottom: '8px' }}></div>
                      <div className="shimmer shimmer-text" style={{ width: '80%', height: '16px', margin: 0 }}></div>
                    </div>
                    <div>
                      <div className="shimmer shimmer-text short" style={{ height: '12px', marginBottom: '8px' }}></div>
                      <div className="shimmer shimmer-text" style={{ width: '80%', height: '16px', margin: 0 }}></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                    <div className="shimmer shimmer-block" style={{ height: '36px', borderRadius: 'var(--radius)', flex: 1 }}></div>
                    <div className="shimmer shimmer-block" style={{ height: '36px', width: '80px', borderRadius: 'var(--radius)' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8rem 0', background: 'var(--glass-bg)', borderRadius: '1.5rem', border: '1px dashed var(--border)' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', opacity: 0.5 }}>
              <BookOpen size={40} className="text-muted-foreground" />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>No Exams Scheduled</h3>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', fontSize: '1.05rem' }}>Get started by creating your first term or final examination.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
            {exams.map(exam => {
              const uniqueClasses = Array.from(new Set(exam.assignments?.map(a => a.class?.name).filter(Boolean)));
              const uniqueSubjects = Array.from(new Set(exam.assignments?.map(a => a.subject?.name).filter(Boolean)));
              const statusInfo = getStatusInfo(exam);
              
              return (
                <div key={exam.id} className="glass-card group" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                     onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                     onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                  
                  {/* Status Top Bar */}
                  <div style={{ height: '4px', width: '100%', background: exam.isPublished ? 'var(--success)' : 'var(--warning)', opacity: 0.8 }} />
                  
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                      <div style={{ flex: 1, paddingRight: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span className={`badge ${statusInfo.color}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.6rem' }}>
                            {statusInfo.icon} {statusInfo.text}
                          </span>
                          {!exam.isPublished && (
                            <span className="badge" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>Draft</span>
                          )}
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--foreground)', lineHeight: 1.3 }}>
                          {exam.exam_name}
                        </h3>
                        {exam.description && (
                          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {exam.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.015)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ flex: 1, borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Starts</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar size={14} className="text-primary" /> {formatDate(exam.start_date)}
                        </div>
                      </div>
                      <div style={{ flex: 1, paddingLeft: '1rem' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Ends</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar size={14} className="text-primary" /> {formatDate(exam.end_date)}
                        </div>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', flex: 1 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>
                          <Users size={14} /> Assigned Classes
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {uniqueClasses.length > 0 ? uniqueClasses.slice(0, 3).map((c, i) => (
                            <span key={i} style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{c}</span>
                          )) : <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>None</span>}
                          {uniqueClasses.length > 3 && <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', alignSelf: 'center' }}>+{uniqueClasses.length - 3}</span>}
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>
                          <BookOpen size={14} /> Subjects
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {uniqueSubjects.length > 0 ? uniqueSubjects.slice(0, 2).map((s, i) => (
                            <span key={i} style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>{s}</span>
                          )) : <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>None</span>}
                          {uniqueSubjects.length > 2 && <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', alignSelf: 'center' }}>+{uniqueSubjects.length - 2}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                      <button 
                        className="btn" 
                        style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                        onClick={() => setExamForRoutine(exam)}
                      >
                        <FileText size={16} /> Routine & Results
                      </button>
                      <button 
                        onClick={() => {
                          setExamToEdit(exam);
                          setIsCreateModalOpen(true);
                        }}
                        className="btn" 
                        style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }} 
                        onMouseEnter={e => e.currentTarget.style.background='var(--muted)'} 
                        onMouseLeave={e => e.currentTarget.style.background='var(--background)'}
                      >
                        <Edit size={16} /> Edit
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateExamModal 
          examToEdit={examToEdit}
          onClose={() => {
            setIsCreateModalOpen(false);
            setExamToEdit(null);
          }} 
          onSuccess={() => {
            setIsCreateModalOpen(false);
            setExamToEdit(null);
            const fetchExams = async () => {
              setLoading(true);
              try {
                const response = await fetch(`${API_BASE_URL}/admin/exams`, {
                  headers: {
                    'accept': '*/*',
                    'Authorization': `Bearer ${getApiToken()}`
                  },
                  cache: 'no-store'
                });
                const json = await response.json();
                let fetchedExams: Exam[] = [];
                if (json.data && Array.isArray(json.data)) fetchedExams = json.data;
                else if (Array.isArray(json)) fetchedExams = json;
                fetchedExams.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
                setExams(fetchedExams);
              } catch (error) {
                console.error('Failed to fetch exams:', error);
              } finally {
                setLoading(false);
              }
            };
            fetchExams();
          }} 
        />
      )}

      {examForRoutine && (
        <ExamRoutineModal 
          exam={examForRoutine} 
          onClose={() => setExamForRoutine(null)} 
        />
      )}
    </div>
  );
}
