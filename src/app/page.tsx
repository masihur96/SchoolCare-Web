"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  GraduationCap, ChevronRight, CheckCircle2, Shield,
  Users, BookOpen, Clock, Megaphone, Bell, CreditCard,
  Building2, ArrowRight, TrendingUp, Search, Calendar,
  Smartphone, UserCheck, Check, Sparkles, Zap
} from 'lucide-react';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'admin' | 'teacher' | 'student'>('admin');

  useEffect(() => { setMounted(true); }, []);

  const features = {
    admin: [
      { icon: <Users />, title: "Student Management", desc: "Create, update, and search students instantly. Dynamic filtering for quick access." },
      { icon: <UserCheck />, title: "Teacher Management", desc: "Manage teacher information, track attendance and activities seamlessly." },
      { icon: <Building2 />, title: "Class, Section & Subject", desc: "Create and organize academic structures easily from a single view." },
      { icon: <Clock />, title: "Attendance Monitoring", desc: "View today's summary. Monitor student and teacher attendance in real time." },
      { icon: <Megaphone />, title: "Notice Management", desc: "Send notices to students, teachers, or everyone. Mark as important." },
      { icon: <BookOpen />, title: "Exam Management", desc: "Create exams, assign syllabus, set routines, assign examiners, and publish results." },
      { icon: <Calendar />, title: "Class Routine", desc: "Create and manage schedules efficiently across all classes and sections." },
      { icon: <TrendingUp />, title: "Marquee Announcements", desc: "Display important updates instantly across the entire platform." },
      { icon: <Bell />, title: "Notification System", desc: "Automatic notifications for notices, results, and important announcements." },
      { icon: <CreditCard />, title: "Subscription Management", desc: "View plan details, usage information, and billing cycles." }
    ],
    teacher: [
      { icon: <Clock />, title: "Clock In / Clock Out", desc: "Digital attendance system for teachers to log daily hours." },
      { icon: <UserCheck />, title: "Student Attendance", desc: "Submit class attendance quickly directly from the dashboard." },
      { icon: <BookOpen />, title: "Homework Management", desc: "Assign homework directly to students and track submissions." },
      { icon: <TrendingUp />, title: "Exam Marks Entry", desc: "Subject-wise mark entry system mapped directly to exams." },
      { icon: <Calendar />, title: "Class Routine", desc: "Daily and weekly schedule view tailored to the teacher." },
      { icon: <Search />, title: "Exam Routine Access", desc: "View assigned examination schedules and duties." },
      { icon: <Bell />, title: "Notifications", desc: "Receive school announcements and updates instantly." }
    ],
    student: [
      { icon: <UserCheck />, title: "Attendance Tracking", desc: "Daily attendance overview and complete attendance reports." },
      { icon: <BookOpen />, title: "Homework Access", desc: "View assigned homework anytime and stay on top of tasks." },
      { icon: <Megaphone />, title: "Notice Board", desc: "Receive official school notices and memos instantly." },
      { icon: <Search />, title: "Exam Information", desc: "Access exam routines, syllabuses, and final results." },
      { icon: <Bell />, title: "Notifications", desc: "Important updates delivered directly to your device." },
      { icon: <Users />, title: "Profile Management", desc: "Update personal information easily and securely." }
    ]
  };

  const pricing = [
    { name: "Starter", limit: "Up to 100 students", price: "1,000", perStudent: "10", color: "#10b981" },
    { name: "Growth", limit: "Up to 300 students", price: "2,400", perStudent: "8", color: "#fbbf24", popular: true },
    { name: "Pro", limit: "Up to 500 students", price: "3,500", perStudent: "7", color: "#3b82f6" },
    { name: "Business", limit: "Up to 700 students", price: "4,200", perStudent: "6", color: "#a855f7" },
    { name: "Advanced", limit: "Up to 1000 students", price: "5,000", perStudent: "5", color: "#ef4444" },
    { name: "Enterprise", limit: "1000+ students", price: "Custom", perStudent: "4–5", color: "#64748b" }
  ];

  const fadeUpVariant: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  if (!mounted) return null;

  return (
    <div className="lp-root">
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
          <Link href="/login" className="lp-nav-link">Sign in</Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/register" className="lp-btn lp-btn-primary">Get Started <ChevronRight size={14} /></Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <header className="lp-hero">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col items-center"
        >
          <motion.div variants={fadeUpVariant} className="lp-hero-badge">
            <Sparkles size={14} className="text-blue-400" /> 
            <span>The Future of School Management</span>
          </motion.div>
          
          <motion.h1 variants={fadeUpVariant} className="lp-hero-title">
            Manage your institution <br />
            <span className="lp-highlight">smarter, not harder.</span>
          </motion.h1>
          
          <motion.p variants={fadeUpVariant} className="lp-hero-sub">
            A complete ecosystem for administrators, teachers, students, and parents.
            Automate attendance, grading, communication, and payroll in one premium platform.
          </motion.p>
          
          <motion.div variants={fadeUpVariant} className="lp-hero-cta">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/register" className="lp-btn lp-btn-primary lp-btn-lg group">
                Create Free Account 
                <motion.span 
                  className="inline-block ml-1"
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                >
                  <ArrowRight size={16} />
                </motion.span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="#features" className="lp-btn lp-btn-outline lp-btn-lg">
                Explore Features
              </Link>
            </motion.div>
          </motion.div>
          
          <motion.div variants={fadeUpVariant} className="lp-hero-trust">
            <div className="lp-trust-item"><CheckCircle2 size={14} className="text-emerald-500" /> Free 7-day trial</div>
            <div className="lp-trust-item"><CheckCircle2 size={14} className="text-emerald-500" /> No credit card required</div>
            <div className="lp-trust-item"><CheckCircle2 size={14} className="text-emerald-500" /> Cancel anytime</div>
          </motion.div>
        </motion.div>
      </header>

      {/* About Section with Animated Dashboard Graphic */}
      <section className="lp-section lp-about" id="about">
        <div className="lp-container">
          <div className="lp-about-grid">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="lp-about-content"
            >
              <motion.h2 variants={fadeUpVariant} className="lp-section-title">Built for the modern institution</motion.h2>
              <motion.p variants={fadeUpVariant} className="lp-section-desc text-left">
                SchoolCare was born out of a simple necessity: education management shouldn't be trapped in the past. 
                We've combined enterprise-grade architecture with consumer-grade design to create a platform that everyone—from principals to parents—actually enjoys using.
              </motion.p>
              
              <div className="lp-perks-list">
                {[
                  { icon: <Smartphone size={18} />, title: "Mobile App Included", desc: "Stay connected on iOS and Android wherever you are." },
                  { icon: <Shield size={18} />, title: "Bangla Support", desc: "Fully localized interface and support in Bengali." },
                  { icon: <GraduationCap size={18} />, title: "Free Training", desc: "Onboarding and training provided at zero extra cost." }
                ].map((perk, i) => (
                  <motion.div 
                    key={i} 
                    variants={fadeUpVariant}
                    whileHover={{ x: 10 }}
                    className="lp-perk-item"
                  >
                    <div className="lp-perk-icon bg-indigo-500/10 text-indigo-500 border-indigo-500/20">{perk.icon}</div>
                    <div>
                      <h4 className="text-[1.05rem] font-bold text-[var(--foreground)]">{perk.title}</h4>
                      <p className="text-[0.9rem] text-[var(--muted-foreground)] leading-relaxed">{perk.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* Animated Abstract Dashboard */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
              whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, type: "spring" }}
              className="lp-about-visual perspective-[1000px]"
            >
              <div className="lp-abstract-dash transform-gpu shadow-2xl hover:shadow-indigo-500/20 transition-shadow duration-500">
                <div className="lp-abs-header">
                  <div className="lp-abs-dots"><span/><span/><span/></div>
                </div>
                <div className="lp-abs-body">
                  <div className="lp-abs-sidebar">
                    {[1, 2, 3, 4].map(i => (
                      <motion.div 
                        key={i}
                        initial={{ width: 0 }}
                        whileInView={{ width: i === 1 ? '80%' : '100%' }}
                        transition={{ delay: 0.5 + (i * 0.1), duration: 0.5 }}
                        className={`lp-abs-line ${i === 1 ? 'active' : ''}`} 
                      />
                    ))}
                  </div>
                  <div className="lp-abs-main">
                    <div className="lp-abs-cards">
                      {[1, 2, 3].map(i => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8 + (i * 0.1) }}
                          className="lp-abs-card" 
                        />
                      ))}
                    </div>
                    <div className="lp-abs-chart relative overflow-hidden group">
                      {[40, 70, 50, 90, 60].map((h, i) => (
                        <motion.div 
                          key={i}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          transition={{ delay: 1.2 + (i * 0.1), duration: 0.6, type: "spring" }}
                          className="lp-abs-bar group-hover:bg-indigo-400 transition-colors duration-300" 
                        />
                      ))}
                      {/* Floating overlay element */}
                      <motion.div 
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 flex items-center gap-2"
                      >
                        <Zap size={14} className="text-yellow-400" />
                        <div className="h-2 w-8 bg-white/40 rounded-full" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="lp-section" id="features">
        <div className="lp-container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lp-section-header"
          >
            <h2 className="lp-section-title">Complete control at every level</h2>
            <p className="lp-section-desc">
              Dedicated interfaces designed specifically for the unique workflows of administrators, teachers, students, and parents.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lp-tabs relative"
          >
            {['admin', 'teacher', 'student'].map((tab) => (
              <button 
                key={tab}
                className={`lp-tab relative z-10 ${activeTab === tab ? 'text-[var(--background)]' : ''}`}
                onClick={() => setActiveTab(tab as any)}
              >
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-[var(--foreground)] rounded-lg -z-10 shadow-lg"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="capitalize">{tab === 'student' ? 'Student & Parent' : tab} Panel</span>
              </button>
            ))}
          </motion.div>

          <motion.div 
            layout
            className="lp-features-grid mt-8"
          >
            <AnimatePresence mode="popLayout">
              {features[activeTab].map((feat, i) => (
                <motion.div 
                  key={`${activeTab}-${i}`}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  whileHover={{ y: -5, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  className="lp-feature-card group"
                >
                  <div className="lp-feature-icon transition-transform duration-300 group-hover:scale-110 group-hover:bg-indigo-500/10 group-hover:text-indigo-500 group-hover:border-indigo-500/20">
                    {feat.icon}
                  </div>
                  <h3 className="lp-feature-title group-hover:text-indigo-400 transition-colors">{feat.title}</h3>
                  <p className="lp-feature-desc">{feat.desc}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="lp-section relative" id="pricing">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent pointer-events-none" />
        <div className="lp-container relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lp-section-header"
          >
            <h2 className="lp-section-title">Fair pricing that scales with you</h2>
            <p className="lp-section-desc">
              More students = more discount. Start small and watch your per-student cost drop as your institution grows.
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="lp-pricing-grid"
          >
            {pricing.map((plan, i) => (
              <motion.div 
                key={i} 
                variants={fadeUpVariant}
                whileHover={{ y: -8 }}
                className={`lp-price-card ${plan.popular ? 'popular border-indigo-500/40 shadow-indigo-500/10 shadow-2xl' : ''}`} 
                style={{ '--accent': plan.color } as React.CSSProperties}
              >
                {plan.popular && (
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ yoyo: Infinity, duration: 2 }}
                    className="lp-popular-badge shadow-lg"
                  >
                    Most Popular
                  </motion.div>
                )}
                <h3 className="lp-plan-name">{plan.name}</h3>
                <div className="lp-plan-limit text-[var(--accent)]">{plan.limit}</div>
                <div className="lp-plan-price mt-4">
                  {plan.price !== 'Custom' && <span className="lp-currency">৳</span>}
                  <span className="lp-amount">{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="lp-period">/month</span>}
                </div>
                <div className="lp-plan-per-student bg-white/5 border border-white/10 shadow-inner">
                  ৳{plan.perStudent} per student
                </div>
                <ul className="lp-plan-features">
                  <li><Check size={16} className="text-[var(--accent)]" /> <span>Full Panel Access</span></li>
                  <li><Check size={16} className="text-[var(--accent)]" /> <span>Mobile App</span></li>
                  <li><Check size={16} className="text-[var(--accent)]" /> <span>Support Included</span></li>
                </ul>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-auto pt-6">
                  <Link href="/register" className="lp-btn lp-btn-block flex justify-center" style={{ background: plan.popular ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--glass-bg)', color: plan.popular ? '#fff' : 'var(--foreground)' }}>
                    Get Started
                  </Link>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lp-setup-fee-banner shadow-xl mt-12 bg-gradient-to-r from-[var(--glass-bg)] to-indigo-500/10 border-indigo-500/20"
          >
            <div className="lp-setup-content">
              <span className="lp-setup-label text-indigo-400">One-time Setup Fee</span>
              <span className="lp-setup-price">৳10,000</span>
            </div>
            <div className="lp-setup-desc">
              Includes comprehensive initial setup, data migration assistance, and dedicated free training for your entire staff.
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer border-t border-[var(--glass-border)] bg-[var(--background)] py-12">
        <div className="lp-container lp-footer-inner flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="lp-footer-brand flex flex-col items-center md:items-start gap-2">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold">
              <div className="lp-brand-icon w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30"><GraduationCap size={16} strokeWidth={2.2} /></div>
              <span>SchoolCare</span>
            </Link>
            <div className="lp-footer-copy text-sm text-[var(--muted-foreground)]">© 2026 SchoolCare EMS. All rights reserved.</div>
          </div>
          <div className="lp-footer-links flex gap-6 text-sm font-medium text-[var(--muted-foreground)]">
            <Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link>
            <a href="mailto:schoolcare2026@gmail.com" className="hover:text-indigo-400 transition-colors">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
