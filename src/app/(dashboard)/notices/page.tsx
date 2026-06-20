"use client";

import React, { useState } from 'react';
import { Plus, Paperclip, AlertCircle, Calendar } from 'lucide-react';

const mockNotices = [
  { id: 1, title: 'Final Exams Schedule', target: 'All', priority: 'High', date: '2026-06-25', hasAttachment: true },
  { id: 2, title: 'Teacher Meeting', target: 'Teachers', priority: 'Medium', date: '2026-06-22', hasAttachment: false },
  { id: 3, title: 'Sports Day Cancellation', target: 'Students', priority: 'High', date: '2026-06-21', hasAttachment: false },
];

export default function NoticesPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Notices</h1>
          <p className="text-muted-foreground">Manage and publish notices</p>
        </div>
        <button 
          className="btn btn-primary gap-2" 
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={18} /> Create Notice
        </button>
      </div>

      <div className="dashboard-widgets" style={{ gridTemplateColumns: showForm ? '1fr 1fr' : '1fr' }}>
        
        {/* Notice List */}
        <div className="widget glass-card">
          <div className="widget-header">
            <h3>Recent Notices</h3>
          </div>
          <div className="widget-content">
            <div className="flex flex-col gap-4">
              {mockNotices.map(notice => (
                <div key={notice.id} className="p-4 border rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg">{notice.title}</h4>
                    <span className={`badge ${notice.priority === 'High' ? 'badge-destructive' : 'badge-warning'}`}>
                      {notice.priority}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Calendar size={14}/> {notice.date}</span>
                    <span className="flex items-center gap-1"><AlertCircle size={14}/> Target: {notice.target}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    {notice.hasAttachment ? (
                      <button className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' }}>
                        <Paperclip size={14} /> Download Attachment
                      </button>
                    ) : <div></div>}
                    <button className="text-primary text-sm font-semibold hover:underline">View Details</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Create Notice Form */}
        {showForm && (
          <div className="widget glass-card animate-fade-in">
            <div className="widget-header">
              <h3>Create New Notice</h3>
            </div>
            <div className="widget-content">
              <form className="flex flex-col gap-4">
                <div className="form-group">
                  <label>Notice Title</label>
                  <input type="text" className="input" placeholder="e.g. Holiday Announcement" />
                </div>
                
                <div className="form-group">
                  <label>Target Audience</label>
                  <select className="input bg-transparent">
                    <option>All</option>
                    <option>Students Only</option>
                    <option>Teachers Only</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority / Importancy</label>
                  <select className="input bg-transparent">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Content</label>
                  <textarea className="input" style={{ height: '100px', resize: 'vertical' }} placeholder="Write your notice here..."></textarea>
                </div>

                <div className="form-group border-dashed border-2 border-border p-4 text-center rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition">
                  <Paperclip size={24} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click to attach file</p>
                  <p className="text-xs text-muted-foreground">PDF, JPG, PNG (Max 5MB)</p>
                </div>

                <button type="button" className="btn btn-primary mt-2">Publish Notice</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
