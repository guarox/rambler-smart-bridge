export interface OwnBoat {
  sog: number;        // knots
  cog: number;        // degrees true
  twa: number;        // degrees
  tws: number;        // knots
  twd: number;        // degrees true
  bsp: number;        // boat speed knots
  depth: number;      // meters
  lat: number;
  lon: number;
}

export interface Target {
  mmsi: string;
  name: string;
  distance: number;       // nm
  bearing: number;        // degrees true
  closingRate: number;    // nm/min, negative = closing
  sog: number;            // knots
  cog: number;            // degrees
  effectiveWindAngle: number; // degrees
  isHigher: boolean;
  isFaster: boolean;
  distanceHistory: number[]; // last 10 readings (nm)
}

export const ownBoat: OwnBoat = {
  sog: 7.2,
  cog: 312,
  twa: 38,
  tws: 14.5,
  twd: 274,
  bsp: 7.4,
  depth: 18.3,
  lat: 42.3601,
  lon: -87.6298,
};

// Compute lat/lon from a reference point, bearing (deg true), and distance (nm)
export function destPoint(lat: number, lon: number, bearingDeg: number, distNm: number): [number, number] {
  const R = 3440.065;
  const d = distNm / R;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const b = (bearingDeg * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

export interface WindCell {
  lat: number;
  lon: number;
  speed: number;
  dir: number; // direction wind is coming FROM (meteorological)
}

export const hrrGrid: WindCell[] = [
  { lat: 42.38, lon: -87.65, speed: 15.2, dir: 272 },
  { lat: 42.38, lon: -87.62, speed: 14.8, dir: 270 },
  { lat: 42.38, lon: -87.59, speed: 14.1, dir: 268 },
  { lat: 42.36, lon: -87.65, speed: 15.5, dir: 275 },
  { lat: 42.36, lon: -87.62, speed: 14.5, dir: 274 },
  { lat: 42.36, lon: -87.59, speed: 13.8, dir: 271 },
  { lat: 42.34, lon: -87.65, speed: 16.0, dir: 278 },
  { lat: 42.34, lon: -87.62, speed: 15.1, dir: 276 },
  { lat: 42.34, lon: -87.59, speed: 14.3, dir: 273 },
];

export const targets: Target[] = [
  {
    mmsi: "338123456",
    name: "Ohana",
    distance: 0.42,
    bearing: 318,
    closingRate: -0.008,
    sog: 6.8,
    cog: 308,
    effectiveWindAngle: 46,
    isHigher: true,
    isFaster: true,
    distanceHistory: [0.61, 0.58, 0.55, 0.52, 0.50, 0.48, 0.46, 0.44, 0.43, 0.42],
  },
  {
    mmsi: "338654321",
    name: "Paradigm Shift",
    distance: 0.78,
    bearing: 295,
    closingRate: 0.003,
    sog: 7.5,
    cog: 319,
    effectiveWindAngle: 33,
    isHigher: false,
    isFaster: false,
    distanceHistory: [0.71, 0.72, 0.73, 0.74, 0.75, 0.75, 0.76, 0.77, 0.78, 0.78],
  },
  {
    mmsi: "338789012",
    name: "Success",
    distance: 1.14,
    bearing: 340,
    closingRate: -0.014,
    sog: 6.5,
    cog: 305,
    effectiveWindAngle: 51,
    isHigher: true,
    isFaster: true,
    distanceHistory: [1.28, 1.25, 1.23, 1.21, 1.20, 1.18, 1.17, 1.16, 1.15, 1.14],
  },
  {
    mmsi: "338345678",
    name: "MASKWA",
    distance: 1.56,
    bearing: 271,
    closingRate: 0.011,
    sog: 7.8,
    cog: 325,
    effectiveWindAngle: 31,
    isHigher: false,
    isFaster: false,
    distanceHistory: [1.45, 1.47, 1.48, 1.49, 1.50, 1.51, 1.52, 1.53, 1.55, 1.56],
  },
];
