# Implementation Plan — Weather Routing, PredictWind API, & HRRR GRIB Integration

We will build a high-fidelity weather routing and forecast ingestion engine into the **Rambler Smart Bridge**. This integration consists of:
1.  **PredictWind API Integration:** Cloud-based weather routing using the user's paid PredictWind account.
2.  **NOAA HRRR GRIB Ingestion:** A script on the Pi to fetch hourly 3-km HRRR wind grids for the Great Lakes and parse them locally.
3.  **UI & Map Overlays:** A settings panel to manage credentials, and map layers to display wind fields and calculated routes.

---

## Proposed Changes

### 1. Pi Core & Shell Scripts (Backend)

#### [NEW] [download_hrrr.py](file:///Users/guarox/claude/rambler/docs/download_hrrr.py)
*   A Python script running on the Pi that executes when Starlink WAN is detected.
*   Queries NOAA NOMADS using a GRIB filter. Restricts parameters to `UGRD` and `VGRD` (U/V wind vectors) at 10m above ground level, bounded precisely to the Great Lakes (Lake Michigan / Huron: Lat 41N to 46.5N, Lon 84W to 88.5W).
*   Filters file down to ~300KB (highly optimized for fast download over Starlink).
*   Saves GRIB2 to `/home/guarox/gribs/hrrr_latest.grib2` and parses it into a lightweight JSON grid.

---

### 2. Next.js Dashboard components (Frontend)

#### [NEW] [PredictWindSettings.tsx](file:///Users/guarox/claude/rambler/dashboard/app/components/PredictWindSettings.tsx)
*   A configuration panel in the Settings sidebar.
*   Allows the user to enter their PredictWind Email and Password/Token.
*   Enables selection of weather routing models: `PWG`, `PWE`, `ECMWF`, `GFS`, `SPIRE`, `UKMO`.
*   Includes buttons to manual-trigger a route calculation from the current position.

#### [NEW] [predictwind.ts](file:///Users/guarox/claude/rambler/dashboard/app/api/predictwind/route.ts)
*   Next.js API route that acts as a secure server-side bridge.
*   Authenticates with the PredictWind SOAP/REST API using the user's credentials.
*   Constructs a routing request payload containing:
    *   Start lat/lon (fetched dynamically from Signal K's `navigation.position`).
    *   End waypoint lat/lon.
    *   J/99 Polar curve parameters.
*   Sends the request, receives the calculated route arrays, and returns them as a GPX/JSON track to the frontend.

#### [MODIFY] [RaceMap.tsx](file:///Users/guarox/claude/rambler/dashboard/app/components/RaceMap.tsx)
*   Add a layer to draw the PredictWind calculated routes (color-coded by weather model).
*   Add a custom **HRRR Wind Overlay** layer that renders the local NOAA wind grid as animated wind particles or vectors, running 100% offline once downloaded.
*   Plot markers where the router schedules tacks or gybes, showing target wind angles.

#### [MODIFY] [page.tsx](file:///Users/guarox/claude/rambler/dashboard/app/page.tsx)
*   Add state management for PredictWind settings and routes.
*   Mount the PredictWind settings panel.

---

## Verification Plan

### Automated/Simulation Tests
*   Mock the PredictWind API response in a new Playwright test spec `predictwind.spec.ts` to verify that route tracks render correctly on the map when credentials are configured.
*   Verify that GRIB coordinates are correctly converted to Leaflet map vectors.

### Manual Verification
1.  **HRRR Downloader Test:** Run `python3 download_hrrr.py` on the Pi and confirm that the GRIB file downloads, parses, and outputs a valid JSON file.
2.  **PredictWind API Test:** Trigger a cloud route in the dashboard UI and confirm that the GPX track renders on the map.
