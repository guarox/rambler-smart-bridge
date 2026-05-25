"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Map as LeafletMap, Marker, Polyline, Rectangle, DivIcon } from "leaflet";
import type { OwnBoat, WindCell, TargetSource } from "../lib/mockData";
import type { RouteState, MarkMetrics } from "../lib/mockData";
import { useWeatherGrid, ForecastHour } from "../lib/useWeatherGrid";

// ── Props ─────────────────────────────────────────────────────────────────────

interface TargetLive {
  mmsi: string; name: string;
  lat: number; lon: number;
  sog: number; cog: number;
  distance: number; bearing: number; closingRate: number;
  isHigher: boolean; isFaster: boolean;
  trail?: [number, number][];
  source?: TargetSource;
}

interface Props {
  boat: OwnBoat & { trail?: [number, number][] };
  targets: TargetLive[];
  routeState?: RouteState;
  markMetrics?: MarkMetrics | null;
  predictWindRoutes?: any;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function speedToColor(kts: number): string {
  if (kts < 5)  return "#1e3a8a";
  if (kts < 8)  return "#1d4ed8";
  if (kts < 11) return "#0ea5e9";
  if (kts < 14) return "#22c55e";
  if (kts < 18) return "#eab308";
  if (kts < 23) return "#f97316";
  return "#ef4444";
}

function boatSvg(color: string, cog: number, isOwn = false, opacity = 1): string {
  const size = isOwn ? 64 : 52;
  const half = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-${half} -${half} ${size} ${size}" opacity="${opacity}">
    <g transform="rotate(${cog})">
      <polygon points="0,-14 -7,12 0,7 7,12" fill="${color}" stroke="white" stroke-width="${isOwn ? 2 : 1}"/>
      ${isOwn ? `<circle r="4" fill="white" opacity="0.9"/>` : ""}
    </g>
  </svg>`;
}

function projectPoint(lat: number, lon: number, bearingDeg: number, distNm: number): [number, number] {
  const R = 3440.065, d = distNm / R;
  const lat1 = lat * Math.PI / 180, lon1 = lon * Math.PI / 180;
  const b = bearingDeg * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
}

// ── Custom wind particle system using Leaflet overlay pane ────────────────────
// Using overlayPane avoids triggering Leaflet's ResizeObserver on the map container.

interface Particle { lon: number; lat: number; age: number; maxAge: number; }

function startParticles(map: LeafletMap, cells: WindCell[]): () => void {
  // Use Leaflet's overlay pane — designed for custom canvas overlays
  const pane = map.getPanes().overlayPane;

  let canvas = pane.querySelector("canvas.wind-particles") as HTMLCanvasElement | null;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "wind-particles";
    canvas.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;z-index:5;display:block";
    pane.appendChild(canvas);
  } else {
    canvas.style.display = "block";
  }

  const cv = canvas;

  function sizeCanvas() {
    const s = map.getSize();
    cv.width = s.x;
    cv.height = s.y;
  }
  sizeCanvas();
  // Keep canvas sized on map resize/zoom
  map.on("resize", sizeCanvas);
  map.on("zoomend", sizeCanvas);

  function nearestCell(lat: number, lon: number) {
    let best = cells[0], bestD = Infinity;
    for (const c of cells) {
      const d = (c.lat - lat) ** 2 + (c.lon - lon) ** 2;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function windUV(lat: number, lon: number): [number, number] {
    const c = nearestCell(lat, lon);
    const spd = c.speed * 0.514444;
    const dirRad = c.dir * Math.PI / 180;
    const degPerSec = spd / 111320 * 30;
    return [-degPerSec * Math.sin(dirRad), -degPerSec * Math.cos(dirRad)];
  }

  const N = 500;
  const particles: Particle[] = [];

  function reset(p: Particle) {
    const b = map.getBounds();
    p.lon = b.getWest() + Math.random() * (b.getEast() - b.getWest());
    p.lat = b.getSouth() + Math.random() * (b.getNorth() - b.getSouth());
    p.age = Math.floor(Math.random() * 50);
    p.maxAge = 45 + Math.floor(Math.random() * 45);
  }

  for (let i = 0; i < N; i++) {
    const p = { lon: 0, lat: 0, age: 0, maxAge: 80 };
    reset(p);
    particles.push(p);
  }

  let rafId = 0;
  let lastT = 0;
  let running = true;

  function draw(t: number) {
    if (!running) return;
    const dt = Math.min((t - lastT) / 1000, 0.1);
    lastT = t;

    // Resize if needed
    const s = map.getSize();
    if (cv.width !== s.x || cv.height !== s.y) { cv.width = s.x; cv.height = s.y; }

    const ctx = cv.getContext("2d");
    if (!ctx) { rafId = requestAnimationFrame(draw); return; }

    // Fade trails (composite fade without clearing, preserves flow streaks)
    ctx.globalCompositeOperation = "destination-in";
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = "source-over";

    const b = map.getBounds();
    for (const p of particles) {
      const [U, V] = windUV(p.lat, p.lon);
      const newLon = p.lon + U * dt;
      const newLat = p.lat + V * dt;

      const fade = Math.min(1, p.age / 12) * Math.max(0, (p.maxAge - p.age) / p.maxAge);
      // Use latLngToLayerPoint for overlay pane coordinates
      const pt1 = map.latLngToLayerPoint([p.lat, p.lon]);
      const pt2 = map.latLngToLayerPoint([newLat, newLon]);

      ctx.beginPath();
      ctx.globalAlpha = fade * 0.72;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.moveTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.stroke();

      p.lon = newLon; p.lat = newLat; p.age++;

      if (p.age >= p.maxAge || p.lon < b.getWest() || p.lon > b.getEast() ||
          p.lat < b.getSouth() || p.lat > b.getNorth()) {
        reset(p);
      }
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(draw);
  }

  rafId = requestAnimationFrame(draw);

  return () => {
    running = false;
    cancelAnimationFrame(rafId);
    map.off("resize", sizeCanvas);
    map.off("zoomend", sizeCanvas);
    // Hide instead of remove — avoids triggering Leaflet's ResizeObserver
    if (cv) cv.style.display = "none";
  };
}

type WeatherLayer = "wind" | "rain" | "temp";

// ── Component ─────────────────────────────────────────────────────────────────

export default function WindyMap({ boat, targets, routeState, markMetrics, predictWindRoutes, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const mapReadyRef = useRef(false);
  const ramblerMarkerRef = useRef<Marker | null>(null);
  const ramblerTrailRef = useRef<Polyline | null>(null);
  const targetMarkersRef = useRef<Map<string, Marker>>(new Map());
  const targetTrailsRef = useRef<Map<string, Polyline>>(new Map());
  const laylinePortRef = useRef<Polyline | null>(null);
  const laylineStbdRef = useRef<Polyline | null>(null);
  const windRectanglesRef = useRef<Rectangle[]>([]);
  const badgeMarkersRef = useRef<Marker[]>([]);
  const stopParticlesRef = useRef<(() => void) | null>(null);
  const forecastRef = useRef<ForecastHour[]>([]);
  const pwPolylinesRef = useRef<Record<string, Polyline>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pwMarkersRef = useRef<any[]>([]);

  const [forecastIndex, setForecastIndex] = useState(0);
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>("wind");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { forecast } = useWeatherGrid(boat.lat, boat.lon, boat.tws, boat.twd);
  forecastRef.current = forecast;

  const currentForecast: ForecastHour | null = forecast[forecastIndex] ?? null;
  const isLiveForecast = forecastIndex === 0;

  // ── Draw wind gradient ──────────────────────────────────────────────────────
  const drawWindGradient = useCallback((cells: WindCell[]) => {
    const map = mapRef.current;
    if (!map || cells.length === 0) return;
    import("leaflet").then(L => {
      windRectanglesRef.current.forEach(r => r.remove());
      windRectanglesRef.current = [];
      const step = 0.25, half = step / 2;
      cells.forEach(cell => {
        const rect = L.rectangle(
          [[cell.lat - half, cell.lon - half], [cell.lat + half, cell.lon + half]],
          { color: "none", fillColor: speedToColor(cell.speed), fillOpacity: 0.30, interactive: false }
        ).addTo(map);
        windRectanglesRef.current.push(rect);
      });
    });
  }, []);

  const startWindParticles = useCallback((cells: WindCell[]) => {
    const map = mapRef.current;
    if (!map) return;
    stopParticlesRef.current?.();
    stopParticlesRef.current = startParticles(map, cells);
  }, []);

  // ── Initialize map ──────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then(async (L) => {
      if (cancelled || mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((container as any)._leaflet_id) return;

      const map = L.map(container, {
        center: [boat.lat, boat.lon], zoom: 11, zoomControl: true,
        doubleClickZoom: false,  // prevent accidental double-tap zoom
      });
      mapRef.current = map;

      const makeIcon = (svg: string, size: number): DivIcon =>
        L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

      // CARTO Voyager — reliable production tile server, no API key, global coverage
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19
        }
      ).addTo(map);
      // OpenSeaMap nautical overlay — buoys, depth contours, nav aids
      L.tileLayer(
        "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
        {
          attribution: '© <a href="https://www.openseamap.org">OpenSeaMap</a>',
          maxZoom: 18,
          opacity: 0.8
        }
      ).addTo(map);

      const portEnd = projectPoint(boat.lat, boat.lon, (boat.twd + boat.twa + 360) % 360, 3);
      const stbdEnd = projectPoint(boat.lat, boat.lon, (boat.twd - boat.twa + 360) % 360, 3);
      laylinePortRef.current = L.polyline([[boat.lat, boat.lon], portEnd], { color: "#f87171", weight: 2, opacity: 0.8, dashArray: "8 5" }).addTo(map);
      laylineStbdRef.current = L.polyline([[boat.lat, boat.lon], stbdEnd], { color: "#86efac", weight: 2, opacity: 0.8, dashArray: "8 5" }).addTo(map);
      ramblerTrailRef.current = L.polyline([[boat.lat, boat.lon]], { color: "#22c55e", weight: 2, opacity: 0.7, dashArray: "4 4" }).addTo(map);
      ramblerMarkerRef.current = L.marker([boat.lat, boat.lon], {
        icon: makeIcon(boatSvg("#22c55e", boat.cog, true), 64), zIndexOffset: 1000,
      }).addTo(map);

      targets.forEach(t => {
        const color = t.closingRate < -0.05 ? "#22c55e" : t.closingRate > 0.05 ? "#ef4444" : "#facc15";
        const isYB = t.source === "yellowbrick";
        targetTrailsRef.current.set(t.mmsi, L.polyline([[t.lat, t.lon]], { color, weight: 2, opacity: isYB ? 0.35 : 0.6, dashArray: isYB ? "3 8" : "4 4" }).addTo(map));
        targetMarkersRef.current.set(t.mmsi, L.marker([t.lat, t.lon], { icon: makeIcon(boatSvg(color, t.cog, false, isYB ? 0.55 : 1), 52) }).addTo(map));
      });

      mapReadyRef.current = true;

      // Draw initial wind overlay if forecast data already available
      const fc = forecastRef.current;
      if (fc.length > 0) {
        const cells = fc[0].cells;
        const step = 0.25, half = step / 2;
        cells.forEach(cell => {
          const rect = L.rectangle(
            [[cell.lat - half, cell.lon - half], [cell.lat + half, cell.lon + half]],
            { color: "none", fillColor: speedToColor(cell.speed), fillOpacity: 0.30, interactive: false }
          ).addTo(map);
          windRectanglesRef.current.push(rect);
        });
        stopParticlesRef.current = startParticles(map, cells);
      }
    });

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      stopParticlesRef.current?.();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update boat / targets / badges ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then(L => {
      const makeIcon = (svg: string, size: number): DivIcon =>
        L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

      const activeMark = routeState && routeState.activeIndex >= 0 ? routeState.waypoints[routeState.activeIndex] : null;
      if (activeMark && markMetrics) {
        laylinePortRef.current?.setLatLngs([[activeMark.lat, activeMark.lon], projectPoint(activeMark.lat, activeMark.lon, markMetrics.portLaylineBrg, 3)]);
        laylineStbdRef.current?.setLatLngs([[activeMark.lat, activeMark.lon], projectPoint(activeMark.lat, activeMark.lon, markMetrics.stbdLaylineBrg, 3)]);
      } else {
        laylinePortRef.current?.setLatLngs([[boat.lat, boat.lon], projectPoint(boat.lat, boat.lon, (boat.twd + boat.twa + 360) % 360, 3)]);
        laylineStbdRef.current?.setLatLngs([[boat.lat, boat.lon], projectPoint(boat.lat, boat.lon, (boat.twd - boat.twa + 360) % 360, 3)]);
      }
      ramblerMarkerRef.current?.setLatLng([boat.lat, boat.lon]).setIcon(makeIcon(boatSvg("#22c55e", boat.cog, true), 64));
      if (boat.trail) ramblerTrailRef.current?.setLatLngs(boat.trail);

      targets.forEach(t => {
        const color = t.closingRate < -0.05 ? "#22c55e" : t.closingRate > 0.05 ? "#ef4444" : "#facc15";
        const isYB = t.source === "yellowbrick";
        targetMarkersRef.current.get(t.mmsi)?.setLatLng([t.lat, t.lon]).setIcon(makeIcon(boatSvg(color, t.cog, false, isYB ? 0.55 : 1), 52));
        const trail = targetTrailsRef.current.get(t.mmsi);
        if (trail && t.trail) trail.setLatLngs(t.trail).setStyle({ color, opacity: isYB ? 0.35 : 0.6, dashArray: isYB ? "3 8" : "4 4" });
      });

      // Competitor badges — staggered vertically
      badgeMarkersRef.current.forEach(m => m.remove());
      badgeMarkersRef.current = [];
      [...targets].sort((a, b) => a.distance - b.distance).forEach((t, idx) => {
        const color = t.closingRate < -0.05 ? "#22c55e" : t.closingRate > 0.05 ? "#ef4444" : "#facc15";
        const badge = L.marker([t.lat, t.lon], {
          icon: L.divIcon({
            html: `<div style="background:rgba(2,6,23,0.88);border:1px solid ${color};border-radius:7px;padding:4px 10px;white-space:nowrap;font-size:12px;font-family:monospace;color:${color};font-weight:bold;pointer-events:none">${t.name}${t.isHigher ? " ↑" : ""} ${t.closingRate < 0 ? "▼" : "▲"}${Math.abs(t.closingRate).toFixed(2)}</div>`,
            className: "", iconAnchor: [-8, 16 + idx * 30],
          }),
          interactive: false, zIndexOffset: 850,
        }).addTo(map);
        badgeMarkersRef.current.push(badge);
      });
    });
  }, [boat, targets, routeState, markMetrics]);

  // ── Apply forecast ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentForecast || !mapReadyRef.current) return;
    if (activeLayer === "wind") {
      drawWindGradient(currentForecast.cells);
      startWindParticles(currentForecast.cells);
    }
  }, [currentForecast, activeLayer, drawWindGradient, startWindParticles]);

  // First forecast batch arrives
  useEffect(() => {
    if (forecast.length === 0 || !mapReadyRef.current || activeLayer !== "wind") return;
    const fc = forecast[forecastIndex];
    if (!fc) return;
    drawWindGradient(fc.cells);
    startWindParticles(fc.cells);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecast.length]);

  // ── Layer visibility ────────────────────────────────────────────────────────
  useEffect(() => {
    const windVisible = activeLayer === "wind";
    windRectanglesRef.current.forEach(r => r.setStyle({ fillOpacity: windVisible ? 0.30 : 0 }));
    if (!windVisible) {
      stopParticlesRef.current?.();
      stopParticlesRef.current = null;
    } else if (currentForecast && mapReadyRef.current) {
      startWindParticles(currentForecast.cells);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayer]);

  // ── Forecast playback ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) { if (playTimerRef.current) clearInterval(playTimerRef.current); return; }
    playTimerRef.current = setInterval(() => {
      setForecastIndex(prev => {
        if (prev >= forecast.length - 1) { setIsPlaying(false); return prev; }
        return prev + 1;
      });
    }, 700);
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
  }, [isPlaying, forecast.length]);

  // PredictWind Weather Routing Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      // 1. Clear previous PredictWind routes & markers
      Object.values(pwPolylinesRef.current).forEach(line => line.remove());
      pwPolylinesRef.current = {};
      pwMarkersRef.current.forEach(marker => marker.remove());
      pwMarkersRef.current = [];

      if (!predictWindRoutes) return;

      const modelColors: Record<string, string> = {
        PWG: "#f97316",   // Orange
        PWE: "#06b6d4",   // Cyan
        ECMWF: "#d946ef", // Pink
        GFS: "#3b82f6",   // Blue
        SPIRE: "#8b5cf6", // Purple
        UKMO: "#eab308",  // Yellow
      };

      // 2. Draw route line and tack/gybe markers for each model
      Object.entries(predictWindRoutes).forEach(([model, routeData]: [string, any]) => {
        const color = modelColors[model] || "#a1a1aa";
        const points = routeData.points as [number, number][];

        // Draw the track polyline
        const line = L.polyline(points, {
          color,
          weight: 3,
          opacity: 0.85,
        }).addTo(map);
        
        line.bindPopup(`<b>${model} Optimal Route</b><br>Distance: ${routeData.summary.distanceNm} nm<br>Est. Time: ${routeData.summary.timeHrs} hrs<br>Avg Speed: ${routeData.summary.avgSpeed} kts`);
        pwPolylinesRef.current[model] = line;

        // Draw tack & gybe markers
        const tacksGybes = routeData.tacksGybes || [];
        tacksGybes.forEach((event: any) => {
          const iconHtml = `<div style="background:${color};border:2px solid white;width:12px;height:12px;border-radius:999px;box-shadow:0 0 4px rgba(0,0,0,0.5);" title="${model}: ${event.type.toUpperCase()} (TWA ${event.twa}°, ${event.time})"></div>`;
          const marker = L.marker([event.lat, event.lon], {
            icon: L.divIcon({
              html: iconHtml,
              className: "",
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            })
          }).addTo(map);

          marker.bindTooltip(`<b>${model} ${event.type.toUpperCase()}</b><br>TWA: ${event.twa}°<br>Time: ${event.time}`, {
            direction: "top"
          });
          
          pwMarkersRef.current.push(marker);
        });
      });
    });
  }, [predictWindRoutes]);

  // ── Re-center on fleet ──────────────────────────────────────────────────────
  const centerOnFleet = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then(L => {
      const points = [[boat.lat, boat.lon] as [number, number], ...targets.map(t => [t.lat, t.lon] as [number, number])];
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds.pad(0.3), { maxZoom: 12 });
    });
  }, [boat, targets]);

  // ── Display values ──────────────────────────────────────────────────────────
  const midCell = currentForecast?.cells[Math.floor(currentForecast.cells.length / 2)];
  const displayTws = isLiveForecast ? boat.tws.toFixed(1) : (midCell?.speed ?? boat.tws).toFixed(1);
  const displayTwd = isLiveForecast ? Math.round(boat.twd) : Math.round(midCell?.dir ?? boat.twd);

  return (
    <div className="fixed inset-0 z-[9990] flex flex-col bg-slate-950" style={{ touchAction: "manipulation" }}>

      {/* ── Instrument strip ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/95 border-b border-slate-800 shrink-0" style={{ zIndex: 1000 }}>
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label: "BSP", val: boat.bsp.toFixed(1), unit: "kts" },
            { label: "SOG", val: boat.sog.toFixed(1), unit: "kts" },
            { label: "COG", val: `${Math.round(boat.cog)}°`, unit: "" },
            { label: "TWS", val: displayTws, unit: "kts" },
            { label: "TWD", val: `${displayTwd}°`, unit: "" },
            { label: "TWA", val: `${Math.round(boat.twa)}°`, unit: "" },
          ].map(({ label, val, unit }) => (
            <div key={label} className="flex items-baseline gap-1">
              <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
              <span className="text-white font-mono font-bold text-base leading-none">{val}</span>
              {unit && <span className="text-slate-600 text-xs">{unit}</span>}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isLiveForecast && (
            <span className="text-sm font-mono font-bold text-amber-400 animate-pulse px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-900/20">
              ⏲ +{forecastIndex}hr
            </span>
          )}
          {isLiveForecast && (
            <span className="text-sm font-mono font-bold text-green-400 px-2.5 py-1.5 rounded-lg border border-green-500/40">● LIVE</span>
          )}
          <button onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 active:bg-slate-700 transition-colors font-bold text-lg"
            aria-label="Close fullscreen map">✕</button>
        </div>
      </div>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Layer switcher — stopPropagation prevents map interactions leaking through */}
        <div
          className="absolute right-3 top-3 flex flex-col gap-2"
          style={{ zIndex: 1000 }}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={(e) => { e.stopPropagation(); setShowLayers(v => !v); }}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl bg-slate-900/90 border border-slate-600 text-slate-300 hover:text-white active:bg-slate-700 transition-colors text-xl shadow-lg"
            title="Weather layers">🌐</button>
          {showLayers && (
            <div className="bg-slate-900/95 border border-slate-700 rounded-xl p-2 flex flex-col gap-1.5 min-w-[120px] shadow-xl">
              {(["wind", "rain", "temp"] as WeatherLayer[]).map(layer => (
                <button key={layer}
                  onClick={(e) => { e.stopPropagation(); setActiveLayer(layer); setShowLayers(false); }}
                  className={`min-h-[48px] px-3 py-2.5 rounded-lg text-sm font-bold text-left transition-colors ${
                    activeLayer === layer ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}>
                  {layer === "wind" ? "🌪 Wind" : layer === "rain" ? "🌧 Rain" : "🌡 Temp"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Re-center button */}
        <button
          onClick={(e) => { e.stopPropagation(); centerOnFleet(); }}
          className="absolute left-3 bottom-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-900/90 border border-slate-600 text-slate-300 hover:text-white active:bg-slate-700 transition-colors text-sm font-mono shadow-lg"
          style={{ zIndex: 1000 }}
          title="Center on fleet"
        >⊕</button>
      </div>

      {/* ── Forecast timeline ────────────────────────────────────────────── */}
      <div className="bg-slate-950/97 border-t border-slate-800 px-4 py-3 shrink-0" style={{ zIndex: 1000 }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400 font-mono min-w-[140px]">
            {isLiveForecast ? "Now — Live" : currentForecast?.label ?? ""}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setForecastIndex(i => Math.max(0, i - 1))}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-600 text-slate-400 hover:text-white text-base active:bg-slate-700 transition-colors">◀</button>
            <button onClick={() => setIsPlaying(v => !v)}
              className={`min-h-[44px] px-4 rounded-lg border text-sm font-bold transition-colors ${
                isPlaying ? "border-red-500/60 text-red-400 bg-red-900/20" : "border-green-500/60 text-green-400 hover:bg-green-900/20"
              }`}>
              {isPlaying ? "■ Stop" : "▶ Play"}
            </button>
            <button onClick={() => setForecastIndex(i => Math.min(forecast.length - 1, i + 1))}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-600 text-slate-400 hover:text-white text-base active:bg-slate-700 transition-colors">▶</button>
            <button onClick={() => { setForecastIndex(0); setIsPlaying(false); }}
              className="min-h-[44px] px-4 rounded-lg border border-green-500/40 text-green-400 hover:bg-green-900/20 text-sm font-bold transition-colors">Live</button>
          </div>
          <span className="text-sm text-slate-500 font-mono min-w-[60px] text-right">
            {forecast.length > 0 ? `+${forecast.length - 1}hr` : ""}
          </span>
        </div>
        <input type="range" min={0} max={Math.max(0, forecast.length - 1)} value={forecastIndex}
          onChange={e => { setForecastIndex(Number(e.target.value)); setIsPlaying(false); }}
          className="w-full accent-blue-400" style={{ minHeight: "36px" }} />
        <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1 px-0.5 select-none">
          <span>Now</span>
          {[3, 6, 9, 12, 18, 24].filter(h => h < forecast.length).map(h => <span key={h}>+{h}h</span>)}
        </div>
      </div>
    </div>
  );
}
