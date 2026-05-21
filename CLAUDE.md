# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Rambler Smart Bridge** is a marine data integration system for the J/99 sailboat *Rambler* (USA 99). This repository is a documentation and planning hub — the "code" produced here will be deployed onto a Raspberry Pi 5 running **OpenPlotter 4** aboard the vessel.

Primary hardware: Raspberry Pi 5 (8GB) + PICAN-M HAT (NMEA 2000 via SocketCAN) + Digital Yacht LANLink (N2K → Ethernet UDP) + XTAR-Link EL6 V3 (12V Starlink converter).

## Architecture

### Data Flow
```
B&G Instruments → NMEA 2000 Backbone
  → PICAN-M HAT (SocketCAN) or Digital Yacht LANLink (UDP)
  → Signal K Server (JSON telemetry engine)
  → InfluxDB (time-series storage)
  → Grafana (navigator dashboard) + AIS charts plugin
```

### Dual-Mode Networking
- **Race Mode:** Pi acts as WAP (`Rambler_Net`) via `hostapd` + `dnsmasq`. No internet required. Crew devices connect locally.
- **Cloud Mode:** Starlink comes online; Pi switches to client mode, syncs telemetry to cloud via HTTPS/MQTT.

### Phase 3: HRRR Weather Delta Service
A Python daemon polls InfluxDB/Signal K WebSocket for vessel GPS + TWS/TWD, fetches matching HRRR GRIB grid points from NOAA NOMADS, and computes:
- `ΔWind Speed = TWS_B&G − WindSpeed_HRRR`
- `ΔWind Direction = TWD_B&G − WindDirection_HRRR`

Results surface in Grafana as overlaid line charts to give tacticians real-time anomaly detection against the forecast model.

## Deployment Target

All scripts and services run on the Pi at `/home/pi/` or `/opt/rambler/`. The OS is **OpenPlotter 4 (64-bit, Debian-based Linux)**. Services run as `systemd` units. InfluxDB retention policy: 30 days (prune older data to protect microSD).

## Key Decisions Already Made

- **XTAR-Link EL6 V3** chosen over Star-Mount (Pi handles routing; no need for internal Wi-Fi module in converter).
- **PICAN-M HAT** is the primary N2K interface (SocketCAN); Digital Yacht LANLink is the fallback/secondary.
- **PICAN-M termination:** If positioned at end-of-line on N2K backbone, the 120-ohm jumper must be engaged.
- Power rail: Blue Sea Systems 12V→5V 5A DC buck regulator (clean USB-C to Pi, isolated from engine ignition noise).
- Storage: SanDisk MAX Endurance 128GB; consider external NVMe SSD for InfluxDB if SD wear becomes an issue.

## Confirmed B&G Electronics Inventory

| Device | Model | Interface |
| :--- | :--- | :--- |
| Chartplotter | B&G Zeus3S 9 (v23.4) | NMEA2000 + Ethernet |
| AIS Transponder | B&G NAIS-500 (Class B) | NMEA2000 |
| N2K Backbone Hub | B&G NSPL-500 | NMEA2000 |
| VHF Radio | B&G V50 (MMSI 338380946) | DSC to N2K |
| GPS Antenna | Garmin GNT10 | NMEA2000 (LEN=1) |
| Weather Receiver | B&G/Simrad WM-3 | SiriusXM proprietary |

- AIS targets land on N2K automatically via NAIS-500 — Signal K reads them without a separate plugin.
- Zeus3S Ethernet port allows two-way Signal K integration (Pi can push waypoints/routes back to plotter).

## Tactical Target Intelligence Feature

Requested by Ed (tactician). Core question: *Are we higher and faster than target 1? Are we closing or opening?*

All data is available on Signal K with no additional hardware — own boat from B&G/GNT10, targets from NAIS-500.

**Computed per target** (Node-RED flow or Signal K plugin, every 2–5s):
- Bearing + distance to target (haversine)
- Closing rate (Δdistance over rolling 30s window — negative = closing)
- Their effective wind angle: `(target.COG - TWD + 360) % 360` normalized to 0–180°
- Higher/lower: our TWA < their wind angle → we are higher
- Faster/slower: our SOG vs. their SOG

Results written to `vessels.<mmsi>.tactical.*` in Signal K, logged to InfluxDB, displayed in Grafana as a live color-coded table (one row per target within 2nm). Targets labeled by boat name via a crew-maintained MMSI → name map from race registration.

## Reference Documents

- `rambler_system_architecture.md` — Hardware specs, power infrastructure, procurement checklist
- `rambler_smart_bridge_phase2.md` — Phase 2/3 engineering plan (data pipeline, networking, weather model)
- PDFs in repo root — Datasheets for PICAN-M, XTAR-Link, NMEA 2000 standards, OpenPlotter setup guides
