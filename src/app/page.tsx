"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap, ChevronRight, CheckCircle2, Shield,
  Users, BookOpen, Clock, Megaphone, Bell, CreditCard,
  Building2, ArrowRight, TrendingUp, Search, Calendar,
  Smartphone, UserCheck, Check, Star, Globe, Zap,
  FileText, MessagesSquare, Wallet, Library, Video, BookHeart, Settings, ShieldCheck, LayoutDashboard
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useLanguage } from '@/components/language-provider';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'admin' | 'teacher' | 'student'>('admin');
  const { t } = useLanguage();

  useEffect(() => { setMounted(true); }, []);

  const features = {
    admin: [
      { icon: <Building2 color="#3b82f6" />, title: t('feat.admin.1.title'), desc: t('feat.admin.1.desc') },
      { icon: <Users color="#6366f1" />, title: t('feat.admin.2.title'), desc: t('feat.admin.2.desc') },
      { icon: <UserCheck color="#10b981" />, title: t('feat.admin.3.title'), desc: t('feat.admin.3.desc') },
      { icon: <Clock color="#f97316" />, title: t('feat.admin.4.title'), desc: t('feat.admin.4.desc') },
      { icon: <BookOpen color="#ec4899" />, title: t('feat.admin.5.title'), desc: t('feat.admin.5.desc') },
      { icon: <FileText color="#a855f7" />, title: t('feat.admin.6.title'), desc: t('feat.admin.6.desc') },
      { icon: <Megaphone color="#ef4444" />, title: t('feat.admin.7.title'), desc: t('feat.admin.7.desc') },
      { icon: <Calendar color="#eab308" />, title: t('feat.admin.8.title'), desc: t('feat.admin.8.desc') },
      { icon: <FileText color="#14b8a6" />, title: t('feat.admin.9.title'), desc: t('feat.admin.9.desc') },
      { icon: <TrendingUp color="#10b981" />, title: t('feat.admin.10.title'), desc: t('feat.admin.10.desc') },
      { icon: <MessagesSquare color="#06b6d4" />, title: t('feat.admin.11.title'), desc: t('feat.admin.11.desc') },
      { icon: <Shield color="#f43f5e" />, title: t('feat.admin.12.title'), desc: t('feat.admin.12.desc') }
    ],
    student: [
      { icon: <LayoutDashboard color="#3b82f6" />, title: t('feat.student.1.title'), desc: t('feat.student.1.desc') },
      { icon: <UserCheck color="#10b981" />, title: t('feat.student.2.title'), desc: t('feat.student.2.desc') },
      { icon: <Calendar color="#ec4899" />, title: t('feat.student.3.title'), desc: t('feat.student.3.desc') },
      { icon: <BookOpen color="#6366f1" />, title: t('feat.student.4.title'), desc: t('feat.student.4.desc') },
      { icon: <FileText color="#a855f7" />, title: t('feat.student.5.title'), desc: t('feat.student.5.desc') },
      { icon: <Star color="#eab308" />, title: t('feat.student.6.title'), desc: t('feat.student.6.desc') },
      { icon: <Megaphone color="#ef4444" />, title: t('feat.student.7.title'), desc: t('feat.student.7.desc') }
    ],
    teacher: [
      { icon: <LayoutDashboard color="#3b82f6" />, title: t('feat.teacher.1.title'), desc: t('feat.teacher.1.desc') },
      { icon: <Calendar color="#ec4899" />, title: t('feat.teacher.2.title'), desc: t('feat.teacher.2.desc') },
      { icon: <Clock color="#f97316" />, title: t('feat.teacher.3.title'), desc: t('feat.teacher.3.desc') },
      { icon: <BookOpen color="#6366f1" />, title: t('feat.teacher.4.title'), desc: t('feat.teacher.4.desc') },
      { icon: <FileText color="#a855f7" />, title: t('feat.teacher.5.title'), desc: t('feat.teacher.5.desc') },
      { icon: <TrendingUp color="#10b981" />, title: t('feat.teacher.6.title'), desc: t('feat.teacher.6.desc') },
      { icon: <Bell color="#eab308" />, title: t('feat.teacher.7.title'), desc: t('feat.teacher.7.desc') }
    ]
  };

  const dedicatedModules = [
    { icon: <BookHeart size={32} color="#f43f5e" />, title: t('mod.ebook.title'), desc: t('mod.ebook.desc') },
    { icon: <MessagesSquare size={32} color="#8b5cf6" />, title: t('mod.ai.title'), desc: t('mod.ai.desc') },
    { icon: <Clock size={32} color="#f97316" />, title: t('mod.attendance.title'), desc: t('mod.attendance.desc') },
    { icon: <Wallet size={32} color="#10b981" />, title: t('mod.expense.title'), desc: t('mod.expense.desc') },
    { icon: <Library size={32} color="#3b82f6" />, title: t('mod.library.title'), desc: t('mod.library.desc') },
    { icon: <Video size={32} color="#06b6d4" />, title: t('mod.online.title'), desc: t('mod.online.desc') }
  ];

  const pricing = [
    { name: t('pricing.plan.free'), limit: t('pricing.limit.100'), price: t('pricing.free.price'), perStudent: "0", color: "#6b7280" },
    { name: t('pricing.plan.starter'), limit: t('pricing.limit.100'), price: "1,000", perStudent: "10", color: "#10b981" },
    { name: t('pricing.plan.growth'), limit: t('pricing.limit.300'), price: "2,400", perStudent: "8", color: "#fbbf24", popular: true },
    { name: t('pricing.plan.pro'), limit: t('pricing.limit.500'), price: "3,500", perStudent: "7", color: "#3b82f6" },
    { name: t('pricing.plan.business'), limit: t('pricing.limit.700'), price: "4,200", perStudent: "6", color: "#a855f7" },
    { name: t('pricing.plan.advanced'), limit: t('pricing.limit.1000'), price: "5,000", perStudent: "5", color: "#ef4444" },
    { name: t('pricing.plan.enterprise'), limit: t('pricing.limit.custom'), price: "Custom", perStudent: "-", color: "#1e293b" },
  ];

  return (
    <div className="lp-root">
      {/* Background Mesh */}
      <div className="lp-bg-mesh" aria-hidden="true">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
        <div className="lp-grid" />
      </div>

      {/* Navbar */}
      <nav className="lp-nav">
        <Link href="/" className="lp-brand">
          <div className="lp-brand-icon"><GraduationCap size={18} strokeWidth={2.2} /></div>
          <span>SchoolCare</span>
        </Link>
        <div className="lp-nav-actions">
          <LanguageToggle />
          <ThemeToggle />
          <Link href="/login" className="lp-nav-link">{t('nav.signIn')}</Link>
          <Link href="/register" className="lp-btn lp-btn-primary">{t('nav.getStarted')} <ChevronRight size={14} /></Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className={`lp-hero ${mounted ? 'mounted' : ''}`}>
        <div className="lp-hero-badge">
          <Zap size={12} color="var(--primary)" /> {t('hero.badge')}
        </div>
        <h1 className="lp-hero-title">
          {t('hero.title1')} <br />
          <span className="lp-highlight">{t('hero.title2')}</span>
        </h1>
        <p className="lp-hero-sub">
          {t('hero.sub')}
        </p>
        <div className="lp-hero-cta">
          <Link href="/register" className="lp-btn lp-btn-primary lp-btn-lg">
            {t('hero.cta1')} <ArrowRight size={16} />
          </Link>
          <Link href="#features" className="lp-btn lp-btn-outline lp-btn-lg">
            {t('hero.cta2')}
          </Link>
        </div>
        <div className="lp-hero-trust">
          <div className="lp-trust-item"><CheckCircle2 size={14} color="#10b981" /> {t('hero.trust1')}</div>
          <div className="lp-trust-item"><CheckCircle2 size={14} color="#10b981" /> {t('hero.trust2')}</div>
          <div className="lp-trust-item"><CheckCircle2 size={14} color="#10b981" /> {t('hero.trust3')}</div>
        </div>
      </header>

      {/* Dedicated Smart Modules Section */}
      <section className="lp-section" id="modules" style={{ background: 'var(--muted)' }}>
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="lp-hero-badge" style={{ marginBottom: '1rem', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>
              <Star size={12} fill="#fbbf24" /> {t('modules.badge')}
            </div>
            <h2 className="lp-section-title">{t('modules.title')}</h2>
            <p className="lp-section-desc">
              {t('modules.desc')}
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {dedicatedModules.map((mod, i) => (
              <div key={i} className="lp-feature-card" style={{ padding: '2rem', borderRadius: '1.5rem', background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  {mod.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>{mod.title}</h3>
                <p style={{ color: 'var(--muted-foreground)', lineHeight: '1.6' }}>{mod.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section (Portals) */}
      <section className="lp-section" id="features">
        <div className="lp-container">
          <div className="lp-section-header">
            <h2 className="lp-section-title">{t('features.title')}</h2>
            <p className="lp-section-desc">
              {t('features.desc')}
            </p>
          </div>

          <div className="lp-tabs">
            <button className={`lp-tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
              {t('tab.admin')}
            </button>
            <button className={`lp-tab ${activeTab === 'teacher' ? 'active' : ''}`} onClick={() => setActiveTab('teacher')}>
              {t('tab.teacher')}
            </button>
            <button className={`lp-tab ${activeTab === 'student' ? 'active' : ''}`} onClick={() => setActiveTab('student')}>
              {t('tab.student')}
            </button>
          </div>

          <div className="lp-features-grid">
            {features[activeTab].map((feat, i) => (
              <div key={i} className="lp-feature-card">
                <div className="lp-feature-icon">{feat.icon}</div>
                <h3 className="lp-feature-title">{feat.title}</h3>
                <p className="lp-feature-desc">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="lp-section" id="pricing" style={{ background: 'var(--muted)' }}>
        <div className="lp-container">
          <div className="lp-section-header">
            <h2 className="lp-section-title">{t('pricing.title')}</h2>
            <p className="lp-section-desc">
              {t('pricing.desc')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {pricing.map((plan, i) => (
              <div key={i} className={`lp-price-card ${plan.popular ? 'popular' : ''}`} style={{ 
                '--accent': plan.color, 
                position: 'relative',
                background: 'var(--card)',
                borderRadius: '1.5rem',
                padding: '2rem 1.5rem',
                border: plan.popular ? `2px solid ${plan.color}` : '1px solid var(--border)',
                boxShadow: plan.popular ? `0 20px 40px ${plan.color}20` : '0 10px 30px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column'
              } as React.CSSProperties}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', background: `linear-gradient(135deg, ${plan.color}, #f59e0b)`, color: '#fff', padding: '0.25rem 1rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('pricing.popular')}
                  </div>
                )}
                
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: plan.popular ? plan.color : 'var(--foreground)' }}>
                  {plan.price === 'Custom' ? t('pricing.custom') : plan.name}
                </h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>{plan.limit}</div>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  {plan.price !== 'Custom' && plan.price !== '0' && plan.price !== '০' && <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--muted-foreground)' }}>৳</span>}
                  <span style={{ fontSize: plan.price === 'Custom' ? '2.5rem' : '3rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.025em' }}>
                    {plan.price !== 'Custom' ? plan.price : t('pricing.custom')}
                  </span>
                  {plan.price !== 'Custom' && plan.price !== '0' && plan.price !== '০' && <span style={{ fontSize: '1rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>{t('pricing.month')}</span>}
                </div>
                
                {plan.price !== 'Custom' && (
                  <div style={{ display: 'inline-block', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', background: plan.price === '0' || plan.price === '০' ? `${plan.color}15` : 'var(--glass-bg)', marginBottom: '2rem', width: 'fit-content' }}>
                    {plan.price === '0' || plan.price === '০' ? (
                       <span style={{ color: plan.color, fontWeight: 700, fontSize: '0.875rem' }}>{t('pricing.free.duration')}</span>
                    ) : (
                       <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>৳{plan.perStudent} {t('pricing.perStudent')}</span>
                    )}
                  </div>
                )}
                
                {plan.price === 'Custom' && (
                  <div style={{ marginBottom: '2rem', height: '32px' }} />
                )}

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color={plan.color} strokeWidth={3} /> {t('pricing.f1')}</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color={plan.color} strokeWidth={3} /> {t('pricing.f2')}</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><Check size={18} color={plan.color} strokeWidth={3} /> {t('pricing.f3')}</li>
                </ul>
                
                <Link href={plan.price === 'Custom' ? 'mailto:schoolcare2026@gmail.com' : '/register'} className="lp-btn lp-btn-block" style={{ 
                  background: plan.popular ? plan.color : 'var(--muted)', 
                  color: plan.popular ? '#fff' : 'var(--foreground)',
                  padding: '0.875rem',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { if (!plan.popular) e.currentTarget.style.background = 'var(--border)' }}
                onMouseOut={(e) => { if (!plan.popular) e.currentTarget.style.background = 'var(--muted)' }}
                >
                  {plan.price === 'Custom' ? t('footer.contact') : t('nav.getStarted')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-brand-icon"><GraduationCap size={18} strokeWidth={2.2} /></div>
            <span>SchoolCare</span>
            <div className="lp-footer-copy">{t('footer.rights')}</div>
          </div>
          <div className="lp-footer-links">
            <Link href="/terms">{t('footer.terms')}</Link>
            <Link href="/privacy">{t('footer.privacy')}</Link>
            <a href="mailto:schoolcare2026@gmail.com">{t('footer.contact')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
