"use client";
import { useEffect, useRef } from "react";
import type { Map, DivIcon } from "leaflet";
import { OwnBoat, Target, WindCell, destPoint } from "../lib/mockData";

interface Props {
  boat: OwnBoat;
  targets: Target[];
  windGrid: WindCell[];
}

function windArrowSvg(speed: number, dir: number, isActual = false): string {
  const color = isActual ? "#60a5fa" : "#fbbf24";
  const len = Math.min(28, 16 + speed * 0.7);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="-20 -20 40 40">
      <g transform="rotate(${dir})">
        <line x1="0" y1="${len / 2}" x2="0" y2="-${len / 2}" stroke="${color}" stroke-width="2"/>
        <polygon points="0,-${len / 2} -4,-${len / 2 - 8} 4,-${len / 2 - 8}" fill="${color}"/>
      </g>
      <text y="18" text-anchor="middle" font-size="8" fill="${color}" font-family="monospace">${speed.toFixed(0)}</text>
    </svg>`;
}

function boatSvg(color: string, label: string, cog: number): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="-30 -30 60 60">
      <g transform="rotate(${cog})">
        <polygon points="0,-12 -6,10 0,6 6,10" fill="${color}" stroke="white" stroke-width="1"/>
      </g>
      <text y="26" text-anchor="middle" font-size="9" fill="white" font-family="sans-serif"
        style="text-shadow:0 0 3px #000,0 0 3px #000">${label}</text>
    </svg>`;
}

export default function RaceMap({ boat, targets, windGrid }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((container as any)._leaflet_id) return;
      // Fix default icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(container, {
        center: [boat.lat, boat.lon],
        zoom: 13,
        zoomControl: true,
      });
      mapRef.current = map;

      // OpenStreetMap base
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      // OpenSeaMap nautical overlay
      L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
        opacity: 0.7,
        maxZoom: 18,
      }).addTo(map);

      const makeIcon = (svg: string, size: number): DivIcon =>
        L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

      // Rambler marker
      L.marker([boat.lat, boat.lon], {
        icon: makeIcon(boatSvg("#22c55e", "Rambler", boat.cog), 60),
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup(`<b>Rambler USA 99</b><br>SOG: ${boat.sog} kts · COG: ${boat.cog}° · TWA: ${boat.twa}°`);

      // Competitor markers
      targets.forEach((t) => {
        const [lat, lon] = destPoint(boat.lat, boat.lon, t.bearing, t.distance);
        const color = t.isHigher && t.isFaster ? "#f97316" : t.isHigher || t.isFaster ? "#facc15" : "#94a3b8";
        L.marker([lat, lon], { icon: makeIcon(boatSvg(color, t.name, t.cog), 60) })
          .addTo(map)
          .bindPopup(
            `<b>${t.name}</b><br>SOG: ${t.sog} kts · COG: ${t.cog}°<br>` +
            `Dist: ${t.distance} nm · ${t.closingRate < 0 ? "▼ Closing" : "▲ Opening"}<br>` +
            `${t.isHigher ? "✓ We are higher" : "✗ They are higher"} · ${t.isFaster ? "✓ We are faster" : "✗ They are faster"}`
          );
      });

      // HRRR wind arrows
      windGrid.forEach((cell) => {
        L.marker([cell.lat, cell.lon], {
          icon: makeIcon(windArrowSvg(cell.speed, cell.dir), 40),
          interactive: false,
        }).addTo(map);
      });

      // B&G actual wind at vessel position
      L.marker([boat.lat, boat.lon - 0.005], {
        icon: makeIcon(windArrowSvg(boat.tws, boat.twd, true), 40),
        interactive: false,
        zIndexOffset: 500,
      })
        .addTo(map)
        .bindTooltip("B&G actual wind", { permanent: false });
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Race Chart</h2>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>Rambler</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-orange-500"></span>Competitor (higher+faster)</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-yellow-400" style={{clipPath:"polygon(50% 0,0 100%,100% 100%)"}}></span>HRRR wind</span>
          <span className="flex items-center gap-1 text-blue-400">▲ B&G actual</span>
        </div>
      </div>
      <div ref={containerRef} className="rounded-lg overflow-hidden" style={{ height: "480px" }} />
      <p className="text-xs text-gray-600 mt-2">
        Arrows point downwind (meteorological). Yellow = HRRR model · Blue = B&G actual · Click boats for details.
      </p>
    </div>
  );
}
