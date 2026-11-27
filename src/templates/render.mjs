import { escapeHtml } from '../../scripts/lib/markdown.mjs';

const UI = {
  en: {
    skip: 'Skip to main content',
    navHome: 'Dossiers',
    navMirrors: 'Mirrors & Access',
    navVerify: 'Verify & Canary',
    navOffline: 'Offline Pack',
    switchLang: 'ภาษาไทย',
    fpLabel: 'Visual Fingerprint',
    releaseLabel: 'Release',
    updatedLabel: 'UTC',
    dossiersHeading: 'Published Public-Interest Dossiers',
    dossiersIntro: 'All dossiers below are 100% static, zero-JavaScript, cryptographically hashed, and mirrored across Tor, IPFS, BitTorrent, and offline packs.',
    readDossier: 'Read full dossier',
    correctionBanner: 'CORRECTION / SUPERSEDING NOTICE',
    statusCorrected: 'Corrected',
    statusPublished: 'Published',
    evidenceHeading: 'Verified Sanitized Evidence Files',
    evidenceEmpty: 'No external evidence files attached to this dossier.',
    sanitizationMethod: 'Sanitization Method',
    legalBasis: 'Public-Interest Basis',
    publishedUtc: 'Published (UTC)',
    downloadFile: 'Open / Save Artifact',
    backHome: 'Back to all dossiers',
    mirrorsHeading: 'Canonical Origins & Burnable Front Doors',
    mirrorsWarn: 'IMPORTANT: Do NOT operate clearnet mirrors or seed BitTorrent/IPFS from inside Thailand or from personal/KYC accounts linked to you.',
    canonicalHeading: 'Canonical Sources (Permanent, Resistant to DNS Seizure)',
    gatewaysHeading: 'Public IPFS HTTP Gateways (No Special Software Needed)',
    clearnetHeading: 'Burnable Clearnet Mirrors (Operated Outside Thailand)',
    mobileHeading: 'Offline & Mobile Access (LINE / iOS / Android / Ceno)',
    revokedHeading: 'Compromised / Revoked Mirrors (DO NOT TRUST)',
    verifyHeading: 'Cryptographic Verification & Warrant Canary',
    verifyStepsHeading: 'How to Verify Authenticity',
    canaryHeading: 'Signed Warrant Canary',
    intakeHeading: 'Submitting Sensitive Information (No Web Form)',
    footerNote: 'Zero trackers • Zero JavaScript • Works in Tor Browser Safest mode, IPFS gateways, and offline file:// folders.'
  },
  th: {
    skip: 'ข้ามไปยังเนื้อหาหลัก',
    navHome: 'แฟ้มเอกสาร',
    navMirrors: 'มิเรอร์และทางเข้า',
    navVerify: 'ตรวจสอบความถูกต้อง',
    navOffline: 'ชุดออฟไลน์',
    switchLang: 'English',
    fpLabel: 'ลายนิ้วมือข้อมูล',
    releaseLabel: 'เวอร์ชัน',
    updatedLabel: 'UTC',
    dossiersHeading: 'แฟ้มเอกสารตรวจสอบเพื่อสาธารณประโยชน์',
    dossiersIntro: 'เอกสารทั้งหมดเป็นเว็บสแตติก 100% ไม่ใช้ JavaScript มีรหัสแฮชตรวจสอบความถูกต้อง และกระจายสำเนาผ่าน Tor, IPFS, BitTorrent และไฟล์ออฟไลน์',
    readDossier: 'อ่านรายงานฉบับเต็ม',
    correctionBanner: 'ประกาศแก้ไขข้อมูล / เวอร์ชันที่แทนที่สำเนาเดิม',
    statusCorrected: 'มีประกาศแก้ไข',
    statusPublished: 'เผยแพร่แล้ว',
    evidenceHeading: 'ไฟล์หลักฐานที่ผ่านการล้างข้อมูลเมตาและตรวจสอบแฮชแล้ว',
    evidenceEmpty: 'ไม่มีไฟล์หลักฐานแนบเพิ่มเติมในแฟ้มนี้',
    sanitizationMethod: 'วิธีล้างข้อมูลต้นทาง',
    legalBasis: 'ฐานประโยชน์สาธารณะ',
    publishedUtc: 'เผยแพร่ (UTC)',
    downloadFile: 'เปิด / บันทึกไฟล์',
    backHome: 'กลับไปหน้าแฟ้มเอกสารทั้งหมด',
    mirrorsHeading: 'แหล่งต้นทางหลักและช่องทางสำรอง (Mirrors)',
    mirrorsWarn: 'คำเตือนสำคัญ: ห้ามผู้ที่อาศัยอยู่ในประเทศไทยเปิด Clearnet Mirror หรือปล่อย BitTorrent/IPFS จากไอพีในประเทศหรือบัญชีที่ยืนยันตัวตน (KYC) ของตนเองโดยเด็ดขาด',
    canonicalHeading: 'แหล่งต้นทางหลัก (ถาวร ไม่พึ่งพา DNS)',
    gatewaysHeading: 'IPFS HTTP Gateway สาธารณะ (เปิดได้ทันทีในเบราว์เซอร์ทั่วไป)',
    clearnetHeading: 'Clearnet Mirrors แบบใช้แล้วทิ้ง (ดูแลโดยอาสาสมัครนอกประเทศไทย)',
    mobileHeading: 'การอ่านแบบออฟไลน์และบนมือถือ (LINE / iOS / Android / Ceno)',
    revokedHeading: 'มิเรอร์ที่ถูกยึดหรือเพิกถอนแล้ว (ห้ามเชื่อถือ)',
    verifyHeading: 'การตรวจสอบลายเซ็นดิจิทัลและ Warrant Canary',
    verifyStepsHeading: 'วิธีตรวจสอบว่ามิเรอร์ไม่ถูกปลอมแปลง',
    canaryHeading: 'Warrant Canary ที่ลงนามด้วย PGP',
    intakeHeading: 'การส่งเบาะแสอย่างปลอดภัย (ไม่มีฟอร์มบนเว็บนี้)',
    footerNote: 'ไม่มีตัวติดตาม • ไม่ใช้ JavaScript • ใช้งานได้ใน Tor Browser โหมด Safest, IPFS Gateway และเปิดแบบออฟไลน์ (file://)'
  }
};

function renderShell({
  lang,
  relRoot,
  pageTitle,
  activeNav,
  switchHref,
  config,
  visualFingerprint,
  bodyHtml
}) {
  const t = UI[lang];
  const langPrefix = lang === 'th' ? `${relRoot}th/` : relRoot;
  const cssHref = `${relRoot}assets/main.css`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>${escapeHtml(pageTitle)} — ${escapeHtml(config.title[lang])}</title>
  <link rel="stylesheet" href="${cssHref}">
</head>
<body>
  <a class="skip-link" href="#main">${escapeHtml(t.skip)}</a>
  <div class="safety-banner" role="alert">
    <div class="container">${escapeHtml(config.readerSafetyBanner[lang])}</div>
  </div>
  ${config.isSampleTemplate ? `<div class="sample-banner"><div class="container">${escapeHtml(config.sampleNotice[lang])}</div></div>` : ''}
  <header class="site-header">
    <div class="container">
      <div class="header-top">
        <h1 class="site-title"><a href="${langPrefix}index.html">${escapeHtml(config.title[lang])}</a></h1>
        <a href="${switchHref}"><strong>${escapeHtml(t.switchLang)}</strong></a>
      </div>
      <p class="tagline">${escapeHtml(config.tagline[lang])}</p>
      <div class="fingerprint-bar" aria-label="Archive Verification Fingerprint">
        <span>${escapeHtml(t.fpLabel)}: <span class="fp-badge">${escapeHtml(visualFingerprint)}</span></span>
        <span>${escapeHtml(t.releaseLabel)}: v${escapeHtml(config.releaseVersion)}</span>
        <span>${escapeHtml(t.updatedLabel)}: ${escapeHtml(config.releaseDateUtc)}</span>
      </div>
      <nav class="nav" aria-label="Primary">
        <a href="${langPrefix}index.html"${activeNav === 'home' ? ' aria-current="page"' : ''}>${escapeHtml(t.navHome)}</a>
        <a href="${langPrefix}mirrors.html"${activeNav === 'mirrors' ? ' aria-current="page"' : ''}>${escapeHtml(t.navMirrors)}</a>
        <a href="${langPrefix}verify.html"${activeNav === 'verify' ? ' aria-current="page"' : ''}>${escapeHtml(t.navVerify)}</a>
        <a href="${relRoot}offline/archive-offline.html">${escapeHtml(t.navOffline)} (HTML)</a>
        <a href="${relRoot}offline/archive-printable.html">${escapeHtml(t.navOffline)} (Print/PDF)</a>
      </nav>
    </div>
  </header>
  <main id="main" class="container">
    ${bodyHtml}
  </main>
  <footer class="site-footer">
    <div class="container">
      <p>${escapeHtml(t.footerNote)}</p>
      <p><strong>${escapeHtml(t.fpLabel)}:</strong> <code>${escapeHtml(visualFingerprint)}</code> | <strong>PGP:</strong> <code>${escapeHtml(config.pgp.fingerprint)}</code></p>
    </div>
  </footer>
</body>
</html>
`;
}

export function renderHomePage({ lang, config, cases, visualFingerprint }) {
  const t = UI[lang];
  const relRoot = lang === 'th' ? '../' : './';
  const switchHref = lang === 'th' ? '../index.html' : './th/index.html';

  const correctionsHtml =
    config.corrections && config.corrections.length > 0
      ? `<section class="alert-warn" aria-label="Corrections">
          <strong>${escapeHtml(t.correctionBanner)}</strong>
          <ul>
            ${config.corrections
              .map(
                (c) =>
                  `<li><code>${escapeHtml(c.id)}</code> (${escapeHtml(c.dateUtc)}): ${escapeHtml(
                    lang === 'th' ? c.summaryTh : c.summaryEn
                  )}</li>`
              )
              .join('\n')}
          </ul>
        </section>`
      : '';

  const cardsHtml = cases
    .map((c) => {
      const badge =
        c.meta.status === 'corrected'
          ? `<span class="tag status-corrected">${escapeHtml(t.statusCorrected)}</span>`
          : `<span class="tag">${escapeHtml(t.statusPublished)}</span>`;
      return `<article class="card">
        <h2><a href="./cases/${escapeHtml(c.meta.id)}.html">${escapeHtml(c.meta.title)}</a></h2>
        <div class="meta-row">
          ${badge}
          <span>ID: <code>${escapeHtml(c.meta.id)}</code></span>
          <span>${escapeHtml(t.publishedUtc)}: ${escapeHtml(c.meta.publishedUtc)}</span>
          ${c.meta.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join(' ')}
        </div>
        <p>${escapeHtml(c.meta.summary)}</p>
        <p><a href="./cases/${escapeHtml(c.meta.id)}.html"><strong>${escapeHtml(t.readDossier)} &rarr;</strong></a></p>
      </article>`;
    })
    .join('\n');

  const bodyHtml = `
    ${correctionsHtml}
    <h2>${escapeHtml(t.dossiersHeading)}</h2>
    <p>${escapeHtml(t.dossiersIntro)}</p>
    ${cardsHtml}
  `;

  return renderShell({
    lang,
    relRoot,
    pageTitle: t.navHome,
    activeNav: 'home',
    switchHref,
    config,
    visualFingerprint,
    bodyHtml
  });
}

export function renderCasePage({ lang, config, dossier, evidenceEntries, visualFingerprint }) {
  const t = UI[lang];
  const relRoot = lang === 'th' ? '../../' : '../';
  const switchHref =
    lang === 'th'
      ? `../../cases/${escapeHtml(dossier.meta.id)}.html`
      : `../th/cases/${escapeHtml(dossier.meta.id)}.html`;
  const homeHref = '../index.html';

  const correctionHtml =
    dossier.meta.correctionNote
      ? `<div class="alert-warn"><strong>${escapeHtml(t.correctionBanner)}:</strong> ${escapeHtml(
          dossier.meta.correctionNote
        )}</div>`
      : '';

  const evidenceHtml =
    evidenceEntries.length > 0
      ? `<table>
          <thead>
            <tr>
              <th>ID</th>
              <th>File</th>
              <th>SHA-256</th>
              <th>${escapeHtml(t.sanitizationMethod)}</th>
            </tr>
          </thead>
          <tbody>
            ${evidenceEntries
              .map(
                (ev) => `<tr>
                  <td class="nowrap"><code class="nowrap">${escapeHtml(ev.id)}</code></td>
                  <td><a href="${relRoot}evidence/${escapeHtml(ev.filename)}">${escapeHtml(ev.filename)}</a> (${ev.size} B)</td>
                  <td class="break-all"><code>${escapeHtml(ev.sha256)}</code></td>
                  <td>${escapeHtml(ev.sanitizationMethod)}</td>
                </tr>`
              )
              .join('\n')}
          </tbody>
        </table>`
      : `<p>${escapeHtml(t.evidenceEmpty)}</p>`;

  const bodyHtml = `
    <p><a href="${homeHref}">&larr; ${escapeHtml(t.backHome)}</a></p>
    ${correctionHtml}
    <article class="card">
      <h2>${escapeHtml(dossier.meta.title)}</h2>
      <div class="meta-row">
        <span>ID: <code>${escapeHtml(dossier.meta.id)}</code></span>
        <span>${escapeHtml(t.publishedUtc)}: ${escapeHtml(dossier.meta.publishedUtc)}</span>
        <span>Legal Review: <code>${escapeHtml(dossier.meta.legalReviewStatus)}</code></span>
      </div>
      <p><strong>${escapeHtml(t.legalBasis)}:</strong> ${escapeHtml(dossier.meta.publicInterestBasis)}</p>
      <hr>
      ${dossier.html}
    </article>
    <section class="card">
      <h3>${escapeHtml(t.evidenceHeading)}</h3>
      ${evidenceHtml}
    </section>
  `;

  return renderShell({
    lang,
    relRoot,
    pageTitle: dossier.meta.title,
    activeNav: 'home',
    switchHref,
    config,
    visualFingerprint,
    bodyHtml
  });
}

export function renderMirrorsPage({ lang, config, mirrors, visualFingerprint }) {
  const t = UI[lang];
  const relRoot = lang === 'th' ? '../' : './';
  const switchHref = lang === 'th' ? '../mirrors.html' : './th/mirrors.html';
  const cid = mirrors.canonical.ipfsCid;

  const gatewaysRows = mirrors.ipfsGateways
    .map((gw) => {
      const resolved = gw.urlTemplate.replace('{CID}', cid);
      return `<tr>
        <td>${escapeHtml(gw.name)}</td>
        <td class="break-all"><code>${escapeHtml(resolved)}</code></td>
        <td>${escapeHtml(gw.notes)}</td>
      </tr>`;
    })
    .join('\n');

  const clearnetRows = mirrors.clearnetMirrors
    .map(
      (m) => `<tr>
        <td>${escapeHtml(m.label)}</td>
        <td class="break-all"><code>${escapeHtml(m.url)}</code></td>
        <td>${escapeHtml(m.operatorRegion)}</td>
        <td>ECH: ${m.supportsEch ? 'Yes' : 'No'} | Onion-Location: ${m.onionLocationHeader ? 'Yes' : 'No'}</td>
      </tr>`
    )
    .join('\n');

  const revokedRows = (mirrors.compromisedOrRevoked || [])
    .map(
      (r) => `<li><code class="break-all">${escapeHtml(r.address)}</code> — Revoked ${escapeHtml(
        r.revokedUtc
      )}: ${escapeHtml(r.reason)}</li>`
    )
    .join('\n');

  const bodyHtml = `
    <h2>${escapeHtml(t.mirrorsHeading)}</h2>
    <div class="alert-danger"><strong>${escapeHtml(t.mirrorsWarn)}</strong></div>

    <section class="card">
      <h3>${escapeHtml(t.canonicalHeading)}</h3>
      <ul>
        <li><strong>Tor v3 Onion:</strong> <code class="break-all">${escapeHtml(mirrors.canonical.torOnion)}</code></li>
        <li><strong>IPFS CID:</strong> <code class="break-all">${escapeHtml(cid)}</code></li>
        <li><strong>BitTorrent Magnet:</strong> <code class="break-all">${escapeHtml(mirrors.canonical.bittorrentMagnet)}</code></li>
        <li><strong>Machine-Readable Mirror Directory:</strong> <a href="${relRoot}mirrors.json"><code>mirrors.json</code></a></li>
      </ul>
    </section>

    <section class="card">
      <h3>${escapeHtml(t.gatewaysHeading)}</h3>
      <table>
        <thead><tr><th>Gateway</th><th>URL</th><th>Notes</th></tr></thead>
        <tbody>${gatewaysRows}</tbody>
      </table>
    </section>

    <section class="card">
      <h3>${escapeHtml(t.clearnetHeading)}</h3>
      <table>
        <thead><tr><th>Mirror</th><th>URL</th><th>Operator</th><th>Anti-Censorship Features</th></tr></thead>
        <tbody>${clearnetRows}</tbody>
      </table>
    </section>

    <section class="card">
      <h3>${escapeHtml(t.mobileHeading)}</h3>
      <ul>
        <li><a href="${relRoot}offline/archive-offline.html"><strong>Single-File Offline HTML</strong></a> — Save and forward via Signal, Telegram, AirDrop, or USB.</li>
        <li><a href="${relRoot}offline/archive-printable.html"><strong>Printable / Export-to-PDF Edition</strong></a> — Best for forwarding inside LINE or iOS where raw HTML attachments render poorly.</li>
        <li><a href="${relRoot}offline/archive-portable.zip"><strong>Portable Full-Site ZIP</strong></a> — Deterministic archive for offline browsing and BitTorrent redistribution.</li>
        ${(mirrors.outOfBandChannels || [])
          .map(
            (ch) =>
              `<li><strong>${escapeHtml(ch.name)}:</strong> <code>${escapeHtml(ch.handle)}</code> — ${escapeHtml(ch.purpose)}</li>`
          )
          .join('\n')}
      </ul>
    </section>

    ${
      revokedRows
        ? `<section class="alert-danger">
            <h3>${escapeHtml(t.revokedHeading)}</h3>
            <ul>${revokedRows}</ul>
          </section>`
        : ''
    }
  `;

  return renderShell({
    lang,
    relRoot,
    pageTitle: t.navMirrors,
    activeNav: 'mirrors',
    switchHref,
    config,
    visualFingerprint,
    bodyHtml
  });
}

export function renderVerifyPage({ lang, config, visualFingerprint }) {
  const t = UI[lang];
  const relRoot = lang === 'th' ? '../' : './';
  const switchHref = lang === 'th' ? '../verify.html' : './th/verify.html';

  const bodyHtml = `
    <h2>${escapeHtml(t.verifyHeading)}</h2>

    <section class="alert-ok">
      <strong>${escapeHtml(t.fpLabel)}:</strong> <code>${escapeHtml(visualFingerprint)}</code><br>
      <strong>PGP Key Fingerprint:</strong> <code>${escapeHtml(config.pgp.fingerprint)}</code><br>
      <strong>PGP UID:</strong> <code>${escapeHtml(config.pgp.uid)}</code><br>
      <a href="${relRoot}${escapeHtml(config.pgp.keyFile)}">Download Public PGP Key (.asc)</a> |
      <a href="${relRoot}SHA256SUMS">Download SHA256SUMS</a> |
      <a href="${relRoot}manifest.json">Download manifest.json</a>
    </section>

    <section class="card">
      <h3>${escapeHtml(t.verifyStepsHeading)}</h3>
      <ol>
        <li><strong>Quick Mobile Check (Everyone):</strong> Compare the 16-character Visual Fingerprint above (<code>${escapeHtml(visualFingerprint)}</code>) against the fingerprint posted in the official out-of-band broadcast channel or journalist release.</li>
        <li><strong>Full Cryptographic Check (Journalists &amp; Mirrors):</strong>
<pre><code># 1. Import and confirm the PGP key fingerprint matches above
gpg --import archive-release-key.asc
gpg --fingerprint "${escapeHtml(config.pgp.uid)}"

# 2. Verify the detached PGP signature on SHA256SUMS
gpg --verify SHA256SUMS.asc SHA256SUMS

# 3. Verify every file byte-for-byte
sha256sum -c SHA256SUMS</code></pre>
        </li>
      </ol>
      <p><em>Reminder: A valid signature proves the files were not altered by a mirror or network attacker. It does not by itself guarantee factual infallibility — always examine primary evidence and methodology.</em></p>
    </section>

    <section class="card">
      <h3>${escapeHtml(t.canaryHeading)}</h3>
      <p><strong>As of ${escapeHtml(config.warrantCanary.asOfUtc)}:</strong></p>
      <blockquote>
        <p>${escapeHtml(lang === 'th' ? config.warrantCanary.statementTh : config.warrantCanary.statementEn)}</p>
      </blockquote>
    </section>

    <section class="card">
      <h3>${escapeHtml(t.intakeHeading)}</h3>
      <p>${escapeHtml(config.intakeGuidance[lang])}</p>
    </section>
  `;

  return renderShell({
    lang,
    relRoot,
    pageTitle: t.navVerify,
    activeNav: 'verify',
    switchHref,
    config,
    visualFingerprint,
    bodyHtml
  });
}

export function renderOfflineSingleFile({ config, mirrors, casesByLang, evidenceMap, cssText, visualFingerprint, printable = false }) {
  const title = printable
    ? `${config.title.en} — Printable PDF Edition`
    : `${config.title.en} — Offline Self-Contained Archive`;

  const renderLangSection = (lang) => {
    const list = casesByLang[lang] || [];
    return list
      .map((c) => {
        const evRows = c.meta.evidenceIds
          .map((id) => evidenceMap.get(id))
          .filter(Boolean)
          .map(
            (ev) => `<li><code>${escapeHtml(ev.id)}</code> (${escapeHtml(ev.filename)}) — SHA-256: <code class="break-all">${escapeHtml(ev.sha256)}</code> [${escapeHtml(ev.sanitizationMethod)}]${
              ev.inlinePreview
                ? `<details><summary>Preview ${escapeHtml(ev.filename)}</summary><pre>${escapeHtml(ev.inlinePreview)}</pre></details>`
                : ''
            }</li>`
          )
          .join('\n');

        return `<article class="card" id="${lang}-${escapeHtml(c.meta.id)}">
          <h3>${escapeHtml(c.meta.title)}</h3>
          <div class="meta-row">
            <span>ID: <code>${escapeHtml(c.meta.id)}</code></span>
            <span>UTC: ${escapeHtml(c.meta.publishedUtc)}</span>
            <span>Status: <code>${escapeHtml(c.meta.status)}</code></span>
          </div>
          ${c.meta.correctionNote ? `<div class="alert-warn"><strong>CORRECTION:</strong> ${escapeHtml(c.meta.correctionNote)}</div>` : ''}
          <p><strong>Public-Interest Basis:</strong> ${escapeHtml(c.meta.publicInterestBasis)}</p>
          ${c.html}
          ${evRows ? `<h4>Evidence Hashes &amp; Extracts</h4><ul>${evRows}</ul>` : ''}
        </article>`;
      })
      .join('\n');
  };

  const cid = mirrors.canonical.ipfsCid;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>${escapeHtml(title)}</title>
  <style>
${cssText}
  </style>
</head>
<body>
  <div class="safety-banner">
    <div class="container">
      <strong>EN:</strong> ${escapeHtml(config.readerSafetyBanner.en)}<br>
      <strong>TH:</strong> ${escapeHtml(config.readerSafetyBanner.th)}
    </div>
  </div>
  <header class="site-header">
    <div class="container">
      <h1 class="site-title">${escapeHtml(config.title.en)} / ${escapeHtml(config.title.th)}</h1>
      <p class="tagline">${printable ? 'Printable / PDF-Export Edition (Save as PDF via Browser Print for LINE/iOS sharing; scrub PDF metadata with MAT2 before redistributing).' : 'Self-Contained Single-File Offline Archive (Zero External Requests, Zero JavaScript).'}</p>
      <div class="fingerprint-bar">
        <span>Visual Fingerprint: <span class="fp-badge">${escapeHtml(visualFingerprint)}</span></span>
        <span>Release: v${escapeHtml(config.releaseVersion)}</span>
        <span>UTC: ${escapeHtml(config.releaseDateUtc)}</span>
      </div>
      ${
        printable
          ? ''
          : `<nav class="nav"><a href="#en-dossiers">English Dossiers</a> <a href="#th-dossiers">แฟ้มภาษาไทย</a> <a href="#mirrors-offline">Mirrors &amp; Verification</a></nav>`
      }
    </div>
  </header>
  <main class="container">
    <section id="en-dossiers">
      <h2>English Dossiers</h2>
      ${renderLangSection('en')}
    </section>
    <section id="th-dossiers">
      <h2>แฟ้มเอกสารภาษาไทย (Thai Dossiers)</h2>
      ${renderLangSection('th')}
    </section>
    <section id="mirrors-offline" class="card">
      <h2>Canonical Mirrors &amp; Verification</h2>
      <ul>
        <li><strong>Visual Archive Fingerprint:</strong> <code>${escapeHtml(visualFingerprint)}</code></li>
        <li><strong>PGP Key Fingerprint:</strong> <code>${escapeHtml(config.pgp.fingerprint)}</code></li>
        <li><strong>Tor v3 Onion:</strong> <code class="break-all">${escapeHtml(mirrors.canonical.torOnion)}</code></li>
        <li><strong>IPFS CID:</strong> <code class="break-all">${escapeHtml(cid)}</code></li>
        <li><strong>IPFS Gateway:</strong> <code class="break-all">https://${escapeHtml(cid)}.ipfs.dweb.link/</code></li>
        <li><strong>BitTorrent Magnet:</strong> <code class="break-all">${escapeHtml(mirrors.canonical.bittorrentMagnet)}</code></li>
      </ul>
      <p><strong>Warrant Canary (${escapeHtml(config.warrantCanary.asOfUtc)}):</strong> ${escapeHtml(config.warrantCanary.statementEn)}</p>
    </section>
  </main>
</body>
</html>
`;
}
