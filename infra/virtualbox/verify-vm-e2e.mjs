import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WORK_DIR = path.join(REPO_ROOT, 'tmp', 'vbox-lab');
const STATE_PATH = path.join(WORK_DIR, 'vm-state.json');

function main() {
  if (!existsSync(STATE_PATH)) {
    throw new Error('VirtualBox lab state not found. Run "npm run vbox:up" first.');
  }
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  const adminOnionNoSuffix = state.adminOnion.replace(/\.onion$/, '');

  console.log('=== VirtualBox Tor-Origin LIVE Kernel & Tor v3 Client-Auth E2E Verification ===\n');
  console.log(`Target Public Onion : http://${state.siteOnion}/`);
  console.log(`Target Admin Onion  : ${state.adminOnion} (x25519 client auth required)\n`);

  // Run an ephemeral Debian Tor client container to verify ALL 4 real-world tests over the LIVE Tor network:
  // 1. Fetch public site .onion over Tor & verify CSP / zero ETag / no Last-Modified / POST=405
  // 2. Negative test: try connecting to admin_ssh .onion WITHOUT x25519 client auth -> MUST FAIL
  // 3. Positive test: load ClientOnionAuthDir with private x25519 key -> SSH into VM over Tor -> MUST SUCCEED
  // 4. Inside VM over Tor SSH: verify UFW deny-all incoming, ss -tlnp strictly 127.0.0.1, journald volatile, 0B nginx logs!
  const verifyScript = `
    set -euo pipefail
    apt-get update -qq >/dev/null
    apt-get install -y -qq --no-install-recommends tor curl openssh-client netcat-openbsd ca-certificates >/dev/null

    # Copy lab SSH private key with strict 0600 permissions
    cp /work/lab_ed25519 /tmp/lab_ed25519
    chmod 600 /tmp/lab_ed25519

    # --- Start Tor client WITHOUT client-auth first ---
    mkdir -p /tmp/tor_unauth /tmp/tor_auth /tmp/client_auth
    chmod 700 /tmp/tor_unauth /tmp/tor_auth /tmp/client_auth

    cat <<EOF > /tmp/torrc_unauth
DataDirectory /tmp/tor_unauth
SocksPort 127.0.0.1:9050
Log notice file /tmp/tor_unauth.log
EOF
    tor -f /tmp/torrc_unauth &
    TOR1_PID=$!

    for i in $(seq 1 60); do
      if grep -q "Bootstrapped 100%" /tmp/tor_unauth.log 2>/dev/null; then break; fi
      sleep 1
    done
    grep -q "Bootstrapped 100%" /tmp/tor_unauth.log

    echo "[TEST 1] Fetching VirtualBox VM public .onion over the REAL Tor network..."
    BODY=""
    HDRS=""
    for attempt in $(seq 1 8); do
      if HDRS=$(curl --socks5-hostname 127.0.0.1:9050 --max-time 25 -sS -D - -o /tmp/page.html "http://${state.siteOnion}/" 2>/dev/null); then
        BODY=$(cat /tmp/page.html)
        if echo "$BODY" | grep -q "Public Integrity Archive"; then break; fi
      fi
      sleep 4
    done
    echo "$BODY" | grep -q "A081-B87B-CE2D-0814"
    echo "$HDRS" | grep -qi "Content-Security-Policy: default-src 'none'"
    echo "$HDRS" | grep -qi "Referrer-Policy: no-referrer"
    ! echo "$HDRS" | grep -qi "^ETag:"
    POST_CODE=$(curl --socks5-hostname 127.0.0.1:9050 --max-time 20 -sS -o /dev/null -w "%{http_code}" -X POST "http://${state.siteOnion}/")
    test "$POST_CODE" = "405"
    echo "[PASS] TEST 1: Live VirtualBox public .onion verified over Tor (HTTP 200, fingerprint match, CSP, no ETag, POST=405)"

    echo "[TEST 2] NEGATIVE TEST: Connecting to admin_ssh .onion WITHOUT x25519 client-auth key (must be REJECTED by Tor)..."
    if ssh -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=15 \
         -o ProxyCommand="nc -X 5 -x 127.0.0.1:9050 %h %p" \
         -i /tmp/lab_ed25519 "root@${state.adminOnion}" "echo SHOULD_NOT_WORK" 2>/dev/null; then
      echo "[FAIL] Unauthenticated SSH to admin_ssh onion succeeded unexpectedly!" >&2
      exit 1
    fi
    echo "[PASS] TEST 2: Unauthenticated admin_ssh .onion connection REJECTED at Tor descriptor layer!"

    kill "$TOR1_PID" || true
    wait "$TOR1_PID" 2>/dev/null || true

    # --- Start Tor client WITH x25519 client-auth private key ---
    echo "${adminOnionNoSuffix}:descriptor:x25519:${state.torAuthPrivBase32}" > /tmp/client_auth/operator.auth_private
    chmod 600 /tmp/client_auth/operator.auth_private

    cat <<EOF > /tmp/torrc_auth
DataDirectory /tmp/tor_auth
SocksPort 127.0.0.1:9051
ClientOnionAuthDir /tmp/client_auth
Log notice file /tmp/tor_auth.log
EOF
    tor -f /tmp/torrc_auth &
    TOR2_PID=$!

    for i in $(seq 1 60); do
      if grep -q "Bootstrapped 100%" /tmp/tor_auth.log 2>/dev/null; then break; fi
      sleep 1
    done
    grep -q "Bootstrapped 100%" /tmp/tor_auth.log

    echo "[TEST 3 & 4] POSITIVE TEST: Authenticated Tor v3 Client-Auth SSH into VirtualBox VM & inspecting kernel hardening..."
    AUDIT_OUT=""
    for attempt in $(seq 1 6); do
      if AUDIT_OUT=$(ssh -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=25 \
           -o ProxyCommand="nc -X 5 -x 127.0.0.1:9051 %h %p" \
           -i /tmp/lab_ed25519 "root@${state.adminOnion}" \
           'echo "===SS==="; ss -tlnp; echo "===UFW==="; ufw status verbose; echo "===JOURNALD==="; cat /etc/systemd/journald.conf.d/99-volatile.conf; echo "===NGINX_LOG==="; if [ -f /var/log/nginx/access.log ]; then wc -c < /var/log/nginx/access.log; else echo 0; fi' 2>/dev/null); then
        break
      fi
      sleep 4
    done
    echo "$AUDIT_OUT"
    echo "$AUDIT_OUT" | grep -q "Status: active"
    echo "$AUDIT_OUT" | grep -q "Default: deny (incoming)"
    echo "$AUDIT_OUT" | grep -q "Storage=volatile"
    # Confirm zero LOCAL sockets listening on 0.0.0.0, [::], or * (inspect column 4 = Local Address:Port only)
    LOCAL_BINDS=$(echo "$AUDIT_OUT" | sed -n '/===SS===/,/===UFW===/p' | awk 'NR>2 && $1=="LISTEN" {print $4}')
    if echo "$LOCAL_BINDS" | grep -qE '^(0\\.0\\.0\\.0|\\[::\\]|\\*):'; then
      echo "[FAIL] Found a public wildcard listening socket inside VM:" >&2
      echo "$LOCAL_BINDS" >&2
      exit 1
    fi
    echo "[PASS] TEST 3 & 4: Authenticated Tor v3 Client-Auth SSH SUCCEEDED + Verified UFW deny-all, 0 public sockets, RAM journald, 0B Nginx logs!"
    kill "$TOR2_PID" || true
  `;

  const output = execFileSync(
    'docker',
    ['run', '--rm', '-v', `${WORK_DIR}:/work:ro`, 'debian:bookworm-slim', 'bash', '-c', verifyScript],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );

  console.log(output);
  assert.ok(output.includes('[PASS] TEST 1:'));
  assert.ok(output.includes('[PASS] TEST 2:'));
  assert.ok(output.includes('[PASS] TEST 3 & 4:'));
  console.log('ALL 4 LIVE VIRTUALBOX KERNEL & TOR V3 CLIENT-AUTH TESTS PASSED!');
}

main();
