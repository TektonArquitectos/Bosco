/* POST /api/publish {data} (Bearer token) → saves the document everyone sees. */
import { authed, readBody, send, writeDoc, storage } from './_lib.js';

const MAX_BYTES = 900 * 1024;
const str = (v, n = 4000) => (v === null || v === undefined) ? '' : String(v).slice(0, n);
const num = v => (v === '' || v === null || v === undefined) ? null : (isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : null);
const bool = v => !!v;
const url = v => {
  const s = str(v, 2000).trim();
  if (!s) return '';
  if (/^data:/i.test(s)) throw new Error('Una imagen no terminó de subirse. Vuelve a elegirla e inténtalo de nuevo.');
  if (!/^(https?:\/\/|img\/|art\/|\/_uploads\/)/i.test(s)) throw new Error('Dirección de imagen no válida.');
  return s;
};
const kind = v => (v === 'cut' || v === 'photo') ? v : '';
const id = v => str(v, 80).replace(/[^a-zA-Z0-9_-]/g, '') || ('x' + Math.random().toString(36).slice(2, 8));

/* keep only what the page knows how to show, with the types it expects */
function clean(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.categories)) throw new Error('Documento incompleto.');
  const o = {
    version: 2,
    updatedAt: new Date().toISOString(),
    season: ['normal', 'primavera', 'verano', 'muertos', 'navidad'].includes(d.season) ? d.season : 'normal',
    brand: {}, hero: {}, hours: [], featured: { show: true, title: '', cards: [] }, ribbon: [], seasonNote: {}, perso: {}, vitrina: {}, pet: {}, visit: {}, categories: []
  };
  const b = d.brand || {};
  o.brand = { tagline: str(b.tagline, 120), instagram: str(b.instagram, 60).replace(/^@/, ''), address: str(b.address, 300), mapsQuery: str(b.mapsQuery, 300), footLine: str(b.footLine, 80), priceNote: str(b.priceNote, 160) };
  const h = d.hero || {};
  o.hero = { togo: url(h.togo), togoKind: kind(h.togoKind), croissant: url(h.croissant), croissantKind: kind(h.croissantKind), cup: url(h.cup), cupKind: kind(h.cupKind) };
  for (let i = 0; i < 7; i++) {
    const x = (Array.isArray(d.hours) && d.hours[i]) || {};
    o.hours.push({ open: str(x.open, 5), close: str(x.close, 5), closed: bool(x.closed) });
  }
  const f = d.featured || {};
  o.featured = { show: bool(f.show), title: str(f.title, 60), cards: (Array.isArray(f.cards) ? f.cards : []).slice(0, 6).map(c => ({
    id: id(c.id), style: ['paper', 'plum', 'blush', 'wine'].includes(c.style) ? c.style : 'paper', tag: str(c.tag, 40), title: str(c.title, 60), text: str(c.text, 200),
    price: str(c.price, 30), link: str(c.link, 60), linkText: str(c.linkText, 30), img: url(c.img), imgKind: kind(c.imgKind), img2: url(c.img2), img2Kind: kind(c.img2Kind), note: str(c.note, 120), spin: bool(c.spin)
  })) };
  o.ribbon = (Array.isArray(d.ribbon) ? d.ribbon : []).slice(0, 12).map(t => str(t, 60)).filter(Boolean);
  const sn = d.seasonNote || {};
  o.seasonNote = { show: bool(sn.show), text: str(sn.text, 120) };
  const p = d.perso || {};
  o.perso = { show: bool(p.show), title: str(p.title, 60), lead: str(p.lead, 200), polaroid: url(p.polaroid), polaroidCaption: str(p.polaroidCaption, 30), cup: url(p.cup), cupKind: kind(p.cupKind), price: str(p.price, 12), note: str(p.note, 120), note2: str(p.note2, 160) };
  const v = d.vitrina || {};
  o.vitrina = { show: bool(v.show), caption: str(v.caption, 40), after: str(v.after, 60) };
  const pe = d.pet || {};
  o.pet = { show: bool(pe.show), title: str(pe.title, 40), text: str(pe.text, 120), img: url(pe.img), imgKind: kind(pe.imgKind) };
  const vi = d.visit || {};
  o.visit = { title: str(vi.title, 40), gallery: (Array.isArray(vi.gallery) ? vi.gallery : []).slice(0, 6).map(url).filter(Boolean) };
  o.categories = d.categories.slice(0, 40).map(c => {
    const art = c.art || {};
    return {
      id: id(c.id), name: str(c.name, 60), chip: str(c.chip, 24), group: c.group === 'alimentos' ? 'alimentos' : 'bebidas',
      sizes: (Array.isArray(c.sizes) ? c.sizes : []).slice(0, 2).map(s => str(s, 12)),
      kw: str(c.kw, 200),
      art: art.img ? { img: url(art.img), kind: kind(art.kind) } : { preset: str(art.preset, 30) || 'pasteles' },
      extra: (c.extra && str(c.extra.n).trim()) ? { n: str(c.extra.n, 80), p: num(c.extra.p) } : null,
      items: (Array.isArray(c.items) ? c.items : []).slice(0, 200).map(it => ({
        id: id(it.id), n: str(it.n, 90), p: (Array.isArray(it.p) ? it.p : [it.p]).slice(0, 2).map(num), d: str(it.d, 300), img: url(it.img), imgKind: kind(it.imgKind), hidden: bool(it.hidden)
      }))
    };
  });
  return o;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method' });
  if (!authed(req)) return send(res, 401, { ok: false, error: 'auth' });
  if (storage === 'none') return send(res, 503, { ok: false, error: 'storage', message: 'El almacenamiento no está conectado. En Vercel: Storage → Create → Blob, conéctalo a este proyecto y vuelve a desplegar.' });
  let body;
  try { body = await readBody(req); } catch { return send(res, 400, { ok: false, error: 'json' }); }
  let doc;
  try { doc = clean(body.data); } catch (e) { return send(res, 400, { ok: false, error: 'invalid', message: e.message }); }
  const size = Buffer.byteLength(JSON.stringify(doc));
  if (size > MAX_BYTES) return send(res, 413, { ok: false, error: 'size', message: 'El menú es demasiado grande (' + Math.round(size / 1024) + ' KB).' });
  try {
    await writeDoc(doc);
  } catch (e) {
    console.error('writeDoc failed', e);
    return send(res, 500, { ok: false, error: 'write', message: 'No se pudo guardar: ' + (e && e.message ? e.message : 'error') });
  }
  send(res, 200, { ok: true, updatedAt: doc.updatedAt, data: doc }, { 'Cache-Control': 'no-store' });
}
