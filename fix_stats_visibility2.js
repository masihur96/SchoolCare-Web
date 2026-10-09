const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/dashboard/page.tsx', 'utf8');

// Undo previous replace if it applied
content = content.replace(/\{\n\s*<div style=\{\{ display: 'flex', gap: '2rem', marginBottom: '1\.5rem'/g, "{true && (\n                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem'");

// Also apply the fix to the original in case the first script failed to match
content = content.replace(/\{studentAttendanceView === 'month' && \(\n/g, '{true && (\n');
content = content.replace(/\{teacherAttendanceView === 'month' && \(\n/g, '{true && (\n');

fs.writeFileSync('src/app/(dashboard)/dashboard/page.tsx', content, 'utf8');
