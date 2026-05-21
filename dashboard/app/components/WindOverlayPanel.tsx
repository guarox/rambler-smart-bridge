"use client";
import { OwnBoat, WindCell } from "../lib/mockData";

interface Props {
  boat: OwnBoat;
  windGrid: WindCell[];
}

export default function WindOverlayPanel({ boat, windGrid }: Props) {
  const nearest = windGrid[4] ?? windGrid[0];
  const deltaSpeed = (boat.tws - nearest.speed).toFixed(1);
  const deltaDir = Math.round(boat.twd - nearest.dir);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">HRRR Wind Model vs Reality</h2>
        <span className="text-xs text-yellow-500 font-mono">Model: 16:00Z +1hr</span>
      </div>

      {/* Grid visualization */}
      <div className="grid grid-cols-3 gap-1 mb-4">
        {windGrid.map((cell, i) => {
          const isNearest = i === 4;
          return (
            <div key={i} className={`rounded p-2 text-center ${isNearest ? "bg-blue-900 border border-blue-500" : "bg-gray-800"}`}>
              <div className="text-xs text-gray-500 mb-1">{cell.lat.toFixed(2)}, {cell.lon.toFixed(2)}</div>
              <div className="text-base font-mono font-bold text-white">{cell.speed.toFixed(1)} kts</div>
              <div className="text-xs text-gray-400">{cell.dir}° T</div>
              {isNearest && <div className="text-xs text-blue-300 mt-1">★ nearest</div>}
            </div>
          );
        })}
      </div>

      {/* Delta summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase mb-1">HRRR Speed</div>
          <div className="text-lg font-bold font-mono text-white">{nearest.speed} kts</div>
          <div className="text-xs text-gray-500">{nearest.dir}° T</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase mb-1">B&G Actual</div>
          <div className="text-lg font-bold font-mono text-white">{boat.tws.toFixed(1)} kts</div>
          <div className="text-xs text-gray-500">{Math.round(boat.twd)}° T</div>
        </div>
        <div className={`rounded-lg p-3 text-center ${parseFloat(deltaSpeed) > 0 ? "bg-green-900" : "bg-red-900"}`}>
          <div className="text-xs text-gray-400 uppercase mb-1">Δ Delta</div>
          <div className={`text-lg font-bold font-mono ${parseFloat(deltaSpeed) > 0 ? "text-green-300" : "text-red-300"}`}>
            {parseFloat(deltaSpeed) > 0 ? "+" : ""}{deltaSpeed} kts
          </div>
          <div className={`text-xs ${Math.abs(deltaDir) > 0 ? "text-yellow-300" : "text-gray-400"}`}>
            {deltaDir > 0 ? "+" : ""}{deltaDir}° dir
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Positive Δ speed = reality stronger than model. Local thermal or gradient divergence.
      </p>
    </div>
  );
}
