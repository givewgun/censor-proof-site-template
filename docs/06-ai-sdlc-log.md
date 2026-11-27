# 06 — AI SDLC Engineering Log (Gemini + Claude Tandem)

This log transparently documents the Software Development Life Cycle (SDLC) used to design, build, and verify `censor-proof-site-template`, following the **AI Data Boundary** ([ADR-009](adr/ADR-009-ai-data-boundary.md)): AI agents collaborated exclusively on this **generic public template** with 100% fictional sample content.

---

## SDLC Phase Summary & Agent Role Allocation

| Phase | Owner | Model / Role | Deliverable |
| :--- | :--- | :--- | :--- |
| **1. Discovery & Architecture Plan** | Gemini (Lead) | Plan author | Initial 3-zone architecture, build/audit pipeline, 7-ADR draft |
| **2. Architecture & Threat-Model Critique** | Claude (Partner) | `claude-opus` (`architecture`) | Adversarial critique exposing 5 censorship/OPSEC blind spots & 4 missing ADRs |
| **3. Architecture Merge & ADR Authoring** | Gemini (Lead) | Author | Expanded to 9 ADRs, Thailand legal/mobile threat matrix, strict IPFS/torrent offshore rules |
| **4. Implementation & Test Suite** | Gemini (Lead) | Implementer | Zero-dependency Node.js SSG, safe Markdown parser, deterministic ZIP, metadata scanner, audit gate, infra templates, bilingual EN/TH sample |
| **5. Security & Censorship Dual Review** | Claude (Partner) | `claude-sonnet` (`review`) | Independent diff & security review of scripts, audit gates, and infra configs |
| **6. Verification & Hardening** | Gemini (Lead) | Verifier | Fixed all review findings, re-verified `npm run build`, `npm test`, and reproducibility |

---

## What Changed After Claude Opus's Phase 2 Architecture Critique

Claude's critique materially strengthened the design in five concrete ways:

1. **IPFS DHT & BitTorrent IP-Leak Trap:** Added explicit hard rules in [ADR-004](adr/ADR-004-origin-mirror-decoupling.md) and offshore-only scripts (`infra/ipfs/publish-offshore.sh`, `infra/torrent/create-torrent-offshore.sh`) warning never to pin IPFS or seed BitTorrent from home/Thai IPs (or torrent over Tor).
2. **Reconstructive Sanitization Over Pattern Scanning:** Upgraded [ADR-007](adr/ADR-007-reconstructive-sanitization-gate.md) and `scripts/build.mjs` so evidence files require a fail-closed `sanitized-manifest.json` attestation (Dangerzone rasterize->PDF/A, pixel re-encode, MAT2, opaque filenames, SHA-256 lock) rather than relying on byte-pattern scanning alone.
3. **Repository & AI Data Boundary:** Added [ADR-009](adr/ADR-009-ai-data-boundary.md), `infra/git/pre-commit`, and `--strict-opsec` git timezone (`+0700` check) & personal-email audits.
4. **Thailand Mobile / LINE / iOS & Mirror Realities:** Added Visual Archive Fingerprints (`FP: XXXX-XXXX-XXXX-XXXX`) on every page, `archive-printable.html` for compact LINE/iOS PDF export, embedded `mirrors.json`, ECH notes for Cloudflare Pages, and explicit warnings against Thailand-based clearnet mirrors.
5. **Thai Legal Reality & Immutable Corrections:** Added Penal Code s.326–330 / CCA s.14 pre-publication gates, signed `supersedes` / `corrections[]` rendering, offline PGP key lifecycle + multi-jurisdiction revocation + warrant canary + seized `.onion` repudiation ([ADR-005](adr/ADR-005-key-lifecycle-and-provenance.md)), and the mandatory anti-false-confidence banner printed on every audit run.

---

## Phase 5–6: Dual Security Review Findings & Fixes (Claude Sonnet + Gemini)

Both agents independently reviewed the implementation and converged on key security and OPSEC hardenings, all of which were implemented and verified with automated tests:

| Severity | Finding | Where Found | Fix Applied |
| :--- | :--- | :--- | :--- |
| **High** | Admin SSH `.onion` relied only on a comment to enforce v3 client auth (`authorized_clients/*.auth`) | `infra/tor/torrc` & `infra/tor/ufw-hardening.sh` (Claude) | Added preflight abort guard in `ufw-hardening.sh` refusing to run unless a non-empty `.auth` file exists. |
| **High** | Raw PDF token scan could be bypassed by compressed `/ObjStm` streams, `/Info` refs, or hex-escaped names (`/Aut#68or`) | `scripts/lib/metadata-scanner.mjs` (Claude) | Flagged `/ObjStm`, `/Info`, `/Metadata`, `/JavaScript`, `/OpenAction`, and hex-escaped PDF names (`/#XX`), plus PNG chunk length bounds checking. |
| **High** | Git pre-commit hook missed `GIT_AUTHOR_EMAIL`/committer overrides and extensionless SSH keys (`id_ed25519`), `.env`, `.kdbx`, `.ovpn`, armored private keys | `infra/git/pre-commit` (Claude) | Switched to `git var GIT_AUTHOR_IDENT` + `GIT_COMMITTER_IDENT`, expanded secret/binary blocklist, and added staged `PRIVATE KEY BLOCK` content scan. |
| **Medium** | `verify.mjs` only verified listed files — extra injected files on a tampered mirror went undetected | `scripts/verify.mjs` (Claude + Gemini) | Enumerated `dist/site/` and failed verification on any unexpected unlisted file. |
| **Medium** | Path traversal `startsWith(siteDir)` lacked trailing `path.sep` (sibling directory bypass) | `scripts/verify.mjs` & `scripts/preview.mjs` (Claude + Gemini) | Enforced `target !== root && !target.startsWith(root + path.sep)`. |
| **Medium** | Malformed `%` URL encoding crashed `preview.mjs` via unhandled `URIError` | `scripts/preview.mjs` (Claude + Gemini) | Wrapped `decodeURIComponent` in `try/catch` returning HTTP `400`. |
| **Medium** | `legalReviewStatus` checked `!== 'pending'` instead of an explicit allowlist | `scripts/audit.mjs` (Claude) | Enforced strict allowlist (`approved`, `cleared`, plus `verified-fictional-sample` only when `isSampleTemplate: true`). |
| **Medium** | Strict OPSEC mode skipped committer timezone/email, git worktrees, valid 56-char Tor v3 regex, and `_headers` placeholder check | `scripts/audit.mjs` (Claude) | Audited `%ae|%ai|%ce|%ci` via `git rev-parse --git-dir`, enforced `^http://[a-z2-7]{56}\.onion/?$`, and checked `infra/mirrors/_headers`. |
| **Medium** | Unquoted inline JS handlers (`onclick=x`), `<meta http-equiv="refresh">`, and inline `<style>` external URLs could bypass HTML audit | `scripts/audit.mjs` (Claude + Gemini) | Tightened regexes and added `<meta refresh>` + `<style>` external URL checks. |
| **Medium** | Nginx `Last-Modified` and output file mtimes leaked build/publish wall-clock timestamps | `infra/tor/nginx-onion.conf` & `scripts/build.mjs` (Claude + Gemini) | Added `if_modified_since off; add_header Last-Modified "" always;` and normalized all output file mtimes to `releaseDateUtc`. |
| **Medium** | Cloudflare Pages `_headers` treats `:splat` literally in `Onion-Location`; frontmatter `id` lacked strict slug validation | `infra/mirrors/_headers` & `scripts/build.mjs` (Gemini) | Fixed `Onion-Location` to canonical `.onion/` root and validated `meta.id` against `^[a-z0-9-]+$`. |

---

## Phase 7: Live Docker & VirtualBox Kernel Hardening Verification

Running the template end-to-end inside both Docker (`npm run lab:test`) and a real headless UEFI Debian 12 VirtualBox VM (`npm run vbox:up && npm run vbox:test`) caught and fixed one additional **real-world Linux OS hardening gap**:

- **Debian 12 `systemd-resolved` LLMNR Wildcard Sockets (`0.0.0.0:5355` / `[::]:5355`):** Caught by live `ss -tlnp` inspection inside the VirtualBox VM over authenticated Tor v3 Client-Auth SSH. Fixed in `infra/tor/ufw-hardening.sh` by writing `/etc/systemd/resolved.conf.d/99-no-llmnr.conf` (`LLMNR=no`, `MulticastDNS=no`) and restarting `systemd-resolved`, reducing the entire VM to **zero** wildcard listening sockets (only `127.0.0.1:22`, `127.0.0.1:8080`, and loopback DNS `127.0.0.53/54`).
| **Medium** | Live VirtualBox Debian 12 VM test exposed `systemd-resolved` listening on `0.0.0.0:5355` / `[::]:5355` (LLMNR) by default | `infra/tor/ufw-hardening.sh` (Live VirtualBox E2E) | Added `/etc/systemd/resolved.conf.d/99-no-llmnr.conf` (`LLMNR=no`, `MulticastDNS=no`) so zero non-loopback sockets exist inside the origin VM. |
