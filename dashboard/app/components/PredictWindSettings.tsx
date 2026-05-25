"use client";
import { useState } from "react";

export interface PredictWindConfig {
  email: string;
  token: string;
  models: string[];
}

interface Props {
  config: PredictWindConfig;
  status: "idle" | "loading" | "success" | "error";
  errorMessage: string | null;
  onConfigChange: (cfg: PredictWindConfig) => void;
  onCalculateRoute: () => void;
  onClose: () => void;
}

const AVAILABLE_MODELS = [
  { id: "PWG", name: "PWG (PredictWind GFS)" },
  { id: "PWE", name: "PWE (PredictWind ECMWF)" },
  { id: "ECMWF", name: "ECMWF (Global 9km)" },
  { id: "GFS", name: "GFS (Global 22km)" },
  { id: "SPIRE", name: "Spire (Satellite 12km)" },
  { id: "UKMO", name: "UKMO (UK Met Office)" },
];

export default function PredictWindSettings({
  config,
  status,
  errorMessage,
  onConfigChange,
  onCalculateRoute,
  onClose,
}: Props) {
  const [email, setEmail] = useState(config.email);
  const [token, setToken] = useState(config.token);
  const [models, setModels] = useState<string[]>(config.models);

  const statusColor = {
    idle: "text-gray-500",
    loading: "text-yellow-400 animate-pulse",
    success: "text-green-400",
    error: "text-red-400",
  }[status];

  const statusLabel = () => {
    if (status === "loading") return "◌ Fetching weather routes...";
    if (status === "success") return "● Route updated successfully";
    if (status === "error") return `✕ Error: ${errorMessage || "Failed to fetch route"}`;
    return "○ Ready to calculate";
  };

  const handleToggleModel = (id: string) => {
    setModels(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onConfigChange({
      email: email.trim(),
      token: token.trim(),
      models,
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white">PredictWind Routing Setup</h2>
            <p className={`text-sm font-mono mt-0.5 ${statusColor}`}>{statusLabel()}</p>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Credentials */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">PredictWind Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Password / Key</label>
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Model selection checkboxes */}
          <div>
            <label className="block text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">Forecast Models</label>
            <div className="grid grid-cols-2 gap-2 bg-gray-800/40 p-3 rounded-lg border border-gray-800">
              {AVAILABLE_MODELS.map(model => (
                <label key={model.id} className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={models.includes(model.id)}
                    onChange={() => handleToggleModel(model.id)}
                    className="w-4 h-4 rounded text-blue-600 bg-gray-800 border-gray-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-300 font-medium">{model.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Info section */}
          <div className="bg-gray-800/60 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-400">Weather Routing Engine:</p>
            <p>Calculates optimal routes using your boat's polar file (J/99 curves) and target wind limits. Routes will be drawn directly on the chart.</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg border border-gray-600 text-gray-400 hover:text-white transition-colors"
            >
              Save Configuration
            </button>
            <button
              onClick={() => {
                handleSave();
                onCalculateRoute();
              }}
              className="flex-1 min-h-[44px] px-4 py-2 text-sm font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Calculate Route
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
