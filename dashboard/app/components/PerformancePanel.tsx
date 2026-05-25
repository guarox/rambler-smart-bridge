"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { OwnBoat, polarTarget } from "../lib/mockData";

interface Props {
  boat: OwnBoat;
  twdHistory: number[];
  polarHistory: number[];
  onAlarmThresholdChange: (v: number) => void;
  alarmThreshold: number;
}

function playAlarmBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // AudioContext not available in some environments
  }
}

export default function PerformancePanel({ boat, twdHistory, polarHistory, onAlarmThresholdChange, alarmThreshold }: Props) {
  const vmg = boat.bsp * Math.cos((Math.abs(boat.twa) * Math.PI) / 180);
  const target = polarTarget(boat.tws, Math.abs(boat.twa));
  const polarPct = (boat.bsp / target) * 100;
  const bspDelta = boat.bsp - target;

  // Wind shift: compare now vs oldest in history
  const oldest = twdHistory[0] ?? boat.twd;
  let shift = boat.twd - oldest;
  if (shift > 180) shift -= 360;
  if (shift < -180) shift += 360;
  const isHeader = shift > 1;
  const isLift = shift < -1;
  const steadyWind = Math.abs(shift) <= 1;

  // Alarm state
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmFiring, setAlarmFiring] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const consecutiveBelowRef = useRef(0);
  const ALARM_CONSEC = 3; // fire after 3 consecutive readings below threshold (6s)

  useEffect(() => {
    if (!alarmEnabled) {
      consecutiveBelowRef.current = 0;
      setAlarmFiring(false);
      return;
    }
    if (polarPct < alarmThreshold) {
      consecutiveBelowRef.current++;
      if (consecutiveBelowRef.current >= ALARM_CONSEC && !acknowledged) {
        setAlarmFiring(true);
        playAlarmBeep();
      }
    } else {
      consecutiveBelowRef.current = 0;
      setAlarmFiring(false);
      setAcknowledged(false);
    }
  }, [polarPct, alarmEnabled, alarmThreshold, acknowledged]);

  const dismiss = useCallback(() => {
    setAcknowledged(true);
    setAlarmFiring(false);
  }, []);

  const polarColor = polarPct >= 95 ? "text-green-400" : polarPct >= 85 ? "text-yellow-400" : "text-red-400";
  const polarBg = alarmFiring
    ? "bg-red-950 border-red-500 animate-pulse"
    : polarPct >= 95 ? "bg-green-900/30 border-gray-700"
    : polarPct >= 85 ? "bg-yellow-900/30 border-gray-700"
    : "bg-red-900/30 border-gray-700";

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Performance</h2>
        {/* Polar alarm controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Alarm &lt;</span>
          <input
            type="number"
            min={50} max={100} step={1}
            value={alarmThreshold}
            onChange={e => onAlarmThresholdChange(Number(e.target.value))}
            className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white font-mono text-center min-h-[40px]"
          />
          <span className="text-xs text-gray-500">%</span>
          <button
            onClick={() => { setAlarmEnabled(v => !v); setAlarmFiring(false); consecutiveBelowRef.current = 0; }}
            className={`min-h-[44px] px-3 py-2 rounded text-sm font-bold border transition-colors ${
              alarmEnabled ? "bg-red-700 border-red-500 text-white" : "border-gray-600 text-gray-500 hover:text-white"
            }`}
          >
            {alarmEnabled ? "🔔 ON" : "🔕 OFF"}
          </button>
          {alarmFiring && (
            <button onClick={dismiss}
              className="min-h-[44px] px-3 py-2 rounded text-sm font-bold bg-orange-600 border border-orange-400 text-white animate-bounce">
              ACK
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* VMG */}
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">VMG</div>
          <div className="text-3xl font-bold font-mono text-white">{vmg.toFixed(1)}</div>
          <div className="text-xs text-gray-500">kts upwind</div>
        </div>

        {/* Polar % with alarm */}
        <div className={`border rounded-lg p-3 text-center ${polarBg}`}>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            % Polar {alarmEnabled && <span className="text-red-400 ml-1">▼{alarmThreshold}%</span>}
          </div>
          <div className={`text-3xl font-bold font-mono ${alarmFiring ? "text-red-300" : polarColor}`}>
            {Math.round(polarPct)}%
          </div>
          <div className="text-xs text-gray-500">
            {bspDelta >= 0 ? "+" : ""}{bspDelta.toFixed(2)} vs {target.toFixed(1)} kts
          </div>
          {alarmFiring && (
            <div className="text-xs text-red-400 font-bold mt-1">⚠ DRIVER ALERT</div>
          )}
        </div>

        {/* Wind Shift */}
        <div className={`rounded-lg p-3 text-center border ${
          steadyWind ? "bg-gray-800 border-gray-700"
          : isHeader ? "bg-red-950 border-red-700"
          : "bg-green-950 border-green-700"
        }`}>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Wind Shift</div>
          <div className={`text-3xl font-bold font-mono ${
            steadyWind ? "text-gray-300" : isHeader ? "text-red-300" : "text-green-300"
          }`}>
            {steadyWind ? "—" : `${isLift ? "▲" : "▼"} ${Math.abs(shift).toFixed(1)}°`}
          </div>
          <div className={`text-xs font-semibold ${
            steadyWind ? "text-gray-500" : isHeader ? "text-red-400" : "text-green-400"
          }`}>
            {steadyWind ? "Steady" : isHeader ? "Header" : "Lift"}
          </div>
        </div>

        {/* Tack Recommendation */}
        <div className={`rounded-lg p-3 text-center border ${
          isHeader ? "bg-orange-950 border-orange-600" : "bg-gray-800 border-gray-700"
        }`}>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tack</div>
          <div className={`text-xl font-bold font-mono mt-1 ${isHeader ? "text-orange-300" : "text-gray-400"}`}>
            {isHeader ? "⟳ TACK" : "HOLD"}
          </div>
          <div className={`text-xs mt-1 ${isHeader ? "text-orange-400" : "text-gray-600"}`}>
            {isHeader
              ? `heading ${Math.round((boat.cog + 90 + 360) % 360)}°`
              : isLift ? "lift — press" : "no action"}
          </div>
        </div>
      </div>
    </div>
  );
}
