import path from 'node:path';

export const ALLOWED_EVIDENCE_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.txt',
  '.csv',
  '.json'
]);

export const OPAQUE_EVIDENCE_FILENAME_RE = /^EVD-\d{3,}[a-z0-9-]*\.(pdf|png|jpg|jpeg|txt|csv|json)$/;

const PDF_METADATA_TOKENS = [
  '/Author',
  '/Creator',
  '/Producer',
  '/CreationDate',
  '/ModDate',
  '/Subject',
  '/Keywords',
  '/Metadata',
  '/JavaScript',
  '/JS',
  '/OpenAction',
  'xmp:CreatorTool',
  'xmpMM:DocumentID',
  'pdf:Producer'
];

const LOCAL_PATH_LEAK_PATTERNS = [
  { name: 'Windows user path', re: /[A-Za-z]:\\Users\\[^\s"'<>]+/g },
  { name: 'macOS user path', re: /\/Users\/[A-Za-z0-9._-]+\//g },
  { name: 'Linux home path', re: /\/home\/[A-Za-z0-9._-]+\//g }
];

/**
 * Defense-in-depth binary & text metadata scanner for evidence artifacts (ADR-007).
 * NOTE: Passing this scanner NEVER replaces reconstructive sanitization (Dangerzone + MAT2).
 */
export function scanEvidenceFile(filename, buffer) {
  const issues = [];
  const ext = path.extname(filename).toLowerCase();

  if (!ALLOWED_EVIDENCE_EXTENSIONS.has(ext)) {
    issues.push(`Disallowed evidence file type "${ext}". Reconstruct to PDF/A (Dangerzone), PNG, or plain text/CSV/JSON.`);
  }

  if (!OPAQUE_EVIDENCE_FILENAME_RE.test(filename)) {
    issues.push(`Evidence filename "${filename}" is not an opaque ID (expected e.g. EVD-001.pdf or EVD-002.csv) to avoid leaking department/source names.`);
  }

  // Detect ZIP/OOXML disguised or unstripped Office containers
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    const latin1 = buffer.toString('latin1');
    if (latin1.includes('docProps/core.xml') || latin1.includes('word/document.xml') || latin1.includes('xl/workbook.xml')) {
      issues.push('Office/OOXML ZIP container detected. Never publish raw Office files — reconstruct via Dangerzone.');
    }
  }

  // JPEG EXIF / XMP / IPTC markers
  if (ext === '.jpg' || ext === '.jpeg') {
    const latin1 = buffer.toString('latin1');
    if (latin1.includes('Exif\0\0') || latin1.includes('http://ns.adobe.com/xap/1.0/') || latin1.includes('Photoshop 3.0')) {
      issues.push('JPEG contains EXIF, XMP, or IPTC metadata marker. Re-encode pixels and scrub with MAT2.');
    }
    // Check APP1 (0xFF 0xE1) or APP13 (0xFF 0xED) or COM (0xFF 0xFE) segments
    let idx = 2;
    while (idx + 4 < buffer.length && buffer[idx] === 0xff) {
      const marker = buffer[idx + 1];
      if (marker === 0xda) break; // SOS: image data begins
      const segLen = buffer.readUInt16BE(idx + 2);
      if (marker === 0xe1 || marker === 0xed || marker === 0xfe) {
        issues.push(`JPEG contains metadata segment marker 0xFF${marker.toString(16).toUpperCase()}. Strip/re-encode before publishing.`);
        break;
      }
      if (segLen < 2) break;
      idx += 2 + segLen;
    }
  }

  // PNG text / timestamp / ancillary metadata chunks
  if (ext === '.png') {
    const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIG)) {
      let offset = 8;
      while (offset + 12 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        if (length > buffer.length - offset - 12) {
          issues.push('Malformed PNG chunk length detected. Re-encode pixels via ImageMagick + MAT2.');
          break;
        }
        const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
        if (['tEXt', 'iTXt', 'zTXt', 'tIME', 'eXIf'].includes(type)) {
          issues.push(`PNG contains metadata chunk "${type}". Re-encode pixels and scrub with MAT2.`);
        }
        if (type === 'IEND') break;
        offset += 12 + length;
      }
    }
  }

  // PDF metadata keys, compressed object streams, hex-escaped names, & incremental-save revisions
  if (ext === '.pdf') {
    const latin1 = buffer.toString('latin1');
    for (const token of PDF_METADATA_TOKENS) {
      if (latin1.includes(token)) {
        issues.push(`PDF contains metadata token "${token}". Rebuild via Dangerzone (rasterize -> PDF/A) + MAT2.`);
      }
    }
    if (latin1.includes('/ObjStm')) {
      issues.push('PDF contains compressed object stream (/ObjStm) which can hide metadata from raw scanning. Rebuild via Dangerzone + MAT2.');
    }
    if (/\/Info\b/.test(latin1)) {
      issues.push('PDF contains /Info dictionary reference. Rebuild via Dangerzone + MAT2 to strip Info metadata.');
    }
    if (/\/[A-Za-z0-9_-]*#[0-9A-Fa-f]{2}/.test(latin1)) {
      issues.push('PDF contains hex-escaped name token (e.g. /Aut#68or) that can evade raw metadata inspection. Rebuild via Dangerzone.');
    }
    const eofMatches = latin1.match(/%%EOF/g);
    if (eofMatches && eofMatches.length > 1) {
      issues.push(`PDF contains ${eofMatches.length} %%EOF markers (incremental save history may retain deleted/redacted content). Rebuild via Dangerzone.`);
    }
  }

  // Local path leaks in text/CSV/JSON artifacts
  if (['.txt', '.csv', '.json'].includes(ext)) {
    const text = buffer.toString('utf8');
    for (const pat of LOCAL_PATH_LEAK_PATTERNS) {
      pat.re.lastIndex = 0;
      if (pat.re.test(text)) {
        issues.push(`Detected possible ${pat.name} leak inside "${filename}".`);
      }
    }
  }

  return issues;
}

export function scanTextForLocalPathLeaks(text) {
  const hits = [];
  for (const pat of LOCAL_PATH_LEAK_PATTERNS) {
    pat.re.lastIndex = 0;
    const matches = text.match(pat.re);
    if (matches) {
      hits.push(`${pat.name}: ${matches[0]}`);
    }
  }
  return hits;
}
