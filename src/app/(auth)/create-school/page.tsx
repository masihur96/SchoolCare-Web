"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateSchoolPage() {
  const router = useRouter();
  // Generate UUID for schoolId
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const [formData, setFormData] = useState({
    schoolId: generateUUID(),
    name: '',
    address: '',
    phone: '',
    email: '',
    avatar: 'https://ui-avatars.com/api/?name=School',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

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
    setStatus('Creating school...');

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication token is missing. Please log in or register again to obtain a token before creating a school.');
      }

      const headersWithAuth: any = {
        'accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // 1. Create School
      const schoolRes = await fetch('https://smart-school-backend-production.up.railway.app/admin/schools', {
        method: 'POST',
        headers: headersWithAuth,
        body: JSON.stringify(formData),
      });

      if (!schoolRes.ok) {
        throw new Error('Failed to create school. Please try again.');
      }
      
      const schoolData = await schoolRes.json();
      console.log('School created successfully. Backend response:', schoolData);
      
      // Extract the actual school ID from the backend response.
      const actualSchoolId = schoolData.schoolId 
                          || schoolData.id 
                          || schoolData._id 
                          || schoolData.data?.schoolId 
                          || schoolData.data?.id 
                          || schoolData.data?._id;

      if (!actualSchoolId) {
        throw new Error('School was created, but failed to retrieve the school ID from the response. Check the console for response details.');
      }

      // 2. Create 5 Classes
      setStatus('Setting up 5 classes...');
      const classIds = [];
      for (let i = 1; i <= 5; i++) {
        const classRes = await fetch('https://smart-school-backend-production.up.railway.app/admin/classes', {
          method: 'POST',
          headers: headersWithAuth,
          body: JSON.stringify({ 
            name: `Class ${i}`, 
            schoolId: actualSchoolId,
            description: `Standard class ${i}`
          }),
        });
        if (classRes.ok) {
          const classData = await classRes.json();
          const cid = classData.id || classData.data?.id || classData.classId;
          if (cid) {
            classIds.push(cid);
          }
        }
      }

      // 3. Create Sections
      setStatus('Setting up sections...');
      const sectionNames = ['Section A', 'Section B'];
      for (const cid of classIds) {
        await fetch('https://smart-school-backend-production.up.railway.app/admin/sections', {
          method: 'POST',
          headers: headersWithAuth,
          body: JSON.stringify({ name: sectionNames[0], classId: cid }),
        });
      }

      // 4. Create Subjects
      setStatus('Setting up subjects...');
      const subjects = [
        { name: 'Mathematics', code: 'MATH101' },
        { name: 'Science', code: 'SCI101' },
        { name: 'English', code: 'ENG101' }
      ];
      for (const cid of classIds) {
        for (const sub of subjects) {
          await fetch('https://smart-school-backend-production.up.railway.app/admin/subjects', {
            method: 'POST',
            headers: headersWithAuth,
            body: JSON.stringify({ ...sub, classId: cid, schoolId: actualSchoolId }),
          });
        }
      }

      // 5. Fetch Pricing Plans
      setStatus('Fetching pricing plans...');
      let pricingPlanId = '';
      const plansRes = await fetch('https://smart-school-backend-production.up.railway.app/pricing/plans', {
        method: 'GET',
        headers: { 'accept': '*/*' }
      });
      
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        const plans = plansData.data || plansData;
        if (Array.isArray(plans) && plans.length > 0) {
          pricingPlanId = plans[0].id || plans[0].pricingPlanId || '';
        }
      }

      // 6. Assign Free Pricing Plan
      if (pricingPlanId) {
        setStatus('Assigning free pricing plan...');
        const startDate = new Date().toISOString();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        
        await fetch('https://smart-school-backend-production.up.railway.app/subscriptions/assign', {
          method: 'POST',
          headers: headersWithAuth,
          body: JSON.stringify({
            schoolId: actualSchoolId,
            pricingPlanId: pricingPlanId,
            startDate: startDate,
            endDate: endDate.toISOString(),
            isActive: true
          }),
        });
      }

      setStatus('Setup complete! Redirecting to dashboard...');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-card glass-card">
      <div className="auth-header">
        <h1>Create School</h1>
        <p>Set up your institution to get started</p>
      </div>

      {error && <div className="error-message" style={{ color: '#ff4d4f', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>}
      {status && !error && <div className="status-message" style={{ color: 'var(--primary-color)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '500' }}>{status}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">School Name</label>
          <input type="text" id="name" className="input" placeholder="Greenwood High" value={formData.name} onChange={handleChange} required disabled={loading} />
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <input type="text" id="address" className="input" placeholder="123 Education Lane" value={formData.address} onChange={handleChange} required disabled={loading} />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Contact Phone</label>
          <input type="tel" id="phone" className="input" placeholder="+1234567890" value={formData.phone} onChange={handleChange} required disabled={loading} />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Contact Email</label>
          <input type="email" id="email" className="input" placeholder="contact@school.com" value={formData.email} onChange={handleChange} required disabled={loading} />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
          {loading ? 'Setting up...' : 'Create School & Finish Setup'}
        </button>
      </form>
    </div>
  );
}
