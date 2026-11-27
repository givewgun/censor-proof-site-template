# 07 — Local Testing Lab (Docker + VirtualBox + Surfshark VPN OPSEC Guide)

This guide shows how to **deploy, rehearse, and verify the entire censorship-resistant architecture safely on your own machine** using the 100% fictional sample archive — and clearly draws the line between **local lab testing** and **real-world high-risk OPSEC**.

---

## 1. Honest OPSEC Assessment: VirtualBox + Surfshark VPN on Windows

Before using VirtualBox and Surfshark, understand exactly what they protect against — and what they do **NOT** protect against:

| Layer | Good For (Safe) | NOT Sufficient For (Dangerous) |
| :--- | :--- | :--- |
| **Surfshark VPN** (paid commercial VPN) | Hiding clearnet browsing from your Thai ISP; bypassing Thai ISP DNS/SNI blocks when reading mirrors; rehearsing this lab. | **Anonymous high-stakes whistleblowing.** A commercial VPN paid via personal card/email simply moves trust from your ISP to Surfshark. Never rely on a personal VPN alone to run a real `.onion` origin, seed torrents, or register clearnet mirrors. |
| **VirtualBox on Personal Windows Host** | Running **Whonix** or a Debian Tor-Origin test VM to rehearse deployment, test Nginx/UFW/Tor v3 client-auth SSH, and learn the stack safely. | **True endpoint amnesia.** The Windows host OS has full visibility into VirtualBox RAM, clipboard, disk `.vdi` images, and Windows telemetry/swap. For real evidence handling, boot **Tails OS** from a live USB (or bare-metal **Qubes OS + Whonix**). |

**Rule of Thumb:**
- **Lab & Practice (Fictional Data):** Docker Lab or VirtualBox + Surfshark = **Ideal!**
- **Real Public-Interest Release:** Tails OS live USB + Offshore non-KYC VPS (Monero/XMR) + Offshore IPFS/Seedbox + Diaspora Mirrors outside Thailand.

---

## 2. One-Command Local End-to-End Docker Lab

The lab in `infra/lab/docker-compose.yml` launches **three isolated containers** using your built `dist/site/`:

1. **`censor-lab-tor-origin`** — Real **Nginx** (exact `infra/tor/nginx-onion.conf`, bound strictly to `127.0.0.1:8080`, zero host ports exposed, zero logs) + real **Tor v3 Onion Service** generating a live 56-character `.onion` address.
2. **`censor-lab-ipfs-offline`** — Real **Kubo IPFS** running in **strict offline mode (`Routing.Type=none`, zero bootstrap peers)** so it computes the real deterministic **CIDv1 (`bafybei...`)** and serves the real `/ipfs/<CID>/` Path Gateway on `http://127.0.0.1:8088/` with **zero DHT IP leak**.
3. **`censor-lab-caddy-mirror`** — Real **Caddy v2** zero-log burnable mirror on `http://127.0.0.1:8089/` automatically wired with `Onion-Location: http://<live-v3-onion>/` and strict `default-src 'none'` CSP.

### Start, Test & Tear Down

```bash
# 1. Build the deterministic static archive
npm run build

# 2. Launch Tor v3 origin + offline IPFS gateway + Caddy mirror
docker compose -f infra/lab/docker-compose.yml up -d --build

# 3. Run the automated end-to-end live verification suite (Nginx, Tor .onion, IPFS gateway, Caddy, GPG)
node scripts/lab-e2e.mjs

# 4. Tear down cleanly when finished (removes containers + temporary lab onion keys)
docker compose -f infra/lab/docker-compose.yml down -v
```

---

## 3. Automated VirtualBox Tor-Origin VM Lab (Full Kernel Lockdown + Tor v3 Client-Auth SSH)

Docker cannot test Linux kernel-level `ufw` firewall rules, `systemd-journald` volatile logging, or `sshd` lockdown — so this repository includes a **fully automated, zero-click VirtualBox provisioner** (`infra/virtualbox/`) that creates an isolated Debian 12 VM (`censor-proof-origin-lab`, strictly separate from your existing VMs):

```bash
# 1. Download official Debian 12 generic cloud image (verified via official SHA512SUMS),
#    generate x25519 Tor v3 client-auth keys locally (private key NEVER touches the VM!),
#    boot headless with clipboard/DnD/audio disabled and zero inbound clearnet ports,
#    and apply infra/tor/torrc + nginx-onion.conf + ufw-hardening.sh automatically:
npm run vbox:up

# 2. Verify live over the REAL Tor network:
#    - Public site .onion returns HTTP 200 + strict CSP + no ETag + POST=405
#    - Unauthenticated SSH to admin_ssh .onion is REJECTED by Tor
#    - Authenticated SSH WITH x25519 key succeeds & proves inside the VM:
#      UFW deny-all incoming, ZERO wildcard listening sockets, RAM-only journald, 0B Nginx logs!
npm run vbox:test

# 3. Cleanly tear down ONLY censor-proof-origin-lab when finished:
npm run vbox:down
```

### Optional Manual Two-VM Whonix Blueprint
If you also want to rehearse **Whonix-Gateway + Whonix-Workstation** as Zone A (Publisher Workstation) talking to `censor-proof-origin-lab` (Zone B):
1. Import the official signed **Whonix `.ova`** from `whonix.org` into VirtualBox.
2. Install **Dangerzone**, **MAT2**, **GnuPG**, and **Node.js** inside Whonix-Workstation.
3. Transfer `tmp/vbox-lab/lab_ed25519` and your `operator.auth_private` into Whonix-Workstation to rehearse managing the VirtualBox Tor-Origin VM completely over Tor!
