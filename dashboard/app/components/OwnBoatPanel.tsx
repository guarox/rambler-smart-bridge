"use client";
import { OwnBoat } from "../lib/mockData";

type DataSource = "live" | "connecting" | "waiting" | "simulated";

interface Props {
  boat: OwnBoat;
  dataSource?: DataSource;
}

const SOURCE_BADGE: Record<DataSource, { label: string; cls: string }> = {
  live:       { label: "● LIVE",       cls: "text-green-400" },
  connecting: { label: "◌ SK…",        cls: "text-yellow-400 animate-pulse" },
  waiting:    { label: "○ NO DATA",     cls: "text-slate-600" },
  simulated:  { label: "◎ SIM",        cls: "text-slate-500" },
};

export default function OwnBoatPanel({ boat, dataSource = "simulated" }: Props) {
  const isWaiting = dataSource === "waiting";

  const stats = [
    { label: "BSP",   value: isWaiting ? "—" : boat.bsp.toFixed(1),       unit: "kts" },
    { label: "SOG",   value: isWaiting ? "—" : boat.sog.toFixed(1),       unit: "kts" },
    { label: "COG",   value: isWaiting ? "—" : `${Math.round(boat.cog)}°`, unit: "°T" },
    { label: "TWS",   value: isWaiting ? "—" : boat.tws.toFixed(1),       unit: "kts" },
    { label: "TWD",   value: isWaiting ? "—" : `${Math.round(boat.twd)}°`, unit: "°T" },
    { label: "TWA",   value: isWaiting ? "—" : `${Math.round(boat.twa)}°`, unit: "" },
    { label: "Depth", value: isWaiting ? "—" : boat.depth.toFixed(1),     unit: "m" },
  ];

  const badge = SOURCE_BADGE[dataSource];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Rambler USA 99</h2>
        <span className={`text-xs font-mono ${badge.cls}`}>{badge.label}</span>
      </div>
      {isWaiting && (
        <p className="text-xs text-slate-600 mb-3">Connect PICAN-M to N2K backbone → instruments will appear</p>
      )}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center bg-gray-800 rounded-lg py-2 px-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</span>
            <span className={`text-xl font-bold font-mono leading-tight ${isWaiting ? "text-slate-700" : "text-white"}`}>{s.value}</span>
            <span className="text-xs text-gray-500">{s.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
