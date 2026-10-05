/* GET /api/status → is storage connected, and when was the menu last published.
   While storage is missing it also reports which BLOB_* variables Vercel provided (names only, never
   values), which is what tells you whether the store is connected under a prefixed name. */
import { readDoc, send, storage, envReport } from './_lib.js';

export default async function handler(req, res) {
  let updatedAt = null, hasDoc = false, error = null;
  try {
    const doc = await readDoc(true);
    if (doc) { hasDoc = true; updatedAt = doc.updatedAt || null; }
  } catch (e) { error = e && e.message ? e.message : 'read'; }
  const body = { ok: true, version: envReport.version, storage, hasDoc, updatedAt, error, now: new Date().toISOString() };
  if (storage !== 'blob') body.diagnostico = { blobVars: envReport.blobVars, tokenVar: envReport.tokenVar, storeVar: envReport.storeVar };
  send(res, 200, body, { 'Cache-Control': 'no-store' });
}
