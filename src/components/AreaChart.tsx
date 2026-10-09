import React from 'react';

export default function AreaChart({ data }: { data: { day: number, value1: number, value2: number }[] }) {
  if (!data || data.length === 0) return <div>No data</div>;

  const w = 600;
  const h = 200;
  const padX = 20;
  const padY = 20;

  const maxVal = Math.max(...data.map(d => Math.max(d.value1, d.value2)), 1);

  const getX = (i: number) => padX + (i / (data.length - 1 || 1)) * (w - padX * 2);
  const getY = (v: number) => h - padY - (v / maxVal) * (h - padY * 2);

  // Helper for smooth curve
  const getCurve = (key: 'value1' | 'value2') => {
    if (data.length === 0) return '';
    let dStr = `M ${getX(0)},${getY(data[0][key])}`;
    for (let i = 0; i < data.length - 1; i++) {
      const x0 = getX(i);
      const y0 = getY(data[i][key]);
      const x1 = getX(i + 1);
      const y1 = getY(data[i + 1][key]);
      const cp1x = x0 + (x1 - x0) / 3;
      const cp1y = y0;
      const cp2x = x1 - (x1 - x0) / 3;
      const cp2y = y1;
      dStr += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x1},${y1}`;
    }
    return dStr;
  };

  const path1 = getCurve('value1');
  const path2 = getCurve('value2');

  const area1 = `${path1} L ${getX(data.length - 1)},${h - padY} L ${getX(0)},${h - padY} Z`;
  const area2 = `${path2} L ${getX(data.length - 1)},${h - padY} L ${getX(0)},${h - padY} Z`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = h - padY - pct * (h - padY * 2);
        return <line key={pct} x1={padX} y1={y} x2={w - padX} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" />;
      })}

      <path d={area2} fill="url(#grad2)" />
      <path d={path2} fill="none" stroke="#a855f7" strokeWidth="2" />

      <path d={area1} fill="url(#grad1)" />
      <path d={path1} fill="none" stroke="#6366f1" strokeWidth="2" />
      
      {/* X Axis Labels */}
      {data.map((d, i) => {
        if (i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) {
          return (
            <text key={i} x={getX(i)} y={h - 2} fontSize="10" fill="#64748b" textAnchor="middle">
              {d.day}
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
}
