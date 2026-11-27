import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildSite } from '../scripts/build.mjs';
import { auditSite } from '../scripts/audit.mjs';
import { verifyDistSite } from '../scripts/verify.mjs';
import { renderMarkdown } from '../scripts/lib/markdown.mjs';
import { createDeterministicZip } from '../scripts/lib/zip.mjs';
import { scanEvidenceFile } from '../scripts/lib/metadata-scanner.mjs';
import { sha256Buffer } from '../scripts/lib/fs-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

test('Markdown renderer escapes raw HTML and blocks javascript: links', () => {
  const input = 'Hello <script>alert(1)</script> [click](javascript:alert(2)) and **bold**';
  const html = renderMarkdown(input);
  assert.ok(!html.includes('<script>'), 'raw <script> must be escaped');
  assert.ok(!html.includes('javascript:'), 'javascript: href must be blocked');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('<strong>bold</strong>'));
});

test('Deterministic ZIP produces identical SHA-256 regardless of input order', () => {
  const a = createDeterministicZip([
    { name: 'b.txt', data: Buffer.from('beta\n') },
    { name: 'a.txt', data: Buffer.from('alpha\n') }
  ]);
  const b = createDeterministicZip([
    { name: 'a.txt', data: Buffer.from('alpha\n') },
    { name: 'b.txt', data: Buffer.from('beta\n') }
  ]);
  assert.equal(sha256Buffer(a), sha256Buffer(b));
  assert.equal(a.subarray(0, 4).toString('hex'), '504b0304');
});

test('Evidence metadata scanner catches EXIF, PNG tEXt, PDF /Author + incremental EOF, OOXML, and bad filenames', () => {
  // 1. Disallowed Office extension + OOXML header
  const fakeDocx = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from('...docProps/core.xml...')
  ]);
  const docxIssues = scanEvidenceFile('Secret_Minister_Memo.docx', fakeDocx);
  assert.ok(docxIssues.some((i) => i.includes('Disallowed evidence file type')));
  assert.ok(docxIssues.some((i) => i.includes('opaque ID')));
  assert.ok(docxIssues.some((i) => i.includes('Office/OOXML')));

  // 2. JPEG with EXIF APP1 marker
  const fakeJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, ...Buffer.from('Exif\0\0abcdef')]);
  const jpgIssues = scanEvidenceFile('EVD-010.jpg', fakeJpg);
  assert.ok(jpgIssues.some((i) => i.includes('EXIF')));

  // 3. PNG with tEXt chunk
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const textPayload = Buffer.from('Author\0Somchai');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(textPayload.length, 0);
  const fakePng = Buffer.concat([pngSig, lenBuf, Buffer.from('tEXt'), textPayload, Buffer.alloc(4)]);
  const pngIssues = scanEvidenceFile('EVD-011.png', fakePng);
  assert.ok(pngIssues.some((i) => i.includes('tEXt')));

  // 4. PDF with /Author, /ObjStm, hex-escaped /Aut#68or, and two %%EOF incremental-save markers
  const fakePdf = Buffer.from('%PDF-1.7\n<< /Author (Leak) /ObjStm 1 /Aut#68or (Hidden) >>\n%%EOF\n%rev2\n%%EOF\n');
  const pdfIssues = scanEvidenceFile('EVD-012.pdf', fakePdf);
  assert.ok(pdfIssues.some((i) => i.includes('/Author')));
  assert.ok(pdfIssues.some((i) => i.includes('/ObjStm')));
  assert.ok(pdfIssues.some((i) => i.includes('hex-escaped')));
  assert.ok(pdfIssues.some((i) => i.includes('%%EOF')));

  // 5. Text file leaking local Windows path
  const pathLeakTxt = Buffer.from('Exported from C:\\Users\\realname\\Desktop\\leak.xlsx\n');
  const txtIssues = scanEvidenceFile('EVD-013.txt', pathLeakTxt);
  assert.ok(txtIssues.some((i) => i.includes('Windows user path')));
});

test('verifyDistSite rejects extra injected files in dist/site (tampered mirror defense)', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'censor-proof-tamper-'));
  try {
    const outDir = path.join(tmp, 'dist');
    const buildRes = buildSite({ rootDir: REPO_ROOT, outDir });
    writeFileSync(path.join(buildRes.siteDir, 'injected-phish.html'), '<html>fake</html>', 'utf8');

    const verifyRes = verifyDistSite(buildRes.siteDir);
    assert.equal(verifyRes.ok, false);
    assert.ok(verifyRes.failures.some((f) => f.includes('Unexpected unlisted file') && f.includes('injected-phish.html')));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('Build fails closed when an unattested evidence file is added', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'censor-proof-failclosed-'));
  try {
    cpSync(path.join(REPO_ROOT, 'content'), path.join(tmp, 'content'), { recursive: true });
    cpSync(path.join(REPO_ROOT, 'src'), path.join(tmp, 'src'), { recursive: true });
    writeFileSync(path.join(tmp, 'content', 'evidence', 'EVD-999.txt'), 'unattested\n', 'utf8');

    assert.throws(
      () => buildSite({ rootDir: tmp, outDir: path.join(tmp, 'dist') }),
      /FAIL-CLOSED.*EVD-999\.txt/
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('Full build, audit, and SHA256SUMS verification pass cleanly on sample template', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'censor-proof-e2e-'));
  try {
    const outDir = path.join(tmp, 'dist');
    const buildRes = buildSite({ rootDir: REPO_ROOT, outDir });
    assert.ok(buildRes.fileCount >= 12);
    assert.match(buildRes.visualFingerprint, /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);

    const verifyRes = verifyDistSite(buildRes.siteDir);
    assert.equal(verifyRes.ok, true, `verify failures: ${verifyRes.failures.join('; ')}`);
    assert.equal(verifyRes.checked, buildRes.fileCount);

    // Tampered mirror simulation: injecting an unlisted file MUST fail verifyDistSite
    writeFileSync(path.join(buildRes.siteDir, 'injected-tracker.html'), '<html></html>', 'utf8');
    const tamperedRes = verifyDistSite(buildRes.siteDir);
    assert.equal(tamperedRes.ok, false);
    assert.ok(tamperedRes.failures.some((f) => f.includes('Unexpected unlisted file')));

    const auditRes = auditSite({ rootDir: REPO_ROOT, strictOpsec: false });
    assert.equal(auditRes.ok, true, `audit errors: ${auditRes.errors.join('; ')}`);

    // Strict OPSEC mode MUST fail on sample placeholders (prevents accidental launch with template values)
    const strictRes = auditSite({ rootDir: REPO_ROOT, strictOpsec: true });
    assert.equal(strictRes.ok, false);
    assert.ok(strictRes.errors.some((e) => e.includes('isSampleTemplate')));
    assert.ok(strictRes.errors.some((e) => e.includes('Tor v3 .onion')));

    // Confirm offline HTML contains both English & Thai and zero <script>
    const offlineHtml = readFileSync(path.join(outDir, 'offline', 'archive-offline.html'), 'utf8');
    assert.ok(offlineHtml.includes('Public Integrity Archive'));
    assert.ok(offlineHtml.includes('คลังเอกสารตรวจสอบเพื่อสาธารณประโยชน์'));
    assert.ok(!/<script\b/i.test(offlineHtml));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
