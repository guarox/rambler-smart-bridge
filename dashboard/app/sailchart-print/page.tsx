"use client";
import React, { useMemo } from "react";
import { SAIL_CHART, SAIL_COLORS, SAIL_DISPLAY, TWA_COLS, type SailName } from "../lib/sailChart";

const ALL_SAILS: SailName[] = ['J-3','J-1','J-0','C-65','A-3','A-2','A-1.5'];
const TWS_MAX = 36;
const CELL_W = 20;
const CELL_H = 12;
const PAD_L = 36;
const PAD_B = 28;
const PAD_T = 12;
const PAD_R = 8;
const W = TWA_COLS.length * CELL_W + PAD_L + PAD_R;
const H = TWS_MAX * CELL_H + PAD_T + PAD_B;

export default function SailChartPrintPage() {
  return (
    <div style={{ background: 'white', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#111' }}>J/99 Rambler — Sail Selection Chart</h1>
          <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0' }}>USA 99 · PHRF Spinnaker 1 · X-axis: TWA (°) · Y-axis: TWS (kts)</p>
        </div>
        <button
          onClick={() => window.print()}
          style={{ padding: '8px 20px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
          className="no-print"
        >
          ⎙ Save as PDF
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
        {ALL_SAILS.map(sail => sail && (
          <div key={sail} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 14, background: SAIL_COLORS[sail], opacity: 0.7, borderRadius: 2, border: `1px solid ${SAIL_COLORS[sail]}` }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>{SAIL_DISPLAY[sail]}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Grid cells */}
        {Array.from({ length: TWS_MAX }, (_, rowIdx) => {
          const tws_row = TWS_MAX - rowIdx;
          return TWA_COLS.map((_, colIdx) => {
            const sail = SAIL_CHART[tws_row]?.[colIdx] ?? null;
            if (!sail) return null;
            const color = SAIL_COLORS[sail];
            return (
              <rect
                key={`${rowIdx}-${colIdx}`}
                x={PAD_L + colIdx * CELL_W}
                y={PAD_T + rowIdx * CELL_H}
                width={CELL_W} height={CELL_H}
                fill={color} opacity={0.55}
              />
            );
          });
        })}

        {/* Cell borders */}
        {Array.from({ length: TWS_MAX }, (_, rowIdx) =>
          TWA_COLS.map((_, colIdx) => (
            <rect
              key={`b-${rowIdx}-${colIdx}`}
              x={PAD_L + colIdx * CELL_W}
              y={PAD_T + rowIdx * CELL_H}
              width={CELL_W} height={CELL_H}
              fill="none" stroke="#ccc" strokeWidth={0.3}
            />
          ))
        )}

        {/* Sail region labels */}
        {ALL_SAILS.map(sail => {
          if (!sail) return null;
          let sumX = 0, sumY = 0, count = 0;
          for (let r = 0; r < TWS_MAX; r++) {
            const tws_row = TWS_MAX - r;
            for (let c = 0; c < TWA_COLS.length; c++) {
              if ((SAIL_CHART[tws_row]?.[c] ?? null) === sail) {
                sumX += PAD_L + (c + 0.5) * CELL_W;
                sumY += PAD_T + (r + 0.5) * CELL_H;
                count++;
              }
            }
          }
          if (count === 0) return null;
          return (
            <text key={sail} x={sumX / count} y={sumY / count + 4}
              textAnchor="middle" fontSize="11" fontWeight="bold" fontFamily="sans-serif"
              fill="#111" opacity={0.85}>
              {SAIL_DISPLAY[sail]}
            </text>
          );
        })}

        {/* Y axis — TWS */}
        {[5,10,15,20,25,30,35].map(ws => {
          const y = PAD_T + (TWS_MAX - ws) * CELL_H + CELL_H / 2;
          return (
            <g key={ws}>
              <line x1={PAD_L - 4} y1={y} x2={PAD_L} y2={y} stroke="#333" strokeWidth={0.8} />
              <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#333" fontFamily="monospace">{ws}</text>
            </g>
          );
        })}
        <text x={14} y={PAD_T + TWS_MAX * CELL_H / 2} textAnchor="middle" fontSize="9" fill="#333"
          fontFamily="sans-serif" transform={`rotate(-90, 14, ${PAD_T + TWS_MAX * CELL_H / 2})`}>
          TWS (kts)
        </text>

        {/* X axis — TWA */}
        {TWA_COLS.filter(a => a % 15 === 0).map(angle => {
          const x = PAD_L + TWA_COLS.indexOf(angle) * CELL_W + CELL_W / 2;
          const y = PAD_T + TWS_MAX * CELL_H;
          return (
            <g key={angle}>
              <line x1={x} y1={y} x2={x} y2={y + 4} stroke="#333" strokeWidth={0.8} />
              <text x={x} y={y + 14} textAnchor="middle" fontSize="9" fill="#333" fontFamily="monospace">{angle}°</text>
            </g>
          );
        })}
        <text x={PAD_L + TWA_COLS.length * CELL_W / 2} y={H - 2} textAnchor="middle" fontSize="9" fill="#333" fontFamily="sans-serif">
          TWA (°)
        </text>

        {/* Border */}
        <rect x={PAD_L} y={PAD_T} width={TWA_COLS.length * CELL_W} height={TWS_MAX * CELL_H}
          fill="none" stroke="#333" strokeWidth={1} />
      </svg>

      {/* Footer */}
      <p style={{ fontSize: 10, color: '#888', marginTop: 12 }}>
        Rambler Smart Bridge · rambler99.vercel.app · Sail chart data: J99.txt + sail chart.txt
      </p>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
}
