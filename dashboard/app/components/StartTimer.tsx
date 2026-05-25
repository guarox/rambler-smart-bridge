"use client";
import { useState, useEffect, useCallback } from "react";

const PRESETS = [5 * 60, 4 * 60, 3 * 60, 1 * 60]; // standard race sequence

export default function StartTimer() {
  const [seconds, setSeconds] = useState(5 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const fmt = (s: number) => {
    const abs = Math.abs(s);
    const m = Math.floor(abs / 60).toString().padStart(2, "0");
    const sec = (abs % 60).toString().padStart(2, "0");
    return `${s < 0 ? "+" : ""}${m}:${sec}`;
  };

  const reset = useCallback((s: number) => { setSeconds(s); setRunning(false); }, []);
  const sync = useCallback(() => {
    // Sync to nearest minute
    setSeconds(s => Math.round(s / 60) * 60);
  }, []);

  const urgent = seconds <= 60 && seconds > 0;
  const over = seconds < 0;
  const color = over ? "text-green-400" : urgent ? "text-red-400 animate-pulse" : "text-white";

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex items-center gap-4">
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Start</span>
        <span className={`text-3xl font-bold font-mono leading-none ${color}`}>{fmt(seconds)}</span>
        <span className="text-xs text-gray-600 mt-0.5">{over ? "Racing" : urgent ? "Final minute" : "To start"}</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button key={p} onClick={() => reset(p)}
            className="min-w-[44px] min-h-[44px] px-3 py-2 text-sm font-mono border border-gray-600 rounded text-gray-400 hover:text-white hover:border-gray-400 active:bg-gray-700 transition-colors">
            {p / 60}m
          </button>
        ))}
        <button onClick={sync}
          className="min-h-[44px] px-3 py-2 text-sm font-mono border border-gray-600 rounded text-gray-400 hover:text-white hover:border-gray-400 active:bg-gray-700 transition-colors">
          Sync
        </button>
      </div>

      <button
        onClick={() => setRunning(r => !r)}
        className={`ml-auto min-h-[44px] px-5 py-2.5 rounded-lg font-bold text-base transition-colors ${
          running
            ? "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white"
            : "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white"
        }`}
      >
        {running ? "■ Stop" : "▶ Start"}
      </button>
    </div>
  );
}
