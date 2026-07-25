"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap, Building2, MapPin, Phone, Mail,
  CheckCircle2, Circle, Loader2, ArrowRight, Sparkles,
  BookOpen, LayoutGrid, Tag, CreditCard, Rocket,
  ShieldCheck, Users, Clock,
} from 'lucide-react';

type FormData = {
  schoolId: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  avatar: string;
};

type SetupStep = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'idle' | 'running' | 'done' | 'error';
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function CreateSchoolPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    schoolId: generateUUID(),
    name: '',
    address: '',
    phone: '',
    email: '',
    avatar: 'https://ui-avatars.com/api/?name=School',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState<Record<string, boolean>>({});

  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    { id: 'school',   label: 'Create Institution',    description: 'Registering your school profile',       icon: <Building2 size={14} />,   status: 'idle' },
    { id: 'classes',  label: 'Set Up Classes',         description: 'Creating 5 default class levels',       icon: <LayoutGrid size={14} />,  status: 'idle' },
    { id: 'sections', label: 'Add Sections',           description: 'Adding Section A to each class',        icon: <BookOpen size={14} />,    status: 'idle' },
    { id: 'subjects', label: 'Load Subjects',          description: 'Assigning Math, Science & English',     icon: <Tag size={14} />,         status: 'idle' },
    { id: 'pricing',  label: 'Activate Free Plan',     description: 'Assigning 1-year free subscription',    icon: <CreditCard size={14} />,  status: 'idle' },
  ]);

  useEffect(() => { setMounted(true); }, []);

  const setStepStatus = (id: string, status: SetupStep['status']) => {
    setSetupSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const setFocusState = (field: string, val: boolean) =>
    setFocused(prev => ({ ...prev, [field]: val }));

  const isActiveField = (field: string) => focused[field] || !!formData[field as keyof FormData];

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) throw new Error('Authentication token missing. Please log in again.');

      const headers: HeadersInit = {
        'accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      // Step 1: Create school
      setStepStatus('school', 'running');
      const schoolRes = await fetch('https://smart-school-backend-production.up.railway.app/admin/schools', {
        method: 'POST', headers, body: JSON.stringify(formData),
      });
      if (!schoolRes.ok) throw new Error('Failed to create school. Please try again.');
      const schoolData = await schoolRes.json();
      const actualSchoolId = schoolData.schoolId || schoolData.id || schoolData._id
        || schoolData.data?.schoolId || schoolData.data?.id || schoolData.data?._id;
      if (!actualSchoolId) throw new Error('School created but could not retrieve school ID.');
      setStepStatus('school', 'done');

      // Step 2: Create 5 classes
      setStepStatus('classes', 'running');
      const classIds: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const classRes = await fetch('https://smart-school-backend-production.up.railway.app/admin/classes', {
          method: 'POST', headers,
          body: JSON.stringify({ name: `Class ${i}`, schoolId: actualSchoolId, description: `Standard class ${i}` }),
        });
        if (classRes.ok) {
          const cd = await classRes.json();
          const cid = cd.id || cd.data?.id || cd.classId;
          if (cid) classIds.push(cid);
        }
      }
      setStepStatus('classes', 'done');

      // Step 3: Create sections
      setStepStatus('sections', 'running');
      for (const cid of classIds) {
        await fetch('https://smart-school-backend-production.up.railway.app/admin/sections', {
          method: 'POST', headers,
          body: JSON.stringify({ name: 'Section A', classId: cid }),
        });
      }
      setStepStatus('sections', 'done');

      // Step 4: Create subjects
      setStepStatus('subjects', 'running');
      const subjects = [
        { name: 'Mathematics', code: 'MATH101' },
        { name: 'Science', code: 'SCI101' },
        { name: 'English', code: 'ENG101' },
      ];
      for (const cid of classIds) {
        for (const sub of subjects) {
          await fetch('https://smart-school-backend-production.up.railway.app/admin/subjects', {
            method: 'POST', headers,
            body: JSON.stringify({ ...sub, classId: cid, schoolId: actualSchoolId }),
          });
        }
      }
      setStepStatus('subjects', 'done');

      // Step 5: Fetch & assign pricing plan
      setStepStatus('pricing', 'running');
      let pricingPlanId = '';
      const plansRes = await fetch('https://smart-school-backend-production.up.railway.app/pricing/plans', {
        method: 'GET', headers: { 'accept': '*/*' },
      });
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        const plans = plansData.data || plansData;
        if (Array.isArray(plans) && plans.length > 0) {
          pricingPlanId = plans[0].id || plans[0].pricingPlanId || '';
        }
      }
      if (pricingPlanId) {
        const startDate = new Date().toISOString();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        await fetch('https://smart-school-backend-production.up.railway.app/subscriptions/assign', {
          method: 'POST', headers,
          body: JSON.stringify({
            schoolId: actualSchoolId,
            pricingPlanId,
            startDate,
            endDate: endDate.toISOString(),
            isActive: true,
          }),
        });
      }
      setStepStatus('pricing', 'done');

      setDone(true);
      setTimeout(() => router.push('/dashboard'), 2200);

    } catch (err: any) {
      setError(err.message);
      // Mark running step as error
      setSetupSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
      setLoading(false);
    }
  };

  const fields = [
    { id: 'name',    label: 'School name',       type: 'text',  icon: <Building2 size={15} />, placeholder: 'Greenwood High School' },
    { id: 'address', label: 'Full address',       type: 'text',  icon: <MapPin size={15} />,    placeholder: '123 Education Lane, City' },
    { id: 'phone',   label: 'Contact phone',      type: 'tel',   icon: <Phone size={15} />,     placeholder: '+1 234 567 8900' },
    { id: 'email',   label: 'Contact email',      type: 'email', icon: <Mail size={15} />,      placeholder: 'contact@school.com' },
  ];

  return (
    <div className="cs-root">

      {/* ── Animated background ── */}
      <div className="cs-bg-mesh" aria-hidden="true">
        <div className="cs-orb cs-orb-1" />
        <div className="cs-orb cs-orb-2" />
        <div className="cs-orb cs-orb-3" />
        <div className="cs-grid" />
      </div>

      {/* ── Navbar ── */}
      <nav className="cs-nav">
        <Link href="/" className="cs-brand">
          <div className="cs-brand-icon"><GraduationCap size={18} strokeWidth={2.2} /></div>
          <span>SchoolCare</span>
        </Link>
        <div className="cs-nav-right">
          <div className="cs-nav-step-pill">
            <CheckCircle2 size={13} className="cs-pill-check" />
            <span>Account created</span>
          </div>
          <div className="cs-nav-step-pill active">
            <div className="cs-pill-dot" />
            <span>Set up school</span>
          </div>
          <div className="cs-nav-step-pill muted">
            <Circle size={12} />
            <span>Go to dashboard</span>
          </div>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="cs-body">

        {/* ── LEFT: info panel ── */}
        <div className="cs-left">
          <div className="cs-left-inner">

            <div className="cs-trust-badge">
              <Sparkles size={12} />
              <span>One-time setup · Takes under 2 minutes</span>
            </div>

            <h1 className="cs-headline">
              Set up your <span className="cs-highlight">institution</span> in minutes
            </h1>

            <p className="cs-sub">
              We'll automatically configure classes, sections, subjects,
              and a free 1-year subscription the moment you hit submit.
            </p>

            {/* What gets created */}
            <div className="cs-what-section">
              <div className="cs-what-title">What we set up for you</div>
              <div className="cs-what-items">
                {[
                  { icon: <LayoutGrid size={14} />, label: '5 default class levels', color: '#818cf8' },
                  { icon: <BookOpen size={14} />,   label: 'Section A per class',     color: '#34d399' },
                  { icon: <Tag size={14} />,        label: 'Math, Science & English', color: '#fbbf24' },
                  { icon: <CreditCard size={14} />, label: '1-year free subscription',color: '#f472b6' },
                ].map((item, i) => (
                  <div key={i} className="cs-what-item">
                    <div className="cs-what-icon" style={{ color: item.color }}>{item.icon}</div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div className="cs-stats-row">
              {[
                { icon: <Users size={14} />,  value: '500+',   label: 'Schools' },
                { icon: <Clock size={14} />,  value: '< 2min', label: 'Setup time' },
                { icon: <ShieldCheck size={14} />, value: '100%', label: 'Secure' },
              ].map((s, i) => (
                <div key={i} className="cs-stat">
                  <div className="cs-stat-icon">{s.icon}</div>
                  <div className="cs-stat-value">{s.value}</div>
                  <div className="cs-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── RIGHT: form/progress card ── */}
        <div className="cs-right">
          <div className={`cs-card ${mounted ? 'mounted' : ''}`}>

            {/* Card header */}
            <div className="cs-card-header">
              <div className="cs-card-brand">
                <div className="cs-card-brand-icon">
                  <GraduationCap size={16} strokeWidth={2.2} />
                </div>
                <span>SchoolCare</span>
              </div>
              <div className="cs-step-label-pill">Step 3 of 3</div>
            </div>

            {/* ── SUCCESS STATE ── */}
            {done ? (
              <div className="cs-success-state">
                <div className="cs-success-icon-wrap">
                  <Rocket size={32} className="cs-success-rocket" />
                </div>
                <h2 className="cs-success-title">You're all set!</h2>
                <p className="cs-success-sub">
                  Your school has been configured. Redirecting to your dashboard…
                </p>
                <div className="cs-redirect-bar">
                  <div className="cs-redirect-fill" />
                </div>
              </div>
            ) : loading ? (
              /* ── LOADING / PROGRESS STATE ── */
              <div className="cs-progress-state">
                <h2 className="cs-card-title">Setting up your school</h2>
                <p className="cs-card-subtitle">
                  This usually takes less than 30 seconds. Please don't close this tab.
                </p>

                <div className="cs-steps-list">
                  {setupSteps.map((step, i) => (
                    <div key={step.id} className={`cs-setup-step cs-setup-step--${step.status}`}>
                      <div className="cs-setup-step-icon">
                        {step.status === 'done'    && <CheckCircle2 size={16} />}
                        {step.status === 'running' && <Loader2 size={16} className="cs-spin" />}
                        {step.status === 'idle'    && <Circle size={16} />}
                        {step.status === 'error'   && <Circle size={16} />}
                      </div>
                      <div className="cs-setup-step-text">
                        <div className="cs-setup-step-label">{step.label}</div>
                        <div className="cs-setup-step-desc">{step.description}</div>
                      </div>
                      {i < setupSteps.length - 1 && (
                        <div className={`cs-setup-connector ${step.status === 'done' ? 'done' : ''}`} />
                      )}
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="cs-error" role="alert">
                    <span className="cs-error-dot" />
                    {error}
                  </div>
                )}
              </div>
            ) : (
              /* ── FORM STATE ── */
              <>
                <h2 className="cs-card-title">Create your school</h2>
                <p className="cs-card-subtitle">
                  Enter your institution details. Everything else gets set up automatically.
                </p>

                {error && (
                  <div className="cs-error" role="alert">
                    <span className="cs-error-dot" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="cs-form" noValidate>
                  {fields.map((f) => (
                    <div key={f.id} className={`cs-field ${isActiveField(f.id) ? 'active' : ''}`}>
                      <div className="cs-field-icon">{f.icon}</div>
                      <input
                        id={f.id}
                        type={f.type}
                        className="cs-input"
                        value={formData[f.id as keyof FormData]}
                        onChange={handleChange}
                        onFocus={() => setFocusState(f.id, true)}
                        onBlur={() => setFocusState(f.id, false)}
                        required
                        placeholder=" "
                        autoComplete="off"
                      />
                      <label htmlFor={f.id} className="cs-float-label">{f.label}</label>
                      <div className="cs-field-line" />
                    </div>
                  ))}

                  <button id="cs-submit-btn" type="submit" className="cs-submit">
                    <Rocket size={16} />
                    <span>Create School &amp; Finish Setup</span>
                    <ArrowRight size={16} />
                  </button>
                </form>

                {/* What happens next hint */}
                <div className="cs-hint-row">
                  <CheckCircle2 size={13} className="cs-hint-check" />
                  <span>Classes, sections, subjects & subscription are set up automatically</span>
                </div>
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
