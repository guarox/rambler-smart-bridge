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

export type TargetSource = "ais" | "yellowbrick" | "simulated";

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
  source?: TargetSource;
}

export const ownBoat: OwnBoat = {
  sog: 8.0,
  cog: 10,         // heading NNE toward Mackinac Island
  twa: 60,          // close reach in W breeze (TWD=274, COG=010 → ~96° actual, stored as reach proxy)
  tws: 15.2,
  twd: 274,
  bsp: 8.0,
  depth: 9.5,
  lat: 41.875,      // Chicago-Mac start — 1nm offshore Monroe Harbor
  lon: -87.535,
};

// J/99 real Expedition polar — from J99.txt
// Format: TWS → { TWA: BSP } pairs from actual polar file
const j99PolarRaw: [number, [number, number][]][] = [
  [6,  [[43.2,4.84],[52,4.84],[60,5.37],[75,5.82],[90,6.08],[110,5.97],[120,5.83],[135,5.23],[150,4.43],[180,3.65]]],
  [8,  [[40.9,5.69],[52,5.69],[60,6.32],[75,6.74],[90,6.95],[110,6.98],[120,6.89],[135,6.44],[150,5.58],[180,4.62]]],
  [10, [[38.8,6.20],[52,6.20],[60,6.84],[75,7.16],[90,7.40],[110,7.49],[120,7.45],[135,7.17],[150,6.51],[180,5.41]]],
  [12, [[37.5,6.43],[52,6.43],[60,7.09],[75,7.41],[90,7.70],[110,7.88],[120,7.92],[135,7.67],[150,7.10],[180,5.91]]],
  [14, [[37.1,6.53],[52,6.53],[60,7.21],[75,7.65],[90,7.90],[110,8.21],[120,8.38],[135,8.17],[150,7.46],[180,6.38]]],
  [16, [[36.9,6.60],[52,6.60],[60,7.28],[75,7.81],[90,8.06],[110,8.60],[120,8.82],[135,8.70],[150,7.81],[180,6.92]]],
  [18, [[37.0,6.63],[52,6.63],[60,7.32],[75,7.91],[90,8.23],[110,8.97],[120,9.31],[135,9.57],[150,8.19],[180,7.29]]],
  [20, [[37.0,6.66],[52,6.66],[60,7.36],[75,8.01],[90,8.41],[110,9.35],[120,9.80],[135,10.45],[150,8.56],[180,7.66]]],
];

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

export function polarTarget(twsKts: number, twaDeg: number): number {
  const twa = Math.max(30, Math.min(180, Math.abs(twaDeg)));
  const tws = Math.max(6, Math.min(20, twsKts));

  // Find bounding TWS rows
  const rows = j99PolarRaw;
  let lo = rows[0], hi = rows[rows.length - 1];
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i][0] <= tws && rows[i + 1][0] >= tws) { lo = rows[i]; hi = rows[i + 1]; break; }
  }
  const twsFrac = lo[0] === hi[0] ? 0 : (tws - lo[0]) / (hi[0] - lo[0]);

  function interpRow(row: [number, [number, number][]]): number {
    const pts = row[1];
    let plo = pts[0], phi = pts[pts.length - 1];
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i][0] <= twa && pts[i + 1][0] >= twa) { plo = pts[i]; phi = pts[i + 1]; break; }
    }
    const twaFrac = plo[0] === phi[0] ? 0 : (twa - plo[0]) / (phi[0] - plo[0]);
    return lerp(plo[1], phi[1], twaFrac);
  }

  return lerp(interpRow(lo), interpRow(hi), twsFrac);
}

// Keep for legacy compatibility (not used by polarTarget anymore)
export const j99Polar = {};

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

export function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(a)) * R;
}

export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export type MarkType = "mark" | "start-port" | "start-stbd";
export type RoundingDir = "port" | "starboard";

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: MarkType;
  roundingDir: RoundingDir;
}

export interface RouteState {
  waypoints: Waypoint[];
  activeIndex: number; // -1 = none active
}

export interface MarkMetrics {
  bearing: number;        // degrees true to active mark
  distance: number;       // nm
  vmgToMark: number;      // kts toward mark
  ttm: number;            // minutes to mark
  portLaylineBrg: number; // bearing FROM active mark for port layline
  stbdLaylineBrg: number; // bearing FROM active mark for stbd layline
}

export interface StartLineMetrics {
  biasEnd: "port" | "starboard" | "even";
  biasDeg: number;      // degrees of bias
  distToLine: number;   // nm from boat to line
  timeToLine: number;   // minutes at current SOG
}

export const defaultRouteState: RouteState = { waypoints: [], activeIndex: -1 };

export interface TargetState extends Target {
  lat: number;
  lon: number;
  trail: [number, number][];
}

export interface TargetAugmented extends TargetState {
  distToMark?: number;
  ttmToMark?: number;
  laylineStatus?: "outside" | "port-inside" | "stbd-inside" | "overstanding";
}

export interface WindCell {
  lat: number;
  lon: number;
  speed: number;
  dir: number; // direction wind is coming FROM (meteorological)
}

export const hrrGrid: WindCell[] = [
  { lat: 41.93, lon: -87.69, speed: 15.8, dir: 270 },
  { lat: 41.93, lon: -87.54, speed: 15.4, dir: 272 },
  { lat: 41.93, lon: -87.39, speed: 14.9, dir: 269 },
  { lat: 41.88, lon: -87.69, speed: 16.1, dir: 276 },
  { lat: 41.88, lon: -87.54, speed: 15.2, dir: 274 }, // nearest to vessel
  { lat: 41.88, lon: -87.39, speed: 14.6, dir: 271 },
  { lat: 41.83, lon: -87.69, speed: 16.4, dir: 278 },
  { lat: 41.83, lon: -87.54, speed: 15.6, dir: 275 },
  { lat: 41.83, lon: -87.39, speed: 14.8, dir: 272 },
];

// Chicago-Mac 2025 PHRF Spinnaker 1 — 14-boat section at the gun
// Start line ~1nm offshore Monroe Harbor (41.875°N, 87.535°W), in Lake Michigan.
// TWD=274° (W breeze). All boats heading NNE toward Mackinac Island (~028° true).
// isHigher = our stored twa (60°) < their effectiveWindAngle
export const targets: Target[] = [
  {
    // Frostfire (J/109) — pinching high, leeward bow: THREAT closing fast
    mmsi: "338100001",
    name: "Frostfire",
    distance: 0.10,
    bearing: 60,
    closingRate: -0.020,
    sog: 8.1,
    cog: 355,
    effectiveWindAngle: 79,
    isHigher: false,
    isFaster: false,
    distanceHistory: [0.30, 0.27, 0.25, 0.22, 0.20, 0.18, 0.16, 0.14, 0.12, 0.10],
  },
  {
    // Meridian (J/109) — just ahead, similar angle: THREAT
    mmsi: "338100002",
    name: "Meridian",
    distance: 0.12,
    bearing: 10,
    closingRate: -0.015,
    sog: 8.2,
    cog: 358,
    effectiveWindAngle: 76,
    isHigher: false,
    isFaster: false,
    distanceHistory: [0.32, 0.29, 0.26, 0.24, 0.22, 0.20, 0.18, 0.16, 0.14, 0.12],
  },
  {
    // Bad Latitude (J/99) — sister ship, slightly below us: MATCH
    mmsi: "338100003",
    name: "Bad Latitude",
    distance: 0.15,
    bearing: 35,
    closingRate: -0.004,
    sog: 7.4,
    cog: 12,
    effectiveWindAngle: 62,
    isHigher: true,
    isFaster: true,
    distanceHistory: [0.20, 0.19, 0.18, 0.18, 0.17, 0.17, 0.16, 0.16, 0.16, 0.15],
  },
  {
    // Hitchhiker (J/109) — dead ahead, footing slightly: WATCH
    mmsi: "338100004",
    name: "Hitchhiker",
    distance: 0.18,
    bearing: 355,
    closingRate: -0.006,
    sog: 8.0,
    cog: 15,
    effectiveWindAngle: 59,
    isHigher: true,
    isFaster: false,
    distanceHistory: [0.26, 0.25, 0.24, 0.23, 0.22, 0.22, 0.21, 0.20, 0.19, 0.18],
  },
  {
    // Motley (J/105) — abeam to starboard, pinching high: THREAT
    mmsi: "338100005",
    name: "Motley",
    distance: 0.22,
    bearing: 80,
    closingRate: -0.010,
    sog: 7.7,
    cog: 350,
    effectiveWindAngle: 84,
    isHigher: false,
    isFaster: false,
    distanceHistory: [0.36, 0.34, 0.32, 0.30, 0.29, 0.28, 0.27, 0.26, 0.24, 0.22],
  },
  {
    // Jubilee (Beneteau 36.7) — leeward bow, footing off: OPENING SLOWLY
    mmsi: "338100006",
    name: "Jubilee",
    distance: 0.25,
    bearing: 55,
    closingRate: 0.004,
    sog: 7.1,
    cog: 22,
    effectiveWindAngle: 52,
    isHigher: true,
    isFaster: true,
    distanceHistory: [0.22, 0.22, 0.23, 0.23, 0.24, 0.24, 0.24, 0.24, 0.25, 0.25],
  },
  {
    // Loup Garou (Beneteau 36.7) — windward, same heading: STEADY
    mmsi: "338100007",
    name: "Loup Garou",
    distance: 0.28,
    bearing: 300,
    closingRate: 0.002,
    sog: 7.0,
    cog: 10,
    effectiveWindAngle: 64,
    isHigher: false,
    isFaster: true,
    distanceHistory: [0.26, 0.26, 0.27, 0.27, 0.27, 0.27, 0.28, 0.28, 0.28, 0.28],
  },
  {
    // Pendragon (J/99) — behind and left, heading same angle: MATCH
    mmsi: "338100008",
    name: "Pendragon",
    distance: 0.35,
    bearing: 330,
    closingRate: -0.005,
    sog: 7.2,
    cog: 8,
    effectiveWindAngle: 66,
    isHigher: false,
    isFaster: true,
    distanceHistory: [0.41, 0.40, 0.39, 0.39, 0.38, 0.38, 0.37, 0.37, 0.36, 0.35],
  },
  {
    // Optimus Prime (J/109) — ahead, footing way off: OPENING
    mmsi: "338100009",
    name: "Optimus Prime",
    distance: 0.38,
    bearing: 5,
    closingRate: 0.005,
    sog: 7.9,
    cog: 28,
    effectiveWindAngle: 46,
    isHigher: true,
    isFaster: false,
    distanceHistory: [0.34, 0.34, 0.35, 0.35, 0.36, 0.36, 0.37, 0.37, 0.38, 0.38],
  },
  {
    // White Knight (J/109) — windward, pinching sharply: CLOSING THREAT
    mmsi: "338100010",
    name: "White Knight",
    distance: 0.42,
    bearing: 310,
    closingRate: -0.022,
    sog: 8.0,
    cog: 348,
    effectiveWindAngle: 86,
    isHigher: false,
    isFaster: false,
    distanceHistory: [0.70, 0.66, 0.62, 0.58, 0.56, 0.53, 0.50, 0.47, 0.44, 0.42],
  },
  {
    // Maverick (J/105) — abeam/starboard, mid-fleet: MATCH
    mmsi: "338100011",
    name: "Maverick",
    distance: 0.45,
    bearing: 85,
    closingRate: -0.003,
    sog: 7.3,
    cog: 5,
    effectiveWindAngle: 69,
    isHigher: false,
    isFaster: true,
    distanceHistory: [0.48, 0.48, 0.47, 0.47, 0.47, 0.46, 0.46, 0.46, 0.45, 0.45],
  },
  {
    // Heartbreaker (Beneteau 40.7) — ahead, footing fast to leeward: OPENING
    mmsi: "338100012",
    name: "Heartbreaker",
    distance: 0.55,
    bearing: 20,
    closingRate: 0.012,
    sog: 7.0,
    cog: 30,
    effectiveWindAngle: 44,
    isHigher: true,
    isFaster: true,
    distanceHistory: [0.42, 0.43, 0.45, 0.46, 0.48, 0.49, 0.51, 0.52, 0.53, 0.55],
  },
  {
    // Moxie (Tartan 3400) — behind, recovering from bad start
    mmsi: "338100013",
    name: "Moxie",
    distance: 0.68,
    bearing: 200,
    closingRate: 0.018,
    sog: 6.5,
    cog: 3,
    effectiveWindAngle: 71,
    isHigher: false,
    isFaster: true,
    distanceHistory: [0.53, 0.55, 0.57, 0.58, 0.60, 0.61, 0.62, 0.64, 0.66, 0.68],
  },
  {
    // Uncle (C&C 115) — well behind, bad start: PULLING AWAY
    mmsi: "338100014",
    name: "Uncle",
    distance: 0.80,
    bearing: 185,
    closingRate: 0.025,
    sog: 6.1,
    cog: 358,
    effectiveWindAngle: 76,
    isHigher: false,
    isFaster: true,
    distanceHistory: [0.55, 0.58, 0.61, 0.63, 0.66, 0.68, 0.71, 0.74, 0.77, 0.80],
  },
];
