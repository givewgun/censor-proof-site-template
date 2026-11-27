#!/usr/bin/env sh
# Isolated Offline Kubo IPFS Lab Node (ADR-004 OPSEC Compliant)
# Runs with Routing.Type=none and empty Bootstrap list so it NEVER broadcasts
# the host/VPN IP to the public IPFS DHT, while still computing the REAL CIDv1
# and serving the real /ipfs/<CID>/ HTTP Path Gateway locally on 127.0.0.1:8088!
set -eu

export IPFS_PATH=/data/ipfs
if [ ! -f "$IPFS_PATH/config" ]; then
  ipfs init --profile=lowpower
fi

# Strip all public bootstrap peers and disable DHT routing (zero external network leaks)
ipfs bootstrap rm --all >/dev/null 2>&1 || true
ipfs config Routing.Type none
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080
ipfs config Addresses.API /ip4/127.0.0.1/tcp/5001
ipfs config --json Swarm.DisableNatPortMap true

# Add the built static site deterministically as CIDv1 (base32)
CID=$(ipfs add -r -Q --cid-version=1 --raw-leaves --hash=sha2-256 /site)
echo "$CID" > /shared/ipfs-cid
echo "[ipfs-lab] ISOLATED OFFLINE CIDv1 : $CID"
echo "[ipfs-lab] LOCAL PATH GATEWAY     : http://127.0.0.1:8088/ipfs/${CID}/"

exec ipfs daemon --offline
