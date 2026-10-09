const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/dashboard/page.tsx', 'utf8');

content = content.replace(/d\.attendStudent\.monthlySummary/g, '(d.attendStudent as any)?.monthlySummary');
content = content.replace(/d\.attendStudent\.leave/g, '(d.attendStudent as any)?.leave');
content = content.replace(/d\.attendStudent\.late/g, '(d.attendStudent as any)?.late');

fs.writeFileSync('src/app/(dashboard)/dashboard/page.tsx', content, 'utf8');
