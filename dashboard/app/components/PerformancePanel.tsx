"use client";
import { OwnBoat, polarTarget } from "../lib/mockData";

interface Props {
  boat: OwnBoat;
  twdHistory: number[];
}

export default function PerformancePanel({ boat, twdHistory }: Props) {
  const vmg = boat.bsp * Math.cos((Math.abs(boat.twa) * Math.PI) / 180);
  const target = polarTarget(boat.tws, Math.abs(boat.twa));
  const polarPct = (boat.bsp / target) * 100;

  // Wind shift: compare current TWD to 30s ago (15 readings × 2s)
  const oldest = twdHistory[0] ?? boat.twd;
  let shift = boat.twd - oldest;
  // Normalize to ±180
  if (shift > 180) shift -= 360;
  if (shift < -180) shift += 360;
  const isLift = shift < 0; // Wind backed (shifted left) = lift on port tack
  const shiftAbs = Math.abs(shift).toFixed(1);

  const polarColor = polarPct >= 95 ? "text-green-400" : polarPct >= 85 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Performance</h2>
        <span className="text-xs text-gray-500 font-mono">J/99 Polar · 30s shift window</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* VMG */}
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">VMG</div>
          <div className="text-2xl font-bold font-mono text-white">{vmg.toFixed(1)}</div>
          <div className="text-xs text-gray-500">kts upwind</div>
        </div>

        {/* Polar % */}
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">% Polar</div>
          <div className={`text-2xl font-bold font-mono ${polarColor}`}>{polarPct.toFixed(0)}%</div>
          <div className="text-xs text-gray-500">target {target.toFixed(1)} kts</div>
        </div>

        {/* Target BSP vs Actual */}
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">BSP vs Target</div>
          <div className="text-2xl font-bold font-mono text-white">{boat.bsp.toFixed(1)}</div>
          <div className={`text-xs font-mono ${polarColor}`}>
            {boat.bsp >= target ? "+" : ""}{(boat.bsp - target).toFixed(2)} kts
          </div>
        </div>

        {/* Wind Shift */}
        <div className={`rounded-lg p-3 text-center ${Math.abs(shift) < 1 ? "bg-gray-800" : isLift ? "bg-green-900/60" : "bg-red-900/60"}`}>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Wind Shift</div>
          <div className={`text-2xl font-bold font-mono ${Math.abs(shift) < 1 ? "text-gray-400" : isLift ? "text-green-300" : "text-red-300"}`}>
            {Math.abs(shift) < 1 ? "Steady" : `${isLift ? "▲" : "▼"} ${shiftAbs}°`}
          </div>
          <div className={`text-xs ${Math.abs(shift) < 1 ? "text-gray-500" : isLift ? "text-green-400" : "text-red-400"}`}>
            {Math.abs(shift) < 1 ? "no shift" : isLift ? "Lift — favor port" : "Header — consider tack"}
          </div>
        </div>
      </div>
    </div>
  );
}
