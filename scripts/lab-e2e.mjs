import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim();
}

async function fetchWithHeaders(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  return { status: res.status, headers: res.headers, text };
}

async function waitFor(fn, label, timeoutMs = 45000, intervalMs = 1500) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const val = await fn();
      if (val) return val;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label}: ${lastErr?.message || 'not ready'}`);
}

async function main() {
  console.log('=== Censor-Proof Archive LIVE End-to-End Lab Verification ===\n');

  // 1. Read live Tor v3 .onion hostname & IPFS CID generated inside containers
  const onionHost = await waitFor(
    () => run('docker', ['exec', 'censor-lab-tor-origin', 'cat', '/shared/onion-hostname']),
    'Tor v3 onion hostname'
  );
  assert.match(onionHost, /^[a-z2-7]{56}\.onion$/, `Invalid v3 onion: ${onionHost}`);
  console.log(`[PASS] 1. Live Tor v3 Onion generated      : http://${onionHost}/`);

  const ipfsCid = await waitFor(
    () => run('docker', ['exec', 'censor-lab-ipfs-offline', 'cat', '/shared/ipfs-cid']),
    'Offline Kubo IPFS CIDv1'
  );
  assert.match(ipfsCid, /^bafy[a-z2-7]{50,}$/, `Invalid CIDv1: ${ipfsCid}`);
  console.log(`[PASS] 2. Isolated IPFS CIDv1 generated    : ${ipfsCid}`);

  // 2. Test hardened zero-log Nginx origin strictly via 127.0.0.1 inside tor-origin container
  const originHeaders = run('docker', [
    'exec',
    'censor-lab-tor-origin',
    'curl',
    '-sS',
    '-D',
    '-',
    '-o',
    '/dev/null',
    'http://127.0.0.1:8080/'
  ]);
  assert.match(originHeaders, /HTTP\/1\.1 200 OK/i);
  assert.match(originHeaders, /Content-Security-Policy:\s*default-src 'none'/i);
  assert.match(originHeaders, /Referrer-Policy:\s*no-referrer/i);
  assert.match(originHeaders, /X-Frame-Options:\s*DENY/i);
  assert.ok(!/^ETag:/im.test(originHeaders), 'Origin must not leak ETag');
  assert.ok(!/^Last-Modified:\s*\S+/im.test(originHeaders), 'Origin must not leak non-empty Last-Modified');
  assert.ok(!/nginx\/\d/i.test(originHeaders), 'Origin must hide Nginx version');

  const postStatus = run('docker', [
    'exec',
    'censor-lab-tor-origin',
    'curl',
    '-sS',
    '-o',
    '/dev/null',
    '-w',
    '%{http_code}',
    '-X',
    'POST',
    'http://127.0.0.1:8080/'
  ]);
  assert.equal(postStatus, '405', 'Origin must reject POST with 405');

  const dotfileStatus = run('docker', [
    'exec',
    'censor-lab-tor-origin',
    'curl',
    '-sS',
    '-o',
    '/dev/null',
    '-w',
    '%{http_code}',
    'http://127.0.0.1:8080/.env'
  ]);
  assert.equal(dotfileStatus, '404', 'Origin must block dotfiles with 404');

  const accessLogSize = run('docker', [
    'exec',
    'censor-lab-tor-origin',
    'sh',
    '-c',
    'if [ -f /var/log/nginx/access.log ]; then wc -c < /var/log/nginx/access.log; else echo 0; fi'
  ]);
  assert.equal(Number(accessLogSize), 0, 'Zero-log Nginx must write 0 bytes to access.log');
  console.log('[PASS] 3. Hardened Zero-Log Nginx Origin   : CSP, no ETag/Last-Modified, POST=405, dotfile=404, 0B logs');

  // 3. Test real Kubo IPFS HTTP Path Gateway (/ipfs/<CID>/...) relative-path portability
  const ipfsBase = `http://127.0.0.1:8088/ipfs/${ipfsCid}`;
  const ipfsTargets = [
    '/index.html',
    '/assets/main.css',
    '/cases/case-001.html',
    '/th/index.html',
    '/th/cases/case-001.html',
    '/evidence/EVD-001.txt',
    '/mirrors.json',
    '/offline/archive-offline.html',
    '/offline/archive-portable.zip'
  ];
  for (const rel of ipfsTargets) {
    const r = await waitFor(() => fetchWithHeaders(`${ipfsBase}${rel}`), `IPFS gateway ${rel}`);
    assert.equal(r.status, 200, `IPFS Path Gateway failed on ${rel}: HTTP ${r.status}`);
    if (rel === '/th/cases/case-001.html') {
      assert.ok(r.text.includes('เทศบาลคลองทราย'), 'Thai dossier content missing on IPFS gateway');
      assert.ok(r.text.includes('../../assets/main.css'), 'Relative CSS path missing in Thai case page');
    }
  }
  console.log(`[PASS] 4. Real Kubo IPFS Path Gateway      : ${ipfsTargets.length}/${ipfsTargets.length} relative paths HTTP 200 at ${ipfsBase}/`);

  // 4. Test burnable Caddy v2 clearnet mirror + live Onion-Location header
  const mirrorRoot = await waitFor(
    () => fetchWithHeaders('http://127.0.0.1:8089/'),
    'Caddy clearnet mirror'
  );
  assert.equal(mirrorRoot.status, 200);
  assert.equal(mirrorRoot.headers.get('onion-location'), `http://${onionHost}/`);
  assert.match(mirrorRoot.headers.get('content-security-policy') || '', /default-src 'none'/);
  assert.equal(mirrorRoot.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(mirrorRoot.headers.get('x-frame-options'), 'DENY');
  assert.equal(mirrorRoot.headers.get('server'), null, 'Caddy must strip Server header');

  const mirrorSubpage = await fetchWithHeaders('http://127.0.0.1:8089/th/cases/case-001.html');
  assert.equal(mirrorSubpage.status, 200);
  assert.equal(
    mirrorSubpage.headers.get('onion-location'),
    `http://${onionHost}/th/cases/case-001.html`,
    'Onion-Location must preserve subpath URI'
  );

  const mirrorPost = await fetchWithHeaders('http://127.0.0.1:8089/', { method: 'POST' });
  assert.equal(mirrorPost.status, 405, 'Mirror must reject POST with 405');
  console.log(`[PASS] 5. Burnable Caddy v2 Mirror         : HTTP 200, live Onion-Location, CSP, POST=405, no Server header`);

  // 5. Real Ed25519 GPG Detached Signing & Tamper Detection inside an ephemeral container
  const tmpSignDir = mkdtempSync(path.join(os.tmpdir(), 'censor-lab-gpg-'));
  try {
    cpSync(path.join(REPO_ROOT, 'dist', 'site'), path.join(tmpSignDir, 'site'), { recursive: true });
    const gpgScript = `
      set -eu
      apk add --no-cache gnupg >/dev/null
      export GNUPGHOME=/tmp/gnupg
      mkdir -p "$GNUPGHOME" && chmod 700 "$GNUPGHOME"
      gpg --batch --passphrase '' --quick-generate-key "Lab Release Key <release@archive.invalid>" ed25519 sign 1y >/dev/null 2>&1
      gpg --armor --detach-sign --output /work/site/SHA256SUMS.asc /work/site/SHA256SUMS
      gpg --verify /work/site/SHA256SUMS.asc /work/site/SHA256SUMS 2>&1 | grep -q "Good signature"
      cd /work/site && sha256sum -c SHA256SUMS >/dev/null
      # Now simulate 1-byte mirror tampering and confirm verification FAILS
      echo " " >> /work/site/index.html
      if sha256sum -c SHA256SUMS >/dev/null 2>&1; then
        echo "ERROR: Tampered file was not detected!" >&2
        exit 1
      fi
      echo "GPG_AND_TAMPER_OK"
    `;
    const gpgOut = run('docker', [
      'run',
      '--rm',
      '-v',
      `${tmpSignDir}:/work`,
      'alpine:3.20',
      'sh',
      '-c',
      gpgScript
    ]);
    assert.ok(gpgOut.includes('GPG_AND_TAMPER_OK'));
    console.log('[PASS] 6. Real Ed25519 GPG Sign & Verify   : Detached SHA256SUMS.asc verified + 1-byte tamper rejected');
  } finally {
    rmSync(tmpSignDir, { recursive: true, force: true });
  }

  // 6. Optional Live Tor Circuit Self-Test (fetch our own .onion over the real Tor network!)
  console.log('[INFO] 7. Waiting for Tor network bootstrap to test live .onion circuit (up to 60s)...');
  let torBootstrapOk = false;
  try {
    await waitFor(() => {
      const logs = run('docker', ['logs', 'censor-lab-tor-origin']);
      return logs.includes('Bootstrapped 100%');
    }, 'Tor 100% bootstrap', 60000, 2000);

    const onionBody = await waitFor(() => {
      const out = run('docker', [
        'exec',
        'censor-lab-tor-origin',
        'curl',
        '--socks5-hostname',
        '127.0.0.1:9050',
        '--max-time',
        '25',
        '-sS',
        `http://${onionHost}/`
      ]);
      return out.includes('Public Integrity Archive') ? out : null;
    }, 'live Tor .onion fetch', 45000, 3000);
    assert.ok(onionBody.includes('A081-B87B-CE2D-0814'));
    torBootstrapOk = true;
    console.log(`[PASS] 7. LIVE Tor v3 Circuit Fetch        : Fetched http://${onionHost}/ over the REAL Tor network!`);
  } catch (err) {
    console.log(`[WARN] 7. Live Tor circuit fetch skipped/timed out (${err.message.split('\n')[0]}) — Tor v3 onion & local origin verified above.`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Live Burnable Mirror : http://127.0.0.1:8089/  (Thai: http://127.0.0.1:8089/th/index.html)`);
  console.log(`Live IPFS Gateway    : ${ipfsBase}/index.html`);
  console.log(`Live Tor v3 Onion    : http://${onionHost}/ ${torBootstrapOk ? '(LIVE ON TOR NETWORK!)' : '(bootstrapping)'}`);
}

main().catch((err) => {
  console.error('\n[LAB E2E FAILED]', err.message);
  process.exit(1);
});
