"use client";

import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Filter } from 'lucide-react';

const mockTeachers = [
  { id: 'T001', name: 'Michael Scott', subject: 'English', phone: '+1 234 567 890', status: 'Active' },
  { id: 'T002', name: 'Dwight Schrute', subject: 'Agriculture', phone: '+1 234 567 891', status: 'Active' },
  { id: 'T003', name: 'Jim Halpert', subject: 'Physical Education', phone: '+1 234 567 892', status: 'Inactive' },
  { id: 'T004', name: 'Pam Beesly', subject: 'Art', phone: '+1 234 567 893', status: 'Active' },
];

export default function TeachersPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTeachers = mockTeachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-muted-foreground">Manage and view teacher records</p>
        </div>
        <button className="btn btn-primary gap-2">
          <Plus size={18} /> Add Teacher
        </button>
      </div>

      <div className="data-table-wrapper">
        <div className="data-table-header">
          <div className="search-bar" style={{ display: 'flex', width: '300px', border: '1px solid var(--border)' }}>
            <Search size={18} className="text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by name or subject..." 
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
                <th>ID</th>
                <th>Name</th>
                <th>Subject</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map(teacher => (
                  <tr key={teacher.id}>
                    <td>{teacher.id}</td>
                    <td className="font-medium">{teacher.name}</td>
                    <td>{teacher.subject}</td>
                    <td>{teacher.phone}</td>
                    <td>
                      <span className={`badge ${teacher.status === 'Active' ? 'badge-success' : 'badge-destructive'}`}>
                        {teacher.status}
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
                    No teachers found.
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
