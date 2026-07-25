"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap, ChevronRight, CheckCircle2, Shield,
  Users, BookOpen, Clock, Megaphone, Bell, CreditCard,
  Building2, ArrowRight, TrendingUp, Search, Calendar,
  Smartphone, UserCheck, Check
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
          <Link href="/login" className="lp-nav-link">Sign in</Link>
          <Link href="/register" className="lp-btn lp-btn-primary">Get Started <ChevronRight size={14} /></Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className={`lp-hero ${mounted ? 'mounted' : ''}`}>
        <div className="lp-hero-badge">
          <Shield size={12} /> The Future of School Management
        </div>
        <h1 className="lp-hero-title">
          Manage your institution <br />
          <span className="lp-highlight">smarter, not harder.</span>
        </h1>
        <p className="lp-hero-sub">
          A complete ecosystem for administrators, teachers, students, and parents.
          Automate attendance, grading, communication, and payroll in one premium platform.
        </p>
        <div className="lp-hero-cta">
          <Link href="/register" className="lp-btn lp-btn-primary lp-btn-lg">
            Create Free Account <ArrowRight size={16} />
          </Link>
          <Link href="#features" className="lp-btn lp-btn-outline lp-btn-lg">
            Explore Features
          </Link>
        </div>
        <div className="lp-hero-trust">
          <div className="lp-trust-item"><CheckCircle2 size={14} /> Free 7-day trial</div>
          <div className="lp-trust-item"><CheckCircle2 size={14} /> No credit card required</div>
          <div className="lp-trust-item"><CheckCircle2 size={14} /> Cancel anytime</div>
        </div>
      </header>

      {/* About Section */}
      <section className="lp-section lp-about" id="about">
        <div className="lp-container">
          <div className="lp-about-grid">
            <div className="lp-about-content">
              <h2 className="lp-section-title">Built for the modern institution</h2>
              <p className="lp-section-desc text-left">
                SchoolCare was born out of a simple necessity: education management shouldn't be trapped in the past. 
                We've combined enterprise-grade architecture with consumer-grade design to create a platform that everyone—from principles to parents—actually enjoys using.
              </p>
              <div className="lp-perks-list">
                <div className="lp-perk-item">
                  <div className="lp-perk-icon"><Smartphone size={16} /></div>
                  <div>
                    <h4>Mobile App Included</h4>
                    <p>Stay connected on iOS and Android wherever you are.</p>
                  </div>
                </div>
                <div className="lp-perk-item">
                  <div className="lp-perk-icon"><Shield size={16} /></div>
                  <div>
                    <h4>Bangla Support</h4>
                    <p>Fully localized interface and support in Bengali.</p>
                  </div>
                </div>
                <div className="lp-perk-item">
                  <div className="lp-perk-icon"><GraduationCap size={16} /></div>
                  <div>
                    <h4>Free Training</h4>
                    <p>Onboarding and training provided at zero extra cost.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="lp-about-visual">
              {/* Abstract dashboard representation */}
              <div className="lp-abstract-dash">
                <div className="lp-abs-header">
                  <div className="lp-abs-dots"><span/><span/><span/></div>
                </div>
                <div className="lp-abs-body">
                  <div className="lp-abs-sidebar">
                    <div className="lp-abs-line active" />
                    <div className="lp-abs-line" />
                    <div className="lp-abs-line" />
                    <div className="lp-abs-line" />
                  </div>
                  <div className="lp-abs-main">
                    <div className="lp-abs-cards">
                      <div className="lp-abs-card" />
                      <div className="lp-abs-card" />
                      <div className="lp-abs-card" />
                    </div>
                    <div className="lp-abs-chart">
                      <div className="lp-abs-bar" style={{height: '40%'}}/>
                      <div className="lp-abs-bar" style={{height: '70%'}}/>
                      <div className="lp-abs-bar" style={{height: '50%'}}/>
                      <div className="lp-abs-bar" style={{height: '90%'}}/>
                      <div className="lp-abs-bar" style={{height: '60%'}}/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="lp-section" id="features">
        <div className="lp-container">
          <div className="lp-section-header">
            <h2 className="lp-section-title">Complete control at every level</h2>
            <p className="lp-section-desc">
              Dedicated interfaces designed specifically for the unique workflows of administrators, teachers, students, and parents.
            </p>
          </div>

          <div className="lp-tabs">
            <button className={`lp-tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
              Admin Panel
            </button>
            <button className={`lp-tab ${activeTab === 'teacher' ? 'active' : ''}`} onClick={() => setActiveTab('teacher')}>
              Teacher Panel
            </button>
            <button className={`lp-tab ${activeTab === 'student' ? 'active' : ''}`} onClick={() => setActiveTab('student')}>
              Student & Parent Panel
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
      <section className="lp-section" id="pricing">
        <div className="lp-container">
          <div className="lp-section-header">
            <h2 className="lp-section-title">Fair pricing that scales with you</h2>
            <p className="lp-section-desc">
              More students = more discount. Start small and watch your per-student cost drop as your institution grows.
            </p>
          </div>

          <div className="lp-pricing-grid">
            {pricing.map((plan, i) => (
              <div key={i} className={`lp-price-card ${plan.popular ? 'popular' : ''}`} style={{ '--accent': plan.color } as React.CSSProperties}>
                {plan.popular && <div className="lp-popular-badge">Most Popular</div>}
                <h3 className="lp-plan-name">{plan.name}</h3>
                <div className="lp-plan-limit">{plan.limit}</div>
                <div className="lp-plan-price">
                  {plan.price !== 'Custom' && <span className="lp-currency">৳</span>}
                  <span className="lp-amount">{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="lp-period">/month</span>}
                </div>
                <div className="lp-plan-per-student">
                  ৳{plan.perStudent} per student
                </div>
                <ul className="lp-plan-features">
                  <li><Check size={14} /> Full Panel Access</li>
                  <li><Check size={14} /> Mobile App</li>
                  <li><Check size={14} /> Support Included</li>
                </ul>
                <Link href="/register" className="lp-btn lp-btn-block" style={{ marginTop: 'auto', background: plan.popular ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : 'rgba(255,255,255,0.05)' }}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          <div className="lp-setup-fee-banner">
            <div className="lp-setup-content">
              <span className="lp-setup-label">One-time Setup Fee</span>
              <span className="lp-setup-price">৳10,000</span>
            </div>
            <div className="lp-setup-desc">
              Includes comprehensive initial setup, data migration assistance, and dedicated free training for your entire staff.
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-brand-icon"><GraduationCap size={18} strokeWidth={2.2} /></div>
            <span>SchoolCare</span>
            <div className="lp-footer-copy">© 2026 SchoolCare EMS. All rights reserved.</div>
          </div>
          <div className="lp-footer-links">
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <a href="mailto:schoolcare2026@gmail.com">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
