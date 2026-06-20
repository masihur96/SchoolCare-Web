import React from 'react';
import { Plus, BookOpen, UserCircle, Calendar as CalendarIcon } from 'lucide-react';

export default function ExamsPage() {
  return (
    <div className="page-container animate-fade-in">
      <div className="page-header mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Exam Management</h1>
          <p className="text-muted-foreground">Create exams, attach syllabus, assign examiners and routines</p>
        </div>
        <button className="btn btn-primary gap-2">
          <Plus size={18} /> Create Exam
        </button>
      </div>

      <div className="dashboard-widgets" style={{ gridTemplateColumns: '1fr 2fr' }}>
        
        {/* Exam Creation Wizard Shortcut */}
        <div className="widget glass-card">
          <div className="widget-header">
            <h3>Quick Setup</h3>
          </div>
          <div className="widget-content flex flex-col gap-4">
            <button className="btn w-full justify-start gap-3" style={{ border: '1px solid var(--border)', height: 'auto', padding: '1rem' }}>
              <div className="bg-primary/10 text-primary p-2 rounded-lg"><BookOpen size={20} /></div>
              <div className="text-left">
                <div className="font-bold text-foreground">1. Upload Syllabus</div>
                <div className="text-xs text-muted-foreground">Define curriculum for the exam</div>
              </div>
            </button>
            <button className="btn w-full justify-start gap-3" style={{ border: '1px solid var(--border)', height: 'auto', padding: '1rem' }}>
              <div className="bg-accent/10 text-accent p-2 rounded-lg"><UserCircle size={20} /></div>
              <div className="text-left">
                <div className="font-bold text-foreground">2. Assign Examiner</div>
                <div className="text-xs text-muted-foreground">Select teachers to evaluate</div>
              </div>
            </button>
            <button className="btn w-full justify-start gap-3" style={{ border: '1px solid var(--border)', height: 'auto', padding: '1rem' }}>
              <div className="bg-success/10 text-success p-2 rounded-lg"><CalendarIcon size={20} /></div>
              <div className="text-left">
                <div className="font-bold text-foreground">3. Build Routine</div>
                <div className="text-xs text-muted-foreground">Set dates and timings</div>
              </div>
            </button>
          </div>
        </div>

        {/* Current Exams */}
        <div className="widget glass-card">
          <div className="widget-header">
            <h3>Upcoming Exams</h3>
          </div>
          <div className="widget-content">
            <div className="flex flex-col gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-lg">Mid-Term Examination 2026</h4>
                  <span className="badge badge-warning">Starts in 14 days</span>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                  <span>Class: 9 & 10</span>
                  <span>Examiner: Michael Scott</span>
                  <span>Syllabus: Attached</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary text-sm" style={{ padding: '0.25rem 0.75rem' }}>View Routine</button>
                  <button className="btn text-sm" style={{ padding: '0.25rem 0.75rem', border: '1px solid var(--border)' }}>Edit Details</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
