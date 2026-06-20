import React from 'react';
import { Users, GraduationCap, CheckCircle, CreditCard } from 'lucide-react';

const stats = [
  { name: 'Total Students', value: '1,240', icon: Users, change: '+12%', color: 'var(--primary)' },
  { name: 'Total Teachers', value: '86', icon: GraduationCap, change: '+2%', color: 'var(--accent)' },
  { name: 'Today Attendance', value: '94%', icon: CheckCircle, change: '+1.2%', color: 'var(--success)' },
  { name: 'Active Subscriptions', value: '8', icon: CreditCard, change: '0%', color: 'var(--warning)' },
];

export default function DashboardPage() {
  return (
    <div className="dashboard-container">
      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome back, Admin. Here is what's happening today.</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.name} 
              className={`stat-card glass-card animate-fade-in animate-delay-${(i + 1) * 100}`}
            >
              <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                <Icon size={24} />
              </div>
              <div className="stat-info">
                <h3>{stat.name}</h3>
                <div className="stat-value-row">
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-change" style={{ color: stat.change.startsWith('+') ? 'var(--success)' : 'inherit' }}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-widgets">
        <div className="widget glass-card animate-fade-in animate-delay-300">
          <div className="widget-header">
            <h3>Attendance Overview</h3>
          </div>
          <div className="widget-content flex items-center justify-center min-h-[300px]">
            <p className="text-muted-foreground">Chart placeholder (e.g. Recharts)</p>
          </div>
        </div>

        <div className="widget glass-card animate-fade-in animate-delay-300">
          <div className="widget-header">
            <h3>Current Subscriptions</h3>
          </div>
          <div className="widget-content">
            <ul className="subscription-list">
              {[1, 2, 3].map((i) => (
                <li key={i} className="subscription-item">
                  <div className="sub-icon bg-primary text-primary-foreground">Plan {i}</div>
                  <div className="sub-details">
                    <h4>Premium School Plan</h4>
                    <p>Expires in 24 days</p>
                  </div>
                  <button className="btn btn-primary ml-auto text-sm">Renew</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
