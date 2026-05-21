"use client";
import LineChart from "./LineChart";

interface Props {
  windShiftHistory: number[];
  vmgHistory: number[];
  polarHistory: number[];
  alarmThreshold: number;
}

export default function WindTrendPanel({ windShiftHistory, vmgHistory, polarHistory, alarmThreshold }: Props) {
  const currentShift = windShiftHistory[windShiftHistory.length - 1] ?? 0;
  const shiftColor = currentShift > 1 ? "#f87171" : currentShift < -1 ? "#4ade80" : "#94a3b8";

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Trends</h2>
        <span className="text-xs text-gray-600">Last 2 min · not on chartplotter</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        {/* Wind Shift — interpreted, not raw TWD */}
        <div>
          <LineChart
            data={windShiftHistory}
            color={shiftColor}
            label="Net Wind Shift (vs 2min ago)"
            unit="°"
            height={80}
            formatValue={v => `${v > 0 ? "+" : ""}${v.toFixed(1)}°`}
          />
          <p className="text-xs text-gray-600 mt-1 px-1">
            {currentShift > 1 ? "▼ Veering — header on port / lift on stbd" :
             currentShift < -1 ? "▲ Backing — lift on port / header on stbd" :
             "Wind steady relative to 2min ago"}
          </p>
        </div>

        {/* VMG — chartplotter has no polar */}
        <LineChart
          data={vmgHistory}
          color="#34d399"
          label="VMG Upwind"
          unit="kts"
          height={80}
          formatValue={v => v.toFixed(2)}
        />

        {/* % Polar with alarm line */}
        <LineChart
          data={polarHistory}
          color="#a78bfa"
          label="% of Polar"
          unit="%"
          height={80}
          alarmThreshold={alarmThreshold}
          alarmColor="#ef4444"
          formatValue={v => `${Math.round(v)}%`}
        />
      </div>
    </div>
  );
}
