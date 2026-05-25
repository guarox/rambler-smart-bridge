"use client";
import { useState, useEffect, useRef } from "react";
import type { WindCell } from "./mockData";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ForecastHour {
  time: Date;
  label: string;          // e.g. "Sat 23 · 7AM"
  offsetHours: number;    // 0 = now, 1 = +1hr, etc.
  cells: WindCell[];      // flat grid, row-major north→south, west→east
  uGrid: number[];        // eastward component m/s (for leaflet-velocity)
  vGrid: number[];        // northward component m/s
}

export interface VelocityHeader {
  parameterUnit: string;
  parameterNumber: number;
  parameterCategory: number;
  nx: number;
  ny: number;
  lo1: number; la1: number;
  lo2: number; la2: number;
  dx: number; dy: number;
}

export interface VelocityData {
  header: VelocityHeader;
  data: number[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GRID_N = 5;          // 5×5 = 25 points
const GRID_STEP = 0.25;    // degrees
const GRID_HALF = (GRID_N - 1) / 2 * GRID_STEP; // 0.5°
const KTS_TO_MS = 0.514444;
const FORECAST_HOURS = 24;

// ── Helpers ───────────────────────────────────────────────────────────────────

function windToUV(speedKts: number, dirDeg: number): [number, number] {
  const speedMs = speedKts * KTS_TO_MS;
  const dirRad = dirDeg * Math.PI / 180;
  const u = -speedMs * Math.sin(dirRad);
  const v = -speedMs * Math.cos(dirRad);
  return [u, v];
}

function fmtLabel(date: Date): string {
  const day = date.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
  return `${day} · ${time}`;
}

// ── Generate synthetic forecast ───────────────────────────────────────────────
// Produces a plausible 24hr forecast from current B&G values with slow oscillation.
// Replaced by real Open-Meteo data when internet available.

function buildSyntheticForecast(
  centerLat: number, centerLon: number,
  baseTws: number, baseTwd: number
): { forecast: ForecastHour[]; header: VelocityHeader } {
  const now = new Date();
  // Round down to nearest hour
  now.setMinutes(0, 0, 0);

  // Grid: 5×5, centered on boat, north→south, west→east
  const la1 = centerLat + GRID_HALF;  // north (top)
  const la2 = centerLat - GRID_HALF;  // south (bottom)
  const lo1 = centerLon - GRID_HALF;  // west (left)
  const lo2 = centerLon + GRID_HALF;  // east (right)

  const header: VelocityHeader = {
    parameterUnit: "m/s", parameterNumber: 2, parameterCategory: 2,
    nx: GRID_N, ny: GRID_N,
    lo1, la1, lo2, la2, dx: GRID_STEP, dy: GRID_STEP,
  };

  const forecast: ForecastHour[] = [];

  for (let h = 0; h < FORECAST_HOURS; h++) {
    const t = new Date(now.getTime() + h * 3600_000);
    // Slow oscillation over 24hr: wind direction veers up to ±8°, speed ±3kts
    const twdShift = 8 * Math.sin((h / 24) * 2 * Math.PI);
    const twsShift = 3 * Math.sin((h / 12) * 2 * Math.PI);
    const hourTwd = (baseTwd + twdShift + 360) % 360;
    const hourTws = Math.max(3, baseTws + twsShift);

    const cells: WindCell[] = [];
    const uGrid: number[] = [];
    const vGrid: number[] = [];

    // Build grid: row 0 = northernmost (la1), col 0 = westernmost (lo1)
    for (let row = 0; row < GRID_N; row++) {
      for (let col = 0; col < GRID_N; col++) {
        const lat = la1 - row * GRID_STEP;
        const lon = lo1 + col * GRID_STEP;
        // Add spatial variation: slight speed/direction differences per cell
        const spatialTws = hourTws + (Math.random() - 0.5) * 1.5;
        const spatialTwd = (hourTwd + (Math.random() - 0.5) * 4 + 360) % 360;
        cells.push({ lat, lon, speed: parseFloat(spatialTws.toFixed(1)), dir: parseFloat(spatialTwd.toFixed(0)) });
        const [u, v] = windToUV(spatialTws, spatialTwd);
        uGrid.push(parseFloat(u.toFixed(4)));
        vGrid.push(parseFloat(v.toFixed(4)));
      }
    }

    forecast.push({
      time: t, label: fmtLabel(t),
      offsetHours: h, cells, uGrid, vGrid,
    });
  }

  return { forecast, header };
}

// ── Attempt real Open-Meteo fetch (falls back to synthetic on error) ───────────

async function fetchOpenMeteo(
  centerLat: number, centerLon: number
): Promise<ForecastHour[] | null> {
  try {
    // Build 25 lat/lon pairs for 5×5 grid
    const lats: number[] = [];
    const lons: number[] = [];
    const la1 = centerLat + GRID_HALF;
    const lo1 = centerLon - GRID_HALF;
    for (let row = 0; row < GRID_N; row++) {
      for (let col = 0; col < GRID_N; col++) {
        lats.push(parseFloat((la1 - row * GRID_STEP).toFixed(4)));
        lons.push(parseFloat((lo1 + col * GRID_STEP).toFixed(4)));
      }
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lats.join(","));
    url.searchParams.set("longitude", lons.join(","));
    url.searchParams.set("hourly", "wind_speed_10m,wind_direction_10m,temperature_2m,precipitation_probability");
    url.searchParams.set("wind_speed_unit", "kn");
    url.searchParams.set("forecast_days", "2");
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = await res.json();
    if (!Array.isArray(raw) || raw.length !== GRID_N * GRID_N) return null;

    const times = raw[0].hourly.time as string[];
    const now = new Date();
    const nowH = new Date(now); nowH.setMinutes(0, 0, 0);

    const forecast: ForecastHour[] = [];

    for (let hi = 0; hi < Math.min(FORECAST_HOURS, times.length); hi++) {
      const t = new Date(times[hi]);
      const offsetHours = Math.round((t.getTime() - nowH.getTime()) / 3600_000);
      if (offsetHours < 0) continue;

      const cells: WindCell[] = [];
      const uGrid: number[] = [];
      const vGrid: number[] = [];

      for (let pi = 0; pi < GRID_N * GRID_N; pi++) {
        const speed = raw[pi].hourly.wind_speed_10m[hi] as number ?? 0;
        const dir = raw[pi].hourly.wind_direction_10m[hi] as number ?? 0;
        cells.push({ lat: lats[pi], lon: lons[pi], speed, dir });
        const [u, v] = windToUV(speed, dir);
        uGrid.push(parseFloat(u.toFixed(4)));
        vGrid.push(parseFloat(v.toFixed(4)));
      }

      forecast.push({ time: t, label: fmtLabel(t), offsetHours, cells, uGrid, vGrid });
      if (forecast.length >= FORECAST_HOURS) break;
    }

    return forecast.length > 0 ? forecast : null;
  } catch {
    return null; // network error → fall back to synthetic
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWeatherGrid(lat: number, lon: number, tws: number, twd: number) {
  const [forecast, setForecast] = useState<ForecastHour[]>([]);
  const [header, setHeader] = useState<VelocityHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    // Only refetch if moved > 1nm from last fetch position
    if (lastFetchRef.current) {
      const dlat = Math.abs(lat - lastFetchRef.current.lat);
      const dlon = Math.abs(lon - lastFetchRef.current.lon);
      if (dlat < 0.015 && dlon < 0.015) return; // ~1nm threshold
    }

    lastFetchRef.current = { lat, lon };
    setLoading(true);

    // Always generate synthetic first so UI is never empty
    const { forecast: synthetic, header: h } = buildSyntheticForecast(lat, lon, tws, twd);
    setForecast(synthetic);
    setHeader(h);
    setLoading(false);

    // Attempt real data in background
    fetchOpenMeteo(lat, lon).then(real => {
      if (real && real.length >= 6) {
        setForecast(real);
        // Rebuild header based on actual grid bounds
        const la1 = lat + GRID_HALF;
        const lo1 = lon - GRID_HALF;
        setHeader({
          parameterUnit: "m/s", parameterNumber: 2, parameterCategory: 2,
          nx: GRID_N, ny: GRID_N,
          lo1, la1, lo2: lon + GRID_HALF, la2: lat - GRID_HALF,
          dx: GRID_STEP, dy: GRID_STEP,
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  return { forecast, header, loading };
}
