# ADR-007: Reconstructive Sanitization & Automated OPSEC Audit Gate

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

Leaked files are the #1 source of whistleblower deanonymization. Simple metadata stripping or byte-pattern scanning is **necessary but dangerously insufficient**:
- Drawing a black rectangle over text in a PDF leaves the underlying selectable text completely intact.
- PDFs retain deleted objects and earlier revisions via incremental saves (`%%EOF` history), embedded thumbnails, and OCR text layers.
- Word/Excel/PowerPoint files embed revision history, author/company domains, printer names, and cached formulas.
- Scanned color documents may contain invisible yellow **Machine Identification Code (MIC) printer tracking dots** encoding printer serial numbers and print timestamps.
- Original filenames (e.g., `Somchai_Budget_Draft_Final.pdf`) leak department, role, or recipient identity.

## Decision

We adopt a **Two-Layer Defense: Reconstructive Sanitization + Fail-Closed Automated Audit Gate**:

1. **Mandatory Reconstructive Sanitization (Before Entering `content/evidence/`):**
   - **Documents (PDF, DOCX, XLSX, PPTX):** Never publish raw originals. Convert every document through **Dangerzone** (which renders pages inside an isolated sandbox into raw pixels, strips all hidden layers/metadata/scripts/live redaction text, and rebuilds a clean PDF/A). For printed scans, convert to grayscale/high-contrast bitmap to disrupt yellow MIC tracking dots before rebuilding.
   - **Images:** Re-encode from raw pixel data (e.g., `magick input.jpg -strip -colorspace Gray output.png` + `mat2`) to destroy EXIF, GPS, XMP, ICC profiles, and embedded thumbnails.
   - **Allowlisted File Types Only:** Only `.pdf`, `.png`, `.jpg`, `.txt`, `.csv`, `.json` are permitted in `content/evidence/`. Raw Office binaries (`.docx`, `.xlsx`, `.pptx`) are **hard-blocked** by the audit gate.
   - **Opaque Filenames Only:** Evidence filenames must follow neutral opaque IDs (`EVD-001.pdf`, `EVD-002.png`) — no personal names, department names, or original file slugs.
2. **Mandatory Sanitization & Legal Attestation (`content/evidence/sanitized-manifest.json`):**
   - Every file in `content/evidence/` MUST have an entry in `sanitized-manifest.json` recording its exact SHA-256 hash, the reconstructive sanitization method used (e.g., `dangerzone-pdf-rebuild + mat2`), whether visual redactions were flattened, and a pre-publication legal/fact-check sign-off flag.
   - Unattested or hash-mismatched evidence files cause `scripts/build.mjs` and `scripts/audit.mjs` to **fail closed**.
3. **Automated Second-Line Byte Scanner (`scripts/lib/metadata-scanner.mjs`):**
   - As defense-in-depth, `scripts/audit.mjs` scans every evidence file for residual JPEG EXIF/APP1/XMP/GPS markers, PNG `tEXt`/`iTXt`/`zTXt` author/software chunks, PDF `/Author`/`/Creator`/`/Producer`/`/CreationDate` headers, and ZIP/Office `docProps/core.xml` signatures.
4. **Anti-False-Confidence Banner:**
   - Every audit run explicitly prints: *"A green audit proves build integrity and checks known metadata patterns — it does NOT guarantee absence of canary traps, MIC printer dots, stylometry, or factual errors."*

## Consequences

- **Positive:** Eliminates the classic "fake black-box PDF redaction" and raw Office metadata disasters.
- **Positive:** Forces an intentional human sanitization & legal checkpoint for every single artifact published.
- **Negative:** Rasterized PDFs are larger than vector text PDFs (manage resolution — e.g., 150 DPI grayscale — to stay within the 25 MB offline pack budget).

## Rejected Alternatives

- **Pattern-scanning / `exiftool -all=` alone:** Misses live text behind PDF redaction boxes, incremental save history, and embedded Office XML artifacts.
- **Publishing raw original files "for authenticity":** Routinely burns sources; instead, corroborate and verify via journalists before publishing reconstructed artifacts + structured CSV/JSON extracts.
