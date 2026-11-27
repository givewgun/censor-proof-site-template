# ADR-008: Offline-First Mobile Distribution, Mirror Rotation & Correction/Retraction Policy

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

In Thailand, public discourse and document sharing happen overwhelmingly on **mobile phones** via **LINE, Facebook Messenger, Telegram, and X** — not desktop Tor Browser. Three harsh realities shape distribution:
1. **Mobile HTML Friction:** Raw `.html` files forwarded in LINE or opened on iOS Safari often render poorly or refuse to open inline, whereas compact **PDFs** and **single-file HTML/ZIP** (on Android/Desktop/Telegram/Signal) work reliably.
2. **Link Rot Under Active Blocking:** When Thai ISPs block a clearnet mirror URL, every link already shared on social media dies unless readers have an embedded mirror list and out-of-band update channel.
3. **Immutability vs. Thai Defamation Law:** Once an archive is pinned to IPFS and seeded on BitTorrent, **it cannot be deleted**. Under Thai Penal Code **s.326–330** and CCA **s.14**, an unverified or erroneous claim causes permanent legal and ethical harm that cannot be undone simply by editing a clearnet server.

## Decision

1. **Multi-Format Offline Artifacts (Target < 25 MB):**
   - `dist/offline/archive-offline.html`: Self-contained single-file HTML (inlined CSS, zero JS, internal anchor links) for Telegram, Signal, USB, and AirDrop.
   - `dist/offline/archive-printable.html`: Print-optimized edition (`@media print` layout with visual fingerprint + QR-friendly short mirror URLs) designed for one-step export to a compact **sanitized PDF** for LINE and iOS sharing (plus instructions to run Dangerzone/MAT2 on the generated PDF too!).
   - `dist/offline/archive-portable.zip`: Deterministic full site bundle for offline folders and BitTorrent seeding.
   - Document **Ceno Browser** (Android) so mobile users in censored networks can fetch and P2P-share cached clearnet mirrors even when direct access is blocked.
2. **Embedded Signed `mirrors.json` + Out-of-Band Rotation:**
   - Every build embeds `mirrors.json` (active `.onion`, IPFS CID, public gateway URLs, BitTorrent magnet, active clearnet mirrors, and deprecated/compromised mirror warnings) into both the site and offline packs.
   - New mirrors are announced out-of-band (Signal/Telegram broadcast channels, diaspora newsrooms, Nostr) alongside the **16-char Visual Archive Fingerprint**.
3. **Formal Pre-Publication Gate + Signed Superseding Manifests (Corrections / Retractions):**
   - Every case file requires `legalReviewStatus` and `publicInterestBasis` frontmatter fields checked by `audit.mjs`.
   - When an error is discovered after release, the publisher issues a new release whose `manifest.json` and `site.config.json` explicitly populate `supersedes` (referencing the prior release version + fingerprint) and `corrections[]`. The site renders a prominent top-of-page **Correction / Retraction Notice** in both Thai and English, and clearnet mirrors update immediately while canonical announcements mark the old CID/release as superseded.

## Consequences

- **Positive:** Regular Thai mobile users can read and forward the archive even if every clearnet URL is blocked within hours.
- **Positive:** Provides an honest, transparent, cryptographically signed mechanism for correcting mistakes in an immutable decentralized ecosystem.
- **Negative:** Producing the optional PDF/EPUB snapshot requires an extra print/export step (e.g., headless Chromium/LibreOffice inside Tails) + metadata scrub before sharing on LINE.

## Rejected Alternatives

- **Web-only archive (no offline packs):** Fails completely when ISPs block mirrors and chat-app users only share screenshots without verifiable source context.
- **Silent edits on clearnet mirrors:** Breaks hash consistency with IPFS/BitTorrent and looks like mirror tampering to verifiers.
