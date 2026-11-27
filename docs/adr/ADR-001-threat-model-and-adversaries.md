# ADR-001: Threat Model & Adversary Boundaries (Thailand Context)

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

Anti-corruption publishing platforms frequently fail because they optimize for the wrong adversary — for example, investing heavily in exotic cryptography while ignoring Thai ISP SNI blocking, criminal defamation subpoenas against CDN accounts, or insider document forensics.

In Thailand and comparable jurisdictions, a public-interest archive faces **five distinct adversaries**:
1. **State Telecom Regulators & ISPs (MDES / NBTC):** Court-ordered DNS poisoning, TLS SNI / DPI connection resets, IP blackholing, and mandatory ISP traffic-log retention.
2. **SLAPP & Criminal Defamation Litigants:** Thai Penal Code **s.326–328** (criminal defamation — where truth alone is insufficient without proving public interest under **s.330**), Computer Crime Act **s.14**, and **s.112** (severe criminal liability for monarchy-related claims). Litigants aggressively weaponize abuse complaints and subpoenas against domain registrars, GitHub, Cloudflare, and local mirror volunteers.
3. **Hosting & CDN Providers:** Access to VPS RAM/disk, subscriber billing/KYC records, and visitor access logs; routine compliance with legal takedowns and abuse tickets.
4. **Insider Forensic Investigators:** Internal DMS/print logs, canary traps, color-laser yellow MIC tracking dots, PDF redaction leaks, stylometry, and narrow suspect pools.
5. **Opportunistic Attackers / Disinformation Actors:** Volumetric DDoS and spoofed mirrors altered to discredit the archive or serve malware.

## Decision

We design the template explicitly around **defense-in-depth across all five adversary classes**, prioritizing:
1. **Publisher anonymity** via strict separation of anonymous canonical origins from KYC clearnet infrastructure.
2. **Reader safety & accessibility** via zero-tracking static output, clear Thai/English safety warnings, and mobile-friendly offline packs.
3. **Legal & ethical defensibility** via a mandatory pre-publication fact-check / public-interest attestation gate and formal correction/retraction manifests, plus an explicit rule that **people residing in Thailand must NOT operate clearnet mirrors or seed torrents**.
4. **Honest threat communication** — printing an explicit limitation warning in the README and on every audit run so no operator treats a green build as total immunity.

## Consequences

- **Positive:** Every engineering decision maps directly to a concrete real-world censorship or deanonymization vector rather than security theater.
- **Positive:** Protects well-meaning local volunteers from accidentally incriminating themselves by hosting mirrors inside Thailand.
- **Negative:** Raises operational discipline required before publishing (cannot "push straight from a personal laptop to GitHub Pages").

## Rejected Alternatives

- **Generic "darknet-only" threat model:** Fails ordinary citizens on Thai mobile networks who will never install Tor Browser.
- **Generic "clearnet blog behind Cloudflare" threat model:** Fails immediately upon court-ordered ISP SNI block or registrar/CDN abuse subpoena.
