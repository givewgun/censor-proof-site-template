import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from './build.mjs';
import { listFilesDeterministic, normalizeLf, readNormalizedText, sha256Buffer } from './lib/fs-utils.mjs';
import { parseFrontmatter } from './lib/markdown.mjs';
import { scanEvidenceFile, scanTextForLocalPathLeaks } from './lib/metadata-scanner.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');

const MANDATORY_OPSEC_BANNER = `
================================================================================
IMPORTANT OPSEC LIMITATION WARNING (ADR-001 / ADR-007):
A green audit verifies deterministic build integrity, zero external trackers,
relative-path portability, and checks known metadata patterns.
It DOES NOT guarantee source anonymity, absence of canary traps, absence of
printer MIC yellow dots, stylometric safety, or legal/factual accuracy.
Always perform reconstructive sanitization (Dangerzone + MAT2) and independent
fact/legal review offline in Tails/Whonix before any real release.
================================================================================`;

const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'yahoo.com',
  'icloud.com',
  'me.com'
];

export function auditSite({ rootDir = DEFAULT_ROOT, strictOpsec = false } = {}) {
  const errors = [];
  const warnings = [];

  const contentDir = path.join(rootDir, 'content');
  const config = JSON.parse(readNormalizedText(path.join(contentDir, 'site.config.json')));

  // 1. Reproducibility check: build twice into isolated temp directories and compare every file hash
  const tmpBase = mkdtempSync(path.join(os.tmpdir(), 'censor-proof-audit-'));
  const buildDirA = path.join(tmpBase, 'build-a');
  const buildDirB = path.join(tmpBase, 'build-b');

  let resultA;
  try {
    resultA = buildSite({ rootDir, outDir: buildDirA });
    const resultB = buildSite({ rootDir, outDir: buildDirB });

    const filesA = listFilesDeterministic(buildDirA);
    const filesB = listFilesDeterministic(buildDirB);

    if (filesA.length !== filesB.length) {
      errors.push(`Non-deterministic file count between builds (${filesA.length} vs ${filesB.length}).`);
    } else {
      for (let i = 0; i < filesA.length; i++) {
        const hashA = sha256Buffer(readFileSync(filesA[i].fullPath));
        const hashB = sha256Buffer(readFileSync(filesB[i].fullPath));
        if (filesA[i].relPath !== filesB[i].relPath || hashA !== hashB) {
          errors.push(`Non-deterministic output detected at "${filesA[i].relPath}".`);
        }
      }
    }

    if (resultA.visualFingerprint !== resultB.visualFingerprint) {
      errors.push('Visual fingerprint differed across identical rebuilds.');
    }

    // 2. HTML & CSS Censorship-Resistance & Zero-Tracker Checks
    const siteFiles = listFilesDeterministic(resultA.siteDir);
    for (const sf of siteFiles) {
      if (sf.relPath.endsWith('.html')) {
        const html = readFileSync(sf.fullPath, 'utf8');

        // Zero <script> tags (Tor Browser Safest compatibility + zero XSS/tracking)
        if (/<script\b/i.test(html)) {
          errors.push(`[Zero-JS Violation] <script> tag found in ${sf.relPath}.`);
        }

        // Zero inline JS event handlers (quoted OR unquoted, e.g. onclick=alert(1))
        if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html)) {
          errors.push(`[Zero-JS Violation] Inline JS event handler found in ${sf.relPath}.`);
        }

        // Zero meta refresh redirects
        if (/<meta\b[^>]*http-equiv\s*=\s*["']?refresh\b/i.test(html)) {
          errors.push(`[Security Violation] <meta http-equiv="refresh"> found in ${sf.relPath}.`);
        }

        // Zero external CSS imports/urls inside inline <style> blocks
        const styleBlockRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
        let styleMatch;
        while ((styleMatch = styleBlockRe.exec(html)) !== null) {
          const inlineCss = styleMatch[1];
          if (/@import\b/i.test(inlineCss) || /url\s*\(\s*["']?(?:https?:)?\/\//i.test(inlineCss)) {
            errors.push(`[External Asset Leak] External @import or url() inside <style> in ${sf.relPath}.`);
          }
        }

        // Zero forms (ADR-006: no custom intake forms)
        if (/<form\b/i.test(html)) {
          errors.push(`[ADR-006 Violation] <form> element found in ${sf.relPath}. Delegate intake to GlobaLeaks/SecureDrop.`);
        }

        // Zero external asset loads in link/img/iframe/source/object/embed/video/audio
        const assetUrlRe = /<(?:link|img|iframe|source|object|embed|video|audio)\b[^>]*\b(?:src|href|data)\s*=\s*["']([^"']+)["']/gi;
        let match;
        while ((match = assetUrlRe.exec(html)) !== null) {
          const url = match[1].trim();
          if (/^(?:https?:)?\/\//i.test(url)) {
            errors.push(`[External Asset Leak] External resource "${url}" loaded in ${sf.relPath}.`);
          }
          if (url.startsWith('/')) {
            errors.push(`[Portability Violation] Root-absolute asset path "${url}" in ${sf.relPath} breaks IPFS path gateways and file://.`);
          }
        }

        // Check all anchor hrefs: no root-absolute internal links, no javascript: URLs, and verify local relative targets exist
        const anchorRe = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
        while ((match = anchorRe.exec(html)) !== null) {
          const href = match[1].trim();
          if (/^javascript:/i.test(href)) {
            errors.push(`[Security Violation] javascript: URI found in ${sf.relPath}.`);
          } else if (href.startsWith('/')) {
            errors.push(`[Portability Violation] Root-absolute link "${href}" in ${sf.relPath} breaks IPFS path gateways and file://.`);
          } else if (!href.startsWith('#') && !/^https?:\/\//i.test(href)) {
            // Verify relative file target exists on disk!
            const targetPath = path.resolve(path.dirname(sf.fullPath), href.split('#')[0]);
            if (!existsSync(targetPath)) {
              errors.push(`[Broken Relative Link] "${href}" in ${sf.relPath} does not resolve to an existing file.`);
            }
          }
        }

        // Scan rendered HTML for accidental local host path leaks
        const pathLeaks = scanTextForLocalPathLeaks(html);
        for (const leak of pathLeaks) {
          errors.push(`[Host Path Leak] ${leak} found in ${sf.relPath}.`);
        }
      }

      if (sf.relPath.endsWith('.css')) {
        const css = readFileSync(sf.fullPath, 'utf8');
        if (/@import\b/i.test(css)) {
          errors.push(`[External Asset Leak] @import rule found in ${sf.relPath}.`);
        }
        if (/url\s*\(\s*["']?(?:https?:)?\/\//i.test(css)) {
          errors.push(`[External Asset Leak] External url() found in ${sf.relPath}.`);
        }
      }
    }

    // 3. Offline bundle size budget check (25 MB default for LINE/Telegram/Signal forwarding)
    const budgetBytes = (config.offlineBudgetMb || 25) * 1024 * 1024;
    const { singleHtmlBytes, portableZipBytes } = resultA.manifest.offlineArtifacts;
    if (singleHtmlBytes > budgetBytes) {
      warnings.push(`Single-file offline HTML (${(singleHtmlBytes / 1048576).toFixed(2)} MB) exceeds ${config.offlineBudgetMb} MB mobile chat budget.`);
    }
    if (portableZipBytes > budgetBytes) {
      warnings.push(`Portable ZIP (${(portableZipBytes / 1048576).toFixed(2)} MB) exceeds ${config.offlineBudgetMb} MB mobile chat budget.`);
    }

    // 4. Evidence sanitization scanner (defense-in-depth over content/evidence/)
    const evidenceDir = path.join(contentDir, 'evidence');
    const evidenceFiles = listFilesDeterministic(evidenceDir).filter(
      (f) => f.relPath !== 'sanitized-manifest.json'
    );
    for (const ef of evidenceFiles) {
      const buf = readFileSync(ef.fullPath);
      const scanIssues = scanEvidenceFile(ef.relPath, buf);
      for (const issue of scanIssues) {
        errors.push(`[Evidence Metadata Gate] ${ef.relPath}: ${issue}`);
      }
    }

    // 5. Legal & Public-Interest Pre-Publication Gate on every case file (strict allowlist)
    const allowedLegalStatuses = new Set(['approved', 'cleared']);
    if (config.isSampleTemplate) {
      allowedLegalStatuses.add('verified-fictional-sample');
    }
    const casesDir = path.join(contentDir, 'cases');
    const caseFiles = listFilesDeterministic(casesDir).filter((f) => f.relPath.endsWith('.md'));
    for (const cf of caseFiles) {
      const { meta } = parseFrontmatter(readNormalizedText(cf.fullPath));
      if (!meta.legalReviewStatus || !allowedLegalStatuses.has(meta.legalReviewStatus)) {
        errors.push(
          `[Pre-Publication Gate] ${cf.relPath} has invalid legalReviewStatus "${meta.legalReviewStatus || ''}" (allowed: ${[...allowedLegalStatuses].join(', ')}).`
        );
      }
      if (!meta.publicInterestBasis || meta.publicInterestBasis.length < 15) {
        errors.push(`[Pre-Publication Gate] ${cf.relPath} requires an explicit publicInterestBasis statement (ADR-001).`);
      }
      if (!meta.publishedUtc || !meta.publishedUtc.endsWith('Z')) {
        errors.push(`[Timezone OPSEC] ${cf.relPath} publishedUtc must be UTC ending with "Z" (avoid +07:00 leak).`);
      }
    }

    // 6. Strict OPSEC check (production readiness: placeholder PGP/onion checks + git author/committer timezone audit)
    if (strictOpsec) {
      if (config.isSampleTemplate) {
        errors.push('[Strict OPSEC] site.config.json still has isSampleTemplate: true.');
      }
      if (config.pgp.fingerprint.startsWith('0000 ')) {
        errors.push('[Strict OPSEC] Replace placeholder PGP fingerprint before real publication.');
      }
      const mirrors = JSON.parse(readNormalizedText(path.join(contentDir, 'mirrors.json')));
      const torV3Re = /^http:\/\/[a-z2-7]{56}\.onion\/?$/;
      if (!torV3Re.test(mirrors.canonical.torOnion)) {
        errors.push('[Strict OPSEC] content/mirrors.json canonical.torOnion must be a valid 56-char base32 Tor v3 .onion URL.');
      }
      if (mirrors.canonical.ipfsCid.includes('replacewith') || !/^(bafy|Qm)[A-Za-z0-9]{40,}$/.test(mirrors.canonical.ipfsCid)) {
        errors.push('[Strict OPSEC] Replace placeholder IPFS CID in content/mirrors.json with a real CIDv1/v0.');
      }
      const mirrorHeadersPath = path.join(rootDir, 'infra', 'mirrors', '_headers');
      if (existsSync(mirrorHeadersPath)) {
        const headersText = readNormalizedText(mirrorHeadersPath);
        if (headersText.includes('replace-with-56-char-v3-onion-address')) {
          errors.push('[Strict OPSEC] infra/mirrors/_headers still contains placeholder .onion address.');
        }
      }

      // Inspect git commit history (supports standard repos AND worktrees) for author/committer TZ & personal emails
      let inGitRepo = false;
      try {
        execFileSync('git', ['rev-parse', '--git-dir'], { cwd: rootDir, stdio: 'pipe' });
        inGitRepo = true;
      } catch {
        inGitRepo = false;
      }

      if (inGitRepo) {
        let logOut = '';
        try {
          logOut = normalizeLf(
            execFileSync('git', ['log', '-n', '20', '--format=%H|%ae|%ai|%ce|%ci'], {
              cwd: rootDir,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'pipe']
            })
          ).trim();
        } catch (err) {
          const msg = String(err.stderr || err.message || '');
          if (!msg.includes('does not have any commits yet')) {
            errors.push(`[Git OPSEC] Failed to inspect git history in --strict-opsec mode: ${msg.trim()}`);
          }
        }
        if (logOut) {
          for (const line of logOut.split('\n')) {
            const [hash, authorEmail, authorDate, committerEmail, committerDate] = line.split('|');
            for (const [role, email, dateStr] of [
              ['author', authorEmail, authorDate],
              ['committer', committerEmail, committerDate]
            ]) {
              const tzMatch = /([+-]\d{4})$/.exec((dateStr || '').trim());
              if (tzMatch && tzMatch[1] !== '+0000') {
                errors.push(`[Git OPSEC] Commit ${hash.slice(0, 7)} (${role}) uses non-UTC timezone ${tzMatch[1]} (leaks operator region).`);
              }
              const domain = ((email || '').split('@')[1] || '').toLowerCase();
              if (PERSONAL_EMAIL_DOMAINS.includes(domain)) {
                errors.push(`[Git OPSEC] Commit ${hash.slice(0, 7)} (${role}) uses personal email domain "${domain}".`);
              }
            }
          }
        }
      }
    }
  } finally {
    rmSync(tmpBase, { recursive: true, force: true });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    visualFingerprint: resultA?.visualFingerprint || null
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const strictOpsec = process.argv.includes('--strict-opsec');
  const report = auditSite({ strictOpsec });

  console.log(`Censor-Proof Archive Audit (${strictOpsec ? 'STRICT OPSEC MODE' : 'STANDARD MODE'})`);
  if (report.visualFingerprint) {
    console.log(`Reproducible Visual Fingerprint: ${report.visualFingerprint}`);
  }
  if (report.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of report.warnings) console.log(`  [WARN] ${w}`);
  }
  if (report.errors.length > 0) {
    console.error('\nAudit FAILED with errors:');
    for (const e of report.errors) console.error(`  [FAIL] ${e}`);
    console.log(MANDATORY_OPSEC_BANNER);
    process.exit(1);
  }
  console.log('\nAll automated censorship-resistance, metadata, legal-gate, and reproducibility checks PASSED.');
  console.log(MANDATORY_OPSEC_BANNER);
}
