"use client";
import { OwnBoat } from "../lib/mockData";

export default function OwnBoatPanel({ boat }: { boat: OwnBoat }) {
  const stats = [
    { label: "BSP", value: boat.bsp.toFixed(1), unit: "kts" },
    { label: "SOG", value: boat.sog.toFixed(1), unit: "kts" },
    { label: "COG", value: `${Math.round(boat.cog)}°`, unit: "T" },
    { label: "TWS", value: boat.tws.toFixed(1), unit: "kts" },
    { label: "TWD", value: `${Math.round(boat.twd)}°`, unit: "T" },
    { label: "TWA", value: `${Math.round(boat.twa)}°`, unit: "" },
    { label: "Depth", value: boat.depth.toFixed(1), unit: "m" },
  ];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Rambler USA 99</h2>
        <span className="text-xs text-green-400 font-mono">● LIVE</span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center bg-gray-800 rounded-lg py-2 px-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</span>
            <span className="text-xl font-bold text-white font-mono leading-tight">{s.value}</span>
            <span className="text-xs text-gray-500">{s.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
