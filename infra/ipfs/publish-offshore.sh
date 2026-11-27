#!/usr/bin/env bash
# Offshore-Only IPFS Publishing Helper (ADR-004)
#
# CRITICAL OPSEC WARNING:
# NEVER run this script from a home connection, workplace network, or ANY IP
# inside Thailand! Pinning/providing on IPFS broadcasts your node's public IP
# to the global IPFS DHT. Run ONLY on an anonymous offshore VPS (or upload a
# pre-built .car file to a non-KYC offshore pinning service over Tor).

set -euo pipefail

SITE_DIR="${1:-./dist/site}"
OUT_CAR="${2:-./dist/archive-site.car}"

if [[ ! -d "$SITE_DIR" ]]; then
  echo "Error: site directory not found at $SITE_DIR. Run 'npm run build' first." >&2
  exit 1
fi

if ! command -v ipfs >/dev/null 2>&1; then
  echo "Kubo 'ipfs' CLI not found. Install Kubo on your OFFSHORE VPS first." >&2
  exit 1
fi

echo "========================================================================"
echo "OFFSHORE CHECK: Confirm this machine is an offshore non-KYC VPS."
echo "Do NOT pin from a home IP or any Thai IP (DHT exposes provider IP!)."
echo "========================================================================"

# Add deterministically with CIDv1 (base32 — required for subdomain gateways like *.ipfs.dweb.link)
CID=$(ipfs add -r -Q --cid-version=1 --raw-leaves --hash=sha2-256 "$SITE_DIR")

echo ""
echo "Pinned CIDv1 : $CID"
echo "Subdomain GW : https://${CID}.ipfs.dweb.link/"
echo "Alt Subdomain: https://${CID}.ipfs.w3s.link/"
echo "Path GW      : https://ipfs.io/ipfs/${CID}/"
echo ""
echo "Optional DNSLink TXT record (for volunteer clearnet mirrors outside Thailand):"
echo "  _dnslink.archive.example.org.  TXT  \"dnslink=/ipfs/${CID}\""
echo ""

# Export portable CAR archive so independent volunteers/pinners can replicate without contacting origin
ipfs dag export "$CID" > "$OUT_CAR"
echo "Exported portable CAR file: $OUT_CAR"
echo "Pin this CID on at least 2-3 independent offshore pinning services for resilience."
