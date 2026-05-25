"use client";
import { useState, useEffect, useRef } from "react";
import { OwnBoat, Target, WindCell, hrrGrid as baseGrid, ownBoat as seedBoat, targets as seedTargets, destPoint, polarTarget, RouteState, MarkMetrics, StartLineMetrics, haversineNm as haversineNmUtil, bearingDeg as bearingDegUtil, defaultRouteState, TargetState, TargetAugmented } from "./mockData";

const R_NM = 3440.065;
const UPDATE_MS = 2000;
export const SIM_SPEED_RATES = [1, 10, 50, 100, 200] as const;
export type SimSpeedRate = typeof SIM_SPEED_RATES[number];

function moveBoat(lat: number, lon: number, cogDeg: number, sogKts: number, dtSec: number): [number, number] {
  const distNm = sogKts * (dtSec / 3600);
  const d = distNm / R_NM;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const b = (cogDeg * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(a)) * R_NM;
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function jitter(val: number, range: number): number {
  return val + (Math.random() - 0.5) * range;
}

const TRAIL_MAX = 60; // keep last 60 positions = 2 minutes at 2s updates


function computeLaylineStatus(
  tLat: number, tLon: number,
  mLat: number, mLon: number,
  twd: number, bestTwa: number
): "outside" | "port-inside" | "stbd-inside" | "overstanding" {
  const brgFromMark = bearingDegUtil(mLat, mLon, tLat, tLon);
  const portLayline = (twd - bestTwa + 180 + 360) % 360;
  const stbdLayline = (twd + bestTwa + 180 + 360) % 360;
  let dPort = brgFromMark - portLayline;
  if (dPort > 180) dPort -= 360;
  if (dPort < -180) dPort += 360;
  let dStbd = brgFromMark - stbdLayline;
  if (dStbd > 180) dStbd -= 360;
  if (dStbd < -180) dStbd += 360;
  if (Math.abs(dPort) < 12) return "port-inside";
  if (Math.abs(dStbd) < 12) return "stbd-inside";
  if (dPort < -15 || dStbd > 15) return "overstanding";
  return "outside";
}

export function useSimulatedLiveData(routeState: RouteState = defaultRouteState, playbackRate: SimSpeedRate = 1, archiveWindGrid?: WindCell[]) {
  const [boat, setBoat] = useState<OwnBoat>({ ...seedBoat });
  const [boatTrail, setBoatTrail] = useState<[number, number][]>([[seedBoat.lat, seedBoat.lon]]);
  const [twdHistory, setTwdHistory] = useState<number[]>(Array(60).fill(seedBoat.twd)); // kept for wind shift calc
  const [polarHistory, setPolarHistory] = useState<number[]>(Array(60).fill(
    Math.round((seedBoat.bsp / polarTarget(seedBoat.tws, Math.abs(seedBoat.twa))) * 100)
  ));
  // windShiftHistory: cumulative shift from oldest TWD in window — positive=veered(header on port), negative=backed(lift on port)
  const [windShiftHistory, setWindShiftHistory] = useState<number[]>(Array(60).fill(0));
  const seedVmg = seedBoat.bsp * Math.cos((Math.abs(seedBoat.twa) * Math.PI) / 180);
  const [vmgHistory, setVmgHistory] = useState<number[]>(Array(60).fill(parseFloat(seedVmg.toFixed(2))));
  const [targets, setTargets] = useState<TargetState[]>(
    seedTargets.map((t) => {
      const [lat, lon] = destPoint(seedBoat.lat, seedBoat.lon, t.bearing, t.distance);
      return { ...t, lat, lon, trail: [[lat, lon]] };
    })
  );
  const [windGrid, setWindGrid] = useState<WindCell[]>(archiveWindGrid ?? baseGrid);

  // Reset windGrid when real archive data loads
  useEffect(() => {
    if (archiveWindGrid && archiveWindGrid.length > 0) {
      setWindGrid(archiveWindGrid);
    }
  }, [archiveWindGrid]);

  const boatRef = useRef(boat);
  const boatTrailRef = useRef(boatTrail);
  const targetsRef = useRef(targets);
  const twdHistoryRef = useRef(twdHistory);
  boatRef.current = boat;
  boatTrailRef.current = boatTrail;
  targetsRef.current = targets;
  twdHistoryRef.current = twdHistory;

  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;
  const archiveRef = useRef(archiveWindGrid);
  archiveRef.current = archiveWindGrid;

  // Find nearest archive wind cell to a lat/lon
  function nearestArchiveCell(lat: number, lon: number): WindCell | null {
    const archive = archiveRef.current;
    if (!archive || archive.length === 0) return null;
    return archive.reduce((best, cell) => {
      const d = Math.abs(cell.lat - lat) + Math.abs(cell.lon - lon);
      const bd = Math.abs(best.lat - lat) + Math.abs(best.lon - lon);
      return d < bd ? cell : best;
    });
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const dt = (UPDATE_MS / 1000) * playbackRateRef.current;
      const prev = boatRef.current;

      // Move Rambler
      const newCog = prev.cog + jitter(0, 3);
      const newSog = Math.max(4, Math.min(10, prev.sog + jitter(0, 0.2)));
      const [newLat, newLon] = moveBoat(prev.lat, prev.lon, newCog, newSog, dt);

      // Wind: blend mock-data jitter with archive data (archive is a soft overlay, not an override)
      const realCell = nearestArchiveCell(newLat, newLon);
      const baseTws = realCell ? prev.tws * 0.7 + realCell.speed * 0.3 : prev.tws;
      const baseTwd = realCell ? prev.twd * 0.7 + realCell.dir  * 0.3 : prev.twd;
      const newTws = Math.max(4, Math.min(30, baseTws + jitter(0, 0.3)));
      const newTwd = baseTwd + jitter(0, 1.0);
      const newTwa = Math.max(25, Math.min(60, prev.twa + jitter(0, 1)));
      const newBsp = polarTarget(newTws, Math.abs(newTwa)) + jitter(0, 0.06);

      const newBoat: OwnBoat = { ...prev, lat: newLat, lon: newLon, cog: newCog, sog: newSog, bsp: newBsp, tws: newTws, twd: newTwd, twa: newTwa };
      const newBoatTrail = [...boatTrailRef.current.slice(-TRAIL_MAX + 1), [newLat, newLon] as [number, number]];

      // Move competitors and recalculate tactical metrics
      const prevTargets = targetsRef.current;
      const newTargets = prevTargets.map((t) => {
        const tCog = t.cog + jitter(0, 0.5);
        const tSog = Math.max(4, Math.min(10, t.sog + jitter(0, 0.15)));
        const [tLat, tLon] = moveBoat(t.lat, t.lon, tCog, tSog, dt);

        const dist = haversineNm(newLat, newLon, tLat, tLon);
        const bearing = bearingDeg(newLat, newLon, tLat, tLon);
        const prevDist = t.distance;
        const closingRate = (dist - prevDist) / (dt / 3600); // nm/hr, negative = closing

        const effWindAngle = Math.abs(((tCog - newTwd + 360) % 360) - 180);
        const normalised = effWindAngle > 90 ? 180 - effWindAngle : effWindAngle;
        const isHigher = newTwa < normalised;
        const isFaster = newSog > tSog;

        const history = [...t.distanceHistory.slice(1), parseFloat(dist.toFixed(2))];

        const newTrail = [...t.trail.slice(-TRAIL_MAX + 1), [tLat, tLon] as [number, number]];
        return { ...t, lat: tLat, lon: tLon, cog: tCog, sog: tSog, distance: dist, bearing, closingRate, effectiveWindAngle: Math.round(normalised), isHigher, isFaster, distanceHistory: history, trail: newTrail };
      });

      // Regenerate 3×3 wind grid centered on boat's current position using archive data
      const GRID_STEP = 0.18; // ~11nm spacing
      const newWindGrid: WindCell[] = [];
      for (let dlat = -1; dlat <= 1; dlat++) {
        for (let dlon = -1; dlon <= 1; dlon++) {
          const gLat = newLat + dlat * GRID_STEP;
          const gLon = newLon + dlon * GRID_STEP;
          const src = nearestArchiveCell(gLat, gLon) ?? { speed: newTws, dir: newTwd };
          newWindGrid.push({
            lat: gLat, lon: gLon,
            speed: Math.max(4, Math.min(40, src.speed + jitter(0, 0.3))),
            dir: src.dir + jitter(0, 0.5),
          });
        }
      }
      setWindGrid(newWindGrid);

      const newPolarPct = Math.round((newBsp / polarTarget(newTws, Math.abs(newTwa))) * 100);
      const newVmg = parseFloat((newBsp * Math.cos((Math.abs(newTwa) * Math.PI) / 180)).toFixed(2));

      // Wind shift: delta from oldest TWD value in window, normalized ±180
      const oldTwd = twdHistoryRef.current[0] ?? newTwd;
      let rawShift = newTwd - oldTwd;
      if (rawShift > 180) rawShift -= 360;
      if (rawShift < -180) rawShift += 360;

      setBoat(newBoat);
      setBoatTrail(newBoatTrail);
      setTwdHistory(prev => [...prev.slice(-59), newTwd]);
      setPolarHistory(prev => [...prev.slice(-59), newPolarPct]);
      setWindShiftHistory(prev => {
        // Recompute all shifts relative to the new oldest value
        const updated = [...prev.slice(-59), parseFloat(rawShift.toFixed(2))];
        return updated;
      });
      setVmgHistory(prev => [...prev.slice(-59), newVmg]);
      setTargets(newTargets);
    }, UPDATE_MS);

    return () => clearInterval(interval);
  }, []);

  // Derive mark metrics from current boat state + routeState (recomputed each render)
  const activeMark = routeState.activeIndex >= 0 ? routeState.waypoints[routeState.activeIndex] : null;

  const markMetrics: MarkMetrics | null = activeMark ? (() => {
    const bearing = bearingDegUtil(boat.lat, boat.lon, activeMark.lat, activeMark.lon);
    const distance = haversineNmUtil(boat.lat, boat.lon, activeMark.lat, activeMark.lon);
    let angleDiff = bearing - boat.cog;
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;
    const vmgToMark = boat.sog * Math.cos((Math.abs(angleDiff) * Math.PI) / 180);
    const ttm = vmgToMark > 0.1 ? (distance / vmgToMark) * 60 : 999;
    const bestTwa = 38;
    const portLaylineBrg = (boat.twd - bestTwa + 180 + 360) % 360;
    const stbdLaylineBrg = (boat.twd + bestTwa + 180 + 360) % 360;
    return { bearing, distance, vmgToMark, ttm, portLaylineBrg, stbdLaylineBrg };
  })() : null;

  const portMark = routeState.waypoints.find(w => w.type === "start-port");
  const stbdMark = routeState.waypoints.find(w => w.type === "start-stbd");
  const startMetrics: StartLineMetrics | null = (portMark && stbdMark) ? (() => {
    const lineBrg = bearingDegUtil(portMark.lat, portMark.lon, stbdMark.lat, stbdMark.lon);
    const perpBrg = (boat.twd + 90) % 360;
    let biasDeg = lineBrg - perpBrg;
    if (biasDeg > 180) biasDeg -= 360;
    if (biasDeg < -180) biasDeg += 360;
    const biasEnd: "port" | "starboard" | "even" = Math.abs(biasDeg) < 1 ? "even" : biasDeg > 0 ? "starboard" : "port";
    const brgAP = bearingDegUtil(portMark.lat, portMark.lon, boat.lat, boat.lon);
    const distAP = haversineNmUtil(portMark.lat, portMark.lon, boat.lat, boat.lon);
    const xte = Math.abs(distAP * Math.sin(((brgAP - lineBrg) * Math.PI) / 180));
    const ttl = boat.sog > 0.1 ? (xte / boat.sog) * 60 : 999;
    return { biasEnd, biasDeg: Math.abs(biasDeg), distToLine: xte, timeToLine: ttl };
  })() : null;

  // Augment targets with mark metrics when active
  const augmentedTargets: TargetAugmented[] = activeMark ? targets.map(t => {
    const distToMark = haversineNmUtil(t.lat, t.lon, activeMark.lat, activeMark.lon);
    const ttmToMark = t.sog > 0.1 ? (distToMark / t.sog) * 60 : 999;
    const laylineStatus = computeLaylineStatus(t.lat, t.lon, activeMark.lat, activeMark.lon, boat.twd, 38);
    return { ...t, distToMark, ttmToMark, laylineStatus };
  }) : targets;

  return { boat, boatTrail, targets: augmentedTargets, windGrid, twdHistory, polarHistory, windShiftHistory, vmgHistory, markMetrics, startMetrics };
}
