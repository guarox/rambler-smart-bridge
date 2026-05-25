import type { OwnBoat, WindCell, TargetSource } from "./mockData";

export interface CaptureTargetFrame {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
  dist: number;
  bearing: number;
  closingRate: number;
  source?: TargetSource;
}

export interface CaptureFrame {
  t: number;           // Unix ms
  sog: number; cog: number; bsp: number;
  twa: number; tws: number; twd: number;
  depth: number; lat: number; lon: number;
  polarPct: number; vmg: number;
  targets: CaptureTargetFrame[];
  hrrr: { speed: number; dir: number };
}

export interface RaceSession {
  id: string;
  name: string;
  startTs: number;
  endTs: number | null; // null = open
}

export const BUFFER_MAX = 3600; // 2 hours at 2s cadence

const LS_SESSIONS_KEY = "rambler_sessions";

export function loadSessions(): RaceSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_SESSIONS_KEY);
    if (raw) return JSON.parse(raw) as RaceSession[];
  } catch { /* ignore */ }
  return [];
}

export function saveSessions(sessions: RaceSession[]): void {
  try { localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessions)); } catch { /* ignore */ }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function frameFromLiveData(boat: OwnBoat, targets: any[], windGrid: WindCell[], polarPct: number, vmg: number): CaptureFrame {
  const nearest = windGrid[4] ?? windGrid[0] ?? { speed: 0, dir: 0 };
  return {
    t: Date.now(),
    sog: boat.sog, cog: boat.cog, bsp: boat.bsp,
    twa: boat.twa, tws: boat.tws, twd: boat.twd,
    depth: boat.depth, lat: boat.lat, lon: boat.lon,
    polarPct, vmg,
    targets: targets.slice(0, 16).map(t => ({
      mmsi: t.mmsi, name: t.name,
      lat: t.lat ?? boat.lat, lon: t.lon ?? boat.lon,
      sog: t.sog, cog: t.cog,
      dist: t.distance, bearing: t.bearing,
      closingRate: t.closingRate,
      source: t.source,
    })),
    hrrr: { speed: nearest.speed, dir: nearest.dir },
  };
}

export function exportToCSV(frames: CaptureFrame[], filename = "rambler_capture.csv"): void {
  if (frames.length === 0) return;

  const maxTargets = Math.max(...frames.map(f => f.targets.length));
  const targetHeaders = Array.from({ length: maxTargets }, (_, i) =>
    [`t${i+1}_mmsi`, `t${i+1}_name`, `t${i+1}_dist_nm`, `t${i+1}_bearing_deg`, `t${i+1}_closing_nm_hr`, `t${i+1}_sog_kts`, `t${i+1}_cog_deg`, `t${i+1}_lat`, `t${i+1}_lon`].join(",")
  ).join(",");

  const header = [
    "timestamp_ms", "datetime",
    "sog_kts", "cog_deg", "bsp_kts", "twa_deg", "tws_kts", "twd_deg",
    "depth_m", "lat", "lon", "polar_pct", "vmg_kts",
    targetHeaders,
    "hrrr_speed_kts", "hrrr_dir_deg",
  ].join(",");

  const rows = frames.map(f => {
    const dt = new Date(f.t).toISOString();
    const boat = [f.sog, f.cog, f.bsp, f.twa, f.tws, f.twd, f.depth, f.lat, f.lon, f.polarPct, f.vmg].join(",");
    const tgtParts = Array.from({ length: maxTargets }, (_, i) => {
      const t = f.targets[i];
      if (!t) return Array(9).fill("").join(",");
      return [t.mmsi, `"${t.name}"`, t.dist.toFixed(4), t.bearing.toFixed(1), t.closingRate.toFixed(4), t.sog.toFixed(2), t.cog.toFixed(1), t.lat.toFixed(6), t.lon.toFixed(6)].join(",");
    }).join(",");
    return [f.t, dt, boat, tgtParts, f.hrrr.speed.toFixed(2), f.hrrr.dir.toFixed(1)].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function computeWindShiftHistory(twdSlice: number[]): number[] {
  if (twdSlice.length === 0) return [];
  const oldest = twdSlice[0];
  return twdSlice.map(twd => {
    let shift = twd - oldest;
    if (shift > 180) shift -= 360;
    if (shift < -180) shift += 360;
    return parseFloat(shift.toFixed(2));
  });
}
