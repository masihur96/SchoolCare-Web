"use client";

import React, { useRef } from 'react';
import { Download, Check, X, Filter } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const mockAttendance = [
  { id: 'S001', name: 'Alice Smith', role: 'Student', class: 'Class 10', status: 'Present', time: '08:15 AM' },
  { id: 'S002', name: 'Bob Jones', role: 'Student', class: 'Class 10', status: 'Absent', time: '-' },
  { id: 'T001', name: 'Michael Scott', role: 'Teacher', class: 'English Dept', status: 'Present', time: '07:50 AM' },
];

export default function AttendancePage() {
  const tableRef = useRef<HTMLDivElement>(null);

  const exportToPDF = async () => {
    if (tableRef.current) {
      const canvas = await html2canvas(tableRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('attendance_report.pdf');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Attendance Overview</h1>
          <p className="text-muted-foreground">View and export daily attendance for students and teachers</p>
        </div>
        <button className="btn btn-primary gap-2" onClick={exportToPDF}>
          <Download size={18} /> Export PDF
        </button>
      </div>

      <div className="data-table-wrapper">
        <div className="data-table-header">
          <div className="flex gap-4">
            <select className="input bg-transparent w-48">
              <option>All Roles</option>
              <option>Students</option>
              <option>Teachers</option>
            </select>
            <input type="date" className="input bg-transparent w-48" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <button className="btn" style={{ border: '1px solid var(--border)', gap: '0.5rem' }}>
            <Filter size={18} /> Filter
          </button>
        </div>

        <div className="overflow-x-auto" ref={tableRef}>
          <div style={{ padding: '1rem', display: 'none' }} className="print-header">
            <h2 className="text-xl font-bold mb-4">Daily Attendance Report - {new Date().toLocaleDateString()}</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Class / Dept</th>
                <th>Time in</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockAttendance.map(record => (
                <tr key={record.id}>
                  <td>{record.id}</td>
                  <td className="font-medium">{record.name}</td>
                  <td>{record.role}</td>
                  <td>{record.class}</td>
                  <td>{record.time}</td>
                  <td>
                    <span className={`badge flex items-center gap-1 w-max ${record.status === 'Present' ? 'badge-success' : 'badge-destructive'}`}>
                      {record.status === 'Present' ? <Check size={14}/> : <X size={14}/>} {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
