# 05 — Censorship & Incident Response Playbook

When active censorship or legal pressure hits, calm execution beats panic. Find the matching scenario below and follow the steps in order.

---

## Scenario 1: Thai ISPs Block a Clearnet Mirror (DNS Poisoning or TLS SNI Reset)

**Symptoms:** Thai mobile/broadband users see an MDES block page, DNS timeout, or `ERR_CONNECTION_RESET` on a clearnet mirror, while offshore users can still reach it.

**Response:**
1. **Do NOT panic or touch the canonical `.onion` server.** Your canonical archive is unaffected.
2. **Check ECH & Collateral Freedom:** If the mirror is on Cloudflare Pages, confirm **ECH (Encrypted Client Hello)** is enabled; advise readers to turn on **DNS-over-HTTPS (DoH)** in Chrome/Safari/Firefox so ISP DNS poisoning is bypassed.
3. **Activate a Pre-Staged Burnable Mirror:** An independent volunteer **outside Thailand** deploys the identical verified `dist/site/` bundle onto a fresh domain/subdomain (Netlify, GitHub Pages, Cloudflare Pages, or Caddy VPS).
4. **Update & Sign `mirrors.json`:** Mark the blocked mirror `"status": "blocked-th"`, add the new mirror, re-sign `mirrors.json.asc`, and broadcast the new URL + **16-char Visual Archive Fingerprint** via Signal/Telegram channels.
5. **Push Mobile / Offline Alternatives:** Remind Thai readers to forward the **sanitized PDF** (`archive-printable.html` export) in LINE, use **Ceno Browser** (Android P2P), or open an unblocked **IPFS HTTP gateway** (`dweb.link`, `w3s.link`).

---

## Scenario 2: Cloudflare / Netlify / GitHub Takedown or Abuse Subpoena

**Symptoms:** A CDN or platform suspends the mirror repository/site citing defamation, ToS violation, or court order.

**Response:**
1. **Treat the mirror account as burned** — never argue with platform abuse desks using real identities or reveal publisher info (mirror volunteers shouldn't *have* publisher info anyway under [ADR-004](adr/ADR-004-origin-mirror-decoupling.md)).
2. **Verify zero blast radius:** Confirm no canonical `.onion` keys, origin VPS IPs, or private publisher metadata were ever stored on the clearnet platform.
3. **Rotate to alternate jurisdictions/platforms** (independent offshore volunteers, Archive.org snapshot, IPFS gateways, Tor `.onion`, BitTorrent magnet).

---

## Scenario 3: Public IPFS Gateways (`ipfs.io`, `dweb.link`) Are Blocked

**Symptoms:** Readers in Thailand cannot load `https://<CID>.ipfs.dweb.link/`.

**Response:**
1. **Remember:** The content CID is completely unchanged — you do NOT need to re-upload anything.
2. **Switch gateways immediately:** Share alternative public gateways (`w3s.link`, `ipfs.filebase.io`, `4everland.io`, or volunteer-run offshore IPFS gateways).
3. **Encourage local/P2P resilience:** Share the BitTorrent magnet link, the `<25 MB` offline HTML/ZIP bundle, and the sanitized PDF.
4. **Verify pinning health:** Confirm at least 2–3 independent offshore pinners still pin the CID so garbage collection never drops the archive.

---

## Scenario 4: Adversary Launches a Spoofed / Tampered Mirror

**Symptoms:** A lookalike domain or altered PDF circulates on social media with modified names, fake claims, or malicious links designed to discredit the investigation.

**Response:**
1. **Point readers to the Visual Fingerprint:** Every legitimate page carries the 16-char `FP: XXXX-XXXX-XXXX-XXXX` matching the official out-of-band announcement. Any tampered HTML/PDF will either show a mismatched fingerprint or fail `SHA256SUMS.asc` verification.
2. **Add the fake domain to `compromisedOrRevoked[]`** in `content/mirrors.json`, re-sign `mirrors.json.asc`, and publish a short bilingual warning on Signal/Telegram and journalist channels.
3. **Ask journalists to run `gpg --verify SHA256SUMS.asc SHA256SUMS && node scripts/verify.mjs`** to publicly confirm the authentic copy.

---

## Scenario 5: Origin Tor VPS Is Seized or Compromised (`.onion` Key Lost)

**Symptoms:** The offshore VPS disappears, SSH host key changes unexpectedly, or you suspect hosting-provider hypervisor/disk seizure.

**Response:**
1. **Assume the `.onion` private key is compromised** — the adversary can now serve tampered pages at your old `.onion` address!
2. **Use your OFFLINE PGP Key (which was NEVER on the VPS):**
   - Add the compromised `.onion` address to `compromisedOrRevoked[]` in `content/mirrors.json` with exact UTC timestamp and reason.
   - Update `warrantCanary` truthfully.
   - Provision a brand-new offshore non-KYC VPS (XMR) and generate a **brand-new Tor v3 `.onion` keypair**.
   - Rebuild, sign `SHA256SUMS.asc` and `mirrors.json.asc` with your offline PGP key, and publish the signed repudiation notice across IPFS, BitTorrent, clearnet mirrors, and journalist channels.
3. **Never reuse SSH keys, passwords, or hosting providers** from the seized VPS.

---

## Scenario 6: Factual Error Discovered After Immutable Publication

**Symptoms:** A genuine error (wrong date, misread unit, misidentified entity) is discovered in a case already pinned to IPFS and BitTorrent.

**Response:**
1. **Never attempt silent edits** — silent clearnet edits diverge from IPFS/Torrent and look like tampering.
2. **Bump `releaseVersion`** (e.g., `1.0.0` -> `1.0.1`) in `content/site.config.json` and set `"supersedes": { "version": "1.0.0", "visualFingerprint": "<old-FP>" }`.
3. **Add an entry to `corrections[]`** in `content/site.config.json` and set `status: corrected` + `correctionNote:` in the affected case Markdown (both EN and TH).
4. **Rebuild, run `npm run audit:opsec`, re-sign with PGP**, publish the new IPFS CID and `.onion` update, and instruct all clearnet mirrors and out-of-band channels to replace the old links with the superseding release.
