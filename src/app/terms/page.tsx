"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap, FileText, ArrowLeft, ChevronRight,
  Shield, Scale, AlertTriangle, RefreshCw, Mail,
} from 'lucide-react';

const LAST_UPDATED = 'July 25, 2026';
const EFFECTIVE_DATE = 'July 25, 2026';

const sections = [
  {
    id: 'acceptance',
    icon: <Scale size={18} />,
    title: '1. Acceptance of Terms',
    content: [
      'By accessing or using SchoolCare ("the Platform," "we," "us," or "our"), you ("User," "Administrator," "School," or "you") agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to all of these Terms, do not use our platform.',
      'These Terms apply to all visitors, users, and others who access or use SchoolCare, including school administrators, teachers, parents, and any other authorised personnel.',
      'We reserve the right to update or modify these Terms at any time without prior notice. Your continued use of the Platform after any such changes constitutes your acceptance of the new Terms.',
    ],
  },
  {
    id: 'description',
    icon: <FileText size={18} />,
    title: '2. Description of Services',
    content: [
      'SchoolCare is a cloud-based Educational Management System (EMS) that provides schools and educational institutions with tools to manage student records, attendance tracking, grade management, staff administration, payroll processing, and performance analytics.',
      'Our services include, but are not limited to: student enrolment and profile management, class and section configuration, subject assignment, examination and grade tracking, staff and payroll management, real-time attendance monitoring, performance dashboard and analytics, and subscription-based access management.',
      'We reserve the right to modify, suspend, or discontinue any part of our services at any time. We will provide reasonable notice for significant changes that may affect your use of the Platform.',
    ],
  },
  {
    id: 'accounts',
    icon: <Shield size={18} />,
    title: '3. User Accounts & Registration',
    content: [
      'To use SchoolCare, you must create an administrator account. You agree to provide accurate, current, and complete information during registration, and to update such information to keep it accurate, current, and complete.',
      'You are responsible for safeguarding your password and for any activity or action that occurs under your account. You agree to notify us immediately of any unauthorised use of your account.',
      'You may not use another person\'s account without permission. You may not share your account credentials with individuals outside your institution without explicit written authorisation from SchoolCare.',
      'We reserve the right to disable any user account at our discretion if, in our opinion, you have violated any provision of these Terms.',
    ],
  },
  {
    id: 'data',
    icon: <Shield size={18} />,
    title: '4. Data & Privacy',
    content: [
      'Your use of SchoolCare is subject to our Privacy Policy, which is incorporated into these Terms by reference. By using the Platform, you consent to the collection, use, and sharing of your information as described in our Privacy Policy.',
      'As a school administrator, you are responsible for ensuring that any student data you enter into the Platform is collected and shared in compliance with applicable laws, including but not limited to GDPR, FERPA, COPPA, and any local data protection regulations in your jurisdiction.',
      'We implement industry-standard security measures including AES-256 encryption, secure HTTPS connections, and regular security audits. However, no method of transmission over the Internet is 100% secure.',
      'You retain ownership of all data you input into the Platform. We do not sell, rent, or trade your institution\'s data to third parties for marketing purposes.',
    ],
  },
  {
    id: 'payment',
    icon: <FileText size={18} />,
    title: '5. Subscription & Payment',
    content: [
      'SchoolCare offers a free tier and paid subscription plans. The free plan includes basic features for a limited period. Paid plans provide access to advanced features, increased storage, and priority support.',
      'All subscription fees are due in advance. Failure to pay fees may result in suspension or termination of your account. Refunds are issued at our sole discretion and subject to our Refund Policy.',
      'Prices are subject to change upon 30 days\' notice. Continued use of the Platform after a price change constitutes acceptance of the new pricing.',
      'You are responsible for all taxes applicable to the fees charged under your subscription plan.',
    ],
  },
  {
    id: 'conduct',
    icon: <AlertTriangle size={18} />,
    title: '6. Acceptable Use Policy',
    content: [
      'You agree not to use the Platform to: (a) violate any applicable laws or regulations; (b) infringe the intellectual property rights of others; (c) upload, transmit, or distribute any content that is unlawful, harmful, defamatory, or otherwise objectionable; (d) interfere with or disrupt the integrity or performance of the Platform.',
      'You agree not to attempt to gain unauthorised access to any portion of the Platform, or any other systems or networks connected to the Platform, whether through hacking, password mining, or any other means.',
      'You agree not to use any automated tools, bots, scrapers, or data-mining techniques to access, collect, or extract data from the Platform without our prior written consent.',
      'Violation of this policy may result in immediate termination of your account and, where appropriate, referral to law enforcement authorities.',
    ],
  },
  {
    id: 'ip',
    icon: <Scale size={18} />,
    title: '7. Intellectual Property',
    content: [
      'The Platform and its original content, features, and functionality are and will remain the exclusive property of SchoolCare and its licensors. The Platform is protected by copyright, trademark, and other laws.',
      'Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.',
      'You retain all rights to data and content that you submit to the Platform. By submitting content, you grant us a worldwide, non-exclusive, royalty-free licence to use, store, and process that content solely for the purpose of providing and improving our services.',
    ],
  },
  {
    id: 'liability',
    icon: <AlertTriangle size={18} />,
    title: '8. Limitation of Liability',
    content: [
      'To the maximum extent permitted by applicable law, SchoolCare shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of or inability to use the Platform.',
      'In no event shall our total liability to you for all claims exceed the amount paid by you to SchoolCare in the twelve (12) months preceding the claim.',
      'Some jurisdictions do not allow the exclusion of implied warranties or limitation of liability for incidental or consequential damages, so the above limitations may not apply to you.',
    ],
  },
  {
    id: 'termination',
    icon: <RefreshCw size={18} />,
    title: '9. Termination',
    content: [
      'We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including without limitation if you breach these Terms.',
      'Upon termination, your right to use the Platform will immediately cease. If you wish to terminate your account, you may simply discontinue using the Platform and contact us to request data deletion.',
      'All provisions of these Terms which by their nature should survive termination shall survive, including without limitation ownership provisions, warranty disclaimers, and limitations of liability.',
    ],
  },
  {
    id: 'governing',
    icon: <Scale size={18} />,
    title: '10. Governing Law',
    content: [
      'These Terms shall be governed and construed in accordance with the laws applicable in the jurisdiction where SchoolCare is registered, without regard to its conflict of law provisions.',
      'Any disputes arising from or relating to these Terms or your use of the Platform shall be resolved by binding arbitration, unless you opt out within 30 days of first accepting these Terms.',
      'If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.',
    ],
  },
  {
    id: 'contact',
    icon: <Mail size={18} />,
    title: '11. Contact Us',
    content: [
      'If you have any questions about these Terms and Conditions, please contact us:',
      'Email: schoolcare2026@gmail.com\nSupport: support@schoolcare.io\nAddress: SchoolCare EMS, Educational Technology Division',
      'We will endeavour to respond to all enquiries within 5 business days.',
    ],
  },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('acceptance');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handleScroll = () => {
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) setActiveSection(s.id);
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="legal-root">

      {/* ── Background ── */}
      <div className="legal-bg" aria-hidden="true">
        <div className="legal-orb legal-orb-1" />
        <div className="legal-orb legal-orb-2" />
        <div className="legal-grid" />
      </div>

      {/* ── Navbar ── */}
      <nav className="legal-nav">
        <Link href="/" className="legal-brand">
          <div className="legal-brand-icon"><GraduationCap size={18} strokeWidth={2.2} /></div>
          <span>SchoolCare</span>
        </Link>
        <div className="legal-nav-links">
          <Link href="/terms" className="legal-nav-link active">Terms</Link>
          <Link href="/privacy" className="legal-nav-link">Privacy</Link>
          <Link href="/login" className="legal-nav-cta">Sign in <ChevronRight size={13} /></Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className={`legal-hero ${mounted ? 'mounted' : ''}`}>
        <div className="legal-hero-badge">
          <Scale size={12} /> Legal Document
        </div>
        <h1 className="legal-hero-title">Terms &amp; Conditions</h1>
        <p className="legal-hero-sub">
          Please read these terms carefully before using SchoolCare. By accessing our platform,
          you agree to be bound by the terms described below.
        </p>
        <div className="legal-hero-meta">
          <span>Effective: <strong>{EFFECTIVE_DATE}</strong></span>
          <span className="legal-meta-sep" />
          <span>Last updated: <strong>{LAST_UPDATED}</strong></span>
          <span className="legal-meta-sep" />
          <Link href="/privacy" className="legal-switch-link">
            View Privacy Policy <ArrowLeft size={12} style={{ transform: 'rotate(180deg)' }} />
          </Link>
        </div>
      </div>

      {/* ── Body: sidebar + content ── */}
      <div className="legal-body">

        {/* Sidebar TOC */}
        <aside className="legal-sidebar">
          <div className="legal-toc-label">Table of Contents</div>
          <nav className="legal-toc">
            {sections.map((s) => (
              <button
                key={s.id}
                className={`legal-toc-item ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => scrollTo(s.id)}
              >
                <span className="legal-toc-dot" />
                {s.title}
              </button>
            ))}
          </nav>
          <div className="legal-sidebar-footer">
            <Link href="/privacy" className="legal-sidebar-link">
              <Shield size={13} /> Privacy Policy
            </Link>
            <Link href="/login" className="legal-sidebar-link">
              <ArrowLeft size={13} style={{ transform: 'rotate(180deg)' }} /> Sign in
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="legal-content">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="legal-section">
              <div className="legal-section-header">
                <div className="legal-section-icon">{s.icon}</div>
                <h2 className="legal-section-title">{s.title}</h2>
              </div>
              <div className="legal-section-body">
                {s.content.map((para, i) => (
                  <p key={i} className="legal-para">{para}</p>
                ))}
              </div>
            </section>
          ))}

          {/* Footer note */}
          <div className="legal-end-note">
            <Scale size={16} className="legal-end-icon" />
            <div>
              <div className="legal-end-title">Questions about our Terms?</div>
              <div className="legal-end-sub">
                Reach us at <a href="mailto:schoolcare2026@gmail.com">legal@schoolcare.io</a> — we respond within 5 business days.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
