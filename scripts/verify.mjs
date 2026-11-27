import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFilesDeterministic, normalizeLf, sha256Buffer } from './lib/fs-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_SITE_DIR = path.resolve(__dirname, '..', 'dist', 'site');

// Files allowed alongside SHA256SUMS without being listed inside SHA256SUMS itself
const ALLOWED_UNLISTED_FILES = new Set([
  'SHA256SUMS',
  'SHA256SUMS.asc',
  'manifest.json',
  'mirrors.json.asc',
  '_headers'
]);

export function verifyDistSite(siteDir = DEFAULT_SITE_DIR) {
  const resolvedSiteDir = path.resolve(siteDir);
  const sumsPath = path.join(resolvedSiteDir, 'SHA256SUMS');
  if (!existsSync(sumsPath)) {
    throw new Error(`SHA256SUMS not found at ${sumsPath}. Run "npm run build" first.`);
  }

  const lines = normalizeLf(readFileSync(sumsPath, 'utf8'))
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const failures = [];
  const listedPaths = new Set();
  let checked = 0;

  for (const line of lines) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match) {
      failures.push(`Malformed SHA256SUMS line: "${line}"`);
      continue;
    }
    const [, expectedHash, relPath] = match;
    const fullPath = path.resolve(resolvedSiteDir, relPath);
    if (!fullPath.startsWith(resolvedSiteDir + path.sep)) {
      failures.push(`Unsafe path traversal in SHA256SUMS: "${relPath}"`);
      continue;
    }
    listedPaths.add(relPath);
    if (!existsSync(fullPath)) {
      failures.push(`Missing file: ${relPath}`);
      continue;
    }
    const actualHash = sha256Buffer(readFileSync(fullPath));
    if (actualHash !== expectedHash) {
      failures.push(`Hash mismatch for ${relPath}: expected ${expectedHash}, got ${actualHash}`);
    }
    checked++;
  }

  // Detect any extra/injected files not covered by SHA256SUMS (tampered mirror defense)
  for (const existing of listFilesDeterministic(resolvedSiteDir)) {
    if (!listedPaths.has(existing.relPath) && !ALLOWED_UNLISTED_FILES.has(existing.relPath)) {
      failures.push(`Unexpected unlisted file in site directory: "${existing.relPath}"`);
    }
  }

  const manifestPath = path.join(resolvedSiteDir, 'manifest.json');
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : null;

  return {
    ok: failures.length === 0,
    checked,
    failures,
    visualFingerprint: manifest?.visualFingerprint || null,
    pgpFingerprint: manifest?.pgpFingerprint || null
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SITE_DIR;
  const res = verifyDistSite(targetDir);
  if (!res.ok) {
    console.error('VERIFICATION FAILED:');
    for (const f of res.failures) console.error(`  [FAIL] ${f}`);
    process.exit(1);
  }
  console.log(`VERIFIED ${res.checked} files against SHA256SUMS.`);
  if (res.visualFingerprint) console.log(`Visual Fingerprint : ${res.visualFingerprint}`);
  if (res.pgpFingerprint) console.log(`Pinned PGP Key     : ${res.pgpFingerprint}`);
  console.log('Next step for full authenticity: gpg --verify SHA256SUMS.asc SHA256SUMS');
}
