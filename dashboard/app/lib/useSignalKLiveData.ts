"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { OwnBoat, WindCell, polarTarget, haversineNm, bearingDeg, RouteState, MarkMetrics, StartLineMetrics, defaultRouteState, TargetAugmented, TargetState } from "./mockData";

function computeWindShiftHistory(twdSlice: number[]): number[] {
  if (twdSlice.length === 0) return [];
  const oldest = twdSlice[0];
  return twdSlice.map(twd => {
    let shift = twd - oldest;
    if (shift > 180) shift -= 360;
    if (shift < -180) shift += 360;
    return parseFloat(shift.toFixed(2));
  });
}

// ── Unit conversions (Signal K uses SI) ─────────────────────────────────────
const MS_TO_KTS = 1.94384;
const RAD_TO_DEG = 180 / Math.PI;

function toKts(ms: number | undefined): number { return ms != null ? ms * MS_TO_KTS : 0; }
function toDeg(rad: number | undefined): number {
  if (rad == null) return 0;
  return ((rad * RAD_TO_DEG) % 360 + 360) % 360;
}
function normAngle(rad: number | undefined): number {
  // True wind angle: normalize to 0–180 positive
  if (rad == null) return 0;
  const d = Math.abs(rad * RAD_TO_DEG);
  return d > 180 ? 360 - d : d;
}

// ── Signal K vessel state (internal) ─────────────────────────────────────────
interface VesselState {
  mmsi: string;
  name: string;
  lat: number | null;
  lon: number | null;
  sog: number;   // knots
  cog: number;   // degrees true
  bsp: number;
  twa: number;
  tws: number;
  twd: number;
  depth: number;
}

const TRAIL_MAX = 60;
const HISTORY_MAX = 60;

export type SignalKStatus = "disconnected" | "connecting" | "connected" | "error";

export interface SignalKLiveResult {
  connected: boolean;
  status: SignalKStatus;
  boat: OwnBoat;
  boatTrail: [number, number][];
  targets: TargetAugmented[];
  windGrid: WindCell[];
  twdHistory: number[];
  polarHistory: number[];
  windShiftHistory: number[];
  vmgHistory: number[];
  markMetrics: MarkMetrics | null;
  startMetrics: StartLineMetrics | null;
}

function computeMarkMetrics(boat: OwnBoat, routeState: RouteState, twd: number): MarkMetrics | null {
  const mark = routeState.activeIndex >= 0 ? routeState.waypoints[routeState.activeIndex] : null;
  if (!mark) return null;
  const bearing = bearingDeg(boat.lat, boat.lon, mark.lat, mark.lon);
  const distance = haversineNm(boat.lat, boat.lon, mark.lat, mark.lon);
  let angleDiff = bearing - boat.cog;
  if (angleDiff > 180) angleDiff -= 360;
  if (angleDiff < -180) angleDiff += 360;
  const vmgToMark = boat.sog * Math.cos((Math.abs(angleDiff) * Math.PI) / 180);
  const ttm = vmgToMark > 0.1 ? (distance / vmgToMark) * 60 : 999;
  const bestTwa = 38;
  return {
    bearing, distance, vmgToMark, ttm,
    portLaylineBrg: (twd - bestTwa + 180 + 360) % 360,
    stbdLaylineBrg: (twd + bestTwa + 180 + 360) % 360,
  };
}

function computeStartMetrics(boat: OwnBoat, routeState: RouteState): StartLineMetrics | null {
  const port = routeState.waypoints.find(w => w.type === "start-port");
  const stbd = routeState.waypoints.find(w => w.type === "start-stbd");
  if (!port || !stbd) return null;
  const lineBrg = bearingDeg(port.lat, port.lon, stbd.lat, stbd.lon);
  const perpBrg = (boat.twd + 90) % 360;
  let biasDeg = lineBrg - perpBrg;
  if (biasDeg > 180) biasDeg -= 360;
  if (biasDeg < -180) biasDeg += 360;
  const biasEnd: "port" | "starboard" | "even" = Math.abs(biasDeg) < 1 ? "even" : biasDeg > 0 ? "starboard" : "port";
  const brgAP = bearingDeg(port.lat, port.lon, boat.lat, boat.lon);
  const distAP = haversineNm(port.lat, port.lon, boat.lat, boat.lon);
  const xte = Math.abs(distAP * Math.sin(((brgAP - lineBrg) * Math.PI) / 180));
  return { biasEnd, biasDeg: Math.abs(biasDeg), distToLine: xte, timeToLine: boat.sog > 0.1 ? (xte / boat.sog) * 60 : 999 };
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useSignalKLiveData(
  signalkUrl: string | null,
  routeState: RouteState = defaultRouteState
): SignalKLiveResult | null {
  const [status, setStatus] = useState<SignalKStatus>("disconnected");
  const [boat, setBoat] = useState<OwnBoat | null>(null);
  const [boatTrail, setBoatTrail] = useState<[number, number][]>([]);
  const [targets, setTargets] = useState<Map<string, TargetState>>(new Map());
  const [twdHistory, setTwdHistory] = useState<number[]>([]);
  const [polarHistory, setPolarHistory] = useState<number[]>([]);
  const [vmgHistory, setVmgHistory] = useState<number[]>([]);

  const selfRef = useRef<VesselState>({
    mmsi: "self", name: "Rambler", lat: null, lon: null,
    sog: 0, cog: 0, bsp: 0, twa: 0, tws: 0, twd: 0, depth: 0,
  });
  const vesselsRef = useRef<Map<string, VesselState>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const applyDelta = useCallback((context: string, path: string, value: unknown) => {
    const isself = context === "vessels.self" || context.includes(selfRef.current.mmsi);
    const target = isself ? selfRef.current : (() => {
      const mmsi = context.replace(/^vessels\./, "").replace(/^urn:mrn:imo:mmsi:/, "");
      if (!vesselsRef.current.has(mmsi)) {
        vesselsRef.current.set(mmsi, { mmsi, name: mmsi, lat: null, lon: null, sog: 0, cog: 0, bsp: 0, twa: 0, tws: 0, twd: 0, depth: 0 });
      }
      return vesselsRef.current.get(mmsi)!;
    })();

    switch (path) {
      case "navigation.position":
        if (value && typeof value === "object") {
          target.lat = (value as { latitude: number }).latitude;
          target.lon = (value as { longitude: number }).longitude;
        }
        break;
      case "navigation.speedOverGround":        target.sog = toKts(value as number); break;
      case "navigation.courseOverGroundTrue":   target.cog = toDeg(value as number); break;
      case "navigation.speedThroughWater":      if (isself) target.bsp = toKts(value as number); break;
      case "environment.wind.angleTrueGround":
      case "environment.wind.angleTrueWater":   if (isself) target.twa = normAngle(value as number); break;
      case "environment.wind.speedTrue":        if (isself) target.tws = toKts(value as number); break;
      case "environment.wind.directionTrue":    if (isself) target.twd = toDeg(value as number); break;
      case "environment.depth.belowTransducer": if (isself) target.depth = value as number; break;
      case "name": target.name = String(value ?? target.name); break;
    }

    // Flush self state to React every update
    if (isself && selfRef.current.lat != null) {
      const s = selfRef.current;
      const newBoat: OwnBoat = { sog: s.sog, cog: s.cog, twa: s.twa, tws: s.tws, twd: s.twd, bsp: s.bsp, depth: s.depth, lat: s.lat!, lon: s.lon! };
      setBoat(newBoat);
      setBoatTrail(prev => {
        const next = [...prev.slice(-TRAIL_MAX + 1), [s.lat!, s.lon!] as [number, number]];
        return next;
      });
      const polarPct = s.tws > 0 ? (s.bsp / polarTarget(s.tws, s.twa)) * 100 : 0;
      const vmg = s.bsp * Math.cos((s.twa * Math.PI) / 180);
      setTwdHistory(prev => [...prev.slice(-HISTORY_MAX + 1), s.twd]);
      setPolarHistory(prev => [...prev.slice(-HISTORY_MAX + 1), Math.round(polarPct)]);
      setVmgHistory(prev => [...prev.slice(-HISTORY_MAX + 1), parseFloat(vmg.toFixed(2))]);
    }
  }, []);

  // Flush AIS targets periodically (they don't self-trigger re-renders)
  useEffect(() => {
    const id = setInterval(() => {
      if (!mountedRef.current || !boat) return;
      const now = boat;
      const newTargets = new Map<string, TargetState>();
      vesselsRef.current.forEach((v, mmsi) => {
        if (v.lat == null || v.lon == null) return;
        const dist = haversineNm(now.lat, now.lon, v.lat, v.lon);
        const brg = bearingDeg(now.lat, now.lon, v.lat, v.lon);
        const prev = targets.get(mmsi);
        const closingRate = prev ? (dist - prev.distance) / (2 / 3600) : 0;
        const effAngle = Math.abs(((v.cog - now.twd + 360) % 360) - 180);
        const norm = effAngle > 90 ? 180 - effAngle : effAngle;
        const hist = [...((prev?.distanceHistory ?? []).slice(1)), parseFloat(dist.toFixed(2))];
        const trail = [...((prev?.trail ?? [[v.lat, v.lon]]).slice(-TRAIL_MAX + 1)), [v.lat, v.lon] as [number, number]];
        newTargets.set(mmsi, { mmsi, name: v.name, sog: v.sog, cog: v.cog, lat: v.lat, lon: v.lon, distance: dist, bearing: brg, closingRate, effectiveWindAngle: Math.round(norm), isHigher: now.twa < norm, isFaster: now.sog > v.sog, distanceHistory: hist, trail });
      });
      if (newTargets.size > 0) setTargets(newTargets);
    }, 2000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boat]);

  // WebSocket lifecycle
  useEffect(() => {
    mountedRef.current = true;
    if (!signalkUrl) { setStatus("disconnected"); return; }

    function connect() {
      if (!mountedRef.current) return;
      setStatus("connecting");
      try {
        // Auto-upgrade to wss:// when dashboard is served over HTTPS (mixed content block)
        const isSecurePage = typeof window !== "undefined" && window.location.protocol === "https:";
        const proto = isSecurePage ? "wss" : "ws";
        const url = signalkUrl!.startsWith("ws") ? signalkUrl! : `${proto}://${signalkUrl}/signalk/v1/stream?subscribe=all`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mountedRef.current) { ws.close(); return; }
          setStatus("connected");
          // Subscribe to all paths on all vessels
          ws.send(JSON.stringify({ context: "*", subscribe: [{ path: "*", period: 500, policy: "ideal" }] }));
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string);
            // Delta format
            if (msg.updates && msg.context) {
              msg.updates.forEach((update: { values?: Array<{ path: string; value: unknown }> }) => {
                (update.values ?? []).forEach(({ path, value }) => {
                  applyDelta(msg.context, path, value);
                });
              });
            }
            // Hello / vessel info
            if (msg.self) { selfRef.current.mmsi = msg.self.replace("vessels.", "").replace("urn:mrn:imo:mmsi:", ""); }
          } catch { /* ignore malformed */ }
        };

        ws.onerror = () => { if (mountedRef.current) setStatus("error"); };
        ws.onclose = () => {
          if (!mountedRef.current) return;
          setStatus("disconnected");
          reconnectTimerRef.current = setTimeout(connect, 3000);
        };
      } catch {
        setStatus("error");
        reconnectTimerRef.current = setTimeout(connect, 5000);
      }
    }

    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [signalkUrl, applyDelta]);

  // Build result — null if no URL configured
  if (!signalkUrl || !boat) return null;

  const windShiftHistory = computeWindShiftHistory(twdHistory);

  // Augment targets with mark metrics
  const activeMark = routeState.activeIndex >= 0 ? routeState.waypoints[routeState.activeIndex] : null;
  const augmented: TargetAugmented[] = Array.from(targets.values()).map(t => {
    if (!activeMark) return t;
    const distToMark = haversineNm(t.lat, t.lon, activeMark.lat, activeMark.lon);
    const ttmToMark = t.sog > 0.1 ? (distToMark / t.sog) * 60 : 999;
    return { ...t, distToMark, ttmToMark };
  });

  const windGrid: WindCell[] = [{ lat: boat.lat, lon: boat.lon, speed: boat.tws, dir: boat.twd }];

  return {
    connected: status === "connected",
    status,
    boat,
    boatTrail,
    targets: augmented,
    windGrid,
    twdHistory,
    polarHistory,
    windShiftHistory,
    vmgHistory,
    markMetrics: computeMarkMetrics(boat, routeState, boat.twd),
    startMetrics: computeStartMetrics(boat, routeState),
  };
}
