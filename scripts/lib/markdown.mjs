import { normalizeLf } from './fs-utils.mjs';

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function parseFrontmatter(raw) {
  const text = normalizeLf(raw);
  if (!text.startsWith('---\n')) {
    throw new Error('Markdown file missing YAML frontmatter delimiter (---).');
  }
  const endIdx = text.indexOf('\n---\n', 4);
  if (endIdx === -1) {
    throw new Error('Markdown frontmatter not closed with ---.');
  }
  const headerBlock = text.slice(4, endIdx);
  const body = text.slice(endIdx + 5).trim();
  const meta = {};

  for (const line of headerBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    const val = trimmed.slice(colon + 1).trim();
    meta[key] = val;
  }

  if (meta.evidenceIds) {
    meta.evidenceIds = meta.evidenceIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    meta.evidenceIds = [];
  }

  if (meta.tags) {
    meta.tags = meta.tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    meta.tags = [];
  }

  return { meta, body };
}

function isSafeLinkHref(href) {
  const trimmed = href.trim();
  // Only allow safe relative links, hash anchors, or explicit http(s) hyperlinks in prose (never javascript:/data:/vbscript:)
  if (trimmed.startsWith('#') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return true;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return true;
  }
  return false;
}

function renderInline(raw) {
  // Escape HTML first so raw HTML tags or <script> in Markdown can NEVER execute.
  let out = escapeHtml(raw);

  // Inline code spans (protect contents from bold/italic replacement)
  const codeSpans = [];
  out = out.replace(/`([^`]+)`/g, (_, code) => {
    const token = `\u0000CODE${codeSpans.length}\u0000`;
    codeSpans.push(`<code>${code}</code>`);
    return token;
  });

  // Safe links: [label](href)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const unescapedHref = href.replace(/&amp;/g, '&');
    if (!isSafeLinkHref(unescapedHref)) {
      return `${label} (blocked unsafe link)`;
    }
    const isExternal = /^https?:\/\//i.test(unescapedHref);
    const relAttr = isExternal ? ' rel="noopener noreferrer nofollow"' : '';
    return `<a href="${escapeHtml(unescapedHref)}"${relAttr}>${label}</a>`;
  });

  // Bold & italic
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Restore inline code
  out = out.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => codeSpans[Number(i)]);
  return out;
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function renderMarkdown(md) {
  const lines = normalizeLf(md).split('\n');
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Headings (# .. ####)
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      html.push(`<blockquote><p>${renderInline(quoteLines.join(' '))}</p></blockquote>`);
      continue;
    }

    // GFM Table
    if (
      trimmed.startsWith('|') &&
      i + 1 < lines.length &&
      /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(lines[i + 1].trim())
    ) {
      const headers = parseTableRow(lines[i]);
      i += 2; // skip header & separator
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      const thead = `<thead><tr>${headers.map((h) => `<th>${renderInline(h)}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody>`;
      html.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${renderInline(lines[i].trim().replace(/^[-*]\s+/, ''))}</li>`);
        i++;
      }
      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${renderInline(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Paragraph (join contiguous plain lines)
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('|') &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    html.push(`<p>${renderInline(paraLines.join(' '))}</p>`);
  }

  return html.join('\n');
}
