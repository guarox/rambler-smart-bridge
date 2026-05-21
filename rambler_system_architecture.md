# Rambler (J/99) - System Architecture Blueprint
## Marine Data Hub & 12V Power Management Gateway

This document establishes the hardware specifications, network topology, and deployment architecture for the **Rambler Smart Bridge** project. The core objective is to bridge local NMEA 2000 instrument telemetry (B&G system) with real-time AIS target logging, local database caching, and weather model injection (HRRR GRIBs) via an on-demand, highly power-efficient 12V Starlink gateway.

---

## 1. System Objectives & Architecture

```
                    +-----------------------------+
                    |    B&G Instrument Array     |
                    +--------------+--------------+
                                   | (NMEA 2000 Backbone)
                                   v
                    +--------------+--------------+
                    |   Digital Yacht LANLink     |
                    +--------------+--------------+
                                   | (Wired RJ45 / UDP Raw PGNs)
                                   v
+------------------+  Wired LAN    +--------------+--------------+
| Modified Gen 3   |-------------->| Raspberry Pi 5 Gateway      |
| Starlink (12V)   |               | OS: OpenPlotter / Signal K   |
+------------------+               +--------------+--------------+
  (On-Demand Power)                               |
                                                  | (Persistent Boat Wi-Fi: Rambler_Data)
                                                  v
                                   +--------------+--------------+
                                   |  iPad Pro/Air Helm Display  |
                                   |  (App: WilhelmSK / KIP)     |
                                   +-----------------------------+
```

### The Operational Workflow
1. **The Brain (Raspberry Pi 5):** Runs continuously on a ultra-low draw (~5W) 12V buck regulator. It acts as the local network Master, broadcasting a permanent Wi-Fi access point (`Rambler_Data`).
2. **Telemetry Ingestion:** The Digital Yacht LANLink reads the NMEA 2000 backbone and pushes a continuous, raw binary PGN stream to the Pi via a dedicated wired Ethernet port.
3. **Local Recording:** Signal K converts raw PGNs to universal JSON data. The InfluxDB plugin logs all target AIS strings, target SOG/COG, and local performance data directly to the local storage arrays.
4. **On-Demand Routing & Bridging:** For offshore legs requiring weather routing, a dedicated 12V marine switch boots the Starlink system. The Pi senses upstream WAN internet via the DC PoE injector, routes the internet to the iPad on deck, and updates local HRRR weather data layers. When updates finish, the Starlink is turned off, dropping the boat's draw back to baseline while retaining all local data and instrument displays.

---

## 2. Confirmed B&G Electronics Inventory

| Device | Model | Role | Interface |
| :--- | :--- | :--- | :--- |
| Chartplotter | B&G Zeus3S 9 (v23.4) | Primary nav display, route planning | NMEA2000 + Ethernet |
| AIS Transponder | B&G NAIS-500 | Class B AIS TX/RX — puts all AIS targets on N2K bus | NMEA2000 |
| N2K Backbone Hub | B&G NSPL-500 | Backbone splitter/junction — LANLink and PICAN-M drop in here | NMEA2000 |
| VHF Radio | B&G V50 | DSC/AIS display, MMSI 338380946 | Panel (DSC to N2K) |
| GPS Antenna | Garmin GNT10 | Dedicated GPS position source on N2K bus | NMEA2000 (LEN=1) |
| Weather Receiver | B&G/Simrad WM-3 | SiriusXM satellite weather antenna | Proprietary |

**Integration notes:**
- AIS targets (NAIS-500) are already on the N2K backbone — Signal K picks them up automatically, no separate plugin needed beyond the standard N2K connection.
- Zeus3S Ethernet port enables two-way Signal K integration: Pi can push waypoints/routes back to the plotter, not just read from it.

---

## 3. Core Hardware Specifications

### Master Controller: Raspberry Pi 5
* **Processor & Memory:** Broadcom BCM2712 Quad-core ARM Cortex-A76 @ 2.4GHz, **8GB LPDDR4X-4267 RAM**.
* **Storage Array:** High-End 64GB or 128GB Endurance MicroSD Card (Class 10 / U3 / V30) optimized for dense database read/write cycles.
* **Operating System:** OpenPlotter 4 (64-bit Core) running Linux architecture.
* **Core Services:** Signal K Node Server, InfluxDB time-series engine, Grafana visualization system, Node-RED automation runtime.

### Marine Bus Interface: Digital Yacht LANLink
* **Network Input:** NMEA 2000 micro-connector (isolated M12 drops).
* **Network Output:** RJ45 Ethernet Port (Fast Ethernet 10/100 Base-T).
* **Protocol:** Raw NMEA 2000 PGN encapsulation over UDP/TCP streams.
* **Power Footprint:** Driven completely via N2K network supply (<50mA LEN = 1).

### The Deck Interface: Apple iPad
* **Recommended Hardware:** Apple iPad Air 11-inch or 13-inch (Apple M-series Silicon platform).
* **Display Requirement:** Liquid Retina display featuring anti-reflective treatments, high peak-nit luminance for daylight sunlight viewability.
* **Enclosure Specifications:** IP68 ruggedized completely waterproof case (e.g., Catalyst Waterproof Series) combined with a RAM Mount tough-claw or rail configuration secured at the helm station.
* **Software Interfaces:** **WilhelmSK** (Native Core iOS app interface) or custom web instances built over HTML5 running local **KIP Dashboards**.

---

## 3. Power Infrastructure: 12V DC Starlink Conversion

Operating a standard Starlink terminal via a traditional AC inverter causes an average power loss of 25-35% due to double conversion inefficiencies ($12\text{V DC} \rightarrow 110\text{V AC} \rightarrow 56\text{V DC}$). Bypassing this via a dedicated native 12V DC power architecture optimizes vessel energy balances.

### Commercial Hardware Market Matrix (2026 Context)

| Parameter | XTAR-Link EL6 V3 Kit | Star-Mount Systems 12v Box |
| :--- | :--- | :--- |
| **Market Price** | **~$99.90 - $139.90** | **~$549.00** |
| **Component Layout** | Modular Integration Module Block | Sealed All-In-One Rugged Enclosure |
| **Integrated Wi-Fi Router** | No (Relies on Host/Pi Router) | Yes (Internal Industrial Wi-Fi 6 Module) |
| **Power Delivery** | Integrated 12V-to-56V Step-Up + PoE | Integrated 12V-to-56V Step-Up + PoE |
| **Average Power Draw** | **28W - 42W** (highly dependent on Pi router configuration) | **35W - 55W** |
| **Footprint Index** | Ultra-Compact ($10\text{cm} \times 6\text{cm} 	imes 3\text{cm}$) | Large Panel Footprint |
| **Strategic Fit** | **Optimal for Rambler:** Drops spatial demands and costs by shifting router roles directly onto the RPi 5. | Heavy/Overland configuration. Unneeded cost overhead since Pi handles data. |

---

## 4. Master Technical Procurement Inventory

### Section A: NMEA 2000 Topology Components
* [x] **Digital Yacht LANLink Interface** (Part No: LANLINK-N2K)
* [x] **Ancor/Garmin Marine 4-Port NMEA 2000 Integrated Block** (Consolidates backbone space behind main panel)
* [x] **Ancor NMEA 2000 Drop Cable** (Heavy duty double-shielded, length tailored to panel location)

### Section B: Network Core & Processors
* [x] **Raspberry Pi 5 (8GB Model)**
* [x] **EDAL/GeeekPi Metal Armor Passively Cooled Enclosure** (Protects against marine atmospheric moisture and high interior cabin temperatures; prevents thermal throttling)
* [x] **SanDisk MAX Endurance 128GB MicroSDXC Card**
* [x] **Shielded CAT6 Ethernet Cables** (x2, 0.5-meter short patch lines for physical link stability)
* [ ] **12V→5V 5A 25W USB-C Buck Converter** — ORDERING: Acridine generic (2-pack, daily runner) + marine-grade isolated DC-DC converter (Victron Orion or equivalent, hot spare)

### Section C: Starlink 12V DC Conversion Module
* [x] **XTAR-Link EL6 V3 12V Conversion Interface Module**
* [x] **Marine Grade 14AWG Red/Black Tinned Wire Harness** (Connects house electrical bus bars to the XTAR-Link module)
* [ ] **Panel Toggle Switch** — ORDERING: Blue Sea 4153 WeatherDeck SPST ON-OFF (maintained contact, 20A) — *Note: original spec called for momentary; 4151 is wrong part*
