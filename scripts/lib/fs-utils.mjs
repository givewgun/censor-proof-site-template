import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function toPosixPath(p) {
  return p.split(path.sep).join('/');
}

export function normalizeLf(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function sha256Buffer(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

export function sha256Text(text) {
  return sha256Buffer(Buffer.from(normalizeLf(text), 'utf8'));
}

export function formatVisualFingerprint(hexHash) {
  const upper = hexHash.slice(0, 16).toUpperCase();
  return `${upper.slice(0, 4)}-${upper.slice(4, 8)}-${upper.slice(8, 12)}-${upper.slice(12, 16)}`;
}

export function listFilesDeterministic(dir, baseDir = dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name, 'en')
  );
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesDeterministic(full, baseDir));
    } else if (entry.isFile()) {
      results.push({
        fullPath: full,
        relPath: toPosixPath(path.relative(baseDir, full)),
        size: statSync(full).size
      });
    }
  }
  return results.sort((a, b) => a.relPath.localeCompare(b.relPath, 'en'));
}

export function writeFileDeterministic(filePath, content) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  if (typeof content === 'string') {
    writeFileSync(filePath, normalizeLf(content), 'utf8');
  } else {
    writeFileSync(filePath, content);
  }
}

export function readNormalizedText(filePath) {
  return normalizeLf(readFileSync(filePath, 'utf8'));
}
