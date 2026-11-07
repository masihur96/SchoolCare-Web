"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trash2,
  RefreshCw,
  Search,
  RotateCcw,
  Building2,
  Users,
  BookOpen,
  Layers,
  Book,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  Calendar,
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';
import { sanitizeDisplayName } from '@/lib/formatters';
import SchoolAvatar from '@/components/superadmin/school-avatar';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

const ENTITY_RESTORE_TYPE_MAP: Record<string, string> = {
  schools: 'school',
  school: 'school',
  users: 'user',
  user: 'user',
  classes: 'class',
  class: 'class',
  subjects: 'subject',
  subject: 'subject',
  sections: 'section',
  section: 'section',
  pricing: 'pricing',
  pricingplans: 'pricing',
  pricingplan: 'pricing',
  subscriptions: 'subscription',
  subscription: 'subscription',
  homework: 'homework',
  homeworks: 'homework',
  attendance: 'attendance',
  attendances: 'attendance',
};

function normalizeTrashEntity(raw: string): string {
  const clean = (raw || '').trim().toLowerCase();
  if (ENTITY_RESTORE_TYPE_MAP[clean]) {
    return ENTITY_RESTORE_TYPE_MAP[clean];
  }
  if (clean.endsWith('s')) {
    return clean.slice(0, -1);
  }
  return clean;
}

interface TrashItem {
  id: string;
  entity: string; // 'schools' | 'users' | 'classes' | 'subjects' | 'sections' | 'pricing' | 'subscriptions' | 'homework' | 'attendance'
  name?: string;
  title?: string;
  email?: string;
  avatar?: string;
  deletedAt?: string;
  schoolId?: string;
  school?: { name?: string; avatar?: string };
  original?: any;
}

export default function SuperadminTrashPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TrashItem | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchTrash = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/trash`, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });

      if (!res.ok) {
        throw new Error(`Failed to load trash items: ${res.statusText}`);
      }

      const json = await res.json();
      const rawData = json.data || json;

      const items: TrashItem[] = [];

      const safeStr = (v: any): string | undefined => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined);
      const extractName = (item: any): string => {
        return (
          safeStr(item.name) ||
          safeStr(item.title) ||
          safeStr(item.email) ||
          safeStr(item.exam_name) ||
          safeStr(item.subject_name) ||
          safeStr(item.id) ||
          'Untitled Record'
        );
      };

      if (Array.isArray(rawData)) {
        // Flat array
        rawData.forEach((item: any) => {
          items.push({
            id: safeStr(item.id) || safeStr(item._id) || '',
            entity: normalizeTrashEntity(safeStr(item.entity) || safeStr(item.type) || 'record'),
            name: extractName(item),
            title: safeStr(item.title),
            email: safeStr(item.email),
            avatar: safeStr(item.avatar),
            deletedAt: safeStr(item.deletedAt) || safeStr(item.updatedAt),
            schoolId: safeStr(item.schoolId),
            school: item.school && typeof item.school === 'object' ? item.school : undefined,
            original: item,
          });
        });
      } else if (typeof rawData === 'object' && rawData !== null) {
        // Grouped by entity e.g. { schools: [...], users: [...], ... }
        for (const [entityKey, list] of Object.entries(rawData)) {
          if (Array.isArray(list)) {
            list.forEach((item: any) => {
              items.push({
                id: safeStr(item.id) || safeStr(item._id) || '',
                entity: normalizeTrashEntity(entityKey),
                name: extractName(item),
                title: safeStr(item.title),
                email: safeStr(item.email),
                avatar: safeStr(item.avatar),
                deletedAt: safeStr(item.deletedAt) || safeStr(item.updatedAt),
                schoolId: safeStr(item.schoolId),
                school: item.school && typeof item.school === 'object' ? item.school : undefined,
                original: item,
              });
            });
          }
        }
      }

      setTrashItems(items);
    } catch (err: any) {
      setError(err?.message || 'Error fetching trash items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleOpenRestore = (item: TrashItem) => {
    setSelectedItem(item);
    setRestoreModalOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (!selectedItem) return;
    setRestoring(true);
    try {
      const token = getStoredToken();
      const entity = normalizeTrashEntity(selectedItem.entity);
      const id = selectedItem.id;

      const url = `${API_BASE_URL}/superadmin/trash/${entity}/${id}/restore`;

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to restore entity');
      }

      setRestoreModalOpen(false);
      setSuccessToast(`Successfully restored "${sanitizeDisplayName(selectedItem.name || selectedItem.title, `${selectedItem.entity} record`)}"`);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchTrash();
    } catch (err: any) {
      alert(err.message || 'Failed to restore record');
    } finally {
      setRestoring(false);
    }
  };

  const entityTabs = [
    { key: 'ALL', label: 'All Entities', icon: Layers },
    { key: 'school', label: 'Schools', icon: Building2 },
    { key: 'user', label: 'Users', icon: Users },
    { key: 'class', label: 'Classes', icon: BookOpen },
    { key: 'subject', label: 'Subjects', icon: Book },
    { key: 'section', label: 'Sections', icon: Layers },
    { key: 'pricing', label: 'Pricing Plans', icon: CreditCard },
    { key: 'subscription', label: 'Subscriptions', icon: CreditCard },
    { key: 'homework', label: 'Homework', icon: Clock },
    { key: 'attendance', label: 'Attendance', icon: CheckCircle },
  ];

  const getEntityCount = (key: string) => {
    if (key === 'ALL') return trashItems.length;
    return trashItems.filter((i) => i.entity === key).length;
  };

  const filteredItems = useMemo(() => {
    return trashItems.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        (item.name || '').toLowerCase().includes(q) ||
        (item.title || '').toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.id || '').toLowerCase().includes(q) ||
        (item.school?.name || '').toLowerCase().includes(q);

      const matchEntity = activeTab === 'ALL' ? true : item.entity === activeTab;

      return matchSearch && matchEntity;
    });
  }, [trashItems, searchTerm, activeTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>
            Trash & Soft-Deleted Recovery
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            Central repository of soft-deleted schools, users, classes, subjects, homework, and subscriptions
          </p>
        </div>

        <button
          onClick={fetchTrash}
          disabled={loading}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            color: 'var(--foreground)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {successToast && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle size={16} />
          {successToast}
        </div>
      )}

      {/* Search Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '8px 14px',
        }}
      >
        <Search size={18} color="var(--muted-foreground)" />
        <input
          type="text"
          placeholder="Search deleted records by title, name, ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '0.875rem',
            color: 'var(--foreground)',
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Entity Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {entityTabs.map((tab) => {
          const Icon = tab.icon;
          const count = getEntityCount(tab.key);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: isActive ? '1px solid #7c3aed' : '1px solid var(--border)',
                background: isActive ? 'rgba(124, 58, 237, 0.12)' : 'var(--card)',
                color: isActive ? '#7c3aed' : 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '0.825rem',
                fontWeight: isActive ? 700 : 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              <span
                style={{
                  background: isActive ? '#7c3aed' : 'var(--muted)',
                  color: isActive ? '#ffffff' : 'var(--muted-foreground)',
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#ef4444',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Trash Table */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Scanning deleted entities in trash...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Trash2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>Trash is empty</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              {searchTerm ? 'No soft-deleted records match your search filter.' : 'No records have been soft-deleted in this entity category.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Deleted Item / Title</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Entity Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Associated Institution</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Deleted Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'right' }}>Restore Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={`${item.entity}-${item.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.entity === 'school' && (
                          <SchoolAvatar
                            avatar={item.avatar || item.original?.avatar}
                            name={item.name}
                            size={32}
                            radius={6}
                          />
                        )}
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--foreground)', display: 'block' }}>
                            {sanitizeDisplayName(item.name || item.title, `${item.entity.toUpperCase()} Record`)}
                          </span>
                          {item.email && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                              {item.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: '#f59e0b',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.entity}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {(item.school?.avatar || item.original?.school?.avatar) && (
                          <SchoolAvatar
                            avatar={item.school?.avatar || item.original?.school?.avatar}
                            name={item.school?.name}
                            size={20}
                            radius={4}
                          />
                        )}
                        <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
                          {item.school?.name || (item.schoolId ? 'Assigned Institution' : 'Global Platform')}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', color: 'var(--muted-foreground)', fontSize: '0.775rem' }}>
                      {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : '—'}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenRestore(item)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.775rem',
                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        <RotateCcw size={13} />
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RESTORE CONFIRMATION MODAL */}
      {restoreModalOpen && selectedItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  Restore Deleted Record?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  Return record back to active platform collection
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--muted)', borderRadius: '8px', padding: '12px 14px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Record Title:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {(selectedItem.avatar || selectedItem.school?.avatar) && (
                    <SchoolAvatar
                      avatar={selectedItem.avatar || selectedItem.school?.avatar}
                      name={selectedItem.name || selectedItem.title}
                      size={20}
                      radius={4}
                    />
                  )}
                  <strong style={{ color: 'var(--foreground)' }}>
                    {sanitizeDisplayName(selectedItem.name || selectedItem.title, `${selectedItem.entity.toUpperCase()} Record`)}
                  </strong>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Entity Category:</span>
                <span style={{ color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase' }}>
                  {selectedItem.entity}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              This record will be recovered immediately and made accessible to authorized staff and portal users.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--muted)',
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restoring}
                onClick={handleConfirmRestore}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {restoring && <Loader2 size={14} className="animate-spin" />}
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
