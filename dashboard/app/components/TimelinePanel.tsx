"use client";
import React, { useMemo } from "react";
import { CaptureFrame, RaceSession, exportToCSV } from "../lib/captureBuffer";

interface Props {
  bufferRef: React.RefObject<CaptureFrame[]>;
  sessions: RaceSession[];
  activeSession: RaceSession | null;
  replayIndex: number;
  onReplayIndexChange: (i: number) => void;
  onStartSession: () => void;
  onEndSession: () => void;
  onDeleteSession: (id: string) => void;
}

function relTime(ms: number): string {
  const diffSec = Math.round((Date.now() - ms) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m ago`;
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtDuration(startMs: number, endMs: number | null): string {
  const ms = (endMs ?? Date.now()) - startMs;
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

export default function TimelinePanel({
  bufferRef, sessions, activeSession,
  replayIndex, onReplayIndexChange,
  onStartSession, onEndSession, onDeleteSession,
}: Props) {
  const buffer = bufferRef.current ?? [];
  const bufLen = buffer.length;
  const isLive = replayIndex < 0;

  const currentFrame = isLive ? buffer[bufLen - 1] : buffer[replayIndex];
  const currentTs = currentFrame?.t ?? Date.now();

  const sliderValue = isLive ? bufLen - 1 : replayIndex;

  // Session position overlays on the track (as % widths)
  const sessionOverlays = useMemo(() => {
    if (bufLen === 0) return [];
    const firstTs = buffer[0]?.t ?? Date.now();
    const lastTs = buffer[bufLen - 1]?.t ?? Date.now();
    const range = lastTs - firstTs || 1;
    return sessions.map(s => {
      const left = Math.max(0, ((s.startTs - firstTs) / range) * 100);
      const right = Math.min(100, (((s.endTs ?? lastTs) - firstTs) / range) * 100);
      return { ...s, left, width: Math.max(0.5, right - left) };
    });
  }, [sessions, bufLen, buffer]);

  function handleExport(session?: RaceSession) {
    if (buffer.length === 0) return;
    let frames = buffer;
    let filename = "rambler_capture.csv";
    if (session) {
      const end = session.endTs ?? Date.now();
      frames = buffer.filter(f => f.t >= session.startTs && f.t <= end);
      filename = `rambler_${session.name.replace(/\s+/g, "_").toLowerCase()}.csv`;
    }
    exportToCSV(frames, filename);
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Timeline</h2>
          <span className={`text-xs px-2 py-0.5 rounded font-bold font-mono ${isLive ? "bg-green-900/60 text-green-300" : "bg-orange-900/60 text-orange-300 animate-pulse"}`}>
            {isLive ? "● LIVE" : "⏪ REPLAY"}
          </span>
          <span className="text-xs text-gray-600 font-mono">{bufLen} frames captured</span>
        </div>

        {/* Race session controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {!activeSession ? (
            <button
              onClick={onStartSession}
              className="min-h-[44px] px-4 py-2 rounded border border-green-600/60 text-green-400 hover:text-green-200 active:bg-green-900/20 text-sm font-mono font-bold transition-colors whitespace-nowrap"
            >
              ▶ Start Race
            </button>
          ) : (
            <button
              onClick={onEndSession}
              className="min-h-[44px] px-4 py-2 rounded border border-red-600/60 text-red-400 hover:text-red-200 active:bg-red-900/20 text-sm font-mono font-bold transition-colors animate-pulse whitespace-nowrap"
            >
              ■ End Race — {fmtDuration(activeSession.startTs, null)}
            </button>
          )}
          <button
            onClick={() => handleExport()}
            disabled={bufLen === 0}
            className="min-h-[44px] px-4 py-2 rounded border border-blue-600/60 text-blue-400 hover:text-blue-200 active:bg-blue-900/20 text-sm font-mono transition-colors disabled:opacity-30 whitespace-nowrap"
          >
            ⬇ Export All CSV
          </button>
        </div>
      </div>

      {/* Timeline track */}
      <div className="space-y-1">
        {bufLen > 1 ? (
          <>
            {/* Session overlays above the slider */}
            <div className="relative h-4 mb-1">
              {sessionOverlays.map(s => (
                <div
                  key={s.id}
                  title={s.name}
                  style={{ left: `${s.left}%`, width: `${s.width}%` }}
                  className="absolute top-0 h-4 rounded bg-blue-500/40 border border-blue-400/40 text-blue-300 text-xs flex items-center px-1 overflow-hidden whitespace-nowrap"
                >
                  {s.width > 3 ? s.name : ""}
                </div>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min={0}
              max={bufLen - 1}
              value={sliderValue}
              onChange={e => {
                const idx = Number(e.target.value);
                // Snap to live if at the end
                onReplayIndexChange(idx >= bufLen - 1 ? -1 : idx);
              }}
              className="w-full accent-blue-400 cursor-pointer"
            />

            {/* Time label row */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-600">{buffer[0] ? fmtTime(buffer[0].t) : "—"}</span>
              <div className="flex items-center gap-3">
                {!isLive && (
                  <>
                    <span className="text-orange-300">{fmtTime(currentTs)}</span>
                    <span className="text-gray-500">({relTime(currentTs)})</span>
                    <button
                      onClick={() => onReplayIndexChange(-1)}
                      className="px-2 py-0.5 rounded border border-green-600/60 text-green-400 hover:text-green-200 transition-colors"
                    >
                      ▶ Live
                    </button>
                  </>
                )}
                {isLive && <span className="text-green-400">Live — {fmtTime(currentTs)}</span>}
              </div>
              <span className="text-gray-600">Now</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-600 italic py-2">Recording… timeline available after a few seconds.</p>
        )}
      </div>

      {/* Past sessions */}
      {sessions.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Saved Races</div>
          <div className="flex flex-wrap gap-2">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1 text-xs">
                <span className="text-white font-semibold">{s.name}</span>
                <span className="text-gray-500 font-mono">{fmtDuration(s.startTs, s.endTs)}</span>
                {s.endTs && (
                  <button
                    onClick={() => handleExport(s)}
                    className="ml-1 text-blue-400 hover:text-blue-200 transition-colors"
                    title="Export this race"
                  >
                    ⬇
                  </button>
                )}
                <button
                  onClick={() => onDeleteSession(s.id)}
                  className="ml-1 text-red-500 hover:text-red-300 transition-colors"
                  title="Delete session"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
