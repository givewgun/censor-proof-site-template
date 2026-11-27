# 01 — Requirements & Threat Model

## 1. Mission & Scope

This template supports **one specific mission**: publishing a verifiable, censorship-resistant **public-interest / anti-corruption evidence archive** so that ordinary citizens, journalists, and international observers can read, verify, and redistribute it even under active state or corporate censorship.

### Explicit Non-Goals (Out of Scope)
1. **Collecting tips or file uploads from anonymous sources.** Custom web upload forms introduce server-side RCE, log leaks, and metadata hazards. Use **GlobaLeaks** or **SecureDrop** on separate infrastructure ([ADR-006](adr/ADR-006-no-custom-intake-forms.md)).
2. **Real-time discussion, comments, or user accounts.** Any dynamic state or authentication adds attack surface and creates user-identifying records.
3. **Providing "100% guarantee" of anonymity or legal immunity.** Technical systems reduce risk; they cannot neutralize poor OPSEC or narrow suspect pools.

---

## 2. Functional & Non-Functional Requirements

### Functional Requirements (FR)
- **FR-01 (Bilingual Publishing):** First-class support for **Thai (`th`)** and **English (`en`)** without external web fonts (system sans-serif/Thai font stack so zero network requests leak reader IPs).
- **FR-02 (Structured Evidence Dossiers):** Case pages linking narrative findings, timelines, methodology, public-interest rationale, and cryptographically hashed evidence files.
- **FR-03 (Universal Portability):** Built site works identically via Tor `.onion`, IPFS path gateways (`/ipfs/<CID>/`), IPFS subdomain gateways, clearnet HTTPS mirrors, and local `file://` folders.
- **FR-04 (Offline & Mobile-Friendly Packs):** Automated generation of a single-file offline HTML (`archive-offline.html`), a print-to-PDF edition (`archive-printable.html` for LINE/iOS compatibility), and a deterministic ZIP (`archive-portable.zip`) targeting **< 25 MB** for chat forwarding.
- **FR-05 (Cryptographic & Visual Verification):** Automated `SHA256SUMS` + `manifest.json` for PGP detached signing, plus a short **Visual Archive Fingerprint** rendered on every page so non-technical mobile readers can compare authenticity by eye.
- **FR-06 (Mirror Discovery & Corrections):** Built-in `mirrors.json` directory and formal **superseding / correction notice** mechanism (since IPFS/BitTorrent content is immutable and cannot be deleted).

### Non-Functional & Security Requirements (NFR)
- **NFR-01 (Zero JavaScript Required):** Full reading, language navigation, and verification info must work in **Tor Browser "Safest" mode** (JS completely disabled).
- **NFR-02 (Zero External Network Requests):** Zero CDNs, Google Fonts, analytics, social widgets, or remote embeds. Strict CSP: `default-src 'none'`.
- **NFR-03 (Deterministic / Reproducible Builds):** Identical source inputs produce bit-for-bit identical HTML, ZIP, and SHA-256 hashes across different machines and operating systems.
- **NFR-04 (Zero Runtime Dependencies):** Build and audit scripts use only Node.js built-ins (no `node_modules` supply-chain risk).
- **NFR-05 (Automated OPSEC Gate):** Build fails closed if external URLs, root-absolute links, `<script>` tags, local path leaks, unattested evidence files, or raw EXIF/PDF metadata are detected.

---

## 3. Adversary Profiles (Thailand & Regional Context)

Understanding *who* can block or trace you determines every architectural choice.

| Adversary | Capabilities | Primary Attack Vectors |
| :--- | :--- | :--- |
| **A1. State Telecom Regulators & ISPs** (e.g., MDES / NBTC court-ordered blocks via AIS, True, NT, 3BB) | Mandatory ISP blocking lists; DNS hijacking/poisoning (redirecting to block pages); HTTP Host inspection; TLS SNI inspection & RST injection; IP blackholing; connection metadata retention (90+ days under Thai law). | Blocking clearnet domains & IPFS gateways; logging which Thai subscribers visited clearnet mirror domains (even over HTTPS, DNS + TLS SNI reveal the hostname unless DoH + ECH are used). |
| **A2. Legal / SLAPP Litigants** (Corrupt officials, state-linked corporations, proxies) | **Thai Penal Code s.326–328** (criminal defamation — truth alone is NOT a complete defense; must also establish public interest under **s.330**); **Computer Crime Act (CCA) s.14** (false/distorted data); **s.112** (severe liability if anything touches the monarchy). | Sending legal takedown notices to domain registrars, GitHub, Cloudflare, Netlify, and VPS hosts; subpoenaing KYC billing/account/IP records of clearnet mirror operators; intimidating local volunteers. |
| **A3. Hosting, CDN & Registrar Providers** | Full access to server RAM/disk (VPS hypervisor); CDN access logs (visitor IP, TLS JA3/JA4, User-Agent); KYC/payment records; abuse compliance. | Terminating accounts under ToS/abuse pressure; turning over subscriber identity/IP logs upon court order or complainant demand (Cloudflare/Netlify routinely forward abuse complaints or comply with legal orders). |
| **A4. Forensic & Insider Investigators** | Access to original internal documents, print logs, DMS download audit trails, email servers. | **Canary traps ("barium meals")**, color laser printer yellow **MIC tracking dots**, PDF incremental-save history, redaction boxes drawn over selectable text, EXIF/Office author metadata, **narrow suspect pool** analysis, stylometry, and posting-timezone correlation (`+07:00`). |
| **A5. Opportunistic / Paid Attackers** | Volumetric DDoS, credential stuffing, phishing/typosquatting, mirror cloning. | Taking down origin or clearnet mirrors via DDoS; standing up **tampered fake mirrors** that alter names/numbers to discredit the archive or inject malware/tracking pixels. |

---

## 4. Censorship & Compromise Attack Matrix

Every threat below maps directly to concrete technical controls in this template and its ADRs:

| Threat Vector | What Breaks Without Defense | Defense in This Template | Reference |
| :--- | :--- | :--- | :--- |
| **DNS Poisoning / Registrar Seizure** | Clearnet domain stops resolving or redirects to block page. | Canonical origin on **Tor v3 `.onion`** (no DNS/CA) + **IPFS CID** + **BitTorrent magnet** + rotating burnable mirrors + out-of-band mirror feed. | [ADR-004](adr/ADR-004-origin-mirror-decoupling.md) |
| **TLS SNI / DPI Filtering** | ISP resets TLS handshake to blocked domain even with DoH/1.1.1.1. | **Collateral Freedom** shared CDNs + **ECH (Encrypted Client Hello)** where supported + `Onion-Location` header + Tor Bridges (obfs4/WebTunnel/Snowflake) + Ceno Browser P2P. | [ADR-004](adr/ADR-004-origin-mirror-decoupling.md), [ADR-008](adr/ADR-008-offline-mobile-and-retractions.md) |
| **Host / CDN Takedown or Subpoena** | Single VPS or GitHub repo deleted; operator identity subpoenaed. | Strict **origin/mirror separation**: publisher touches only anonymous offshore Tor/IPFS/Seedbox; clearnet mirrors are burnable and run only by independent operators **outside Thailand**. | [ADR-004](adr/ADR-004-origin-mirror-decoupling.md) |
| **IPFS DHT / BitTorrent IP Leak** | Publisher pins/seeds from home or Thai IP; adversary scrapes DHT/swarm and identifies publisher immediately. | **Hard rule**: Never pin IPFS or seed BitTorrent from home/Thai IPs or over Tor. Use offshore non-KYC VPS/seedbox or anonymous pinning service only. | [ADR-004](adr/ADR-004-origin-mirror-decoupling.md) |
| **Server Exploit / Log Seizure** | Dynamic CMS (WordPress/PHP/Node) gets pwned; Nginx logs leak reader IPs or server IP leaks via SSRF. | **100% static HTML/CSS**, zero backend, Nginx bound strictly to `127.0.0.1`, `access_log off`, UFW deny-all inbound clearnet, SSH only via v3 client-auth `.onion`. | [ADR-002](adr/ADR-002-static-zero-js-portability.md) |
| **Tampered / Spoofed Mirror** | Adversary hosts modified copy to smear archive or inject spyware. | Deterministic `SHA256SUMS` + offline PGP signature (`SHA256SUMS.asc`) + **Short Visual Fingerprint** on every page + verification script (`scripts/verify.mjs`). | [ADR-005](adr/ADR-005-key-lifecycle-and-provenance.md) |
| **Reader Tracking & Deanonymization** | External fonts/CDNs/scripts leak reader IP; ISP sees mirror domain; browser exploits target Tor users. | Zero JS, zero external assets, strict CSP, `Referrer-Policy: no-referrer`, plain-language Thai+English reader safety banner recommending Tor/VPN. | [ADR-002](adr/ADR-002-static-zero-js-portability.md) |
| **Document Forensics / Redaction Leak** | PDF redaction box hides selectable text; EXIF/GPS/Author/MIC dots expose whistleblower. | **Reconstructive sanitization** (Dangerzone rasterize->PDF/A, image re-encode, MAT2) + mandatory `sanitized-manifest.json` attestation + binary audit gate. | [ADR-007](adr/ADR-007-reconstructive-sanitization-gate.md) |
| **Maintainer Repo / AI Leakage** | Git commits leak real email or `+0700` TZ; real evidence pasted into cloud LLM leaks to vendor/subpoena. | UTC-enforced git pre-commit hook + repo audit check + strict **AI Data Boundary** (template code only in cloud AI; zero real evidence ever). | [ADR-009](adr/ADR-009-ai-data-boundary.md) |
| **Mobile / LINE Friction** | Thai users on LINE/iOS cannot open `.onion` or raw `.html` attachments cleanly. | Printable PDF-ready build (`archive-printable.html`), `<25 MB` ZIP & single-file HTML, visible short fingerprint, Ceno Browser support. | [ADR-008](adr/ADR-008-offline-mobile-and-retractions.md) |
| **Immutable Factual Error / Defamation Risk** | Erroneous claim on IPFS/Torrent cannot be deleted, prolonging legal & ethical harm. | Mandatory pre-publication fact-check & public-interest legal attestation + signed **superseding manifests** (`supersedes`) and prominent correction banners. | [ADR-008](adr/ADR-008-offline-mobile-and-retractions.md) |

---

## 5. Honest Residual Risks (What Technology Cannot Solve)

1. **Narrow Suspect Pool:** If only 4 people had access to a leaked memo and internal access logs show who printed/downloaded it, no website architecture can protect the leaker.
2. **Canary Traps:** Subtly unique phrasing/numbers per recipient inside internal text require human editorial corroboration — never publish raw internal memos verbatim without reviewing for uniqueness.
3. **Physical / Endpoint Compromise:** Keyloggers, malware on personal devices, CCTV at public Wi-Fi, or telling friends/coworkers bypass all network anonymity.
4. **End-to-End Traffic Correlation:** A global passive adversary watching both the publisher's ISP and Tor guard/exit nodes can correlate uptime and publishing times. Batch publications at randomized UTC intervals rather than immediately after work hours.
