/* Shared pieces of the Bosco API: the password/token check, the JSON body reader and the storage layer.
   Storage is Vercel Blob in production (BLOB_READ_WRITE_TOKEN is added by Vercel when a Blob store is
   connected to the project) or a local folder when BOSCO_LOCAL_STORE is set (dev/server.mjs does that). */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const PASSWORD = process.env.ADMIN_PASSWORD || 'bosco2026';
const LOCAL = process.env.BOSCO_LOCAL_STORE || '';

/* When a Blob store is connected, Vercel adds BLOB_STORE_ID and BLOB_READ_WRITE_TOKEN — but it prefixes
   both names when the store is not the project's first one or when a prefix was set while creating it
   (e.g. BOSCO_MENU_BLOB_READ_WRITE_TOKEN). So look for any variable whose name *ends* with the one we
   want, and hand what we find to the SDK explicitly instead of trusting it to read the bare name. */
function findEnv(suffix) {
  if (process.env[suffix]) return [suffix, process.env[suffix]];
  for (const k of Object.keys(process.env)) {
    if (k.endsWith(suffix) && process.env[k]) return [k, process.env[k]];
  }
  return ['', ''];
}
const [TOKEN_VAR, TOKEN] = findEnv('BLOB_READ_WRITE_TOKEN');
const [STORE_VAR, STORE_ID] = findEnv('BLOB_STORE_ID');
const creds = {};
if (TOKEN) creds.token = TOKEN;
if (STORE_ID) creds.storeId = STORE_ID;

export const storage = LOCAL ? 'local' : ((TOKEN || STORE_ID) ? 'blob' : 'none');
/* names only, never values: lets /api/status say what Vercel actually provided when something is off */
export const envReport = { version: 3, tokenVar: TOKEN_VAR, storeVar: STORE_VAR, blobVars: Object.keys(process.env).filter(k => /BLOB/i.test(k)).sort() };
const DOC_PATH = 'data/menu.json';
const SECRET = process.env.ADMIN_SECRET || sha256('bosco-admin:' + PASSWORD + ':' + (TOKEN || STORE_ID || ''));

function sha256(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function hmac(s) { return crypto.createHmac('sha256', SECRET).update(String(s)).digest('hex'); }
function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/* ── auth: a signed, expiring token handed out after the password check ── */
export function checkPassword(p) { return same(sha256(p || ''), sha256(PASSWORD)); }
export function makeToken(days = 7) { const exp = Date.now() + days * 864e5; return exp + '.' + hmac(exp); }
export function validToken(t) {
  const [exp, sig] = String(t || '').split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return same(hmac(exp), sig);
}
export function authed(req) {
  const h = req.headers['authorization'] || '';
  return validToken(h.replace(/^Bearer\s+/i, '').trim());
}

/* ── request / response helpers that work the same on Vercel and on the dev server ── */
export async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
    if (Buffer.isBuffer(req.body)) return req.body.length ? JSON.parse(req.body.toString('utf8')) : {};
    return req.body;
  }
  let data = '';
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : {};
}
export function send(res, status, obj, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const k of Object.keys(headers)) res.setHeader(k, headers[k]);
  res.end(JSON.stringify(obj));
}
export function query(req) {
  if (req.query) return req.query;
  const u = new URL(req.url || '/', 'http://x');
  return Object.fromEntries(u.searchParams.entries());
}

/* ── storage ── */
export function seed() {
  try { return require('../data/menu.json'); } catch (e) { /* fall through */ }
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'menu.json'), 'utf8')); } catch (e) { /* fall through */ }
  return { version: 2, updatedAt: null, season: 'normal', brand: {}, hero: {}, hours: [], featured: { show: false, cards: [] }, ribbon: [], seasonNote: {}, perso: {}, vitrina: {}, pet: {}, visit: {}, categories: [] };
}

let sdk = null;
async function blob() { if (!sdk) sdk = await import('@vercel/blob'); return sdk; }

export async function readDoc(fresh = false) {
  if (storage === 'local') {
    try { return JSON.parse(fs.readFileSync(path.join(LOCAL, 'menu.json'), 'utf8')); } catch { return null; }
  }
  if (storage === 'blob') {
    const { get } = await blob();
    const r = await get(DOC_PATH, { ...creds, access: 'public', useCache: !fresh, abortSignal: AbortSignal.timeout(8000) });
    if (!r || r.statusCode !== 200 || !r.stream) return null;
    const text = await new Response(r.stream).text();
    return JSON.parse(text);
  }
  return null;
}

export async function writeDoc(doc) {
  const body = JSON.stringify(doc);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (storage === 'local') {
    fs.mkdirSync(path.join(LOCAL, 'history'), { recursive: true });
    fs.writeFileSync(path.join(LOCAL, 'menu.json'), body);
    fs.writeFileSync(path.join(LOCAL, 'history', stamp + '.json'), body);
    return;
  }
  const { put } = await blob();
  await put(DOC_PATH, body, { ...creds, access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60, abortSignal: AbortSignal.timeout(25000) });
  /* every publication is kept, so an earlier version can always be recovered */
  try {
    await put('data/history/' + stamp + '.json', body, { ...creds, access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', abortSignal: AbortSignal.timeout(25000) });
  } catch (e) { console.error('history copy failed', e && e.message); }
}

export async function putImage(name, buf, type) {
  if (storage === 'local') {
    const dir = path.join(LOCAL, 'uploads');
    fs.mkdirSync(dir, { recursive: true });
    const file = name.replace(/\.(\w+)$/, '-' + crypto.randomBytes(3).toString('hex') + '.$1');
    fs.writeFileSync(path.join(dir, file), buf);
    return '/_uploads/' + file;
  }
  const { put } = await blob();
  const r = await put('img/' + name, buf, { ...creds, access: 'public', addRandomSuffix: true, contentType: type, abortSignal: AbortSignal.timeout(40000) });
  return r.url;
}
