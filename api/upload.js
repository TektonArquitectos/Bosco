/* POST /api/upload {name, type, data: base64} (Bearer token) → {url}. The admin shrinks pictures before
   sending them (≈1400 px, WebP), so a photo weighs a few hundred KB at most. */
import { authed, readBody, send, putImage, storage } from './_lib.js';

const TYPES = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' };
const MAX = 4 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method' });
  if (!authed(req)) return send(res, 401, { ok: false, error: 'auth' });
  if (storage === 'none') return send(res, 503, { ok: false, error: 'storage', message: 'El almacenamiento no está conectado. En Vercel: Storage → Create → Blob, conéctalo a este proyecto y vuelve a desplegar.' });
  let body;
  try { body = await readBody(req); } catch { return send(res, 400, { ok: false, error: 'json' }); }
  const ext = TYPES[body.type];
  if (!ext) return send(res, 400, { ok: false, error: 'type', message: 'Formato no admitido (usa JPG, PNG o WebP).' });
  let buf;
  try { buf = Buffer.from(String(body.data || ''), 'base64'); } catch { return send(res, 400, { ok: false, error: 'data' }); }
  if (!buf.length) return send(res, 400, { ok: false, error: 'data' });
  if (buf.length > MAX) return send(res, 413, { ok: false, error: 'size', message: 'La imagen pesa demasiado.' });
  const base = String(body.name || 'imagen').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\.[a-z0-9]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'imagen';
  try {
    const url = await putImage(base + '.' + ext, buf, body.type);
    send(res, 200, { ok: true, url }, { 'Cache-Control': 'no-store' });
  } catch (e) {
    console.error('upload failed', e);
    send(res, 500, { ok: false, error: 'write', message: 'No se pudo subir la imagen: ' + (e && e.message ? e.message : 'error') });
  }
}
