"use client";

interface Props {
  data: number[];
  color: string;
  label: string;
  unit: string;
  height?: number;
  alarmThreshold?: number; // draw a horizontal alarm line
  alarmColor?: string;
  formatValue?: (v: number) => string;
}

export default function LineChart({ data, color, label, unit, height = 72, alarmThreshold, alarmColor = "#ef4444", formatValue }: Props) {
  const W = 300;
  const H = height;
  const PAD = { top: 8, bottom: 16, left: 32, right: 8 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * plotW;
  const toY = (v: number) => PAD.top + plotH - ((v - min) / range) * plotH;

  const points = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const current = data[data.length - 1];
  const fmt = formatValue ?? ((v: number) => v.toFixed(1));

  // Grid lines at 3 levels
  const gridVals = [min, (min + max) / 2, max];

  return (
    <div className="bg-gray-800/60 rounded-lg p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
        <span className="text-base font-bold font-mono" style={{ color }}>{fmt(current)} {unit}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        {/* Grid lines */}
        {gridVals.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)}
              stroke="#374151" strokeWidth="1" strokeDasharray="3 3"
            />
            <text x={PAD.left - 3} y={toY(v) + 3.5} textAnchor="end" fill="#6b7280" fontSize="8">
              {fmt(v)}
            </text>
          </g>
        ))}

        {/* Alarm threshold line */}
        {alarmThreshold !== undefined && (
          <line
            x1={PAD.left} y1={toY(alarmThreshold)} x2={W - PAD.right} y2={toY(alarmThreshold)}
            stroke={alarmColor} strokeWidth="1.5" strokeDasharray="5 3" opacity="0.8"
          />
        )}

        {/* Area fill */}
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon
          points={`${PAD.left},${PAD.top + plotH} ${points} ${toX(data.length - 1)},${PAD.top + plotH}`}
          fill={`url(#grad-${label})`}
        />

        {/* Line */}
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Current value dot */}
        <circle cx={toX(data.length - 1)} cy={toY(current)} r="3" fill={color} />

        {/* Time axis */}
        <text x={PAD.left} y={H - 2} fill="#4b5563" fontSize="8">−2min</text>
        <text x={W - PAD.right} y={H - 2} textAnchor="end" fill="#4b5563" fontSize="8">now</text>
      </svg>
    </div>
  );
}
