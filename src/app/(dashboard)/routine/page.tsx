import React from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';

export default function RoutinePage() {
  return (
    <div className="page-container animate-fade-in">
      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold">Class Routine</h1>
        <p className="text-muted-foreground">Manage weekly schedules for classes</p>
      </div>

      <div className="widget glass-card">
        <div className="widget-header flex justify-between items-center">
          <h3>Weekly Schedule - Class 10 A</h3>
          <select className="input bg-transparent w-48 text-sm">
            <option>Class 10 A</option>
            <option>Class 10 B</option>
            <option>Class 9 A</option>
          </select>
        </div>
        <div className="widget-content">
          <div className="overflow-x-auto">
            <table className="data-table" style={{ border: '1px solid var(--border)' }}>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>08:00 - 09:00</th>
                  <th>09:00 - 10:00</th>
                  <th>10:00 - 11:00</th>
                  <th>11:00 - 12:00</th>
                </tr>
              </thead>
              <tbody>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                  <tr key={day}>
                    <td className="font-bold">{day}</td>
                    <td>
                      <div className="bg-primary/10 border border-primary/20 p-2 rounded text-xs">
                        <div className="font-bold text-primary">Mathematics</div>
                        <div className="text-muted-foreground flex items-center gap-1 mt-1"><MapPin size={10}/> Room 101</div>
                      </div>
                    </td>
                    <td>
                      <div className="bg-accent/10 border border-accent/20 p-2 rounded text-xs">
                        <div className="font-bold text-accent">Physics</div>
                        <div className="text-muted-foreground flex items-center gap-1 mt-1"><MapPin size={10}/> Lab 2</div>
                      </div>
                    </td>
                    <td>
                      <div className="bg-warning/10 border border-warning/20 p-2 rounded text-xs">
                        <div className="font-bold text-warning">English</div>
                        <div className="text-muted-foreground flex items-center gap-1 mt-1"><MapPin size={10}/> Room 101</div>
                      </div>
                    </td>
                    <td>
                      <div className="bg-success/10 border border-success/20 p-2 rounded text-xs">
                        <div className="font-bold text-success">Chemistry</div>
                        <div className="text-muted-foreground flex items-center gap-1 mt-1"><MapPin size={10}/> Lab 1</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
