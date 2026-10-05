/* Bosco · panel de administración
   Edits one JSON document (the same one the menu renders), shows it live in a phone-sized preview and publishes
   it to /api/publish. A draft is kept in this browser until it is published or discarded. */
(function () {
  'use strict';
  var d = document, W = window;
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  var TOKEN_KEY = 'bosco_admin_token', DRAFT_KEY = 'bosco_draft_v2', OPEN_KEY = 'bosco_admin_open';
  var SEASONS = W.BoscoSeasons.list();
  var PRESETS = [
    ['calientes', 'Perrito en taza (dibujo)', 'art/dog-cup.svg'], ['frias', 'Iced latte (foto)', 'img/iced-latte.webp'], ['frappes', 'Granita (foto)', 'img/granita.webp'],
    ['matcha', 'Matcha (fotos)', 'img/matcha.webp'], ['tes', 'Taza y libro (dibujo)', 'art/icon-cupbook.svg'], ['sodas', 'Burbujas (animación)', ''],
    ['alimentos', 'Flatbread y avena (fotos)', 'img/flatbread.webp'], ['panaderia', 'Croissant (foto)', 'img/croissant.webp'], ['roles', 'Rol en plato (foto)', 'img/plate-roll.webp'],
    ['dulces', 'Platos de postre (fotos)', 'img/plate-drizzle.webp'], ['pasteles', 'Perrito pastelero (dibujo)', 'art/icon-dogplate.svg'], ['galletas', 'Bolsitas de galletas (diseño especial)', 'img/totes.webp'],
    ['dogcup', 'Perrito con café (dibujo)', 'art/icon-dogcup.svg'], ['beans', 'Granos de café (dibujo)', 'art/icon-beans.svg'], ['croissant', 'Croissant (dibujo)', 'art/icon-croissant.svg'], ['bag', 'Bolsa de café (dibujo)', 'art/icon-bag.svg']
  ];
  var BUBBLES = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none" stroke="#8D4C12" stroke-width="2.5"><circle cx="20" cy="40" r="9"/><circle cx="38" cy="22" r="12"/><circle cx="44" cy="46" r="5"/><circle cx="14" cy="18" r="4"/></svg>');
  var DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var state = { token: null, pub: null, draft: null, undo: [], open: {}, storage: null, pvReady: false, desc: {}, busy: false };

  /* ───────────────────────── utils ───────────────────────── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(p) { return (p || 'x') + '-' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 6); }
  function getPath(o, path) { var ks = path.split('.'); for (var i = 0; i < ks.length; i++) { if (o == null) return undefined; o = o[ks[i]]; } return o; }
  function setPath(o, path, v) {
    var ks = path.split('.');
    for (var i = 0; i < ks.length - 1; i++) {
      var k = ks[i], nk = ks[i + 1];
      if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(nk) ? [] : {};
      o = o[k];
    }
    o[ks[ks.length - 1]] = v;
  }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  function readLS(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function writeLS(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage off */ } }
  var toastT;
  function toast(msg, kind, ms) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.hidden = true; }, ms || 3600);
  }
  function fmtDate(iso) {
    if (!iso) return '';
    try { return new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)); } catch (e) { return iso; }
  }
  function sameDoc(a, b) {
    if (!a || !b) return false;
    var x = clone(a), y = clone(b);
    delete x.updatedAt; delete y.updatedAt;
    return JSON.stringify(x) === JSON.stringify(y);
  }
  function kindOf(src, declared) {
    if (declared === 'cut' || declared === 'photo') return declared;
    if (!src) return 'photo';
    if (/\.svg(\?|$)/i.test(src)) return 'cut';
    if (/^(img|art)\//.test(src)) return /dog-close|flatbread|ilustracion|interior|vitrina/.test(src) ? 'photo' : 'cut';
    return 'photo';
  }

  /* ───────────────────────── api ───────────────────────── */
  function api(path, opts) {
    opts = opts || {};
    var h = { 'Content-Type': 'application/json' };
    if (state.token) h.Authorization = 'Bearer ' + state.token;
    return fetch(path, { method: opts.method || 'GET', headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, json: j }; }); });
  }

  /* ───────────────────────── login ───────────────────────── */
  function wordmarkSVG() {
    var wm = W.BOSCO_WM;
    if (!wm) return '<b>bosco</b>';
    return '<svg viewBox="0 0 ' + wm.w + ' ' + wm.h + '" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="' + wm.fill + '"/></svg>';
  }
  function showLogin(msg) {
    $('#app').hidden = true;
    $('#login').hidden = false;
    $('#login-brand').innerHTML = wordmarkSVG();
    var e = $('#login-err');
    e.hidden = !msg;
    if (msg) e.textContent = msg;
    setTimeout(function () { $('#pw').focus(); }, 50);
  }
  $('#pw-eye').addEventListener('click', function () { var p = $('#pw'); p.type = p.type === 'password' ? 'text' : 'password'; });
  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#login-btn'), pw = $('#pw').value;
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    api('/api/login', { method: 'POST', body: { password: pw } }).then(function (r) {
      btn.disabled = false;
      btn.textContent = 'Entrar';
      if (r.status === 200 && r.json.token) {
        state.token = r.json.token;
        writeLS(TOKEN_KEY, state.token);
        $('#login-err').hidden = true;
        start();
      } else if (r.status === 401) {
        $('#login-err').textContent = 'Contraseña incorrecta. Inténtalo de nuevo.';
        $('#login-err').hidden = false;
        $('#pw').select();
      } else {
        $('#login-err').textContent = 'No se pudo entrar (' + (r.json.error || r.status) + '). ¿El sitio está desplegado en Vercel?';
        $('#login-err').hidden = false;
      }
    }, function () {
      btn.disabled = false;
      btn.textContent = 'Entrar';
      $('#login-err').textContent = 'No hay conexión con el servidor. Abre el panel desde el sitio publicado.';
      $('#login-err').hidden = false;
    });
  });
  function logout() { state.token = null; writeLS(TOKEN_KEY, null); showLogin(); }

  /* ───────────────────────── load ───────────────────────── */
  function start() {
    $('#login').hidden = true;
    $('#app').hidden = false;
    $('#top-logo').innerHTML = wordmarkSVG();
    setStatus('Cargando…', '');
    state.open = readLS(OPEN_KEY) || { season: true, products: true };
    Promise.all([api('/api/status'), api('/api/menu?fresh=1')]).then(function (rs) {
      var st = rs[0].json || {}, mn = rs[1].json || {};
      state.storage = st.storage || 'none';
      if (!mn.data || !mn.data.categories) { toast('No se pudo leer el menú publicado.', 'bad'); return; }
      state.pub = mn.data;
      var dr = readLS(DRAFT_KEY);
      if (dr && dr.data && dr.data.categories && !sameDoc(dr.data, state.pub)) {
        state.draft = dr.data;
        notice('<b>Tienes cambios sin publicar</b> guardados en este navegador (' + fmtDate(dr.savedAt) + '). Sigue editando y publica cuando quieras, o <button class="btn btn--ghost btn--sm" data-act="discard">descártalos</button>.', '');
      } else {
        state.draft = clone(state.pub);
        writeLS(DRAFT_KEY, null);
      }
      if (state.storage === 'none') notice('<b>Falta conectar el almacenamiento.</b> En Vercel: pestaña <b>Storage</b> → <b>Create Database</b> → <b>Blob</b> → conéctalo a este proyecto y vuelve a desplegar (Deployments → Redeploy). Hasta entonces los cambios no se pueden publicar.', 'bad');
      renderEditor();
      updateTop();
      initPreview();
    }, function () { toast('No se pudo cargar el menú.', 'bad'); });
  }
  function notice(html, kind) {
    var n = $('#notice');
    n.innerHTML = html;
    n.className = 'notice' + (kind ? ' ' + kind : '');
    n.hidden = !html;
  }
  function setStatus(text, cls) {
    var s = $('#top-status');
    s.className = 'top-status' + (cls ? ' ' + cls : '');
    $('#status-t').textContent = text;
  }
  function isDirty() { return !sameDoc(state.draft, state.pub); }
  function updateTop() {
    var dirty = isDirty();
    if (dirty) setStatus('Cambios sin publicar', 'dirty');
    else setStatus('Publicado · ' + (fmtDate(state.pub.updatedAt) || 'menú original'), 'ok');
    $('#publish').disabled = !dirty || state.busy;
    $('#discard').disabled = !dirty;
    $('#undo').disabled = !state.undo.length;
    $('#foot-info').textContent = 'Última publicación: ' + (fmtDate(state.pub.updatedAt) || 'ninguna todavía') + ' · Almacenamiento: ' + ({ blob: 'Vercel Blob', local: 'carpeta local (pruebas)', none: 'no conectado' }[state.storage] || state.storage);
  }
  var saveDraft = debounce(function () {
    if (isDirty()) writeLS(DRAFT_KEY, { base: state.pub.updatedAt, data: state.draft, savedAt: new Date().toISOString() });
    else writeLS(DRAFT_KEY, null);
  }, 400);
  function changed() { updateTop(); saveDraft(); postDraft(); }

  /* ───────────────────────── editor: field helpers ───────────────────────── */
  function inp(path, val, ph, extra) { return '<input class="in" data-path="' + path + '" value="' + esc(val) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (extra || '') + '>'; }
  function field(label, inner, help) { return '<label class="field"><span>' + label + '</span>' + inner + (help ? '<span class="help" style="text-transform:none;letter-spacing:0;font-weight:400">' + help + '</span>' : '') + '</label>'; }
  function price(path, val, ph) { return '<span class="price"><input class="in" inputmode="decimal" data-path="' + path + '" data-type="num" value="' + esc(val === null || val === undefined ? '' : val) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' aria-label="Precio"></span>'; }
  function txt(path, val, ph, rows) { return '<textarea class="in" data-path="' + path + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (rows ? ' rows="' + rows + '"' : '') + '>' + esc(val) + '</textarea>'; }
  function sel(path, val, options) {
    return '<select data-path="' + path + '">' + options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  function tog(path, val, label, inv) {
    return '<label class="toggle"><input type="checkbox" data-path="' + path + '" data-type="' + (inv ? 'boolinv' : 'bool') + '"' + ((inv ? !val : !!val) ? ' checked' : '') + '><i></i><span>' + label + '</span></label>';
  }
  function imgpick(path, kindPath, val, kind, o) {
    o = o || {};
    var k = kindOf(val, kind), has = !!val;
    var btn = '<button type="button" class="imgbtn' + (has ? ' has' : '') + (has && k === 'cut' ? ' is-cut' : '') + (o.small ? ' imgbtn--sm' : '') + (o.wide ? ' imgbtn--wide' : '') + '" data-act="img" data-path="' + path + '"' + (kindPath ? ' data-kind="' + kindPath + '"' : '') + (o.removable ? ' data-removable="1"' : '') + ' title="' + esc(o.title || 'Cambiar imagen') + '">' + (has ? '<img src="' + esc(val) + '" alt="">' : (o.small ? '+' : 'Subir<br>foto')) + '</button>';
    if (o.small) return btn;
    var acts = '<span class="acts"><button type="button" class="btn btn--ghost btn--sm" data-act="img" data-path="' + path + '"' + (kindPath ? ' data-kind="' + kindPath + '"' : '') + '>' + (has ? 'Cambiar' : 'Subir foto') + '</button>'
      + (has && o.removable ? '<button type="button" class="btn btn--ghost btn--sm" data-act="imgclear" data-path="' + path + '"' + (kindPath ? ' data-kind="' + kindPath + '"' : '') + '>Quitar</button>' : '') + '</span>';
    return '<div class="imgpick">' + btn + '<div>' + (o.label ? '<div class="lbl" style="margin-bottom:6px">' + o.label + '</div>' : '') + acts + (o.help ? '<div class="help" style="margin-top:6px">' + o.help + '</div>' : '') + '</div></div>';
  }
  function secWrap(id, title, desc, body, icon) {
    var open = state.open[id] !== false && (state.open[id] || id === 'season' || id === 'products');
    return '<details class="sec" data-sec="' + id + '"' + (open ? ' open' : '') + '><summary>' + (icon ? '<span class="sec-ico">' + icon + '</span>' : '') + '<span><span class="sec-t">' + title + '</span>' + (desc ? '<br><span class="sec-d">' + desc + '</span>' : '') + '</span></summary><div class="sec-body">' + body + '</div></details>';
  }

  /* ───────────────────────── editor: sections ───────────────────────── */
  var I = W.BoscoSeasons.icons;
  function secSeason() {
    var cur = state.draft.season || 'normal';
    return secWrap('season', 'Temporada', 'Un clic cambia el look de todo el menú: figuras, animaciones y detalles sobre las fotos.',
      '<div class="seasons">' + SEASONS.map(function (s) { return '<button type="button" class="season-opt' + (s.id === cur ? ' on' : '') + '" data-act="season" data-id="' + s.id + '"><span class="ico">' + s.icon + '</span>' + esc(s.name) + '<small>' + esc(s.desc) + '</small></button>'; }).join('') + '</div>'
      + '<p class="help">La temporada se aplica a todos los celulares cuando publiques. El texto de la cinta y el aviso de bebidas de temporada se editan abajo.</p>');
  }
  function catThumb(c) {
    var a = c.art || {};
    if (a.img) return a.img;
    var p = PRESETS.filter(function (x) { return x[0] === a.preset; })[0];
    if (p && !p[2]) return BUBBLES;
    return p ? p[2] : 'art/icon-dogplate.svg';
  }
  function itemHTML(c, ci, it, ii, two) {
    var base = 'categories.' + ci + '.items.' + ii;
    var showD = !!it.d || state.desc[it.id];
    return '<div class="item' + (two ? ' two' : '') + (it.hidden ? ' hidden-it' : '') + '" data-item="' + esc(it.id) + '" data-ci="' + ci + '" data-ii="' + ii + '">'
      + '<span class="handle" draggable="true" title="Arrastra para reordenar">⋮⋮</span>'
      + imgpick(base + '.img', base + '.imgKind', it.img, it.imgKind, { small: true, removable: true, title: it.img ? 'Cambiar o quitar la foto' : 'Agregar una foto del producto' })
      + '<div class="name">' + inp(base + '.n', it.n, 'Nombre del producto', ' aria-label="Nombre"')
      + (showD ? txt(base + '.d', it.d, 'Descripción corta (opcional)', 1) : '<button type="button" class="dlink" data-act="addDesc" data-id="' + esc(it.id) + '">+ agregar descripción</button>') + '</div>'
      + '<div class="prices">' + price(base + '.p.0', it.p && it.p[0], two ? c.sizes[0] : 'Precio') + (two ? price(base + '.p.1', it.p && it.p[1], c.sizes[1]) : '') + '</div>'
      + '<label class="toggle tog" title="' + (it.hidden ? 'Oculto en el menú' : 'Visible en el menú') + '"><input type="checkbox" data-path="' + base + '.hidden" data-type="boolinv"' + (it.hidden ? '' : ' checked') + ' aria-label="Mostrar en el menú"><i></i></label>'
      + '<button type="button" class="ibtn ibtn--sm del" data-act="itemMenu" data-ci="' + ci + '" data-ii="' + ii + '" aria-label="Más opciones">⋯</button></div>';
  }
  function catHTML(c, ci) {
    var base = 'categories.' + ci, sizes = (c.sizes || []).filter(function (s) { return String(s || '').trim(); }), two = sizes.length === 2;
    var a = c.art || {}, open = !!state.open['cat:' + c.id];
    var items = (c.items || []).map(function (it, ii) { return itemHTML(c, ci, it, ii, two); }).join('');
    return '<details class="cat" data-cat="' + esc(c.id) + '"' + (open ? ' open' : '') + '><summary>'
      + '<span class="cat-thumb"><img src="' + esc(catThumb(c)) + '" alt=""></span><span class="cat-name">' + esc(c.name || 'Sin nombre') + '</span><span class="cat-n">' + c.items.length + (c.items.length === 1 ? ' producto' : ' productos') + (c.items.some(function (x) { return x.hidden; }) ? ' · ' + c.items.filter(function (x) { return x.hidden; }).length + ' oculto(s)' : '') + '</span>'
      + '<span class="cat-tools"><button type="button" class="ibtn ibtn--sm" data-act="moveCat" data-i="' + ci + '" data-dir="-1" title="Subir" aria-label="Subir categoría">↑</button><button type="button" class="ibtn ibtn--sm" data-act="moveCat" data-i="' + ci + '" data-dir="1" title="Bajar" aria-label="Bajar categoría">↓</button></span></summary>'
      + '<div class="cat-body">'
      + '<div class="row row--3">' + field('Nombre de la categoría', inp(base + '.name', c.name, 'Ej. Bebidas calientes')) + field('Nombre corto (barra)', inp(base + '.chip', c.chip, 'Ej. Calientes')) + field('Parte del menú', sel(base + '.group', c.group || 'bebidas', [['bebidas', 'Bebidas (arriba)'], ['alimentos', 'Alimentos y postres (abajo)']])) + '</div>'
      + '<div class="row row--3">' + field('Tamaño 1 (opcional)', inp(base + '.sizes.0', (c.sizes || [])[0] || '', 'Ej. 12 oz')) + field('Tamaño 2 (opcional)', inp(base + '.sizes.1', (c.sizes || [])[1] || '', 'Ej. 16 oz')) + '<div class="help" style="align-self:end;padding-bottom:10px">Con dos tamaños cada producto tiene dos precios. Déjalos vacíos si no aplica.</div></div>'
      + '<h4>Imagen de la categoría</h4>'
      + '<div class="imgpick"><button type="button" class="imgbtn has' + (kindOf(catThumb(c), a.kind) === 'cut' ? ' is-cut' : '') + '" data-act="img" data-path="' + base + '.art.img" data-kind="' + base + '.art.kind" title="Subir una foto"><img src="' + esc(catThumb(c)) + '" alt=""></button>'
      + '<div style="display:grid;gap:8px;flex:1;min-width:0"><label class="field"><span>Dibujo o foto de la casa</span>' + sel(base + '.art.preset', a.preset || 'pasteles', PRESETS.map(function (p) { return [p[0], p[1]]; })) + '</label>'
      + '<span class="acts"><button type="button" class="btn btn--ghost btn--sm" data-act="img" data-path="' + base + '.art.img" data-kind="' + base + '.art.kind">Subir mi propia foto</button>' + (a.img ? '<button type="button" class="btn btn--ghost btn--sm" data-act="imgclear" data-path="' + base + '.art.img" data-kind="' + base + '.art.kind">Quitar mi foto y usar el dibujo</button>' : '') + '</span>'
      + '<div class="help">Una foto normal aparece en un arco; un PNG sin fondo flota como las fotos originales.</div></div></div>'
      + '<h4>Productos</h4>'
      + (two ? '<div class="cols"><span class="c1">' + esc(sizes[0]) + '</span><span class="c2">' + esc(sizes[1]) + '</span></div>' : '')
      + '<div class="items" data-ci="' + ci + '">' + (items || '<div class="empty-cat">Todavía no hay productos en esta categoría.</div>') + '</div>'
      + '<button type="button" class="btn btn--sm item-add" data-act="addItem" data-ci="' + ci + '">+ Agregar producto</button>'
      + '<h4>Línea extra al final (opcional)</h4>'
      + '<div class="row row--2">' + field('Texto', inp(base + '.extra.n', (c.extra && c.extra.n) || '', 'Ej. Agrega foam a tu bebida')) + field('Costo extra', price(base + '.extra.p', c.extra ? c.extra.p : null, '15')) + '</div>'
      + '<div><button type="button" class="btn btn--danger btn--sm" data-act="delCat" data-i="' + ci + '">Eliminar esta categoría</button></div>'
      + '</div></details>';
  }
  function secProducts() {
    var cats = state.draft.categories.map(catHTML).join('');
    return secWrap('products', 'Productos y precios', 'Toca una categoría para abrirla. Cambia nombres, precios, fotos; agrega, oculta o quita productos.',
      '<div class="cats">' + cats + '</div><div><button type="button" class="btn btn--sm" data-act="addCat">+ Agregar categoría</button></div>');
  }
  function linkOptions() {
    var o = [['', 'Sin botón']];
    if (state.draft.perso && state.draft.perso.show) o.push(['personaliza', 'Personaliza tu bebida']);
    state.draft.categories.forEach(function (c) { o.push(['cat-' + c.id, c.name]); });
    return o;
  }
  function secFeatured() {
    var f = state.draft.featured || { cards: [] };
    var cards = (f.cards || []).map(function (c, k) {
      var b = 'featured.cards.' + k;
      return '<div class="card-ed" data-card="' + esc(c.id) + '"><div class="card-ed-h"><b>' + esc(c.title || 'Tarjeta ' + (k + 1)) + '</b>'
        + '<button type="button" class="ibtn ibtn--sm" data-act="moveCard" data-i="' + k + '" data-dir="-1" aria-label="Mover antes">←</button><button type="button" class="ibtn ibtn--sm" data-act="moveCard" data-i="' + k + '" data-dir="1" aria-label="Mover después">→</button><button type="button" class="ibtn ibtn--sm ibtn--danger" data-act="delCard" data-i="' + k + '" aria-label="Eliminar tarjeta">🗑</button></div>'
        + '<div class="row row--3">' + field('Etiqueta (opcional)', inp(b + '.tag', c.tag, 'Ej. Nuestro sello')) + field('Título', inp(b + '.title', c.title, 'Ej. Croissants y roles')) + field('Color', sel(b + '.style', c.style || 'paper', [['paper', 'Crema'], ['plum', 'Ciruela (oscuro)'], ['blush', 'Rosa'], ['wine', 'Vino']])) + '</div>'
        + field('Texto', inp(b + '.text', c.text, 'Una línea que antoje'))
        + '<div class="row row--3">' + field('Precio (texto libre)', inp(b + '.price', c.price, 'Ej. desde $65')) + field('Botón lleva a', sel(b + '.link', c.link || '', linkOptions())) + field('Texto del botón', inp(b + '.linkText', c.linkText, 'Ej. Ver panadería')) + '</div>'
        + field('Nota pequeña (opcional)', inp(b + '.note', c.note, 'Ej. Pregunta precio y disponibilidad en barra.'))
        + '<div class="row row--2">' + imgpick(b + '.img', b + '.imgKind', c.img, c.imgKind, { label: 'Imagen', removable: true }) + imgpick(b + '.img2', b + '.img2Kind', c.img2, c.img2Kind, { label: 'Segunda imagen (opcional)', removable: true, help: 'Con dos imágenes se muestran juntas, como el pan de muerto.' }) + '</div>'
        + '</div>';
    }).join('');
    return secWrap('featured', 'Los consentidos', 'Las tarjetas que se deslizan al inicio del menú.',
      '<div class="hint-row">' + tog('featured.show', f.show, 'Mostrar esta sección') + field('Título', inp('featured.title', f.title || 'Los consentidos')) + '</div>'
      + '<div style="display:grid;gap:12px">' + cards + '</div>' + ((f.cards || []).length < 6 ? '<div><button type="button" class="btn btn--sm" data-act="addCard">+ Agregar tarjeta</button></div>' : ''));
  }
  function secHero() {
    var b = state.draft.brand, h = state.draft.hero;
    return secWrap('hero', 'Portada', 'Lo primero que se ve: la frase bajo el logo y las fotos que flotan.',
      field('Frase bajo el logo', inp('brand.tagline', b.tagline, 'coffee, people & good times'))
      + '<div class="row row--3">' + imgpick('hero.togo', 'hero.togoKind', h.togo, h.togoKind, { label: 'Vaso (arriba)' }) + imgpick('hero.croissant', 'hero.croissantKind', h.croissant, h.croissantKind, { label: 'Izquierda (croissant)' }) + imgpick('hero.cup', 'hero.cupKind', h.cup, h.cupKind, { label: 'Derecha (taza)' }) + '</div>'
      + '<p class="help">Las fotos sin fondo (PNG transparente) flotan como las originales; una foto normal se muestra en un círculo.</p>'
      + '<div class="row row--2">' + field('Frase del pie de página', inp('brand.footLine', b.footLine, 'Good days start here')) + field('Nota de precios', inp('brand.priceNote', b.priceNote, 'Precios en pesos mexicanos (MXN).')) + '</div>');
  }
  function secNote() {
    var s = state.draft.seasonNote || {};
    return secWrap('seasonNote', 'Aviso de bebidas de temporada', 'El recuadro rosa con el perrito, antes de las bebidas.',
      '<div class="hint-row">' + tog('seasonNote.show', s.show, 'Mostrar el aviso') + '</div>' + field('Texto', inp('seasonNote.text', s.text, 'Pregunta por nuestras bebidas de temporada')));
  }
  function secPerso() {
    var p = state.draft.perso || {};
    return secWrap('perso', 'Personaliza tu bebida', 'La banda oscura de la bebida con imagen impresa.',
      '<div class="hint-row">' + tog('perso.show', p.show, 'Mostrar esta sección') + '</div>'
      + '<div class="row row--2">' + field('Título', inp('perso.title', p.title, 'Personaliza tu bebida')) + field('Precio extra (sello)', inp('perso.price', p.price, '+$20')) + '</div>'
      + field('Texto principal', inp('perso.lead', p.lead, 'Envía tu imagen y disfruta…'))
      + '<div class="row row--2">' + field('Nota en negritas', inp('perso.note', p.note, 'Costo extra +$20, en productos seleccionados.')) + field('Nota secundaria', inp('perso.note2', p.note2, 'Pregunta en barra cómo enviar tu imagen.')) + '</div>'
      + '<div class="row row--2">' + imgpick('perso.polaroid', '', p.polaroid, 'photo', { label: 'Imagen del marquito' }) + imgpick('perso.cup', 'perso.cupKind', p.cup, p.cupKind, { label: 'La taza' }) + '</div>'
      + field('Texto bajo el marquito', inp('perso.polaroidCaption', p.polaroidCaption, 'tu imagen')));
  }
  function secVitrina() {
    var v = state.draft.vitrina || {};
    var opts = state.draft.categories.map(function (c) { return [c.id, c.name]; });
    return secWrap('vitrina', 'Video de la vitrina', 'El video corto de la panadería.',
      '<div class="hint-row">' + tog('vitrina.show', v.show, 'Mostrar el video') + '</div>'
      + '<div class="row row--2">' + field('Pie del video', inp('vitrina.caption', v.caption, 'Nuestra vitrina')) + field('Aparece después de', sel('vitrina.after', v.after || 'panaderia', opts)) + '</div>');
  }
  function secPet() {
    var p = state.draft.pet || {};
    return secWrap('pet', 'Pet friendly', 'La franja con el perrito.',
      '<div class="hint-row">' + tog('pet.show', p.show, 'Mostrar esta sección') + '</div>'
      + '<div class="row row--2">' + field('Título', inp('pet.title', p.title, 'Pet friendly')) + field('Texto', inp('pet.text', p.text, 'Tu mejor amigo también es bienvenido.')) + '</div>'
      + imgpick('pet.img', 'pet.imgKind', p.img, p.imgKind, { label: 'Foto del perrito', help: 'Sin fondo se ve completo como ahora; con fondo aparece en un círculo.' }));
  }
  function secVisit() {
    var b = state.draft.brand, v = state.draft.visit || {}, hours = state.draft.hours || [];
    var gal = (v.gallery || []).map(function (src, k) { return '<div class="gal">' + imgpick('visit.gallery.' + k, '', src, 'photo', { small: true, title: 'Cambiar foto' }).replace('imgbtn--sm', '') + '<button type="button" class="ibtn ibtn--sm ibtn--danger rm" data-act="rmGallery" data-i="' + k + '" aria-label="Quitar foto">×</button></div>'; }).join('');
    var order = [1, 2, 3, 4, 5, 6, 0];
    var rows = order.map(function (i) {
      var h = hours[i] || {};
      var pad = function (t) { var m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? (m[1].length === 1 ? '0' + m[1] : m[1]) + ':' + m[2] : ''; };
      return '<div class="hrow' + (h.closed ? ' closed' : '') + '"><span class="d">' + DAYS[i] + '</span><input class="in" type="time" data-path="hours.' + i + '.open" value="' + pad(h.open) + '" aria-label="Abre"><input class="in" type="time" data-path="hours.' + i + '.close" value="' + pad(h.close) + '" aria-label="Cierra"><label class="toggle" title="Cerrado ese día"><input type="checkbox" data-path="hours.' + i + '.closed" data-type="bool"' + (h.closed ? ' checked' : '') + '><i></i><span class="small">Cerrado</span></label></div>';
    }).join('');
    return secWrap('visit', 'Visítanos y horario', 'Dirección, Instagram, fotos del local y horario (el menú muestra abierto/cerrado solo).',
      field('Dirección', inp('brand.address', b.address, 'Calle, número, colonia, ciudad'))
      + '<div class="row row--2">' + field('Búsqueda para Google Maps', inp('brand.mapsQuery', b.mapsQuery, 'Nombre y dirección como en Google Maps')) + field('Instagram (usuario)', inp('brand.instagram', b.instagram, 'boscosocialhub')) + '</div>'
      + '<div class="lbl">Fotos del local</div><div class="gallery">' + gal + ((v.gallery || []).length < 6 ? '<button type="button" class="imgbtn" data-act="addGallery" style="width:96px;height:96px;border-radius:22px 22px 12px 12px">+ Agregar<br>foto</button>' : '') + '</div>'
      + '<div class="lbl">Horario</div><div class="hours">' + rows + '</div><p class="help">Horario de Pachuca. El menú calcula “abierto ahora / abrimos mañana” con estos datos.</p>');
  }
  function secRibbon() {
    var r = state.draft.ribbon || [];
    return secWrap('ribbon', 'Cinta de frases', 'La cinta color vino que corre debajo de los consentidos. Una frase por línea.',
      txt('ribbon', r.join('\n'), 'Coffee, please\nGood days start here', 5).replace('data-path="ribbon"', 'data-path="ribbon" data-type="lines"'));
  }
  function renderEditor() {
    var y = W.pageYOffset;
    $('#editor').innerHTML = secSeason() + secProducts() + secFeatured() + secHero() + secNote() + secPerso() + secVitrina() + secPet() + secVisit() + secRibbon();
    W.scrollTo(0, y);
  }
  function renderSec(id) {
    var el = $('.sec[data-sec="' + id + '"]');
    if (!el) return renderEditor();
    var map = { season: secSeason, products: secProducts, featured: secFeatured, hero: secHero, seasonNote: secNote, perso: secPerso, vitrina: secVitrina, pet: secPet, visit: secVisit, ribbon: secRibbon };
    var t = d.createElement('div');
    t.innerHTML = map[id]();
    el.replaceWith(t.firstChild);
  }

  /* ───────────────────────── editor: events ───────────────────────── */
  var editor = $('#editor');
  var lastFocusPath = null;
  editor.addEventListener('focusin', function (e) {
    var p = e.target.getAttribute && e.target.getAttribute('data-path');
    if (p && p !== lastFocusPath) { pushUndo(); lastFocusPath = p; }
  });
  editor.addEventListener('input', function (e) { onField(e.target); });
  editor.addEventListener('change', function (e) {
    var t = e.target;
    if (t.type === 'checkbox' || t.tagName === 'SELECT' || t.type === 'time') onField(t, true);
  });
  editor.addEventListener('toggle', function (e) {
    var t = e.target;
    if (t.classList.contains('sec')) state.open[t.getAttribute('data-sec')] = t.open;
    else if (t.classList.contains('cat')) state.open['cat:' + t.getAttribute('data-cat')] = t.open;
    writeLS(OPEN_KEY, state.open);
  }, true);
  function onField(t, isChange) {
    var p = t.getAttribute && t.getAttribute('data-path');
    if (!p) return;
    var type = t.getAttribute('data-type') || 'text', v;
    if (type === 'num') { var s = String(t.value).replace(/[^0-9.,]/g, '').replace(',', '.'); v = s === '' ? null : (isNaN(parseFloat(s)) ? null : Math.round(parseFloat(s) * 100) / 100); }
    else if (type === 'bool') v = !!t.checked;
    else if (type === 'boolinv') v = !t.checked;
    else if (type === 'lines') v = t.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    else v = t.value;
    if (!isChange && type !== 'text' && type !== 'num' && type !== 'lines') return;
    if (isChange && lastFocusPath !== p) { pushUndo(); lastFocusPath = p; }
    setPath(state.draft, p, v);
    afterField(p, t, v);
    changed();
  }
  function afterField(p, t, v) {
    var m;
    if ((m = /^categories\.(\d+)\.(name|chip)$/.exec(p))) {
      var cat = state.draft.categories[+m[1]];
      if (m[2] === 'name') { var nm = $('.cat[data-cat="' + cat.id + '"] .cat-name'); if (nm) nm.textContent = v || 'Sin nombre'; }
    } else if ((m = /^categories\.(\d+)\.sizes\.(\d)$/.exec(p))) {
      fixPrices(state.draft.categories[+m[1]]);
      scheduleRerender('products');
    } else if ((m = /^categories\.(\d+)\.art\.preset$/.exec(p))) {
      var c2 = state.draft.categories[+m[1]];
      c2.art = { preset: v };                       /* choosing a drawing drops the uploaded photo */
      renderSec('products');
    } else if (/^categories\.\d+\.items\.\d+\.hidden$/.test(p)) {
      var row = t.closest('.item');
      if (row) row.classList.toggle('hidden-it', !!v);
      var ci = +t.closest('.item').getAttribute('data-ci');
      var sum = $('.cat[data-cat="' + state.draft.categories[ci].id + '"] .cat-n');
      if (sum) { var c3 = state.draft.categories[ci], hid = c3.items.filter(function (x) { return x.hidden; }).length; sum.textContent = c3.items.length + (c3.items.length === 1 ? ' producto' : ' productos') + (hid ? ' · ' + hid + ' oculto(s)' : ''); }
    } else if ((m = /^hours\.(\d)\.closed$/.exec(p))) {
      var hr = t.closest('.hrow'); if (hr) hr.classList.toggle('closed', !!v);
    } else if (/^featured\.cards\.\d+\.title$/.test(p)) {
      var ce = t.closest('.card-ed'); if (ce) $('b', ce).textContent = v || 'Tarjeta';
    } else if (p === 'perso.show' || /^categories\.\d+\.(name|id)$/.test(p)) {
      scheduleRerender('featured');
    }
  }
  var rerenderT = {};
  function scheduleRerender(id) { clearTimeout(rerenderT[id]); rerenderT[id] = setTimeout(function () { if (d.activeElement && d.activeElement.closest && d.activeElement.closest('.sec[data-sec="' + id + '"]')) { rerenderT[id] = setTimeout(function () { scheduleRerender(id); }, 1500); return; } renderSec(id); }, 900); }
  function fixPrices(c) {
    var n = (c.sizes || []).filter(function (s) { return String(s || '').trim(); }).length === 2 ? 2 : 1;
    (c.items || []).forEach(function (it) {
      if (!Array.isArray(it.p)) it.p = [it.p === undefined ? null : it.p];
      while (it.p.length < n) it.p.push(null);
      if (it.p.length > n) it.p.length = n;
    });
  }

  editor.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b || !editor.contains(b)) return;
    var act = b.getAttribute('data-act');
    if (act === 'season') { pushUndo(); state.draft.season = b.getAttribute('data-id'); $$('.season-opt').forEach(function (x) { x.classList.toggle('on', x === b); }); changed(); return; }
    if (act === 'img') { pickFor(b); return; }
    if (act === 'imgclear') { pushUndo(); setPath(state.draft, b.getAttribute('data-path'), ''); if (b.getAttribute('data-kind')) setPath(state.draft, b.getAttribute('data-kind'), ''); renderSec(secOf(b)); changed(); return; }
    if (act === 'addDesc') { state.desc[b.getAttribute('data-id')] = true; renderSec('products'); var ta = $('.item[data-item="' + b.getAttribute('data-id') + '"] textarea'); if (ta) ta.focus(); return; }
    if (act === 'addItem') {
      pushUndo();
      var c = state.draft.categories[+b.getAttribute('data-ci')];
      var it = { id: uid('it'), n: '', p: [null], d: '', img: '', imgKind: '', hidden: false };
      c.items.push(it); fixPrices(c);
      renderSec('products');
      var ni = $('.item[data-item="' + it.id + '"] input'); if (ni) { ni.focus(); ni.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      changed(); return;
    }
    if (act === 'itemMenu') { itemMenu(b, +b.getAttribute('data-ci'), +b.getAttribute('data-ii')); return; }
    if (act === 'addCat') {
      pushUndo();
      var nc = { id: uid('cat'), name: 'Nueva categoría', chip: 'Nueva', group: 'alimentos', sizes: [], kw: '', art: { preset: 'pasteles' }, extra: null, items: [] };
      state.draft.categories.push(nc);
      state.open['cat:' + nc.id] = true;
      renderSec('products');
      var el = $('.cat[data-cat="' + nc.id + '"]'); if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); var ii = $('input', el); if (ii) { ii.focus(); ii.select(); } }
      changed(); return;
    }
    if (act === 'delCat') {
      var i = +b.getAttribute('data-i'), cc = state.draft.categories[i];
      if (!confirm('¿Eliminar la categoría “' + cc.name + '” y sus ' + cc.items.length + ' productos? Puedes deshacerlo con el botón Deshacer.')) return;
      pushUndo(); state.draft.categories.splice(i, 1); renderSec('products'); changed(); return;
    }
    if (act === 'moveCat') {
      var ix = +b.getAttribute('data-i'), dir = +b.getAttribute('data-dir'), arr = state.draft.categories, j = ix + dir;
      if (j < 0 || j >= arr.length) return;
      pushUndo(); var tmp = arr[ix]; arr[ix] = arr[j]; arr[j] = tmp; renderSec('products');
      var mv = $('.cat[data-cat="' + tmp.id + '"]'); if (mv) mv.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      changed(); return;
    }
    if (act === 'addCard') {
      pushUndo();
      var f = state.draft.featured;
      f.cards.push({ id: uid('card'), style: 'paper', tag: '', title: 'Nueva tarjeta', text: '', price: '', link: '', linkText: '', img: '', imgKind: '', img2: '', note: '' });
      renderSec('featured'); changed(); return;
    }
    if (act === 'delCard') {
      if (!confirm('¿Eliminar esta tarjeta?')) return;
      pushUndo(); state.draft.featured.cards.splice(+b.getAttribute('data-i'), 1); renderSec('featured'); changed(); return;
    }
    if (act === 'moveCard') {
      var k = +b.getAttribute('data-i'), dr = +b.getAttribute('data-dir'), cs = state.draft.featured.cards, kk = k + dr;
      if (kk < 0 || kk >= cs.length) return;
      pushUndo(); var t2 = cs[k]; cs[k] = cs[kk]; cs[kk] = t2; renderSec('featured'); changed(); return;
    }
    if (act === 'addGallery') { pickImage(function (file) { uploadFile(file, b).then(function (r) { pushUndo(); state.draft.visit.gallery = state.draft.visit.gallery || []; state.draft.visit.gallery.push(r.url); renderSec('visit'); changed(); }); }); return; }
    if (act === 'rmGallery') { pushUndo(); state.draft.visit.gallery.splice(+b.getAttribute('data-i'), 1); renderSec('visit'); changed(); return; }
    if (act === 'discard') { discard(); return; }
  });
  function secOf(el) { var s = el.closest('.sec'); return s ? s.getAttribute('data-sec') : 'products'; }

  /* a small menu for a product row: move, change category, delete */
  var menuEl = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  d.addEventListener('click', function (e) { if (menuEl && !menuEl.contains(e.target) && !e.target.closest('[data-act="itemMenu"]')) closeMenu(); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  function itemMenu(anchor, ci, ii) {
    closeMenu();
    var cat = state.draft.categories[ci], it = cat.items[ii];
    var m = d.createElement('div');
    m.className = 'menu';
    m.setAttribute('role', 'menu');
    var others = state.draft.categories.filter(function (c) { return c !== cat; });
    m.innerHTML = '<button type="button" data-m="up"' + (ii === 0 ? ' disabled' : '') + '>↑ Subir</button><button type="button" data-m="down"' + (ii === cat.items.length - 1 ? ' disabled' : '') + '>↓ Bajar</button>'
      + '<button type="button" data-m="dup">⧉ Duplicar</button>'
      + (others.length ? '<label>Mover a<select data-m="move"><option value="">Elige categoría…</option>' + others.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('') + '</select></label>' : '')
      + '<button type="button" data-m="del" class="danger">🗑 Eliminar</button>';
    d.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    m.style.top = (r.bottom + W.pageYOffset + 6) + 'px';
    m.style.left = Math.max(8, Math.min(W.innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth + W.pageXOffset)) + 'px';
    menuEl = m;
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]');
      if (!b || b.tagName === 'SELECT') return;
      var a = b.getAttribute('data-m');
      if (a === 'up' || a === 'down') { var j = ii + (a === 'up' ? -1 : 1); if (j < 0 || j >= cat.items.length) return; pushUndo(); cat.items.splice(ii, 1); cat.items.splice(j, 0, it); }
      else if (a === 'dup') { pushUndo(); var cp = clone(it); cp.id = uid('it'); cp.n = (it.n || '') + ' (copia)'; cat.items.splice(ii + 1, 0, cp); }
      else if (a === 'del') { pushUndo(); cat.items.splice(ii, 1); }
      closeMenu(); renderSec('products'); changed();
    });
    m.addEventListener('change', function (e) {
      var s = e.target;
      if (s.getAttribute('data-m') !== 'move' || !s.value) return;
      var dest = state.draft.categories.filter(function (c) { return c.id === s.value; })[0];
      if (!dest) return;
      pushUndo(); cat.items.splice(ii, 1); dest.items.push(it); fixPrices(dest);
      state.open['cat:' + dest.id] = true;
      closeMenu(); renderSec('products'); changed();
      toast('“' + (it.n || 'Producto') + '” se movió a ' + dest.name + '.', 'ok');
    });
  }

  /* drag and drop of product rows inside a category (desktop) */
  var drag = null;
  editor.addEventListener('dragstart', function (e) {
    var h = e.target.closest ? e.target.closest('.handle') : null;
    if (!h) return;
    var row = h.closest('.item');
    if (!row) { e.preventDefault(); return; }
    drag = { ci: +row.getAttribute('data-ci'), ii: +row.getAttribute('data-ii'), row: row };
    row.classList.add('dragging');
    try { e.dataTransfer.setData('text/plain', row.getAttribute('data-item')); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setDragImage(row, 20, 20); } catch (x) { /* older engines */ }
  });
  editor.addEventListener('dragover', function (e) {
    if (!drag) return;
    var row = e.target.closest ? e.target.closest('.item') : null;
    if (!row || +row.getAttribute('data-ci') !== drag.ci) return;
    e.preventDefault();
    $$('.item.over').forEach(function (x) { x.classList.remove('over'); });
    row.classList.add('over');
  });
  editor.addEventListener('drop', function (e) {
    if (!drag) return;
    var row = e.target.closest ? e.target.closest('.item') : null;
    e.preventDefault();
    if (row && +row.getAttribute('data-ci') === drag.ci) {
      var to = +row.getAttribute('data-ii'), items = state.draft.categories[drag.ci].items;
      if (to !== drag.ii) { pushUndo(); var it = items.splice(drag.ii, 1)[0]; items.splice(to, 0, it); renderSec('products'); changed(); }
    }
    drag = null;
  });
  editor.addEventListener('dragend', function () { $$('.item.dragging, .item.over').forEach(function (x) { x.classList.remove('dragging', 'over'); }); drag = null; });

  /* ───────────────────────── images ───────────────────────── */
  function pickImage(cb) {
    var f = $('#file');
    f.value = '';
    f.onchange = function () { if (f.files && f.files[0]) cb(f.files[0]); };
    f.click();
  }
  function pickFor(btn) {
    var path = btn.getAttribute('data-path'), kindPath = btn.getAttribute('data-kind'), cur = getPath(state.draft, path);
    var go = function () {
      pickImage(function (file) {
        uploadFile(file, btn).then(function (r) {
          pushUndo();
          setPath(state.draft, path, r.url);
          if (kindPath) setPath(state.draft, kindPath, r.kind);
          renderSec(secOf(btn));
          changed();
          toast(r.kind === 'cut' ? 'Imagen sin fondo subida: flotará como las originales.' : 'Foto subida.', 'ok');
        });
      });
    };
    if (cur && btn.getAttribute('data-removable') && btn.classList.contains('imgbtn')) {
      /* a small choice on the thumbnail itself: change or remove */
      closeMenu();
      var m = d.createElement('div');
      m.className = 'menu';
      m.innerHTML = '<button type="button" data-m="change">Cambiar la foto</button><button type="button" data-m="rm" class="danger">Quitar la foto</button>';
      d.body.appendChild(m);
      var r = btn.getBoundingClientRect();
      m.style.top = (r.bottom + W.pageYOffset + 6) + 'px';
      m.style.left = Math.max(8, r.left + W.pageXOffset) + 'px';
      menuEl = m;
      m.addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]');
        if (!b) return;
        closeMenu();
        if (b.getAttribute('data-m') === 'rm') { pushUndo(); setPath(state.draft, path, ''); if (kindPath) setPath(state.draft, kindPath, ''); renderSec(secOf(btn)); changed(); }
        else go();
      });
      return;
    }
    go();
  }
  function prepImage(file) {
    /* shrink to ≤1400 px and re-encode as WebP (keeps transparency); says whether it has a transparent background */
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        try {
          var MAX = 1400, w = im.naturalWidth, h = im.naturalHeight, s = Math.min(1, MAX / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
          var c = d.createElement('canvas'); c.width = cw; c.height = ch;
          var ctx = c.getContext('2d');
          ctx.drawImage(im, 0, 0, cw, ch);
          var alpha = false;
          try {
            var px = ctx.getImageData(0, 0, cw, ch).data, step = Math.max(4, Math.floor(px.length / 4 / 6000)) * 4;
            for (var i = 3; i < px.length; i += step) { if (px[i] < 200) { alpha = true; break; } }
          } catch (e) { alpha = /png|webp/i.test(file.type); }
          var type = 'image/webp';
          c.toBlob(function (blob) {
            URL.revokeObjectURL(url);
            if (!blob) return reject(new Error('No se pudo procesar la imagen.'));
            if (blob.type !== 'image/webp') { type = alpha ? 'image/png' : 'image/jpeg'; c.toBlob(function (b2) { resolve({ blob: b2, type: type, kind: alpha ? 'cut' : 'photo' }); }, type, 0.86); }
            else resolve({ blob: blob, type: type, kind: alpha ? 'cut' : 'photo' });
          }, type, 0.84);
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Ese archivo no es una imagen válida.')); };
      im.src = url;
    });
  }
  function toBase64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(',')[1]); };
      fr.onerror = function () { reject(new Error('No se pudo leer la imagen.')); };
      fr.readAsDataURL(blob);
    });
  }
  function uploadFile(file, btn) {
    if (btn) btn.classList.add('busy');
    return prepImage(file).then(function (p) {
      return toBase64(p.blob).then(function (b64) {
        return api('/api/upload', { method: 'POST', body: { name: file.name, type: p.type, data: b64 } }).then(function (r) {
          if (r.status === 401) { showLogin('Tu sesión terminó. Vuelve a entrar.'); throw new Error('sesión'); }
          if (r.status !== 200 || !r.json.url) throw new Error(r.json.message || 'No se pudo subir la imagen.');
          return { url: r.json.url, kind: p.kind };
        });
      });
    }).then(function (r) { if (btn) btn.classList.remove('busy'); return r; }, function (e) {
      if (btn) btn.classList.remove('busy');
      if (e.message !== 'sesión') toast(e.message || 'No se pudo subir la imagen.', 'bad', 6000);
      throw e;
    });
  }

  /* ───────────────────────── undo / discard / publish ───────────────────────── */
  function pushUndo() {
    var s = JSON.stringify(state.draft);
    if (state.undo.length && state.undo[state.undo.length - 1] === s) return;
    state.undo.push(s);
    if (state.undo.length > 60) state.undo.shift();
    $('#undo').disabled = false;
  }
  function undo() {
    if (!state.undo.length) return;
    var s = state.undo.pop();
    if (s === JSON.stringify(state.draft) && state.undo.length) s = state.undo.pop();
    state.draft = JSON.parse(s);
    lastFocusPath = null;
    renderEditor();
    changed();
    toast('Cambio deshecho.', '');
  }
  $('#undo').addEventListener('click', undo);
  d.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      e.preventDefault(); undo();
    }
  });
  function discard() {
    if (!isDirty()) return;
    if (!confirm('¿Descartar todos los cambios sin publicar y volver al menú publicado?')) return;
    pushUndo();
    state.draft = clone(state.pub);
    state.desc = {};
    lastFocusPath = null;
    renderEditor();
    notice('', '');
    changed();
    toast('Cambios descartados.', '');
  }
  $('#discard').addEventListener('click', discard);
  $('#publish').addEventListener('click', function () {
    if (state.busy) return;
    var bad = [];
    state.draft.categories.forEach(function (c) { if (!String(c.name || '').trim()) bad.push('una categoría sin nombre'); c.items.forEach(function (it) { if (!String(it.n || '').trim()) bad.push('un producto sin nombre en ' + (c.name || 'una categoría')); }); });
    if (bad.length) { toast('Antes de publicar, completa: ' + bad.slice(0, 3).join(', ') + (bad.length > 3 ? '…' : '') + '.', 'bad', 6000); return; }
    state.busy = true;
    var btn = $('#publish');
    btn.disabled = true;
    btn.textContent = 'Publicando…';
    api('/api/publish', { method: 'POST', body: { data: state.draft } }).then(function (r) {
      state.busy = false;
      btn.textContent = 'Publicar';
      if (r.status === 401) { showLogin('Tu sesión terminó. Vuelve a entrar y publica de nuevo (tus cambios siguen guardados aquí).'); return; }
      if (r.status !== 200 || !r.json.ok) { updateTop(); toast(r.json.message || 'No se pudo publicar (' + r.status + ').', 'bad', 7000); return; }
      state.pub = r.json.data;
      state.draft = clone(state.pub);
      writeLS(DRAFT_KEY, null);
      notice('', '');
      lastFocusPath = null;
      renderEditor();
      updateTop();
      postDraft();
      toast('¡Publicado! El menú ya está actualizado para todos. Los celulares que ya lo tenían abierto lo verán en un par de minutos.', 'ok', 6000);
    }, function () { state.busy = false; btn.textContent = 'Publicar'; updateTop(); toast('No hay conexión con el servidor.', 'bad'); });
  });

  /* ───────────────────────── backup / restore / reset / logout ───────────────────────── */
  $('#backup').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(state.draft, null, 1)], { type: 'application/json' });
    var a = d.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'menu-bosco-' + new Date().toISOString().slice(0, 10) + '.json';
    d.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });
  $('#restore').addEventListener('click', function () {
    var f = $('#file-json');
    f.value = '';
    f.onchange = function () {
      var file = f.files && f.files[0];
      if (!file) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var doc = JSON.parse(String(fr.result));
          if (!doc || !Array.isArray(doc.categories)) throw new Error('bad');
          if (!confirm('¿Cargar este respaldo en el editor? Podrás revisarlo en la vista previa antes de publicar.')) return;
          pushUndo(); state.draft = doc; renderEditor(); changed(); toast('Respaldo cargado. Revísalo y publica cuando quieras.', 'ok');
        } catch (e) { toast('Ese archivo no es un respaldo del menú.', 'bad'); }
      };
      fr.readAsText(file);
    };
    f.click();
  });
  $('#reset').addEventListener('click', function () {
    if (!confirm('¿Volver al menú original (el que venía con el sitio)? Se cargará en el editor; nada se publica hasta que presiones Publicar.')) return;
    fetch('data/menu.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (doc) { pushUndo(); state.draft = doc; renderEditor(); changed(); toast('Menú original cargado en el editor.', 'ok'); }, function () { toast('No se pudo leer el menú original.', 'bad'); });
  });
  $('#logout').addEventListener('click', logout);

  /* ───────────────────────── preview ───────────────────────── */
  var pv = $('#pv'), pane = $('#pane');
  function initPreview() {
    state.pvReady = false;
    pv.src = './?preview=1&v=' + Date.now();
  }
  W.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || typeof m !== 'object') return;
    if (m.type === 'bosco:ready') { state.pvReady = true; postDraft(true); }
    else if (m.type === 'bosco:edit' && m.path) focusEdit(m.path);
  });
  var postDraftNow = function () { if (state.pvReady && pv.contentWindow) { try { pv.contentWindow.postMessage({ type: 'bosco:data', data: state.draft }, '*'); } catch (e) { /* not ready */ } } };
  var postDraftLater = debounce(postDraftNow, 140);
  function postDraft(now) { if (now) postDraftNow(); else postDraftLater(); }
  $('#preview-btn').addEventListener('click', function () {
    if (W.matchMedia('(max-width:1040px)').matches) { pane.classList.add('open'); d.body.style.overflow = 'hidden'; }
    else { pane.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    postDraft(true);
  });
  $('#pane-close').addEventListener('click', function () { pane.classList.remove('open'); d.body.style.overflow = ''; });
  $('#open-preview').addEventListener('click', function () { saveDraft(); writeLS(DRAFT_KEY, { base: state.pub.updatedAt, data: state.draft, savedAt: new Date().toISOString() }); });

  function focusEdit(path) {
    var parts = path.split(':'), target = null, sec = null, focusEl = null;
    closeMenu();
    if (parts[0] === 'item') {
      var cat = state.draft.categories.filter(function (c) { return c.id === parts[1]; })[0];
      if (!cat) return;
      sec = 'products';
      state.open.products = true;
      state.open['cat:' + cat.id] = true;
      renderSec('products');
      target = $('.item[data-item="' + parts[2] + '"]');
      focusEl = target && $('input', target);
    } else if (parts[0] === 'cat') {
      sec = 'products';
      state.open.products = true;
      state.open['cat:' + parts[1]] = true;
      renderSec('products');
      target = $('.cat[data-cat="' + parts[1] + '"]');
      focusEl = target && $('.cat-body input', target);
    } else if (parts[0] === 'card') {
      sec = 'featured';
      state.open.featured = true;
      renderSec('featured');
      target = $('.card-ed[data-card="' + parts[1] + '"]');
      focusEl = target && $('input', target);
    } else if (parts[0] === 'sec') {
      sec = { hero: 'hero', featured: 'featured', seasonNote: 'seasonNote', perso: 'perso', pet: 'pet', visit: 'visit' }[parts[1]];
      if (!sec) return;
      state.open[sec] = true;
      renderSec(sec);
      target = $('.sec[data-sec="' + sec + '"]');
      focusEl = target && $('input', target);
    }
    if (!target) return;
    writeLS(OPEN_KEY, state.open);
    if (W.matchMedia('(max-width:1040px)').matches) { pane.classList.remove('open'); d.body.style.overflow = ''; }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('hit');
    setTimeout(function () { target.classList.remove('hit'); }, 1800);
    if (focusEl) setTimeout(function () { try { focusEl.focus({ preventScroll: true }); } catch (e) { focusEl.focus(); } }, 450);
  }

  /* ───────────────────────── boot ───────────────────────── */
  state.token = readLS(TOKEN_KEY);
  if (state.token) {
    api('/api/login').then(function (r) { if (r.status === 200) start(); else logout(); }, function () { showLogin('No hay conexión con el servidor.'); });
  } else showLogin();
})();
