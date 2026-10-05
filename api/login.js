/* POST /api/login {password} → {token}. The password is ADMIN_PASSWORD (default bosco2026). */
import { checkPassword, makeToken, readBody, send, authed } from './_lib.js';

export default async function handler(req, res) {
  /* GET with a Bearer token: is this session still valid? */
  if (req.method === 'GET') return send(res, authed(req) ? 200 : 401, { ok: authed(req) }, { 'Cache-Control': 'no-store' });
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method' });
  let body = {};
  try { body = await readBody(req); } catch { return send(res, 400, { ok: false, error: 'json' }); }
  if (!checkPassword(body.password)) {
    await new Promise(r => setTimeout(r, 600));          /* a small brake against guessing */
    return send(res, 401, { ok: false, error: 'password' }, { 'Cache-Control': 'no-store' });
  }
  send(res, 200, { ok: true, token: makeToken(7), days: 7 }, { 'Cache-Control': 'no-store' });
}
