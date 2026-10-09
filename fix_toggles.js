const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/dashboard/page.tsx', 'utf8');

// Update dummyYearlyData to include stats
const dummyYearlyDataReplacement = `  const generateDummyYearlyStats = (value: number) => {
    const total = 100;
    const present = Math.round(total * (value / 100));
    const absent = total - present;
    return { present, absent, leave: 0, late: 0, total };
  };

  const dummyYearlyData = [
    { label: 'Jan', value: 0 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 0 },
    { label: 'Apr', value: 0 }, { label: 'May', value: 48 }, { label: 'Jun', value: 74 },
    { label: 'Jul', value: 46 }, { label: 'Aug', value: 82 }, { label: 'Sep', value: 85 },
    { label: 'Oct', value: 78 }, { label: 'Nov', value: 0 }, { label: 'Dec', value: 0 }
  ].map(d => ({ ...d, subLabel: d.value > 0 ? \`\${d.value}%\` : '-', subColor: d.value >= 80 ? '#10b981' : d.value >= 60 ? '#f59e0b' : '#ef4444', stats: generateDummyYearlyStats(d.value) }));`;

content = content.replace(
  /const dummyYearlyData = \[\s*\{ label: 'Jan'[\s\S]*?\{ label: 'Dec', value: 0 \}\s*\];/,
  dummyYearlyDataReplacement
);

// Update toggles 'Yearly' -> 'Monthly'
content = content.replace(/studentAttendanceView === 'month' \? 'Yearly' : 'Daily'/g, "studentAttendanceView === 'month' ? 'Monthly' : 'Daily'");
content = content.replace(/teacherAttendanceView === 'month' \? 'Yearly' : 'Daily'/g, "teacherAttendanceView === 'month' ? 'Monthly' : 'Daily'");

// We should also replace the tooltips title since they were doing "data[hoverIndex].label.replace(' ', ', ')" but for months there's no space. It will just work fine.

fs.writeFileSync('src/app/(dashboard)/dashboard/page.tsx', content, 'utf8');
