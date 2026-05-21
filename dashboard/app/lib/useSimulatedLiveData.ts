"use client";
import { useState, useEffect, useRef } from "react";
import { OwnBoat, Target, WindCell, hrrGrid as baseGrid, ownBoat as seedBoat, targets as seedTargets, destPoint } from "./mockData";

const R_NM = 3440.065;
const UPDATE_MS = 2000;

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

export interface TargetState extends Target {
  lat: number;
  lon: number;
  trail: [number, number][];
}

export function useSimulatedLiveData() {
  const [boat, setBoat] = useState<OwnBoat>({ ...seedBoat });
  const [boatTrail, setBoatTrail] = useState<[number, number][]>([[seedBoat.lat, seedBoat.lon]]);
  const [twdHistory, setTwdHistory] = useState<number[]>([seedBoat.twd]);
  const [targets, setTargets] = useState<TargetState[]>(
    seedTargets.map((t) => {
      const [lat, lon] = destPoint(seedBoat.lat, seedBoat.lon, t.bearing, t.distance);
      return { ...t, lat, lon, trail: [[lat, lon]] };
    })
  );
  const [windGrid, setWindGrid] = useState<WindCell[]>(baseGrid);

  const boatRef = useRef(boat);
  const boatTrailRef = useRef(boatTrail);
  const targetsRef = useRef(targets);
  boatRef.current = boat;
  boatTrailRef.current = boatTrail;
  targetsRef.current = targets;

  useEffect(() => {
    const interval = setInterval(() => {
      const dt = UPDATE_MS / 1000;
      const prev = boatRef.current;

      // Move Rambler
      const newCog = prev.cog + jitter(0, 3);
      const newSog = Math.max(4, Math.min(10, prev.sog + jitter(0, 0.2)));
      const newBsp = Math.max(4, Math.min(10, prev.bsp + jitter(0, 0.15)));
      const newTws = Math.max(8, Math.min(20, prev.tws + jitter(0, 0.3)));
      const newTwd = prev.twd + jitter(0, 1.5);
      const newTwa = Math.max(25, Math.min(60, prev.twa + jitter(0, 1)));
      const [newLat, newLon] = moveBoat(prev.lat, prev.lon, newCog, newSog, dt);

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

      // Shift HRRR grid slightly
      setWindGrid((prev) => prev.map((cell) => ({ ...cell, speed: Math.max(8, Math.min(22, cell.speed + jitter(0, 0.2))), dir: cell.dir + jitter(0, 0.5) })));

      setBoat(newBoat);
      setBoatTrail(newBoatTrail);
      setTwdHistory(prev => [...prev.slice(-14), newTwd]); // keep 15 values = 30s
      setTargets(newTargets);
    }, UPDATE_MS);

    return () => clearInterval(interval);
  }, []);

  return { boat, boatTrail, targets, windGrid, twdHistory };
}
