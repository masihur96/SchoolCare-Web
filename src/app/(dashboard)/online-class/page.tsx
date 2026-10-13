'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/components/language-provider';
import { Video, Calendar, Clock, Link as LinkIcon, Loader2, User, BookOpen } from 'lucide-react';

interface Participant {
  name: string | null;
  avatar: string | null;
}

interface OnlineClass {
  id: string;
  title: string;
  description: string;
  meetLink: string;
  date: string;
  startTime: string;
  endTime: string;
  host: {
    name: string;
    avatar: string | null;
  };
  class: { name: string } | null;
  section: { name: string } | null;
  subject: { name: string } | null;
  participants: Participant[];
}

export default function OnlineClassPage() {
  const { t } = useLanguage();
  const [meetings, setMeetings] = useState<OnlineClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
        const res = await fetch('https://smart-school-backend-production.up.railway.app/online-classes', {
          headers: { Authorization: `Bearer ${token}`, Accept: '*/*' }
        });
        if (res.ok) {
          const json = await res.json();
          setMeetings(json.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return (
    <div className="oc-container">
      <div className="oc-header">
        <h1 className="oc-title">
          <div className="oc-title-icon"><Video size={24} color="#14b8a6" /></div>
          {t('onlineClass.title')}
        </h1>
        <p className="oc-subtitle">{t('onlineClass.subtitle')}</p>
      </div>

      {loading ? (
        <div className="oc-loading">
          <Loader2 className="oc-spin" size={32} color="#94a3b8" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="oc-empty">
          <Video size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
          <h3>{t('onlineClass.noMeetings')}</h3>
          <p>{t('onlineClass.noMeetingsDesc')}</p>
        </div>
      ) : (
        <div className="oc-grid">
          {meetings.map((m) => (
            <div key={m.id} className="oc-card">
              <h3 className="oc-card-title">{m.title || 'Untitled Meeting'}</h3>
              
              <div className="oc-details">
                {m.class && (
                  <div className="oc-detail-item">
                    <BookOpen size={14} color="#94a3b8" />
                    <span>Class {m.class.name} {m.section ? `(${m.section.name})` : ''} {m.subject ? `- ${m.subject.name}` : ''}</span>
                  </div>
                )}
                <div className="oc-detail-item">
                  <Calendar size={14} color="#94a3b8" />
                  <span>{new Date(m.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="oc-detail-item">
                  <Clock size={14} color="#94a3b8" />
                  <span>{m.startTime} – {m.endTime}</span>
                </div>
                <div className="oc-detail-item">
                  <User size={14} color="#94a3b8" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {m.host?.avatar && <img src={m.host.avatar} alt="Host" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />}
                    <span>Host: {m.host?.name || 'Admin'}</span>
                  </div>
                </div>
              </div>
              
              <a 
                href={m.meetLink || '#'} 
                target="_blank" 
                rel="noreferrer"
                className="oc-join-btn"
              >
                <LinkIcon size={16} />
                {t('onlineClass.joinMeeting')}
              </a>
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .oc-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          color: var(--foreground);
        }
        .oc-header {
          margin-bottom: 2rem;
        }
        .oc-title {
          font-size: 1.5rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .oc-title-icon {
          width: 40px;
          height: 40px;
          background: #ccfbf1;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .oc-subtitle {
          color: #64748b;
          font-size: 0.95rem;
        }
        .oc-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
        }
        .oc-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .oc-empty {
          background: var(--card);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 16px;
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .oc-empty h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.5rem;
        }
        .oc-empty p {
          color: #64748b;
          font-size: 0.9rem;
        }

        .oc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .oc-card {
          background: var(--card);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .oc-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
        }
        .oc-card-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 1rem;
          line-height: 1.4;
        }
        .oc-details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          flex: 1;
        }
        .oc-detail-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.85rem;
          color: #475569;
        }
        .oc-join-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: #f0fdfa;
          color: #0f766e;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: background 0.2s;
        }
        .oc-join-btn:hover {
          background: #ccfbf1;
        }
      `}} />
    </div>
  );
}
