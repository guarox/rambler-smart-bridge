export const dynamic = "force-static";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Define locations to search for the HRRR JSON grid file
const SEARCH_PATHS = [
  "/home/guarox/gribs/hrrr_latest.json",
  "/Users/guarox/gribs/hrrr_latest.json",
];

// Fallback grid centered around Chicago / Monroe Harbor
const MonroeLat = 41.875;
const MonroeLon = -87.535;
const fallbackGrid = [
  { lat: 41.93, lon: -87.69, speed: 15.8, dir: 270 },
  { lat: 41.93, lon: -87.54, speed: 15.4, dir: 272 },
  { lat: 41.93, lon: -87.39, speed: 14.9, dir: 269 },
  { lat: 41.88, lon: -87.69, speed: 16.1, dir: 276 },
  { lat: 41.88, lon: -87.54, speed: 15.2, dir: 274 }, // center
  { lat: 41.88, lon: -87.39, speed: 14.6, dir: 271 },
  { lat: 41.83, lon: -87.69, speed: 16.4, dir: 278 },
  { lat: 41.83, lon: -87.54, speed: 15.6, dir: 275 },
  { lat: 41.83, lon: -87.39, speed: 14.8, dir: 272 },
];

export async function GET() {
  // 1. Try to read the parsed JSON file from disk
  for (const filePath of SEARCH_PATHS) {
    try {
      if (fs.existsSync(filePath)) {
        const rawData = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(rawData);
        return NextResponse.json(parsed);
      }
    } catch { /* proceed to next search path */ }
  }

  // 2. If the file is not found (or directory is not accessible/empty), check local docs folder
  try {
    const docPath = path.join(process.cwd(), "../docs/gribs/hrrr_latest.json");
    if (fs.existsSync(docPath)) {
      const rawData = fs.readFileSync(docPath, "utf-8");
      const parsed = JSON.parse(rawData);
      return NextResponse.json(parsed);
    }
  } catch { /* proceed to fallback */ }

  // 3. Fallback: Return a synthetic grid centered near Monroe Harbor
  return NextResponse.json({
    timestamp: Math.round(Date.now() / 1000),
    model: "Fallback Synthetic Grid",
    grid: fallbackGrid,
  });
}
