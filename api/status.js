/* GET /api/status → is storage connected, and when was the menu last published. */
import { readDoc, send, storage } from './_lib.js';

export default async function handler(req, res) {
  let updatedAt = null, hasDoc = false, error = null;
  try {
    const doc = await readDoc(true);
    if (doc) { hasDoc = true; updatedAt = doc.updatedAt || null; }
  } catch (e) { error = e && e.message ? e.message : 'read'; }
  send(res, 200, { ok: true, storage, hasDoc, updatedAt, error, now: new Date().toISOString() }, { 'Cache-Control': 'no-store' });
}
