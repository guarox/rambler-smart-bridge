"use client";
import { useState } from "react";
import type { SignalKStatus } from "../lib/useSignalKLiveData";

interface Props {
  signalkUrl: string;
  status: SignalKStatus;
  onUrlChange: (url: string) => void;
  onClose: () => void;
}

export default function SignalKSettings({ signalkUrl, status, onUrlChange, onClose }: Props) {
  const [draft, setDraft] = useState(signalkUrl);

  const statusColor = {
    connected: "text-green-400",
    connecting: "text-yellow-400 animate-pulse",
    disconnected: "text-gray-500",
    error: "text-red-400",
  }[status];

  const statusLabel = {
    connected: "● Connected",
    connecting: "◌ Connecting…",
    disconnected: "○ Disconnected",
    error: "✕ Error",
  }[status];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Signal K Connection</h2>
            <p className={`text-sm font-mono mt-0.5 ${statusColor}`}>{statusLabel}</p>
          </div>
          <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 text-2xl transition-colors">×</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Signal K WebSocket URL</label>
            <input
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="192.168.4.100:3000"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-3 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              Homelab: <span className="font-mono text-yellow-400">192.168.4.100:3000</span> ·
              Race Mode: <span className="font-mono text-yellow-400">192.168.4.1:3000</span> ·
              mDNS: <span className="font-mono text-yellow-400">rambler.local:3000</span>
            </p>
          </div>

          <div className="bg-gray-800/60 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-400">On the boat:</p>
            <p>1. Open <span className="font-mono text-yellow-300">http://192.168.4.1</span> (dashboard served from Pi, no cert)</p>
            <p>2. Tap <span className="font-mono text-yellow-300">◌ SK…</span> → enter <span className="font-mono text-yellow-300">192.168.4.1:3000</span></p>
            <p>3. Instruments show <span className="text-green-400">● LIVE</span> once N2K data flows</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { onUrlChange(""); onClose(); }}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg border border-gray-600 text-gray-400 hover:text-white text-sm font-semibold transition-colors"
            >
              Use Simulation
            </button>
            <button
              onClick={() => { onUrlChange(draft.trim()); onClose(); }}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
