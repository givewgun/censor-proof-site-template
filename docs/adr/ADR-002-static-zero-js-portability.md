# ADR-002: Static Zero-JS Architecture & Relative-Path Portability

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

A censorship-resistant archive must survive simultaneously on:
- **Tor Browser in "Safest" security level** (where JavaScript is completely disabled to block browser 0-days).
- **IPFS Path Gateways** (`https://ipfs.io/ipfs/<CID>/cases/case-001.html`), where the site is mounted under a deep subpath rather than `/`.
- **Offline USB / ZIP folders (`file://`)**, where there is no web server to resolve `/dir/` to `/dir/index.html` or rewrite root-absolute paths.
- **Hostile or untrusted mirrors**, where any dynamic backend or third-party script creates RCE, tracking, or tampering vectors.

## Decision

1. **100% Static HTML5 + Local CSS, Zero JavaScript:** No client-side JS frameworks, no search JS required for core navigation, no inline `<script>` tags. Even interactive-feeling elements (collapsible sections, language switchers, TOC) use pure HTML (`<details>/<summary>`, separate `/en` & `/th` static pages, CSS `:target`).
2. **Zero External Resources:** Zero Google Fonts, CDNs, analytics, embedded YouTube/X iframes, or remote images. Typography uses local system fonts with strong Thai script legibility (`Noto Sans Thai`, `Thonburi`, `Leelawadee UI`, `Tahoma`, system-ui).
3. **Strictly Relative Links with Explicit `index.html`:** Every asset (`./assets/main.css`, `../assets/main.css`) and page link (`./cases/case-001.html`, `../th/index.html`) is strictly relative and explicitly names `.html` files so `file://` double-click browsing works on every OS.
4. **Enforced by CSP & Automated Audit:** Server configs ship `Content-Security-Policy: default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; ...`, and `scripts/audit.mjs` fails the build if any `<script>`, external resource URL, or root-absolute internal link exists.

## Consequences

- **Positive:** Virtually zero server-side attack surface (no DB, no PHP/Node runtime, no SSRF to leak origin IP).
- **Positive:** Identical bundle works on Tor `.onion`, IPFS path/subdomain gateways, GitHub Pages, Cloudflare Pages, S3 buckets, and offline USB drives with zero reconfiguration.
- **Positive:** Tiny payload size — fast over high-latency Tor circuits and Thai rural mobile connections.
- **Negative:** No full-text client-side fuzzy search without JS (mitigated by clean static Case Index, tags/categories, timeline view, and browser `Ctrl+F` on the single-file offline HTML page).

## Rejected Alternatives

- **Next.js / React SPA / Astro with hydration:** Breaks in Tor "Safest" mode, introduces huge `node_modules` supply chains, and often assumes root-relative `/` routing.
- **WordPress / Ghost / Custom API:** Massive RCE & database-leak attack surface; server-side SSRF routinely deanonymizes Tor `.onion` origins.
