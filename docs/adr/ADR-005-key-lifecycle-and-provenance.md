# ADR-005: Cryptographic Key Lifecycle, Provenance & Compromise Recovery

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

Once an archive is mirrored by third parties and redistributed over IPFS, BitTorrent, and chat apps, adversaries can publish **tampered lookalike mirrors** that alter facts to discredit the investigation or inject malicious links. Conversely, if the publisher's `.onion` server is seized by hosting providers or law enforcement, the adversary obtains the `.onion` private key and can serve poisoned pages from the original `.onion` address!

## Decision

We establish a **PGP-anchored Trust Root** completely independent of any hosting server or `.onion` private key:

1. **Offline Primary PGP Key + Online Signing Subkey:**
   - Generate an **Ed25519** primary PGP key inside an air-gapped Tails OS session with a **pseudonymous UID** (zero real names, emails, or Thai timezone clues; e.g., `Archive Release Key <release@archive.invalid>`).
   - Keep the primary certification key strictly offline (encrypted LUKS USB). Use a time-limited signing subkey (e.g., 1-year expiry) for signing `SHA256SUMS` and `mirrors.json`.
2. **Multi-Jurisdiction Revocation Certificates:**
   - Generate a PGP revocation certificate at key creation time and store encrypted copies with at least two trusted custodians in **different jurisdictions outside Thailand**, so the key can be revoked if the operator is compromised or incapacitated.
3. **Two-Tier Verification:**
   - **Full Cryptographic Verification:** Every release publishes `SHA256SUMS` + `SHA256SUMS.asc` + `mirrors.json` + `mirrors.json.asc`. Journalists and mirror operators verify via `gpg --verify` and `node scripts/verify.mjs`.
   - **Visual Archive Fingerprint:** Every generated HTML page and offline bundle prominently displays the deterministic 16-char visual fingerprint (`FP: XXXX-XXXX-XXXX-XXXX`) derived from the sorted build hashes, plus the full PGP fingerprint, so regular mobile readers can compare it against out-of-band announcements.
4. **Signed Warrant Canary:**
   - `site.config.json` includes a dated **Warrant Canary** statement rendered on the verification page and covered by `SHA256SUMS.asc`. Failure to refresh the dated canary (or its removal) signals potential coercion/compromise.
5. **Seized `.onion` Repudiation Protocol:**
   - Because the `.onion` private key lives on the VPS while the PGP key lives strictly offline, if the VPS is seized, the publisher issues a **PGP-signed repudiation statement** (`status: "compromised"` in `mirrors.json.asc` + out-of-band channels) instructing readers and mirrors to abandon the old `.onion` immediately and migrate to a freshly generated `.onion` address.

## Consequences

- **Positive:** Server compromise does NOT equal cryptographic identity compromise; poisoned mirrors and seized `.onion` hosts can be provably repudiated.
- **Positive:** Visual fingerprints bring tamper detection to non-technical mobile users without requiring GPG installation.
- **Negative:** Losing the offline primary key permanently prevents signing future updates under the same identity (mitigated by encrypted cold backups + revocation custodians).

## Rejected Alternatives

- **Relying solely on `.onion` URL as trust root:** Fails catastrophically if the VPS hypervisor/disk is seized.
- **Storing PGP signing key on the VPS or CI/CD (GitHub Actions):** Completely defeats trust separation; a single server or CI breach allows forging authentic-looking releases.
