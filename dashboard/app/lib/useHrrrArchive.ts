"use client";
import { useState, useEffect } from "react";
import type { WindCell } from "./mockData";

// Grid points covering the full Chicago-Mac race course
const RACE_COURSE_GRID = [
  { lat: 41.875, lon: -87.535 },
  { lat: 41.875, lon: -87.35  },
  { lat: 42.6,   lon: -87.45  },
  { lat: 42.6,   lon: -87.1   },
  { lat: 43.7,   lon: -87.3   },
  { lat: 43.7,   lon: -86.8   },
  { lat: 44.5,   lon: -87.0   },
  { lat: 44.5,   lon: -86.4   },
  { lat: 45.5,   lon: -85.5   },
  { lat: 45.85,  lon: -84.72  },
];

// Chicago-Mac 2025 race start: July 19, 2025 ~11:30am CDT = 16:30 UTC
const RACE_DATE = "2025-07-19";
const RACE_START_UTC_HOUR = 16;
const LS_KEY = "rambler_hrrr_mac2025_v2";

export interface HrrrArchiveResult {
  grid: WindCell[];
  hourlyGrids: WindCell[][];
  raceStartGrid: WindCell[];
  status: "idle" | "loading" | "ok" | "error";
  errorMessage: string | null;
}

export function useHrrrArchive(enabled = true): HrrrArchiveResult {
  const [result, setResult] = useState<HrrrArchiveResult>({
    grid: [], hourlyGrids: [], raceStartGrid: [],
    status: "idle", errorMessage: null,
  });

  useEffect(() => {
    if (!enabled) {
      setResult({ grid: [], hourlyGrids: [], raceStartGrid: [], status: "idle", errorMessage: null });
      return;
    }

    // Return cached data immediately if available
    try {
      const cached = localStorage.getItem(LS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setResult({ ...parsed, status: "ok", errorMessage: null });
        return;
      }
    } catch { /* ignore */ }

    const controller = new AbortController();

    async function fetchArchive() {
      setResult(prev => ({ ...prev, status: "loading" }));

      const lats = RACE_COURSE_GRID.map(p => p.lat).join(",");
      const lons = RACE_COURSE_GRID.map(p => p.lon).join(",");

      // Open-Meteo archive API — actual weather on Mac race day July 19 2025
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lats}&longitude=${lons}&start_date=${RACE_DATE}&end_date=${RACE_DATE}&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=kn&timezone=UTC`;

      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const locations: any[] = Array.isArray(data) ? data : [data];

        // Build 24 hourly grids
        const hourlyGrids: WindCell[][] = Array.from({ length: 24 }, (_, hour) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          locations.map((loc: any, idx: number) => ({
            lat: RACE_COURSE_GRID[idx].lat,
            lon: RACE_COURSE_GRID[idx].lon,
            speed: loc.hourly?.wind_speed_10m?.[hour] ?? 14,
            dir:   loc.hourly?.wind_direction_10m?.[hour] ?? 270,
          }))
        );

        const raceStartGrid = hourlyGrids[RACE_START_UTC_HOUR];
        const toCache = { grid: raceStartGrid, hourlyGrids, raceStartGrid };

        try { localStorage.setItem(LS_KEY, JSON.stringify(toCache)); } catch { /* ignore */ }

        setResult({ ...toCache, status: "ok", errorMessage: null });
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setResult(prev => ({ ...prev, status: "error", errorMessage: (e as Error).message }));
      }
    }

    fetchArchive();
    return () => controller.abort();
  }, [enabled]);

  return result;
}
