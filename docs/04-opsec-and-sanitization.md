# 04 — OPSEC, Document Sanitization & Pre-Publication Legal Checklist

> **Core Reality:** In real-world whistleblowing compromises, cryptography almost never fails. People get caught via **payment trails, unstripped document metadata, fake PDF redactions, canary traps, printer yellow dots, IPFS/torrent IP leaks, git timezone leaks, or telling someone they trust.**

---

## 1. Operational Environment & Zero Cross-Contamination

1. **Dedicated Amnesic OS:** Perform all real archive editing, sanitization, building, and Tor administration exclusively inside **Tails OS** (live USB) or **Qubes OS + Whonix**.
2. **Zero Personal Cross-Contamination:**
   - Never log into personal Gmail, LINE, Facebook, GitHub, banking, or work accounts inside your anonymous OS.
   - Never search for, visit, or share your own archive from your personal phone, home Wi-Fi, or work computer.
   - Never tell friends, family, or coworkers that you are involved.
3. **Anonymous Funding (If Renting VPS/Seedbox):**
   - Never pay with a Thai bank card, PromptPay, PayPal, or Bitcoin bought on a KYC exchange (e.g., Bitkub/Binance) without understanding chain analysis.
   - Use **Monero (XMR)** acquired privately and sent from a self-custodied wallet inside Tails/Whonix to a no-KYC offshore host.
4. **Timing & Timezone Hygiene:**
   - Work and commit strictly in **UTC (`TZ=UTC`)**. Never leak `+0700` timestamps in git commits, document dates, or regular Bangkok-evening upload schedules.
   - Randomize publication times across UTC hours.

---

## 2. Reconstructive Document Sanitization (Why Scrubbing Alone Fails)

Simply running `exiftool -all=` is **NOT enough**:
- Black boxes drawn over PDF text in Preview/Acrobat often leave the **underlying text selectable and copyable**.
- PDFs retain deleted edits inside **incremental save revisions (`%%EOF`)** and embedded page thumbnails.
- Office files (`.docx`, `.xlsx`, `.pptx`) hide author names, internal SharePoint URLs, revision histories, and embedded formulas.
- Color laser printers print microscopic yellow **Machine Identification Code (MIC) dots** encoding the printer's exact serial number, date, and time!

### Mandatory Reconstruction Workflow (Offline in Tails)

| Input Type | What to Do | Result Allowed in `content/evidence/` |
| :--- | :--- | :--- |
| **PDF / Word / Excel / PowerPoint** | 1. Flatten visual redactions carefully.<br>2. Pass through **Dangerzone** (renders pages inside a sandbox to raw pixels, destroys all live text/metadata/revisions, rebuilds clean PDF/A).<br>3. If scanned from a color printout, convert to **grayscale / high-contrast monochrome** first to neutralize yellow MIC printer dots.<br>4. Run `mat2` on the output. | `EVD-###.pdf` |
| **Photos / Screenshots** | 1. Crop out taskbar clocks, Wi-Fi icons, desktop backgrounds, and reflections.<br>2. Re-encode pixels (`magick in.jpg -strip out.png`) to destroy EXIF, GPS, camera serial, and embedded thumbnails.<br>3. Run `mat2` on the output. | `EVD-###.png` or `EVD-###.jpg` |
| **Tables / Text Data** | Extract verified figures into clean UTF-8 **`.csv`**, **`.json`**, or **`.txt`** re-typed in neutral language. | `EVD-###.csv` / `.json` / `.txt` |

5. **Opaque Filenames:** Rename every artifact to `EVD-001.pdf`, `EVD-002.png`, etc. Never keep original filenames.
6. **Record Attestation:** Compute `sha256sum` and add the entry to `content/evidence/sanitized-manifest.json`.

---

## 3. Forensic Threats Automated Tools CANNOT Detect

Before publishing ANY raw internal document, ask these four human-judgment questions:

1. **Narrow Suspect Pool:** Did fewer than ~15 people have access to this file, or does an internal SharePoint/DMS log record who downloaded or printed it? If yes, **do not publish the raw document** — pass it to an investigative journalist via SecureDrop/GlobaLeaks to corroborate from independent public records instead.
2. **Canary Traps ("Barium Meals"):** Could unique phrasing, subtle spacing, synonym choices, or slightly rounded numbers inside the document identify which executive/office received that copy?
3. **Stylometry:** Does your own prose use distinctive Thai/English idioms, punctuation habits, or technical vocabulary? Keep archive text short, clinical, factual, and copy-edited by a second reviewer if possible.
4. **Physical Surveillance:** If using public Wi-Fi, beware CCTV cameras, license-plate readers, and carrying your personal smartphone (cell-tower co-location!).

---

## 4. PGP Key Lifecycle & Compromise Recovery (ADR-005)

1. **Generate Offline Primary Key (Ed25519) in Air-Gapped Tails:**
   - Use a pseudonymous UID: `Archive Release Key <release@archive.invalid>` (zero real name/email/region).
   - Add a separate **Signing Subkey** (1-year expiry) for day-to-day release signing; keep the primary master key offline on an encrypted backup USB.
2. **Create Revocation Certificates Immediately:**
   ```bash
   gpg --output revoke.asc --gen-revoke "<KEY_ID>"
   ```
   Split or store encrypted copies with at least two trusted custodians in **different countries outside Thailand**.
3. **Refresh the Warrant Canary** (`content/site.config.json`) on every release.
4. **Never put private PGP keys on any VPS, GitHub repo, or cloud drive.**

---

## 5. AI & Cloud Tool Data Boundary (ADR-009)

- **Allowed:** Using cloud AI (Gemini/Claude) to build, refine, or audit this **generic open-source template**.
- **STRICTLY FORBIDDEN:** Pasting real leaked documents, real corrupt officials' unpublished files, unredacted names, source emails, VPS IPs, or private keys into ANY cloud LLM, IDE copilot, or cloud CI pipeline.
- Install the OPSEC git hook on any operational repository:
  ```bash
  cp infra/git/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
  git config user.name "Archive Maintainer"
  git config user.email "release@archive.invalid"
  ```
  Always commit with `TZ=UTC git commit -m "..."`.

---

## 6. Pre-Publication Legal & Fact-Check Gate (Thailand Context)

Because IPFS and BitTorrent records are **immutable**, verify every dossier before running `npm run build`:
- [ ] **Primary Corroboration:** Every key factual claim is backed by at least two independent documents or verifiable public procurement/registry records.
- [ ] **Public-Interest Basis (Thai Penal Code s.330):** The dossier explicitly documents why disclosure serves the public interest (e.g., public tax funds, public safety, environmental harm) rather than private malice. Under Thai Penal Code **s.326–328**, truth alone is NOT a complete legal defense without public interest.
- [ ] **Computer Crime Act (s.14) Hygiene:** Zero fabricated, altered, or misleading figures; clearly distinguish verified facts from analytical inferences.
- [ ] **Scope & Severity Awareness:** Understand extreme legal exposure under Thai law (including s.112) and ensure no local Thailand-based volunteer is exposed as a clearnet mirror operator.
- [ ] **Right of Reply / Correction Readiness:** You have a transparent correction process ready (`corrections[]` + `supersedes` manifest) if any factual error is later identified.
