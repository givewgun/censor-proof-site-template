import { execFileSync } from 'node:child_process';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from '../../scripts/build.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const VM_NAME = 'censor-proof-origin-lab';
const WORK_DIR = path.join(REPO_ROOT, 'tmp', 'vbox-lab');
const CACHE_DIR = path.join(WORK_DIR, 'cache');
const VBOX_MANAGE = process.platform === 'win32'
  ? 'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe'
  : 'VBoxManage';

const DEBIAN_BASE_URL = 'https://cloud.debian.org/images/cloud/bookworm/latest';
const DEBIAN_IMAGE = 'debian-12-generic-amd64.qcow2';

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

function base32EncodeNoPad(buf) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += alphabet[(value << (5 - bits)) & 31];
  }
  return out;
}

function generateTorV3ClientAuthKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('x25519');
  const pubDer = publicKey.export({ format: 'der', type: 'spki' });
  const privDer = privateKey.export({ format: 'der', type: 'pkcs8' });
  const pubRaw = pubDer.subarray(pubDer.length - 32);
  const privRaw = privDer.subarray(privDer.length - 32);
  return {
    pubBase32: base32EncodeNoPad(pubRaw),
    privBase32: base32EncodeNoPad(privRaw)
  };
}

function ensureDebianImage() {
  mkdirSync(CACHE_DIR, { recursive: true });
  const tarPath = path.join(CACHE_DIR, DEBIAN_IMAGE);
  const sumsPath = path.join(CACHE_DIR, 'SHA512SUMS');
  const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const curlExtra = process.platform === 'win32' ? ['--ssl-no-revoke'] : [];

  console.log('[1/6] Fetching official Debian 12 SHA512SUMS...');
  execFileSync(curlCmd, [...curlExtra, '-fsSL', `${DEBIAN_BASE_URL}/SHA512SUMS`, '-o', sumsPath], {
    stdio: 'inherit'
  });

  const expectedLine = readFileSync(sumsPath, 'utf8')
    .split('\n')
    .find((l) => l.trim().endsWith(` ${DEBIAN_IMAGE}`) || l.trim().endsWith(`*${DEBIAN_IMAGE}`));
  if (!expectedLine) {
    throw new Error(`Could not find ${DEBIAN_IMAGE} in official SHA512SUMS.`);
  }
  const expectedSha512 = expectedLine.trim().split(/\s+/)[0].toLowerCase();

  let needDownload = !existsSync(tarPath);
  if (!needDownload) {
    const actual = createHash('sha512').update(readFileSync(tarPath)).digest('hex');
    if (actual !== expectedSha512) {
      console.log('Cached Debian image checksum mismatch — re-downloading...');
      needDownload = true;
    } else {
      console.log('Verified cached Debian 12 generic image (SHA-512 OK).');
    }
  }

  if (needDownload) {
    console.log(`[1/6] Downloading official Debian 12 generic image (~284 MB)...`);
    execFileSync(
      curlCmd,
      [...curlExtra, '-fL', '--progress-bar', `${DEBIAN_BASE_URL}/${DEBIAN_IMAGE}`, '-o', tarPath],
      { stdio: 'inherit' }
    );
    const actual = createHash('sha512').update(readFileSync(tarPath)).digest('hex');
    if (actual !== expectedSha512) {
      rmSync(tarPath, { force: true });
      throw new Error(`SHA-512 verification FAILED for ${DEBIAN_IMAGE}!`);
    }
    console.log('Official Debian 12 SHA-512 checksum VERIFIED.');
  }

  return tarPath;
}

function createVdiFromQcow2(qcow2Path, vdiPath) {
  console.log('[2/6] Converting official Debian 12 qcow2 to VirtualBox VDI (qemu-img)...');
  rmSync(vdiPath, { force: true });
  const vdiDir = path.dirname(vdiPath);
  const vdiFile = path.basename(vdiPath);
  const qcow2File = path.basename(qcow2Path);

  execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '-v',
      `${CACHE_DIR}:/in:ro`,
      '-v',
      `${vdiDir}:/out`,
      'alpine:3.20',
      'sh',
      '-c',
      `apk add --no-cache qemu-img >/dev/null && qemu-img convert -f qcow2 -O vdi /in/${qcow2File} /out/${vdiFile}`
    ],
    { stdio: 'inherit' }
  );
  if (!existsSync(vdiPath)) {
    throw new Error('Failed to create disk.vdi via qemu-img.');
  }
}

function buildCloudInitSeedIso({ seedIsoPath, sshPubKey, torAuthPubBase32 }) {
  console.log('[3/6] Building cloud-init NoCloud seed ISO (cidata.iso)...');
  const seedDir = path.join(WORK_DIR, 'seed');
  rmSync(seedDir, { recursive: true, force: true });
  mkdirSync(seedDir, { recursive: true });

  const torrcB64 = Buffer.from(
    readFileSync(path.join(REPO_ROOT, 'infra', 'tor', 'torrc'), 'utf8').replace(/\r\n/g, '\n'),
    'utf8'
  ).toString('base64');
  const nginxB64 = Buffer.from(
    readFileSync(path.join(REPO_ROOT, 'infra', 'tor', 'nginx-onion.conf'), 'utf8').replace(/\r\n/g, '\n'),
    'utf8'
  ).toString('base64');
  const ufwB64 = Buffer.from(
    readFileSync(path.join(REPO_ROOT, 'infra', 'tor', 'ufw-hardening.sh'), 'utf8').replace(/\r\n/g, '\n'),
    'utf8'
  ).toString('base64');
  const siteZipB64 = readFileSync(
    path.join(REPO_ROOT, 'dist', 'offline', 'archive-portable.zip')
  ).toString('base64');

  const metaData = `instance-id: ${VM_NAME}\nlocal-hostname: origin-lab\n`;
  const userData = `#cloud-config
disable_root: false
ssh_pwauth: false
users:
  - name: root
    ssh_authorized_keys:
      - ${sshPubKey}
package_update: true
packages:
  - tor
  - nginx
  - ufw
  - unzip
write_files:
  - path: /etc/tor/torrc
    encoding: b64
    permissions: '0644'
    content: ${torrcB64}
  - path: /etc/nginx/sites-available/archive-onion
    encoding: b64
    permissions: '0644'
    content: ${nginxB64}
  - path: /usr/local/sbin/ufw-hardening.sh
    encoding: b64
    permissions: '0700'
    content: ${ufwB64}
  - path: /tmp/archive-portable.zip
    encoding: b64
    permissions: '0644'
    content: ${siteZipB64}
  - path: /usr/local/sbin/bootstrap-origin.sh
    permissions: '0700'
    content: |
      #!/usr/bin/env bash
      set -euo pipefail
      exec > >(tee -a /var/log/origin-bootstrap.log /dev/ttyS0) 2>&1
      echo "[bootstrap] Unpacking deterministic static archive..."
      mkdir -p /var/www/archive/site /tmp/unpack
      unzip -qo /tmp/archive-portable.zip -d /tmp/unpack
      cp -r /tmp/unpack/archive-v*/* /var/www/archive/site/
      rm -rf /tmp/unpack /tmp/archive-portable.zip

      echo "[bootstrap] Configuring zero-log Nginx on 127.0.0.1:8080..."
      rm -f /etc/nginx/sites-enabled/default
      ln -sf /etc/nginx/sites-available/archive-onion /etc/nginx/sites-enabled/archive-onion
      rm -f /var/log/nginx/access.log /var/log/nginx/error.log
      nginx -t
      systemctl enable --now nginx
      systemctl reload nginx

      echo "[bootstrap] Installing Tor v3 client authorization public key (private key NEVER touches VM)..."
      mkdir -p /var/lib/tor/archive_site /var/lib/tor/admin_ssh/authorized_clients
      echo "descriptor:x25519:${torAuthPubBase32}" > /var/lib/tor/admin_ssh/authorized_clients/operator.auth
      chown -R debian-tor:debian-tor /var/lib/tor
      chmod 700 /var/lib/tor/archive_site /var/lib/tor/admin_ssh /var/lib/tor/admin_ssh/authorized_clients
      chmod 600 /var/lib/tor/admin_ssh/authorized_clients/operator.auth

      systemctl enable --now tor
      systemctl restart tor

      echo "[bootstrap] Waiting for Tor v3 hostnames..."
      for i in $(seq 1 90); do
        if [[ -s /var/lib/tor/archive_site/hostname && -s /var/lib/tor/admin_ssh/hostname ]]; then
          break
        fi
        sleep 1
      done

      SITE_ONION=$(tr -d '\\r\\n' < /var/lib/tor/archive_site/hostname)
      ADMIN_ONION=$(tr -d '\\r\\n' < /var/lib/tor/admin_ssh/hostname)

      echo "[bootstrap] Executing infra/tor/ufw-hardening.sh (DENY ALL inbound clearnet, SSH 127.0.0.1 only, RAM journald)..."
      bash /usr/local/sbin/ufw-hardening.sh

      echo "[bootstrap] Waiting for Tor 100% bootstrap..."
      sleep 5
      echo "VBOX_LAB_READY SITE_ONION=\${SITE_ONION} ADMIN_ONION=\${ADMIN_ONION}"
runcmd:
  - [ bash, /usr/local/sbin/bootstrap-origin.sh ]
`;

  writeFileSync(path.join(seedDir, 'meta-data'), metaData, 'utf8');
  writeFileSync(path.join(seedDir, 'user-data'), userData, 'utf8');

  rmSync(seedIsoPath, { force: true });
  execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '-v',
      `${seedDir}:/seed:ro`,
      '-v',
      `${WORK_DIR}:/out`,
      'alpine:3.20',
      'sh',
      '-c',
      'apk add --no-cache xorriso >/dev/null && xorriso -as mkisofs -output /out/cidata.iso -volid cidata -joliet -rock /seed/user-data /seed/meta-data >/dev/null 2>&1'
    ],
    { stdio: 'inherit' }
  );
}

function removeExistingLabVm() {
  let vms = '';
  try {
    vms = run(VBOX_MANAGE, ['list', 'vms']);
  } catch {
    return;
  }
  if (!vms.includes(`"${VM_NAME}"`)) return;

  console.log(`Cleaning up prior "${VM_NAME}" VM (never touches other VMs)...`);
  try {
    execFileSync(VBOX_MANAGE, ['controlvm', VM_NAME, 'poweroff'], { stdio: 'ignore' });
  } catch {
    // already powered off
  }
  // Brief pause for VirtualBox lock release
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
  execFileSync(VBOX_MANAGE, ['unregistervm', VM_NAME, '--delete'], { stdio: 'inherit' });
}

async function main() {
  mkdirSync(WORK_DIR, { recursive: true });
  buildSite({ rootDir: REPO_ROOT });

  const tarPath = ensureDebianImage();
  removeExistingLabVm();

  // Generate fresh throwaway lab SSH keypair & Tor v3 x25519 client-auth keypair
  const sshKeyPath = path.join(WORK_DIR, 'lab_ed25519');
  rmSync(sshKeyPath, { force: true });
  rmSync(`${sshKeyPath}.pub`, { force: true });
  execFileSync('ssh-keygen', ['-t', 'ed25519', '-N', '', '-C', 'lab-operator@archive.invalid', '-f', sshKeyPath], {
    stdio: 'ignore'
  });
  const sshPubKey = readFileSync(`${sshKeyPath}.pub`, 'utf8').trim();
  const torAuth = generateTorV3ClientAuthKeys();

  const vmDiskDir = path.join(WORK_DIR, 'vm');
  rmSync(vmDiskDir, { recursive: true, force: true });
  mkdirSync(vmDiskDir, { recursive: true });
  const vdiPath = path.join(vmDiskDir, 'disk.vdi');
  const seedIsoPath = path.join(WORK_DIR, 'cidata.iso');
  const serialLogPath = path.join(WORK_DIR, 'serial.log');
  rmSync(serialLogPath, { force: true });

  createVdiFromQcow2(tarPath, vdiPath);
  buildCloudInitSeedIso({
    seedIsoPath,
    sshPubKey,
    torAuthPubBase32: torAuth.pubBase32
  });

  console.log(`[4/6] Creating isolated VirtualBox VM "${VM_NAME}" (UEFI, clipboard/DnD/audio disabled, zero inbound ports)...`);
  execFileSync(VBOX_MANAGE, ['createvm', '--name', VM_NAME, '--ostype', 'Debian_64', '--basefolder', vmDiskDir, '--register'], {
    stdio: 'inherit'
  });
  execFileSync(
    VBOX_MANAGE,
    [
      'modifyvm',
      VM_NAME,
      '--firmware', 'efi',
      '--memory', '1024',
      '--cpus', '2',
      '--nic1', 'nat',
      '--nictype1', '82540EM',
      '--audio-enabled', 'off',
      '--clipboard-mode', 'disabled',
      '--draganddrop', 'disabled',
      '--uart1', '0x3F8', '4',
      '--uartmode1', 'file', serialLogPath
    ],
    { stdio: 'inherit' }
  );
  execFileSync(VBOX_MANAGE, ['storagectl', VM_NAME, '--name', 'SATA', '--add', 'sata', '--controller', 'IntelAhci'], {
    stdio: 'inherit'
  });
  execFileSync(
    VBOX_MANAGE,
    ['storageattach', VM_NAME, '--storagectl', 'SATA', '--port', '0', '--device', '0', '--type', 'hdd', '--medium', vdiPath],
    { stdio: 'inherit' }
  );
  execFileSync(
    VBOX_MANAGE,
    ['storageattach', VM_NAME, '--storagectl', 'SATA', '--port', '1', '--device', '0', '--type', 'dvddrive', '--medium', seedIsoPath],
    { stdio: 'inherit' }
  );

  console.log(`[5/6] Booting "${VM_NAME}" headless and waiting for cloud-init + Tor + UFW lockdown...`);
  execFileSync(VBOX_MANAGE, ['startvm', VM_NAME, '--type', 'headless'], { stdio: 'inherit' });

  const start = Date.now();
  const timeoutMs = 300000; // 5 minutes max for first boot apt-get + tor
  let match = null;
  let lastPrintedLen = 0;

  while (Date.now() - start < timeoutMs) {
    if (existsSync(serialLogPath)) {
      const log = readFileSync(serialLogPath, 'utf8');
      if (log.length > lastPrintedLen) {
        const chunk = log.slice(lastPrintedLen);
        for (const line of chunk.split('\n')) {
          if (line.includes('[bootstrap]') || line.includes('VBOX_LAB_READY')) {
            console.log(`  ${line.trim()}`);
          }
        }
        lastPrintedLen = log.length;
      }
      const m = /VBOX_LAB_READY SITE_ONION=([a-z2-7]{56}\.onion) ADMIN_ONION=([a-z2-7]{56}\.onion)/.exec(log);
      if (m) {
        match = m;
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  if (!match) {
    throw new Error(`Timed out waiting for VirtualBox VM bootstrap. Inspect ${serialLogPath}`);
  }

  const [, siteOnion, adminOnion] = match;
  const state = {
    vmName: VM_NAME,
    siteOnion,
    adminOnion,
    sshKeyPath,
    torAuthPubBase32: torAuth.pubBase32,
    torAuthPrivBase32: torAuth.privBase32,
    serialLogPath
  };
  writeFileSync(path.join(WORK_DIR, 'vm-state.json'), JSON.stringify(state, null, 2) + '\n', 'utf8');

  console.log('\n[6/6] VIRTUALBOX TOR-ORIGIN VM PROVISIONED & LOCKED DOWN!');
  console.log(`  VM Name          : ${VM_NAME} (running headless, zero inbound clearnet ports)`);
  console.log(`  Public Site Onion: http://${siteOnion}/`);
  console.log(`  Admin SSH Onion  : ${adminOnion} (protected by Tor v3 x25519 Client Auth!)`);
  console.log('  Next step        : npm run vbox:test');
}

main().catch((err) => {
  console.error('\n[VBOX PROVISION FAILED]', err.message);
  process.exit(1);
});
