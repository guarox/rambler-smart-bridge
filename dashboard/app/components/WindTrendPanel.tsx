"use client";
import LineChart from "./LineChart";

interface Props {
  twdHistory: number[];
  twsHistory: number[];
  polarHistory: number[];
  alarmThreshold: number;
}

export default function WindTrendPanel({ twdHistory, twsHistory, polarHistory, alarmThreshold }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Trends</h2>
        <span className="text-xs text-gray-600">Last 2 minutes · 2s resolution</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <LineChart
          data={twdHistory}
          color="#60a5fa"
          label="True Wind Direction"
          unit="°T"
          formatValue={v => `${Math.round(v)}°`}
        />
        <LineChart
          data={twsHistory}
          color="#fbbf24"
          label="True Wind Speed"
          unit="kts"
          formatValue={v => v.toFixed(1)}
        />
        <LineChart
          data={polarHistory}
          color="#a78bfa"
          label="% of Polar"
          unit="%"
          height={72}
          alarmThreshold={alarmThreshold}
          alarmColor="#ef4444"
          formatValue={v => `${Math.round(v)}%`}
        />
      </div>
    </div>
  );
}
