#!/usr/bin/env bash
set -euo pipefail

# Validate Nginx config before starting
nginx -t

# Ensure Tor hidden service directory permissions are strict (0700)
chown -R debian-tor:debian-tor /var/lib/tor
chmod 700 /var/lib/tor/archive_site

# Start hardened zero-log Nginx (bound strictly to 127.0.0.1:8080)
nginx

echo "[tor-origin] Nginx started on 127.0.0.1:8080 (zero-log mode)."
echo "[tor-origin] Starting Tor v3 Onion Service..."

# Launch Tor in foreground as debian-tor and export generated hostname to shared /shared/onion-hostname
su -s /bin/bash debian-tor -c "tor -f /etc/tor/torrc" &
TOR_PID=$!

for i in $(seq 1 60); do
  if [[ -s /var/lib/tor/archive_site/hostname ]]; then
    ONION=$(tr -d '\r\n' < /var/lib/tor/archive_site/hostname)
    echo "$ONION" > /shared/onion-hostname
    echo "[tor-origin] LIVE TOR V3 ONION ADDRESS: http://${ONION}/"
    break
  fi
  sleep 1
done

wait "$TOR_PID"
