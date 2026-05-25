"use client";
import React, { useMemo } from "react";
import { SAIL_CHART, SAIL_COLORS, SAIL_DISPLAY, getSail, TWA_COLS, type SailName } from "../lib/sailChart";

interface Props {
  tws: number;
  twa: number;
}

const ALL_SAILS: SailName[] = ['J-3','J-1','J-0','C-65','A-3','A-2','A-1.5'];

// Chart geometry
const CELL_W = 13;
const CELL_H = 8;
const TWS_MAX = 36;
const PAD_L = 30;
const PAD_B = 22;
const PAD_T = 10;
const PAD_R = 6;
const CW = TWA_COLS.length * CELL_W;
const CH = TWS_MAX * CELL_H;
const W = CW + PAD_L + PAD_R;
const H = CH + PAD_T + PAD_B;

export default function SailChartPanel({ tws, twa }: Props) {
  const absTwa = Math.abs(twa);
  const currentSail = useMemo(() => getSail(tws, absTwa), [tws, absTwa]);

  // Live dot SVG position
  const dotX = PAD_L + (Math.round((Math.min(180, Math.max(35, absTwa)) - 35) / 5) + 0.5) * CELL_W;
  const dotY = PAD_T + (Math.max(0, Math.min(TWS_MAX - 1, TWS_MAX - Math.round(tws))) + 0.5) * CELL_H;

  // Build per-sail cell lists once
  const sailCells = useMemo(() => {
    const map: Partial<Record<string, {x:number,y:number}[]>> = {};
    for (let r = 0; r < TWS_MAX; r++) {
      const twsRow = TWS_MAX - r;
      for (let c = 0; c < TWA_COLS.length; c++) {
        const sail = SAIL_CHART[twsRow]?.[c];
        if (!sail) continue;
        if (!map[sail]) map[sail] = [];
        map[sail]!.push({ x: PAD_L + c * CELL_W, y: PAD_T + r * CELL_H });
      }
    }
    return map;
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Sail Chart</h2>
          <a href="/sailchart-print" target="_blank" rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors" title="Print / Save as PDF">⎙</a>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Now:</span>
          {currentSail ? (
            <span className="text-lg font-black font-mono px-3 py-0.5 rounded-lg"
              style={{ background: SAIL_COLORS[currentSail]+'33', color: SAIL_COLORS[currentSail], border: `1.5px solid ${SAIL_COLORS[currentSail]}` }}>
              {SAIL_DISPLAY[currentSail]}
            </span>
          ) : <span className="text-base font-mono text-gray-600">—</span>}
          <span className="text-xs text-gray-600 font-mono">{Math.round(absTwa)}° / {tws.toFixed(1)}kt</span>
        </div>
      </div>

      {/* SVG with blob filters */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: W }}>
        <defs>
          {/* Soft blob filter — gaussian blur only, no threshold → transparent overlapping edges */}
          <filter id="blob" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="8"/>
          </filter>
        </defs>

        {/* Dark chart background */}
        <rect x={PAD_L} y={PAD_T} width={CW} height={CH} fill="#111827" rx={2}/>

        {/* Blob layers — each sail drawn transparently so overlaps are visible */}
        {ALL_SAILS.map(sail => {
          if (!sail) return null;
          const cells = sailCells[sail];
          if (!cells || cells.length === 0) return null;
          const color = SAIL_COLORS[sail];
          return (
            <g key={sail} filter="url(#blob)" opacity={0.65}>
              {cells.map((cell, i) => (
                <rect key={i}
                  x={cell.x - 4} y={cell.y - 4}
                  width={CELL_W + 8} height={CELL_H + 8}
                  fill={color}
                />
              ))}
            </g>
          );
        })}

        {/* Sail zone labels (drawn on top, unfiltered) */}
        {ALL_SAILS.map(sail => {
          if (!sail) return null;
          const cells = sailCells[sail];
          if (!cells || cells.length === 0) return null;
          const cx = cells.reduce((s, c) => s + c.x + CELL_W / 2, 0) / cells.length;
          const cy = cells.reduce((s, c) => s + c.y + CELL_H / 2, 0) / cells.length;
          return (
            <text key={sail} x={cx} y={cy + 4} textAnchor="middle"
              fontSize="11" fontWeight="bold" fontFamily="monospace"
              fill="white" opacity={0.9}
              style={{ textShadow: '0 0 4px #000', pointerEvents: 'none' }}>
              {SAIL_DISPLAY[sail]}
            </text>
          );
        })}

        {/* Y axis — TWS */}
        {[5,10,15,20,25,30,35].map(ws => {
          const y = PAD_T + (TWS_MAX - ws) * CELL_H + CELL_H / 2;
          return (
            <g key={ws}>
              <line x1={PAD_L - 3} y1={y} x2={PAD_L} y2={y} stroke="#4b5563" strokeWidth={0.5}/>
              <text x={PAD_L - 5} y={y + 3} textAnchor="end" fontSize="7" fill="#9ca3af" fontFamily="monospace">{ws}</text>
            </g>
          );
        })}

        {/* X axis — TWA */}
        {TWA_COLS.filter(a => a % 15 === 0).map(angle => {
          const x = PAD_L + TWA_COLS.indexOf(angle) * CELL_W + CELL_W / 2;
          return (
            <g key={angle}>
              <line x1={x} y1={PAD_T + CH} x2={x} y2={PAD_T + CH + 3} stroke="#4b5563" strokeWidth={0.5}/>
              <text x={x} y={PAD_T + CH + 11} textAnchor="middle" fontSize="7" fill="#9ca3af" fontFamily="monospace">{angle}°</text>
            </g>
          );
        })}

        {/* Chart border */}
        <rect x={PAD_L} y={PAD_T} width={CW} height={CH} fill="none" stroke="#374151" strokeWidth={0.5} rx={2}/>

        {/* Crosshairs */}
        <line x1={dotX} y1={PAD_T} x2={dotX} y2={PAD_T + CH}
          stroke="white" strokeWidth={0.5} opacity={0.3} strokeDasharray="2 3"/>
        <line x1={PAD_L} y1={dotY} x2={PAD_L + CW} y2={dotY}
          stroke="white" strokeWidth={0.5} opacity={0.3} strokeDasharray="2 3"/>

        {/* Live dot — glow ring */}
        <circle cx={dotX} cy={dotY} r={10}
          fill="none"
          stroke={currentSail ? SAIL_COLORS[currentSail] : "white"}
          strokeWidth={2} opacity={0.5}/>
        {/* Live dot — solid */}
        <circle cx={dotX} cy={dotY} r={5}
          fill={currentSail ? SAIL_COLORS[currentSail] : "white"}
          stroke="white" strokeWidth={1.5}/>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
        {ALL_SAILS.map(sail => sail && (
          <span key={sail} className="flex items-center gap-1 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: SAIL_COLORS[sail] }}/>
            <span className="text-gray-400">{SAIL_DISPLAY[sail]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
