const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/dashboard/page.tsx', 'utf8');

// Fix duplicates
content = content.replace(/Users, (.*?) Users,/g, 'Users, $1 ');
content = content.replace(/Clock, (.*?) Clock,/g, 'Clock, $1 ');

// Fix TS errors for monthlySummary by casting as any
content = content.replace(/d\.attendStudent\.monthlySummary/g, '(d.attendStudent as any)?.monthlySummary');
content = content.replace(/d\.attendStudent\.leave/g, '(d.attendStudent as any)?.leave');
content = content.replace(/d\.attendStudent\.late/g, '(d.attendStudent as any)?.late');

// Let's find where chartData is declared and move it above the return
const returnIndex = content.indexOf('return (\\n    <div className="nd-root">');
// Wait, I inserted it during the replace in `rewrite_dashboard.js`. Let's check where it got inserted.
