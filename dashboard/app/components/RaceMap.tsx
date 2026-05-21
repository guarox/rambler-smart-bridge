"use client";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, DivIcon } from "leaflet";
import { OwnBoat, WindCell } from "../lib/mockData";

interface TargetLive {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  cog: number;
  sog: number;
  distance: number;
  closingRate: number;
  isHigher: boolean;
  isFaster: boolean;
  twa?: number;
}

interface Props {
  boat: OwnBoat;
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

function boatSvg(color: string, label: string, cog: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="-30 -30 60 60">
    <g transform="rotate(${cog})">
      <polygon points="0,-12 -6,10 0,6 6,10" fill="${color}" stroke="white" stroke-width="1"/>
    </g>
    <text y="26" text-anchor="middle" font-size="9" fill="white" font-family="sans-serif"
      style="text-shadow:0 0 3px #000,0 0 3px #000">${label}</text>
  </svg>`;
}

export default function RaceMap({ boat, targets, windGrid }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const ramblerMarkerRef = useRef<Marker | null>(null);
  const targetMarkersRef = useRef<Map<string, Marker>>(new Map());
  const windMarkersRef = useRef<Marker[]>([]);
  const actualWindMarkerRef = useRef<Marker | null>(null);

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

      // OpenStreetMap base
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      // OpenSeaMap nautical overlay (depth contours, buoys, nav aids)
      L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
        opacity: 0.85, maxZoom: 18, attribution: "© OpenSeaMap",
      }).addTo(map);

      // Rambler
      ramblerMarkerRef.current = L.marker([boat.lat, boat.lon], {
        icon: makeIcon(boatSvg("#22c55e", "Rambler", boat.cog), 60),
        zIndexOffset: 1000,
      }).addTo(map).bindPopup(`<b>Rambler USA 99</b><br>SOG: ${boat.sog.toFixed(1)} kts · COG: ${Math.round(boat.cog)}° · TWA: ${Math.round(boat.twa)}°`);

      // Competitor markers
      targets.forEach((t) => {
        const color = t.isHigher && t.isFaster ? "#f97316" : t.isHigher || t.isFaster ? "#facc15" : "#94a3b8";
        const m = L.marker([t.lat, t.lon], { icon: makeIcon(boatSvg(color, t.name, t.cog), 60) })
          .addTo(map)
          .bindPopup(`<b>${t.name}</b><br>SOG: ${t.sog.toFixed(1)} kts · Dist: ${t.distance.toFixed(2)} nm<br>${t.closingRate < 0 ? "▼ Closing" : "▲ Opening"} · ${t.isHigher ? "We higher" : "They higher"} · ${t.isFaster ? "We faster" : "They faster"}`);
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

      // Update Rambler
      if (ramblerMarkerRef.current) {
        ramblerMarkerRef.current
          .setLatLng([boat.lat, boat.lon])
          .setIcon(makeIcon(boatSvg("#22c55e", "Rambler", boat.cog), 60))
          .setPopupContent(`<b>Rambler USA 99</b><br>SOG: ${boat.sog.toFixed(1)} kts · COG: ${Math.round(boat.cog)}° · TWA: ${Math.round(boat.twa)}°`);
      }

      // Update competitors
      targets.forEach((t) => {
        const m = targetMarkersRef.current.get(t.mmsi);
        if (m) {
          const color = t.isHigher && t.isFaster ? "#f97316" : t.isHigher || t.isFaster ? "#facc15" : "#94a3b8";
          m.setLatLng([t.lat, t.lon])
            .setIcon(makeIcon(boatSvg(color, t.name, t.cog), 60))
            .setPopupContent(`<b>${t.name}</b><br>SOG: ${t.sog.toFixed(1)} kts · Dist: ${t.distance.toFixed(2)} nm<br>${t.closingRate < 0 ? "▼ Closing" : "▲ Opening"} · ${t.isHigher ? "We higher" : "They higher"} · ${t.isFaster ? "We faster" : "They faster"}`);
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

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Race Chart</h2>
        <div className="flex gap-4 text-xs flex-wrap">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>Rambler</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-orange-500"></span>Higher+Faster</span>
          <span className="flex items-center gap-1 text-yellow-400">▲ HRRR model</span>
          <span className="flex items-center gap-1 text-blue-400">▲ B&G actual</span>
        </div>
      </div>
      <div ref={containerRef} className="rounded-lg overflow-hidden" style={{ height: "480px" }} />
      <p className="text-xs text-gray-600 mt-2">
        OSM + OpenSeaMap · Arrows point downwind · Yellow = HRRR model · Blue = B&G actual · Boats update every 2s · Click for details
      </p>
    </div>
  );
}
