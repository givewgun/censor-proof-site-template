import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const VM_NAME = 'censor-proof-origin-lab';
const WORK_DIR = path.join(REPO_ROOT, 'tmp', 'vbox-lab');
const VBOX_MANAGE = process.platform === 'win32'
  ? 'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe'
  : 'VBoxManage';

const vms = execFileSync(VBOX_MANAGE, ['list', 'vms'], { encoding: 'utf8' });
if (vms.includes(`"${VM_NAME}"`)) {
  try {
    execFileSync(VBOX_MANAGE, ['controlvm', VM_NAME, 'poweroff'], { stdio: 'ignore' });
  } catch {
    // already off
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
  execFileSync(VBOX_MANAGE, ['unregistervm', VM_NAME, '--delete'], { stdio: 'inherit' });
  console.log(`Destroyed VirtualBox lab VM "${VM_NAME}" cleanly (all other VMs untouched).`);
} else {
  console.log(`VirtualBox lab VM "${VM_NAME}" does not exist.`);
}

// Keep cached Debian image unless --purge-cache is passed
if (process.argv.includes('--purge-cache')) {
  rmSync(WORK_DIR, { recursive: true, force: true });
  console.log('Removed tmp/vbox-lab including cached Debian image.');
} else {
  for (const sub of ['vm', 'seed', 'raw-extract', 'cidata.iso', 'serial.log', 'vm-state.json', 'lab_ed25519', 'lab_ed25519.pub']) {
    rmSync(path.join(WORK_DIR, sub), { recursive: true, force: true });
  }
  console.log('Cleaned VM artifacts (kept Debian image cache in tmp/vbox-lab/cache for fast re-runs; pass --purge-cache to remove).');
}
