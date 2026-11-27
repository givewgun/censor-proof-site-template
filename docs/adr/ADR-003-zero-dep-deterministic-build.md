# ADR-003: Zero-Dependency Deterministic Build Pipeline

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

Most static site generators pull 300–1,500 transitive npm packages (`node_modules`). In a high-stakes whistleblowing context, that creates three unacceptable risks:
1. **Supply-Chain Compromise:** A malicious transitive dependency (or compromised postinstall script) running inside the publisher's build environment could exfiltrate evidence, watermark output, or break offline Tails builds.
2. **Air-Gapped Friction:** Running `npm install` on an offline or Tor-only Tails USB is slow, brittle, and error-prone.
3. **Non-Deterministic Outputs:** Timestamps (`new Date()`), OS-dependent path separators (`\` vs `/`), non-sorted `readdir()` order, and variable ZIP file `mtime` headers cause two builds of the exact same content to produce different SHA-256 hashes — breaking independent verification and IPFS CID stability.

## Decision

1. **Zero Runtime / Build Dependencies:** All build, audit, ZIP-packaging, Markdown parsing, and verification scripts use **only built-in Node.js (>= 20) modules** (`node:fs`, `node:path`, `node:crypto`, `node:zlib`, `node:http`, `node:test`). Zero `node_modules` required.
2. **Deterministic Output Guarantees:**
   - All file traversals are lexicographically sorted using POSIX `/` paths.
   - All text outputs use normalized LF (`\n`) line endings and UTF-8 without BOM.
   - Build timestamps in output artifacts derive **only** from `site.config.json`'s explicit `releaseDateUtc` (never wall-clock `Date.now()`).
   - Portable ZIP archives (`scripts/lib/zip.mjs`) use a fixed DOS timestamp (`1980-01-01 00:00:00 UTC`), fixed permissions (`0644`), sorted entries, and deterministic deflate compression.
3. **Self-Testing Reproducibility:** `scripts/audit.mjs` builds the site twice into separate temporary directories and asserts byte-for-byte SHA-256 identity across every generated artifact, including the `.zip`.

## Consequences

- **Positive:** Any security reviewer can audit the entire toolchain (~1,000 lines of plain JS) in minutes.
- **Positive:** Runs completely offline on Tails OS with a single Node binary — no internet access needed to build.
- **Positive:** Independent journalists given the same `content/` folder can reproduce the exact `SHA256SUMS` and IPFS CID.
- **Negative:** Custom Markdown parser supports a well-defined, safe subset of Markdown (headings, paragraphs, lists, tables, blockquotes, code blocks, bold/italic, links) rather than every obscure CommonMark edge case — which is actually a security advantage (no raw HTML injection!).

## Rejected Alternatives

- **Hugo / Zola:** Great single-binary SSGs, but require downloading platform-specific binaries and still need external scripts for our OPSEC audit gate, deterministic ZIP, and sanitization attestation checks.
- **Eleventy / Vite / Astro:** Heavy `node_modules` tree unsuitable for minimal-trust air-gapped environments.
