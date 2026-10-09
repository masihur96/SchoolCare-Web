const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/dashboard/page.tsx', 'utf8');

content = content.replace(/\{studentAttendanceView === 'month' && \(\n/g, '{\n');
content = content.replace(/\{teacherAttendanceView === 'month' && \(\n/g, '{\n');

// Since we replaced it with `{`, we should replace it with `<>` or nothing. 
// Wait! If I just replace it with `{true && (\n`, I don't have to touch the closing parenthesis! Let's do that instead, it's safer.
