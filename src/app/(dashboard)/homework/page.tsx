"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/components/language-provider';
import {
  BookOpen, Filter, Loader2, FileText, Calendar,
  AlertCircle, RefreshCw, Clock, User,
  CheckCircle, XCircle, BookMarked
} from 'lucide-react';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      ''
    );
  }
  return '';
};

const getUserSchoolId = () => {
  try {
    const token = getApiToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.schoolId as string;
  } catch {
    return null;
  }
};

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface SubjectOption {
  id: string;
  name: string;
  code?: string;
}

interface HomeworkRecord {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  classEntity?: { id: string; name: string };
  sectionEntity?: { id: string; name: string };
  subjectEntity?: { id: string; name: string; code?: string };
  teacherEntity?: { id: string; name: string };
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Assigned:  { bg: 'rgba(99,102,241,0.1)',  color: '#6366f1' },
  Pending:   { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b' },
  Completed: { bg: 'rgba(16,185,129,0.1)',  color: '#10b981' },
  Late:      { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_COLORS[status] ?? { bg: 'rgba(100,116,139,0.1)', color: '#64748b' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem',
      fontWeight: 700, background: s.bg, color: s.color,
    }}>
      {status === 'Completed' ? <CheckCircle size={12} /> :
       status === 'Late' ? <XCircle size={12} /> :
       <Clock size={12} />}
      {status || 'Assigned'}
    </span>
  );
};

export default function HomeworkPage() {
  const { t } = useLanguage();
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const [homeworks, setHomeworks] = useState<HomeworkRecord[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState('');

  const selectedClassObj = availableClasses.find(c => c.id === selectedClassId);
  const availableSections = selectedClassObj?.sections ?? [];

  useEffect(() => {
    const schoolId = getUserSchoolId();
    if (!schoolId) { setLoadingMeta(false); return; }

    (async () => {
      setLoadingMeta(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/general/routine?schoolId=${schoolId}`,
          { headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` } }
        );
        const json = await res.json();
        const routines: any[] = json.data && Array.isArray(json.data)
          ? json.data
          : Array.isArray(json) ? json : [];

        const classMap = new Map<string, ClassOption>();
        const subjectMap = new Map<string, SubjectOption>();

        routines.forEach(r => {
          if (r.classEntity && r.sectionEntity) {
            if (!classMap.has(r.classEntity.id)) {
              classMap.set(r.classEntity.id, {
                id: r.classEntity.id,
                name: r.classEntity.name,
                sections: [],
              });
            }
            const cls = classMap.get(r.classEntity.id)!;
            if (!cls.sections.find(s => s.id === r.sectionEntity.id)) {
              cls.sections.push({ id: r.sectionEntity.id, name: r.sectionEntity.name });
            }
          }
          if (r.subjectEntity && !subjectMap.has(r.subjectEntity.id)) {
            subjectMap.set(r.subjectEntity.id, {
              id: r.subjectEntity.id,
              name: r.subjectEntity.name,
              code: r.subjectEntity.code,
            });
          }
        });

        setAvailableClasses(
          Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name))
        );
        setAvailableSubjects(
          Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch (e) {
        console.error('Failed to fetch metadata', e);
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  // Auto-fetch on initial load once metadata is ready
  useEffect(() => {
    if (!loadingMeta) {
      fetchHomework();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMeta]);

  const fetchHomework = useCallback(async () => {
    const schoolId = getUserSchoolId();
    if (!schoolId) { setError('Could not resolve school ID from token.'); return; }

    setLoadingHomework(true);
    setError('');

    try {
      const params = new URLSearchParams({ schoolId });
      if (selectedClassId)   params.set('classId',   selectedClassId);
      if (selectedSectionId) params.set('sectionId', selectedSectionId);
      if (selectedSubjectId) params.set('subjectId', selectedSubjectId);
      if (selectedDate)      params.set('date',      selectedDate);

      const res = await fetch(`${API_BASE_URL}/admin/homework?${params}`, {
        headers: { accept: '*/*', Authorization: `Bearer ${getApiToken()}` },
      });
      const json = await res.json();

      let records: HomeworkRecord[] = [];
      if (json.data?.data && Array.isArray(json.data.data)) {
        records = json.data.data;
      } else if (json.data && Array.isArray(json.data)) {
        records = json.data;
      } else if (Array.isArray(json)) {
        records = json;
      }

      setHomeworks(records);
      setHasFetched(true);
    } catch (e) {
      console.error('Failed to fetch homework', e);
      setError('Failed to load homework. Please try again.');
    } finally {
      setLoadingHomework(false);
    }
  }, [selectedClassId, selectedSectionId, selectedSubjectId, selectedDate]);

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(e.target.value);
    setSelectedSectionId('');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem' }}>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{
            fontSize: '2.5rem', fontWeight: 800, margin: 0,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.025em',
          }}>
            {t('homework.title')}
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
            {t('homework.subtitle')}
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="widget glass-card" style={{
        border: '1px solid var(--border)', borderRadius: '1rem',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', marginBottom: '2rem',
      }}>
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.015)', display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '9px',
            background: 'var(--primary)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'white', flexShrink: 0,
          }}>
            <Filter size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
              {t('homework.filterTitle')}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>
              {t('homework.filterDesc')}
            </p>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {loadingMeta ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--muted-foreground)' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span>{t('homework.loadingFilter')}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>

              {/* Class */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 180px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Class
                </label>
                <div style={{ position: 'relative' }}>
                  <BookOpen size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
                  <select
                    className="input"
                    value={selectedClassId}
                    onChange={handleClassChange}
                    disabled={availableClasses.length === 0}
                    style={{ width: '100%', paddingLeft: '2.25rem', height: '42px', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', fontWeight: 500, cursor: 'pointer' }}
                  >
                    <option value="">{t('common.allClasses')}</option>
                    {availableClasses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 150px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Section
                </label>
                <select
                  className="input"
                  value={selectedSectionId}
                  onChange={e => setSelectedSectionId(e.target.value)}
                  disabled={!selectedClassId || availableSections.length === 0}
                  style={{
                    width: '100%', height: '42px', borderRadius: '0.5rem',
                    border: '1px solid var(--border)', background: 'var(--background)',
                    fontWeight: 500, cursor: selectedClassId ? 'pointer' : 'not-allowed',
                    opacity: selectedClassId ? 1 : 0.55,
                  }}
                >
                  <option value="">{t('common.allSections')}</option>
                  {availableSections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 180px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Subject
                </label>
                <div style={{ position: 'relative' }}>
                  <BookMarked size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
                  <select
                    className="input"
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    disabled={availableSubjects.length === 0}
                    style={{ width: '100%', paddingLeft: '2.25rem', height: '42px', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', fontWeight: 500, cursor: 'pointer' }}
                  >
                    <option value="">{t('common.allSubjects')}</option>
                    {availableSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}{sub.code ? ` (${sub.code})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 160px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Date
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
                  <input
                    type="date"
                    className="input"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{ width: '100%', paddingLeft: '2.25rem', height: '42px', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--background)', fontWeight: 500, cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Search */}
              <button
                className="btn btn-primary"
                onClick={fetchHomework}
                disabled={loadingHomework}
                style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, alignSelf: 'flex-end' }}
              >
                {loadingHomework
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : <RefreshCw size={16} />}
                {loadingHomework ? 'Loading…' : 'Search'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Card */}
      <div className="widget glass-card" style={{
        border: '1px solid var(--border)', borderRadius: '1rem',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.015)', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '9px',
              background: '#8b5cf6', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', flexShrink: 0,
            }}>
              <FileText size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                Homework Records
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>
                {hasFetched
                  ? `${homeworks.length} record${homeworks.length !== 1 ? 's' : ''} found`
                  : 'Use filters above and click Search'}
              </p>
            </div>
          </div>
          {hasFetched && homeworks.length > 0 && (
            <span style={{
              padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700,
              background: 'rgba(99,102,241,0.1)', color: '#6366f1',
            }}>
              {homeworks.length} total
            </span>
          )}
        </div>

        <div style={{ padding: '1.5rem' }}>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '0.75rem', color: '#ef4444', marginBottom: '1.5rem',
            }}>
              <AlertCircle size={18} />
              <span style={{ fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {loadingHomework && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
              <span style={{ color: 'var(--muted-foreground)' }}>{t('homework.fetching')}</span>
            </div>
          )}

          {!loadingHomework && !error && !hasFetched && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
              padding: '4rem 2rem', color: 'var(--muted-foreground)', textAlign: 'center',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileText size={28} style={{ color: '#6366f1' }} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{t('homework.noSearch')}</p>
                <p style={{ fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                  Select filters above and click <strong>Search</strong> to view homework records.
                </p>
              </div>
            </div>
          )}

          {!loadingHomework && !error && hasFetched && homeworks.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
              padding: '4rem 2rem', color: 'var(--muted-foreground)', textAlign: 'center',
              border: '1px dashed var(--border)', borderRadius: '0.75rem',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'rgba(100,116,139,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileText size={28} style={{ color: '#94a3b8' }} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{t('homework.noHomework')}</p>
                <p style={{ fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                  Try adjusting your filters or a different date.
                </p>
              </div>
            </div>
          )}

          {!loadingHomework && homeworks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {homeworks.map(hw => (
                <div
                  key={hw.id}
                  style={{
                    padding: '1.25rem 1.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    background: 'var(--card)',
                    display: 'flex',
                    gap: '1.25rem',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Status accent bar */}
                  <div style={{
                    width: '4px', borderRadius: '9999px', flexShrink: 0, alignSelf: 'stretch',
                    background: STATUS_COLORS[hw.status]?.color ?? '#94a3b8',
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--foreground)' }}>
                        {hw.title}
                      </span>
                      <StatusBadge status={hw.status || 'Assigned'} />
                    </div>

                    {hw.description && (
                      <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                        {hw.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                      {hw.classEntity && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <BookOpen size={13} />
                          {hw.classEntity.name}{hw.sectionEntity ? ` – ${hw.sectionEntity.name}` : ''}
                        </span>
                      )}
                      {hw.subjectEntity && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <BookMarked size={13} />
                          {hw.subjectEntity.name}
                        </span>
                      )}
                      {hw.teacherEntity && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <User size={13} />
                          {hw.teacherEntity.name}
                        </span>
                      )}
                      {hw.dueDate && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={13} />
                          Due: <strong style={{ marginLeft: '0.2rem' }}>{formatDate(hw.dueDate)}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
