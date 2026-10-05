"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  GraduationCap, ChevronRight, CheckCircle2, Shield,
  Users, BookOpen, Clock, Megaphone, Bell, CreditCard,
  Building2, ArrowRight, TrendingUp, Search, Calendar,
  Smartphone, UserCheck, Check, Star, Globe, Zap,
  FileText, MessagesSquare, Wallet, Library, Video, BookHeart, Settings, ShieldCheck, LayoutDashboard,
  Quote, HeartHandshake, Sparkles, Trophy
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useLanguage } from '@/components/language-provider';

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'admin' | 'teacher' | 'student'>('admin');
  const { t } = useLanguage();

  useEffect(() => { 
    setMounted(true); 
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (token) {
      router.replace('/dashboard');
    }
  }, [router]);

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

  const fadeUpVariant: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="lp-root">
      <style dangerouslySetInnerHTML={{__html: `
        .ad-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin: 4rem 0; padding: 0 1rem; }
        .ad-stat-card { text-align: center; padding: 2.5rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 1.5rem; position: relative; overflow: hidden; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .ad-stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--primary), var(--accent)); opacity: 0; transition: opacity 0.3s; }
        .ad-stat-card:hover::before { opacity: 1; }
        .ad-stat-num { font-size: 3.5rem; font-weight: 800; background: linear-gradient(135deg, var(--primary), #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1; margin-bottom: 0.5rem; }
        .ad-stat-label { font-size: 1.1rem; color: var(--muted-foreground); font-weight: 600; }
        .ad-testimonial-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem; }
        .ad-testimonial-card { padding: 2.5rem; background: var(--card); border: 1px solid var(--border); border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.02); display: flex; flex-direction: column; height: 100%; transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s; position: relative; }
        .ad-testimonial-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: var(--primary); }
        .ad-quote-icon { color: var(--primary); opacity: 0.15; margin-bottom: 1.5rem; }
        .ad-quote-text { font-size: 1.1rem; font-style: italic; color: var(--foreground); line-height: 1.7; flex: 1; margin-bottom: 2rem; }
        .ad-author { display: flex; align-items: center; gap: 1rem; }
        .ad-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent)); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(99,102,241,0.3); }
        .ad-author-info h4 { font-size: 1.05rem; font-weight: 700; color: var(--foreground); margin: 0 0 0.2rem 0; }
        .ad-author-info p { font-size: 0.85rem; color: var(--muted-foreground); margin: 0; }
        .ad-cta-banner { margin: 6rem auto; max-width: 1100px; padding: 5rem 3rem; background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%); border-radius: 2rem; text-align: center; color: white; box-shadow: 0 25px 50px -12px rgba(99,102,241,0.5); position: relative; overflow: hidden; }
        .ad-cta-banner::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 50%); animation: rotate 20s linear infinite; }
        @keyframes rotate { 100% { transform: rotate(360deg); } }
        .ad-cta-title { font-size: 3.5rem; font-weight: 800; margin-bottom: 1.5rem; position: relative; z-index: 1; line-height: 1.1; letter-spacing: -1px; }
        .ad-cta-sub { font-size: 1.25rem; opacity: 0.9; margin-bottom: 3rem; max-width: 600px; margin-left: auto; margin-right: auto; position: relative; z-index: 1; line-height: 1.6; }
        .ad-btn-white { background: white; color: var(--primary); padding: 1.1rem 2.8rem; border-radius: 1rem; font-weight: 800; font-size: 1.1rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; transition: transform 0.2s, box-shadow 0.2s; position: relative; z-index: 1; border: none; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
        .ad-btn-white:hover { transform: scale(1.05); box-shadow: 0 15px 35px rgba(0,0,0,0.25); }
        .ad-pill { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1.2rem; background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); border-radius: 2rem; border: 1px solid rgba(255,255,255,0.3); font-weight: 600; font-size: 0.9rem; margin-bottom: 2rem; position: relative; z-index: 1; }
        .ad-glass-feature { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .ad-glass-feature:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: var(--primary); z-index: 10; }
        
        /* Layout overrides for flex fixes */
        .ad-flex-center { display: flex; flex-direction: column; align-items: center; text-align: center; justify-content: center; }
        .ad-relative { position: relative; z-index: 10; }
      `}} />

      {/* Animated Background Mesh */}
      <div className="lp-bg-mesh" aria-hidden="true">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="lp-orb lp-orb-1" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], x: [0, -30, 0], y: [0, 50, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="lp-orb lp-orb-2" 
        />
        <motion.div 
          animate={{ scale: [1, 1.15, 1], x: [0, 20, 0], y: [0, -40, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="lp-orb lp-orb-3" 
        />
        <div className="lp-grid" />
      </div>

      {/* Navbar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="lp-nav"
      >
        <Link href="/" className="lp-brand">
          <div className="lp-brand-icon"><GraduationCap size={18} strokeWidth={2.2} /></div>
          <span>SchoolCare</span>
        </Link>
        <div className="lp-nav-actions">
          <LanguageToggle />
          <ThemeToggle />
          <Link href="/login" className="lp-nav-link">{t('nav.signIn')}</Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/register" className="lp-btn lp-btn-primary">{t('nav.getStarted')} <ChevronRight size={14} /></Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <header className={`lp-hero ${mounted ? 'mounted' : ''}`}>
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="ad-relative ad-flex-center"
        >
          <motion.div variants={fadeUpVariant} className="lp-hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Zap size={14} color="#3b82f6" /> 
            <span>{t('hero.badge')}</span>
          </motion.div>
          
          <motion.h1 variants={fadeUpVariant} className="lp-hero-title" style={{ marginTop: '0.5rem' }}>
            {t('hero.title1')} <br />
            <span className="lp-highlight">{t('hero.title2')}</span>
          </motion.h1>
          
          <motion.p variants={fadeUpVariant} className="lp-hero-sub">
            {t('hero.sub')}
          </motion.p>
          
          <motion.div variants={fadeUpVariant} className="lp-hero-cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/register" className="lp-btn lp-btn-primary lp-btn-lg" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                {t('hero.cta1')} 
                <motion.span initial={{ x: 0 }} whileHover={{ x: 4 }}><ArrowRight size={16} /></motion.span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="#features" className="lp-btn lp-btn-outline lp-btn-lg">
                {t('hero.cta2')}
              </Link>
            </motion.div>
          </motion.div>
          
          <motion.div variants={fadeUpVariant} className="lp-hero-trust" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginTop: '3rem' }}>
            <div className="lp-trust-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={16} color="#10b981" /> <span>{t('hero.trust1')}</span></div>
            <div className="lp-trust-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={16} color="#10b981" /> <span>{t('hero.trust2')}</span></div>
            <div className="lp-trust-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={16} color="#10b981" /> <span>{t('hero.trust3')}</span></div>
          </motion.div>
        </motion.div>
      </header>

      {/* Impact Stats Section (NEW) */}
      <section className="lp-container">
        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="ad-stat-grid"
        >
          <motion.div variants={fadeUpVariant} className="ad-stat-card">
            <div className="ad-stat-num">10k+</div>
            <div className="ad-stat-label">Active Students</div>
          </motion.div>
          <motion.div variants={fadeUpVariant} className="ad-stat-card">
            <div className="ad-stat-num">50+</div>
            <div className="ad-stat-label">Institutions</div>
          </motion.div>
          <motion.div variants={fadeUpVariant} className="ad-stat-card">
            <div className="ad-stat-num">99.9%</div>
            <div className="ad-stat-label">Uptime Guarantee</div>
          </motion.div>
        </motion.div>
      </section>

      {/* Dedicated Smart Modules Section */}
      <section className="lp-section" id="modules" style={{ background: 'var(--muted)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />
        <div className="lp-container relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lp-section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
          >
            <div className="lp-hero-badge" style={{ marginBottom: '1rem', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Star size={14} fill="#fbbf24" /> <span>{t('modules.badge')}</span>
            </div>
            <h2 className="lp-section-title">{t('modules.title')}</h2>
            <p className="lp-section-desc">
              {t('modules.desc')}
            </p>
          </motion.div>
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}
          >
            {dedicatedModules.map((mod, i) => (
              <motion.div key={i} variants={fadeUpVariant} className="lp-feature-card ad-glass-feature" style={{ padding: '2rem', borderRadius: '1.5rem', background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div style={{ width: '4.5rem', height: '4.5rem', borderRadius: '1.2rem', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  {mod.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>{mod.title}</h3>
                <p style={{ color: 'var(--muted-foreground)', lineHeight: '1.6' }}>{mod.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section (Portals) */}
      <section className="lp-section" id="features">
        <div className="lp-container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lp-section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
          >
            <h2 className="lp-section-title">{t('features.title')}</h2>
            <p className="lp-section-desc">
              {t('features.desc')}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lp-tabs" style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '3rem', background: 'var(--glass-bg)', padding: '0.5rem', borderRadius: '12px', width: 'fit-content', marginLeft: 'auto', marginRight: 'auto' }}
          >
            {['admin', 'teacher', 'student'].map((tab) => (
              <button 
                key={tab}
                className={`lp-tab`} 
                style={{ position: 'relative', zIndex: 1, background: 'transparent', border: 'none', color: activeTab === tab ? 'var(--background)' : 'var(--muted-foreground)', fontSize: '0.95rem', fontWeight: 600, padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', transition: 'color 0.2s' }}
                onClick={() => setActiveTab(tab as any)}
              >
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    style={{ position: 'absolute', inset: 0, background: 'var(--foreground)', borderRadius: '8px', zIndex: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                {t(`tab.${tab}`)}
              </button>
            ))}
          </motion.div>

          <motion.div layout className="lp-features-grid">
            <AnimatePresence mode="popLayout">
              {features[activeTab].map((feat, i) => (
                <motion.div 
                  key={`${activeTab}-${i}`}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="lp-feature-card ad-glass-feature"
                >
                  <div className="lp-feature-icon" style={{ transition: 'transform 0.3s' }}>{feat.icon}</div>
                  <h3 className="lp-feature-title">{feat.title}</h3>
                  <p className="lp-feature-desc">{feat.desc}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section (NEW) */}
      <section className="lp-section" style={{ background: 'var(--background)' }}>
        <div className="lp-container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lp-section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
          >
            <div className="lp-hero-badge" style={{ marginBottom: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <HeartHandshake size={14} /> <span>Trusted by Educators</span>
            </div>
            <h2 className="lp-section-title">What our schools are saying</h2>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="ad-testimonial-grid"
          >
            <motion.div variants={fadeUpVariant} className="ad-testimonial-card">
              <Quote size={40} className="ad-quote-icon" />
              <p className="ad-quote-text">"SchoolCare has completely transformed how we manage our institution. The dynamic attendance and exam modules saved us countless hours of manual work."</p>
              <div className="ad-author">
                <div className="ad-avatar">S</div>
                <div className="ad-author-info">
                  <h4>Sarah Jenkins</h4>
                  <p>Principal, Lincoln High</p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeUpVariant} className="ad-testimonial-card">
              <Quote size={40} className="ad-quote-icon" />
              <p className="ad-quote-text">"The interface is so intuitive that our teachers adapted immediately. The mobile app makes grading and tracking incredibly seamless for everyone involved."</p>
              <div className="ad-author">
                <div className="ad-avatar">M</div>
                <div className="ad-author-info">
                  <h4>Michael Rahman</h4>
                  <p>Head of Administration</p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeUpVariant} className="ad-testimonial-card">
              <Quote size={40} className="ad-quote-icon" />
              <p className="ad-quote-text">"Parents are more engaged than ever. Real-time notifications and the dedicated portal keep everyone on the same page. Highly recommended."</p>
              <div className="ad-author">
                <div className="ad-avatar">A</div>
                <div className="ad-author-info">
                  <h4>Ayesha Siddiqa</h4>
                  <p>Coordinator, Excel Academy</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="lp-section" id="pricing" style={{ background: 'var(--muted)' }}>
        <div className="lp-container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lp-section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
          >
            <h2 className="lp-section-title">{t('pricing.title')}</h2>
            <p className="lp-section-desc">
              {t('pricing.desc')}
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}
          >
            {pricing.map((plan, i) => (
              <motion.div key={i} variants={fadeUpVariant} className={`lp-price-card ad-glass-feature ${plan.popular ? 'popular' : ''}`} style={{ 
                '--accent': plan.color, 
                position: 'relative',
                background: 'var(--card)',
                borderRadius: '1.5rem',
                padding: '2rem 1.5rem',
                border: plan.popular ? `2px solid ${plan.color}` : '1px solid var(--border)',
                boxShadow: plan.popular ? `0 20px 40px ${plan.color}30` : '0 10px 30px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column'
              } as React.CSSProperties}>
                {plan.popular && (
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ repeat: Infinity, repeatType: "reverse", duration: 2 }}
                    style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', background: `linear-gradient(135deg, ${plan.color}, #f59e0b)`, color: '#fff', padding: '0.4rem 1.2rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  >
                    {t('pricing.popular')}
                  </motion.div>
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
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ marginTop: 'auto' }}>
                  <Link href={plan.price === 'Custom' ? 'mailto:schoolcare2026@gmail.com' : '/register'} className="lp-btn lp-btn-block" style={{ 
                    background: plan.popular ? `linear-gradient(135deg, ${plan.color}, #f59e0b)` : 'var(--muted)', 
                    color: plan.popular ? '#fff' : 'var(--foreground)',
                    padding: '0.875rem',
                    borderRadius: '0.75rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    border: plan.popular ? 'none' : '1px solid var(--border)',
                    boxShadow: plan.popular ? '0 10px 20px rgba(0,0,0,0.1)' : 'none'
                  }}>
                    {plan.price === 'Custom' ? t('footer.contact') : t('nav.getStarted')}
                  </Link>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Giant CTA Banner (NEW) */}
      <section className="lp-container">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="ad-cta-banner"
        >
          <div className="ad-pill">
            <Trophy size={14} color="#fbbf24" /> #1 School Management System
          </div>
          <h2 className="ad-cta-title">Ready to transform your institution?</h2>
          <p className="ad-cta-sub">Join thousands of schools already using SchoolCare to automate their workflow and engage their community effectively.</p>
          <Link href="/register" className="ad-btn-white">
            {t('nav.getStarted')} <ChevronRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="lp-footer" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <div className="lp-container lp-footer-inner" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '3rem 0' }}>
          <div className="lp-footer-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--foreground)', fontWeight: 'bold', fontSize: '1.2rem' }}>
              <div className="lp-brand-icon" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary), #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><GraduationCap size={16} strokeWidth={2.2} /></div>
              <span>SchoolCare</span>
            </Link>
            <div className="lp-footer-copy" style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>{t('footer.rights')}</div>
          </div>
          <div className="lp-footer-links" style={{ display: 'flex', gap: '2rem', marginTop: '1rem', fontSize: '0.95rem' }}>
            <Link href="/terms" style={{ color: 'var(--muted-foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{t('footer.terms')}</Link>
            <Link href="/privacy" style={{ color: 'var(--muted-foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{t('footer.privacy')}</Link>
            <a href="mailto:schoolcare2026@gmail.com" style={{ color: 'var(--muted-foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{t('footer.contact')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
