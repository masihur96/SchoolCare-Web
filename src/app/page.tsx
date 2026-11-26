"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  GraduationCap, ChevronRight, ChevronDown, CheckCircle2, Shield,
  Users, BookOpen, Clock, Megaphone, Bell, CreditCard,
  Building2, ArrowRight, TrendingUp, Search, Calendar,
  Smartphone, UserCheck, Check, Star, Globe, Zap,
  FileText, MessagesSquare, Wallet, Library, Video, BookHeart, Settings, ShieldCheck, LayoutDashboard,
  Quote, HeartHandshake, Sparkles, Trophy, HelpCircle, MapPin, Activity, Award, Send
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useLanguage } from '@/components/language-provider';
import { getCachedUserRole } from '@/lib/auth';

const partnerSchools = [
  {
    id: 'manor-lakes',
    name: 'Manor Lakes College',
    tagline: 'Dream • Believe • Achieve',
    type: 'P-12 International College',
    location: 'Melbourne, Australia',
    flag: '🇦🇺',
    students: '2,400+ Students',
    logo: '/schools/manor-lakes.png',
    badge: 'K-12 College',
    modules: ['Academic Transcripts', 'Automated Attendance', 'Online Classes'],
    accent: '#0284c7',
  },
  {
    id: 'bismillah-cadet',
    name: 'বিসমিল্লাহ্ তালিমুল কুরআন ক্যাডেট মাদ্রাসা',
    tagline: 'Cadet Madrasah & Hifz Academy',
    type: 'Cadet Academy & Madrasah',
    location: 'Gazipur, Bangladesh',
    flag: '🇧🇩',
    students: '850+ Students',
    logo: '/schools/bismillah-cadet.png',
    badge: 'Cadet Campus',
    modules: ['Biometric Attendance', 'Instant Parent SMS', 'Fee Collections'],
    accent: '#16a34a',
  },
  {
    id: 'whitney-high',
    name: 'Whitney High School',
    tagline: 'Wildcats Secondary Excellence',
    type: 'High School & STEM Campus',
    location: 'California, USA',
    flag: '🇺🇸',
    students: '1,650+ Students',
    logo: '/schools/whitney-high.png',
    badge: 'High School',
    modules: ['Exam Management', 'Teacher Schedules', 'Grade Sheets'],
    accent: '#d97706',
  },
  {
    id: 'new-iqra',
    name: 'New Iqra Rauzatul Atfal School',
    tagline: 'Modern Islamic & General Education',
    type: 'Primary & Secondary School',
    location: 'Momin Abad, Sherpao',
    flag: '🌐',
    students: '620+ Students',
    logo: '/schools/new-iqra.png',
    badge: 'Verified Partner',
    modules: ['Student ID Cards', 'Fee Vouchers', 'Daily Noticeboard'],
    accent: '#2563eb',
  },
  {
    id: 'markazul-hidaah',
    name: 'Markazul Hidaah International Madrasa',
    tagline: 'Knowledge & Guidance',
    type: 'International Islamic Madrasa',
    location: 'Global Campus',
    flag: '🌍',
    students: '900+ Students',
    logo: '/schools/markazul-hidaah.png',
    badge: 'International',
    modules: ['E-Learning Library', 'Parent SMS', 'Multi-lingual Reports'],
    accent: '#059669',
  },
  {
    id: 'evergreen-college',
    name: 'এভারগ্রীন রেসিডেনসিয়াল স্কুল এন্ড কলেজ',
    tagline: 'Residential School & College',
    type: 'Residential College',
    location: 'Dhaka, Bangladesh',
    flag: '🇧🇩',
    students: '1,200+ Students',
    logo: '/schools/evergreen-college.png',
    badge: 'Residential Campus',
    modules: ['Hostel Management', 'Admit Card Generator', 'Term Exams'],
    accent: '#0d9488',
  },
  {
    id: 'francois-virginie',
    name: 'Collège Bilingue François & Virginie',
    tagline: 'Travail • Discipline • Succès',
    type: 'Bilingual Secondary College',
    location: 'International Bilingual Campus',
    flag: '🇫🇷',
    students: '780+ Students',
    logo: '/schools/francois-virginie.png',
    badge: 'Bilingual College',
    modules: ['Bilingual Grade Sheets', 'Parent Portal', 'Staff Payroll'],
    accent: '#15803d',
  },
  {
    id: 'pilak-public',
    name: 'Pilak Public School',
    tagline: 'स्वदेशे पूज्यते राजा विद्वान् सर्वत्र पूज्यते',
    type: 'Premier Public School',
    location: 'Jolaibari, Tripura',
    flag: '🇮🇳',
    students: '950+ Students',
    logo: '/schools/pilak-public.png',
    badge: 'Public School',
    modules: ['Automated Grading', 'Bulk SMS', 'Fee Accounting'],
    accent: '#4f46e5',
  },
  {
    id: 'dar-al-sunnah',
    name: 'Dar-Al-Sunnah Academy',
    tagline: 'Islamic Center & Academic Campus',
    type: 'Academy & Madrasah',
    location: 'Academic Center',
    flag: '🌙',
    students: '550+ Students',
    logo: '/schools/dar-al-sunnah.png',
    badge: 'Academy Partner',
    modules: ['Academic Calendar', 'Fee Invoices', 'Digital Notices'],
    accent: '#0891b2',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'admin' | 'teacher' | 'student'>('admin');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { t } = useLanguage();

  useEffect(() => { 
    setMounted(true); 
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (token) {
      const role = getCachedUserRole();
      if (role === 'superadmin') {
        router.replace('/superadmin/dashboard');
      } else if (role === 'admin') {
        router.replace('/dashboard');
      }
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

  const faqs = [
    { q: t('faq.1.q'), a: t('faq.1.a') },
    { q: t('faq.2.q'), a: t('faq.2.a') },
    { q: t('faq.3.q'), a: t('faq.3.a') },
    { q: t('faq.4.q'), a: t('faq.4.a') },
    { q: t('faq.5.q'), a: t('faq.5.a') },
    { q: t('faq.6.q'), a: t('faq.6.a') },
  ];

  const whyPillars = [
    {
      icon: <Zap size={24} color="#6366f1" />,
      title: t('why.1.title'),
      desc: t('why.1.desc'),
      tag: "Immediate Live"
    },
    {
      icon: <ShieldCheck size={24} color="#10b981" />,
      title: t('why.2.title'),
      desc: t('why.2.desc'),
      tag: "Bank-Grade SLA"
    },
    {
      icon: <Send size={24} color="#0ea5e9" />,
      title: t('why.3.title'),
      desc: t('why.3.desc'),
      tag: "Instant Alerts"
    },
    {
      icon: <Smartphone size={24} color="#f59e0b" />,
      title: t('why.4.title'),
      desc: t('why.4.desc'),
      tag: "Zero App Install"
    }
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
        .ad-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin: 3.5rem 0; padding: 0; width: 100%; }
        .ad-stat-card { text-align: center; padding: 2.25rem 1.5rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 1.5rem; position: relative; overflow: hidden; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 10px 30px rgba(0,0,0,0.03); transition: transform 0.25s ease; }
        .ad-stat-card:hover { transform: translateY(-3px); }
        .ad-stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--primary), var(--accent)); opacity: 0; transition: opacity 0.3s; }
        .ad-stat-card:hover::before { opacity: 1; }
        .ad-stat-num { font-size: 3.2rem; font-weight: 800; background: linear-gradient(135deg, var(--primary), #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1; margin-bottom: 0.5rem; }
        .ad-stat-label { font-size: 1rem; color: var(--muted-foreground); font-weight: 600; }
        .ad-testimonial-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem; }
        .ad-testimonial-card { padding: 2.5rem; background: var(--card); border: 1px solid var(--border); border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.02); display: flex; flex-direction: column; height: 100%; transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s; position: relative; }
        .ad-testimonial-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: var(--primary); }
        .ad-quote-icon { color: var(--primary); opacity: 0.15; margin-bottom: 1.5rem; }
        .ad-quote-text { font-size: 1.05rem; font-style: italic; color: var(--foreground); line-height: 1.7; flex: 1; margin-bottom: 2rem; }
        .ad-author { display: flex; align-items: center; gap: 1rem; }
        .ad-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent)); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(99,102,241,0.3); }
        .ad-author-info h4 { font-size: 1.05rem; font-weight: 700; color: var(--foreground); margin: 0 0 0.2rem 0; }
        .ad-author-info p { font-size: 0.85rem; color: var(--muted-foreground); margin: 0; }
        .ad-cta-banner { margin: 5rem 0; width: 100%; max-width: 100%; padding: 5rem 3rem; background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%); border-radius: 2rem; text-align: center; color: white; box-shadow: 0 25px 50px -12px rgba(99,102,241,0.5); position: relative; overflow: hidden; }
        .ad-cta-banner::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 50%); animation: rotate 20s linear infinite; }
        @keyframes rotate { 100% { transform: rotate(360deg); } }
        .ad-cta-title { font-size: clamp(2.4rem, 5vw, 3.5rem); font-weight: 800; margin-bottom: 1.5rem; position: relative; z-index: 1; line-height: 1.1; letter-spacing: -1px; }
        .ad-cta-sub { font-size: 1.2rem; opacity: 0.9; margin-bottom: 3rem; max-width: 600px; margin-left: auto; margin-right: auto; position: relative; z-index: 1; line-height: 1.6; }
        .ad-btn-white { background: white; color: var(--primary); padding: 1.1rem 2.8rem; border-radius: 1rem; font-weight: 800; font-size: 1.1rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; transition: transform 0.2s, box-shadow 0.2s; position: relative; z-index: 1; border: none; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
        .ad-btn-white:hover { transform: scale(1.05); box-shadow: 0 15px 35px rgba(0,0,0,0.25); }
        .ad-pill { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1.2rem; background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); border-radius: 2rem; border: 1px solid rgba(255,255,255,0.3); font-weight: 600; font-size: 0.9rem; margin-bottom: 2rem; position: relative; z-index: 1; }
        .ad-glass-feature { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .ad-glass-feature:hover { transform: translateY(-5px) scale(1.01); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: var(--primary); z-index: 10; }
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
        <div className="lp-container lp-nav-inner">
          <Link href="/" className="lp-brand">
            <div className="lp-brand-icon">
              <img src="/logo.png" alt="SchoolCare Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span>SchoolCare</span>
          </Link>

          {/* Desktop Quick Links */}
          <div className="lp-nav-menu-desktop">
            <Link href="#modules" className="lp-nav-menu-link">{t('nav.modules')}</Link>
            <Link href="#features" className="lp-nav-menu-link">{t('nav.portals')}</Link>
            <Link href="#why" className="lp-nav-menu-link">{t('nav.why')}</Link>
            <Link href="#pricing" className="lp-nav-menu-link">{t('nav.pricing')}</Link>
            <Link href="#faq" className="lp-nav-menu-link">{t('nav.faq')}</Link>
          </div>

          <div className="lp-nav-actions">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/login" className="lp-nav-link">{t('nav.signIn')}</Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/register" className="lp-btn lp-btn-primary">{t('nav.getStarted')} <ChevronRight size={14} /></Link>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <header className={`lp-hero ${mounted ? 'mounted' : ''}`}>
        <div className="lp-container">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="ad-relative ad-flex-center lp-hero-center-content"
          >
          {/* Rating Pill */}
          <motion.div variants={fadeUpVariant} style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.65rem', 
            background: 'var(--card)', 
            border: '1px solid var(--border)', 
            padding: '0.45rem 1.1rem', 
            borderRadius: '999px', 
            marginBottom: '1.25rem',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', color: '#fbbf24', gap: '2px' }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={13} fill="#fbbf24" stroke="none" />
              ))}
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground)' }}>
              {t('hero.rating')}
            </span>
          </motion.div>
          
          <motion.h1 variants={fadeUpVariant} className="lp-hero-title">
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
          
          <motion.div variants={fadeUpVariant} className="lp-hero-trust" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            <div className="lp-trust-item"><CheckCircle2 size={16} color="#10b981" /> <span>{t('hero.trust1')}</span></div>
            <div className="lp-trust-item"><CheckCircle2 size={16} color="#10b981" /> <span>{t('hero.trust2')}</span></div>
            <div className="lp-trust-item"><CheckCircle2 size={16} color="#10b981" /> <span>{t('hero.trust3')}</span></div>
          </motion.div>
        </motion.div>
        </div>

        {/* Active Campuses Full-Width Edge-to-Edge Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lp-campuses-fullwidth-banner"
        >
          <div style={{ textAlign: 'center', marginBottom: '1.25rem', padding: '0 1rem' }}>
            <div className="lp-marquee-pill-badge">
              <span className="lp-pulse-dot" />
              <span>{t('schools.marquee')}</span>
            </div>
            <p className="lp-marquee-subtitle">
              Over 50+ visionary colleges, cadet madrasahs & academies trust SchoolCare worldwide
            </p>
          </div>

          <div className="lp-marquee-container">
            <div className="lp-marquee-track">
              {partnerSchools.concat(partnerSchools).map((school, i) => (
                <div key={i} className="lp-marquee-card-pro">
                  <div className="lp-marquee-logo-box-pro">
                    <img src={school.logo} alt={school.name} />
                  </div>
                  <div className="lp-marquee-info-pro">
                    <div className="lp-marquee-name-row">
                      <span className="lp-marquee-name">{school.name}</span>
                      <span 
                        className="lp-marquee-badge-pill" 
                        style={{ 
                          color: school.accent, 
                          borderColor: `${school.accent}40`, 
                          background: `${school.accent}12` 
                        }}
                      >
                        {school.badge}
                      </span>
                    </div>
                    <div className="lp-marquee-meta">
                      <span>{school.flag} {school.location}</span>
                      <span className="lp-dot-divider">•</span>
                      <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{school.students}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="lp-container">
        {/* Live Intelligence Hub Simulation Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="lp-mockup-wrapper"
        >
          <div className="lp-mockup-frame">
            <div className="lp-mockup-topbar">
              <div className="lp-mockup-dots">
                <span className="lp-mockup-dot" style={{ background: '#ef4444' }} />
                <span className="lp-mockup-dot" style={{ background: '#fbbf24' }} />
                <span className="lp-mockup-dot" style={{ background: '#22c55e' }} />
              </div>
              <div className="lp-mockup-url">
                https://demo.schoolcare.app/dashboard
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Live Cloud Sync
              </div>
            </div>

            <div className="lp-mockup-body" style={{ textAlign: 'left' }}>
              <div className="lp-mockup-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ffffff', border: '1px solid var(--border)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/logo.png" alt="SchoolCare" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <div className="lp-mockup-school-title">SchoolCare Enterprise Campus</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>Academic Session 2026 • Term 2 Active</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 8, background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 600 }}>
                    50+ Campuses Live
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600 }}>
                    99.9% Uptime
                  </span>
                </div>
              </div>

              {/* KPI metrics in Mockup */}
              <div className="lp-mockup-stats-grid">
                <div className="lp-mockup-stat-card">
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Total Students</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--foreground)', marginTop: 2 }}>1,480</div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: 4 }}>↑ 14% this semester</div>
                </div>
                <div className="lp-mockup-stat-card">
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Today Attendance</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}>98.4%</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 4 }}>1,456 Present on time</div>
                </div>
                <div className="lp-mockup-stat-card">
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Term Fee Collections</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6366f1', marginTop: 2 }}>৳ 14.8L</div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: 4 }}>92% cleared vouchers</div>
                </div>
                <div className="lp-mockup-stat-card">
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Parent SMS Broadcast</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0ea5e9', marginTop: 2 }}>99.8%</div>
                  <div style={{ fontSize: '0.72rem', color: '#0ea5e9', marginTop: 4 }}>BTRC Approved Gateway</div>
                </div>
              </div>

              {/* Mockup sub-content */}
              <div className="lp-mockup-content-grid">
                <div style={{ background: 'var(--muted)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Recent Automated Operations</span>
                    <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>Auto-Piloted</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', background: 'var(--card)', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle2 size={14} color="#10b981" />
                        <span>Daily Attendance SMS dispatched to 24 absent parents</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>09:15 AM</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', background: 'var(--card)', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={14} color="#f59e0b" />
                        <span>Class 10 Midterm Grade Sheets generated & synced</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>Yesterday</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', background: 'var(--card)', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Wallet size={14} color="#6366f1" />
                        <span>Online fee payment received: Roll #104 (Grade 9)</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>2h ago</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--muted)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Multi-Role Portals</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                      Dedicated interfaces tailored for Admins, Teachers, Students, Parents, and Accountants.
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                      <span>Teacher Lesson Sync</span>
                      <span style={{ color: '#10b981' }}>100% Ready</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--card)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', background: '#10b981', borderRadius: 99 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.4rem' }}>
                      <span>Parent Notification Gateway</span>
                      <span style={{ color: '#6366f1' }}>Active</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--card)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: '96%', height: '100%', background: '#6366f1', borderRadius: 99 }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </header>

      {/* Impact Stats Section */}
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
            <div className="ad-stat-label">{t('hero.stats.students')}</div>
          </motion.div>
          <motion.div variants={fadeUpVariant} className="ad-stat-card">
            <div className="ad-stat-num">50+</div>
            <div className="ad-stat-label">{t('hero.stats.institutions')}</div>
          </motion.div>
          <motion.div variants={fadeUpVariant} className="ad-stat-card">
            <div className="ad-stat-num">99.9%</div>
            <div className="ad-stat-label">{t('hero.stats.uptime')}</div>
          </motion.div>
          <motion.div variants={fadeUpVariant} className="ad-stat-card">
            <div className="ad-stat-num">150k+</div>
            <div className="ad-stat-label">Automated Parent SMS Alerts</div>
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
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%' }}
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

      {/* Role-Based Portals Section */}
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

      {/* Why Choose SchoolCare Section */}
      <section className="lp-section" id="why" style={{ background: 'var(--muted)' }}>
        <div className="lp-container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lp-section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
          >
            <div className="lp-hero-badge" style={{ marginBottom: '1rem', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={14} /> <span>{t('why.badge')}</span>
            </div>
            <h2 className="lp-section-title">{t('why.title')}</h2>
            <p className="lp-section-desc">
              {t('why.desc')}
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="lp-why-grid"
          >
            {whyPillars.map((p, idx) => (
              <motion.div key={idx} variants={fadeUpVariant} className="lp-why-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.icon}
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                    {p.tag}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--foreground)' }}>
                  {p.title}
                </h3>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.92rem', lineHeight: 1.6, flex: 1 }}>
                  {p.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="lp-section" style={{ background: 'var(--background)' }}>
        <div className="lp-container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lp-section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
          >
            <div className="lp-hero-badge" style={{ marginBottom: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <HeartHandshake size={14} /> <span>{t('testimonials.trusted')}</span>
            </div>
            <h2 className="lp-section-title">{t('testimonials.title')}</h2>
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
              <p className="ad-quote-text">{t('testimonials.1.quote')}</p>
              <div className="ad-author">
                <div className="ad-avatar">S</div>
                <div className="ad-author-info">
                  <h4>{t('testimonials.1.name')}</h4>
                  <p>{t('testimonials.1.role')}</p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeUpVariant} className="ad-testimonial-card">
              <Quote size={40} className="ad-quote-icon" />
              <p className="ad-quote-text">{t('testimonials.2.quote')}</p>
              <div className="ad-author">
                <div className="ad-avatar">M</div>
                <div className="ad-author-info">
                  <h4>{t('testimonials.2.name')}</h4>
                  <p>{t('testimonials.2.role')}</p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeUpVariant} className="ad-testimonial-card">
              <Quote size={40} className="ad-quote-icon" />
              <p className="ad-quote-text">{t('testimonials.3.quote')}</p>
              <div className="ad-author">
                <div className="ad-avatar">A</div>
                <div className="ad-author-info">
                  <h4>{t('testimonials.3.name')}</h4>
                  <p>{t('testimonials.3.role')}</p>
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
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%', margin: '0 auto' }}
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
                  {plan.name}
                </h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                  {plan.limit}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{plan.price === 'Custom' ? 'Custom' : `৳${plan.price}`}</span>
                  {plan.price !== 'Custom' && <span style={{ color: 'var(--muted-foreground)' }}>/{t('pricing.perMonth')}</span>}
                </div>
                
                <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                  {plan.perStudent === '-' ? t('pricing.customSolution') : `৳${plan.perStudent} ${t('pricing.perStudent')}`}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '2rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    <Check size={16} color={plan.color} /> <span>{t('pricing.features.fullAccess')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    <Check size={16} color={plan.color} /> <span>{t('pricing.features.support')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <Check size={16} color={plan.color} /> <span>{t('pricing.features.updates')}</span>
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link href={plan.price === 'Custom' ? 'mailto:schoolcare2026@gmail.com' : '/register'} className="lp-btn lp-btn-block" style={{ 
                    background: plan.popular ? plan.color : 'var(--muted)',
                    color: plan.popular ? '#fff' : 'var(--foreground)',
                    padding: '0.8rem',
                    borderRadius: '0.75rem',
                    fontWeight: 'bold',
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

      {/* Frequently Asked Questions (FAQ Accordion) */}
      <section className="lp-section" id="faq" style={{ background: 'var(--background)' }}>
        <div className="lp-container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lp-section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
          >
            <div className="lp-hero-badge" style={{ marginBottom: '1rem', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <HelpCircle size={15} /> <span>{t('faq.badge')}</span>
            </div>
            <h2 className="lp-section-title">{t('faq.title')}</h2>
            <p className="lp-section-desc">
              {t('faq.desc')}
            </p>
          </motion.div>

          <div className="lp-faq-grid">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="lp-faq-item">
                  <button 
                    className="lp-faq-question"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <motion.div 
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ color: isOpen ? 'var(--primary)' : 'var(--muted-foreground)', flexShrink: 0 }}
                    >
                      <ChevronDown size={18} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="lp-faq-answer"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Giant CTA Banner */}
      <section className="lp-container">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="ad-cta-banner"
        >
          <div className="ad-pill">
            <Trophy size={14} color="#fbbf24" /> {t('cta.pill')}
          </div>
          <h2 className="ad-cta-title">{t('cta.title')}</h2>
          <p className="ad-cta-sub">{t('cta.sub')}</p>
          <Link href="/register" className="ad-btn-white">
            {t('nav.getStarted')} <ChevronRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="lp-footer" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="lp-container lp-footer-inner" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', padding: '3.5rem 0' }}>
          <div className="lp-footer-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: 'var(--foreground)', fontWeight: 'bold', fontSize: '1.25rem' }}>
              <div className="lp-brand-icon" style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                <img src="/logo.png" alt="SchoolCare Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span>SchoolCare</span>
            </Link>
            <div className="lp-footer-copy" style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>{t('footer.rights')}</div>
          </div>
          <div className="lp-footer-links" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.95rem' }}>
            <Link href="#modules" style={{ color: 'var(--muted-foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{t('nav.modules')}</Link>
            <Link href="#pricing" style={{ color: 'var(--muted-foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{t('nav.pricing')}</Link>
            <Link href="#faq" style={{ color: 'var(--muted-foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{t('nav.faq')}</Link>
            <Link href="/terms" style={{ color: 'var(--muted-foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{t('footer.terms')}</Link>
            <Link href="/privacy" style={{ color: 'var(--muted-foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{t('footer.privacy')}</Link>
            <a href="mailto:schoolcare2026@gmail.com" style={{ color: 'var(--muted-foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{t('footer.contact')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
