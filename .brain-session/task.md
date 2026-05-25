# Tasks — Weather Routing & HRRR Integration

- `[x]` Ingest & Parse NOAA HRRR GRIB2 Data
  - `[x]` Write `download_hrrr.py` script on the Pi (downloads and filters NOMADS wind grids)
  - `[x]` Add lightweight GRIB-to-JSON parsing routine on the Pi
  - `[x]` Create local web server endpoint on the Pi to expose parsed HRRR grid
- `[x]` Implement PredictWind API Integration
  - `[x]` Create Next.js secure API route (`/api/predictwind`) to request routes from PredictWind cloud
  - `[x]` Build `PredictWindSettings.tsx` UI panel for credentials and model selections
  - `[x]` Integrate settings state in `page.tsx`
- `[x]` Add Map Layers & Routing Visualizations
  - `[x]` Draw PredictWind routing tracks on `RaceMap.tsx`
  - `[x]` Add custom HRRR particle/vector wind overlay layer on `RaceMap.tsx`
  - `[x]` Display tack/gybe waypoint details
- `[x]` Verification
  - `[x]` Test local HRRR GRIB download and parsing
  - `[x]` Test PredictWind routing fetching
  - `[x]` Configure production domain `rambler99.vercel.app` on Vercel
  - `[x]` Run full E2E Playwright test suite against production Vercel URL

