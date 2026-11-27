# ADR-009: AI & Cloud Tool Data Boundary + Repository OPSEC

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

Using AI coding assistants (like Gemini and Claude) and modern developer tooling accelerates building clean, well-tested infrastructure — *but* creates severe deanonymization hazards if misused during a real whistleblowing operation:
1. **Cloud AI Data Retention & Subpoenas:** Anything pasted into cloud LLM APIs or IDE assistants traverses third-party servers, may be logged for abuse monitoring, and is tied to paid developer accounts/IPs.
2. **Git Metadata Leaks:** Git commits embed `user.name`, `user.email`, and **local timezone offsets** (e.g., `+0700` immediately narrows the author to Thailand/Indochina!).
3. **PGP UID & Host Path Leaks:** Default GPG keys capture personal emails/hostnames, and build errors or hardcoded paths can leak `C:\Users\<realname>\` or `/home/<username>/`.

## Decision

1. **Hard AI & Cloud Data Boundary:**
   - **Permitted in Cloud AI:** Building, refactoring, auditing, and documenting this **public generic template** with 100% fictional sample content.
   - **STRICTLY FORBIDDEN in Cloud AI / Cloud IDEs / Cloud CI:** Real leaked evidence, unredacted names, source communications, real `.onion` private keys, real PGP private keys, real VPS IPs, or unpublished draft dossiers. All real case authoring, sanitization, building, and signing MUST happen **offline inside Tails OS or Qubes+Whonix**.
2. **Repository & Commit Hygiene:**
   - Provide an enforceable Git pre-commit hook template (`infra/git/pre-commit`) and audit mode (`node scripts/audit.mjs --strict-opsec`) that:
     - Blocks non-UTC commit timezones (`TZ=UTC` / `+0000` enforced for operational repos).
     - Flags personal email domains (`@gmail.com`, `@hotmail.com`, corporate domains) in git config/commits.
     - Scans built output for host path leaks (`C:\Users\`, `/Users/`, `/home/`, private RFC1918 IPs).
3. **Clear Operational Separation:**
   - Keep the **public template repo** (clean, generic, AI-assisted) completely separate from any **private operational content directory** stored exclusively on encrypted Tails Persistent Storage / LUKS USB.

## Consequences

- **Positive:** Lets activists and engineers benefit safely from AI-assisted SDLC for open-source defensive tooling without ever exposing real whistleblowers or evidence to cloud providers.
- **Positive:** Prevents subtle metadata leaks (`+0700` timestamps, personal git emails, Windows paths) from undermining otherwise strong technical anonymity.
- **Negative:** Requires discipline to switch to an offline Tails/Qubes environment before touching real material.

## Rejected Alternatives

- **Using cloud AI to summarize/redact real leaked documents:** Unacceptable confidentiality and subpoena risk; use local offline tools or human journalists in Tails instead.
- **Running builds in GitHub Actions with real evidence in a private repo:** Exposes real evidence, upload IPs, and billing identity to GitHub/Microsoft.
