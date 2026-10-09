const data = [
    { "teacherId": "1", "date": "2026-10-02T00:00:00.000Z" },
    { "teacherId": "2", "date": "2026-10-02T00:00:00.000Z" },
    { "teacherId": "1", "date": "2026-10-05T00:00:00.000Z" }
];

const today = new Date("2026-10-09T00:00:00.000Z");
const mm = today.getMonth() + 1;
const yyyy = today.getFullYear();
const daysInMonth = new Date(yyyy, mm, 0).getDate();

const getDayName = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });

const grouped = data.reduce((acc, curr) => {
  if (!curr.date) return acc;
  const dStr = curr.date.split('T')[0];
  if (!acc[dStr]) acc[dStr] = new Set();
  acc[dStr].add(curr.teacherId);
  return acc;
}, {});

const totalCount = 24;
const computedDailyTeacherData = Array.from({ length: today.getDate() }).map((_, i) => { // Up to today, or daysInMonth? Let's use daysInMonth for full month.
  const d = new Date(yyyy, mm - 1, i + 1);
  const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  
  const presentCount = grouped[dateStr] ? grouped[dateStr].size : 0;
  const absentCount = Math.max(0, totalCount - presentCount);
  const total = presentCount + absentCount;
  const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  
  return {
    label: `${getDayName(dateStr)} ${d.getDate()}`,
    value: rate,
    subLabel: `${rate}%`,
    subColor: rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444',
    stats: { present: presentCount, absent: absentCount, leave: 0, late: 0, total: total },
    dateStr
  };
});

console.log(JSON.stringify(computedDailyTeacherData, null, 2));
