const teacherAttendanceData = [
    { "teacherId": "1", "date": "2026-01-02T00:00:00.000Z" },
    { "teacherId": "2", "date": "2026-01-02T00:00:00.000Z" },
    { "teacherId": "1", "date": "2026-02-05T00:00:00.000Z" }
];

const today = new Date("2026-10-09T00:00:00.000Z");
const yyyy = today.getFullYear();
const totalCount = 24;

let computedYearlyTeacherData = [];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
computedYearlyTeacherData = months.map((monthName, index) => {
  const mm = (index + 1).toString().padStart(2, '0');
  const daysInMonth = new Date(yyyy, index + 1, 0).getDate();
  
  // Get all days in this month
  // Find all attendance records for this month
  const recordsInMonth = teacherAttendanceData.filter(curr => curr.date && curr.date.startsWith(`${yyyy}-${mm}`));
  
  // Group by date
  const groupedByDate = recordsInMonth.reduce((acc, curr) => {
    const dStr = curr.date.split('T')[0];
    if (!acc[dStr]) acc[dStr] = new Set();
    acc[dStr].add(curr.teacherId);
    return acc;
  }, {});

  // Sum up present counts across all days that have records?
  // Wait, what if a day has 0 present? It's not in recordsInMonth.
  // We should just sum up the sizes of the sets, and divide by totalCount * daysInMonth?
  // Or divide by totalCount * (number of working days)? Usually, we divide by daysInMonth or daysRecorded.
  
  // Let's just do average daily attendance rate for the days that were recorded?
  // If we assume totalCount * daysInMonth:
  const totalPresentInMonth = Object.values(groupedByDate).reduce((sum, set) => sum + set.size, 0);
  const totalPossible = totalCount * daysInMonth; // Or totalCount * daysRecorded? Let's use daysInMonth for simplicity.
  const rate = totalPossible > 0 ? Math.round((totalPresentInMonth / totalPossible) * 100) : 0;
  
  // Or what if we just count how many unique teachers showed up at least once? No, that's not attendance rate.
  
  const presentCount = totalPresentInMonth;
  const absentCount = totalPossible - presentCount;
  return {
    label: monthName,
    value: rate,
    subLabel: rate > 0 ? `${rate}%` : '-',
    subColor: rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444',
    stats: { present: presentCount, absent: absentCount, leave: 0, late: 0, total: totalPossible }
  };
});

console.log(JSON.stringify(computedYearlyTeacherData, null, 2));
