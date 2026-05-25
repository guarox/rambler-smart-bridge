# Rambler Smart Bridge: Boat Data Streaming Project - Phase 2 Planning
**Date:** May 21, 2026  
**Vessel:** *Rambler* (J/99, USA 99)  
**Project Reference:** Rambler Smart Bridge / Marine Data Hub

---

## 1. Project Overview & Current Status
The hardware foundation for the **Rambler Smart Bridge** has been established utilizing a **Raspberry Pi 4** paired with a **PICAN-M HAT** (NMEA 2000 to N2K & SeaTalkNG / Power Delivery). The core hardware is housed in a marine-grade enclosure and integrated into the boat's primary NMEA 2000 backbone alongside the existing B&G instrument cluster.

The goal of Phase 2 is to shift focus from physical assembly to **Data Pipeline Engineering, Networking Strategy, and Weather Model Integration** to give the crew a tactical, data-driven edge during the 2026 racing season (including the upcoming Spring Opener, NOOD Distance, Chicago Mac, and Bayview Mac).

---

## 2. Phase 2: Data Pipeline & Networking Strategy

A key challenge for *Rambler* is managing power constraints and network topology depending on the racing environment. The networking configuration must dynamically adjust between high-bandwidth offshore delivery modes and low-power closed-circuit day racing.

### 2.1 Dual-Mode Network Configuration
To balance real-time cloud synchronizations via Starlink with power preservation during strict offshore or local day races, the Raspberry Pi 4 will implement an automated, script-driven dual networking topology:

1. **Race Mode (Local Off-Grid WAP):**
   * **Trigger:** Starlink router offline / Power conservation mode active.
   * **Action:** The Raspberry Pi 4 boots as a standalone **Wireless Access Point (WAP)** utilizing `hostapd` and `dnsmasq`. 
   * **Architecture:** Broadcasts a dedicated local SSID (e.g., `Rambler_Net`). Crew tablets, smartphones running tactical software (like Expedition or iRegatta), and onboard displays connect directly to the Pi. 
   * **Data Flow:** Local instrument streams (B&G data, AIS feeds) are multiplexed and broadcast locally without requiring external internet infrastructure.
2. **Delivery / Cloud Mode (Internet Connected):**
   * **Trigger:** Starlink system online / In-port Wi-Fi available.
   * **Action:** The Pi disables its local WAP interface and acts as a standard network client, connecting to the onboard Starlink SSID.
   * **Architecture:** The Pi establishes a secure tunnel or direct HTTPS/MQTT connection to a remote cloud environment.
   * **Data Flow:** High-velocity historical telemetry and buffered log datasets are pushed upstream to a centralized server for post-race analysis and remote tracking.

### 2.2 The Software Stack: Signal K & Time-Series Storage
To reliably process, parse, and store complex NMEA 2000 sentences (PGNs), the software environment will rely on open-source marine telemetry tools:

* **Signal K Server:** Operating as the central data ingestion engine, Signal K will read raw N2K PGN traffic from the PICAN-M interface (via SocketCAN) and convert it into a uniform, readable JSON schema.
* **InfluxDB (Time-Series Database):** For data persistence, InfluxDB will run locally on the Pi. It is optimized for timestamped telemetry, allowing the system to continuously log coordinates, wind velocities, depth, and vessel attitude metrics without bottlenecking the Pi's storage I/O.
* **AIS Intelligence:** The `signalk-ais-charts` plug-in will parse local Class A and Class B Automatic Identification System transponder signals to track and visualize nearby competitive traffic directly on local screens.

```
+-------------------------------------------------------+
|                 NMEA 2000 Backbone                    |
|   (B&G Instruments, Sensors, AIS Transponder, etc.)    |
+-------------------------------------------------------+
                           |
                           v
            +------------------------------+
            |  PICAN-M HAT (SocketCAN)     |
            +------------------------------+
                           |
                           v
            +------------------------------+
            |      Signal K Server         |
            |  (JSON Telemetry Engine)     |
            +------------------------------+
               /                        \
              /                          \
             v                            v
+------------------------+    +-------------------------+
| Local InfluxDB Storage |    | Dynamic Network Router  |
|  (Time-Series Logs)    |    |  (WAP Mode vs. Cloud)   |
+------------------------+    +-------------------------+
                               /                       \
                              v                         v
                     [ Crew Devices ]         [ Cloud Remote Sync ]
                     (Race Mode Local)       (Starlink Active Mode)
```

---

## 3. Phase 3: The Competitive Edge (Weather Model Analysis)

The defining feature of this phase is the integration of local, real-time telemetry with predictive atmospheric data, specifically the **HRRR (High-Resolution Rapid Refresh)** weather model. 

### 3.1 GRIB Model vs. Reality Delta Service
A custom Python microservice will run as a background daemon on the Pi to calculate microclimate variance on the racecourse:

1. **Local Parameter Extraction:** The service polls the local InfluxDB instance (or connects to the Signal K WebSocket) to extract the vessel’s exact GPS coordinates, True Wind Speed (TWS), and True Wind Direction (TWD).
2. **HRRR Model Querying:** Utilizing NOAA’s NOMADS data servers, the service extracts the current HRRR grid point data matching the vessel's temporal and spatial coordinates.
3. **Delta Calculation:** The system computes the mathematical variance between the predictive model and atmospheric reality:
   $$\Delta \text{Wind Speed} = \text{TWS}_{\text{B\&G}} - \text{Wind Speed}_{\text{HRRR}}$$
   $$\Delta \text{Wind Direction} = \text{TWD}_{\text{B\&G}} - \text{Wind Direction}_{\text{HRRR}}$$
4. **Tactical Advantage:** If the HRRR model predicts a dying gradient breeze from the West (e.g., 270° at 10 knots) but B&G instrumentation registers an active thermal breeze from the Northwest (e.g., 310° at 14 knots), the system highlights the anomaly. The tactician can immediately determine if a weather front is stalling or if an exclusive local micro-breeze is active, allowing for superior routing decisions.

### 3.2 Grafana Visualizations
A localized Grafana instance will serve as the primary interface for the navigator:
* **Wind Comparison Metrics:** Real-time overlaid line charts displaying B&G True Wind Metrics directly against the HRRR forecast curves to immediately notice trends and deviations.
* **AIS Tracking Overlays:** A customized geodetic map panel charting the relative positions, Speeds Over Ground (SOG), and Courses Over Ground (COG) of rival vessels in the immediate vicinity.

---

## 4. Tactical Target Intelligence (Feature: Competitor Analysis)

**Requested by:** Ed (tactician)  
**Core question:** *Are we higher and faster than target 1? Are we closing or opening on them?*

### 4.1 Data Sources

All required data is already available on the Signal K instance with no additional hardware:

| Data | Source |
| :--- | :--- |
| Our position, SOG, COG | Garmin GNT10 → N2K → Signal K |
| Our TWA, TWS, TWD | B&G sensors → N2K → Signal K |
| Target position, SOG, COG, MMSI | NAIS-500 → N2K → Signal K |

### 4.2 Computed Metrics (per target)

A Node-RED flow or lightweight Signal K plugin will continuously calculate and publish these as custom Signal K paths under `vessels.<mmsi>.tactical.*`:

| Metric | Calculation | Tactical Meaning |
| :--- | :--- | :--- |
| **Bearing to target** | Haversine bearing from our GPS to theirs | What direction is the boat? |
| **Distance to target** | Haversine distance (meters/nm) | How far away? |
| **Closing rate** | Δdistance / Δtime | Negative = closing, positive = opening |
| **Their wind angle** | Angle between target COG and our TWD | What angle are they sailing? |
| **Higher/lower** | Our TWA < their effective wind angle → we are higher | Are we pointing better? |
| **Faster/slower** | Our SOG vs. their SOG | Are we moving faster through water? |

**"Higher"** means sailing a tighter True Wind Angle — closer to the wind. Since TWD comes from B&G instruments and target COG comes from AIS, the comparison is fully computable without any additional sensors.

### 4.3 Implementation

**Step 1 — Signal K plugin or Node-RED flow:**
- Poll `vessels.self` and all `vessels.<mmsi>` entries every 2–5 seconds
- Run haversine distance/bearing calculations
- Compute `Δdistance` over a rolling 30-second window for closing rate
- Compare TWA (self) vs. `(target.COG - TWD + 360) % 360` normalized to 0–180° for wind angle
- Write results back to Signal K as custom paths

**Step 2 — InfluxDB logging:**
- Persist all tactical metrics with timestamps for post-race analysis
- Enables replay of the race and identification of where gains/losses occurred

**Step 3 — Grafana dashboard panel:**
- Live table: one row per active AIS target within configurable range (e.g. 2nm)
- Columns: Vessel name, Distance, Bearing, Closing Rate, Higher/Lower, Faster/Slower
- Color coding: green = gaining/higher/faster, red = losing/lower/slower
- Trend sparklines for distance over last 5 minutes

### 4.4 Target Identification

AIS targets are identified by MMSI. For racing, crew can maintain a short list of known competitor MMSIs (pulled from race registration or yachtscoring.com) to label targets by boat name rather than MMSI number in the Grafana display.

---

## 5. Immediate Engineering & Checklist

Before deploying the Phase 2 code layers, the following physical and power configurations must be verified:

* [ ] **Physical Bus Termination:** Ensure that the PICAN-M HAT is configured correctly within the NMEA 2000 backbone loop. If positioned at the physical end-of-the-line, the internal 120-ohm termination resistor jumper must be safely engaged.
* [ ] **Isolated Marine Power Supply:** To protect hardware from power drops during engine ignition or heavy battery load, deploy a dedicated, regulated isolated DC-to-DC 12V-to-5V power step-down converter to feed the Pi 4 clean amperage via USB-C or the GPIO power pins.
* [ ] **Storage Health:** Configure InfluxDB data retention policies to automatically prune historical datasets older than 30 days to avoid wearing down the local microSD card, or move the database engine onto an external NVMe SSD base.
