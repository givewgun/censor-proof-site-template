#!/usr/bin/env bash
# Offshore-Only BitTorrent Creation Helper (ADR-004)
#
# CRITICAL OPSEC WARNING:
# 1. NEVER seed a BitTorrent swarm from a home IP or ANY IP inside Thailand —
#    every peer and copyright/state monitor in the swarm sees your IP!
# 2. NEVER run BitTorrent over Tor — it degrades the Tor network and still
#    leaks real IPs via UDP trackers and DHT extensions.
# 3. Upload dist/offline/archive-portable.zip over Tor SSH to an anonymous
#    offshore seedbox/VPS and create/seed the torrent ONLY there.

set -euo pipefail

ZIP_FILE="${1:-./dist/offline/archive-portable.zip}"
OUT_TORRENT="${2:-./dist/offline/archive-portable.torrent}"

if [[ ! -f "$ZIP_FILE" ]]; then
  echo "Error: ZIP not found at $ZIP_FILE. Run 'npm run build' first." >&2
  exit 1
fi

if ! command -v mktorrent >/dev/null 2>&1; then
  echo "Install mktorrent on your OFFSHORE seedbox: apt-get install mktorrent" >&2
  exit 1
fi

# Public open trackers (DHT + PEX also enabled — do NOT use private flag -p)
mktorrent \
  -a "udp://tracker.opentrackr.org:1337/announce" \
  -a "udp://open.stealth.si:80/announce" \
  -c "Public-interest static archive — verify SHA256SUMS.asc with PGP before trusting." \
  -o "$OUT_TORRENT" \
  "$ZIP_FILE"

echo "Created torrent: $OUT_TORRENT"
echo "Seed ONLY from an anonymous offshore seedbox, then publish the magnet link in content/mirrors.json."
