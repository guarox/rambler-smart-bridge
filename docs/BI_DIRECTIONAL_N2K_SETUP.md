# Rambler Smart Bridge — Bi-directional NMEA 2000 Setup & B&G Integration

This reference document outlines the configuration steps to shift the Raspberry Pi from a **passive listener** (invisible to the network) to an **active transceiver** (visible to the B&G Zeus3S device list). 

Enable this configuration when you want to:
1. Push waypoints or active routes from the Local Dashboard/Signal K back to the Zeus3S chartplotter.
2. Broadcast custom Pi-attached sensor data (e.g., CPU temp, battery voltages, custom load cells) onto the NMEA 2000 bus so it can be displayed on B&G Triton2/Zeus screens.

---

## 1. Passive vs. Active NMEA 2000 Node

*   **Default State (Passive):** The Pi reads SocketCAN `can0` frames without sending any bytes. It does not perform an NMEA 2000 Address Claim. It is completely invisible to the B&G Zeus3S device list. This is the safest state for racing because it prevents any software crash on the Pi from interfering with critical boat navigation systems.
*   **Active State (Transceiver):** The Pi claims a unique Source Address on the bus (dynamic, usually starts at `127` or `23` depending on the device class). It broadcasts dynamic Product Information PGNs. It is visible in the Zeus3S device list under the name **"Signal K"** or **"canboatjs"**.

---

## 2. Enabling Active Address Claiming in Signal K

To make the Pi visible on the NMEA 2000 network:

1.  Open the Signal K Admin UI (`http://192.168.5.1:3000`).
2.  Navigate to **Server > Data Connections**.
3.  Edit your active `can0` connection:
    *   Change the **Direction** (or **Access Type**) from `Input` to `Input & Output` (or check the `Enable Output / Write` box).
    *   Set the **Source Address** (under advanced CAN settings) if prompted. The default value `127` is standard.
4.  Click **Save** and restart the Signal K server.
5.  **Verify:**
    *   Once restarted, Signal K will transmit an address claim (PGN `60928`).
    *   Open your B&G Zeus3S, go to **Settings > Network > Device List**.
    *   You should now see `Signal K` or `canboatjs` listed under Manufacturer: **Unknown (ID 2046)** or **Signal K**.

---

## 3. Sharing Custom Telemetry with B&G Displays
If you want to broadcast data from Signal K back to the physical instrument screens (like Zeus plotters or Triton2 display panels):

1.  In the Signal K App Store (under **Appstore > Available**), install the **`signalk-to-nmea2000`** plugin.
2.  Go to **Server > Plugin Config > Signal K to NMEA 2000**.
3.  Configure the mappings. You can select which paths (like custom battery charge %, water temp, or telemetry status) should be translated back into N2K PGNs:
    *   `navigation.speedOverGround` &rarr; PGN `129026` (COG & SOG Rapid Update)
    *   `environment.wind.angleTrueWater` &rarr; PGN `130306` (Wind Data)
4.  Activate the plugin and check the B&G screen sources list to verify that the B&G display sees the Pi as a valid data source for those measurements.

---

## 4. Zeus3S Route & Waypoint Synchronization

Because the Zeus3S is connected to the cabin network (via the Ethernet ports on the back or over the N2K bus), you can synchronize tactical waypoints:

1.  Ensure that the Zeus3S network settings permit **external waypoint modification**.
2.  Enable the **`signalk-gpx-service`** or standard NMEA 0183/2000 bridging services inside Signal K.
3.  When active, creating waypoints on your iPad dashboard app will send waypoint sentence PGNs (`129283` Cross Track Error, `129284` Navigation Data, and `129285` Route/Waypoint Active Information) back to the Zeus plotter, allowing the crew on deck to update the plotter remotely.

---

## 5. Security & Safety Warning

> [!CAUTION]
> **NMEA 2000 Bus Safety:**
> Enabling write access to the CAN bus introduces the risk of packet collisions or bus floods if a script loops out of control. 
> *   Ensure the Pi's CAN controller bitrate is locked precisely at `250000`.
> *   Keep the `RestartSec=100ms` directive in `/etc/systemd/network/80-can.network` active so that the kernel automatically shuts down the interface if it detects a high error rate (bus-off state).
