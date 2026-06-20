"use client";

import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Filter } from 'lucide-react';

const mockStudents = [
  { id: 'S001', name: 'Alice Smith', class: 'Class 10', section: 'A', status: 'Active' },
  { id: 'S002', name: 'Bob Jones', class: 'Class 9', section: 'B', status: 'Active' },
  { id: 'S003', name: 'Charlie Brown', class: 'Class 10', section: 'A', status: 'Inactive' },
  { id: 'S004', name: 'Diana Prince', class: 'Class 8', section: 'C', status: 'Active' },
  { id: 'S005', name: 'Evan Wright', class: 'Class 9', section: 'A', status: 'Active' },
];

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = mockStudents.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage and view student records</p>
        </div>
        <button className="btn btn-primary gap-2">
          <Plus size={18} /> Add Student
        </button>
      </div>

      <div className="data-table-wrapper">
        <div className="data-table-header">
          <div className="search-bar" style={{ display: 'flex', width: '300px', border: '1px solid var(--border)' }}>
            <Search size={18} className="text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn" style={{ border: '1px solid var(--border)', gap: '0.5rem' }}>
            <Filter size={18} /> Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Class</th>
                <th>Section</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td>{student.id}</td>
                    <td className="font-medium">{student.name}</td>
                    <td>{student.class}</td>
                    <td>{student.section}</td>
                    <td>
                      <span className={`badge ${student.status === 'Active' ? 'badge-success' : 'badge-destructive'}`}>
                        {student.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn" title="View"><Eye size={16} /></button>
                        <button className="action-btn" title="Edit"><Edit size={16} /></button>
                        <button className="action-btn" style={{ color: 'var(--destructive)' }} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
