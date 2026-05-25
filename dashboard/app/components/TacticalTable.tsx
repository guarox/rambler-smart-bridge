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

const LAYLINE_LABELS: Record<string, { label: string; cls: string }> = {
  "outside":     { label: "Outside", cls: "bg-yellow-900/60 text-yellow-300" },
  "port-inside": { label: "Port ✓",  cls: "bg-green-900/60 text-green-300" },
  "stbd-inside": { label: "Stbd ✓",  cls: "bg-green-900/60 text-green-300" },
  "overstanding":{ label: "Over!",   cls: "bg-red-900/60 text-red-300" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TacticalTable({ targets, boat }: { targets: any[]; boat: OwnBoat }) {
  const sorted = [...targets].sort((a, b) => a.distance - b.distance);
  const hasMarkData = sorted.some(t => t.distToMark !== undefined);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Tactical</h2>
        <span className="text-xs text-gray-600">
          Our TWA {Math.round(boat.twa)}° · TWD {Math.round(boat.twd)}° · SOG {boat.sog.toFixed(1)} kts
        </span>
      </div>
      {/* Horizontal scroll with visible indicator on tablet */}
      <div className="overflow-x-auto -mx-1 px-1" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-700">
              <th className="text-left pb-3 pr-4 pl-3">Boat</th>
              <th className="text-right pb-3 pr-4">Dist</th>
              <th className="text-right pb-3 pr-4">Brg</th>
              <th className="text-right pb-3 pr-4">Rate</th>
              <th className="text-right pb-3 pr-4">SOG</th>
              <th className="text-right pb-3 pr-4">Wind</th>
              <th className="text-center pb-3 pr-4">Higher?</th>
              <th className="text-center pb-3 pr-4">Faster?</th>
              {hasMarkData && <th className="text-right pb-3 pr-4">→Mk</th>}
              {hasMarkData && <th className="text-center pb-3 pr-4">Layline</th>}
              <th className="text-right pb-3 hidden xl:table-cell">Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const closing = t.closingRate < 0;
              return (
                <tr key={t.mmsi} className={`border-b border-gray-800/50 hover:bg-gray-800/30 active:bg-gray-800/50 transition-colors ${rowStyle(t.closingRate)}`}>
                  <td className="py-3 pr-4 pl-3 font-semibold text-white text-base">
                    {t.name}
                    {t.source === "yellowbrick" && (
                      <span className="ml-1.5 text-xs font-mono text-blue-400 opacity-70">YB</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-gray-200">{t.distance.toFixed(2)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-gray-400">{Math.round(t.bearing)}°</td>
                  <td className={`py-3 pr-4 text-right font-mono font-bold text-sm ${closing ? "text-green-400" : "text-red-400"}`}>
                    {closing ? "▼" : "▲"} {Math.abs(t.closingRate).toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-gray-200">{t.sog.toFixed(1)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-gray-200">{Math.round(t.effectiveWindAngle)}°</td>
                  <td className="py-3 pr-4 text-center">
                    <Badge positive={t.isHigher} label={t.isHigher ? `↑ ${Math.round(boat.twa)}° vs ${Math.round(t.effectiveWindAngle)}°` : `↓ ${Math.round(boat.twa)}° vs ${Math.round(t.effectiveWindAngle)}°`} />
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <Badge positive={t.isFaster} label={t.isFaster ? `↑ ${boat.sog.toFixed(1)} vs ${t.sog.toFixed(1)}` : `↓ ${boat.sog.toFixed(1)} vs ${t.sog.toFixed(1)}`} />
                  </td>
                  {hasMarkData && (
                    <td className="py-3 pr-4 text-right font-mono text-gray-400 text-sm">
                      {t.distToMark !== undefined ? `${t.distToMark.toFixed(2)}` : "—"}
                    </td>
                  )}
                  {hasMarkData && (
                    <td className="py-3 pr-4 text-center">
                      {t.laylineStatus ? (
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${LAYLINE_LABELS[t.laylineStatus]?.cls ?? ""}`}>
                          {LAYLINE_LABELS[t.laylineStatus]?.label ?? t.laylineStatus}
                        </span>
                      ) : "—"}
                    </td>
                  )}
                  <td className="py-3 text-right hidden xl:table-cell">
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
