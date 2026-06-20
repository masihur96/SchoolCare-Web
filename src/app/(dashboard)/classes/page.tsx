"use client";

import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Layers, BookOpen } from 'lucide-react';

const mockClasses = [
  { id: 'C001', name: 'Class 10', sections: ['A', 'B', 'C'], subjects: 6, students: 120 },
  { id: 'C002', name: 'Class 9', sections: ['A', 'B'], subjects: 6, students: 85 },
  { id: 'C003', name: 'Class 8', sections: ['A', 'B', 'C', 'D'], subjects: 8, students: 160 },
  { id: 'C004', name: 'Class 7', sections: ['A', 'B'], subjects: 8, students: 75 },
];

export default function ClassesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClasses = mockClasses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Classes & Subjects</h1>
          <p className="text-muted-foreground">Manage classes, sections, and curriculum</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" style={{ border: '1px solid var(--border)', gap: '0.5rem' }}>
            Auto Generate
          </button>
          <button className="btn btn-primary gap-2">
            <Plus size={18} /> Add Class
          </button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <div className="data-table-header">
          <div className="search-bar" style={{ display: 'flex', width: '300px', border: '1px solid var(--border)' }}>
            <Search size={18} className="text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by class name..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Sections</th>
                <th>Subjects Count</th>
                <th>Total Students</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length > 0 ? (
                filteredClasses.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium text-lg">{c.name}</td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {c.sections.map(s => (
                          <span key={s} className="badge badge-primary">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-muted-foreground" />
                        {c.subjects}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Layers size={16} className="text-muted-foreground" />
                        {c.students}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn" title="Edit Class"><Edit size={16} /></button>
                        <button className="action-btn" style={{ color: 'var(--destructive)' }} title="Delete Class">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    No classes found.
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
