"use client";
import React, { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, Polyline, DivIcon } from "leaflet";
import { OwnBoat, WindCell } from "../lib/mockData";

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
}

interface Props {
  boat: OwnBoat & { trail?: [number, number][] };
  targets: TargetLive[];
  windGrid: WindCell[];
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

function boatSvg(color: string, label: string, cog: number, isOwn = false): string {
  const size = isOwn ? 70 : 60;
  const half = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-${half} -${half} ${size} ${size}">
    <g transform="rotate(${cog})">
      <polygon points="0,-14 -7,12 0,7 7,12" fill="${color}" stroke="white" stroke-width="${isOwn ? 2 : 1}"/>
      ${isOwn ? `<circle r="4" fill="white" opacity="0.9"/>` : ""}
    </g>
    <text y="${half - 4}" text-anchor="middle" font-size="${isOwn ? 10 : 9}" fill="white" font-family="sans-serif"
      style="text-shadow:0 0 3px #000,0 0 3px #000">${label}</text>
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

function competitorColor(closingRate: number): string {
  if (closingRate < -0.05) return "#22c55e";  // closing = green
  if (closingRate > 0.05) return "#ef4444";   // opening = red
  return "#facc15";                            // steady = yellow
}

export default function RaceMap({ boat, targets, windGrid }: Props) {
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
  const [showLaylines, setShowLaylines] = React.useState(true);

  // Initialize map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((container as any)._leaflet_id) return;

      const map = L.map(container, { center: [boat.lat, boat.lon], zoom: 12, zoomControl: true });
      mapRef.current = map;

      const makeIcon = (svg: string, size: number): DivIcon =>
        L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

      // Esri Ocean Basemap — marine chart with depth contours
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Esri Ocean Basemap", maxZoom: 16 }
      ).addTo(map);

      // Esri Ocean Reference overlay — labels, nav aids, buoys
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}",
        { attribution: "", maxZoom: 16, opacity: 0.9 }
      ).addTo(map);

      // Laylines (port = red dashed, starboard = green dashed)
      const portEnd = projectPoint(boat.lat, boat.lon, (boat.twd + boat.twa + 360) % 360, 3);
      const stbdEnd = projectPoint(boat.lat, boat.lon, (boat.twd - boat.twa + 360) % 360, 3);
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

      // Competitor markers + trails + bearing lines
      targets.forEach((t) => {
        const color = competitorColor(t.closingRate);

        // Bearing line from Rambler to target
        const bl = L.polyline([[boat.lat, boat.lon], [t.lat, t.lon]], {
          color, weight: 1, opacity: 0.4, dashArray: "3 5",
        }).addTo(map);
        bearingLinesRef.current.set(t.mmsi, bl);

        // Trail (renders under marker)
        const trail = L.polyline([[t.lat, t.lon]], {
          color, weight: 2, opacity: 0.6, dashArray: "4 4",
        }).addTo(map);
        targetTrailsRef.current.set(t.mmsi, trail);

        const m = L.marker([t.lat, t.lon], { icon: makeIcon(boatSvg(color, t.name, t.cog), 60) })
          .addTo(map)
          .bindPopup(`<b>${t.name}</b><br>SOG: ${t.sog.toFixed(1)} kts · Dist: ${t.distance.toFixed(2)} nm · Bearing: ${Math.round(t.bearing)}°<br>${t.closingRate < 0 ? "▼ Closing" : "▲ Opening"} ${Math.abs(t.closingRate).toFixed(2)} nm/hr<br>${t.isHigher ? "We higher" : "They higher"} · ${t.isFaster ? "We faster" : "They faster"}`);
        targetMarkersRef.current.set(t.mmsi, m);
      });

      // HRRR wind arrows (static grid, updated separately)
      windGrid.forEach((cell) => {
        const m = L.marker([cell.lat, cell.lon], {
          icon: makeIcon(windArrowSvg(cell.speed, cell.dir), 40),
          interactive: false,
        }).addTo(map);
        windMarkersRef.current.push(m);
      });

      // B&G actual wind arrow
      actualWindMarkerRef.current = L.marker([boat.lat, boat.lon - 0.01], {
        icon: makeIcon(windArrowSvg(boat.tws, boat.twd, true), 40),
        interactive: false,
        zIndexOffset: 500,
      }).addTo(map);
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

      // Update laylines
      const portEnd = projectPoint(boat.lat, boat.lon, (boat.twd + (boat as any).twa + 360) % 360, 3);
      const stbdEnd = projectPoint(boat.lat, boat.lon, (boat.twd - (boat as any).twa + 360) % 360, 3);
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
        const m = targetMarkersRef.current.get(t.mmsi);
        if (m) {
          m.setLatLng([t.lat, t.lon])
            .setIcon(makeIcon(boatSvg(color, t.name, t.cog), 60))
            .setPopupContent(`<b>${t.name}</b><br>SOG: ${t.sog.toFixed(1)} kts · Dist: ${t.distance.toFixed(2)} nm · Bearing: ${Math.round(t.bearing)}°<br>${t.closingRate < 0 ? "▼ Closing" : "▲ Opening"} ${Math.abs(t.closingRate).toFixed(2)} nm/hr<br>${t.isHigher ? "We higher" : "They higher"} · ${t.isFaster ? "We faster" : "They faster"}`);
        }
        const trail = targetTrailsRef.current.get(t.mmsi);
        if (trail && t.trail) {
          trail.setLatLngs(t.trail);
          trail.setStyle({ color });
        }
        const bl = bearingLinesRef.current.get(t.mmsi);
        if (bl) {
          bl.setLatLngs([[boat.lat, boat.lon], [t.lat, t.lon]]);
          bl.setStyle({ color });
        }
      });

      // Update wind arrows
      windMarkersRef.current.forEach((m, i) => {
        if (windGrid[i]) {
          m.setIcon(makeIcon(windArrowSvg(windGrid[i].speed, windGrid[i].dir), 40));
        }
      });

      // Update B&G actual wind
      if (actualWindMarkerRef.current) {
        actualWindMarkerRef.current
          .setLatLng([boat.lat, boat.lon - 0.01])
          .setIcon(makeIcon(windArrowSvg(boat.tws, boat.twd, true), 40));
      }
    });
  }, [boat, targets, windGrid]);

  // Show/hide laylines when toggle changes
  useEffect(() => {
    if (!laylinePortRef.current || !laylineStbdRef.current) return;
    const opacity = showLaylines ? 0.9 : 0;
    laylinePortRef.current.setStyle({ opacity });
    laylineStbdRef.current.setStyle({ opacity });
  }, [showLaylines]);

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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Race Chart</h2>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button onClick={fitFleet}
            className="px-2 py-0.5 rounded border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-colors font-mono">
            ⊕ Fit Fleet
          </button>
          <button
            onClick={() => setShowLaylines(v => !v)}
            className={`px-2 py-0.5 rounded border text-xs font-mono transition-colors ${showLaylines ? "border-white/40 text-white bg-white/10" : "border-gray-600 text-gray-500"}`}
          >
            Laylines {showLaylines ? "ON" : "OFF"}
          </button>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 border-2 border-white inline-block"></span>Rambler</span>
          <span className="flex items-center gap-1 text-green-400">● Closing</span>
          <span className="flex items-center gap-1 text-red-400">● Opening</span>
          <span className="flex items-center gap-1 text-yellow-400">● Steady</span>
        </div>
      </div>
      <div ref={containerRef} className="rounded-lg overflow-hidden" style={{ height: "480px" }} />
    </div>
  );
}
