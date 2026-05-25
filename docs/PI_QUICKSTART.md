# Rambler Pi 4 — Quickstart

## Step 1 — Flash the SD card

1. Download **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Select OS: **Raspberry Pi OS Lite (64-bit)** — or OpenPlotter 4 image
3. Click ⚙️ (gear icon) → **Advanced options**:

| Setting | Value |
|---------|-------|
| Hostname | `rambler` |
| Enable SSH | ✅ Password authentication |
| Username | `guarox` |
| Password | `2wsx#edC` |
| WiFi SSID | *(your home WiFi)* |
| WiFi Password | *(your home WiFi password)* |
| WiFi Country | `US` |

4. Flash to SanDisk 128GB card

---

## Step 2 — First boot & connect

1. Insert card, connect Pi to router via **ethernet cable**
2. Power on (via PICAN-M-SMPS HAT screw terminal, once Blue Sea 4153 switch arrives — or USB-C for now)
3. Wait ~90 seconds for first boot
4. SSH in:
```bash
ssh guarox@rambler.local
# password: 2wsx#edC
```

If `rambler.local` doesn't resolve yet, find the IP from your router's DHCP list, or:
```bash
ping rambler.local   # macOS/Linux
```

---

## Step 3 — Run the provisioning script

```bash
# On your Mac — copy the script to the Pi
scp /Users/guarox/claude/rambler/docs/pi_setup.sh guarox@rambler.local:~/

# SSH in and run it
ssh guarox@rambler.local
sudo bash pi_setup.sh

# When done:
sudo reboot
```

---

## Step 4 — After reboot

| What | How |
|------|-----|
| SSH wired (home) | `ssh guarox@192.168.4.100` |
| SSH mDNS (any network) | `ssh guarox@rambler.local` |
| SSH Race Mode | `ssh guarox@192.168.5.1` |
| Signal K web UI | http://rambler.local:3000 |
| Dashboard | https://rambler99.vercel.app |

---

## Network addresses

```
┌─────────────────────────────────────────────────────────┐
│  RAMBLER Pi 4 — Fixed Addresses                         │
│                                                         │
│  eth0  (wired):   192.168.4.100  ← homelab / dock      │
│  wlan0 (AP mode): 192.168.5.1    ← Race Mode only      │
│  mDNS:            rambler.local  ← any network ✓       │
└─────────────────────────────────────────────────────────┘
```

> **AP vs wired:** The AP (192.168.5.1) only runs in Race Mode. At home eth0 is
> active instead — no conflict since both are never active simultaneously.

> **Starlink boat setup:** Starlink router is `192.168.100.x`. Update `eth0` to
> `192.168.100.100 / gateway 192.168.100.1` for wired boat access, or just use
> `rambler.local` which works on any network.

---

## Change static IP for boat (Starlink)

```bash
sudo nano /etc/dhcpcd.conf
# Find "interface eth0" block — change to Starlink subnet:
#   static ip_address=192.168.100.100/24
#   static routers=192.168.100.1
sudo reboot
```

---

## Signal K quick config

After reboot, open **http://rambler.local:3000** in your browser:

1. Create admin account (first run)
2. **Server → Data Connections → Add**
   - Type: `NMEA 2000 via SocketCAN`
   - Device: `can0`
   - Enable ✅ → Save → Restart

---

## Verify PICAN-M is seeing N2K data

```bash
# Check CAN interface is up
ip -details link show can0

# Watch raw N2K PGNs (power on B&G instruments first)
candump can0
# You should see hex frames immediately: can0  0CF50237  [8]  FF 02 ...

# Check Signal K is receiving
curl http://localhost:3000/signalk/v1/api/vessels/self/navigation/speedOverGround
```

---

## WiFi networks

| Network | Purpose | Password |
|---------|---------|---------|
| `Rambler_Net` | Race Mode AP (Pi = hotspot) | `RAMBLER2026` |
| Home WiFi | Pre-configured in Pi Imager | (your WiFi password) |

> **On the boat with Starlink:** Connect Pi ethernet to Starlink router. Pi broadcasts
> `Rambler_Net` for crew iPads. Starlink handles internet. Pi routes AP traffic → Starlink.
