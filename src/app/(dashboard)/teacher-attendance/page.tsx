"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2, Download, Check, Clock, Plus } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CreateTeacherAttendanceModal from '@/components/CreateTeacherAttendanceModal';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

interface TeacherEntity {
  id: string;
  name: string;
}

interface SchoolEntity {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  schoolId?: string;
}

interface TeacherAttendanceRecord {
  id: string;
  teacherId: string;
  date: string;
  time: string;
  startTime: string;
  endTime: string | null;
  status: string;
  distanceFromCenter: number;
  teacher: { name: string, designation: string } | null;
}

export default function TeacherAttendancePage() {
  const [records, setRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [teachersData, setTeachersData] = useState<TeacherEntity[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolEntity | null>(null);
  
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterTeacher, setFilterTeacher] = useState('');
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(getApiToken().split('.')[1]));
      return payload.schoolId;
    } catch (e) {
      return null;
    }
  };

  const userSchoolId = getUserSchoolId();

  const fetchFiltersData = useCallback(async () => {
    if (!userSchoolId) return;
    try {
      const headers = {
        'accept': '*/*',
        'Authorization': `Bearer ${getApiToken()}`
      };
      const [teachersRes, schoolsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/users?role=teacher&limit=100`, { headers }),
        fetch(`${API_BASE_URL}/admin/schools`, { headers })
      ]);
      const teachersJson = await teachersRes.json();
      const schoolsJson = await schoolsRes.json();

      const teachers: TeacherEntity[] = teachersJson.data?.data || [];
      const schools: SchoolEntity[] = Array.isArray(schoolsJson) ? schoolsJson : schoolsJson.data || [];

      setTeachersData(teachers);
      
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
        'Authorization': `Bearer ${getApiToken()}`
      };
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filterTeacher) queryParams.append('teacherId', filterTeacher);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const response = await fetch(`${API_BASE_URL}/admin/teacher-attendance?${queryParams.toString()}`, { headers });
      const json = await response.json();

      let fetchedRecords = [];
      let fetchedTotal = 0;
      
      if (Array.isArray(json)) {
        fetchedRecords = json;
        fetchedTotal = json.length;
      } else if (json.data && Array.isArray(json.data)) {
         fetchedRecords = json.data;
         fetchedTotal = json.data.length; 
      } else if (json.data?.data && Array.isArray(json.data.data)) {
         fetchedRecords = json.data.data;
         fetchedTotal = json.data.total || 0;
      }
      
      setRecords(fetchedRecords);
      setTotal(fetchedTotal || fetchedRecords.length);
      
    } catch (error) {
      console.error("Failed to fetch teacher attendance:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterTeacher, startDate, endDate]);

  useEffect(() => {
    fetchFiltersData();
  }, [fetchFiltersData]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const totalPages = Math.ceil(total / limit) || 1;

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    const schoolName = schoolInfo?.name || "Smart School Management System";
    const schoolAddress = schoolInfo?.address || "";
    const schoolContact = [schoolInfo?.phone, schoolInfo?.email].filter(Boolean).join(" | ");

    // Header
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
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
    doc.text("Teacher Attendance Report", 14, currentY);
    currentY += 8;
    
    // Filters Info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    let filterText = `Date Range: ${startDate} to ${endDate}`;
    
    if (filterTeacher) {
      const teacherName = teachersData.find(t => t.id === filterTeacher)?.name;
      if (teacherName) filterText += ` | Teacher: ${teacherName}`;
    }
    
    doc.text(filterText, 14, currentY);
    currentY += 8;
    
    const tableColumn = ["Date", "Teacher Name", "Designation", "Clock In", "Clock Out", "Distance (m)", "Status"];
    const tableRows: any[][] = [];
    
    records.forEach(record => {
      const recordData = [
        new Date(record.date).toLocaleDateString(),
        record.teacher?.name || 'Unknown',
        record.teacher?.designation || 'N/A',
        record.startTime ? new Date(record.startTime).toLocaleTimeString() : 'N/A',
        record.endTime ? new Date(record.endTime).toLocaleTimeString() : 'N/A',
        record.distanceFromCenter != null ? record.distanceFromCenter.toFixed(2) : 'N/A',
        record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('-', ' ') : 'Unknown'
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
        const str = 'Page ' + (doc.internal as any).getNumberOfPages();
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
    
    doc.save(`Teacher_Attendance_Report_${startDate}_to_${endDate}.pdf`);
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Teacher Attendance
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>View and export daily attendance for teachers</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn btn-primary gap-2" onClick={() => setShowCreateModal(true)} style={{ boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>
            <Plus size={18} /> Create Attendance
          </button>
          <button className="btn btn-secondary gap-2" onClick={exportToPDF} style={{ border: '1px solid var(--border)' }}>
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      <div className="data-table-wrapper glass-card">
        <div className="data-table-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Teacher</label>
                <select 
                  className="input" 
                  value={filterTeacher} 
                  onChange={(e) => {
                    setFilterTeacher(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '40px' }}
                >
                  <option value="">All Teachers</option>
                  {teachersData.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
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
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Teacher</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Clock In</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Clock Out</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', color: 'var(--muted-foreground)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div className="shimmer shimmer-text" style={{ width: '80px', margin: 0 }}></div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', width: '120px' }}>
                        <div className="shimmer shimmer-text"></div>
                        <div className="shimmer shimmer-text short" style={{ margin: 0 }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '80px' }}>
                        <div className="shimmer shimmer-text"></div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '80px' }}>
                        <div className="shimmer shimmer-text"></div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div className="shimmer shimmer-block" style={{ width: '80px', height: '24px', borderRadius: '999px' }}></div>
                    </td>
                  </tr>
                ))
              ) : records.length > 0 ? (
                records.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500 }}>
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{record.teacher?.name || 'Unknown'}</span>
                        {record.teacher?.designation && <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{record.teacher.designation}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} className="text-muted-foreground" />
                          {record.startTime ? new Date(record.startTime).toLocaleTimeString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} className="text-muted-foreground" />
                          {record.endTime ? new Date(record.endTime).toLocaleTimeString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span className={`badge flex items-center gap-1 w-max ${record.status?.includes('clock-in') ? 'badge-success' : 'badge-secondary'}`}>
                        {record.status?.includes('in') ? <Check size={14}/> : <Check size={14} className="opacity-50" />} 
                        {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('-', ' ') : 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
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
      
      {showCreateModal && (
        <CreateTeacherAttendanceModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchAttendance}
        />
      )}
    </div>
  );
}
