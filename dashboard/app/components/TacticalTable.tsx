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

function rowStyle(closingRate: number) {
  if (closingRate < -0.05) return "border-l-2 border-l-green-500 bg-green-950/10";
  if (closingRate > 0.05) return "border-l-2 border-l-red-500 bg-red-950/10";
  return "border-l-2 border-l-yellow-500/50 bg-yellow-950/5";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TacticalTable({ targets, boat }: { targets: any[]; boat: OwnBoat }) {
  const sorted = [...targets].sort((a, b) => a.distance - b.distance);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Tactical</h2>
        <span className="text-xs text-gray-600">
          Our TWA {Math.round(boat.twa)}° · TWD {Math.round(boat.twd)}° · SOG {boat.sog.toFixed(1)} kts
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-700">
              <th className="text-left pb-2 pr-4 pl-3">Boat</th>
              <th className="text-right pb-2 pr-4">Dist</th>
              <th className="text-right pb-2 pr-4">Brg</th>
              <th className="text-right pb-2 pr-4">Closing Rate</th>
              <th className="text-right pb-2 pr-4">SOG</th>
              <th className="text-right pb-2 pr-4">Wind °</th>
              <th className="text-center pb-2 pr-4">Higher?</th>
              <th className="text-center pb-2 pr-4">Faster?</th>
              <th className="text-right pb-2">Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const closing = t.closingRate < 0;
              return (
                <tr key={t.mmsi} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${rowStyle(t.closingRate)}`}>
                  <td className="py-2 pr-4 pl-3 font-semibold text-white">{t.name}</td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-200">{t.distance.toFixed(2)}</td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-400">{Math.round(t.bearing)}°</td>
                  <td className={`py-2 pr-4 text-right font-mono font-bold ${closing ? "text-green-400" : "text-red-400"}`}>
                    {closing ? "▼ " : "▲ "}{Math.abs(t.closingRate).toFixed(2)} nm/hr
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-200">{t.sog.toFixed(1)}</td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-200">{Math.round(t.effectiveWindAngle)}°</td>
                  <td className="py-2 pr-4 text-center">
                    <Badge positive={t.isHigher} label={t.isHigher ? `↑ ${Math.round(boat.twa)}° vs ${Math.round(t.effectiveWindAngle)}°` : `↓ ${Math.round(boat.twa)}° vs ${Math.round(t.effectiveWindAngle)}°`} />
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <Badge positive={t.isFaster} label={t.isFaster ? `↑ ${boat.sog.toFixed(1)} vs ${t.sog.toFixed(1)}` : `↓ ${boat.sog.toFixed(1)} vs ${t.sog.toFixed(1)}`} />
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
    </div>
  );
}
