const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/dashboard/page.tsx', 'utf8');

// 1. Prepare Teacher Chart Data just above the student data
const chartDataBlock = `  const dummyYearlyData = [
    { label: 'Jan', value: 0 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 0 },
    { label: 'Apr', value: 0 }, { label: 'May', value: 48 }, { label: 'Jun', value: 74 },
    { label: 'Jul', value: 46 }, { label: 'Aug', value: 82 }, { label: 'Sep', value: 85 },
    { label: 'Oct', value: 78 }, { label: 'Nov', value: 0 }, { label: 'Dec', value: 0 }
  ];

  const chartData = attendanceView === 'month' 
    ? (_dailyData.length > 0 ? _dailyData : generateMonthlyDays())
    : dummyYearlyData;`;

const newChartDataBlock = `  const dummyYearlyData = [
    { label: 'Jan', value: 0 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 0 },
    { label: 'Apr', value: 0 }, { label: 'May', value: 48 }, { label: 'Jun', value: 74 },
    { label: 'Jul', value: 46 }, { label: 'Aug', value: 82 }, { label: 'Sep', value: 85 },
    { label: 'Oct', value: 78 }, { label: 'Nov', value: 0 }, { label: 'Dec', value: 0 }
  ];

  const _dailyTeacherData = ((d.attendTeacher as any)?.data || (d.attendTeacher as any)?.recentRecords || []).map((record: any) => {
    const total = record.present + record.absent + (record.leave || 0) + (record.late || 0);
    const rate = total > 0 ? Math.round((record.present / total) * 100) : 0;
    return {
      label: \`\${getDayName(record.date)} \${new Date(record.date).getDate()}\`,
      value: rate,
      subLabel: \`\${rate}%\`,
      subColor: rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444'
    };
  });

  const studentChartData = attendanceView === 'month' 
    ? (_dailyData.length > 0 ? _dailyData : generateMonthlyDays())
    : dummyYearlyData;

  const teacherChartData = attendanceView === 'month'
    ? (_dailyTeacherData.length > 0 ? _dailyTeacherData : generateMonthlyDays())
    : dummyYearlyData;`;

content = content.replace(chartDataBlock, newChartDataBlock);


// 2. Replace the Attendance Overview block (lines ~435 to ~582)
// Since we might not match perfectly by line numbers, we'll use regex between "Attendance Overview" and "Stat Cards"
const overviewRegex = /\{\/\* ── Attendance Overview ── \*\/\}[\s\S]*?(?=\{\/\* ── Stat Cards ── \*\/\})/g;

const newOverview = `{/* ── Attendance Overview ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Student Attendance Chart Card */}
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
                      Student Attendance
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
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a855f7' }}>{(d.attendStudent as any)?.monthlySummary?.daysRecorded || 0}/{(d.attendStudent as any)?.monthlySummary?.daysInMonth || 31}d</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Recorded</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>{(d.attendStudent as any)?.monthlySummary?.totalPresent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Present</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>{(d.attendStudent as any)?.monthlySummary?.totalAbsent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Absent</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>{(d.attendStudent as any)?.monthlySummary?.totalLeave || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Leave</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8b5cf6' }}>{(d.attendStudent as any)?.monthlySummary?.totalLate || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Late</p>
                  </div>
                </div>
              )}

              <div style={{ height: '240px', marginTop: '1rem' }}>
                <AreaChart data={studentChartData} />
              </div>
            </div>

            {/* Teacher Attendance Chart Card */}
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
                      Teacher Attendance
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
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a855f7' }}>{(d.attendTeacher as any)?.monthlySummary?.daysRecorded || 0}/{(d.attendTeacher as any)?.monthlySummary?.daysInMonth || 31}d</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Recorded</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>{(d.attendTeacher as any)?.monthlySummary?.totalPresent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Present</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>{(d.attendTeacher as any)?.monthlySummary?.totalAbsent || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Absent</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>{(d.attendTeacher as any)?.monthlySummary?.totalLeave || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Leave</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8b5cf6' }}>{(d.attendTeacher as any)?.monthlySummary?.totalLate || 0}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Late</p>
                  </div>
                </div>
              )}

              <div style={{ height: '240px', marginTop: '1rem' }}>
                <AreaChart data={teacherChartData} />
              </div>
            </div>

          </div>
          
          `;

content = content.replace(overviewRegex, newOverview);

fs.writeFileSync('src/app/(dashboard)/dashboard/page.tsx', content, 'utf8');
