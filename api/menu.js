/* GET /api/menu → the published menu document. Falls back to the seed in data/menu.json when nothing
   has been published yet (or storage is not connected). ?fresh=1 bypasses every cache (the admin uses it). */
import { readDoc, seed, send, query, storage } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { ok: false, error: 'method' });
  const fresh = 'fresh' in query(req);
  let data = null, source = 'seed';
  try {
    data = await readDoc(fresh);
    if (data) source = storage;
  } catch (e) {
    console.error('readDoc failed', e && e.message);
  }
  if (!data) data = seed();
  send(res, 200, { ok: true, source, data }, {
    'Cache-Control': fresh ? 'no-store' : 'public, max-age=0, s-maxage=30, stale-while-revalidate=300'
  });
}
