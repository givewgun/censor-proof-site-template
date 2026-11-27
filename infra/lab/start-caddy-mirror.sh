#!/usr/bin/env sh
# Burnable Clearnet Mirror (Caddy v2) — local lab runner
# Waits for tor-origin to emit the live v3 .onion hostname so Onion-Location
# points to the REAL live .onion generated in this lab!
set -eu

ONION="replace-with-56-char-v3-onion-address-examplexxxxxxxxxxxxxx.onion"
i=0
while [ "$i" -lt 30 ]; do
  if [ -s /shared/onion-hostname ]; then
    ONION=$(tr -d '\r\n' < /shared/onion-hostname)
    break
  fi
  i=$((i + 1))
  sleep 1
done

cat <<EOF > /etc/caddy/Caddyfile
{
    admin off
    auto_https off
}

:8089 {
    root * /srv/site
    file_server

    log {
        output discard
    }

    header {
        Onion-Location "http://${ONION}{uri}"
        Content-Security-Policy "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'"
        Referrer-Policy "no-referrer"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()"
        Cross-Origin-Opener-Policy "same-origin"
        Cross-Origin-Resource-Policy "same-origin"
        -Server
    }

    @disallowed {
        not method GET HEAD
    }
    respond @disallowed 405
}
EOF

echo "[clearnet-mirror] Serving dist/site on http://127.0.0.1:8089/ with Onion-Location: http://${ONION}/"
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
