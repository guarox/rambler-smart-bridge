"use client";
import { Target, OwnBoat } from "../lib/mockData";
import SparkLine from "./SparkLine";

function Badge({ positive, label }: { positive: boolean; label: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${positive ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
      {label}
    </span>
  );
}

export default function TacticalTable({ targets, boat }: { targets: Target[]; boat: OwnBoat }) {
  const sorted = [...targets].sort((a, b) => a.distance - b.distance);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
        Tactical — Competitors Within 2nm
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-700">
              <th className="text-left pb-2 pr-4">Boat</th>
              <th className="text-right pb-2 pr-4">Dist (nm)</th>
              <th className="text-right pb-2 pr-4">Bearing</th>
              <th className="text-right pb-2 pr-4">Closing</th>
              <th className="text-right pb-2 pr-4">Their SOG</th>
              <th className="text-right pb-2 pr-4">Their TWA</th>
              <th className="text-center pb-2 pr-4">Higher?</th>
              <th className="text-center pb-2 pr-4">Faster?</th>
              <th className="text-right pb-2">Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const closing = t.closingRate < 0;
              return (
                <tr key={t.mmsi} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                  <td className="py-2 pr-4 font-semibold text-white">{t.name}</td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-200">{t.distance.toFixed(2)}</td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-200">{t.bearing}°</td>
                  <td className={`py-2 pr-4 text-right font-mono font-bold ${closing ? "text-green-400" : "text-red-400"}`}>
                    {closing ? "▼ " : "▲ "}{Math.abs(t.closingRate * 60).toFixed(3)} nm/hr
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-200">{t.sog.toFixed(1)} kts</td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-200">{t.effectiveWindAngle}°</td>
                  <td className="py-2 pr-4 text-center">
                    <Badge positive={t.isHigher} label={t.isHigher ? `↑ ${boat.twa}° vs ${t.effectiveWindAngle}°` : `↓ ${boat.twa}° vs ${t.effectiveWindAngle}°`} />
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <Badge positive={t.isFaster} label={t.isFaster ? `↑ ${boat.sog} vs ${t.sog}` : `↓ ${boat.sog} vs ${t.sog}`} />
                  </td>
                  <td className="py-2 text-right">
                    <SparkLine data={t.distanceHistory} closing={closing} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Our TWA: {boat.twa}° · TWD: {boat.twd}° · SOG: {boat.sog} kts · Higher = tighter wind angle
      </p>
    </div>
  );
}
