"use client";
import { OwnBoat, WindCell } from "../lib/mockData";

interface Props {
  boat: OwnBoat;
  windGrid: WindCell[];
}

export default function WindOverlayPanel({ boat, windGrid }: Props) {
  const nearest = windGrid[4] ?? windGrid[0];
  const deltaSpeed = boat.tws - nearest.speed;
  const deltaDir = Math.round(boat.twd - nearest.dir);
  const speedPositive = deltaSpeed >= 0;

  // Build a mini sparkline of the 9-cell speed variation
  const speeds = windGrid.map(c => c.speed);
  const minS = Math.min(...speeds);
  const maxS = Math.max(...speeds);
  const range = maxS - minS || 1;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">HRRR vs B&G</h2>
        <span className="text-xs text-yellow-500 font-mono">Model 16:00Z +1hr · nearest grid {nearest.lat.toFixed(2)},{nearest.lon.toFixed(2)}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Model */}
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-xs text-yellow-400 uppercase tracking-wide mb-2">HRRR Model</div>
          <div className="text-3xl font-bold font-mono text-white">{nearest.speed.toFixed(1)}</div>
          <div className="text-sm text-gray-400 mt-1">{Math.round(nearest.dir)}° T</div>
          <div className="text-xs text-gray-600 mt-2">kts</div>
        </div>

        {/* Actual */}
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-xs text-blue-400 uppercase tracking-wide mb-2">B&G Actual</div>
          <div className="text-3xl font-bold font-mono text-white">{boat.tws.toFixed(1)}</div>
          <div className="text-sm text-gray-400 mt-1">{Math.round(boat.twd)}° T</div>
          <div className="text-xs text-gray-600 mt-2">kts</div>
        </div>

        {/* Delta */}
        <div className={`rounded-lg p-4 text-center border ${speedPositive ? "bg-green-950 border-green-700" : "bg-red-950 border-red-700"}`}>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Δ Delta</div>
          <div className={`text-3xl font-bold font-mono ${speedPositive ? "text-green-300" : "text-red-300"}`}>
            {speedPositive ? "+" : ""}{deltaSpeed.toFixed(1)}
          </div>
          <div className={`text-sm mt-1 ${Math.abs(deltaDir) > 2 ? "text-yellow-300" : "text-gray-500"}`}>
            {deltaDir > 0 ? "+" : ""}{deltaDir}° dir
          </div>
          <div className="text-xs text-gray-600 mt-2">{speedPositive ? "stronger" : "weaker"} than model</div>
        </div>
      </div>

      {/* Mini grid heatmap */}
      <div className="mt-3">
        <div className="text-xs text-gray-600 mb-1">Grid wind speeds (3×3 around vessel)</div>
        <div className="grid grid-cols-9 gap-0.5 h-3">
          {windGrid.map((cell, i) => {
            const pct = (cell.speed - minS) / range;
            const opacity = 0.3 + pct * 0.7;
            const isNearest = i === 4;
            return (
              <div key={i} title={`${cell.speed.toFixed(1)} kts`}
                className={`rounded-sm ${isNearest ? "ring-1 ring-blue-400" : ""}`}
                style={{ backgroundColor: `rgba(251,191,36,${opacity})` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-0.5">
          <span>{minS.toFixed(1)} kts</span>
          <span>{maxS.toFixed(1)} kts</span>
        </div>
      </div>
    </div>
  );
}
