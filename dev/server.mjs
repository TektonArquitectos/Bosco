/* Local preview of the whole site, API included, without Vercel:   node dev/server.mjs  →  http://localhost:3000
   The API functions in /api run as they would on Vercel; storage goes to the folder .local-data (ignored by git). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 3000);
process.env.BOSCO_LOCAL_STORE = process.env.BOSCO_LOCAL_STORE || path.join(ROOT, '.local-data');
fs.mkdirSync(process.env.BOSCO_LOCAL_STORE, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };

function serveFile(res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.statusCode = 404; res.end('Not found'); return; }
    res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(file).pipe(res);
  });
}

const api = {};
async function fn(name) {
  if (!/^[a-z]+$/.test(name)) return null;
  if (!api[name]) {
    const file = path.join(ROOT, 'api', name + '.js');
    if (!fs.existsSync(file)) return null;
    api[name] = (await import(pathToFileURL(file).href)).default;
  }
  return api[name];
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  let p = decodeURIComponent(u.pathname);
  if (p.startsWith('/api/')) {
    const h = await fn(p.slice(5));
    if (!h) { res.statusCode = 404; res.end('{"ok":false}'); return; }
    req.query = Object.fromEntries(u.searchParams.entries());
    try { await h(req, res); } catch (e) { console.error(e); if (!res.headersSent) { res.statusCode = 500; res.end('{"ok":false,"error":"crash"}'); } }
    return;
  }
  if (p.startsWith('/_uploads/')) return serveFile(res, path.join(process.env.BOSCO_LOCAL_STORE, 'uploads', path.basename(p)));
  if (p === '/') p = '/index.html';
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.statusCode = 403; res.end(); return; }
  if (!path.extname(file) && fs.existsSync(file + '.html')) file += '.html';     /* cleanUrls, like Vercel */
  serveFile(res, file);
}).listen(PORT, () => console.log('Bosco local · http://localhost:' + PORT + '  (admin: /admin · datos en ' + process.env.BOSCO_LOCAL_STORE + ')'));
