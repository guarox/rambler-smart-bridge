# Rambler Smart Bridge — Boat Day Punch List
**Vessel:** *Rambler* J/99 · USA 99  
**Last updated:** 2026-05-25  
**Status:** Pi provisioned, tested, ready for boat

> Phases 1 & 2 are **✅ COMPLETE**. Start at Phase 3 (on boat).

---

## QUICK REFERENCE

### Network Configurations

#### Option A: Wi-Fi-Only MVP (Recommended Starlink Hub)
*All devices connect to your onboard Starlink router's Wi-Fi network. The Starlink router handles DHCP and network routing. Safe, low-risk, and requires no Ethernet wiring.*
* **WiFi SSID / Password:** *Use your onboard Starlink network credentials*
* **Accessing the Pi:** Connect to Starlink Wi-Fi and use mDNS:
  * **SSH:** `ssh guarox@rambler.local`
  * **Local Dashboard:** `http://rambler.local`
  * **Signal K Admin:** `http://rambler.local:3000`
  * **Dashboard Remote:** `https://rambler99.vercel.app` (Internet required)

#### Option B: Advanced Standalone (Pi WAP - Offline AP)
*The Pi acts as the central router and Access Point (requires hostapd/dnsmasq enabled on Pi). Used for isolated offline telemetry when not using Starlink Wi-Fi.*
* **WiFi SSID / Password:** `Rambler_Net` / `RAMBLER2026`
* **Accessing the Pi:**
  * **SSH:** `ssh guarox@192.168.5.1`
  * **Local Dashboard:** `http://192.168.5.1`
  * **Signal K Admin:** `http://192.168.5.1:3000`

**Pi credentials:** `guarox` / `2wsx#edC`


---

## ARCHITECTURE

```
B&G Instruments → NMEA 2000 Backbone
                → PICAN-M-SMPS HAT (SocketCAN: can0 @ 250kbps)
                → Signal K v2.27.0 (:3000)
                → ws://rambler.local:3000/signalk/v1/stream
                → Dashboard (http://192.168.5.1 or rambler99.vercel.app)
```

**Dashboard states:**
- `◎ SIM` gray — no Signal K URL configured, simulation only
- `◌ SK…` yellow pulsing — Signal K connected, waiting for N2K data
- `● LIVE` green — instruments streaming live

---

## PHASE 1 — FLASH & PROVISION ✅ DONE (2026-05-22)

Pi 4 8GB flashed with Raspberry Pi OS Lite 64-bit (Debian Trixie).

**Provisioned services (all auto-start on boot):**
| Service | Purpose | Port |
|---------|---------|------|
| Signal K v2.27.0 | N2K data engine | :3000 |
| nginx | Dashboard web server | :80 |
| hostapd | Rambler_Net WiFi AP | — |
| dnsmasq | DHCP for AP clients | — |
| SSH | Remote management | :22 |

**Network:**
```
eth0  → 192.168.4.100/24  gw 192.168.4.116   (homelab / dock wired)
wlan0 → 192.168.5.1/24                         (Rambler_Net AP)
```
Note: AP is on `192.168.5.x` (NOT `192.168.4.x`) to avoid subnet conflict with homelab.

**Re-provision if SD card is re-flashed:**
```bash
scp docs/pi_setup.sh guarox@192.168.4.100:~/
ssh guarox@192.168.4.100
sudo apt-get update
sudo bash ~/pi_setup.sh
# Then manually apply post-provision fixes:
sudo nmcli con add type ethernet ifname eth0 con-name rambler-eth0 \
  ipv4.addresses 192.168.4.100/24 ipv4.gateway 192.168.4.116 \
  ipv4.dns '8.8.8.8 1.1.1.1' ipv4.method manual
sudo nmcli con up rambler-eth0
# Fix AP subnet, NAT, and nginx (see docs/post_provision.md)
sudo reboot
```

---

## PHASE 2 — BENCH TEST ✅ DONE (2026-05-22)

- [x] SSH from Mac via `192.168.4.100` ✅
- [x] Signal K API responding at `:3000` ✅
- [x] Dashboard serving at `http://192.168.5.1` ✅
- [x] Tablet connected to `Rambler_Net`, got IP `192.168.5.x` ✅
- [x] Tablet loaded dashboard at `http://192.168.5.1` ✅
- [x] Dashboard shows `◌ SK…` (connected to Pi, no N2K data — correct) ✅
- [x] NAT working — tablet has internet via Pi ✅
- [x] Full power cycle reboot — all services auto-start ✅

---

## PHASE 3 — ON THE BOAT ⛵

### 3.1 Hardware Installation

- [ ] **Power:**
  - 12V bus (+) → 5A fuse → Blue Sea **4153** switch → PICAN-M-SMPS screw terminal (+/−)
  - HAT powers Pi 4 via GPIO (no separate DC-DC converter)
  - ⚠️ Need to order Blue Sea **4153** (latching) — return 4151 (momentary)

- [ ] **PICAN-M to N2K backbone:**
  - Connect N2K drop cable to B&G NSPL-500 hub
  - Run cable to nav station / Pi location
  - Verify termination: measure ~60Ω across backbone Shield/Net+ pins

- [ ] **Physical mounting:** nav station, away from heat and water

### 3.2 Onboard Network Setup

Determine which network setup you are using:

#### To Set Up Option A: Wi-Fi-Only MVP (Starlink Router Hub - Recommended)
1. Boot the Starlink router.
2. Power up the Pi and temporarily connect to it via Homelab ethernet or by connecting to the temporary `Rambler_Net` SSID.
3. Access the terminal via SSH (`ssh guarox@rambler.local` or `ssh guarox@192.168.5.1`).
4. Scan and connect the Pi to the Starlink Wi-Fi network:
   ```bash
   # Scan for networks to verify visibility
   sudo nmcli dev wifi list
   # Connect to Starlink SSID
   sudo nmcli dev wifi connect "YOUR_STARLINK_SSID" password "YOUR_STARLINK_PASSWORD"
   ```
5. Disable the Pi's internal access point services so it acts purely as a client:
   ```bash
   sudo systemctl stop hostapd dnsmasq
   sudo systemctl disable hostapd dnsmasq
   ```
6. Reboot the Pi: `sudo reboot`.
7. Re-connect all crew iPads and phones to the **Starlink Wi-Fi network**.
8. Verify you can access the Pi at `http://rambler.local` and `http://rambler.local:3000` from any device connected to the Starlink Wi-Fi.

#### To Set Up Option B: Advanced Standalone AP (Pi WAP)
*If you are running the Pi as the standalone access point (`Rambler_Net`):*
1. Verify `hostapd` and `dnsmasq` are active:
   ```bash
   sudo systemctl enable hostapd dnsmasq
   sudo systemctl start hostapd dnsmasq
   ```
2. Connect your devices to the `Rambler_Net` SSID (Password: `RAMBLER2026`).

### 3.3 Configure Signal K for N2K ⛵

First time on the boat only:
```bash
ssh guarox@rambler.local
# Or from Rambler_Net: ssh guarox@192.168.5.1
```

Open Signal K admin UI: `http://rambler.local:3000`
- [ ] Create admin account (first run)
- [ ] **Server → Data Connections → Add:**
  - Type: `NMEA 2000 via SocketCAN`
  - Device: `can0`
  - Enable ✅ → Save → Restart Signal K

- [ ] Configure vessel identity:
  - **Server → Vessel Base Data**
  - Name: `Rambler` · MMSI: `338380946`

### 3.4 Verify N2K Data Flowing

```bash
# If using Option A (Starlink), log in via mDNS:
ssh guarox@rambler.local
# If using Option B (Pi WAP), log in via AP gateway:
# ssh guarox@192.168.5.1

# Check raw N2K PGNs (power on B&G instruments first)
candump can0
# Should immediately show hex frames: can0  0CF50237  [8]  FF 02 00 FA ...
# If nothing: check cable, termination, backbone power (12V between Shield and Net+)

# Check Signal K is receiving
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/speedOverGround
# Should return speed value (0.0 at dock is fine)
```

### 3.5 Dashboard Live Test

- [ ] Connect iPad to the boat network:
  - **For Option A (Starlink Hub):** Connect to your Starlink Wi-Fi network.
  - **For Option B (Pi WAP):** Connect to `Rambler_Net` (password: `RAMBLER2026`).
- [ ] Open the local dashboard in Safari:
  - **For Option A:** Open `http://rambler.local`
  - **For Option B:** Open `http://192.168.5.1`
- [ ] Connect the dashboard to Signal K:
  - Tap the red/yellow connection status badge (`◌ SK…` or `◎ SIM`) in the instrument panel header.
  - Enter the Signal K host:
    - **For Option A:** `rambler.local:3000`
    - **For Option B:** `192.168.5.1:3000`
  - Tap **Connect**.
- [ ] Verify `● LIVE` (green) appears in the instrument panel.
- [ ] Walk through all panels, confirm values match B&G chartplotter:
  - [ ] BSP matches Zeus3S
  - [ ] SOG matches Zeus3S
  - [ ] TWS/TWD matches B&G wind display
  - [ ] Depth matches
  - [ ] AIS targets appear in Tactical Table (if boats nearby)

### 3.6 Configure Weather Ingestion & PredictWind Routing ⛵

- [ ] **NOAA HRRR Ingestion Setup:**
  - [ ] Boot the Starlink system (Blue Sea panel switch) to establish internet connectivity.
  - [ ] Access the Pi terminal via SSH: `ssh guarox@rambler.local`
  - [ ] Run the weather downloader script: `python3 /home/guarox/rambler/docs/download_hrrr.py`
  - [ ] Confirm file downloads and parses: `/home/guarox/gribs/hrrr_latest.json` should have a recent timestamp.
  - [ ] In the dashboard, select the **WIND** page to verify the regional HRRR wind vectors show up as overlays on the chart.
  - [ ] Switch off the Starlink satellite connectivity once weather grids are downloaded to conserve power (leaving the router Wi-Fi active for boat communication).

- [ ] **PredictWind Setup:**
  - [ ] While Starlink WAN is connected, tap the header `⬡ PW` button on the dashboard to open the settings panel.
  - [ ] Input your PredictWind Email and Key/Password.
  - [ ] Select desired weather routing models (e.g. `PWG`, `PWE`, `ECMWF`).
  - [ ] Tap **Calculate Route** to compute optimal routing tracks to the active mark based on current N2K coordinates.
  - [ ] Confirm that routes plot on the chart and tack/gybe markers show target wind angles.
  - [ ] Verify that header status indicator turns green `⬤ PW`.

### 3.7 Race Day Checklist

- [ ] Pi powered (Blue Sea 4153 switch ON)
- [ ] iPad connected to the boat network:
  - **For Option A:** Connect to Starlink Wi-Fi network.
  - **For Option B:** Connect to `Rambler_Net`.
- [ ] Load the dashboard in Safari:
  - **For Option A:** Open `http://rambler.local`
  - **For Option B:** Open `http://192.168.5.1`
- [ ] Confirm `● LIVE` green is shown in the instrument panel.
- [ ] B&G instruments confirm GPS fix.
- [ ] Trigger latest HRRR wind grid download via `download_hrrr.py` (via Starlink before leaving dock).
- [ ] Open PredictWind settings panel and trigger an initial route calculation to the first mark.
- [ ] Drop a `Start P` and `Start S` mark at committee boat ends.
- [ ] Set active mark to windward mark.
- [ ] Brief tactician: Sail Chart shows recommended sail, Tactical Table shows fleet, Chart shows optimal PredictWind routes.
- [ ] Tap `▶ Start Race` to begin timeline recording.
- [ ] After race: `■ End Race` → `⬇ Export CSV`.

---

## SIGNAL K PATHS — B&G TO DASHBOARD

| Dashboard | Signal K path | Unit | Conversion |
|-----------|--------------|------|-----------|
| SOG | `navigation.speedOverGround` | m/s | ×1.94384 → kts |
| COG | `navigation.courseOverGroundTrue` | rad | ×57.296 → deg |
| BSP | `navigation.speedThroughWater` | m/s | ×1.94384 → kts |
| TWA | `environment.wind.angleTrueWater` | rad | abs ×57.296 → deg |
| TWS | `environment.wind.speedTrue` | m/s | ×1.94384 → kts |
| TWD | `environment.wind.directionTrue` | rad | ×57.296 → deg |
| Depth | `environment.depth.belowTransducer` | m | direct |
| AIS | `vessels.<mmsi>.navigation.*` | — | same conversions |

---

## BOAT / STARLINK CONFIG CHANGE

When on the boat with Starlink (router at `192.168.100.1`):
```bash
ssh guarox@rambler.local
sudo nmcli con mod rambler-eth0 \
  ipv4.addresses 192.168.100.100/24 \
  ipv4.gateway 192.168.100.1
sudo nmcli con up rambler-eth0
```
To revert for homelab:
```bash
sudo nmcli con mod rambler-eth0 \
  ipv4.addresses 192.168.4.100/24 \
  ipv4.gateway 192.168.4.116
sudo nmcli con up rambler-eth0
```

## NAVIGATION APPS INTEGRATION

To integrate tablets, plotters, and laptops running specialized navigation apps over the Pi's Wi-Fi network (`Rambler_Net`):

### 1. B&G Zeus3S Plotter (WiFi Client Mode)
Connect your primary B&G chartplotter directly to the Pi's network so it can be managed by tablets on deck:
1. On the Zeus3S, go to **Settings > Wireless > Connect to a wireless hotspot**.
2. Select **Rambler_Net** and enter the password **RAMBLER2026**.
3. The Zeus3S will connect as a client and receive an IP address (e.g. `192.168.5.x`) dynamically.

### 2. B&G Link Tablet App (Screen Mirroring)
To mirror and control the Zeus3S screen from your iPad:
1. Connect your iPad to the **Rambler_Net** WiFi SSID.
2. Open the **B&G Link** app (or the main B&G App) on the iPad.
3. The app will automatically scan the local subnet, find the Zeus3S, and prompt you to connect.

### 3. Expedition Nav App (Performance & Weather Routing)
To feed raw NMEA telemetry into Expedition running on a tactician's laptop:
1. Connect the laptop to the **Rambler_Net** WiFi SSID.
2. Open **Expedition**, then go to **Instruments > Setup**.
3. Add a new feed with the following parameters:
   * **Connection Type:** `Network (TCP Client)`
   * **IP Address:** `192.168.5.1` (the Pi's address)
   * **Port:** `10110` (the default port where Signal K broadcasts NMEA 0183 sentences)
4. Expedition will immediately begin parsing all instrument values (BSP, TWS, TWD, GPS) for tactical routing calculations.

### 4. WilhelmSK / KIP (Dashboard Apps)
For dedicated helm dashboards on iPad or Apple Watch:
1. Connect the device to the **Rambler_Net** WiFi SSID.
2. Open the app and set the Signal K server host address to: `192.168.5.1:3000` (or `rambler.local:3000`).
3. Click Connect to establish the WebSocket telemetry stream.

---

## HARDWARE STATUS

| Item | Part | Status |
|------|------|--------|
| Pi 4 8GB | — | ✅ Provisioned |
| PICAN-M-SMPS HAT | PICAN-M-SMPS | ✅ Have it |
| Metal enclosure | PICAN-M-ENCL | ✅ Have it |
| SanDisk 128GB MAX Endurance | — | ✅ Flashed |
| Blue Sea ON-OFF latching switch | **4153** | 🛒 Order (return 4151 momentary) |
| Acridine 25W DC-DC (12V→5V USB-C) | LY16585 | ✅ Spare |
| XTAR-Link EL6 V3 (Starlink 12V) | — | ✅ Have it |
| B&G Zeus3S 9, NAIS-500, NSPL-500, V50, WM-3 | — | ✅ On boat |
| Garmin GNT10 GPS | — | ✅ On boat |

---

## QUICK PRINT CARD

```
┌─────────────────────────────────────────────────────────┐
│  RAMBLER SMART BRIDGE — RACE DAY                        │
│                                                         │
│  1. Power on Pi (Blue Sea 4153 switch)                  │
│  2. Connect iPad to: Rambler_Net                        │
│     Password: RAMBLER2026                               │
│  3. Safari → http://192.168.5.1                         │
│  4. Tap ◌ SK… → 192.168.5.1:3000 → Connect             │
│  5. ● LIVE confirms instruments flowing                 │
│                                                         │
│  mDNS (any network): rambler.local:3000                 │
│  Wired homelab:      192.168.4.100:3000                 │
└─────────────────────────────────────────────────────────┘
```

---

## TROUBLESHOOTING

| Symptom | Check | Fix |
|---------|-------|-----|
| `candump can0` nothing | PICAN-M wiring | Check drop cable, backbone 12V (Shield→Net+) |
| Signal K no data | SocketCAN | `sudo ip link set can0 up type can bitrate 250000` |
| `◌ SK…` not going LIVE | N2K not configured | Add SocketCAN connection in SK admin |
| Dashboard not loading | nginx down | `sudo systemctl restart nginx` |
| No IP on Rambler_Net | hostapd/dnsmasq | `sudo systemctl restart rfkill-unblock-wifi hostapd dnsmasq` |
| wlan0 soft blocked | rfkill | `sudo rfkill unblock wifi && sudo systemctl restart hostapd` |
| AP on wrong subnet | Subnet conflict | wlan0 must be 192.168.5.1 NOT 192.168.4.1 |
| SSH timeout | IP conflict | Use `rambler.local` not static IP |
