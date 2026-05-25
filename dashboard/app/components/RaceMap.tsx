"use client";
import React, { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, Polyline, Circle, DivIcon } from "leaflet";
import { OwnBoat, WindCell, RouteState, MarkMetrics, Waypoint, TargetSource } from "../lib/mockData";

interface TargetLive {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  cog: number;
  sog: number;
  distance: number;
  bearing: number;
  closingRate: number;
  isHigher: boolean;
  isFaster: boolean;
  twa?: number;
  trail?: [number, number][];
  source?: TargetSource;
}

interface Props {
  boat: OwnBoat & { trail?: [number, number][] };
  targets: TargetLive[];
  windGrid: WindCell[];
  routeState?: RouteState;
  markMetrics?: MarkMetrics | null;
  predictWindRoutes?: any;
  onAddWaypoint?: (lat: number, lon: number) => void;
  onExpand?: () => void;
  nightMode?: boolean;
}

function windArrowSvg(speed: number, dir: number, isActual = false): string {
  const color = isActual ? "#60a5fa" : "#fbbf24";
  const len = Math.min(28, 16 + speed * 0.7);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="-20 -20 40 40">
    <g transform="rotate(${dir})">
      <line x1="0" y1="${len/2}" x2="0" y2="-${len/2}" stroke="${color}" stroke-width="2"/>
      <polygon points="0,-${len/2} -4,-${len/2-8} 4,-${len/2-8}" fill="${color}"/>
    </g>
    <text y="18" text-anchor="middle" font-size="8" fill="${color}" font-family="monospace">${speed.toFixed(0)}</text>
  </svg>`;
}

function boatSvg(color: string, label: string, cog: number, isOwn = false, opacity = 1): string {
  const size = isOwn ? 70 : 56;
  const half = size / 2;
  const shortLabel = isOwn ? label : (label.length > 6 ? label.slice(0, 5) + "…" : label);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 14}" viewBox="-${half} -${half} ${size} ${size + 14}" opacity="${opacity}">
    <g transform="rotate(${cog}, 0, 0)">
      <polygon points="0,-14 -7,12 0,7 7,12" fill="${color}" stroke="white" stroke-width="${isOwn ? 2 : 1}"/>
      ${isOwn ? `<circle r="4" fill="white" opacity="0.9"/>` : ""}
    </g>
    <text y="${half + 10}" text-anchor="middle" font-size="${isOwn ? 10 : 8}" fill="white" font-family="sans-serif" font-weight="${isOwn ? "bold" : "normal"}"
      style="text-shadow:0 0 3px #000,0 1px 3px #000">${shortLabel}</text>
  </svg>`;
}

// Project a lat/lon point at bearing+distance (nm)
function projectPoint(lat: number, lon: number, bearingDeg: number, distNm: number): [number, number] {
  const R = 3440.065;
  const d = distNm / R;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const b = (bearingDeg * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(a)) * R;
}

function bearingBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function competitorColor(closingRate: number): string {
  if (closingRate < -0.05) return "#22c55e";  // closing = green
  if (closingRate > 0.05) return "#ef4444";   // opening = red
  return "#facc15";                            // steady = yellow
}

function waypointSvg(w: Waypoint, isActive: boolean): string {
  const color = isActive ? "#60a5fa" : w.type === "start-port" ? "#f87171" : w.type === "start-stbd" ? "#86efac" : "#e2e8f0";
  const symbol = w.type === "mark" ? "✦" : w.type === "start-port" ? "◀" : "▶";
  return `<div style="color:${color};font-size:18px;text-shadow:0 0 4px #000,0 0 4px #000;line-height:1;cursor:pointer">${symbol}</div>`;
}

export default function RaceMap({ boat, targets, windGrid, routeState, markMetrics, predictWindRoutes, onAddWaypoint, onExpand, nightMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const ramblerMarkerRef = useRef<Marker | null>(null);
  const ramblerTrailRef = useRef<Polyline | null>(null);
  const targetMarkersRef = useRef<Map<string, Marker>>(new Map());
  const targetTrailsRef = useRef<Map<string, Polyline>>(new Map());
  const bearingLinesRef = useRef<Map<string, Polyline>>(new Map());
  const laylinePortRef = useRef<Polyline | null>(null);
  const laylineStbdRef = useRef<Polyline | null>(null);
  const windMarkersRef = useRef<Marker[]>([]);
  const actualWindMarkerRef = useRef<Marker | null>(null);
  const pwPolylinesRef = useRef<Record<string, Polyline>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pwMarkersRef = useRef<any[]>([]);
  const [showLaylines, setShowLaylines] = React.useState(true);
  const [showRings, setShowRings] = React.useState(false);
  const [mapMode, setMapMode] = React.useState<"pan" | "addMark" | "ruler">("pan");
  const [rulerHasContent, setRulerHasContent] = React.useState(false);
  const rangeRingsRef = useRef<Circle[]>([]);
  const rulerStartRef = useRef<[number, number] | null>(null);
  const rulerLineRef = useRef<Polyline | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rulerMarkersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const waypointMarkersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseTileRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seamarkTileRef = useRef<any>(null);

  // Initialize map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((container as any)._leaflet_id) return;

      const map = L.map(container, { center: [boat.lat, boat.lon], zoom: 14, zoomControl: true });
      mapRef.current = map;

      const makeIcon = (svg: string, size: number): DivIcon =>
        L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

      // CARTO Voyager — reliable production tile server, no API key, global coverage
      baseTileRef.current = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19
        }
      ).addTo(map);

      // OpenSeaMap nautical overlay — buoys, depth contours, nav aids
      seamarkTileRef.current = L.tileLayer(
        "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
        {
          attribution: '© <a href="https://www.openseamap.org">OpenSeaMap</a>',
          maxZoom: 18,
          opacity: 0.8
        }
      ).addTo(map);

      // Laylines (port = red dashed, starboard = green dashed)
      const portEnd = projectPoint(boat.lat, boat.lon, (boat.twd + boat.twa + 360) % 360, 1.5);
      const stbdEnd = projectPoint(boat.lat, boat.lon, (boat.twd - boat.twa + 360) % 360, 1.5);
      laylinePortRef.current = L.polyline([[boat.lat, boat.lon], portEnd], {
        color: "#f87171", weight: 2.5, opacity: 0.9, dashArray: "8 5",
      }).addTo(map);
      laylineStbdRef.current = L.polyline([[boat.lat, boat.lon], stbdEnd], {
        color: "#86efac", weight: 2.5, opacity: 0.9, dashArray: "8 5",
      }).addTo(map);

      // Rambler trail
      ramblerTrailRef.current = L.polyline([[boat.lat, boat.lon]], {
        color: "#22c55e", weight: 2, opacity: 0.7, dashArray: "4 4",
      }).addTo(map);

      // Rambler — larger, white dot center, thicker stroke
      ramblerMarkerRef.current = L.marker([boat.lat, boat.lon], {
        icon: makeIcon(boatSvg("#22c55e", "Rambler", boat.cog, true), 70),
        zIndexOffset: 1000,
      }).addTo(map).bindPopup(`<b>Rambler USA 99</b><br>SOG: ${boat.sog.toFixed(1)} kts · COG: ${Math.round(boat.cog)}° · TWA: ${Math.round(boat.twa)}°`);

      // Competitor markers + trails (no bearing lines — too cluttered with 14 boats)
      targets.forEach((t) => {
        const color = competitorColor(t.closingRate);
        const isYB = t.source === "yellowbrick";
        const trailOpacity = isYB ? 0.35 : 0.6;
        const dashArray = isYB ? "3 8" : "4 4";
        const markerOpacity = isYB ? 0.55 : 1;

        // Trail (renders under marker)
        const trail = L.polyline([[t.lat, t.lon]], {
          color, weight: 2, opacity: trailOpacity, dashArray,
        }).addTo(map);
        targetTrailsRef.current.set(t.mmsi, trail);

        const m = L.marker([t.lat, t.lon], { icon: makeIcon(boatSvg(color, t.name, t.cog, false, markerOpacity), 60) })
          .addTo(map)
          .bindPopup(`<b>${t.name}${isYB ? " (YB)" : ""}</b><br>SOG: ${t.sog.toFixed(1)} kts · Dist: ${t.distance.toFixed(2)} nm · Bearing: ${Math.round(t.bearing)}°<br>${t.closingRate < 0 ? "▼ Closing" : "▲ Opening"} ${Math.abs(t.closingRate).toFixed(2)} nm/hr<br>${t.isHigher ? "We higher" : "They higher"} · ${t.isFaster ? "We faster" : "They faster"}`);
        targetMarkersRef.current.set(t.mmsi, m);
      });

      // Auto-fit fleet after init
      if (targets.length > 0) {
        const allLatLngs: [number, number][] = [[boat.lat, boat.lon], ...targets.map(t => [t.lat, t.lon] as [number, number])];
        map.fitBounds(L.latLngBounds(allLatLngs).pad(0.25));
      }

      // B&G actual wind arrow
      actualWindMarkerRef.current = L.marker([boat.lat, boat.lon - 0.01], {
        icon: makeIcon(windArrowSvg(boat.tws, boat.twd, true), 40),
        interactive: false,
        zIndexOffset: 500,
      }).addTo(map);

      // Range rings at 0.5, 1, 2 nm — hidden by default
      const RING_NM = [0.5, 1.0, 2.0];
      RING_NM.forEach((nm) => {
        const ring = L.circle([boat.lat, boat.lon], {
          radius: nm * 1852,
          color: "#94a3b8", weight: 1, opacity: 0, fillOpacity: 0, dashArray: "4 4",
          interactive: false,
        }).addTo(map);
        ring.bindTooltip(`${nm} nm`, { permanent: false, direction: "top" });
        rangeRingsRef.current.push(ring);
      });
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when live data changes
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      const makeIcon = (svg: string, size: number): DivIcon =>
        L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

      // Update laylines from boat position (when no mark active, mark-layline effect overrides)
      const portEnd = projectPoint(boat.lat, boat.lon, (boat.twd + (boat as any).twa + 360) % 360, 1.5);
      const stbdEnd = projectPoint(boat.lat, boat.lon, (boat.twd - (boat as any).twa + 360) % 360, 1.5);
      laylinePortRef.current?.setLatLngs([[boat.lat, boat.lon], portEnd]);
      laylineStbdRef.current?.setLatLngs([[boat.lat, boat.lon], stbdEnd]);

      // Update Rambler marker + trail
      if (ramblerMarkerRef.current) {
        ramblerMarkerRef.current
          .setLatLng([boat.lat, boat.lon])
          .setIcon(makeIcon(boatSvg("#22c55e", "Rambler", boat.cog, true), 70))
          .setPopupContent(`<b>Rambler USA 99</b><br>SOG: ${boat.sog.toFixed(1)} kts · COG: ${Math.round(boat.cog)}° · TWA: ${Math.round(boat.twa)}°`);
      }
      if (ramblerTrailRef.current && (boat as any).trail) {
        ramblerTrailRef.current.setLatLngs((boat as any).trail);
      }

      // Update competitors + trails + bearing lines
      targets.forEach((t) => {
        const color = competitorColor(t.closingRate);
        const isYB = t.source === "yellowbrick";
        const trailOpacity = isYB ? 0.35 : 0.6;
        const dashArray = isYB ? "3 8" : "4 4";
        const markerOpacity = isYB ? 0.55 : 1;

        const m = targetMarkersRef.current.get(t.mmsi);
        if (m) {
          m.setLatLng([t.lat, t.lon])
            .setIcon(makeIcon(boatSvg(color, t.name, t.cog, false, markerOpacity), 60))
            .setPopupContent(`<b>${t.name}${isYB ? " (YB)" : ""}</b><br>SOG: ${t.sog.toFixed(1)} kts · Dist: ${t.distance.toFixed(2)} nm · Bearing: ${Math.round(t.bearing)}°<br>${t.closingRate < 0 ? "▼ Closing" : "▲ Opening"} ${Math.abs(t.closingRate).toFixed(2)} nm/hr<br>${t.isHigher ? "We higher" : "They higher"} · ${t.isFaster ? "We faster" : "They faster"}`);
        }
        const trail = targetTrailsRef.current.get(t.mmsi);
        if (trail && t.trail) {
          trail.setLatLngs(t.trail);
          trail.setStyle({ color, opacity: trailOpacity, dashArray });
        }
      });

      // Update B&G actual wind
      if (actualWindMarkerRef.current) {
        actualWindMarkerRef.current
          .setLatLng([boat.lat, boat.lon - 0.01])
          .setIcon(makeIcon(windArrowSvg(boat.tws, boat.twd, true), 40));
      }

      // Update range ring centers
      rangeRingsRef.current.forEach(ring => ring.setLatLng([boat.lat, boat.lon]));
    });
  }, [boat, targets]);

  // Show/hide laylines when toggle changes
  useEffect(() => {
    if (!laylinePortRef.current || !laylineStbdRef.current) return;
    const opacity = showLaylines ? 0.9 : 0;
    laylinePortRef.current.setStyle({ opacity });
    laylineStbdRef.current.setStyle({ opacity });
  }, [showLaylines]);

  // Show/hide range rings
  useEffect(() => {
    rangeRingsRef.current.forEach(ring => ring.setStyle({ opacity: showRings ? 0.7 : 0 }));
  }, [showRings]);

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

  // HRRR Wind Grid Layer (dynamically redraws when grid size/values change)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      // 1. Clear previous wind markers
      windMarkersRef.current.forEach(m => m.remove());
      windMarkersRef.current = [];

      const makeIcon = (svg: string, size: number): DivIcon =>
        L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

      // 2. Draw new wind markers
      windGrid.forEach((cell) => {
        const m = L.marker([cell.lat, cell.lon], {
          icon: makeIcon(windArrowSvg(cell.speed, cell.dir), 40),
          interactive: false,
        }).addTo(map);
        windMarkersRef.current.push(m);
      });
    });
  }, [windGrid]);

  // Swap tile layer when nightMode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      if (!map) return;

      // Remove current base tile layer
      if (baseTileRef.current) {
        map.removeLayer(baseTileRef.current);
      }

      const tileUrl = nightMode
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      baseTileRef.current = L.tileLayer(tileUrl, {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Keep the new base tile behind the seamark overlay
      baseTileRef.current.bringToBack();
    });
  }, [nightMode]);

  // Ruler tool — click-to-measure
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const clearRuler = () => {
      rulerLineRef.current?.remove();
      rulerLineRef.current = null;
      rulerMarkersRef.current.forEach(m => m.remove());
      rulerMarkersRef.current = [];
      rulerStartRef.current = null;
      setRulerHasContent(false);
    };

    if (mapMode !== "ruler") { clearRuler(); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleClick = (e: any) => {
      const { lat, lng } = e.latlng;

      import("leaflet").then((L) => {
        if (!rulerStartRef.current) {
          // First click — green start dot
          rulerStartRef.current = [lat, lng];
          const dot = L.circleMarker([lat, lng], {
            radius: 6, color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.9, weight: 2,
          }).addTo(map);
          dot.bindTooltip("Start", { permanent: true, direction: "top", className: "" });
          rulerMarkersRef.current.push(dot);
          setRulerHasContent(true);
        } else {
          // Second click — remove all previous markers first (fixes orphaned start dot bug)
          const [sLat, sLon] = rulerStartRef.current;
          rulerLineRef.current?.remove();
          rulerLineRef.current = null;
          rulerMarkersRef.current.forEach(m => m.remove());
          rulerMarkersRef.current = [];

          const dist = haversineNm(sLat, sLon, lat, lng);
          const brg = bearingBetween(sLat, sLon, lat, lng);
          const midLat = (sLat + lat) / 2;
          const midLon = (sLon + lng) / 2;

          rulerLineRef.current = L.polyline([[sLat, sLon], [lat, lng]], {
            color: "#e2e8f0", weight: 2, dashArray: "6 4", opacity: 0.9,
          }).addTo(map);

          const endDot = L.circleMarker([lat, lng], {
            radius: 6, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.9, weight: 2,
          }).addTo(map);
          endDot.bindTooltip("End", { permanent: true, direction: "top", className: "" });

          const label = L.marker([midLat, midLon], {
            icon: L.divIcon({
              html: `<div style="background:#0f172a;border:1px solid #94a3b8;border-radius:4px;padding:4px 10px;white-space:nowrap;font-size:12px;font-family:monospace;color:#f1f5f9;font-weight:bold;line-height:1.4">📏 ${dist.toFixed(2)} nm<br>🧭 ${Math.round(brg)}° True</div>`,
              className: "",
              iconAnchor: [-4, 12],
            }),
          }).addTo(map);

          rulerMarkersRef.current = [endDot, label];
          rulerStartRef.current = null;
          setRulerHasContent(true);
        }
      });
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
      clearRuler();
    };
  }, [mapMode]);

  const clearRulerCallback = React.useCallback(() => {
    rulerLineRef.current?.remove();
    rulerLineRef.current = null;
    rulerMarkersRef.current.forEach(m => m.remove());
    rulerMarkersRef.current = [];
    rulerStartRef.current = null;
    setRulerHasContent(false);
  }, []);

  // Add mark mode — click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapMode !== "addMark" || !onAddWaypoint) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleClick = (e: any) => {
      onAddWaypoint(e.latlng.lat, e.latlng.lng);
      setMapMode("pan");
    };

    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [mapMode, onAddWaypoint]);

  // Waypoint markers — rebuild when routeState changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      // Remove all previous waypoint markers
      waypointMarkersRef.current.forEach(m => m.remove());
      waypointMarkersRef.current = [];

      if (!routeState || routeState.waypoints.length === 0) return;

      routeState.waypoints.forEach((w, i) => {
        const isActive = i === routeState.activeIndex;
        const m = L.marker([w.lat, w.lon], {
          icon: L.divIcon({
            html: waypointSvg(w, isActive),
            className: "",
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
          zIndexOffset: 900,
          interactive: false,
        }).addTo(map);
        m.bindTooltip(`${w.name}`, { permanent: false, direction: "top" });
        waypointMarkersRef.current.push(m);
      });
    });
  }, [routeState]);

  // Update laylines to point from active mark when one is set
  useEffect(() => {
    if (!markMetrics || !routeState || routeState.activeIndex < 0) return;
    const mark = routeState.waypoints[routeState.activeIndex];
    if (!mark) return;

    import("leaflet").then((L) => {
      const portEnd = projectPoint(mark.lat, mark.lon, markMetrics.portLaylineBrg, 3);
      const stbdEnd = projectPoint(mark.lat, mark.lon, markMetrics.stbdLaylineBrg, 3);
      laylinePortRef.current?.setLatLngs([[mark.lat, mark.lon], portEnd]);
      laylineStbdRef.current?.setLatLngs([[mark.lat, mark.lon], stbdEnd]);
    });
  }, [markMetrics, routeState]);

  const fitFleet = React.useCallback(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      const allTargets = targetMarkersRef.current;
      const rambler = ramblerMarkerRef.current;
      if (!rambler) return;
      const bounds = L.latLngBounds([rambler.getLatLng()]);
      allTargets.forEach(m => bounds.extend(m.getLatLng()));
      mapRef.current?.fitBounds(bounds.pad(0.3));
    });
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      {/* Header row: title + legend */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Race Chart</h2>
          {onExpand && (
            <button
              onClick={onExpand}
              className="min-h-[36px] px-2.5 py-1.5 rounded border border-blue-500/40 text-blue-400 hover:text-blue-200 hover:border-blue-400 active:bg-blue-900/20 text-xs font-mono font-bold transition-colors"
              title="Full-screen wind map"
            >
              ⤢ Full
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 border-2 border-white inline-block"></span><span className="text-gray-400">Own</span></span>
          <span className="text-green-400">● Close</span>
          <span className="text-red-400">● Open</span>
          <span className="text-yellow-400">● Steady</span>
        </div>
      </div>
      {/* Toolbar: horizontally scrollable on small screens, all buttons 44px tall */}
      <div className="overflow-x-auto pb-1 mb-2">
        <div className="flex items-center gap-2 font-mono min-w-max">
          <button onClick={fitFleet}
            className="min-h-[44px] px-3 py-2 rounded border border-gray-600 text-sm text-gray-400 hover:text-white hover:border-gray-400 active:bg-gray-700 transition-colors whitespace-nowrap">
            ⊕ Fleet
          </button>
          {/* Map mode toggle */}
          <div className="flex rounded border border-gray-600 overflow-hidden text-sm">
            {(["pan", "addMark", "ruler"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setMapMode(m => m === mode ? "pan" : mode)}
                className={`min-h-[44px] px-3 py-2 transition-colors whitespace-nowrap ${mapMode === mode ? "bg-white/15 text-white" : "text-gray-500 hover:text-gray-300 active:bg-white/10"}`}
              >
                {mode === "pan" ? "Pan" : mode === "addMark" ? "✦ Add" : "📏 Ruler"}
              </button>
            ))}
          </div>
          {rulerHasContent && mapMode === "ruler" && (
            <button
              onClick={clearRulerCallback}
              className="min-h-[44px] px-3 py-2 rounded border border-red-600/60 text-red-400 hover:text-red-300 text-sm transition-colors whitespace-nowrap"
            >
              ✕ Clear
            </button>
          )}
          <button
            onClick={() => setShowLaylines(v => !v)}
            className={`min-h-[44px] px-3 py-2 rounded border text-sm transition-colors whitespace-nowrap ${showLaylines ? "border-white/40 text-white bg-white/10" : "border-gray-600 text-gray-500"}`}
          >
            Laylines {showLaylines ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => setShowRings(v => !v)}
            className={`min-h-[44px] px-3 py-2 rounded border text-sm transition-colors whitespace-nowrap ${showRings ? "border-white/40 text-white bg-white/10" : "border-gray-600 text-gray-500"}`}
          >
            ◎ Rings {showRings ? "ON" : "OFF"}
          </button>
        </div>
      </div>
      <div ref={containerRef} className="rounded-lg overflow-hidden" style={{ height: "calc(100dvh - 220px)", minHeight: "420px", cursor: mapMode !== "pan" ? "crosshair" : undefined }} />
    </div>
  );
}
