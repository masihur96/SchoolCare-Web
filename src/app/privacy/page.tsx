"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap, Shield, ChevronRight, ArrowLeft,
  Eye, Database, Lock, Globe, UserCheck, Trash2, Mail,
  Cookie, RefreshCw, Scale,
} from 'lucide-react';

const LAST_UPDATED = 'July 25, 2026';
const EFFECTIVE_DATE = 'July 25, 2026';

const sections = [
  {
    id: 'overview',
    icon: <Shield size={18} />,
    title: '1. Overview',
    content: [
      'SchoolCare ("we," "us," or "our") is committed to protecting the privacy and security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Educational Management System (EMS) platform.',
      'This policy applies to all users of SchoolCare, including school administrators, teachers, staff, and any other authorised personnel. Please read this policy carefully. If you disagree with its terms, please discontinue use of the platform.',
      'We are committed to transparency in all our data practices and have designed our systems with privacy as a foundational principle, not an afterthought.',
    ],
  },
  {
    id: 'collection',
    icon: <Database size={18} />,
    title: '2. Information We Collect',
    content: [
      'Account Information: When you register, we collect your full name, email address, phone number, designation, and password (stored as a bcrypt hash). We never store your password in plain text.',
      'Institution Data: Information about your school including name, address, contact details, and organisational structure (classes, sections, subjects, staff hierarchy).',
      'Student Records: Student names, roll numbers, attendance records, grade data, performance metrics, and other academic information that you upload to the platform.',
      'Usage Data: We automatically collect information about how you interact with our platform, including IP addresses, browser type, pages visited, time spent, clicks, and referral URLs. This data is used to improve our services.',
      'Device Information: Device type, operating system, unique device identifiers, and network information to ensure compatibility and security.',
      'Communications: Records of support requests, feedback, and any correspondence you send to us.',
    ],
  },
  {
    id: 'use',
    icon: <Eye size={18} />,
    title: '3. How We Use Your Information',
    content: [
      'Service Delivery: To provide, operate, maintain, and improve the SchoolCare platform and all its features.',
      'Authentication & Security: To verify your identity, manage your account, and protect against fraudulent or unauthorised activity.',
      'Communication: To send you service-related notifications, updates, security alerts, and, where permitted, marketing communications. You can opt out of marketing emails at any time.',
      'Analytics & Improvement: To understand how users interact with our platform, identify bugs, optimise performance, and develop new features. We use aggregated, anonymised data for this purpose.',
      'Legal Compliance: To comply with applicable laws, respond to legal process, and enforce our Terms and Conditions.',
      'Customer Support: To investigate and address your enquiries and resolve disputes.',
      'We will never use your data for purposes that are incompatible with the purposes described in this policy without your consent.',
    ],
  },
  {
    id: 'sharing',
    icon: <Globe size={18} />,
    title: '4. Information Sharing & Disclosure',
    content: [
      'We do not sell, rent, or trade your personal information or your institution\'s data to third parties for marketing or advertising purposes. Period.',
      'Service Providers: We may share information with trusted third-party service providers who assist us in operating our platform (e.g., cloud infrastructure, email delivery, payment processing). These providers are contractually bound to use your data only to provide services to us.',
      'Legal Requirements: We may disclose your information if required to do so by law, court order, or governmental authority, or if we believe in good faith that such disclosure is necessary to protect our rights or the safety of others.',
      'Business Transfers: In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity. We will provide notice before your information becomes subject to a different privacy policy.',
      'Aggregate Data: We may share anonymised, aggregated data that cannot identify you or your institution for research, benchmarking, or industry analysis purposes.',
    ],
  },
  {
    id: 'security',
    icon: <Lock size={18} />,
    title: '5. Data Security',
    content: [
      'We implement industry-standard security measures to protect your information, including: AES-256 encryption for data at rest, TLS 1.3 encryption for data in transit, bcrypt password hashing, multi-factor authentication options, regular penetration testing and security audits, and role-based access control (RBAC).',
      'Our infrastructure is hosted on secure, SOC 2-compliant cloud providers with automatic backups and disaster recovery protocols.',
      'However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security. In the event of a data breach, we will notify affected users in accordance with applicable law.',
      'You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.',
    ],
  },
  {
    id: 'retention',
    icon: <Database size={18} />,
    title: '6. Data Retention',
    content: [
      'We retain your personal information and institution data for as long as your account is active or as needed to provide you services. We also retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.',
      'Active account data: Retained for the duration of your subscription plus 90 days after termination.',
      'Audit logs and security records: Retained for up to 2 years for security and compliance purposes.',
      'Backup data: Retained for up to 30 days after deletion before being permanently purged from our systems.',
      'Upon request, we will delete your personal data within 30 days, subject to legal retention requirements.',
    ],
  },
  {
    id: 'rights',
    icon: <UserCheck size={18} />,
    title: '7. Your Rights & Choices',
    content: [
      'Depending on your location, you may have the following rights regarding your personal data:',
      'Access: Request a copy of the personal data we hold about you.\nCorrection: Request that we correct inaccurate or incomplete data.\nDeletion: Request that we delete your personal data ("right to be forgotten").\nPortability: Request that we provide your data in a structured, machine-readable format.\nRestriction: Request that we restrict the processing of your data in certain circumstances.\nObjection: Object to our processing of your data where we rely on legitimate interests.',
      'To exercise any of these rights, please contact us at privacy@schoolcare.io. We will respond to your request within 30 days (or sooner as required by law).',
      'If you believe that we have not adequately addressed your privacy concerns, you have the right to lodge a complaint with the relevant data protection authority in your jurisdiction.',
    ],
  },
  {
    id: 'cookies',
    icon: <Cookie size={18} />,
    title: '8. Cookies & Tracking',
    content: [
      'We use cookies and similar tracking technologies to enhance your experience on our platform. Cookies are small files stored on your device that allow us to recognise you on subsequent visits.',
      'Essential Cookies: Required for the platform to function correctly (session management, authentication). These cannot be disabled.',
      'Analytics Cookies: Help us understand how users interact with the platform so we can improve it. You can opt out of these via your account settings.',
      'Preference Cookies: Remember your settings such as theme preference, language, and display options.',
      'We do not use third-party advertising cookies or tracking pixels for advertising purposes.',
    ],
  },
  {
    id: 'children',
    icon: <UserCheck size={18} />,
    title: '9. Children\'s Privacy',
    content: [
      'SchoolCare is designed for use by school administrators, teachers, and adult staff members. The platform is not intended to be used directly by children under the age of 13.',
      'Student data entered into the platform by school administrators (such as grades, attendance, and academic records) is treated with extra care and protected under applicable student data privacy laws including FERPA and, where applicable, COPPA.',
      'As a school administrator, you are responsible for ensuring that any student data you upload complies with applicable laws and that appropriate parental consents have been obtained where required.',
      'If you believe that we have inadvertently collected personal information from a child under 13 without proper consent, please contact us immediately and we will take steps to delete that information.',
    ],
  },
  {
    id: 'transfers',
    icon: <Globe size={18} />,
    title: '10. International Data Transfers',
    content: [
      'SchoolCare operates globally and may process your information in countries other than your own. These countries may have different data protection laws than your country of residence.',
      'For users in the European Economic Area (EEA) or United Kingdom, we ensure that international data transfers are protected by appropriate safeguards such as Standard Contractual Clauses (SCCs) or other mechanisms approved by the relevant authorities.',
      'By using SchoolCare, you consent to the transfer of your information to countries outside your country of residence, including countries that may have different data protection standards.',
    ],
  },
  {
    id: 'changes',
    icon: <RefreshCw size={18} />,
    title: '11. Changes to This Policy',
    content: [
      'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any significant changes by posting the new policy on this page and updating the "Last Updated" date.',
      'For material changes, we will provide at least 30 days\' notice before the new policy takes effect, either via email or a prominent notice on the platform.',
      'We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information.',
    ],
  },
  {
    id: 'contact',
    icon: <Mail size={18} />,
    title: '12. Contact & Data Protection Officer',
    content: [
      'If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:',
      'Privacy & Data Protection: privacy@schoolcare.io\nGeneral Support: support@schoolcare.io\nLegal Enquiries: legal@schoolcare.io',
      'For users in the EEA or UK, you may also contact our Data Protection Officer (DPO) directly. We will respond to all enquiries within 5 business days and to data subject requests within 30 days.',
    ],
  },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('overview');
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
        <div className="legal-orb legal-orb-1" style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)' }} />
        <div className="legal-orb legal-orb-2" style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        <div className="legal-grid" />
      </div>

      {/* ── Navbar ── */}
      <nav className="legal-nav">
        <Link href="/" className="legal-brand">
          <div className="legal-brand-icon"><GraduationCap size={18} strokeWidth={2.2} /></div>
          <span>SchoolCare</span>
        </Link>
        <div className="legal-nav-links">
          <Link href="/terms" className="legal-nav-link">Terms</Link>
          <Link href="/privacy" className="legal-nav-link active">Privacy</Link>
          <Link href="/login" className="legal-nav-cta">Sign in <ChevronRight size={13} /></Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className={`legal-hero ${mounted ? 'mounted' : ''}`}>
        <div className="legal-hero-badge" style={{ background: 'rgba(14,165,233,0.12)', borderColor: 'rgba(14,165,233,0.28)', color: '#7dd3fc' }}>
          <Shield size={12} /> Privacy Document
        </div>
        <h1 className="legal-hero-title" style={{ background: 'linear-gradient(135deg, #7dd3fc, #38bdf8, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Privacy Policy
        </h1>
        <p className="legal-hero-sub">
          We believe privacy is a fundamental right. This policy explains exactly what data we collect,
          why we collect it, and how you stay in control.
        </p>
        <div className="legal-hero-meta">
          <span>Effective: <strong>{EFFECTIVE_DATE}</strong></span>
          <span className="legal-meta-sep" />
          <span>Last updated: <strong>{LAST_UPDATED}</strong></span>
          <span className="legal-meta-sep" />
          <Link href="/terms" className="legal-switch-link">
            View Terms &amp; Conditions <ChevronRight size={12} />
          </Link>
        </div>

        {/* Quick commitments */}
        <div className="legal-commitments">
          {[
            { icon: <Shield size={14} />,   text: 'We never sell your data' },
            { icon: <Lock size={14} />,     text: 'AES-256 encryption' },
            { icon: <Eye size={14} />,      text: 'Full transparency' },
            { icon: <Trash2 size={14} />,   text: 'Right to deletion' },
          ].map((c, i) => (
            <div key={i} className="legal-commitment">
              <span className="legal-commitment-icon">{c.icon}</span>
              <span>{c.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
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
            <Link href="/terms" className="legal-sidebar-link">
              <Scale size={13} /> Terms &amp; Conditions
            </Link>
            <Link href="/login" className="legal-sidebar-link">
              <ChevronRight size={13} /> Sign in
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="legal-content">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="legal-section">
              <div className="legal-section-header">
                <div className="legal-section-icon" style={{ color: '#38bdf8', borderColor: 'rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.08)' }}>
                  {s.icon}
                </div>
                <h2 className="legal-section-title">{s.title}</h2>
              </div>
              <div className="legal-section-body">
                {s.content.map((para, i) => (
                  <p key={i} className="legal-para" style={{ whiteSpace: 'pre-line' }}>{para}</p>
                ))}
              </div>
            </section>
          ))}

          {/* Footer note */}
          <div className="legal-end-note">
            <Shield size={16} className="legal-end-icon" style={{ color: '#38bdf8' }} />
            <div>
              <div className="legal-end-title">Your privacy matters to us</div>
              <div className="legal-end-sub">
                Questions? Contact our Privacy team at <a href="mailto:schoolcare2026@gmail.com">privacy@schoolcare.io</a>.
                We respond within 5 business days.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
