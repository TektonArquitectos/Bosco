/* Bosco Coffee House · menú digital
   Everything on the page is drawn from one JSON document (the one the admin edits). The page renders it,
   wires the animations, the search and the open/closed clock, and can re-render on the fly: that is how
   the admin's live preview works (the admin posts the draft document into this page through postMessage). */
(function () {
  'use strict';
  var d = document, root = d.documentElement, W = window;
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  var reduce = !!(W.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hasIO = 'IntersectionObserver' in W;
  var PREVIEW = /(^|[?&#])preview(=|&|$)/.test(location.search + ' ' + location.hash);
  var IN_FRAME = W.parent !== W;
  var menu = $('#menu');
  var API = (W.BOSCO_API || '') + '/api/menu';

  /* ───────────────────────── helpers ───────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtNum(n) {
    n = Number(n);
    if (isNaN(n)) return '';
    return (Math.round(n * 100) / 100).toString().replace('.', '.');
  }
  function price(p) { return (p === null || p === undefined || p === '') ? '' : '$' + fmtNum(p); }
  var PHOTO_SEED = { 'img/dog-close.webp': 1, 'img/flatbread.webp': 1, 'img/ilustracion.webp': 1, 'img/interior-arch.webp': 1, 'img/interior-bar.webp': 1, 'img/interior-salon.webp': 1, 'img/interior-wide.webp': 1, 'img/vitrina.webp': 1 };
  /* is this picture a cut-out (floats, drop shadow) or an ordinary photo (shown inside a round plate)? */
  function kindOf(src, declared) {
    if (declared === 'cut' || declared === 'photo') return declared;
    if (!src) return 'photo';
    if (/\.svg(\?|$)/i.test(src)) return 'cut';
    if (/^(img|art)\//.test(src)) return PHOTO_SEED[src] ? 'photo' : 'cut';
    return 'photo';
  }
  function img(src, w, h, cls, style, attrs, alt) {
    return '<img' + (cls ? ' class="' + cls + '"' : '') + (style ? ' style="' + style + '"' : '') + ' src="' + esc(src) + '"'
      + (w ? ' width="' + w + '" height="' + h + '"' : '') + ' alt="' + esc(alt || '') + '"' + (attrs || '') + '>';
  }
  function slot(src, kind, w, h, cls, style, attrs, alt) {
    /* an image slot that may hold a cut-out or a photo */
    var k = kindOf(src, kind);
    return img(src, k === 'cut' ? w : 0, h, (cls || '') + (k === 'cut' ? ' cut' : ' photo'), style, attrs, alt);
  }
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C5 15.6 2 12 2 8.2 2 5.3 4.2 3.2 7 3.2c1.9 0 3.7 1 5 2.9 1.3-1.9 3.1-2.9 5-2.9 2.8 0 5 2.1 5 5C22 12 19 15.6 12 21z"/></svg>';
  var SEARCH_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.6 15.6 20.5 20.5"/></svg>';
  var CLOSE_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var PIN_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.7-6.5-10.6a6.5 6.5 0 1 1 13 0C18.5 15.3 12 21 12 21z"/><circle cx="12" cy="10.4" r="2.3"/></svg>';
  var COPY_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="12" rx="2.5"/><path d="M5 15.5V6a2 2 0 0 1 2-2h8"/></svg>';
  var IG_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.6"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.7" cy="7.3" r=".6" fill="currentColor"/></svg>';
  var PLAY_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.3v13.4a1 1 0 0 0 1.5.9l10.6-6.7a1 1 0 0 0 0-1.8L10 4.4a1 1 0 0 0-1.5.9z"/></svg>';
  var DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var DAYS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  var DEFAULTS = {
    brand: { tagline: 'coffee, people & good times', instagram: 'boscosocialhub', address: '', mapsQuery: 'Bosco Coffee House Pachuca', footLine: 'Good days start here', priceNote: 'Precios en pesos mexicanos (MXN).' },
    hero: { togo: 'img/cup-togo.webp', croissant: 'img/croissant.webp', cup: 'img/cup-perso.webp' },
    hours: null, featured: { show: false, cards: [] }, ribbon: [], seasonNote: { show: false }, perso: { show: false }, vitrina: { show: false },
    pet: { show: false }, visit: { gallery: [] }, categories: [], season: 'normal'
  };
  function withDefaults(doc) {
    var o = {};
    for (var k in DEFAULTS) o[k] = DEFAULTS[k];
    for (var j in doc) o[j] = doc[j];
    o.brand = assign({}, DEFAULTS.brand, doc.brand || {});
    o.hero = assign({}, DEFAULTS.hero, doc.hero || {});
    return o;
  }
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; for (var k in s) t[k] = s[k]; } return t; }

  /* ───────────────────────── hours ───────────────────────── */
  function toMin(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    var v = (+m[1]) * 60 + (+m[2]);
    return (v >= 0 && v <= 1440) ? v : null;
  }
  function hhmm(m) { var mi = m % 60; return Math.floor(m / 60) + ':' + (mi < 10 ? '0' : '') + mi; }
  function dayHours(hours, i) {
    var h = (hours && hours[i]) || {};
    if (h.closed) return null;
    var o = toMin(h.open), c = toMin(h.close);
    if (o === null || c === null || c <= o) return null;
    return [o, c];
  }
  function mxNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
      var h = parseInt(o.hour, 10) % 24, mi = parseInt(o.minute, 10);
      if (day < 0 || isNaN(h) || isNaN(mi)) return null;
      return { day: day, min: h * 60 + mi };
    } catch (e) { return null; }
  }
  function statusText(hours, n) {
    var t = dayHours(hours, n.day), open = !!t && n.min >= t[0] && n.min < t[1], txt;
    if (open) txt = (t[1] - n.min <= 45 ? 'Cerramos pronto, a las ' : 'Abierto ahora, cerramos a las ') + hhmm(t[1]);
    else if (t && n.min < t[0]) txt = 'Abrimos hoy a las ' + hhmm(t[0]);
    else {
      txt = 'Cerrado por hoy';
      for (var k = 1; k <= 7; k++) {
        var dd = (n.day + k) % 7, tt = dayHours(hours, dd);
        if (tt) { txt = 'Abrimos ' + (k === 1 ? 'mañana' : 'el ' + DAYS_L[dd]) + ' a las ' + hhmm(tt[0]); break; }
      }
    }
    return { open: open, text: txt };
  }
  function hoursSummary(hours) {
    /* "Lun a sáb 8:00 a 22:00, dom 10:00 a 22:00" for the pill before the clock has spoken */
    return hoursRows(hours).map(function (r) { return r.label + ' ' + r.value; }).join(', ');
  }
  function hoursRows(hours) {
    /* consecutive days with the same hours are grouped, Monday first */
    var order = [1, 2, 3, 4, 5, 6, 0], rows = [], i = 0;
    while (i < order.length) {
      var a = order[i], ta = dayHours(hours, a), j = i;
      while (j + 1 < order.length) {
        var tb = dayHours(hours, order[j + 1]);
        if ((ta === null && tb === null) || (ta && tb && ta[0] === tb[0] && ta[1] === tb[1])) j++; else break;
      }
      var days = order.slice(i, j + 1);
      var label = days.length === 1 ? DAYS[days[0]] : DAYS[days[0]] + ' a ' + DAYS_L[days[days.length - 1]];
      rows.push({ days: days, label: label, value: ta ? hhmm(ta[0]) + ' a ' + hhmm(ta[1]) : 'Cerrado' });
      i = j + 1;
    }
    return rows;
  }

  /* ───────────────────────── category art presets ───────────────────────── */
  var bubbles = [[4, 18, 8, 4.2, -0.4, 8], [20, 30, 44, 5.0, -1.9, -6], [40, 14, 20, 3.8, -2.8, 5], [52, 38, 70, 5.6, -3.6, -8], [74, 22, 30, 4.4, -1.1, 6], [88, 12, 62, 3.6, -2.2, -4], [30, 10, 92, 3.4, -0.9, 4], [66, 9, 6, 3.9, -3.2, -3]]
    .map(function (b) { return '<i class="bub" style="left:' + b[0] + '%;width:' + b[1] + 'px;height:' + b[1] + 'px;--by:' + b[2] + 'px;--bd:' + b[3] + 's;--bl:' + b[4] + 's;--bx:' + b[5] + 'px"></i>'; }).join('');
  var ART = {
    calientes: { sh: 176, cls: 'art-calientes', html: img('art/dog-cup.svg', 982, 830, 'fl', '--fd:7s;--rw:2.4deg') },
    frias: { sh: 160, cls: 'art-frias', html: img('img/iced-latte.webp', 585, 900, 'fl cut', '--fd:6s;--r:6deg') },
    frappes: { sh: 166, cls: 'art-frappes', html: img('img/granita.webp', 369, 760, 'fl cut', '--fd:6.6s;--r:-5deg') },
    matcha: { sh: 198, cls: 'art-matcha', html: img('img/straw-matcha.webp', 452, 698, 'm2 fl cut', '--fd:7s;--fdl:-2s;--r:-7deg') + img('img/matcha.webp', 820, 1000, 'm1 fl cut', '--fd:6s') },
    tes: { sh: 150, cls: 'art-tes', html: img('art/icon-cupbook.svg', 368, 328, 'fl', '--fd:7s;--rw:2deg') },
    sodas: { sh: 124, cls: 'art-sodas', html: bubbles },
    alimentos: { sh: 166, cls: 'art-alimentos', html: '<div class="ph">' + img('img/flatbread.webp', 720, 540) + '</div>' + img('img/oats.webp', 640, 634, 'oats fl cut', '--fd:6.4s;--r:-8deg') },
    panaderia: { sh: 132, cls: 'art-panaderia', html: img('img/croissant.webp', 877, 595, 'fl cut', '--fd:7s;--r:-4deg') },
    roles: { sh: 132, cls: 'art-roles', html: img('img/plate-roll.webp', 616, 698, 'cut spin', '', ' data-k="0.09"') },
    dulces: { sh: 150, cls: 'art-dulces', html: img('img/plate-drizzle.webp', 538, 532, 'd1 cut spin', '', ' data-k="0.08"') + img('img/plate-tulipe.webp', 614, 720, 'd2 cut spin', '', ' data-k="-0.1"') },
    pasteles: { sh: 136, cls: 'art-pasteles', html: img('art/icon-dogplate.svg', 292, 282, 'fl', '--fd:7.4s;--rw:2deg') },
    galletas: { sh: 136, cls: 'art-galletas', html: img('img/totes.webp', 977, 1000, 'fl cut', '--fd:7s') },
    dogcup: { sh: 150, cls: 'art-tes', html: img('art/icon-dogcup.svg', 213, 244, 'fl', '--fd:7s;--rw:2deg') },
    beans: { sh: 124, cls: 'art-tes', html: img('art/icon-beans.svg', 341, 215, 'fl', '--fd:8s;--rw:3deg') },
    croissant: { sh: 124, cls: 'art-tes', html: img('art/icon-croissant.svg', 309, 208, 'fl', '--fd:7s;--rw:2deg') },
    bag: { sh: 150, cls: 'art-frias', html: img('art/icon-bag.svg', 150, 276, 'fl', '--fd:7s;--rw:2deg') }
  };
  W.BOSCO_ART_PRESETS = Object.keys(ART);
  function catArt(cat) {
    var a = cat.art || {};
    if (a.img) {
      var k = kindOf(a.img, a.kind);
      if (k === 'photo') return { sh: 150, cls: 'art-photo', html: '<div class="ph">' + img(a.img, 0, 0, '', '', ' loading="lazy"') + '</div>' };
      return { sh: 160, cls: 'art-cut', html: img(a.img, 0, 0, 'fl cut', '--fd:7s;--r:-3deg', ' loading="lazy"') };
    }
    return ART[a.preset] || ART.pasteles;
  }

  /* ───────────────────────── rendering ───────────────────────── */
  var WAVE_D = 'M0 46Q90 22 180 46T360 46T540 46T720 46T900 46T1080 46T1260 46T1440 46';
  function wave(text, uid) {
    var t = '';
    for (var i = 0; i < 4; i++) t += text + ' ';
    return '<div class="wave" data-reps="4" aria-hidden="true">'
      + '<svg class="loop" viewBox="0 0 1440 70"><defs><path id="' + uid + '" d="' + WAVE_D + '"/></defs><text><textPath href="#' + uid + '">' + esc(t) + '</textPath></text></svg>'
      + '<div class="wave-dog loop"><i class="loop">' + img('art/dog-walk.svg', 408, 513, 'loop') + '</i></div></div>';
  }
  var PAW = '<ellipse cx="5.8" cy="10.4" rx="2.1" ry="2.9" transform="rotate(-18 5.8 10.4)"/><ellipse cx="10" cy="6.2" rx="2.1" ry="3"/><ellipse cx="14.6" cy="6.3" rx="2.1" ry="3"/><ellipse cx="18.5" cy="10.6" rx="2.1" ry="2.9" transform="rotate(18 18.5 10.6)"/><path d="M12.2 12c-3.1 0-5.6 2.7-5.6 5.1 0 1.9 1.6 2.7 3.1 2.7 1 0 1.7-.5 2.5-.5s1.5.5 2.5.5c1.5 0 3.1-.8 3.1-2.7 0-2.4-2.5-5.1-5.6-5.1z"/>';
  var paws = [[0, 46, 60], [17, 20, 78], [35, 48, 62], [53, 22, 80], [71, 50, 64], [88, 24, 82]].map(function (p, i) {
    return '<svg style="left:' + p[0] + '%;top:' + p[1] + 'px;--pr:' + p[2] + 'deg;--pd:' + (i * 0.38).toFixed(2) + 's" viewBox="0 0 24 24" fill="currentColor">' + PAW + '</svg>';
  }).join('');

  function wordmark() {
    var wm = W.BOSCO_WM;
    if (!wm) return '<span style="font:700 72px/1 var(--f-display)">bosco</span>';
    var timing = [[0.15, 0.34], [0.47, 0.34], [0.80, 0.26], [1.04, 0.24], [1.26, 0.22], [1.46, 0.26]];
    var strokes = wm.strokes.map(function (dd, i) {
      var t = timing[i] || [1.5, 0.3];
      return '<path class="wm-s" style="--t:' + t[0] + 's;--d:' + t[1] + 's" d="' + dd + '"/>';
    }).join('');
    return '<svg viewBox="0 0 ' + wm.w + ' ' + wm.h + '" aria-hidden="true" focusable="false">'
      + '<defs><path id="wm-fill" fill-rule="evenodd" d="' + wm.fill + '"/></defs>'
      + '<use class="wm-fill" href="#wm-fill" fill="currentColor"/>'
      + '<g class="wm-draw" fill="none" stroke="currentColor" stroke-width="14.5" stroke-linecap="round" stroke-linejoin="round">' + strokes + '</g></svg>';
  }
  function heroHTML(doc) {
    var b = doc.brand, h = doc.hero;
    var pill = doc.hours ? hoursSummary(doc.hours) : '';
    return '<p class="status' + (doc.hours ? '' : ' pending') + '" data-status><span class="dot"></span><span class="status-t">' + esc(pill || 'Horario') + '</span></p>'
      + '<h1 class="brand">' + wordmark() + '<span class="vh">Bosco</span><span class="brand-sub">coffee house</span></h1>'
      + '<p class="tagline" data-edit="sec:hero">' + esc(b.tagline) + ' ' + HEART + '</p>'
      + '<div class="stage" aria-hidden="true" data-edit="sec:hero">'
      + '<div class="layer l-beans"><div class="en" style="--ed:1.1s;--ey:-20px;--er:20deg">' + img('art/icon-beans.svg', 341, 215, 'fl', '--fd:9s;--rw:5deg') + '</div></div>'
      + '<div class="layer l-togo"><div class="en" style="--ed:.45s;--ey:60px;--er:-6deg">' + slot(h.togo, h.togoKind, 554, 798, 'fl', '--fd:6.5s;--r:-4deg', ' fetchpriority="high"') + '</div></div>'
      + '<div class="layer l-croissant"><div class="en" style="--ed:.7s;--ex:-120px;--ey:10px;--er:-24deg">' + slot(h.croissant, h.croissantKind, 877, 595, 'fl', '--fd:7.5s;--fdl:-2s;--r:-5deg', ' fetchpriority="high"') + '</div></div>'
      + '<div class="layer l-pet"><div class="en" style="--ed:.9s;--ex:120px;--ey:10px;--er:22deg">' + slot(h.cup, h.cupKind, 918, 864, 'fl', '--fd:5.8s;--fdl:-1s;--r:3deg;--rw:2.2deg', ' fetchpriority="high"') + '</div></div>'
      + '</div>' + wave('¡MUUUUUUUUUY RICO!', 'wv1');
  }

  function visibleItems(cat) { return (cat.items || []).filter(function (it) { return !it.hidden && String(it.n || '').trim(); }); }
  function sections(doc) {
    /* what the chips point at, in page order */
    var list = [];
    if (doc.featured && doc.featured.show && doc.featured.cards && doc.featured.cards.length) list.push(['consentidos', 'Consentidos']);
    doc.categories.forEach(function (c) { if ((c.group || 'bebidas') === 'bebidas' && visibleItems(c).length) list.push(['cat-' + c.id, c.chip || c.name]); });
    if (doc.perso && doc.perso.show) list.push(['personaliza', 'Personaliza']);
    doc.categories.forEach(function (c) { if ((c.group || 'bebidas') === 'alimentos' && visibleItems(c).length) list.push(['cat-' + c.id, c.chip || c.name]); });
    return list;
  }
  function navHTML(doc) {
    var chips = sections(doc).map(function (s) { return '<a class="chip" href="#' + esc(s[0]) + '">' + esc(s[1]) + '</a>'; }).join('');
    var wm = W.BOSCO_WM;
    return '<button class="nav-logo" id="nav-logo" type="button" aria-label="Volver al inicio"><svg viewBox="0 0 ' + (wm ? wm.w : 680) + ' ' + (wm ? wm.h : 418) + '" aria-hidden="true" focusable="false"><use href="#wm-fill" fill="currentColor"/></svg></button>'
      + '<div class="chips" id="chips">' + chips + '<span class="chip-ink" aria-hidden="true"></span></div>'
      + '<button class="nav-btn" id="search-open" type="button" aria-label="Buscar en el menú" aria-expanded="false" aria-controls="search">' + SEARCH_ICO + '</button>'
      + '<div class="search" id="search" role="search"><input id="q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Busca latte, matcha, croissant…" aria-label="Buscar en el menú"><span class="count" id="count" aria-live="polite"></span>'
      + '<button class="nav-btn" id="search-close" type="button" aria-label="Cerrar la búsqueda">' + CLOSE_ICO + '</button></div>';
  }
  function cardHTML(c, i) {
    var style = { plum: 'card--plum', wine: 'card--wine', blush: 'card--blush' }[c.style] || '';
    var k = kindOf(c.img, c.imgKind), art;
    if (c.img2) {
      art = '<div class="duo">' + slot(c.img2, c.img2Kind || c.imgKind, 900, 868, 'duo-b fl', '--fd:7.4s;--fdl:-1s;--r:9deg', ' loading="lazy"')
        + slot(c.img, c.imgKind, 847, 900, 'duo-a fl', '--fd:6.6s;--fdl:-3s;--r:-8deg', ' loading="lazy"') + '</div>';
    } else if (c.img && k === 'cut') {
      var cup = c.img.indexOf('cup-perso') > -1;
      art = img(c.img, 0, 0, (c.spin ? 'cut spin' : 'fl cut') + (cup ? ' card-cup' : ' card-one'), cup ? '--fd:6s;--rw:2deg' : (c.spin ? '' : '--fd:7s;--fdl:-2s'), (c.spin ? ' data-k="0.07"' : '') + (i ? ' loading="lazy"' : ''), c.alt || c.title);
      if (cup) style += ' card--cup';
    } else if (c.img) {
      art = img(c.img, 0, 0, 'photo', '', ' loading="lazy"', c.alt || c.title);
    } else art = '';
    var price = '';
    if (c.price) {
      var m = /^(desde|a partir de)\s+(.+)$/i.exec(String(c.price).trim());
      price = m ? '<small>' + esc(m[1]) + '</small> ' + esc(m[2]) : esc(c.price);
    }
    var link = c.link && c.linkText ? '<a class="card-link" href="#' + esc(c.link) + '" data-go="' + esc(c.link) + '">' + esc(c.linkText) + '</a>' : '';
    var foot = (price || link) ? '<div class="card-foot">' + (price ? '<span class="card-price">' + price + '</span>' : '') + link + '</div>' : '';
    if (!foot && c.note) foot = '<div class="card-foot"><span class="card-note">' + esc(c.note) + '</span></div>';
    else if (c.note) foot = '<p class="card-note">' + esc(c.note) + '</p>' + foot;
    return '<article class="card ' + style + '" data-edit="card:' + esc(c.id) + '"><div class="card-art">' + art + '</div>'
      + (c.tag ? '<span class="card-tag">' + esc(c.tag) + '</span>' : '')
      + '<h3>' + esc(c.title) + '</h3>' + (c.text ? '<p>' + esc(c.text) + '</p>' : '') + foot + '</article>';
  }
  function featuredHTML(doc) {
    var f = doc.featured;
    if (!f || !f.show || !f.cards || !f.cards.length) return '';
    var dots = f.cards.map(function (_, i) { return '<i' + (i ? '' : ' class="on"') + '></i>'; }).join('');
    return '<section class="cons lv-on" id="consentidos" aria-labelledby="cons-h">'
      + '<div class="cons-h" data-edit="sec:featured"><h2 id="cons-h">' + esc(f.title || 'Los consentidos') + '</h2>' + img('art/dog-up.svg', 291, 689, 'cons-pup fl', '--fd:5s;--rw:3deg') + '</div>'
      + '<div class="cons-track" tabindex="0" role="group" aria-label="Los consentidos, desliza para ver más">' + f.cards.map(cardHTML).join('') + '</div>'
      + '<div class="cons-dots" aria-hidden="true">' + dots + '</div></section>';
  }
  function ribbonHTML(doc, extra) {
    var phrases = (extra || []).concat(doc.ribbon || []);
    if (!phrases.length) return '';
    var half = phrases.map(function (t) { return '<span>' + esc(t) + ' ♥&#xFE0E;</span>'; }).join('');
    return '<div class="ribbon-wrap lv-on" aria-hidden="true"><div class="ribbon"><div class="ribbon-t">' + half + half + '</div></div></div>';
  }
  function seasonNoteHTML(doc) {
    var s = doc.seasonNote;
    if (!s || !s.show || !String(s.text || '').trim()) return '';
    return '<aside class="season rv-on lv-on" aria-label="Bebidas de temporada" data-edit="sec:seasonNote"><p class="season-t rv-up">' + esc(s.text) + '</p>'
      + '<span class="season-dogw rv-pop">' + img('art/icon-dogcup.svg', 213, 244, 'season-dog fl', '--fd:6.4s;--rw:2.6deg', ' loading="lazy"') + '</span></aside>';
  }
  function itemHTML(cat, it, i, two) {
    var desc = it.d ? '<span class="it-d">' + esc(it.d) + '</span>' : '';
    var cells;
    if (two) {
      cells = [0, 1].map(function (k) {
        var p = it.p && it.p[k];
        return '<span class="it-p">' + (p !== null && p !== undefined && p !== '' ? '<span class="vh">' + esc(cat.sizes[k]) + ': </span>' + price(p) : '') + '</span>';
      }).join('');
    } else cells = '<span class="it-p">' + price(it.p && it.p[0]) + '</span>';
    var thumb = '';
    if (it.img) {
      var k = kindOf(it.img, it.imgKind);
      thumb = '<button class="it-img' + (k === 'cut' ? ' is-cut' : '') + '" type="button" data-lb="' + esc(cat.id) + '/' + esc(it.id) + '" aria-label="Ver foto de ' + esc(it.n) + '">' + img(it.img, 0, 0, '', '', ' loading="lazy"') + '</button>';
    }
    return '<li class="it' + (thumb ? ' has-img' : '') + '" style="--i:' + Math.min(i, 15) + '" data-edit="item:' + esc(cat.id) + ':' + esc(it.id) + '">' + thumb + '<span class="it-n">' + esc(it.n) + desc + '</span>' + cells + '</li>';
  }
  function categoryHTML(doc, cat) {
    var items = visibleItems(cat);
    if (!items.length) return '';
    var sizes = (cat.sizes || []).filter(function (s) { return String(s || '').trim(); });
    var two = sizes.length === 2;
    var kw = ' data-kw="' + esc(cat.kw || '') + '"';
    if (cat.art && cat.art.preset === 'galletas' && !cat.art.img) return cookieHTML(doc, cat, items);
    var rows = items.map(function (it, i) { return itemHTML(cat, it, i, two); }).join('');
    var cols = sizes.length ? '<div class="cat-cols" aria-hidden="true">' + sizes.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</div>' : '';
    var extra = '';
    if (cat.extra && String(cat.extra.n || '').trim()) {
      extra = '<div class="extra" style="--i:' + Math.min(items.length, 15) + '"><span class="it-n">' + esc(cat.extra.n) + '</span><span class="it-p">' + (cat.extra.p !== '' && cat.extra.p != null ? '+' + price(cat.extra.p) : '') + '</span></div>';
    }
    var art = catArt(cat);
    var after = '';
    if (doc.vitrina && doc.vitrina.show && (doc.vitrina.after || 'panaderia') === cat.id) after = vitrinaHTML(doc);
    return '<section class="cat rv-on lv-on" id="cat-' + esc(cat.id) + '" data-name="' + esc(cat.name) + '"' + kw + ' aria-labelledby="h-' + esc(cat.id) + '">'
      + '<div class="cat-stage" style="--sh:' + art.sh + 'px" data-edit="cat:' + esc(cat.id) + '"><h2 id="h-' + esc(cat.id) + '">' + esc(cat.name) + '</h2><div class="cat-art ' + art.cls + '" aria-hidden="true">' + art.html + '</div></div>'
      + cols + '<ul class="items' + (two ? ' items--2' : '') + '">' + rows + '</ul>' + extra + after + '</section>';
  }
  function cookieHTML(doc, cat, items) {
    var rows = items.map(function (it, i) {
      var one = items.length === 1 && !it.img;
      var li = itemHTML(cat, it, i, false);
      return one ? li.replace('<span class="it-n">', '<span class="it-n vh">') : li;
    }).join('');
    return '<section class="cat rv-on lv-on" id="cat-' + esc(cat.id) + '" data-name="' + esc(cat.name) + '" data-kw="' + esc(cat.kw || '') + '" aria-labelledby="h-' + esc(cat.id) + '">'
      + '<div class="cookie" data-edit="cat:' + esc(cat.id) + '"><div class="cookie-hang loop">' + img('img/totes.webp', 977, 1000, '', '', ' loading="lazy"', 'Dos mini bolsas de tela de Bosco, una con una galleta dentro') + '</div>'
      + '<h2 id="h-' + esc(cat.id) + '">' + esc(cat.name) + '</h2><ul class="items">' + rows + '</ul>'
      + '<p class="cookie-q">Something sweet for someone sweet.</p></div></section>';
  }
  function vitrinaHTML(doc) {
    return '<figure class="vitrina rv-up"><div class="vitrina-f"><video muted loop playsinline preload="metadata" poster="img/vitrina.webp" aria-label="La vitrina de pan de Bosco, con el perrito de la marca paseando entre los croissants"><source src="img/vitrina.mp4" type="video/mp4"><source src="img/vitrina.webm" type="video/webm"></video>'
      + '<button class="vid-play" type="button" aria-label="Reproducir el video de la vitrina" hidden>' + PLAY_ICO + '</button></div>'
      + '<figcaption>' + esc(doc.vitrina.caption || 'Nuestra vitrina') + '</figcaption></figure>';
  }
  function persoHTML(doc) {
    var p = doc.perso;
    if (!p || !p.show) return '';
    var big = esc(p.price || '+$20');
    return '<section class="perso rv-on lv-on" id="personaliza" aria-labelledby="perso-h" data-edit="sec:perso">'
      + '<h2 id="perso-h" class="rv-up">' + esc(p.title || 'Personaliza tu bebida') + '</h2>'
      + '<p class="perso-lead rv-up" style="--rd:.08s">' + esc(p.lead) + '</p>'
      + '<div class="perso-stage" aria-hidden="true">'
      + '<figure class="polaroid fl rv-pop" style="--fd:7s">' + img(p.polaroid || 'img/ilustracion.webp', 0, 0, '', '', ' loading="lazy"') + '<figcaption>' + esc(p.polaroidCaption || 'tu imagen') + '</figcaption></figure>'
      + '<svg class="perso-arrow" viewBox="0 0 104 70"><path class="dash" d="M6 44C26 6 66 0 92 30"/><path d="M78 28l15 3-3-15"/></svg>'
      + '<div class="perso-cup rv-pop">' + slot(p.cup || 'img/cup-perso.webp', p.cupKind, 918, 864, 'fl', '--fd:6s;--rw:1.6deg', ' loading="lazy"') + '</div>'
      + '<div class="sticker rv-pop"><svg viewBox="0 0 120 120"><defs><path id="st-c" d="M15 60a45 45 0 1 1 90 0a45 45 0 1 1-90 0"/></defs><circle cx="60" cy="60" r="59" fill="var(--foam)"/>'
      + '<g class="ring"><text><textPath href="#st-c" textLength="276" lengthAdjust="spacing">productos seleccionados ♥&#xFE0E; personaliza tu bebida ♥&#xFE0E; </textPath></text></g>'
      + '<text class="big" x="60" y="76" text-anchor="middle">' + big + '</text></svg></div></div>'
      + '<p class="perso-note">' + (p.note ? '<b>' + esc(p.note) + '</b> ' : '') + esc(p.note2 || '') + '</p></section>';
  }
  function petHTML(doc) {
    var p = doc.pet;
    if (!p || !p.show) return '';
    return '<section class="petb rv-on lv-on" aria-labelledby="pet-h" data-edit="sec:pet"><h2 id="pet-h" class="rv-up">' + esc(p.title || 'Pet friendly') + '</h2>'
      + '<p class="rv-up" style="--rd:.08s">' + esc(p.text || '') + '</p><div class="paws" aria-hidden="true">' + paws + '</div>'
      + '<span class="petb-dogw rv-up' + (kindOf(p.img || 'img/dog.webp', p.imgKind) === 'photo' ? ' is-photo' : '') + '" style="--rd:.12s">' + slot(p.img || 'img/dog.webp', p.imgKind, 750, 1100, 'petb-dog', '', ' loading="lazy"', 'Golden retriever sonriendo').replace(' cut"', '"').replace(' photo"', '"') + '</span></section>';
  }
  function visitHTML(doc) {
    var b = doc.brand, v = doc.visit || {}, hours = doc.hours;
    var gal = (v.gallery || []).filter(Boolean).map(function (src) { return '<div class="arch">' + img(src, 0, 0, 'loop', '', ' loading="lazy"') + '</div>'; }).join('');
    var rows = hours ? hoursRows(hours).map(function (r) { return '<div data-day="' + r.days.join(',') + '"><dt>' + esc(r.label) + '</dt><dd>' + esc(r.value) + '</dd></div>'; }).join('') : '';
    var ig = String(b.instagram || '').replace(/^@/, '').trim();
    var maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.mapsQuery || b.address || 'Bosco Coffee House');
    return '<section class="visit rv-on lv-on" id="visitanos" aria-labelledby="visit-h" data-edit="sec:visit"><h2 id="visit-h" class="rv-up">' + esc(v.title || 'Visítanos') + '</h2>'
      + img('art/open-sign.svg', 224, 276, 'open-sign', '', ' id="open-sign" hidden')
      + (gal ? '<div class="gallery rv-up" style="--rd:.08s" tabindex="0" role="group" aria-label="Fotos del café, desliza para ver más">' + gal + '</div>' : '')
      + '<div class="info"><div class="rv-up" style="--rd:.1s"><h3>Dónde</h3><p class="addr" id="addr">' + esc(b.address) + '</p>'
      + '<div class="btns"><a class="btn btn--fill" href="' + esc(maps) + '" target="_blank" rel="noopener">' + PIN_ICO + 'Abrir en Google Maps</a>'
      + '<button class="btn" id="copy-addr" type="button">' + COPY_ICO + '<span class="btn-t">Copiar dirección</span></button></div></div>'
      + (rows ? '<div class="rv-up" style="--rd:.14s"><h3>Horario</h3><dl class="hours">' + rows + '</dl><p class="status" data-status><span class="dot"></span><span class="status-t">Horario de Pachuca</span></p></div>' : '')
      + (ig ? '<div class="rv-up" style="--rd:.18s"><h3>Síguenos</h3><div class="btns"><a class="btn" href="https://www.instagram.com/' + esc(ig) + '/" target="_blank" rel="noopener" aria-label="Bosco en Instagram, @' + esc(ig) + '">' + IG_ICO + '@' + esc(ig) + '</a></div></div>' : '')
      + '</div></section>';
  }
  function footHTML(doc) {
    var b = doc.brand;
    return '<footer class="foot">' + img('art/icon-badge.svg', 240, 240, 'foot-seal', '', ' loading="lazy"') + '<p class="foot-line">' + esc(b.footLine) + '</p>'
      + (b.priceNote ? '<small>' + esc(b.priceNote) + '</small>' : '') + '<div class="foot-art">' + img('art/dog-offer.svg', 1134, 608, '', '', ' loading="lazy"', 'Ilustración de un golden retriever oliendo un vaso de Bosco') + '</div></footer>';
  }
  function restHTML(doc, seasonInfo) {
    var drinks = '', food = '';
    doc.categories.forEach(function (c) {
      var h = categoryHTML(doc, c);
      if ((c.group || 'bebidas') === 'alimentos') food += h; else drinks += h;
    });
    var ribbonExtra = seasonInfo && seasonInfo.ribbon;
    return '<nav class="nav" id="nav" aria-label="Categorías del menú">' + navHTML(doc) + '</nav>'
      + '<main id="carta">' + featuredHTML(doc) + ribbonHTML(doc, ribbonExtra) + seasonNoteHTML(doc) + drinks + persoHTML(doc)
      + (food ? '<div class="wave-div lv-on">' + wave('¡MUUUUUY ANTOJABLE!', 'wv2') + '</div>' + food : '')
      + '<div class="empty" id="empty" hidden>' + img('art/dog-lying.svg', 432, 340) + '<p>No encontramos “<span id="empty-q"></span>”. Prueba con otra palabra.</p><button class="btn" id="empty-clear" type="button">Ver el menú completo</button></div>'
      + '</main>' + petHTML(doc) + visitHTML(doc) + footHTML(doc);
  }

  /* ───────────────────────── render + mount ───────────────────────── */
  var current = null, teardown = [], mounted = false;
  function onTear(fn) { teardown.push(fn); }
  function unmount() { teardown.forEach(function (f) { try { f(); } catch (e) { /* nothing to undo */ } }); teardown = []; mounted = false; }

  /* the hero is drawn once (so the logo is written only once) and then patched in place */
  function ensureHero(doc) {
    var hero = $('.hero', menu);
    if (!hero) {
      hero = d.createElement('header');
      hero.className = 'hero lv-on';
      hero.id = 'top';
      hero.innerHTML = heroHTML(doc);
      menu.insertBefore(hero, menu.firstChild);
      $$('.wm-s', hero).forEach(function (p) { try { p.style.setProperty('--l', (p.getTotalLength() + 2).toFixed(0)); } catch (e) { p.style.setProperty('--l', '2000'); } });
      setTimeout(function () { var b = $('.brand', hero); if (b) b.classList.add('drawn'); }, 2700);   /* never leave the logo half drawn */
      return hero;
    }
    var tag = $('.tagline', hero);
    if (tag && tag.firstChild && tag.firstChild.nodeType === 3 && tag.firstChild.nodeValue !== doc.brand.tagline + ' ') tag.firstChild.nodeValue = doc.brand.tagline + ' ';
    [['l-togo', 'togo', 554, 798], ['l-croissant', 'croissant', 877, 595], ['l-pet', 'cup', 918, 864]].forEach(function (L) {
      var im = $('.' + L[0] + ' img', hero), src = doc.hero[L[1]], k = kindOf(src, doc.hero[L[1] + 'Kind']);
      if (!im || !src) return;
      if (im.getAttribute('src') !== src) { im.setAttribute('src', src); if (k === 'cut') { im.width = L[2]; im.height = L[3]; } else { im.removeAttribute('width'); im.removeAttribute('height'); } }
      im.classList.toggle('cut', k === 'cut');
      im.classList.toggle('photo', k !== 'cut');
    });
    var pill = $('.status-t', hero);
    if (pill && doc.hours && pill.parentNode.classList.contains('pending')) pill.textContent = hoursSummary(doc.hours);
    return hero;
  }
  function fitWave(w) {
    try {
      var path = $('path', w), tp = $('textPath', w);
      var reps = +w.getAttribute('data-reps') || 4, per = Math.round(tp.textContent.length / reps);
      var target = path.getTotalLength() / reps, ls = 0;
      for (var i = 0; i < 5; i++) {
        tp.style.letterSpacing = ls.toFixed(3) + 'px';
        var got = tp.getSubStringLength(0, per);
        if (!got || Math.abs(got - target) < 0.05) break;
        ls += (target - got) / per;
      }
      w.classList.add('run');
    } catch (e) { w.classList.add('run'); }
  }

  function render(raw, opts) {
    opts = opts || {};
    var doc = withDefaults(raw || {});
    current = doc;
    var y = W.pageYOffset || 0;
    unmount();
    ensureHero(doc);
    var rest = $('#rest', menu);
    if (!rest) { rest = d.createElement('div'); rest.id = 'rest'; menu.appendChild(rest); }
    if (opts.loading) {
      rest.innerHTML = '<div class="loading" aria-live="polite"><img src="art/dog-lying.svg" alt=""><p>Cargando el menú…</p></div>';
      $$('.wave', menu).forEach(fitWave);
      if (d.fonts && d.fonts.ready && d.fonts.ready.then) d.fonts.ready.then(function () { if (!mounted) $$('.wave', menu).forEach(fitWave); });
      return;
    }
    var seasonInfo = W.BoscoSeasons ? W.BoscoSeasons.info(doc.season) : null;
    rest.innerHTML = restHTML(doc, seasonInfo);
    if (opts.keepScroll) W.scrollTo(0, y);
    mount(doc);
    if (W.BoscoSeasons) W.BoscoSeasons.apply(doc.season || 'normal', { menu: menu, doc: doc, reduce: reduce });
    if (opts.preview) { menu.classList.add('no-entrance'); var b = $('.brand', menu); if (b) b.classList.add('drawn'); }
  }

  function mount(doc) {
    mounted = true;
    var nav = $('#nav'), hero = $('#top'), stage = $('.stage');
    var vh = W.innerHeight;
    function on(el, ev, fn, o) { el.addEventListener(ev, fn, o); onTear(function () { el.removeEventListener(ev, fn, o); }); }

    /* ── open / closed, always in Pachuca time ── */
    function status() {
      if (!doc.hours) return;
      var n = mxNow();
      if (!n) { $$('[data-status] .status-t').forEach(function (t) { t.textContent = hoursSummary(doc.hours); t.parentNode.classList.remove('pending'); }); return; }
      var s = statusText(doc.hours, n);
      $$('[data-status]').forEach(function (el) {
        el.classList.remove('pending');
        el.classList.toggle('is-open', s.open);
        el.classList.toggle('is-closed', !s.open);
        var t = $('.status-t', el);
        if (t) t.textContent = s.text;
      });
      $$('[data-day]').forEach(function (el) { el.classList.toggle('today', el.getAttribute('data-day').split(',').indexOf(String(n.day)) > -1); });
      var sign = $('#open-sign');
      if (sign) sign.hidden = !s.open;
    }
    status();
    var si = setInterval(status, 60000);
    onTear(function () { clearInterval(si); });

    /* ── the "uuuu" wave: letters spaced so each phrase spans exactly one wave (seamless loop) ── */
    function fitWaves() { if (mounted) $$('.wave').forEach(fitWave); }
    fitWaves();
    if (d.fonts && d.fonts.ready && d.fonts.ready.then) d.fonts.ready.then(fitWaves);
    var wt = setTimeout(fitWaves, 1500);
    onTear(function () { clearTimeout(wt); });

    /* ── category bar ── */
    var chipsBox = $('#chips'), chips = $$('.chip', chipsBox), ink = $('.chip-ink', chipsBox);
    var secs = chips.map(function (c) { return d.getElementById(c.getAttribute('href').slice(1)); });
    var active = -1, lockUntil = 0;
    function setActive(i) {
      if (i === active) return;
      active = i;
      chips.forEach(function (c, k) {
        c.classList.toggle('on', k === i);
        if (k === i) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
      });
      if (i < 0) { ink.style.width = '0px'; return; }
      var c = chips[i];
      ink.style.width = Math.max(0, c.offsetWidth - 20) + 'px';
      ink.style.transform = 'translate3d(' + (c.offsetLeft + 10) + 'px,0,0)';
      var left = c.offsetLeft - (chipsBox.clientWidth - c.offsetWidth) / 2;
      if (chipsBox.scrollTo) chipsBox.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' }); else chipsBox.scrollLeft = left;
    }
    function go(el) { if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    chips.forEach(function (c, i) {
      on(c, 'click', function (e) { e.preventDefault(); closeSearch(true); lockUntil = Date.now() + 1000; setActive(i); go(secs[i]); });
    });
    $$('[data-go]').forEach(function (a) { on(a, 'click', function (e) { e.preventDefault(); go(d.getElementById(a.getAttribute('data-go'))); }); });
    on($('#nav-logo'), 'click', function () { W.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

    /* ── featured carousel: the active card straightens up ── */
    var track = $('.cons-track'), cards = track ? $$('.card', track) : [], dots = $$('.cons-dots i');
    var consTick = false;
    function cons() {
      consTick = false;
      if (!track) return;
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 9;
      cards.forEach(function (el, i) {
        var p = (el.offsetLeft + el.offsetWidth / 2 - mid) / el.offsetWidth;
        p = Math.max(-1.3, Math.min(1.3, p));
        if (!reduce) { el.style.setProperty('--p', p.toFixed(3)); el.style.setProperty('--a', Math.min(1, Math.abs(p)).toFixed(3)); }
        if (Math.abs(p) < bd) { bd = Math.abs(p); best = i; }
      });
      dots.forEach(function (x, i) { x.classList.toggle('on', i === best); });
    }
    if (track) {
      on(track, 'scroll', function () { if (!consTick) { consTick = true; requestAnimationFrame(cons); } }, { passive: true });
      cons();
      if (hasIO && !reduce && track.scrollTo && !PREVIEW) {
        var hint = new IntersectionObserver(function (es) {
          if (!es[0].isIntersecting) return;
          hint.disconnect();
          setTimeout(function () {
            if (!mounted || track.scrollLeft > 4) return;
            track.scrollTo({ left: 64, behavior: 'smooth' });
            setTimeout(function () { if (mounted && track.scrollLeft < 120) track.scrollTo({ left: 0, behavior: 'smooth' }); }, 520);
          }, 500);
        }, { threshold: 0.7 });
        hint.observe(track);
        onTear(function () { hint.disconnect(); });
      }
    }

    /* ── scroll-linked bits: progress line, parallax, spinning plates, active category ── */
    var spins = $$('.spin'), ticking = false;
    function frame() {
      ticking = false;
      if (!mounted) return;
      var y = W.pageYOffset || root.scrollTop || 0;
      var max = Math.max(1, root.scrollHeight - vh);
      nav.style.setProperty('--prog', Math.min(1, y / max).toFixed(4));
      if (!reduce) {
        if (y < 1000 && stage) stage.style.setProperty('--sy', y.toFixed(1));
        for (var s = 0; s < spins.length; s++) {
          var r = spins[s].getBoundingClientRect();
          if (r.bottom > -80 && r.top < vh + 80) spins[s].style.setProperty('--rot', ((vh - r.top) * +spins[s].getAttribute('data-k')).toFixed(1));
        }
      }
      nav.classList.toggle('stuck', hero.getBoundingClientRect().bottom <= nav.offsetHeight + 4);
      if (Date.now() > lockUntil) {
        var line = vh * 0.4, cur = -1;
        for (var i = 0; i < secs.length; i++) {
          if (!secs[i] || secs[i].hidden) continue;
          if (secs[i].getBoundingClientRect().top <= line) cur = i;
        }
        setActive(cur);
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    on(W, 'scroll', onScroll, { passive: true });
    on(W, 'resize', function () { vh = W.innerHeight; active = -2; onScroll(); cons(); }, { passive: true });
    frame();

    /* ── reveals: nothing is hidden until someone really starts using the page ── */
    var rv = $$('.rv-on');
    rv.forEach(function (el) { el.classList.add('rv'); });
    if (hasIO && !reduce && !PREVIEW) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } });
      }, { threshold: 0.06, rootMargin: '0px 0px -7% 0px' });
      onTear(function () { io.disconnect(); });
      var armed = false, evs = ['scroll', 'touchstart', 'wheel', 'keydown', 'pointerdown'];
      var arm = function () {
        if (armed) return;
        armed = true;
        evs.forEach(function (t) { W.removeEventListener(t, arm); });
        if (!mounted) return;
        rv.forEach(function (el) { if (el.getBoundingClientRect().top > vh * 0.97) { el.classList.add('pre'); io.observe(el); } });
      };
      evs.forEach(function (t) { on(W, t, arm, { passive: true }); });
    }

    /* ── pause looping motion that is off screen ── */
    if (hasIO) {
      var live = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('live', e.isIntersecting); }); }, { rootMargin: '140px 0px' });
      $$('.lv-on').forEach(function (el) { el.classList.add('lv'); live.observe(el); });
      onTear(function () { live.disconnect(); });
    }

    /* ── the bakery clip: plays while on screen; a play button if the phone refuses to start it; a moving
          picture of the same clip if the phone cannot play the video at all ── */
    var vid = $('.vitrina video');
    if (vid) {
      var vbtn = $('.vid-play'), vframe = vid.parentNode, vVisible = false, vUser = false, vDone = false;
      var vWants = function () { return !reduce || vUser; };
      var showBtn = function () { if (vbtn) vbtn.hidden = false; };
      var hideBtn = function () { if (vbtn) vbtn.hidden = true; };
      var vStart = function () {
        var p;
        try { p = vid.play(); } catch (e) { return; }
        if (p && p.then) p.then(hideBtn, function (err) { if (err && err.name === 'NotAllowedError') showBtn(); });
      };
      var vAnimated = function () {
        if (vDone) return;
        vDone = true;
        var im = d.createElement('img');
        im.className = 'vitrina-anim';
        im.alt = '';
        im.src = 'img/vitrina-anim.webp';
        vframe.insertBefore(im, vid);
        vid.hidden = true;
        if (vbtn) vbtn.remove();
      };
      var lastSrc = $$('source', vid).pop();
      if (lastSrc) on(lastSrc, 'error', vAnimated);
      on(vid, 'error', function () { if (vid.error && vid.error.code === 4) vAnimated(); });
      on(vid, 'playing', hideBtn);
      var vTap = function () { vUser = true; vStart(); };
      if (vbtn) on(vbtn, 'click', vTap);
      on(vid, 'click', function () { if (vid.paused) vTap(); });
      if (reduce) showBtn();
      if (hasIO) {
        var vio = new IntersectionObserver(function (es) {
          es.forEach(function (e) { vVisible = e.isIntersecting; if (vVisible) { if (vWants()) vStart(); } else vid.pause(); });
        }, { threshold: 0.35 });
        vio.observe(vid);
        onTear(function () { vio.disconnect(); try { vid.pause(); } catch (e) { /* gone */ } });
      } else if (!reduce) vStart();
    }

    /* ── search ── */
    var sOpen = $('#search-open'), sIn = $('#q'), sClose = $('#search-close'), count = $('#count'), empty = $('#empty');
    var cats = $$('.cat');
    function norm(s) { s = String(s).toLowerCase(); return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s; }
    function words(s) { return norm(s).split(/[^a-z0-9]+/).filter(Boolean); }
    var index = $$('.it, .extra, .season').map(function (el) {
      var cat = el.closest ? el.closest('.cat') : null;
      return { el: el, min: cat ? 1 : 4, w: words(el.textContent), c: cat ? words(cat.getAttribute('data-name') + ' ' + (cat.getAttribute('data-kw') || '')) : [] };
    });
    function hit(list, t) {
      for (var i = 0; i < list.length; i++) {
        var w = list[i];
        if (w.indexOf(t) === 0) return true;
        if (w.length >= 4 && t.indexOf(w) === 0 && t.length - w.length <= 2) return true;
      }
      return false;
    }
    function filter() {
      var raw = sIn.value.trim(), q = words(raw), n = 0;
      q = q.length ? q : null;
      menu.classList.toggle('is-search', !!q);
      index.forEach(function (o) {
        var ok = !q || q.every(function (t) { return t.length >= o.min && (hit(o.w, t) || hit(o.c, t)); });
        o.el.hidden = !ok;
        if (ok && q) n++;
      });
      cats.forEach(function (c) { c.hidden = !!q && !$('.it:not([hidden]), .extra:not([hidden])', c); });
      empty.hidden = !(q && n === 0);
      if (q && n === 0) $('#empty-q').textContent = raw;
      count.textContent = q ? n + (n === 1 ? ' resultado' : ' resultados') : '';
      if (q) {
        var y = W.pageYOffset || 0, top = Math.round($('#carta').getBoundingClientRect().top + y - nav.offsetHeight);
        if (Math.abs(y - top) > 4) { try { W.scrollTo({ top: top, behavior: 'instant' }); } catch (e) { W.scrollTo(0, top); } }
      }
      active = -2;
      onScroll();
    }
    function openSearch() {
      nav.classList.add('searching');
      sOpen.setAttribute('aria-expanded', 'true');
      var top = $('#carta').getBoundingClientRect().top;
      if (top > nav.offsetHeight + 40) W.scrollTo({ top: (W.pageYOffset || 0) + top - nav.offsetHeight, behavior: reduce ? 'auto' : 'smooth' });
      setTimeout(function () { try { sIn.focus({ preventScroll: true }); } catch (e) { sIn.focus(); } }, 60);
    }
    function closeSearch(silent) {
      if (!nav.classList.contains('searching')) return;
      nav.classList.remove('searching');
      sOpen.setAttribute('aria-expanded', 'false');
      if (sIn.value) { sIn.value = ''; filter(); }
      if (!silent) sOpen.focus();
    }
    on(sOpen, 'click', openSearch);
    on(sClose, 'click', function () { closeSearch(false); });
    on(sIn, 'input', filter);
    on(sIn, 'keydown', function (e) { if (e.key === 'Escape') closeSearch(false); if (e.key === 'Enter') sIn.blur(); });
    on($('#empty-clear'), 'click', function () { closeSearch(false); });

    /* ── copy the address ── */
    var copyBtn = $('#copy-addr'), addr = $('#addr');
    if (copyBtn && addr) {
      var copyT = $('.btn-t', copyBtn), copyIdle = copyT.textContent;
      on(copyBtn, 'click', function () {
        var text = addr.textContent.replace(/\s+/g, ' ').trim();
        function done() { copyT.textContent = 'Dirección copiada'; setTimeout(function () { copyT.textContent = copyIdle; }, 2400); }
        function select() {
          try {
            var r = d.createRange(); r.selectNodeContents(addr);
            var s = W.getSelection(); s.removeAllRanges(); s.addRange(r);
            copyT.textContent = 'Seleccionada, ahora cópiala';
            setTimeout(function () { copyT.textContent = copyIdle; }, 3200);
          } catch (e) { /* nothing else to try */ }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(select); else select();
      });
    }

    /* ── product photos open big ── */
    on(menu, 'click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-lb]') : null;
      if (!b) return;
      var ref = b.getAttribute('data-lb').split('/'), cat = null, it = null;
      doc.categories.forEach(function (c) { if (c.id === ref[0]) { cat = c; (c.items || []).forEach(function (x) { if (x.id === ref[1]) it = x; }); } });
      if (it) openLightbox(cat, it);
    });
  }

  /* ───────────────────────── lightbox ───────────────────────── */
  var lb = null;
  function openLightbox(cat, it) {
    if (!lb) {
      lb = d.createElement('div');
      lb.className = 'lb';
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-modal', 'true');
      lb.innerHTML = '<div class="lb-card"><button class="lb-x" type="button" aria-label="Cerrar">' + CLOSE_ICO + '</button><img class="lb-img" alt=""><h3></h3><p class="lb-p"></p><p class="lb-d"></p></div>';
      d.body.appendChild(lb);
      lb.addEventListener('click', function (e) { if (e.target === lb || e.target.closest('.lb-x')) closeLightbox(); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });
    }
    var im = $('.lb-img', lb), k = kindOf(it.img, it.imgKind);
    im.src = it.img;
    im.classList.toggle('is-cut', k === 'cut');
    $('h3', lb).textContent = it.n;
    var sizes = (cat.sizes || []).filter(Boolean), ps = [];
    (it.p || []).forEach(function (p, i) { if (p !== null && p !== undefined && p !== '') ps.push((sizes.length > 1 && sizes[i] ? '<small>' + esc(sizes[i]) + '</small>' : '') + price(p)); });
    $('.lb-p', lb).innerHTML = ps.join('&nbsp;&nbsp;·&nbsp;&nbsp;');
    $('.lb-d', lb).textContent = it.d || '';
    $('.lb-d', lb).hidden = !it.d;
    lb.classList.add('open');
    d.body.style.overflow = 'hidden';
  }
  function closeLightbox() { if (lb) { lb.classList.remove('open'); d.body.style.overflow = ''; } }

  /* ───────────────────────── data ───────────────────────── */
  var CACHE_KEY = 'bosco_menu_v2', DRAFT_KEY = 'bosco_draft_v2';
  function readJSON(key) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage may be off */ } }
  function fetchJSON(url, ms) {
    return new Promise(function (resolve, reject) {
      var ctrl = ('AbortController' in W) ? new AbortController() : null;
      var t = setTimeout(function () { if (ctrl) ctrl.abort(); reject(new Error('timeout')); }, ms || 7000);
      fetch(url, { cache: 'no-cache', signal: ctrl ? ctrl.signal : undefined }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(function (j) { clearTimeout(t); resolve(j); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  function fetchLive() { return fetchJSON(API, 7000).then(function (j) { if (!j || !j.data || !j.data.categories) throw new Error('bad'); return j.data; }); }
  function fetchSeed() { return fetchJSON('data/menu.json', 7000).then(function (j) { if (!j || !j.categories) throw new Error('bad'); return j; }); }
  function showError() {
    var rest = $('#rest', menu);
    if (rest) rest.innerHTML = '<div class="loading"><img src="art/dog-lying.svg" alt=""><p style="animation:none">No pudimos cargar el menú.<br>Revisa tu conexión e inténtalo de nuevo.</p></div>';
  }

  function boot() {
    render({}, { loading: true });                     /* the brand appears at once, the rest when the data lands */
    if (PREVIEW) { setupPreview(); return; }
    var cached = readJSON(CACHE_KEY);
    if (cached && cached.categories) render(cached, {});
    fetchLive().then(function (doc) {
      if (!cached || JSON.stringify(cached) !== JSON.stringify(doc)) render(doc, { keepScroll: !!cached });
      writeJSON(CACHE_KEY, doc);
    }, function () {
      if (cached && cached.categories) return;
      fetchSeed().then(function (doc) { render(doc, {}); }, showError);
    });
  }

  /* ───────────────────────── live preview (inside the admin) ───────────────────────── */
  function setupPreview() {
    root.classList.add('pv');
    var badge = d.createElement('div');
    badge.className = 'pv-badge';
    badge.textContent = 'Vista previa';
    d.body.appendChild(badge);
    on2(W, 'message', function (e) {
      var m = e.data;
      if (!m || m.type !== 'bosco:data' || !m.data) return;
      render(m.data, { preview: true, keepScroll: true });
    });
    on2(menu, 'click', function (e) {
      if (!IN_FRAME) return;
      var t = e.target.closest ? e.target.closest('[data-edit]') : null;
      if (!t || e.target.closest('a,button,input')) return;
      e.preventDefault();
      $$('.pv-hit', menu).forEach(function (x) { x.classList.remove('pv-hit'); });
      t.classList.add('pv-hit');
      setTimeout(function () { t.classList.remove('pv-hit'); }, 1200);
      W.parent.postMessage({ type: 'bosco:edit', path: t.getAttribute('data-edit') }, '*');
    });
    if (IN_FRAME) W.parent.postMessage({ type: 'bosco:ready' }, '*');
    else {
      var draft = readJSON(DRAFT_KEY);
      if (draft && draft.data && draft.data.categories) render(draft.data, { preview: true });
      else fetchLive().then(function (doc) { render(doc, { preview: true }); }, function () { fetchSeed().then(function (doc) { render(doc, { preview: true }); }, showError); });
    }
  }
  function on2(el, ev, fn) { el.addEventListener(ev, fn); }

  /* ───────────────────────── the way in for the owner: type "admin" on a keyboard ───────────────────────── */
  if (!PREVIEW) {
    var typed = '';
    d.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key;
      if (!k || k.length !== 1) return;
      typed = (typed + k.toLowerCase()).slice(-5);
      if (typed === 'admin') {
        var q = $('#q');
        if (q && /admin$/i.test(q.value)) q.value = '';
        location.href = 'admin';
      }
    });
  }

  W.BoscoMenu = { render: render, current: function () { return current; } };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})();
