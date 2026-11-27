import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, utimesSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatVisualFingerprint,
  listFilesDeterministic,
  normalizeLf,
  readNormalizedText,
  sha256Buffer,
  sha256Text,
  writeFileDeterministic
} from './lib/fs-utils.mjs';
import { parseFrontmatter, renderMarkdown } from './lib/markdown.mjs';
import { createDeterministicZip } from './lib/zip.mjs';
import {
  renderCasePage,
  renderHomePage,
  renderMirrorsPage,
  renderOfflineSingleFile,
  renderVerifyPage
} from '../src/templates/render.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');

function loadCanonicalInputs(rootDir) {
  const contentDir = path.join(rootDir, 'content');
  const config = JSON.parse(readNormalizedText(path.join(contentDir, 'site.config.json')));
  const mirrors = JSON.parse(readNormalizedText(path.join(contentDir, 'mirrors.json')));
  const sanitizedManifest = JSON.parse(
    readNormalizedText(path.join(contentDir, 'evidence', 'sanitized-manifest.json'))
  );

  // Load and sort case files deterministically
  const casesDir = path.join(contentDir, 'cases');
  const caseFiles = listFilesDeterministic(casesDir).filter((f) => f.relPath.endsWith('.md'));
  const casesByLang = { en: [], th: [] };

  for (const cf of caseFiles) {
    const raw = readNormalizedText(cf.fullPath);
    const { meta, body } = parseFrontmatter(raw);
    if (!meta.id || !meta.lang || !casesByLang[meta.lang]) {
      throw new Error(`Invalid case frontmatter in ${cf.relPath}: requires id and lang (en|th).`);
    }
    if (!/^[a-z0-9-]+$/.test(meta.id)) {
      throw new Error(`Unsafe case id "${meta.id}" in ${cf.relPath}: only lowercase [a-z0-9-] allowed.`);
    }
    if (!/^[a-z0-9-]+$/.test(meta.id)) {
      throw new Error(
        `Invalid case id "${meta.id}" in ${cf.relPath}: must match ^[a-z0-9-]+$ to prevent unsafe filenames.`
      );
    }
    casesByLang[meta.lang].push({
      relPath: cf.relPath,
      meta,
      html: renderMarkdown(body)
    });
  }

  for (const lang of Object.keys(casesByLang)) {
    casesByLang[lang].sort((a, b) => a.meta.id.localeCompare(b.meta.id, 'en'));
  }

  // Validate evidence files against sanitized-manifest.json (fail-closed)
  const evidenceDir = path.join(contentDir, 'evidence');
  const evidenceFiles = listFilesDeterministic(evidenceDir).filter(
    (f) => f.relPath !== 'sanitized-manifest.json'
  );
  const manifestByFile = new Map(
    (sanitizedManifest.artifacts || []).map((a) => [a.filename, a])
  );
  const evidenceMap = new Map();

  for (const ef of evidenceFiles) {
    const attestation = manifestByFile.get(ef.relPath);
    if (!attestation) {
      throw new Error(
        `FAIL-CLOSED: Evidence file "${ef.relPath}" is missing from content/evidence/sanitized-manifest.json.`
      );
    }
    const rawBuf = readFileSync(ef.fullPath);
    const ext = path.extname(ef.relPath).toLowerCase();
    // Normalize text evidence LF for deterministic cross-OS hashing
    const normalizedBuf = ['.txt', '.csv', '.json'].includes(ext)
      ? Buffer.from(normalizeLf(rawBuf.toString('utf8')), 'utf8')
      : rawBuf;
    const actualHash = sha256Buffer(normalizedBuf);
    if (actualHash !== attestation.sha256) {
      throw new Error(
        `FAIL-CLOSED: SHA-256 mismatch for "${ef.relPath}". Manifest has ${attestation.sha256}, actual is ${actualHash}.`
      );
    }
    if (!attestation.sanitizationMethod || !attestation.legalReviewApproved) {
      throw new Error(
        `FAIL-CLOSED: "${ef.relPath}" requires both sanitizationMethod and legalReviewApproved: true in sanitized-manifest.json.`
      );
    }
    const inlinePreview =
      ['.txt', '.csv', '.json'].includes(ext) && normalizedBuf.length <= 16384
        ? normalizedBuf.toString('utf8')
        : null;

    evidenceMap.set(attestation.id, {
      ...attestation,
      size: normalizedBuf.length,
      buffer: normalizedBuf,
      inlinePreview
    });
  }

  // Compute deterministic content fingerprint over sorted canonical content files (non-circular!)
  const canonicalFiles = listFilesDeterministic(contentDir);
  const hashLines = canonicalFiles.map((f) => {
    const ext = path.extname(f.relPath).toLowerCase();
    const raw = readFileSync(f.fullPath);
    const data = ['.md', '.json', '.txt', '.csv'].includes(ext)
      ? Buffer.from(normalizeLf(raw.toString('utf8')), 'utf8')
      : raw;
    return `${sha256Buffer(data)}  content/${f.relPath}`;
  });
  const contentDigest = sha256Text(hashLines.join('\n') + '\n');
  const visualFingerprint = formatVisualFingerprint(contentDigest);

  return {
    config,
    mirrors,
    sanitizedManifest,
    casesByLang,
    evidenceMap,
    contentDigest,
    visualFingerprint
  };
}

export function buildSite({ rootDir = DEFAULT_ROOT, outDir = path.join(rootDir, 'dist') } = {}) {
  const {
    config,
    mirrors,
    casesByLang,
    evidenceMap,
    contentDigest,
    visualFingerprint
  } = loadCanonicalInputs(rootDir);

  const siteDir = path.join(outDir, 'site');
  const offlineDir = path.join(outDir, 'offline');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(siteDir, { recursive: true });
  mkdirSync(offlineDir, { recursive: true });

  // 1. Copy local CSS & PGP key asset
  const cssText = readNormalizedText(path.join(rootDir, 'src', 'styles', 'main.css'));
  writeFileDeterministic(path.join(siteDir, 'assets', 'main.css'), cssText);
  const pgpKeySrc = path.join(rootDir, 'src', 'assets', 'archive-release-key.asc');
  if (existsSync(pgpKeySrc)) {
    writeFileDeterministic(
      path.join(siteDir, 'assets', 'archive-release-key.asc'),
      readNormalizedText(pgpKeySrc)
    );
  }

  // 2. Write sanitized evidence into site/evidence/
  for (const ev of evidenceMap.values()) {
    writeFileDeterministic(path.join(siteDir, 'evidence', ev.filename), ev.buffer);
  }

  // 3. Embed machine-readable mirrors.json inside site root
  writeFileDeterministic(
    path.join(siteDir, 'mirrors.json'),
    JSON.stringify(mirrors, null, 2) + '\n'
  );

  // 4. Render bilingual static pages (EN at root, TH at th/)
  for (const lang of ['en', 'th']) {
    const langDir = lang === 'th' ? path.join(siteDir, 'th') : siteDir;
    const cases = casesByLang[lang];

    writeFileDeterministic(
      path.join(langDir, 'index.html'),
      renderHomePage({ lang, config, cases, visualFingerprint })
    );
    writeFileDeterministic(
      path.join(langDir, 'mirrors.html'),
      renderMirrorsPage({ lang, config, mirrors, visualFingerprint })
    );
    writeFileDeterministic(
      path.join(langDir, 'verify.html'),
      renderVerifyPage({ lang, config, visualFingerprint })
    );

    for (const dossier of cases) {
      const linkedEvidence = dossier.meta.evidenceIds
        .map((id) => evidenceMap.get(id))
        .filter(Boolean);
      writeFileDeterministic(
        path.join(langDir, 'cases', `${dossier.meta.id}.html`),
        renderCasePage({
          lang,
          config,
          dossier,
          evidenceEntries: linkedEvidence,
          visualFingerprint
        })
      );
    }
  }

  // 5. Generate self-contained offline HTML + printable PDF-ready HTML
  const offlineHtml = renderOfflineSingleFile({
    config,
    mirrors,
    casesByLang,
    evidenceMap,
    cssText,
    visualFingerprint,
    printable: false
  });
  const printableHtml = renderOfflineSingleFile({
    config,
    mirrors,
    casesByLang,
    evidenceMap,
    cssText,
    visualFingerprint,
    printable: true
  });

  writeFileDeterministic(path.join(offlineDir, 'archive-offline.html'), offlineHtml);
  writeFileDeterministic(path.join(offlineDir, 'archive-printable.html'), printableHtml);

  // Also expose offline files inside site/offline/ so web mirrors serve direct downloads
  writeFileDeterministic(path.join(siteDir, 'offline', 'archive-offline.html'), offlineHtml);
  writeFileDeterministic(path.join(siteDir, 'offline', 'archive-printable.html'), printableHtml);

  // 6. Build deterministic portable ZIP (of site/ minus the zip itself)
  const siteFilesForZip = listFilesDeterministic(siteDir).map((f) => ({
    name: `archive-v${config.releaseVersion}/${f.relPath}`,
    data: readFileSync(f.fullPath)
  }));
  const zipBuffer = createDeterministicZip(siteFilesForZip);
  const zipOutPath = path.join(offlineDir, 'archive-portable.zip');
  writeFileDeterministic(zipOutPath, zipBuffer);
  copyFileSync(zipOutPath, path.join(siteDir, 'offline', 'archive-portable.zip'));

  // 7. Compute SHA256SUMS & manifest.json over all generated artifacts (excluding SHA256SUMS & manifest.json)
  const allSiteFiles = listFilesDeterministic(siteDir);
  const checksumLines = allSiteFiles.map((f) => {
    const hash = sha256Buffer(readFileSync(f.fullPath));
    return `${hash}  ${f.relPath}`;
  });
  const sha256SumsContent = checksumLines.join('\n') + '\n';
  writeFileDeterministic(path.join(outDir, 'SHA256SUMS'), sha256SumsContent);
  writeFileDeterministic(path.join(siteDir, 'SHA256SUMS'), sha256SumsContent);

  const manifest = {
    schemaVersion: '1.0',
    archiveId: config.archiveId,
    releaseVersion: config.releaseVersion,
    releaseDateUtc: config.releaseDateUtc,
    supersedes: config.supersedes,
    visualFingerprint,
    contentDigestSha256: contentDigest,
    sha256sumsDigest: sha256Text(sha256SumsContent),
    pgpFingerprint: config.pgp.fingerprint,
    corrections: config.corrections || [],
    offlineArtifacts: {
      singleHtmlBytes: Buffer.byteLength(offlineHtml, 'utf8'),
      printableHtmlBytes: Buffer.byteLength(printableHtml, 'utf8'),
      portableZipBytes: zipBuffer.length
    },
    files: allSiteFiles.map((f) => ({
      path: f.relPath,
      bytes: f.size,
      sha256: sha256Buffer(readFileSync(f.fullPath))
    }))
  };
  const manifestJson = JSON.stringify(manifest, null, 2) + '\n';
  writeFileDeterministic(path.join(outDir, 'manifest.json'), manifestJson);
  writeFileDeterministic(path.join(siteDir, 'manifest.json'), manifestJson);

  // Normalize all output file mtimes to releaseDateUtc so rsync/HTTP Last-Modified never leaks local build wall-clock time
  const releaseEpoch = new Date(config.releaseDateUtc);
  if (!Number.isNaN(releaseEpoch.getTime())) {
    for (const f of listFilesDeterministic(outDir)) {
      utimesSync(f.fullPath, releaseEpoch, releaseEpoch);
    }
  }

  return {
    outDir,
    siteDir,
    offlineDir,
    visualFingerprint,
    fileCount: allSiteFiles.length,
    manifest
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const result = buildSite();
  console.log(`Built ${result.fileCount} static files into ${path.relative(DEFAULT_ROOT, result.siteDir)}`);
  console.log(`Visual Archive Fingerprint : ${result.visualFingerprint}`);
  console.log(`SHA256SUMS Digest          : ${result.manifest.sha256sumsDigest}`);
  console.log(`Portable ZIP Size          : ${(result.manifest.offlineArtifacts.portableZipBytes / 1024).toFixed(1)} KB`);
}
