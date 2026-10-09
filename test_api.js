const fs = require('fs');
fetch("https://smart-school-backend-production.up.railway.app/admin/teacher-attendance?startDate=01-10-2026&endDate=09-10-2026", {
  headers: {
    "accept": "*/*",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkYTBjM2ZmZi1hZTU5LTQ2YTMtYTAzNy0xOWZhNjgwMDNjNmIiLCJyb2xlIjoiYWRtaW4iLCJzY2hvb2xJZCI6IjI5ZjA1ZWRiLThlMGItNDM0Yy1hNDcxLWFhNzc2MzA4YTFjMSIsImNsYXNzSWRzIjpbXSwic2VjdGlvbklkcyI6W10sImlhdCI6MTc5MTUzNjc2NiwiZXhwIjoxNzkxNjIzMTY2fQ.ReXKyi7ZZ_db5IaRsqQq6odRYciKNmiQ4VzHykkAHkM"
  }
})
.then(r => r.json())
.then(data => fs.writeFileSync('api_out.json', JSON.stringify(data, null, 2)));
