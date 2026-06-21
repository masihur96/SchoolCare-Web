"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2, Download, Check, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkYTBjM2ZmZi1hZTU5LTQ2YTMtYTAzNy0xOWZhNjgwMDNjNmIiLCJyb2xlIjoiYWRtaW4iLCJzY2hvb2xJZCI6IjI5ZjA1ZWRiLThlMGItNDM0Yy1hNDcxLWFhNzc2MzA4YTFjMSIsImNsYXNzSWRzIjpbXSwic2VjdGlvbklkcyI6W10sImlhdCI6MTc4MjA0MzA3NiwiZXhwIjoxNzgyMTI5NDc2fQ.AaOYBh65Rkp88CvK1S2_1uRNfk2NSM1wEi8xKtedw48';

interface ClassEntity {
  id: string;
  name: string;
  schoolId: string;
}

interface SectionEntity {
  id: string;
  name: string;
  classId: string;
}

interface SubjectEntity {
  id: string;
  name: string;
  schoolId: string;
}

interface SchoolEntity {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  schoolId?: string;
}

interface AttendanceRecord {
  id: string;
  studentName: string;
  date: string;
  status: string;
  student: { rollNumber: string } | null;
  class: { name: string } | null;
  section: { name: string } | null;
  subject: { name: string } | null;
  teacher: { name: string } | null;
  routine: { startTime: string; endTime: string } | null;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classesData, setClassesData] = useState<ClassEntity[]>([]);
  const [sectionsData, setSectionsData] = useState<SectionEntity[]>([]);
  const [subjectsData, setSubjectsData] = useState<SubjectEntity[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolEntity | null>(null);
  
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [showFilters, setShowFilters] = useState(false);

  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(API_TOKEN.split('.')[1]));
      return payload.schoolId;
    } catch (e) {
      return null;
    }
  };

  const userSchoolId = getUserSchoolId();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchFiltersData = useCallback(async () => {
    if (!userSchoolId) return;
    try {
      const headers = {
        'accept': '*/*',
        'Authorization': `Bearer ${API_TOKEN}`
      };
      const [classesRes, sectionsRes, subjectsRes, schoolsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/classes`, { headers }),
        fetch(`${API_BASE_URL}/admin/sections?schoolId=${userSchoolId}`, { headers }),
        fetch(`${API_BASE_URL}/admin/subjects`, { headers }),
        fetch(`${API_BASE_URL}/admin/schools`, { headers })
      ]);
      const classesJson = await classesRes.json();
      const sectionsJson = await sectionsRes.json();
      const subjectsJson = await subjectsRes.json();
      const schoolsJson = await schoolsRes.json();

      const classes: ClassEntity[] = Array.isArray(classesJson) ? classesJson : classesJson.data || [];
      const sections: SectionEntity[] = Array.isArray(sectionsJson) ? sectionsJson : sectionsJson.data || [];
      const subjects: SubjectEntity[] = Array.isArray(subjectsJson) ? subjectsJson : subjectsJson.data || [];
      const schools: SchoolEntity[] = Array.isArray(schoolsJson) ? schoolsJson : schoolsJson.data || [];

      setClassesData(classes.filter(c => c.schoolId === userSchoolId));
      setSectionsData(sections);
      setSubjectsData(subjects.filter(s => s.schoolId === userSchoolId));
      
      const userSchool = schools.find(s => s.schoolId === userSchoolId || s.id === userSchoolId);
      if (userSchool) {
        setSchoolInfo(userSchool);
      }
    } catch (error) {
      console.error("Failed to fetch filters data:", error);
    }
  }, [userSchoolId]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {
        'accept': '*/*',
        'Authorization': `Bearer ${API_TOKEN}`
      };
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (debouncedSearch) queryParams.append('studentName', debouncedSearch);
      if (filterClass) queryParams.append('classId', filterClass);
      if (filterSection) queryParams.append('sectionId', filterSection);
      if (filterSubject) queryParams.append('subjectId', filterSubject);
      if (filterStatus) queryParams.append('status', filterStatus);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const response = await fetch(`${API_BASE_URL}/admin/attendance/period?${queryParams.toString()}`, { headers });
      const json = await response.json();

      if (json.statusCode === 200) {
        setRecords(json.data?.data || []);
        setTotal(json.data?.total || 0);
      } else {
        setRecords([]);
        setTotal(0);
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, filterClass, filterSection, filterSubject, filterStatus, startDate, endDate]);

  useEffect(() => {
    fetchFiltersData();
  }, [fetchFiltersData]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const availableSections = filterClass 
    ? sectionsData.filter(s => s.classId === filterClass)
    : sectionsData;

  const totalPages = Math.ceil(total / limit);

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    const schoolName = schoolInfo?.name || "Smart School Management System";
    const schoolAddress = schoolInfo?.address || "";
    const schoolContact = [schoolInfo?.phone, schoolInfo?.email].filter(Boolean).join(" | ");

    // Header
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185); // Primary color
    doc.text(schoolName, 14, 22);
    
    let currentY = 30;
    
    if (schoolAddress || schoolContact) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      if (schoolAddress) {
        doc.text(schoolAddress, 14, currentY);
        currentY += 5;
      }
      if (schoolContact) {
        doc.text(schoolContact, 14, currentY);
        currentY += 5;
      }
      currentY += 3;
    }
    
    doc.setFontSize(16);
    doc.setTextColor(50, 50, 50);
    doc.text("Attendance Report", 14, currentY);
    currentY += 8;
    
    // Filters Info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    let filterText = `Date Range: ${startDate} to ${endDate}`;
    
    if (debouncedSearch) filterText += ` | Search: ${debouncedSearch}`;
    if (filterClass) {
      const className = classesData.find(c => c.id === filterClass)?.name;
      if (className) filterText += ` | Class: ${className}`;
    }
    if (filterSection) {
      const sectionName = sectionsData.find(s => s.id === filterSection)?.name;
      if (sectionName) filterText += ` | Section: ${sectionName}`;
    }
    if (filterSubject) {
      const subjectName = subjectsData.find(s => s.id === filterSubject)?.name;
      if (subjectName) filterText += ` | Subject: ${subjectName}`;
    }
    if (filterStatus) {
      filterText += ` | Status: ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}`;
    }
    
    doc.text(filterText, 14, currentY);
    currentY += 8;
    
    const tableColumn = ["Date", "Student Name", "Roll No", "Class", "Section", "Subject", "Teacher", "Time", "Status"];
    const tableRows = [];
    
    records.forEach(record => {
      const recordData = [
        new Date(record.date).toLocaleDateString(),
        record.studentName || 'N/A',
        record.student?.rollNumber || 'N/A',
        record.class?.name || 'N/A',
        record.section?.name || 'N/A',
        record.subject?.name || 'N/A',
        record.teacher?.name || 'N/A',
        record.routine ? `${record.routine.startTime} - ${record.routine.endTime}` : 'N/A',
        record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Unknown'
      ];
      tableRows.push(recordData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawPage: function (data) {
        // Footer
        const str = 'Page ' + doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          str,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
        const dateStr = `Generated on: ${new Date().toLocaleString()}`;
        doc.text(
          dateStr,
          doc.internal.pageSize.width - data.settings.margin.right - doc.getTextWidth(dateStr),
          doc.internal.pageSize.height - 10
        );
      }
    });
    
    doc.save(`Attendance_Report_${startDate}_to_${endDate}.pdf`);
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Attendance Overview
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>View and export daily attendance for students</p>
        </div>
        <button className="btn btn-primary gap-2" onClick={exportToPDF} style={{ boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>
          <Download size={18} /> Export PDF
        </button>
      </div>

      <div className="data-table-wrapper glass-card">
        <div className="data-table-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div className="search-bar" style={{ display: 'flex', width: '300px', border: '1px solid var(--border)', borderRadius: '9999px', overflow: 'hidden', padding: '0 1rem', height: '40px', background: 'var(--background)' }}>
              <Search size={18} style={{ color: 'var(--muted-foreground)', marginRight: '0.5rem', marginTop: 'auto', marginBottom: 'auto' }} />
              <input 
                type="text" 
                placeholder="Search by student name..." 
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', color: 'var(--foreground)' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn" onClick={() => setShowFilters(!showFilters)} style={{ border: '1px solid var(--border)', gap: '0.5rem', background: showFilters ? 'var(--primary)' : 'var(--card)', color: showFilters ? 'var(--primary-foreground)' : 'var(--foreground)' }}>
                <Filter size={18} /> Filters
              </button>
            </div>
          </div>
          
          {showFilters && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Start Date</label>
                <input 
                  type="date" 
                  className="input" 
                  value={startDate} 
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '40px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>End Date</label>
                <input 
                  type="date" 
                  className="input" 
                  value={endDate} 
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '40px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Class</label>
                <select 
                  className="input" 
                  value={filterClass} 
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setFilterSection('');
                    setPage(1);
                  }}
                  style={{ height: '40px' }}
                >
                  <option value="">All Classes</option>
                  {classesData.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Section</label>
                <select 
                  className="input" 
                  value={filterSection} 
                  onChange={(e) => {
                    setFilterSection(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '40px' }}
                  disabled={!filterClass}
                >
                  <option value="">All Sections</option>
                  {availableSections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Subject</label>
                <select 
                  className="input" 
                  value={filterSubject} 
                  onChange={(e) => {
                    setFilterSubject(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '40px' }}
                >
                  <option value="">All Subjects</option>
                  {subjectsData.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Status</label>
                <select 
                  className="input" 
                  value={filterStatus} 
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '40px' }}
                >
                  <option value="">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Student</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Class/Sec</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Subject/Teacher</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Time</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                      <p style={{ color: 'var(--muted-foreground)' }}>Loading attendance data...</p>
                    </div>
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500 }}>
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{record.studentName}</span>
                        {record.student?.rollNumber && <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Roll: {record.student.rollNumber}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          Class: {record.class?.name || 'N/A'}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                          Sec: {record.section?.name || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          {record.subject?.name || 'N/A'}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                          {record.teacher?.name || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                        {record.routine ? `${record.routine.startTime} - ${record.routine.endTime}` : 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span className={`badge flex items-center gap-1 w-max ${record.status?.toLowerCase() === 'present' ? 'badge-success' : 'badge-destructive'}`}>
                        {record.status?.toLowerCase() === 'present' ? <Check size={14}/> : <X size={14}/>} 
                        {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Search size={40} style={{ color: 'var(--border)', marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>No attendance records found</p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Try adjusting your search query or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} records
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn" 
                style={{ padding: '0.5rem', border: '1px solid var(--border)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                className="btn" 
                style={{ padding: '0.5rem', border: '1px solid var(--border)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
