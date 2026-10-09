const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/dashboard/page.tsx', 'utf8');

// 1. Update AreaChart signature and logic
const oldAreaChartRegex = /\/\/ ─── Area Chart ─+[\s\S]*?\/\/ ─── Mini Bar Chart ─+/;

const newAreaChart = `// ─── Area Chart ───────────────────────────────────────────────────────────────
function AreaChart({ data }: { data: { label: string, value: number, subLabel?: string, subColor?: string, stats?: { present: number, absent: number, leave: number, late: number, total: number } }[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const w = 600;
  const h = 240;
  const padX = 30;
  const padY = 40;

  if (!data || data.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data</div>;

  const maxVal = 100;
  const getX = (i: number) => padX + (i / (data.length - 1 || 1)) * (w - padX * 2);
  const getY = (v: number) => h - padY - (v / maxVal) * (h - padY * 2 - 20);

  const getCurve = () => {
    let dStr = \`M \${getX(0)},\${getY(data[0].value)}\`;
    for (let i = 0; i < data.length - 1; i++) {
      const x0 = getX(i); const y0 = getY(data[i].value);
      const x1 = getX(i + 1); const y1 = getY(data[i + 1].value);
      const cp1x = x0 + (x1 - x0) / 2; const cp1y = y0;
      const cp2x = x1 - (x1 - x0) / 2; const cp2y = y1;
      dStr += \` C \${cp1x},\${cp1y} \${cp2x},\${cp2y} \${x1},\${y1}\`;
    }
    return dStr;
  };

  const path = getCurve();
  const area = \`\${path} L \${getX(data.length - 1)},\${h - padY} L \${getX(0)},\${h - padY} Z\`;

  return (
    <div style={{ width: '100%', overflowX: 'auto', overflowY: 'visible', position: 'relative' }}>
      <svg width={Math.max(w, data.length * 40)} height={h} viewBox={\`0 0 \${Math.max(w, data.length * 40)} \${h}\`} preserveAspectRatio="none" style={{ minWidth: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = getY(pct * 100);
          return (
            <g key={pct}>
              <text x={padX - 5} y={y + 4} fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="600">{pct * 100}%</text>
              <line x1={padX + 5} y1={y} x2={Math.max(w, data.length * 40) - padX} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" />
            </g>
          );
        })}

        <path d={area} fill="url(#gradPurple)" />
        <path d={path} fill="none" stroke="#a855f7" strokeWidth="3" />
        
        {data.map((d, i) => {
          const x = getX(i);
          const y = getY(d.value);
          const [dayName, dayNum] = d.label.split(' ');
          const isHovered = hoverIndex === i;
          
          return (
            <g 
              key={i}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Invisible interactive area */}
              <rect x={x - 20} y={0} width={40} height={h} fill="transparent" />
              
              <circle cx={x} cy={y} r={isHovered ? 7 : 5} fill="#fff" stroke="#a855f7" strokeWidth={isHovered ? 3 : 2} style={{ transition: 'all 0.2s' }} />
              {dayNum ? (
                <>
                  <text x={x} y={h - 22} fontSize="10" fill={isHovered ? "#64748b" : "#94a3b8"} textAnchor="middle" fontWeight={isHovered ? "bold" : "normal"}>{dayName}</text>
                  <text x={x} y={h - 10} fontSize="11" fill={isHovered ? "#0f172a" : "#64748b"} textAnchor="middle" fontWeight="bold">
                    {dayNum}
                  </text>
                </>
              ) : (
                <text x={x} y={h - 15} fontSize="11" fill={isHovered ? "#0f172a" : "#64748b"} textAnchor="middle" fontWeight="bold">
                  {d.label}
                </text>
              )}
              {d.subLabel && (
                <text x={x} y={h - 0} fontSize="10" fill={d.subColor || '#94a3b8'} textAnchor="middle" fontWeight="bold">
                  {d.subLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      
      {hoverIndex !== null && data[hoverIndex]?.stats && (
        <div style={{
          position: 'absolute',
          left: Math.min(getX(hoverIndex) + 15, Math.max(w, data.length * 40) - 150),
          top: Math.max(10, getY(data[hoverIndex].value) - 80),
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '0.75rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          pointerEvents: 'none',
          zIndex: 10,
          minWidth: '130px'
        }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.25rem' }}>
            {data[hoverIndex].label.replace(' ', ', ')} - {data[hoverIndex].value}%
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
            <span style={{ color: '#10b981' }}>Present:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{Math.round((data[hoverIndex].stats.present / data[hoverIndex].stats.total) * 100)}% ({data[hoverIndex].stats.present})</span>
            
            <span style={{ color: '#ef4444' }}>Absent:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{Math.round((data[hoverIndex].stats.absent / data[hoverIndex].stats.total) * 100)}% ({data[hoverIndex].stats.absent})</span>
            
            <span style={{ color: '#f59e0b' }}>Leave:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{Math.round((data[hoverIndex].stats.leave / data[hoverIndex].stats.total) * 100)}% ({data[hoverIndex].stats.leave})</span>
            
            <span style={{ color: '#8b5cf6' }}>Late:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{Math.round((data[hoverIndex].stats.late / data[hoverIndex].stats.total) * 100)}% ({data[hoverIndex].stats.late})</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────`;

content = content.replace(oldAreaChartRegex, newAreaChart);

// 2. Update data prep to include stats
const studentDataPrepRegex = /subColor: rate >= 80 \? '#10b981' : rate >= 60 \? '#f59e0b' : '#ef4444'\n    \};/g;
content = content.replace(studentDataPrepRegex, `subColor: rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444',\n      stats: { present: record.present || 0, absent: record.absent || 0, leave: record.leave || 0, late: record.late || 0, total: total || 1 }\n    };`);

// If they replaced multiple, that's perfect because both student and teacher use the exact same return format.
// Wait, `total` variable was defined inside the map right above the return. Let's make sure it's valid.

fs.writeFileSync('src/app/(dashboard)/dashboard/page.tsx', content, 'utf8');
