# Architecture Decision Records (ADRs)

This directory records the major architectural, security, legal, and operational decisions behind `censor-proof-site-template`. Every ADR documents the **Context**, **Decision**, **Consequences (Positive & Negative)**, and **Rejected Alternatives** so this repository doubles as an architecture case study.

| ID | Title | Status | Primary Risk Addressed |
| :--- | :--- | :--- | :--- |
| [ADR-001](ADR-001-threat-model-and-adversaries.md) | Threat Model & Adversary Boundaries (Thailand Context) | Accepted | Designing against real ISP/legal/forensic threats instead of imaginary ones |
| [ADR-002](ADR-002-static-zero-js-portability.md) | Static Zero-JS Architecture & Relative-Path Portability | Accepted | Tor "Safest" compatibility, IPFS path gateways, `file://`, zero tracking/RCE |
| [ADR-003](ADR-003-zero-dep-deterministic-build.md) | Zero-Dependency Deterministic Build Pipeline | Accepted | Supply-chain attacks, non-reproducible hashes, multi-mirror verification |
| [ADR-004](ADR-004-origin-mirror-decoupling.md) | Decoupled Canonical Origin vs. Burnable Front Doors | Accepted | DNS/SNI blocks, CDN subpoenas, **IPFS DHT & BitTorrent IP leaks** |
| [ADR-005](ADR-005-key-lifecycle-and-provenance.md) | Cryptographic Key Lifecycle, Provenance & Compromise Recovery | Accepted | Mirror spoofing, key loss, warrant canaries, seized `.onion` repudiation |
| [ADR-006](ADR-006-no-custom-intake-forms.md) | No Custom Leak Intake Forms (Delegate to GlobaLeaks / SecureDrop) | Accepted | Server-side vulnerabilities & source-exposing logging mistakes |
| [ADR-007](ADR-007-reconstructive-sanitization-gate.md) | Reconstructive Sanitization & Automated OPSEC Audit Gate | Accepted | PDF redaction leaks, EXIF/MIC dots, false security from regex scanners |
| [ADR-008](ADR-008-offline-mobile-and-retractions.md) | Offline-First Mobile Distribution, Mirror Rotation & Retractions | Accepted | LINE/iOS friction, dead links after blocking, immutable factual errors |
| [ADR-009](ADR-009-ai-data-boundary.md) | AI & Cloud Tool Data Boundary + Repo OPSEC | Accepted | Cloud LLM evidence leaks, git email / `+0700` timezone deanonymization |
