# ADR-006: No Custom Leak Intake Forms (Delegate to GlobaLeaks / SecureDrop)

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

When building a whistleblowing portal, operators are often tempted to add a "Submit a Tip" file-upload form or contact endpoint directly onto the publication website. In practice, custom upload forms are one of the highest-risk mistakes in public-interest security:
- A single file-upload, MIME-parsing, SSRF, or path-traversal bug can give an attacker full shell access to the server.
- Dynamic servers write temporary files, crash logs, and HTTP metadata that can expose tipsters' IPs, timestamps, or raw unstripped documents.
- Submitting through a clearnet HTTPS form leaves ISP DNS/SNI logs tying a citizen's home/mobile IP to the submission timestamp.

## Decision

1. **This template contains ZERO forms, ZERO POST handlers, and ZERO backend code.** CSP explicitly enforces `form-action 'none'`.
2. **Tip intake is strictly delegated to audited, purpose-built software on separate infrastructure:**
   - **GlobaLeaks** (recommended for small/medium investigative teams and civil-society organizations; built-in Tor onion service, client-side PGP encryption, automated metadata hygiene).
   - **SecureDrop** (gold standard for major newsrooms with air-gapped journalistic workstations).
3. The archive's "Submit / Contact" section only links out to established investigative desks' SecureDrop/GlobaLeaks `.onion` portals (or the organization's separately deployed GlobaLeaks `.onion` instance) with instructions to use **Tails OS + Tor Browser**.

## Consequences

- **Positive:** Publication layer remains 100% static with near-zero attack surface and zero risk of losing unencrypted source submissions if a mirror or origin is seized.
- **Positive:** Clear separation of concerns between **Intake** (confidential, high-risk, Tor-only) and **Publication** (public, maximally replicated).
- **Negative:** Teams that need both intake and publication must maintain two independent systems (a feature, not a bug).

## Rejected Alternatives

- **Cloudflare Workers / serverless form forwarding to email/Telegram:** Leaks submitter IP, metadata, and raw unstripped attachments through third-party cloud logs and non-E2EE email/Telegram servers.
- **Custom Node/Python upload endpoint on the `.onion` VPS:** High exploit risk; reinvents decades of hard-won SecureDrop/GlobaLeaks security engineering poorly.
