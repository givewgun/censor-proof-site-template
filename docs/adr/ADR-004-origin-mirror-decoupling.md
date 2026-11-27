# ADR-004: Decoupled Canonical Origin vs. Burnable Front Doors (Including IPFS/Torrent IP-Leak Mitigation)

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

Censorship resistance faces a classic tension:
- **Tor `.onion`, IPFS, and BitTorrent** resist DNS seizure and takedowns, but ordinary Thai citizens on mobile phones use Chrome, Safari, or LINE's in-app browser and won't install Tor just to click a link.
- **Clearnet HTTPS mirrors** (Cloudflare Pages, Netlify, GitHub Pages) are easy to open and leverage **Collateral Freedom** (censors hesitate to block major shared CDNs), *but* those platforms enforce KYC/phone verification, honor abuse/legal takedowns, and may disclose account details to complainants.

Furthermore, a dangerous and commonly overlooked OPSEC trap exists in decentralized protocols:
- **IPFS DHT Leak:** Running `ipfs add` / pinning from a home machine or Thai IP immediately advertises your real public IP address in the global IPFS DHT provider table.
- **BitTorrent Swarm Leak:** Seeding a `.torrent` from a personal connection exposes your real IP to every peer and monitor in the swarm — and routing BitTorrent over Tor both harms the Tor network and still leaks real IPs via UDP trackers/DHT.

## Decision

We strictly separate **Canonical Origin** from **Burnable Front Doors** across isolated operational roles:

1. **Canonical Origin (Publisher — Anonymous & Offshore Only):**
   - **Tor v3 `.onion`:** Hardened static zero-log Nginx bound strictly to `127.0.0.1` on an offshore, non-KYC, Monero-funded VPS. Administered solely via a separate Tor v3 **client-authorized** SSH onion service; UFW blocks all inbound clearnet traffic.
   - **IPFS & BitTorrent Publishing Rule:** **NEVER pin to IPFS or seed BitTorrent from a home IP, workplace IP, or any IP inside Thailand.** Export a `.car` archive or `.zip` over Tor to a dedicated **offshore anonymous VPS / seedbox** (or non-KYC pinning service funded via XMR), and pin/seed exclusively from offshore infrastructure.
2. **Burnable Front Doors (Independent Diaspora / Journalist Mirror Operators — Outside Thailand):**
   - Static bundles are pulled *publicly* from the canonical origin (zero shared accounts, zero API keys, zero shared VPS IPs) and hosted on disposable Collateral Freedom platforms (Cloudflare Pages, Netlify, GitHub Pages, Archive.org, Caddy VPS).
   - Clearnet mirrors set `Onion-Location: http://<v3>.onion$request_uri` so Tor Browser & Brave auto-upgrade, and enable **ECH (Encrypted Client Hello)** where supported by the CDN to defeat Thai ISP TLS SNI inspection.
   - Treat every clearnet mirror and CDN account as **expendable/burnable**; never host clearnet and the private `.onion` on the same server.
   - **Never** use third-party Tor-to-Web clearnet proxies (`onion.ly`, etc.) — they act as a MitM and are routinely blocked.

## Consequences

- **Positive:** Eliminates the #1 way anonymous publishers accidentally deanonymize themselves (KYC clearnet accounts, IPFS DHT leaks, BitTorrent swarm IP leaks).
- **Positive:** Taking down any single mirror or blocking a domain leaves the canonical archive intact and immediately re-mirrorable in minutes.
- **Negative:** Requires coordination with trusted independent mirror operators or journalists outside Thailand for clearnet reach.

## Rejected Alternatives

- **Hosting clearnet HTTPS + `.onion` on the same VPS:** Exposes the `.onion` server's real IP via TLS cert logs, timing/uptime correlation, and server headers.
- **Publisher registering Cloudflare/GitHub directly:** Phone/card verification and abuse-complaint subpoenas directly link the publisher to the archive.
- **Seeding BitTorrent over Tor:** Unsupported by Tor, degrades network for everyone, and leaks real IPs via BitTorrent protocol extensions.
