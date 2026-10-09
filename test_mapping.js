const data = [
    {
      "id": "be7da7d4-9067-42b1-a8ac-4a5342858701",
      "teacherId": "86d08368-2f9b-4d0b-bce2-03cd1902d18e",
      "date": "2026-09-10T00:00:00.000Z"
    },
    {
      "id": "eaf7b485-7149-4bc3-8e95-bc88b64e94be",
      "teacherId": "395b8c29-f3cf-4d3c-bb2c-9572f98712d1",
      "date": "2026-09-09T00:00:00.000Z"
    },
    {
      "id": "d07b12e4-a7d1-4e22-9364-7c18497d2129",
      "teacherId": "0596015a-c64a-4a73-8a5c-2ae009488440",
      "date": "2026-09-09T00:00:00.000Z"
    }
];

const getDayName = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });

let computedDailyTeacherData = [];
if (data && data.length > 0) {
  const grouped = data.reduce((acc, curr) => {
    if (!curr.date) return acc;
    const dStr = curr.date.split('T')[0];
    if (!acc[dStr]) acc[dStr] = new Set();
    acc[dStr].add(curr.teacherId);
    return acc;
  }, {});
  
  computedDailyTeacherData = Object.entries(grouped).map(([dateStr, teacherSet]) => {
    const presentCount = teacherSet.size;
    const totalCount = 24;
    const absentCount = Math.max(0, totalCount - presentCount);
    const total = presentCount + absentCount;
    const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    
    return {
      label: `${getDayName(dateStr)} ${new Date(dateStr).getDate()}`,
      value: rate,
      subLabel: `${rate}%`,
      subColor: rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444',
      stats: { present: presentCount, absent: absentCount, leave: 0, late: 0, total: total },
      dateStr
    };
  }).sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());
}

console.log(JSON.stringify(computedDailyTeacherData, null, 2));
