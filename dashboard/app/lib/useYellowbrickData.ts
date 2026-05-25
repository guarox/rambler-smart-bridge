"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import type { OwnBoat, TargetAugmented, RouteState } from "./mockData";
import { haversineNm, bearingDeg } from "./mockData";

export interface YBConfig {
  raceId: string;
  proxyPrefix?: string;
}

export type YBStatus = "idle" | "loading" | "ok" | "error";

interface YBRow {
  id: string;
  name: string;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
  dtg: string;
}

const SELF_NAMES = ["rambler", "usa 99", "usa99"];
function normName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
function isSelf(name: string): boolean {
  const n = normName(name);
  return SELF_NAMES.some(s => n.includes(s));
}

export { normName };

const POLL_MS = 60_000;

export function useYellowbrickData(
  config: YBConfig | null,
  ownBoat: OwnBoat,
  routeState: RouteState
): { targets: TargetAugmented[]; status: YBStatus; lastUpdateMs: number | null; boatCount: number; errorMessage: string | null } | null {
  const [status, setStatus] = useState<YBStatus>("idle");
  const [lastUpdateMs, setLastUpdateMs] = useState<number | null>(null);
  const [boatCount, setBoatCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deriveKey, setDeriveKey] = useState(0);

  const rawRowsRef = useRef<YBRow[]>([]);
  const trailsRef = useRef<Map<string, [number, number][]>>(new Map());
  const historyRef = useRef<Map<string, number[]>>(new Map());
  const distRef = useRef<Map<string, number>>(new Map());
  const closingRateRef = useRef<Map<string, number>>(new Map());
  const ownBoatRef = useRef(ownBoat);
  ownBoatRef.current = ownBoat;

  useEffect(() => {
    if (!config?.raceId) {
      setStatus("idle");
      rawRowsRef.current = [];
      return;
    }

    let cancelled = false;
    let controller = new AbortController();

    async function fetchOnce() {
      controller = new AbortController();
      const base = `https://www.yellowbrickracing.com/api/feed/v3/${config!.raceId}`;
      const url = config!.proxyPrefix ? `${config!.proxyPrefix}${encodeURIComponent(base)}` : base;

      try {
        setStatus("loading");
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;

        const rows: YBRow[] = (json.rows ?? []).filter((r: YBRow) =>
          r && typeof r.lat === "number" && typeof r.lon === "number" && !isSelf(r.name ?? "")
        );

        const ob = ownBoatRef.current;
        rows.forEach(r => {
          const trail = trailsRef.current.get(r.id) ?? [];
          trailsRef.current.set(r.id, [...trail.slice(-19), [r.lat, r.lon] as [number, number]]);

          const dist = haversineNm(ob.lat, ob.lon, r.lat, r.lon);
          const hist = historyRef.current.get(r.id) ?? [];
          historyRef.current.set(r.id, [...hist.slice(-9), parseFloat(dist.toFixed(2))]);

          const prevDist = distRef.current.get(r.id);
          closingRateRef.current.set(r.id, prevDist != null ? (dist - prevDist) / (POLL_MS / 3_600_000) : 0);
          distRef.current.set(r.id, dist);
        });

        rawRowsRef.current = rows;
        setLastUpdateMs(Date.now());
        setBoatCount(rows.length);
        setStatus("ok");
        setErrorMessage(null);
        setDeriveKey(k => k + 1);
      } catch (e) {
        if (cancelled) return;
        if ((e as Error).name === "AbortError") return;
        setStatus("error");
        setErrorMessage((e as Error).message);
      }
    }

    fetchOnce();
    const id = setInterval(fetchOnce, POLL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, [config?.raceId, config?.proxyPrefix]);

  const targets = useMemo((): TargetAugmented[] => {
    if (!config?.raceId || rawRowsRef.current.length === 0) return [];

    const ob = ownBoat;
    const activeMark = routeState.activeIndex >= 0 ? routeState.waypoints[routeState.activeIndex] : null;

    return rawRowsRef.current.map(r => {
      const dist = haversineNm(ob.lat, ob.lon, r.lat, r.lon);
      const brg = bearingDeg(ob.lat, ob.lon, r.lat, r.lon);
      const closingRate = closingRateRef.current.get(r.id) ?? 0;

      const rawAngle = (r.cog - ob.twd + 360) % 360;
      const effAngle = rawAngle > 180 ? 360 - rawAngle : rawAngle;
      const normalised = effAngle > 90 ? 180 - effAngle : effAngle;
      const isHigher = ob.twa < normalised;
      const isFaster = ob.sog > r.sog;

      const distToMark = activeMark ? haversineNm(r.lat, r.lon, activeMark.lat, activeMark.lon) : undefined;
      const ttmToMark = (activeMark && r.sog > 0.1 && distToMark != null) ? (distToMark / r.sog) * 60 : undefined;

      return {
        mmsi: r.id,
        name: r.name,
        lat: r.lat,
        lon: r.lon,
        sog: r.sog,
        cog: r.cog,
        distance: dist,
        bearing: brg,
        closingRate,
        effectiveWindAngle: Math.round(normalised),
        isHigher,
        isFaster,
        distanceHistory: historyRef.current.get(r.id) ?? [dist],
        trail: trailsRef.current.get(r.id) ?? [[r.lat, r.lon]],
        distToMark,
        ttmToMark,
        source: "yellowbrick",
      } as TargetAugmented;
    });
  // deriveKey triggers re-derivation on new fetch; ownBoat + routeState keep it current between fetches
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deriveKey, ownBoat, routeState, config?.raceId]);

  if (!config?.raceId) return null;

  return { targets, status, lastUpdateMs, boatCount, errorMessage };
}
