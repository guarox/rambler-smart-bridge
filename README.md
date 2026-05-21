# Rambler Smart Bridge

**Marine data hub and tactical race dashboard for Rambler (J/99, USA 99)**

A Raspberry Pi 5–based system that bridges the boat's NMEA 2000 instrument network with real-time AIS competitor tracking, HRRR weather model integration, and a live tactical dashboard accessible to the entire crew.

---

## Live Dashboard

**[rambler99.vercel.app](https://rambler99.vercel.app)**

> Currently running simulated live data. On the boat, this connects to Signal K via WebSocket.

---

## Project Overview

### The Problem
Offshore and buoy racing requires real-time tactical decisions: Are we gaining on competitors? Is this wind shift a lift or a header? Is the driver sailing to polar? The B&G Zeus3S chartplotter shows raw instrument data, but interpreting it mid-race while also navigating is cognitively demanding.

### The Solution
The Smart Bridge acts as an intelligent overlay — pulling raw data from the NMEA 2000 backbone, computing tactical metrics the chartplotter can't (VMG, polar%, closing rates, wind shift direction), and presenting them on a dedicated iPad display at the helm.

---

## Hardware

### Core System (Installed)
| Component | Model | Role |
|-----------|-------|------|
| Computer | Raspberry Pi 5 (8GB) | Central data hub, runs all services |
| N2K Interface | PICAN-M HAT | NMEA 2000 → SocketCAN on Pi GPIO |
| Enclosure | EDAL/GeeekPi Metal Armor | Passive cooling, marine environment |
| Storage | SanDisk MAX Endurance 128GB | High write-cycle rated for InfluxDB |
| Power | Blue Sea 12V→5V 5A USB-C Buck | Isolated, engine-noise filtered |

### NMEA 2000 Network (Installed)
| Component | Model | Role |
|-----------|-------|------|
| Chartplotter | B&G Zeus3S 9 (v23.4) | Primary nav display · NMEA2000 + Ethernet |
| AIS Transponder | B&G NAIS-500 (Class B) | TX/RX AIS — puts all targets on N2K bus |
| N2K Hub | B&G NSPL-500 | Backbone splitter — LANLink and PICAN-M drop in here |
| VHF Radio | B&G V50 (MMSI 338380946) | DSC/AIS display |
| GPS Antenna | Garmin GNT10 | Dedicated GPS source on N2K (LEN=1) |
| Weather | B&G/Simrad WM-3 | SiriusXM satellite weather receiver |

### Procurement Status
- ✅ Raspberry Pi 5 (8GB) + PICAN-M HAT + enclosure
- ✅ All NMEA 2000 topology (LANLink, 4-port block, drop cables)
- ✅ XTAR-Link EL6 V3 (12V Starlink converter)
- ✅ 14AWG marine wire harness
- ✅ SanDisk MAX Endurance 128GB
- ✅ CAT6 patch cables
- 🛒 **Ordering:** Generic 12V→5V 5A USB-C buck module (daily) + marine-grade isolated DC-DC converter (spare)
- 🛒 **Ordering:** Blue Sea 4153 WeatherDeck toggle switch SPST ON-OFF (maintained, **not** momentary — part 4151 is wrong)

---

## Software Stack (Pi Deployment)

```
B&G Instruments → NMEA 2000 Backbone
  → PICAN-M HAT (SocketCAN) or Digital Yacht LANLink (UDP)
  → Signal K Server (JSON telemetry engine)
  → InfluxDB (time-series storage, 30-day retention)
  → Grafana (navigator dashboard) + AIS charts plugin
```

| Service | Purpose |
|---------|---------|
| **Signal K** | Reads N2K PGNs via SocketCAN, converts to universal JSON schema |
| **InfluxDB** | Persists all telemetry — wind, position, AIS targets, performance |
| **Grafana** | Real-time visualization for navigator station |
| **Node-RED** | Automation, tactical metric computation, Signal K plugin flows |
| **Python daemon** | HRRR weather model fetcher + delta computation (Phase 3) |

### Dual-Mode Networking
- **Race Mode:** Pi broadcasts `Rambler_Net` WAP via `hostapd` + `dnsmasq`. Crew iPads connect locally. No internet required.
- **Cloud Mode:** Starlink online → Pi switches to client, syncs telemetry upstream via HTTPS/MQTT.

---

## Dashboard (`/dashboard`)

A Next.js 16 app deployed on Vercel. Connects to Signal K WebSocket for live data; runs on simulated data for development.

### Features

#### Instrument Panel
Real-time display of BSP, SOG, COG, TWS, TWD, TWA, Depth — updating every 2 seconds.

#### Start Timer
Race sequence countdown with 5m/4m/3m/1m presets, sync-to-minute button, and visual urgency indicators (pulse red in final minute).

#### Performance Panel
| Metric | Description |
|--------|-------------|
| **VMG** | Velocity Made Good = `BSP × cos(TWA)` — upwind speed to weather |
| **% Polar** | `BSP / target × 100` vs. J/99 polar table. Green ≥95%, yellow ≥85%, red <85% |
| **Wind Shift** | Net TWD change vs. 2 min ago — shows lift (▲) or header (▼) |
| **Tack** | Recommends tack on sustained header (⟳ TACK) or hold (HOLD) |
| **Polar Alarm** | Configurable threshold (default 85%). 🔔 fires audio beep + visual alert after 3 consecutive readings below threshold. ACK button to dismiss. |

#### Race Chart (Leaflet + Esri Ocean Basemap)
- **Boats:** Rambler (green, larger), competitors colored by closing rate (green=closing, red=opening, yellow=steady)
- **Boat trails:** 60-point dashed track (2 minutes of history)
- **Bearing lines:** Dashed lines from Rambler to each competitor
- **Laylines:** Port (red dashed) and starboard (green dashed) tacking angles from `TWD ± TWA`, 3nm extent. Toggle ON/OFF.
- **Range rings:** 0.5, 1.0, 2.0 nm dashed circles centered on Rambler, update as boat moves. Toggle ON/OFF.
- **Ruler tool:** Click two points → green start dot, red end dot, white dashed line, midpoint label showing `📏 X.XX nm · 🧭 XXX° True`. ✕ Clear button appears when active.
- **Fit Fleet:** One-click zoom to show all boats.
- **HRRR wind arrows:** 3×3 grid of model wind vectors (yellow) + B&G actual wind (blue).

#### Tactical Table
Per-competitor: distance (nm), bearing, closing rate, SOG, effective wind angle, higher/lower badge, faster/slower badge, distance trend sparkline. Rows color-coded by closing rate (left border matches map color).

#### Wind Trends (2-minute line graphs)
| Chart | Value | Why not on chartplotter |
|-------|-------|------------------------|
| **Net Wind Shift** | TWD delta from 2min ago | Chartplotter shows raw degrees; this shows lift/header direction |
| **VMG Upwind** | kts toward wind | Chartplotter has no polar table |
| **% Polar** | Performance vs. target | Unique to Smart Bridge; alarm threshold overlaid as red line |

#### HRRR vs B&G Panel
Nearest HRRR model grid point vs. B&G actual wind — speed and direction delta, mini heatmap of 3×3 grid variance.

---

## Development

```bash
cd dashboard
npm install
npm run dev          # http://localhost:3001
npm run build        # production build
npm test             # Playwright e2e tests (8 tests)
npm run test:ui      # Playwright interactive UI
```

### Running Tests
```bash
cd dashboard
npx playwright test --reporter=list
```
Tests cover: page load, instrument panel values, all 4 competitors in tactical table, distances/bearings, higher/faster badges, map render, HRRR panel, zero JS errors.

### Deploy to Vercel
```bash
cd dashboard
npx vercel deploy --prod --scope guaroxs-projects
```

> **Always deploy from `dashboard/`** — deploying from repo root creates a broken static project.

---

## CI/CD

GitHub Actions (`.github/workflows/test.yml`) runs on every push to `main`:
1. Install Node 22 + Playwright Chromium
2. `npm run build`
3. 8 Playwright e2e tests

Test report uploaded as artifact (14-day retention). Tests cover: page load, instrument values, all 4 competitors, distances/bearings, higher/faster badges, map render, HRRR panel, zero JS errors.

---

## Tactical Intelligence — How It Works

### Competitor Tracking
All data comes from the NAIS-500 AIS transponder already on the N2K backbone — no extra sensors needed.

| Metric | Calculation |
|--------|-------------|
| Distance | Haversine formula between Rambler GPS and target GPS |
| Closing rate | Δdistance/time (nm/hr, negative = closing) |
| Their wind angle | `abs(((COG - TWD + 360) % 360) - 180)`, normalized to 0-90° |
| Higher/Lower | Our TWA < their effective angle → we are higher |
| Faster/Slower | Our SOG vs. their SOG |

Results published to custom Signal K paths (`vessels.<mmsi>.tactical.*`), logged to InfluxDB, displayed in real time.

### HRRR Weather Delta (Phase 3)
Python daemon polls InfluxDB/Signal K for vessel position + TWS/TWD, fetches matching HRRR GRIB grid point from NOAA NOMADS:

```
ΔWind Speed = TWS_B&G − WindSpeed_HRRR
ΔWind Direction = TWD_B&G − WindDirection_HRRR
```

Positive Δ speed = reality stronger than model → local thermal or gradient anomaly. Tactically significant for lake racing.

### J/99 Polar Table
```
TWS\TWA   30°    40°    50°    60°    70°    90°   120°   150°   170°
8 kts:    4.8    5.6    6.1    6.4    6.6    6.5    7.2    6.8    5.9
12 kts:   6.1    7.2    7.8    8.0    8.1    8.0    8.8    8.4    7.2
16 kts:   6.8    7.9    8.4    8.6    8.7    8.6    9.2    8.8    7.6
20 kts:   7.2    8.2    8.7    8.9    9.0    8.9    9.4    9.0    7.8
```

---

## Race Calendar (2026)
- Spring Opener
- NOOD Distance
- Chicago-Mackinac (Chicago Mac)
- Bayview-Mackinac (Bayview Mac)

---

## Repository Structure

```
rambler-smart-bridge/
├── README.md
├── CLAUDE.md
├── dashboard/                  # Next.js 16 tactical dashboard
│   ├── app/
│   │   ├── components/
│   │   │   ├── OwnBoatPanel.tsx        # BSP/SOG/COG/TWS/TWD/TWA/Depth
│   │   │   ├── StartTimer.tsx          # Race countdown with presets
│   │   │   ├── PerformancePanel.tsx    # VMG, polar%, wind shift, tack, alarm
│   │   │   ├── RaceMap.tsx             # Leaflet map with all tactical overlays
│   │   │   ├── RaceMapLoader.tsx       # SSR-disabled dynamic wrapper
│   │   │   ├── TacticalTable.tsx       # Competitor analysis table
│   │   │   ├── WindTrendPanel.tsx      # 2-minute trend charts
│   │   │   ├── LineChart.tsx           # Reusable SVG line chart
│   │   │   ├── WindOverlayPanel.tsx    # HRRR vs B&G delta
│   │   │   └── SparkLine.tsx           # Mini trend sparkline
│   │   ├── lib/
│   │   │   ├── mockData.ts             # Seed data, J/99 polar table, geo utils
│   │   │   └── useSimulatedLiveData.ts # Live simulation hook (replaces Signal K in dev)
│   │   └── page.tsx                    # Root layout
│   └── tests/
│       └── dashboard.spec.ts           # 8 Playwright e2e tests
├── .github/workflows/
│   └── test.yml                        # CI: build + Playwright on every push
└── docs/
    ├── rambler_system_architecture.md  # Hardware specs, procurement inventory
    ├── rambler_smart_bridge_phase2.md  # Phase 2/3 engineering plan
    └── *.pdf                           # Reference PDFs (PICAN-M, NMEA 2000, etc.)
```

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| XTAR-Link EL6 V3 over Star-Mount | Pi handles routing; no need for internal Wi-Fi in converter. Saves $400. |
| PICAN-M HAT over Digital Yacht LANLink | Direct SocketCAN is lower latency and more reliable than UDP encapsulation |
| PICAN-M termination | If at N2K backbone end-of-line, engage 120Ω jumper |
| Dedicated 12V→5V regulator | Engine ignition voltage spikes can damage Pi via unregulated N2K power |
| Blue Sea 4153 (not 4151) | 4151 is momentary ON — useless for Starlink power control. 4153 is maintained ON/OFF. |
| InfluxDB 30-day retention | Prevents microSD wear; external NVMe recommended for long campaigns |
| Next.js on Vercel | Instant crew preview/approval of UI without needing the boat wired up |

---

## Vessel

**Rambler** · J/99 · Hull USA 99 · MMSI 338380946  
Owner/Skipper: James Nachtman  
Fleet: PHRF Spinnaker 1
