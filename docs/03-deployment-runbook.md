# 03 — Deployment Runbook (Publisher & Volunteer Mirror Guide)

This runbook strictly enforces **Role Separation** ([ADR-004](adr/ADR-004-origin-mirror-decoupling.md)):
- **Role A (Canonical Publisher):** Operates anonymously inside **Tails OS / Qubes+Whonix**. Touches ONLY offshore non-KYC infrastructure (Tor v3 `.onion`, offshore IPFS pinner, offshore BitTorrent seedbox). **Never touches KYC clearnet accounts.**
- **Role B (Independent Mirror Operators / Diaspora Volunteers):** Physically located **outside Thailand**. Pulls the *public, signed* static bundle from Role A's canonical origin and hosts burnable clearnet mirrors. **Zero shared accounts, credentials, or servers with Role A.**

---

## Part A: Canonical Publisher Workflow (Tails OS / Air-Gapped)

### Step A1 — Sanitize & Author Content Offline
1. Boot **Tails OS** (or an isolated Qubes AppVM) with Persistent Storage encrypted via strong passphrase.
2. **Never paste real evidence into cloud AI/LLMs** ([ADR-009](adr/ADR-009-ai-data-boundary.md)).
3. Reconstruct every document/image using **Dangerzone** + **MAT2** (see [04-opsec-and-sanitization.md](04-opsec-and-sanitization.md)) and assign opaque IDs (`EVD-001.pdf`, `EVD-002.png`).
4. Compute each file's SHA-256 (`sha256sum EVD-001.pdf`) and record it in `content/evidence/sanitized-manifest.json` along with the sanitization method and legal review sign-off.
5. Update `content/site.config.json` (`isSampleTemplate: false`, real PGP fingerprint, updated UTC `releaseDateUtc`, updated `warrantCanary`) and add bilingual EN/TH case Markdown files in `content/cases/`.
6. Export your public PGP key to `src/assets/archive-release-key.asc`:
   ```bash
   gpg --armor --export "<YOUR_PGP_KEY_ID>" > src/assets/archive-release-key.asc
   ```

### Step A2 — Build, Audit & Sign Deterministically
```bash
# Build static site, offline HTML, printable edition, deterministic ZIP, and SHA256SUMS
npm run build

# Run full OPSEC, metadata, link-portability, and double-build reproducibility audit
npm run audit:opsec

# Verify SHA256SUMS matches every built file
npm run verify

# Sign SHA256SUMS and mirrors.json with your offline PGP signing subkey
gpg --armor --detach-sign --output dist/site/SHA256SUMS.asc dist/site/SHA256SUMS
gpg --armor --detach-sign --output dist/site/mirrors.json.asc dist/site/mirrors.json
```

### Step A3 — Provision the Tor v3 Canonical Origin (Offshore, Non-KYC VPS)
1. Procure an offshore Linux VPS (Debian/Ubuntu) from a no-KYC provider accepting **Monero (XMR)** over Tor Browser. Never reuse personal emails, passwords, or SSH keys.
2. Install `tor`, `nginx`, and `ufw`:
   ```bash
   apt-get update && apt-get install -y tor nginx ufw
   ```
3. Copy `infra/tor/torrc` to `/etc/tor/torrc` and `infra/tor/nginx-onion.conf` to `/etc/nginx/sites-available/archive-onion`:
   ```bash
   rm -f /etc/nginx/sites-enabled/default
   ln -s /etc/nginx/sites-available/archive-onion /etc/nginx/sites-enabled/archive-onion
   nginx -t && systemctl reload nginx
   ```
4. **Configure v3 Client Authorization for Admin SSH** before locking down UFW:
   - Generate an x25519 keypair in Tails, put the `.auth` public key in `/var/lib/tor/admin_ssh/authorized_clients/operator.auth`, restart Tor, and read `/var/lib/tor/admin_ssh/hostname` and `/var/lib/tor/archive_site/hostname`.
   - Test logging in via Tor SSH (`torsocks ssh -i ~/.ssh/op_ed25519 root@<admin-onion>.onion`)!
5. Only AFTER Tor SSH works reliably, run `bash infra/tor/ufw-hardening.sh` to close port 22/80/443 on the public IP completely. Verify with `ss -tlnp` that only `127.0.0.1` ports are open.
6. Upload `dist/site/` over Tor SSH into `/var/www/archive/site/`.

### Step A4 — Publish to IPFS & BitTorrent (OFFSHORE ONLY!)
> [!CAUTION]
> **NEVER run `ipfs add` or BitTorrent seeding from a home network or ANY IP inside Thailand.** Both protocols expose the seeding node's real IP publicly.

1. Upload `dist/site/` and `dist/offline/archive-portable.zip` over Tor SSH to a **separate offshore non-KYC VPS / seedbox**.
2. On the offshore IPFS node, run:
   ```bash
   bash infra/ipfs/publish-offshore.sh ./site ./archive-site.car
   ```
   Pin the resulting CIDv1 on 2–3 independent offshore pinning services (upload the `.car` file so pinners don't need to crawl your node).
3. On the offshore seedbox, run:
   ```bash
   bash infra/torrent/create-torrent-offshore.sh ./archive-portable.zip ./archive-portable.torrent
   ```
   Seed the `.zip` from the offshore seedbox and copy the magnet URI.
4. Update `content/mirrors.json` with the real `.onion`, IPFS CID, and BitTorrent magnet, rebuild, re-sign `SHA256SUMS.asc` + `mirrors.json.asc`, and re-upload to the `.onion`.

---

## Part B: Volunteer Clearnet Mirror Workflow (OUTSIDE THAILAND ONLY)

> [!WARNING]
> **Do NOT operate clearnet mirrors if you live in or travel regularly to Thailand.** Criminal defamation (Penal Code s.326–328) and Computer Crime Act takedowns frequently target identifiable local operators.

### Step B1 — Pull & Verify Before Mirroring
Never blindly mirror an unverified ZIP!
```bash
# 1. Import the publisher's official PGP key and verify its fingerprint out-of-band
gpg --import archive-release-key.asc

# 2. Verify the detached signature on SHA256SUMS
gpg --verify SHA256SUMS.asc SHA256SUMS

# 3. Verify every file in the static bundle
node scripts/verify.mjs ./site
```

### Step B2 — Deploy as a Burnable Front Door
Choose one (or more) Collateral Freedom hosts:
- **Cloudflare Pages:**
  1. Copy `infra/mirrors/_headers` into `./site/_headers` and replace the `.onion` address.
  2. Deploy `./site/` as a static project.
  3. Under **SSL/TLS -> Edge Certificates**, enable **ECH (Encrypted Client Hello)** and **Always Use HTTPS** to resist Thai ISP TLS SNI blocking.
- **Netlify:**
  1. Copy `infra/mirrors/_headers` into `./site/_headers` (with real `.onion`).
  2. Deploy `./site/` via drag-and-drop or CLI.
- **Independent Offshore VPS with Caddy:**
  1. Copy `infra/mirrors/Caddyfile` to `/etc/caddy/Caddyfile`, insert your mirror domain and real `.onion`, and point `root` at `/var/www/archive/site`.

### Step B3 — Announce Out-of-Band
Post the new clearnet mirror URL **together with the 16-character Visual Archive Fingerprint** (e.g., `FP: XXXX-XXXX-XXXX-XXXX`) to verified diaspora newsrooms and encrypted broadcast channels (Signal / Telegram).

---

## Part C: Exporting a Compact Sanitized PDF for LINE / iOS Mobile Users

Because LINE and iOS Safari handle raw `.html` attachments poorly:
1. Open `dist/offline/archive-printable.html` inside Tails Tor Browser (or offline Chromium).
2. Print -> **Save as PDF** (keep total size well under **10 MB** for instant LINE forwarding).
3. **CRITICAL:** Scrub the newly printed PDF (browsers embed OS/browser creator metadata!) by running it through **Dangerzone** or **MAT2**:
   ```bash
   mat2 --inplace archive-summary-v1.0.0.pdf
   ```
4. Share the scrubbed PDF alongside the Visual Archive Fingerprint in LINE / Telegram / Signal groups.
