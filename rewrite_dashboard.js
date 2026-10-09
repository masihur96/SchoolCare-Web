const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/dashboard/page.tsx', 'utf8');

// 1. Replace AreaChart component
const newAreaChart = `// ─── Area Chart ───────────────────────────────────────────────────────────────
function AreaChart({ data }: { data: { label: string, value: number, subLabel?: string, subColor?: string }[] }) {
  const w = 600;
  const h = 240;
  const padX = 30;
  const padY = 40;

  // Render grid if no data but we want to show empty state, though we should always have data
  if (!data || data.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data</div>;

  const maxVal = 100; // Force 0-100% scale
  const getX = (i: number) => padX + (i / (data.length - 1 || 1)) * (w - padX * 2);
  const getY = (v: number) => h - padY - (v / maxVal) * (h - padY * 2 - 20); // Extra 20px for top padding

  // Helper for smooth curve
  const getCurve = () => {
    let dStr = \`M \${getX(0)},\${getY(data[0].value)}\`;
    for (let i = 0; i < data.length - 1; i++) {
      const x0 = getX(i); const y0 = getY(data[i].value);
      const x1 = getX(i + 1); const y1 = getY(data[i + 1].value);
      const cp1x = x0 + (x1 - x0) / 2; const cp1y = y0;
      const cp2x = x1 - (x1 - x0) / 2; const cp2y = y1;
      dStr += \` C \${cp1x},\${cp1y} \${cp2x},\${cp2y} \${x1},\${y1}\`;
    }
    return dStr;
  };

  const path = getCurve();
  const area = \`\${path} L \${getX(data.length - 1)},\${h - padY} L \${getX(0)},\${h - padY} Z\`;

  return (
    <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
      <svg width={Math.max(w, data.length * 40)} height={h} viewBox={\`0 0 \${Math.max(w, data.length * 40)} \${h}\`} preserveAspectRatio="none" style={{ minWidth: '100%' }}>
        <defs>
          <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-Axis Labels & Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = getY(pct * 100);
          return (
            <g key={pct}>
              <text x={padX - 5} y={y + 4} fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="600">{pct * 100}%</text>
              <line x1={padX + 5} y1={y} x2={Math.max(w, data.length * 40) - padX} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" />
            </g>
          );
        })}

        {/* Path & Area */}
        <path d={area} fill="url(#gradPurple)" />
        <path d={path} fill="none" stroke="#a855f7" strokeWidth="3" />
        
        {/* Nodes and X-Axis Labels */}
        {data.map((d, i) => {
          const x = getX(i);
          const y = getY(d.value);
          const [dayName, dayNum] = d.label.split(' ');
          
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill="#fff" stroke="#a855f7" strokeWidth="2" />
              {dayNum ? (
                <>
                  <text x={x} y={h - 22} fontSize="10" fill="#94a3b8" textAnchor="middle">{dayName}</text>
                  <text x={x} y={h - 10} fontSize="11" fill="#64748b" textAnchor="middle" fontWeight="bold">
                    {dayNum}
                  </text>
                </>
              ) : (
                <text x={x} y={h - 15} fontSize="11" fill="#64748b" textAnchor="middle" fontWeight="bold">
                  {d.label}
                </text>
              )}
              {d.subLabel && (
                <text x={x} y={h - 0} fontSize="10" fill={d.subColor || '#94a3b8'} textAnchor="middle" fontWeight="bold">
                  {d.subLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────`;

content = content.replace(/\/\/ ─── Area Chart ─+[\s\S]*?\/\/ ─── Mini Bar Chart ─+/, newAreaChart);

// 2. Add Toggle Icons imports if needed
if (!content.includes('ArrowLeftRight')) {
  content = content.replace('UserCheck,', 'UserCheck, ArrowLeftRight, BarChart3, Users, Clock, CheckCircle, AlertCircle,');
}

// 3. Replace the Attendance Overview section inside return
// We'll replace everything from `<div className="nd-section-card"` to its closing `</div>` and the stats cards below if needed, but we just need the Attendance Overview div.

const newAttendanceSection = `          {/* ── Attendance Overview ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Chart Card */}
            <div className="nd-section-card" style={{ padding: '1.5rem', background: '#fff', borderRadius: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: '#f3e8ff', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <BarChart3 size={24} color="#a855f7" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                      {attendanceView === 'month' ? \`\${getMonthName(today.getMonth())} \${today.getFullYear()}\` : 'Monthly Overview'}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
                      {attendanceView === 'month' ? 'Student Attendance' : \`Year \${today.getFullYear()}\`}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setAttendanceView(attendanceView === 'month' ? 'year' : 'month')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  <ArrowLeftRight size={14} /> {attendanceView === 'month' ? 'Yearly' : 'Daily'}
                </button>
              </div>

              {attendanceView === 'month' && (
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a855f7' }}>{d.attendStudent.monthlySummary?.daysRecorded || 0}/{d.attendStudent.monthlySummary?.daysInMonth || 31}d</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Recorded</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>{d.attendStudent.monthlySummary?.totalPresent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Present</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>{d.attendStudent.monthlySummary?.totalAbsent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Absent</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>{d.attendStudent.monthlySummary?.totalLeave || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Leave</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8b5cf6' }}>{d.attendStudent.monthlySummary?.totalLate || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Late</p>
                  </div>
                </div>
              )}

              <div style={{ height: '240px', marginTop: '1rem' }}>
                <AreaChart data={chartData} />
              </div>
            </div>

            {/* Student Attendance Card */}
            <div className="nd-section-card" style={{ padding: '1.5rem', background: '#fff', borderRadius: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: '#f3e8ff', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <Users size={20} color="#0f172a" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Student Attendance</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                      {today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div style={{ background: '#e0e7ff', color: '#0f172a', padding: '0.4rem 0.8rem', borderRadius: '1rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  {studentStats.rate.toFixed(1)}%
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <span style={{ background: '#f1f5f9', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  <span style={{ color: '#0f172a' }}>{studentStats.total}</span> Total
                </span>
                <span style={{ background: '#ecfdf5', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  <span style={{ color: '#0f172a' }}>{studentStats.present}</span> Present
                </span>
                <span style={{ background: '#fef2f2', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  <span style={{ color: '#0f172a' }}>{studentStats.absent}</span> Absent
                </span>
                <span style={{ background: '#fffbeb', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  <span style={{ color: '#0f172a' }}>{d.attendStudent.leave || 0}</span> Leave
                </span>
                <span style={{ background: '#faf5ff', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  <span style={{ color: '#0f172a' }}>{d.attendStudent.late || 0}</span> Late
                </span>
              </div>
              
              <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                 {studentStats.total > 0 ? (
                   <div style={{ height: '100%', width: \`\${studentStats.rate}%\`, background: '#6366f1' }} />
                 ) : null}
              </div>
              {studentStats.total === 0 && (
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.75rem' }}>No records for today</p>
              )}
            </div>

            {/* Teacher Attendance Card */}
            <div className="nd-section-card" style={{ padding: '1.5rem', background: '#fff', borderRadius: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: '#f3e8ff', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <UserCheck size={20} color="#0f172a" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Teacher Attendance</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                      {today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div style={{ background: '#fce7f3', color: '#0f172a', padding: '0.4rem 0.8rem', borderRadius: '1rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  {teacherStats.rate.toFixed(1)}%
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <span style={{ background: '#f1f5f9', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  <span style={{ color: '#0f172a' }}>{teacherStats.total}</span> Total
                </span>
                <span style={{ background: '#ecfdf5', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  <span style={{ color: '#0f172a' }}>{teacherStats.present}</span> Present
                </span>
                <span style={{ background: '#fef2f2', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  <span style={{ color: '#0f172a' }}>{teacherStats.absent}</span> Absent
                </span>
              </div>
              
              <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                 {teacherStats.total > 0 ? (
                   <div style={{ height: '100%', width: \`\${teacherStats.rate}%\`, background: '#a855f7' }} />
                 ) : null}
              </div>
              {teacherStats.total === 0 && (
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.75rem' }}>No records for today</p>
              )}
            </div>

          </div>`;

const overviewRegex = /\{\/\* ── Attendance Overview ── \*\/\}[\s\S]*?(?=\{\/\* ── Stat Cards ── \*\/\})/g;
content = content.replace(overviewRegex, newAttendanceSection + '\n\n          ');

// 4. Update data generation logic before return
const dataPrepRegex = /const dailyAttendanceData = \(\(\(d\.attendStudent as any\)\?\.data \|\| \[\]\)\.map\(\(record: any\) => \(\{[\s\S]*?\}\)\);/g;

const newDataPrep = `  const getDayName = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  const _dailyData = ((d.attendStudent as any)?.data || []).map((record: any) => {
    const total = record.present + record.absent + (record.leave || 0) + (record.late || 0);
    const rate = total > 0 ? Math.round((record.present / total) * 100) : 0;
    return {
      label: \`\${getDayName(record.date)} \${new Date(record.date).getDate()}\`,
      value: rate,
      subLabel: \`\${rate}%\`,
      subColor: rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444'
    };
  });

  const generateMonthlyDays = () => {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }).map((_, i) => {
      const dd = new Date(today.getFullYear(), today.getMonth(), i + 1);
      return {
        label: \`\${dd.toLocaleDateString('en-US', { weekday: 'short' })} \${dd.getDate()}\`,
        value: 0,
        subLabel: '-',
        subColor: '#94a3b8'
      };
    });
  };

  const dummyYearlyData = [
    { label: 'Jan', value: 0 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 0 },
    { label: 'Apr', value: 0 }, { label: 'May', value: 48 }, { label: 'Jun', value: 74 },
    { label: 'Jul', value: 46 }, { label: 'Aug', value: 82 }, { label: 'Sep', value: 85 },
    { label: 'Oct', value: 78 }, { label: 'Nov', value: 0 }, { label: 'Dec', value: 0 }
  ];

  const chartData = attendanceView === 'month' 
    ? (_dailyData.length > 0 ? _dailyData : generateMonthlyDays())
    : dummyYearlyData;`;

content = content.replace(dataPrepRegex, newDataPrep);

// Rename attendanceView day -> month and month -> year logic based on UI
// Actually, earlier we set `attendanceView` to 'day' or 'month'.
// We should update the useState to 'month' | 'year' 
content = content.replace(/useState\<'day' \| 'month'\>\('day'\)/g, "useState<'month' | 'year'>('month')");

fs.writeFileSync('src/app/(dashboard)/dashboard/page.tsx', content, 'utf8');
