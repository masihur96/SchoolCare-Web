"use client";

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';

interface SmsPackageItem {
  id: string;
  name: string;
  smsCount: number;
  price: number;
  description?: string;
  isPopular?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

export default function SuperadminSmsPackagesPage() {
  const [packages, setPackages] = useState<SmsPackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<SmsPackageItem | null>(null);

  // Form State
  const [formState, setFormState] = useState({
    name: '',
    smsCount: 1000,
    price: 450,
    description: '',
    isPopular: false,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/sms/packages`, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });
      if (!res.ok) {
        throw new Error(`Failed to load SMS packages: ${res.statusText}`);
      }
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      setPackages(list);
    } catch (err: any) {
      setError(err?.message || 'Error fetching SMS packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleOpenCreate = () => {
    setFormState({
      name: '',
      smsCount: 1000,
      price: 450,
      description: 'Standard bundle for school campaigns with no expiration.',
      isPopular: false,
      isActive: true,
    });
    setFormError(null);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (pkg: SmsPackageItem) => {
    setSelectedPkg(pkg);
    setFormState({
      name: pkg.name || '',
      smsCount: pkg.smsCount || 1000,
      price: pkg.price || 0,
      description: pkg.description || '',
      isPopular: !!pkg.isPopular,
      isActive: pkg.isActive !== false,
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleOpenDelete = (pkg: SmsPackageItem) => {
    setSelectedPkg(pkg);
    setDeleteModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.smsCount || !formState.price) {
      setFormError('Name, SMS Count, and Price are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/sms/packages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
        body: JSON.stringify({
          name: formState.name.trim(),
          smsCount: Number(formState.smsCount),
          price: Number(formState.price),
          description: formState.description.trim() || undefined,
          isPopular: formState.isPopular,
          isActive: formState.isActive,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to create SMS package');
      }

      setCreateModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      setFormError(err.message || 'Error creating package');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/sms/packages/${selectedPkg.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
        body: JSON.stringify({
          name: formState.name.trim(),
          smsCount: Number(formState.smsCount),
          price: Number(formState.price),
          description: formState.description.trim() || undefined,
          isPopular: formState.isPopular,
          isActive: formState.isActive,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to update SMS package');
      }

      setEditModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      setFormError(err.message || 'Error updating package');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedPkg) return;
    setSubmitting(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/superadmin/sms/packages/${selectedPkg.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to delete SMS package');
      }

      setDeleteModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      alert(err.message || 'Error deleting package');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>
            SMS Pricing Bundles & Packages
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            Define credit tiers, pricing in BDT, and promotional bundles available for schools to purchase
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={fetchPackages}
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
          <button
            onClick={handleOpenCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
            }}
          >
            <Plus size={16} /> Create Bundle
          </button>
        </div>
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

      {/* Package Cards Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <p>Loading SMS packages...</p>
        </div>
      ) : packages.length === 0 ? (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--muted-foreground)',
          }}
        >
          <Package size={42} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--foreground)' }}>No SMS Packages Found</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '4px', maxWidth: '400px', margin: '4px auto 1.5rem' }}>
            Click "Create Bundle" to set up your first pricing tier for school SMS credits.
          </p>
          <button
            onClick={handleOpenCreate}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#fff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create First Bundle
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {packages.map((pkg) => {
            const isActive = pkg.isActive !== false;
            const costPerSms = pkg.smsCount > 0 ? (pkg.price / pkg.smsCount).toFixed(3) : '0';

            return (
              <div
                key={pkg.id}
                style={{
                  background: 'var(--card)',
                  border: pkg.isPopular ? '2px solid #7c3aed' : '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  boxShadow: pkg.isPopular ? '0 10px 25px -5px rgba(124, 58, 237, 0.2)' : 'none',
                }}
              >
                {/* Popular Pill */}
                {pkg.isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '20px',
                      background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                      color: '#ffffff',
                      padding: '2px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Sparkles size={11} /> MOST POPULAR
                  </div>
                )}

                <div>
                  {/* Top Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isActive ? '#10b981' : '#ef4444',
                      }}
                    >
                      {isActive ? 'Active & Visible' : 'Archived / Inactive'}
                    </span>
                    <span style={{ fontSize: '0.725rem', color: 'var(--muted-foreground)' }}>
                      ~ ৳{costPerSms} / SMS
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)', margin: '4px 0 6px' }}>
                    {pkg.name}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '10px 0' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#7c3aed' }}>
                      ৳ {pkg.price.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>BDT</span>
                  </div>

                  <div
                    style={{
                      background: 'var(--muted)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '12px',
                    }}
                  >
                    <Zap size={18} color="#f59e0b" />
                    <div>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--foreground)' }}>
                        {pkg.smsCount.toLocaleString()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginLeft: '4px' }}>
                        SMS Credits
                      </span>
                    </div>
                  </div>

                  {pkg.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', lineHeight: 1.5, margin: '0 0 1rem' }}>
                      {pkg.description}
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => handleOpenEdit(pkg)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--muted)',
                      color: 'var(--foreground)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleOpenDelete(pkg)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Delete package"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PACKAGE MODAL */}
      {createModalOpen && (
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
              maxWidth: '480px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  Create SMS Pricing Bundle
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  Set quota size and price for school purchases
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                  Bundle Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5,000 SMS Standard Bundle"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                    SMS Credits *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formState.smsCount}
                    onChange={(e) => setFormState({ ...formState, smsCount: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                    Price (BDT) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formState.price}
                    onChange={(e) => setFormState({ ...formState, price: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                  Description / Perks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Standard bundle for school notifications, no expiration."
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', background: 'var(--muted)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--foreground)' }}>
                  <input
                    type="checkbox"
                    checked={formState.isPopular}
                    onChange={(e) => setFormState({ ...formState, isPopular: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
                  />
                  Mark as "Most Popular" / Featured Bundle
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--foreground)' }}>
                  <input
                    type="checkbox"
                    checked={formState.isActive}
                    onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
                  />
                  Active (Visible to schools for instant checkout)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
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
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Create Bundle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PACKAGE MODAL */}
      {editModalOpen && selectedPkg && (
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
              maxWidth: '480px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  Edit SMS Bundle
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  Updating {selectedPkg.name}
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                  Bundle Name *
                </label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                    SMS Credits *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formState.smsCount}
                    onChange={(e) => setFormState({ ...formState, smsCount: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                    Price (BDT) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formState.price}
                    onChange={(e) => setFormState({ ...formState, price: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--foreground)' }}>
                  Description / Perks
                </label>
                <textarea
                  rows={2}
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', background: 'var(--muted)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--foreground)' }}>
                  <input
                    type="checkbox"
                    checked={formState.isPopular}
                    onChange={(e) => setFormState({ ...formState, isPopular: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
                  />
                  Mark as "Most Popular" / Featured Bundle
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--foreground)' }}>
                  <input
                    type="checkbox"
                    checked={formState.isActive}
                    onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
                  />
                  Active (Visible to schools for instant checkout)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
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
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Save Bundle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PACKAGE MODAL */}
      {deleteModalOpen && selectedPkg && (
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
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--foreground)' }}>
                  Delete SMS Bundle?
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  Permanent package retirement from catalog
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--foreground)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to delete <strong>{selectedPkg.name}</strong> ({selectedPkg.smsCount.toLocaleString()} SMS for ৳{selectedPkg.price})? Schools will no longer be able to purchase this package.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
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
                disabled={submitting}
                onClick={handleDeleteSubmit}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
