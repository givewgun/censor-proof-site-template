#!/usr/bin/env bash
# Firewall & SSH Lockdown for Tor-Only Canonical Origin VPS (ADR-004)
# WARNING: Configure & VERIFY your Tor v3 Client-Auth SSH connection BEFORE
# running this script, otherwise you will lock yourself out of port 22!

set -euo pipefail

# Preflight guard: NEVER lock down clearnet SSH or run admin_ssh onion without mandatory v3 client auth!
AUTH_DIR="/var/lib/tor/admin_ssh/authorized_clients"
if [[ ! -d "$AUTH_DIR" ]] || ! find "$AUTH_DIR" -maxdepth 1 -type f -name '*.auth' -size +0c | grep -q .; then
  echo "[ABORT] Missing non-empty *.auth client authorization file in $AUTH_DIR." >&2
  echo "Configure Tor v3 client auth first so admin SSH is NOT reachable by the public!" >&2
  exit 1
fi

echo "[1/4] Locking SSH daemon strictly to 127.0.0.1 (Tor admin onion only)..."
cat <<'EOF' > /etc/ssh/sshd_config.d/99-tor-onion-only.conf
ListenAddress 127.0.0.1
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
AllowAgentForwarding no
AllowTcpForwarding no
X11Forwarding no
EOF

echo "[2/4] Configuring UFW: DENY ALL inbound clearnet traffic..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
# Notice: NO "ufw allow 22", NO "ufw allow 80", NO "ufw allow 443"!
# All inbound access arrives through Tor's outbound circuit to 127.0.0.1.
ufw --force enable

echo "[3/5] Disabling persistent journald disk logs (RAM-only volatile logs)..."
mkdir -p /etc/systemd/journald.conf.d
cat <<'EOF' > /etc/systemd/journald.conf.d/99-volatile.conf
[Journal]
Storage=volatile
RuntimeMaxUse=16M
EOF
systemctl restart systemd-journald

echo "[4/5] Disabling systemd-resolved LLMNR/MulticastDNS wildcard listeners (0.0.0.0:5355)..."
if systemctl is-active --quiet systemd-resolved 2>/dev/null; then
  mkdir -p /etc/systemd/resolved.conf.d
  cat <<'EOF' > /etc/systemd/resolved.conf.d/99-no-llmnr.conf
[Resolve]
LLMNR=no
MulticastDNS=no
EOF
  systemctl restart systemd-resolved
fi

echo "[5/5] Restarting SSH (to unbind 0.0.0.0:22 immediately) and reloading Tor..."
sshd -t
systemctl restart ssh || systemctl restart sshd
systemctl reload tor || systemctl restart tor@default

echo "DONE. Verify with 'ss -tlnp' that only 127.0.0.1 ports are listening."
