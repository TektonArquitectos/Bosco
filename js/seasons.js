/* Bosco · temporadas
   One switch in the admin changes the whole look: each season adds drawings, falling bits, small animations and
   stickers on the pictures and on the dog, all in the brand's line-art style and palette. Nothing here touches the
   menu data; everything is removed and rebuilt by apply(). */
(function () {
  'use strict';
  var d = document, W = window;
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function svg(vb, inner, cls, extra) { return '<svg viewBox="' + vb + '"' + (cls ? ' class="' + cls + '"' : '') + ' aria-hidden="true" focusable="false"' + (extra || '') + '>' + inner + '</svg>'; }
  function star(cx, cy, n, r1, r2, rot) {
    var p = [];
    for (var i = 0; i < n * 2; i++) {
      var a = (rot || -Math.PI / 2) + i * Math.PI / n, r = i % 2 ? r2 : r1;
      p.push((cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1));
    }
    return 'M' + p.join('L') + 'z';
  }
  function seeded(n) { var x = n * 9301 + 49297; return function () { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }

  /* ───────────────────────── the drawings ───────────────────────── */
  var S = 'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    marigold: function () {
      return svg('0 0 100 100', '<g ' + S + ' stroke-width="2">'
        + '<path d="' + star(50, 50, 14, 48, 36) + '" fill="#E08A26"/>'
        + '<path d="' + star(50, 50, 12, 36, 26, -1.3) + '" fill="#F2A73B"/>'
        + '<path d="' + star(50, 50, 9, 24, 16, -0.6) + '" fill="#F6BE55"/>'
        + '<circle cx="50" cy="50" r="9" fill="#B9601B"/></g>');
    },
    petal: function () { return svg('0 0 40 24', '<path d="M2 12C8 2 32 2 38 12 32 22 8 22 2 12z" fill="#F2A73B" stroke="#C96D16" stroke-width="1.5"/>'); },
    skull: function () {
      return svg('0 0 100 112', '<g ' + S + ' stroke-width="3">'
        + '<path d="M50 5C26 5 11 22 11 45c0 14 6 24 14 30v20c0 4 3 7 7 7h36c4 0 7-3 7-7V75c8-6 14-16 14-30C89 22 74 5 50 5z" fill="#FFFCF7"/>'
        + '<path d="M37 80v14M46 80v16M54 80v16M63 80v14" stroke-width="2.5"/>'
        + '<path d="M50 60l-5-5a3.4 3.4 0 0 1 5-4.5 3.4 3.4 0 0 1 5 4.5z" fill="currentColor" stroke="none"/>'
        + '<g fill="#7A2630" stroke="none"><circle cx="34" cy="46" r="10"/><circle cx="66" cy="46" r="10"/></g>'
        + '<g fill="#F2A73B" stroke="none"><circle cx="34" cy="34" r="3.5"/><circle cx="23" cy="43" r="3.5"/><circle cx="26" cy="55" r="3.5"/><circle cx="42" cy="56" r="3.5"/><circle cx="45" cy="42" r="3.5"/>'
        + '<circle cx="66" cy="34" r="3.5"/><circle cx="77" cy="43" r="3.5"/><circle cx="74" cy="55" r="3.5"/><circle cx="58" cy="56" r="3.5"/><circle cx="55" cy="42" r="3.5"/></g>'
        + '<path d="M40 22c6-6 14-6 20 0" fill="none" stroke-width="2.5"/></g>');
    },
    bat: function () {
      return svg('0 0 120 56', '<path d="M60 34c-3-9-9-14-18-14 2 6-2 10-8 10-9 0-16-7-22-16 3 13 11 30 27 30 6 0 10-2 13-6l8 7 8-7c3 4 7 6 13 6 16 0 24-17 27-30-6 9-13 16-22 16-6 0-10-4-8-10-9 0-15 5-18 14zM52 20l3-9 5 7 5-7 3 9z" fill="#442B31"/>');
    },
    moon: function () {
      return svg('0 0 100 100', '<g ' + S + ' stroke-width="3"><path d="M64 8A42 42 0 1 0 92 76 34 34 0 0 1 64 8z" fill="#FFFCF7"/>'
        + '<g fill="currentColor" stroke="none"><circle cx="78" cy="18" r="2.6"/><circle cx="90" cy="34" r="2"/><circle cx="70" cy="30" r="1.6"/></g></g>');
    },
    candle: function () {
      return svg('0 0 60 110', '<g ' + S + ' stroke-width="3">'
        + '<g class="sx-flame"><path d="M30 44c-9-11-7-22 0-32 7 10 9 21 0 32z" fill="#F2A73B" stroke="#C96D16" stroke-width="2"/><path d="M30 40c-4-6-3-12 0-17 3 5 4 11 0 17z" fill="#FBE3A3" stroke="none"/></g>'
        + '<path d="M30 44v6" stroke-width="2.5"/>'
        + '<path d="M16 54h28v44a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z" fill="#FFFCF7"/>'
        + '<path d="M16 54c4 10 1 16 6 22 3-6 0-14 4-22M44 54c-3 8 0 12-3 18" fill="none" stroke-width="2"/></g>');
    },
    bulb: function (c) {
      return svg('0 0 30 52', '<g ' + S + ' stroke-width="2"><rect x="9" y="1" width="12" height="10" rx="2" fill="currentColor"/>'
        + '<path class="sx-glass" d="M15 11c-8 0-12 8-12 18 0 11 6 20 12 22 6-2 12-11 12-22 0-10-4-18-12-18z" fill="' + c + '"/>'
        + '<path d="M9 22c0-4 2-7 4-8" stroke="#FFFCF7" stroke-opacity=".7" stroke-width="2"/></g>');
    },
    holly: function () {
      return svg('0 0 110 72', '<g ' + S + ' stroke-width="2.5">'
        + '<path d="M52 42C44 22 26 8 8 18c9 8 10 26 4 38 14 3 34-1 40-14z" fill="#4C7A50"/>'
        + '<path d="M58 42c8-20 26-34 44-24-9 8-10 26-4 38-14 3-34-1-40-14z" fill="#4C7A50"/>'
        + '<path d="M14 26c10 6 22 12 34 15M96 26c-10 6-22 12-34 15" fill="none" stroke-width="1.8" stroke-opacity=".7"/>'
        + '<g fill="#7A2630"><circle cx="55" cy="46" r="7"/><circle cx="47" cy="58" r="6.5"/><circle cx="63" cy="58" r="6.5"/></g>'
        + '<g fill="#FFFCF7" stroke="none"><circle cx="53" cy="43" r="1.8"/><circle cx="45" cy="55" r="1.6"/><circle cx="61" cy="55" r="1.6"/></g></g>');
    },
    hat: function () {
      return svg('0 0 110 92', '<g ' + S + ' stroke-width="2.8">'
        + '<path d="M22 70C24 44 42 18 80 10c-10 12-8 32 2 50z" fill="#7A2630"/>'
        + '<rect x="10" y="64" width="76" height="20" rx="10" fill="#FFFCF7"/>'
        + '<circle cx="86" cy="14" r="11" fill="#FFFCF7"/></g>');
    },
    snowcap: function () {
      return svg('0 0 120 44', '<path d="M6 34c-4-14 8-24 22-22 6-10 26-12 36-4 10-8 30-6 38 4 12 0 18 10 14 20-6 4-12 2-16-2-6 6-14 6-20 0-6 6-16 6-22 0-6 6-16 6-22 0-6 6-14 6-20 2-4 4-8 4-10 2z" fill="#FFFCF7" stroke="currentColor" stroke-opacity=".45" stroke-width="2.2" stroke-linejoin="round"/>');
    },
    flake: function () {
      return svg('0 0 40 40', '<g stroke="#FFFCF7" stroke-width="3" stroke-linecap="round"><path d="M20 3v34M5 11.5l30 17M5 28.5l30-17"/><path d="M20 3l-4 5M20 3l4 5M20 37l-4-5M20 37l4-5M5 11.5l6 1M5 11.5l1 6M35 28.5l-6-1M35 28.5l-1-6M5 28.5l6-1M5 28.5l1-6M35 11.5l-6 1M35 11.5l-1-6"/></g>');
    },
    dot: function () { return svg('0 0 20 20', '<circle cx="10" cy="10" r="8" fill="#FFFCF7"/>'); },
    star: function () { return svg('0 0 100 100', '<path d="' + star(50, 52, 5, 46, 20) + '" fill="#E8BD55" stroke="#B9801B" stroke-width="2.5" stroke-linejoin="round"/>'); },
    sparkle: function () { return svg('0 0 40 40', '<path d="M20 2c2 10 8 16 18 18-10 2-16 8-18 18-2-10-8-16-18-18 10-2 16-8 18-18z" fill="#E8BD55"/>'); },
    pine: function () {
      return svg('0 0 140 70', '<g ' + S + ' stroke-width="2.4"><path d="M6 36C40 30 80 30 134 36" fill="none" stroke-width="3"/>'
        + '<g fill="#4C7A50"><path d="M30 34l-8-20 10 8 2-14 6 14 8-10-4 22zM62 32l-6-22 10 10 4-16 4 16 10-10-6 22zM96 33l-6-20 10 8 4-14 4 14 10-8-6 20z"/>'
        + '<path d="M26 38l-6 20 10-8 2 14 6-14 8 10-4-22zM60 38l-6 22 10-10 4 16 4-16 10 10-6-22zM94 38l-6 20 10-8 4 14 4-14 10 8-6-20z"/></g>'
        + '<g fill="#7A2630" stroke="none"><circle cx="46" cy="36" r="5"/><circle cx="80" cy="35" r="5"/><circle cx="114" cy="36" r="5"/></g></g>');
    },
    drift: function () { return svg('0 0 480 60', '<path d="M0 44C40 26 90 24 140 36s100 16 150 2 110-26 190-6V60H0z" fill="#FFFCF7"/><path d="M0 44C40 26 90 24 140 36s100 16 150 2 110-26 190-6" fill="none" stroke="#FFFCF7" stroke-width="6" stroke-linecap="round"/>', '', ' preserveAspectRatio="none"'); },
    gift: function () {
      return svg('0 0 90 90', '<g ' + S + ' stroke-width="2.6"><rect x="12" y="34" width="66" height="50" rx="6" fill="#EBD6CF"/><rect x="6" y="26" width="78" height="16" rx="5" fill="#F6F3EC"/>'
        + '<path d="M45 26v58M6 34h78" stroke="#7A2630" stroke-width="7"/><path d="M45 26c-14-2-22-10-18-18 8-4 16 6 18 18 2-12 10-22 18-18 4 8-4 16-18 18z" fill="#7A2630" stroke-width="2"/></g>');
    },
    sun: function () {
      return svg('0 0 140 140', '<g ' + S + ' stroke-width="3.2"><g class="sx-rays" fill="none">'
        + [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(function (a) { return '<path d="M70 10v16" transform="rotate(' + a + ' 70 70)"/>'; }).join('')
        + '</g><circle cx="70" cy="70" r="30" fill="#F6E3A1"/><circle cx="70" cy="70" r="22" fill="none" stroke-opacity=".35"/></g>');
    },
    palm: function () {
      return svg('0 0 150 150', '<g ' + S + ' stroke-width="2.8" fill="#DCE6C6" fill-opacity=".85">'
        + '<path d="M118 142C98 112 92 70 100 28" fill="none" stroke-width="4"/>'
        + '<path d="M100 28C76 18 44 26 26 52c22-10 46-10 74-2z"/><path d="M100 28c-6-22 4-40 22-50-2 18 0 36 10 50z"/><path d="M100 28c22-12 48-8 64 10-22-2-44 2-64 12z"/>'
        + '<path d="M100 30C72 34 50 54 44 84c18-20 38-30 60-34z"/><path d="M100 30c26 4 46 24 52 54-16-22-34-32-56-36z"/>'
        + '<path d="M62 36c14-2 26 0 38-4M110 40c12 0 24 2 36 10M70 70c10-14 20-22 32-30M110 60c12 8 20 18 24 30" fill="none" stroke-width="1.6" stroke-opacity=".6"/></g>');
    },
    lemon: function (kind) {
      var c = kind === 'orange' ? ['#F2B46B', '#FFE4C0', '#D9892B'] : ['#F3DE7B', '#FFF6C8', '#CDA92E'];
      return svg('0 0 100 100', '<g stroke="' + c[2] + '" stroke-width="2.5"><circle cx="50" cy="50" r="46" fill="' + c[0] + '"/><circle cx="50" cy="50" r="36" fill="' + c[1] + '"/>'
        + '<g fill="' + c[0] + '" stroke-width="2">' + [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) { return '<path d="M50 50L58 20A32 32 0 0 1 72 28z" transform="rotate(' + a + ' 50 50)"/>'; }).join('') + '</g>'
        + '<circle cx="50" cy="50" r="4" fill="' + c[2] + '"/></g>');
    },
    ice: function () {
      return svg('0 0 60 60', '<g stroke="#7FA9B4" stroke-width="2.6" stroke-linejoin="round"><rect x="4" y="4" width="52" height="52" rx="13" fill="#DCEEF2"/>'
        + '<path d="M20 4 4 20M38 4 4 38M56 22 22 56M56 40 40 56" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-opacity=".85"/>'
        + '<rect x="4" y="4" width="52" height="52" rx="13" fill="none"/></g>');
    },
    shades: function () {
      return svg('0 0 120 46', '<g ' + S + ' stroke-width="2.8"><path d="M2 10h116" stroke-width="3"/>'
        + '<path d="M8 10c0 20 8 30 24 30s24-10 24-30z" fill="#2D0303"/><path d="M64 10c0 20 8 30 24 30s24-10 24-30z" fill="#2D0303"/>'
        + '<path d="M56 16c2-3 6-3 8 0" fill="none"/><path d="M16 16c4 6 10 10 18 10M72 16c4 6 10 10 18 10" stroke="#FFFCF7" stroke-opacity=".55" stroke-width="2.5" fill="none"/></g>');
    },
    popsicle: function () {
      return svg('0 0 60 120', '<g ' + S + ' stroke-width="2.6"><rect x="25" y="78" width="10" height="38" rx="5" fill="#D9A441"/>'
        + '<path d="M10 22C10 10 18 4 30 4s20 6 20 18v52a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6z" fill="#E7A7B7"/>'
        + '<path d="M10 46h40v28a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6z" fill="#F3DE7B"/>'
        + '<path d="M22 14c4-4 10-4 16 0" fill="none" stroke="#FFFCF7" stroke-width="2.5"/></g>');
    },
    daisy: function () {
      return svg('0 0 100 100', '<g ' + S + ' stroke-width="2.2"><g fill="#FFFCF7">'
        + [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) { return '<ellipse cx="50" cy="22" rx="9" ry="20" transform="rotate(' + a + ' 50 50)"/>'; }).join('')
        + '</g><circle cx="50" cy="50" r="12" fill="#F3B23F"/></g>');
    },
    pink: function () {
      return svg('0 0 100 100', '<g ' + S + ' stroke-width="2.2"><g fill="#EBB7C4">'
        + [0, 72, 144, 216, 288].map(function (a) { return '<path d="M50 50C36 44 30 26 40 18c6-4 12 0 10 8 0-8 8-12 14-6 8 10-2 26-14 30z" transform="rotate(' + a + ' 50 50)"/>'; }).join('')
        + '</g><circle cx="50" cy="50" r="9" fill="#F2A73B"/></g>');
    },
    tulip: function () {
      return svg('0 0 70 130', '<g ' + S + ' stroke-width="2.6"><path d="M35 126V62" stroke-width="3.2"/><path d="M35 100c-14-2-24-12-26-28 14 2 24 12 26 28z" fill="#9CB87A"/>'
        + '<path d="M12 42c0 18 10 26 23 26s23-8 23-26c0-10-4-20-8-26-4 6-10 10-15 10S24 22 20 16c-4 6-8 16-8 26z" fill="#E7A7B7"/>'
        + '<path d="M35 26c-2 10-2 24 0 36" fill="none" stroke-width="1.8" stroke-opacity=".5"/></g>');
    },
    sprig: function () {
      return svg('0 0 100 60', '<g ' + S + ' stroke-width="2.4"><path d="M4 54C30 40 60 20 96 8" fill="none"/>'
        + '<g fill="#9CB87A"><path d="M26 42c-8-10-6-20 4-26 6 8 6 18-4 26z"/><path d="M46 30c-2-12 4-20 14-22 2 10-2 18-14 22z"/><path d="M66 20c0-10 8-16 18-14-2 10-8 14-18 14z"/><path d="M34 46c8 2 16 0 22-6-6-6-16-6-22 6z"/></g></g>');
    },
    butterfly: function () {
      return svg('0 0 100 84', '<g ' + S + ' stroke-width="2.2">'
        + '<g class="sx-wl"><path d="M50 40C32 10 6 14 8 34c2 10 22 14 42 10z" fill="#E7A7B7"/><path d="M50 44C34 50 16 58 22 70c6 8 22 0 28-20z" fill="#EBD6CF"/><circle cx="26" cy="32" r="4" fill="#FFFCF7" stroke="none"/></g>'
        + '<g class="sx-wr"><path d="M50 40c18-30 44-26 42-6-2 10-22 14-42 10z" fill="#E7A7B7"/><path d="M50 44c16 6 34 14 28 26-6 8-22 0-28-20z" fill="#EBD6CF"/><circle cx="74" cy="32" r="4" fill="#FFFCF7" stroke="none"/></g>'
        + '<ellipse cx="50" cy="46" rx="4" ry="16" fill="currentColor" stroke="none"/><path d="M48 30c-4-8-10-12-16-12M52 30c4-8 10-12 16-12" fill="none"/></g>');
    },
    crown: function () {
      return svg('0 0 140 60', '<g ' + S + ' stroke-width="2"><path d="M6 46C30 24 60 14 70 14s40 10 64 32" fill="none" stroke="#9CB87A" stroke-width="4"/>'
        + '<g fill="#9CB87A"><path d="M30 36c-6-8-2-16 6-18 2 8 0 14-6 18zM106 36c6-8 2-16-6-18-2 8 0 14 6 18z"/></g>'
        + '<g fill="#EBB7C4">' + [[22, 42], [58, 20], [94, 24], [122, 44]].map(function (p) { return [0, 72, 144, 216, 288].map(function (a) { return '<ellipse cx="' + p[0] + '" cy="' + (p[1] - 7) + '" rx="3.2" ry="7" transform="rotate(' + a + ' ' + p[0] + ' ' + p[1] + ')"/>'; }).join(''); }).join('') + '</g>'
        + '<g fill="#FFFCF7">' + [0, 60, 120, 180, 240, 300].map(function (a) { return '<ellipse cx="42" cy="19" rx="3" ry="7" transform="rotate(' + a + ' 42 26)"/>'; }).join('') + [0, 60, 120, 180, 240, 300].map(function (a) { return '<ellipse cx="78" cy="11" rx="3" ry="7" transform="rotate(' + a + ' 78 18)"/>'; }).join('') + '</g>'
        + '<g fill="#F2A73B" stroke="none"><circle cx="22" cy="42" r="3.4"/><circle cx="58" cy="20" r="3.4"/><circle cx="94" cy="24" r="3.4"/><circle cx="122" cy="44" r="3.4"/><circle cx="42" cy="26" r="3"/><circle cx="78" cy="18" r="3"/></g></g>');
    },
    pinkpetal: function () { return svg('0 0 40 30', '<path d="M4 16C8 4 30 2 36 12c-2 12-22 18-32 4z" fill="#EBB7C4" stroke="#C98FA0" stroke-width="1.5"/>'); },
    mcrown: function () {
      return svg('0 0 140 60', '<g ' + S + ' stroke-width="2"><path d="M6 48C30 26 60 16 70 16s40 10 64 32" fill="none" stroke="#4C7A50" stroke-width="4"/>'
        + [[24, 40, 14], [50, 24, 15], [78, 20, 15], [106, 30, 14], [128, 46, 11]].map(function (p) {
          return '<path d="' + star(p[0], p[1], 12, p[2], p[2] * 0.72) + '" fill="#E08A26" stroke="#B9601B"/><path d="' + star(p[0], p[1], 9, p[2] * 0.66, p[2] * 0.45, -0.5) + '" fill="#F6BE55" stroke="none"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (p[2] * 0.3).toFixed(1) + '" fill="#B9601B" stroke="none"/>';
        }).join('') + '</g>');
    },
    vine: function () {
      /* a thin garland of leaves and small flowers, for the top of the page in spring */
      var g = '<path d="M0 10C80 30 180 34 240 20S400 2 480 14" fill="none" stroke="#6E8F5A" stroke-width="2.6"/>';
      var leaf = 'M0 0c9-12 23-9 28 1-9 11-23 8-28-1z';
      for (var i = 0; i < 13; i++) {
        var t = i / 12, x = (12 + t * 456).toFixed(1), y = (10 + Math.sin(t * 3.1) * 11 + t * 3).toFixed(1), flip = i % 2 ? ' scale(1,-1)' : '';
        g += '<g transform="translate(' + x + ' ' + y + ')' + flip + '"><path d="' + leaf + '" fill="#8FAE72" stroke="#6E8F5A" stroke-width="1.4"/></g>';
        if (i % 3 === 1) {
          g += '<g transform="translate(' + x + ' ' + y + ')' + flip + '"><g transform="translate(8 -14)">'
            + [0, 72, 144, 216, 288].map(function (a) { return '<ellipse cx="0" cy="-6" rx="3.4" ry="6.4" transform="rotate(' + a + ')" fill="#EBB7C4" stroke="#C98FA0" stroke-width="1.1"/>'; }).join('')
            + '<circle r="3" fill="#F3B23F"/></g></g>';
        }
      }
      return svg('0 0 480 50', g, '', ' preserveAspectRatio="none"');
    },
    bunting: function () {
      /* beach bunting for summer */
      var cols = ['#E9962E', '#F3DE7B', '#7A2630', '#EBD6CF', '#E9962E', '#F3DE7B', '#7A2630', '#EBD6CF', '#E9962E'];
      var g = '<path d="M0 6C120 30 360 30 480 6" fill="none" stroke="currentColor" stroke-width="2.5"/>';
      cols.forEach(function (c, i) {
        var t = (i + 0.5) / cols.length, x = t * 480, y = 6 + 4 * t * (1 - t) * 24;
        g += '<g class="sx-flag" style="transform-origin:' + x.toFixed(0) + 'px ' + y.toFixed(0) + 'px;--i:' + i + '"><path d="M' + (x - 17) + ' ' + y + 'h34l-17 30z" fill="' + c + '" stroke="#8D4C12" stroke-opacity=".3" stroke-width="1.5"/></g>';
      });
      return svg('0 0 480 46', g, '', ' preserveAspectRatio="none"');
    },
    waterline: function () {
      /* a strip of sea with a couple of ripples, for the bottom of the summer hero */
      return svg('0 0 480 54', '<path d="M0 26C44 14 92 14 134 26s90 12 134 0 90-12 134 0 60 10 78 4v24H0z" fill="#CFE4E6" fill-opacity=".8"/>'
        + '<path d="M0 26C44 14 92 14 134 26s90 12 134 0 90-12 134 0 60 10 78 4" fill="none" stroke="#9FC6CB" stroke-width="3" stroke-linecap="round"/>'
        + '<g fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-opacity=".9"><path d="M54 40c6-4 12-4 18 0"/><path d="M196 44c6-4 12-4 18 0"/><path d="M330 38c6-4 12-4 18 0"/><path d="M412 46c6-4 12-4 18 0"/></g>', '', ' preserveAspectRatio="none"');
    },
    shell: function () {
      return svg('0 0 60 54', '<g stroke="#C98FA0" stroke-width="2.2" stroke-linejoin="round"><path d="M30 4C14 4 2 18 2 32c0 10 8 18 28 18s28-8 28-18C58 18 46 4 30 4z" fill="#F3DCE2"/>'
        + '<path d="M30 4v46M30 4C22 14 16 26 14 50M30 4c8 10 14 22 16 46M30 4C24 10 10 20 4 28M30 4c6 6 20 16 26 24" fill="none" stroke-width="1.8" stroke-opacity=".75"/></g>');
    },
    petalpath: function () {
      /* a path of cempasúchil petals, for the bottom of the Día de Muertos hero */
      var rnd = seeded(23), g = '';
      for (var i = 0; i < 30; i++) {
        var x = rnd() * 480, y = 10 + rnd() * 40, r = rnd() * 360, s = 0.5 + rnd() * 0.6;
        g += '<g transform="translate(' + x.toFixed(0) + ' ' + y.toFixed(0) + ') rotate(' + r.toFixed(0) + ') scale(' + s.toFixed(2) + ')"><path d="M-14 0C-9-7 9-7 14 0 9 7-9 7-14 0z" fill="' + (i % 3 ? '#F2A73B' : '#E08A26') + '" stroke="#C96D16" stroke-width="1.4"/></g>';
      }
      return svg('0 0 480 60', g, '', ' preserveAspectRatio="none"');
    },
    sprig2: function (c) {
      /* a short leafy flourish used at the ends of the between-section ornaments */
      c = c || '#9CB87A';
      return svg('0 0 70 30', '<g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 26C20 20 44 12 66 6" fill="none"/>'
        + '<g fill="' + c + '"><path d="M20 20c-5-7-3-13 3-16 4 5 3 12-3 16z"/><path d="M38 14c-2-8 2-13 9-14 1 7-2 12-9 14z"/><path d="M54 9c0-7 5-10 11-9-1 6-4 9-11 9z"/></g></g>');
    },
    picado: function () {
      /* a string of papel picado: seven flags in the brand's colours, each with its own cut-out pattern */
      var cols = ['#7A2630', '#E9962E', '#442B31', '#EBD6CF', '#7A2630', '#E9962E', '#442B31'];
      var flags = cols.map(function (c, i) {
        var x = 12 + i * 66, cut;
        if (i % 3 === 0) cut = '<circle cx="' + (x + 27) + '" cy="20" r="7"/><circle cx="' + (x + 13) + '" cy="33" r="4"/><circle cx="' + (x + 41) + '" cy="33" r="4"/><rect x="' + (x + 21) + '" y="30" width="12" height="7" rx="2"/>';
        else if (i % 3 === 1) cut = '<path d="' + star(x + 27, 25, 6, 13, 6) + '"/><circle cx="' + (x + 9) + '" cy="10" r="3"/><circle cx="' + (x + 45) + '" cy="10" r="3"/>';
        else cut = '<path d="M' + (x + 27) + ' 14c-8-10-20 0-8 10l8 8 8-8c12-10 0-20-8-10z"/><circle cx="' + (x + 10) + '" cy="36" r="3.5"/><circle cx="' + (x + 44) + '" cy="36" r="3.5"/>';
        var zig = '';
        for (var k = 0; k < 9; k++) zig += 'l-3 6-3-6';
        return '<g class="sx-flag" style="transform-origin:' + (x + 27) + 'px 0px;--i:' + i + '">'
          + '<path fill="' + c + '" fill-opacity=".92" d="M' + x + ' 4h54v38' + zig + 'z"/>'
          + '<g fill="var(--hole,#F6F3EC)">' + cut + '</g></g>';
      }).join('');
      return svg('0 0 480 70', '<path d="M0 6C120 2 360 2 480 6" fill="none" stroke="currentColor" stroke-width="2.5"/>' + flags, '', ' preserveAspectRatio="none"');
    }
  };

  /* ───────────────────────── seasons ───────────────────────── */
  var SEASONS = {
    normal: { name: 'Normal', desc: 'El menú tal cual, sin adornos.', icon: svg('0 0 100 100', '<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M22 36h44a14 14 0 0 1 0 28H62"/><path d="M22 36v18c0 12 8 20 20 20s20-8 20-20V36"/><path d="M34 22c-4-6 4-8 0-14M46 22c-4-6 4-8 0-14"/></g>'), ribbon: null },
    primavera: { name: 'Primavera', desc: 'Flores, mariposas y pétalos.', icon: ICON.pink(), ribbon: ['Hola primavera', 'Matcha & flores', 'Días bonitos'] },
    verano: { name: 'Verano', desc: 'Sol, limones y hielo.', icon: ICON.sun(), ribbon: ['Hola verano', 'Iced coffee & frappés', 'Summer vibes'] },
    muertos: { name: 'Halloween · Día de Muertos', desc: 'Papel picado, cempasúchil y calaveras.', icon: ICON.skull(), ribbon: ['Feliz Día de Muertos', 'Pan de muerto', 'Noche de calaveras'] },
    navidad: { name: 'Navidad', desc: 'Luces, nieve y muérdago.', icon: ICON.holly(), ribbon: ['Feliz Navidad', 'Bebidas de temporada', 'Ho ho ho'] }
  };

  /* stickers: what goes on which picture, in % of the picture's box */
  function stickersFor(season) {
    var L = [];
    function on(sel, icon, x, y, w, r, extra) { L.push({ sel: sel, icon: icon, x: x, y: y, w: w, r: r || 0, extra: extra }); }
    if (season === 'muertos') {
      on('.l-togo', 'marigold', 58, -4, 26, 12);
      on('.l-pet', 'marigold', 4, 12, 18, -10);
      on('.l-croissant', 'skull', 68, 26, 22, 8);
      on('.art-calientes', 'mcrown', 36, -9, 40, -4, 'crown');
      on('.art-pasteles', 'mcrown', 40, -12, 44, 6, 'crown');
      on('.season-dogw', 'mcrown', 30, -10, 50, -2, 'crown');
      on('.petb-dogw', 'mcrown', 22, -8, 56, 0, 'crown');
      on('.foot-art', 'mcrown', 10, -3, 20, -6, 'crown');
      on('.perso-cup', 'marigold', 6, 12, 16, -8);
      on('.art-frappes', 'skull', -70, 30, 70, -8);
    } else if (season === 'navidad') {
      on('.l-togo', 'snowcap', 14, -3, 72, 0);
      on('.l-pet', 'holly', 66, 2, 26, 12);
      on('.l-croissant', 'holly', 70, 36, 24, -8);
      on('.art-calientes', 'hat', 40, -16, 28, 10);
      on('.art-pasteles', 'hat', 46, -20, 34, 12);
      on('.season-dogw', 'hat', 34, -18, 44, 10);
      on('.petb-dogw', 'hat', 30, -12, 42, 14);
      on('.foot-art', 'hat', 12, -8, 16, 8);
      on('.perso-cup', 'holly', 62, 4, 24, 10);
      on('.art-frias', 'snowcap', 6, -2, 88, 0);
      on('.art-tes', 'holly', -4, 56, 30, -10);
    } else if (season === 'verano') {
      on('.l-togo', 'lemon', 60, -2, 24, 0);
      on('.l-pet', 'lemon', 6, 14, 16, 0, 'orange');
      on('.art-calientes', 'shades', 42, 16, 26, 2);
      on('.art-pasteles', 'shades', 50, 20, 28, 8);
      on('.season-dogw', 'shades', 36, 28, 36, 2);
      on('.petb-dogw', 'shades', 29, 7, 42, 0);
      on('.foot-art', 'shades', 12, 22, 14, 4);
      on('.art-frappes', 'lemon', 58, 6, 44, 0);
      on('.art-frias', 'lemon', 60, 2, 38, 0, 'orange');
      on('.art-frappes', 'popsicle', -60, 34, 40, -12);
      on('.perso-cup', 'lemon', 6, 16, 14, 0);
    } else if (season === 'primavera') {
      on('.l-togo', 'daisy', 60, -3, 22, 0);
      on('.l-pet', 'pink', 4, 12, 18, 0);
      on('.l-croissant', 'butterfly', 52, -10, 22, -8, 'fly');
      on('.art-calientes', 'crown', 34, -8, 44, -4, 'crown');
      on('.art-pasteles', 'crown', 40, -10, 46, 6, 'crown');
      on('.season-dogw', 'crown', 28, -8, 52, -2, 'crown');
      on('.petb-dogw', 'crown', 22, -6, 56, 0, 'crown');
      on('.foot-art', 'crown', 10, -2, 20, -6, 'crown');
      on('.art-matcha', 'butterfly', 20, 0, 22, 10, 'fly');
      on('.art-tes', 'pink', -6, 60, 26, 0);
      on('.perso-cup', 'daisy', 6, 14, 15, 0);
    }
    return L;
  }

  /* falling / rising bits over the whole page */
  /* a few drifting bits over the page: enough to feel like the season, few enough to read through */
  function particles(season, n) {
    var rnd = seeded(season.length * 7), kinds, dir = 'fall';
    if (season === 'muertos') kinds = ['petal', 'petal', 'marigold'];
    else if (season === 'navidad') kinds = ['dot', 'flake', 'dot'];
    else if (season === 'primavera') kinds = ['pinkpetal', 'pinkpetal', 'daisy'];
    else if (season === 'verano') { kinds = ['dot', 'ice', 'dot']; dir = 'rise'; }
    else return '';
    var out = '';
    for (var i = 0; i < n; i++) {
      var k = kinds[i % kinds.length], ic = k === 'lemon-orange' ? ICON.lemon('orange') : ICON[k]();
      var size = (k === 'dot' ? 0.38 : k === 'flake' ? 0.8 : k === 'marigold' || k === 'daisy' ? 1.05 : k === 'ice' ? 0.85 : 0.9) * (0.7 + rnd() * 0.6);
      out += '<i style="--x:' + (rnd() * 96).toFixed(1) + '%;--d:' + (12 + rnd() * 10).toFixed(1) + 's;--dl:' + (-rnd() * 22).toFixed(1) + 's;--s:' + size.toFixed(2) + ';--sw:' + ((rnd() - 0.5) * 90).toFixed(0) + 'px;--sd:' + (2.6 + rnd() * 2.4).toFixed(1) + 's;--rot:' + ((rnd() > 0.5 ? 1 : -1) * (180 + rnd() * 360)).toFixed(0) + 'deg;--o:' + (0.42 + rnd() * 0.16).toFixed(2) + '"><b>' + ic + '</b></i>';
    }
    return '<div class="sx sx-' + dir + '" aria-hidden="true">' + out + '</div>';
  }

  /* the little ornament that sits in the gap between two sections */
  function flourish(season, i) {
    var mid = {
      muertos: [ICON.skull, ICON.marigold, ICON.candle, ICON.marigold],
      navidad: [ICON.holly, ICON.flake, ICON.gift, ICON.flake],
      verano: [ICON.shell, function () { return ICON.lemon(); }, ICON.ice, function () { return ICON.lemon('orange'); }],
      primavera: [ICON.daisy, ICON.butterfly, ICON.tulip, ICON.pink]
    }[season];
    if (!mid) return '';
    var leaf = { muertos: '#E08A26', navidad: '#4C7A50', verano: '#9FC6CB', primavera: '#9CB87A' }[season];
    return '<div class="sx sx-flour" aria-hidden="true"><span class="sx-flour-in"><i class="sx-sprig">' + ICON.sprig2(leaf) + '</i>'
      + '<i class="sx-flour-m">' + mid[i % mid.length]() + '</i>'
      + '<i class="sx-sprig sx-sprig--r">' + ICON.sprig2(leaf) + '</i></span></div>';
  }

  var placed = [];
  function removeAll() {
    $$('.sx').forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    placed = [];
  }
  function add(host, html, where) {
    if (!host) return null;
    var t = d.createElement('div');
    t.innerHTML = html;
    var node = t.firstChild;
    if (!node) return null;
    if (where === 'first') host.insertBefore(node, host.firstChild); else host.appendChild(node);
    return node;
  }
  function place(menu, s) {
    var host = $(s.sel, menu);
    if (!host) return;
    var img = $('img', host), target = host;
    /* hero slots: ride along with the entrance pop; floating pictures: float in step with them */
    var en = $('.en', host);
    if (en) target = en;
    var style = 'left:' + s.x + '%;top:' + s.y + '%;width:' + s.w + '%;--r:' + s.r + 'deg';
    var cls = 'sx stk stk-' + s.icon + (s.extra ? ' stk-' + s.extra : '');
    if (img && img.classList.contains('fl')) {
      cls += ' fl';
      ['--fd', '--fdl', '--rw'].forEach(function (v) { var val = img.style.getPropertyValue(v); if (val) style += ';' + v + ':' + val; });
      var r0 = img.style.getPropertyValue('--r');
      if (r0) style += ';--r:calc(' + r0 + ' + ' + s.r + 'deg)';
    }
    if (img && img.classList.contains('rv-up')) cls += ' rv-up';
    if (img && img.classList.contains('photo') && !/foot/.test(s.sel)) return;   /* an ordinary photo in a cut-out slot: no sticker (it would float off the plate) */
    if (s.sel === '.petb-dogw' && img && img.getAttribute('src') !== 'img/dog.webp') return;   /* the dog's accessories are drawn for the brand's dog */
    var ic = s.extra === 'orange' ? ICON.lemon('orange') : ICON[s.icon]();
    add(target, '<span class="' + cls + '" style="' + style + '">' + ic + '</span>');
  }

  /* the ornaments that fill the quiet parts of the page: the same handful of drawings, placed where
     each season needs them. Everything carries the class "sx", so changing season wipes it all. */
  function dressHero(name, hero, stage, brand) {
    if (name === 'muertos') {
      add(hero, '<div class="sx sx-top sx-picado">' + ICON.picado() + '</div>', 'first');
      add(stage, '<div class="sx sx-moon">' + ICON.moon() + '</div>', 'first');
      add(stage, '<div class="sx sx-bat sx-bat1">' + ICON.bat() + '</div>', 'first');
      add(stage, '<div class="sx sx-bat sx-bat2">' + ICON.bat() + '</div>', 'first');
      add(stage, '<div class="sx sx-ground sx-petalpath">' + ICON.petalpath() + '</div>');
      add(stage, '<div class="sx sx-herocandle sx-hc1">' + ICON.candle() + '</div>');
      add(stage, '<div class="sx sx-herocandle sx-hc2">' + ICON.candle() + '</div>');
      add(stage, '<div class="sx sx-heroflower">' + ICON.marigold() + '</div>');
    } else if (name === 'navidad') {
      var cols = ['#E8BD55', '#7A2630', '#EBD6CF', '#FFFCF7', '#E8BD55', '#7A2630', '#EBD6CF', '#FFFCF7', '#E8BD55'];
      var bulbs = cols.map(function (c, i) {
        var t = 0.08 + i * 0.105, x = 480 * t, y = 6 + 4 * 2 * t * (1 - t) * 14;   /* on a sagging wire */
        return '<span class="sx-bulb" style="left:' + (x / 4.8).toFixed(1) + '%;top:' + y.toFixed(1) + 'px;--i:' + i + '">' + ICON.bulb(c) + '</span>';
      }).join('');
      add(hero, '<div class="sx sx-top sx-garland">' + svg('0 0 480 40', '<path d="M0 6C120 36 360 36 480 6" fill="none" stroke="currentColor" stroke-width="2.5"/>', '', ' preserveAspectRatio="none"') + bulbs + '</div>', 'first');
      add(brand, '<div class="sx sx-star">' + ICON.star() + '</div>');
      add(brand, '<div class="sx sx-sparkle sx-sparkle1">' + ICON.sparkle() + '</div>');
      add(brand, '<div class="sx sx-sparkle sx-sparkle2">' + ICON.sparkle() + '</div>');
      add(stage, '<div class="sx sx-ground sx-snow">' + ICON.drift() + '</div>');
      add(stage, '<div class="sx sx-heropine">' + ICON.pine() + '</div>');
      add(stage, '<div class="sx sx-herogift">' + ICON.gift() + '</div>');
    } else if (name === 'verano') {
      add(hero, '<div class="sx sx-top sx-bunting">' + ICON.bunting() + '</div>', 'first');
      add(stage, '<div class="sx sx-sun">' + ICON.sun() + '</div>', 'first');
      add(stage, '<div class="sx sx-palm">' + ICON.palm() + '</div>', 'first');
      add(stage, '<div class="sx sx-ground sx-water">' + ICON.waterline() + '</div>');
      add(stage, '<div class="sx sx-heroshell">' + ICON.shell() + '</div>');
      add(stage, '<div class="sx sx-heropop">' + ICON.popsicle() + '</div>');
    } else if (name === 'primavera') {
      add(hero, '<div class="sx sx-top sx-vine">' + ICON.vine() + '</div>', 'first');
      var rnd = seeded(5), bed = '';
      for (var i = 0; i < 11; i++) {
        var k = ['tulip', 'daisy', 'pink', 'sprig', 'tulip', 'daisy'][i % 6];
        bed += '<span class="sx-bloom sx-bloom--' + k + '" style="left:' + (2 + i * 9 + rnd() * 3).toFixed(1) + '%;--i:' + i + ';--h:' + (0.7 + rnd() * 0.5).toFixed(2) + '">' + ICON[k]() + '</span>';
      }
      add(stage, '<div class="sx sx-ground sx-bed">' + bed + '</div>');
      add(hero, '<div class="sx sx-fly sx-fly1">' + ICON.butterfly() + '</div>');
      add(hero, '<div class="sx sx-fly sx-fly2">' + ICON.butterfly() + '</div>');
    }
  }

  function dressBody(name, menu) {
    /* the pink note, the featured heading and the dark band each get a corner ornament */
    if (name === 'muertos') {
      add($('.season', menu), '<div class="sx sx-candles">' + ICON.candle() + ICON.candle() + '</div>');
      add($('.perso', menu), '<div class="sx sx-picado sx-picado--band">' + ICON.picado() + '</div>', 'first');
      add($('.cons-h', menu), '<div class="sx sx-corner sx-skull">' + ICON.skull() + '</div>');
      add($('.foot', menu), '<div class="sx sx-footrow">' + ICON.candle() + ICON.marigold() + ICON.skull() + ICON.marigold() + ICON.candle() + '</div>', 'first');
      add($('.petb', menu), '<div class="sx sx-petrow">' + ICON.marigold() + ICON.marigold() + ICON.skull() + ICON.marigold() + '</div>');
      add($('.visit h2', menu), '<span class="sx sx-inline sx-mari">' + ICON.marigold() + '</span>');
    } else if (name === 'navidad') {
      add($('.season', menu), '<div class="sx sx-corner sx-holly">' + ICON.holly() + '</div>');
      add($('.cons-h', menu), '<div class="sx sx-corner sx-gift">' + ICON.gift() + '</div>');
      add($('.perso', menu), '<div class="sx sx-drift">' + ICON.drift() + '</div>');
      add($('.perso', menu), '<div class="sx sx-corner sx-holly sx-holly--band">' + ICON.holly() + '</div>');
      add($('.visit h2', menu), '<span class="sx sx-inline sx-holly">' + ICON.holly() + '</span>');
      add($('.foot', menu), '<div class="sx sx-footrow sx-pine">' + ICON.pine() + '</div>', 'first');
      add($('.petb', menu), '<div class="sx sx-ground sx-petsnow">' + ICON.drift() + '</div>');
      add($('.petb', menu), '<div class="sx sx-petrow">' + ICON.pine() + '</div>');
    } else if (name === 'verano') {
      add($('.season', menu), '<div class="sx sx-corner sx-lemons">' + ICON.lemon() + ICON.lemon('orange') + '</div>');
      add($('.cons-h', menu), '<div class="sx sx-corner sx-minisun">' + ICON.sun() + '</div>');
      add($('.perso', menu), '<div class="sx sx-corner sx-palm--band">' + ICON.palm() + '</div>');
      add($('.perso', menu), '<div class="sx sx-ground sx-water sx-water--band">' + ICON.waterline() + '</div>');
      add($('.foot', menu), '<div class="sx sx-footrow">' + ICON.lemon('orange') + ICON.ice() + ICON.popsicle() + ICON.shell() + ICON.lemon() + '</div>', 'first');
      add($('.petb', menu), '<div class="sx sx-petrow">' + ICON.shell() + ICON.lemon() + ICON.shell() + '</div>');
      add($('.visit h2', menu), '<span class="sx sx-inline sx-sunin">' + ICON.sun() + '</span>');
    } else if (name === 'primavera') {
      add($('.season', menu), '<div class="sx sx-corner sx-bouquet">' + ICON.tulip() + ICON.daisy() + ICON.sprig() + '</div>');
      add($('.cons-h', menu), '<div class="sx sx-corner sx-pinks">' + ICON.pink() + ICON.daisy() + '</div>');
      add($('.perso', menu), '<div class="sx sx-corner sx-bouquet--band">' + ICON.daisy() + ICON.tulip() + '</div>');
      add($('.perso', menu), '<div class="sx sx-ground sx-vinefoot">' + ICON.vine() + '</div>');
      add($('.petb', menu), '<div class="sx sx-petbed">' + ICON.tulip() + ICON.daisy() + ICON.pink() + ICON.sprig() + '</div>');
      add($('.foot', menu), '<div class="sx sx-footrow">' + ICON.tulip() + ICON.daisy() + ICON.butterfly() + ICON.pink() + ICON.tulip() + '</div>', 'first');
      add($('.visit h2', menu), '<span class="sx sx-inline sx-daisyin">' + ICON.daisy() + '</span>');
    }
    /* the bakery clip gets a pair of small drawings in the margins beside the arch */
    var vit = $('.vitrina', menu);
    if (vit) {
      var side = { muertos: [ICON.marigold(), ICON.candle()], navidad: [ICON.holly(), ICON.flake()], verano: [ICON.lemon(), ICON.shell()], primavera: [ICON.tulip(), ICON.daisy()] }[name];
      if (side) {
        add(vit, '<span class="sx sx-vit sx-vit--l">' + side[0] + '</span>');
        add(vit, '<span class="sx sx-vit sx-vit--r">' + side[1] + '</span>');
      }
    }
    /* the cookie card: one ornament hanging in each free corner */
    var ck = $('.cookie', menu);
    if (ck) {
      var cor = { muertos: [ICON.skull(), ICON.marigold()], navidad: [ICON.gift(), ICON.holly()], verano: [ICON.popsicle(), ICON.lemon('orange')], primavera: [ICON.butterfly(), ICON.pink()] }[name];
      if (cor) {
        add(ck, '<span class="sx sx-ck sx-ck--l">' + cor[0] + '</span>');
        add(ck, '<span class="sx sx-ck sx-ck--r">' + cor[1] + '</span>');
      }
    }
    /* a small ornament in the roomy gaps between sections (it takes no height of its own, so nothing moves) */
    var cats = $$('.cat', menu), k = 0, spots = [];
    cats.forEach(function (c, i) {
      var next = c.nextElementSibling;
      if (!next) return;
      var last = c.querySelector('.vitrina') || c.querySelector('.extra') || c.querySelector('.items > :last-child') || c;
      var head = next.querySelector('h2') || next;
      var gap = head.getBoundingClientRect().top - last.getBoundingClientRect().bottom;
      if (gap >= 90) spots.push(c);
    });
    spots.forEach(function (c) {
      var h = flourish(name, k++);
      if (!h) return;
      var t = d.createElement('div');
      t.innerHTML = h;
      var node = t.firstChild;
      c.parentNode.insertBefore(node, c.nextSibling);
      /* sit in the middle of the free band, not on the section boundary, so no word is ever covered */
      var last = c.querySelector('.vitrina') || c.querySelector('.extra') || c.querySelector('.items > :last-child');
      var head = (node.nextElementSibling && node.nextElementSibling.querySelector('h2')) || node.nextElementSibling;
      if (last && head) {
        var mid = (last.getBoundingClientRect().bottom + head.getBoundingClientRect().top) / 2;
        node.style.setProperty('--y', (mid - node.getBoundingClientRect().top).toFixed(1) + 'px');
      }
    });
    var gal = $('.gallery', menu);
    if (gal) {
      var gh = flourish(name, k++);
      if (gh) {
        var gt = d.createElement('div');
        gt.innerHTML = gh;
        gt.firstChild.className += ' sx-flour--gal';
        gal.parentNode.insertBefore(gt.firstChild, gal.nextSibling);
      }
    }
  }

  function apply(name, ctx) {
    name = SEASONS[name] ? name : 'normal';
    removeAll();
    d.documentElement.setAttribute('data-season', name);
    if (name === 'normal') return;
    var menu = (ctx && ctx.menu) || $('#menu'), reduce = !!(ctx && ctx.reduce);
    dressHero(name, $('.hero', menu), $('.stage', menu), $('.brand', menu));
    dressBody(name, menu);
    /* stickers on the pictures and on the dog */
    stickersFor(name).forEach(function (s) { place(menu, s); });
    /* a few drifting bits, unless the visitor asked for less motion */
    if (!reduce) add(d.body, particles(name, name === 'navidad' ? 12 : 9));
  }

  W.BoscoSeasons = {
    list: function () { return Object.keys(SEASONS).map(function (k) { return { id: k, name: SEASONS[k].name, desc: SEASONS[k].desc, icon: SEASONS[k].icon }; }); },
    info: function (name) { var s = SEASONS[name]; return s ? { ribbon: s.ribbon, name: s.name } : null; },
    apply: apply,
    icons: ICON
  };
})();
