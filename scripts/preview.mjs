import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_DIR = path.resolve(__dirname, '..', 'dist', 'site');
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.asc': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.zip': 'application/zip'
};

// Mirrors the hardened Nginx/CDN security headers locally for realistic testing.
// Intentionally logs ZERO visitor requests (zero-log preview).
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

if (!existsSync(SITE_DIR)) {
  console.error('dist/site not found. Run "npm run build" first.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, SECURITY_HEADERS);
    res.end('Method Not Allowed');
    return;
  }

  let reqPath;
  try {
    reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    res.writeHead(400, SECURITY_HEADERS);
    res.end('Bad Request');
    return;
  }
  const safeRel = reqPath.replace(/^\/+/, '');
  let target = path.resolve(SITE_DIR, safeRel || 'index.html');

  if (target !== SITE_DIR && !target.startsWith(SITE_DIR + path.sep)) {
    res.writeHead(403, SECURITY_HEADERS);
    res.end('Forbidden');
    return;
  }

  if (existsSync(target) && statSync(target).isDirectory()) {
    target = path.join(target, 'index.html');
  }

  if (!existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, SECURITY_HEADERS);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(target).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const body = readFileSync(target);
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': contentType,
    'Content-Length': body.length
  });
  res.end(req.method === 'HEAD' ? undefined : body);
});

// Strictly bound to loopback 127.0.0.1 (never 0.0.0.0)
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Zero-log loopback preview running at http://127.0.0.1:${PORT}/`);
  console.log(`Thai index: http://127.0.0.1:${PORT}/th/index.html`);
});
