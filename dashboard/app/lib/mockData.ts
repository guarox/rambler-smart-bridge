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
