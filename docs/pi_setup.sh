#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Rambler Smart Bridge — Pi 4 Provisioning Script
# Run as root on a freshly-flashed OpenPlotter 4 Pi after first boot.
#
# Usage:  sudo bash pi_setup.sh
#
# What this does:
#   1. Creates user "guarox" with sudo rights
#   2. Enables & hardens SSH
#   3. Sets static IP 192.168.1.100 on eth0 (wired — change to match your LAN)
#   4. Configures wlan0 as dual-mode: client for home/Starlink + AP Rambler_Net
#   5. Sets AP fixed IP 192.168.4.1 (Race Mode — Pi = gateway)
#   6. Installs hostapd + dnsmasq (DHCP server for AP clients)
#   7. Enables mDNS so rambler.local always resolves regardless of IP
#   8. Configures PICAN-M SMPS SocketCAN (can0 at 250000 baud)
#   9. Sets up Signal K as systemd service
# ─────────────────────────────────────────────────────────────────────────────

set -e
LOGFILE="/var/log/rambler_setup.log"
exec > >(tee -a "$LOGFILE") 2>&1
echo "=== Rambler setup started $(date) ==="

# ── 0. Sanity ────────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && { echo "Run as root: sudo bash $0"; exit 1; }

# ── 1. User: guarox ──────────────────────────────────────────────────────────
echo "[1/9] Creating user guarox..."
if id "guarox" &>/dev/null; then
    echo "  User guarox already exists — skipping creation"
else
    useradd -m -s /bin/bash -G sudo,dialout,netdev,spi,gpio,i2c,video,plugdev guarox
fi
echo "guarox:2wsx#edC" | chpasswd
echo "  Password set"

# Ensure guarox can sudo without password (for scripts + remote ops)
cat > /etc/sudoers.d/guarox <<'EOF'
guarox ALL=(ALL) NOPASSWD:ALL
EOF
chmod 440 /etc/sudoers.d/guarox

# ── 2. SSH ───────────────────────────────────────────────────────────────────
echo "[2/9] Configuring SSH..."
systemctl enable ssh
systemctl start ssh

cat > /etc/ssh/sshd_config.d/rambler.conf <<'EOF'
# Rambler hardening — allow password auth (key auth optional, add later)
PasswordAuthentication yes
PermitRootLogin no
ChallengeResponseAuthentication no
MaxAuthTries 6
ClientAliveInterval 60
ClientAliveCountMax 3
AllowUsers guarox
EOF

# Pre-create .ssh dir for guarox (for future key-based auth)
mkdir -p /home/guarox/.ssh
chmod 700 /home/guarox/.ssh
chown guarox:guarox /home/guarox/.ssh

systemctl restart ssh
echo "  SSH enabled — connect: ssh guarox@rambler.local  or  ssh guarox@192.168.4.100"

# ── 3. Hostname & mDNS ───────────────────────────────────────────────────────
echo "[3/9] Setting hostname to 'rambler'..."
hostnamectl set-hostname rambler
cat > /etc/hosts <<'EOF'
127.0.0.1       localhost
127.0.1.1       rambler.local rambler
::1             localhost ip6-localhost ip6-loopback
ff02::1         ip6-allnodes
ff02::2         ip6-allrouters
EOF

# Ensure avahi-daemon (mDNS) is running
apt-get install -y avahi-daemon avahi-utils &>/dev/null
systemctl enable avahi-daemon
systemctl restart avahi-daemon
echo "  rambler.local now resolves on any local network"

# ── 4. Static IP on eth0 (wired) ─────────────────────────────────────────────
echo "[4/9] Setting static IP 192.168.4.100 on eth0..."
# Homelab: 192.168.4.x / gateway 192.168.4.116
# Boat (Starlink): update routers to 192.168.100.1 and ip_address to 192.168.100.100

cat >> /etc/dhcpcd.conf <<'EOF'

# ── Rambler static eth0 ──────────────────────────────────────────────────────
interface eth0
static ip_address=192.168.4.100/24
static routers=192.168.4.116
static domain_name_servers=8.8.8.8 1.1.1.1
# fallback to DHCP if static fails (e.g. no cable)
fallback eth0

# ── Rambler AP interface (wlan0) — fixed for Race Mode ───────────────────────
interface wlan0
static ip_address=192.168.4.1/24
nohook wpa_supplicant
EOF

echo "  eth0 → 192.168.4.100  (homelab)"
echo "  wlan0 → 192.168.4.1  (AP Race Mode — only active when AP is running)"

# ── 5. hostapd — WiFi Access Point (Rambler_Net) ─────────────────────────────
echo "[5/9] Installing and configuring hostapd (Rambler_Net AP)..."
apt-get install -y hostapd &>/dev/null

cat > /etc/hostapd/hostapd.conf <<'EOF'
interface=wlan0
driver=nl80211
ssid=Rambler_Net
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=RAMBLER2026
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
EOF

sed -i 's|#DAEMON_CONF=""|DAEMON_CONF="/etc/hostapd/hostapd.conf"|' /etc/default/hostapd
systemctl unmask hostapd
systemctl enable hostapd
echo "  AP: Rambler_Net  |  Password: RAMBLER2026"

# ── 6. dnsmasq — DHCP for AP clients ─────────────────────────────────────────
echo "[6/9] Configuring dnsmasq (DHCP for Rambler_Net clients)..."
apt-get install -y dnsmasq &>/dev/null

# Preserve original config
[[ -f /etc/dnsmasq.conf ]] && mv /etc/dnsmasq.conf /etc/dnsmasq.conf.orig

cat > /etc/dnsmasq.conf <<'EOF'
interface=wlan0
dhcp-range=192.168.4.2,192.168.4.20,255.255.255.0,24h
# Resolve rambler.local for AP clients
address=/rambler.local/192.168.4.1
EOF

systemctl enable dnsmasq
echo "  DHCP: 192.168.4.2 – 192.168.4.20 on Rambler_Net"

# ── 7. PICAN-M SMPS — SocketCAN ─────────────────────────────────────────────
echo "[7/9] Enabling PICAN-M (SocketCAN can0)..."
BOOT_CFG="/boot/firmware/config.txt"
[[ ! -f "$BOOT_CFG" ]] && BOOT_CFG="/boot/config.txt"

if ! grep -q "mcp2515-can0" "$BOOT_CFG"; then
cat >> "$BOOT_CFG" <<'EOF'

# PICAN-M SMPS — NMEA 2000 via SocketCAN
dtparam=spi=on
dtoverlay=mcp2515-can0,oscillator=16000000,interrupt=25
dtoverlay=spi-bcm2835-overlay
EOF
fi

# Create systemd-networkd configuration for auto-starting can0
mkdir -p /etc/systemd/network
cat > /etc/systemd/network/80-can.network <<'EOF'
[Match]
Name=can*

[CAN]
BitRate=250000
RestartSec=100ms
EOF

systemctl enable systemd-networkd

echo "  can0 configured at 250000 baud via systemd-networkd — active after reboot"

# ── 8. IP forwarding (Starlink routing) ──────────────────────────────────────
echo "[8/9] Enabling IP forwarding..."
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
sysctl -p /etc/sysctl.conf &>/dev/null

# NAT for AP clients → eth0 → internet (when Starlink is connected via eth0)
apt-get install -y iptables-persistent &>/dev/null || true
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE || true
netfilter-persistent save || iptables-save > /etc/iptables/rules.v4 2>/dev/null || true

# ── 9. Signal K (via npm) ────────────────────────────────────────────────────
echo "[9/9] Installing Signal K server..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - &>/dev/null
apt-get install -y nodejs &>/dev/null
npm install -g @signalk/server &>/dev/null

# systemd unit for Signal K
cat > /etc/systemd/system/signalk.service <<'EOF'
[Unit]
Description=Signal K Server
After=network.target

[Service]
User=guarox
ExecStart=/usr/bin/signalk-server --port 3000
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable signalk
echo "  Signal K will start on boot at port 3000"
echo "  Web UI: http://rambler.local:3000"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Rambler Pi setup complete!"
echo ""
echo "  SSH:        ssh guarox@rambler.local"
echo "  SSH (wired):ssh guarox@192.168.1.100"
echo "  Signal K:   http://rambler.local:3000"
echo "  AP WiFi:    Rambler_Net / RAMBLER2026"
echo "  AP SSH:     ssh guarox@192.168.4.1  (Race Mode)"
echo ""
echo "  ⚠️  REBOOT NOW:  sudo reboot"
echo "═══════════════════════════════════════════════════════════════"
