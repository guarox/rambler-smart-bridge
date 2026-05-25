"use client";
import { useState } from "react";
import type { YBConfig, YBStatus } from "../lib/useYellowbrickData";

interface Props {
  config: YBConfig;
  status: YBStatus;
  lastUpdateMs: number | null;
  boatCount: number;
  errorMessage: string | null;
  onConfigChange: (cfg: YBConfig) => void;
  onClose: () => void;
}

export default function YellowbrickSettings({ config, status, lastUpdateMs, boatCount, errorMessage, onConfigChange, onClose }: Props) {
  const [raceId, setRaceId] = useState(config.raceId);
  const [proxyPrefix, setProxyPrefix] = useState(config.proxyPrefix ?? "");
  const [showProxy, setShowProxy] = useState(!!config.proxyPrefix);

  const statusColor = {
    ok:      "text-green-400",
    loading: "text-yellow-400 animate-pulse",
    idle:    "text-gray-500",
    error:   "text-red-400",
  }[status];

  function statusLabel() {
    if (status === "ok") {
      const t = lastUpdateMs ? new Date(lastUpdateMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
      return `● Live (${boatCount} boat${boatCount !== 1 ? "s" : ""}, updated ${t})`;
    }
    if (status === "loading") return "◌ Loading…";
    if (status === "error") return `✕ Error: ${errorMessage ?? "unknown"}`;
    return "○ Not configured";
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Yellowbrick Race Feed</h2>
            <p className={`text-sm font-mono mt-0.5 ${statusColor}`}>{statusLabel()}</p>
          </div>
          <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 text-2xl transition-colors">×</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Race ID</label>
            <input
              type="text"
              value={raceId}
              onChange={e => setRaceId(e.target.value)}
              placeholder="e.g. chicago-mac-2025"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-3 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-600 mt-1">Find the race ID in the Yellowbrick tracking URL</p>
          </div>

          <div>
            <button
              onClick={() => setShowProxy(v => !v)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showProxy ? "▾" : "▸"} CORS proxy (advanced)
            </button>
            {showProxy && (
              <input
                type="text"
                value={proxyPrefix}
                onChange={e => setProxyPrefix(e.target.value)}
                placeholder="https://corsproxy.io/? (optional)"
                className="mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-3 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            )}
          </div>

          <div className="bg-gray-800/60 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-400">Yellowbrick fleet feed:</p>
            <p>Updates every ~60s. Fleet boats appear on the chart and tactical table with a <span className="text-blue-400 font-mono">YB</span> badge.</p>
            <p>AIS targets within 5 nm take precedence over matching Yellowbrick entries.</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { onConfigChange({ raceId: "" }); onClose(); }}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg border border-gray-600 text-gray-400 hover:text-white text-sm font-semibold transition-colors"
            >
              Disable YB
            </button>
            <button
              onClick={() => { onConfigChange({ raceId: raceId.trim(), proxyPrefix: proxyPrefix.trim() || undefined }); onClose(); }}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
            >
              Save & Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
