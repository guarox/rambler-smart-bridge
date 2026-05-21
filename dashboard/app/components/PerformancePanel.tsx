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
  const bspDelta = boat.bsp - target;

  const oldest = twdHistory[0] ?? boat.twd;
  let shift = boat.twd - oldest;
  if (shift > 180) shift -= 360;
  if (shift < -180) shift += 360;

  // Lift = wind backed (shifted left/less clockwise) = favorable on current tack
  // Header = wind veered (shifted right) = should consider tacking
  const isHeader = shift > 1;
  const isLift = shift < -1;
  const steadyWind = Math.abs(shift) <= 1;

  const polarColor = polarPct >= 95 ? "text-green-400" : polarPct >= 85 ? "text-yellow-400" : "text-red-400";
  const polarBg = polarPct >= 95 ? "bg-green-900/30" : polarPct >= 85 ? "bg-yellow-900/30" : "bg-red-900/30";

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Performance</h2>
        <span className="text-xs text-gray-600">J/99 Polar · {twdHistory.length * 2}s window</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* VMG */}
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">VMG</div>
          <div className="text-3xl font-bold font-mono text-white">{vmg.toFixed(1)}</div>
          <div className="text-xs text-gray-500">kts upwind</div>
        </div>

        {/* Polar % */}
        <div className={`${polarBg} border border-gray-700 rounded-lg p-3 text-center`}>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">% Polar</div>
          <div className={`text-3xl font-bold font-mono ${polarColor}`}>{polarPct.toFixed(0)}%</div>
          <div className="text-xs text-gray-500">
            {bspDelta >= 0 ? "+" : ""}{bspDelta.toFixed(2)} vs {target.toFixed(1)} kts
          </div>
        </div>

        {/* Wind Shift */}
        <div className={`rounded-lg p-3 text-center border ${
          steadyWind ? "bg-gray-800 border-gray-700"
          : isHeader ? "bg-red-950 border-red-700"
          : "bg-green-950 border-green-700"
        }`}>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Wind Shift</div>
          <div className={`text-3xl font-bold font-mono ${
            steadyWind ? "text-gray-300" : isHeader ? "text-red-300" : "text-green-300"
          }`}>
            {steadyWind ? "—" : `${isLift ? "▲" : "▼"} ${Math.abs(shift).toFixed(1)}°`}
          </div>
          <div className={`text-xs font-semibold ${
            steadyWind ? "text-gray-500" : isHeader ? "text-red-400" : "text-green-400"
          }`}>
            {steadyWind ? "Steady" : isHeader ? "Header" : "Lift"}
          </div>
        </div>

        {/* Tack Recommendation */}
        <div className={`rounded-lg p-3 text-center border ${
          isHeader ? "bg-orange-950 border-orange-600" : "bg-gray-800 border-gray-700"
        }`}>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tack</div>
          <div className={`text-xl font-bold font-mono mt-1 ${isHeader ? "text-orange-300" : "text-gray-400"}`}>
            {isHeader ? "⟳ TACK" : "HOLD"}
          </div>
          <div className={`text-xs mt-1 ${isHeader ? "text-orange-400" : "text-gray-600"}`}>
            {isHeader
              ? `heading ${Math.round((boat.cog + 90 + 360) % 360)}°`
              : isLift ? "lift — press" : "no action"}
          </div>
        </div>
      </div>
    </div>
  );
}
