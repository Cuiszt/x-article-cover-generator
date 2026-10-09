/* Cover style renderers. Each renders onto a canvas 2D context of size W x H. */
(function (global) {
  'use strict';
  var T = global.TextKit;

  var SANS = '"Noto Sans CJK SC","Source Han Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif';
  var SERIF = '"Noto Serif CJK SC","Source Han Serif SC","Songti SC","STSong","SimSun","Noto Serif SC",serif';
  var MONO = '"JetBrains Mono","Geist Mono","SFMono-Regular",Menlo,Consolas,"DejaVu Sans Mono","Noto Sans Mono CJK SC",monospace';

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function alpha(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function textW(ctx, font, s) { ctx.font = font; return ctx.measureText(s).width; }

  /** Pill label. Returns {w,h}. */
  function pill(ctx, x, y, text, o) {
    var font = (o.weight || 700) + ' ' + o.size + 'px ' + (o.family || SANS);
    var padX = o.size * 0.8, h = o.size * 1.9;
    var w = textW(ctx, font, text) + padX * 2;
    if (o.align === 'center') x -= w / 2;
    ctx.save();
    rr(ctx, x, y, w, h, o.radius != null ? o.radius : h / 2);
    if (o.bg) { ctx.fillStyle = o.bg; ctx.fill(); }
    if (o.border) { ctx.lineWidth = o.borderWidth || 2; ctx.strokeStyle = o.border; ctx.stroke(); }
    ctx.fillStyle = o.color; ctx.font = font; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padX, y + h / 2 + o.size * 0.04);
    ctx.restore();
    return { w: w, h: h, x: x };
  }

  /** Avatar circle with first letter of handle + handle text. Returns width. */
  function byline(ctx, x, yMid, handle, o) {
    var r = o.size * 1.05, name = handle || '';
    var letter = (name.replace(/^@/, '')[0] || '?').toUpperCase();
    ctx.save();
    var ax = o.align === 'right' ? null : x;
    var font = (o.weight || 600) + ' ' + o.size + 'px ' + (o.family || SANS);
    var tw = textW(ctx, font, name);
    var total = (o.avatar === false ? 0 : r * 2 + o.size * 0.6) + tw;
    if (o.align === 'right') ax = x - total;
    if (o.align === 'center') ax = x - total / 2;
    var tx = ax;
    if (o.avatar !== false) {
      ctx.beginPath(); ctx.arc(ax + r, yMid, r, 0, Math.PI * 2);
      ctx.fillStyle = o.avatarBg || o.color; ctx.fill();
      ctx.fillStyle = o.avatarFg || '#fff';
      ctx.font = '700 ' + (r * 1.05) + 'px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(letter, ax + r, yMid + r * 0.05);
      tx = ax + r * 2 + o.size * 0.6;
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = font; ctx.fillStyle = o.color;
    ctx.fillText(name, tx, yMid + o.size * 0.04);
    ctx.restore();
    return total;
  }

  /**
   * Fit title + subtitle in a region. Title gets what is left after subtitle.
   * Returns {title, sub, ty, sy, bottom}.
   */
  function stack(ctx, d, region, t, s, valign) {
    var sub = null, gap = 0;
    if (d.subtitle) {
      sub = T.fit(ctx, d.subtitle, { w: s.w || region.w, h: s.maxH }, {
        family: s.family, weight: s.weight || 400, maxSize: s.maxSize, minSize: s.minSize, lineHeight: s.lineHeight || 1.4, maxLines: s.maxLines || 2
      });
      gap = s.gap;
    }
    var avail = region.h - (sub ? sub.height + gap : 0);
    var title = T.fit(ctx, d.title || ' ', { w: t.w || region.w, h: avail }, {
      family: t.family, weight: t.weight || 700, maxSize: t.maxSize, minSize: t.minSize, lineHeight: t.lineHeight || 1.18, maxLines: t.maxLines || 3
    });
    var total = title.height + (sub ? gap + sub.height : 0);
    var y0 = region.y;
    if (valign === 'middle') y0 = region.y + (region.h - total) / 2;
    if (valign === 'bottom') y0 = region.y + region.h - total;
    return { title: title, sub: sub, ty: y0, sy: y0 + title.height + gap, bottom: y0 + total };
  }

  /** Area-based scale: 1.0 at 1500x600, ~0.95 at 1200x675, ~1.14 at 1080x1080. */
  function scaleOf(W, H) { return Math.sqrt(W * H / 900000); }

  function ymd() {
    var d = new Date();
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }

  // Deterministic pseudo-random for decorations.
  function rng(seed) { var x = seed || 7; return function () { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }

  /* ---------------------------------------------------------------- 1. Gradient */
  function gradient(ctx, W, H, d, p) {
    var s = scaleOf(W, H), pad = Math.max(W, H) * 0.05;
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, p.c[0]); g.addColorStop(0.55, p.c[1]); g.addColorStop(1, p.c[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    function blob(x, y, r, c, a) {
      var rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, alpha(c, a)); rg.addColorStop(1, alpha(c, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    blob(W * 0.88, H * 0.1, Math.max(W, H) * 0.45, p.c[3], 0.65);
    blob(W * 0.05, H * 1.0, Math.max(W, H) * 0.4, p.c[2], 0.45);
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    var step = 48 * s;
    for (var x = 0; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
    for (var y = 0; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
    // rings
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    for (var i = 1; i <= 4; i++) { ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.arc(W * 0.93, H * 0.82, i * 90 * s, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    // sparkle
    star(ctx, W - pad - 20 * s, pad + 26 * s, 26 * s, 'rgba(255,255,255,0.9)');
    star(ctx, W - pad - 70 * s, pad + 70 * s, 12 * s, 'rgba(255,255,255,0.6)');

    var tagSize = 22 * s;
    var tag = d.tag ? pill(ctx, pad, pad, d.tag, { size: tagSize, bg: 'rgba(255,255,255,0.16)', border: 'rgba(255,255,255,0.35)', borderWidth: 1.5 * s, color: '#fff' }) : { h: 0 };
    var footerH = 52 * s;
    var top = pad + tag.h + 28 * s, bottom = H - pad - footerH - 20 * s;
    var tw = W / H > 1.9 ? W * 0.8 - pad : W - pad * 2;
    var L = stack(ctx, d, { x: pad, y: top, w: tw, h: bottom - top },
      { family: SANS, maxSize: 120 * s, minSize: 28 * s, maxLines: W / H > 1.9 ? 2 : (W / H < 1.2 ? 4 : 3), lineHeight: 1.16 },
      { family: SANS, maxSize: 34 * s, minSize: 18 * s, maxH: 100 * s, gap: 22 * s, maxLines: 2 }, 'middle');
    T.draw(ctx, L.title, pad, L.ty, { color: '#fff', hlColor: p.hl, shadow: { color: 'rgba(0,0,0,0.25)', blur: 24 * s, y: 6 * s } });
    if (L.sub) T.draw(ctx, L.sub, pad, L.sy, { color: 'rgba(255,255,255,0.82)' });
    byline(ctx, pad, H - pad - footerH / 2 + 6 * s, d.handle, { size: 24 * s, color: '#fff', avatarBg: 'rgba(255,255,255,0.95)', avatarFg: p.c[1] });
  }

  function star(ctx, x, y, r, color) {
    ctx.save(); ctx.fillStyle = color; ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4, rad = i % 2 === 0 ? r : r * 0.22;
      ctx.lineTo(x + Math.cos(a - Math.PI / 2) * rad, y + Math.sin(a - Math.PI / 2) * rad);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  /* ---------------------------------------------------------------- 2. Editorial */
  function editorial(ctx, W, H, d, p) {
    var s = scaleOf(W, H), padX = W * 0.06, padY = H * 0.09;
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
    // paper grain
    var r = rng(42); ctx.fillStyle = alpha(p.ink, 0.035);
    for (var i = 0; i < (W * H) / 900; i++) ctx.fillRect(r() * W, r() * H, 1.2, 1.2);

    var small = 18 * s;
    ctx.font = '700 ' + small + 'px ' + SANS; ctx.textBaseline = 'alphabetic';
    var hy = padY + small;
    ctx.fillStyle = p.accent; ctx.fillRect(padX, hy - small * 0.78, small * 0.8, small * 0.8);
    ctx.fillStyle = p.ink;
    var left = 'AI NOTES' + (d.tag ? '  ·  ' + d.tag : '');
    spaced(ctx, left, padX + small * 1.4, hy, small * 0.12);
    ctx.textAlign = 'right'; ctx.font = '400 ' + small + 'px ' + SANS; ctx.fillStyle = alpha(p.ink, 0.6);
    ctx.fillText(ymd(), W - padX, hy); ctx.textAlign = 'left';
    var ruleY = hy + 18 * s;
    ctx.fillStyle = p.ink; ctx.fillRect(padX, ruleY, W - padX * 2, 3 * s);
    ctx.fillRect(padX, ruleY + 8 * s, W - padX * 2, 1 * s);

    var footY = H - padY;
    ctx.fillStyle = alpha(p.ink, 0.25); ctx.fillRect(padX, footY - 40 * s, W - padX * 2, 1 * s);
    ctx.font = '700 ' + (20 * s) + 'px ' + SANS; ctx.fillStyle = p.ink; ctx.textBaseline = 'alphabetic';
    ctx.fillText(d.handle || '', padX, footY);
    ctx.textAlign = 'right'; ctx.font = 'italic 400 ' + (20 * s) + 'px ' + SERIF; ctx.fillStyle = alpha(p.ink, 0.6);
    ctx.fillText('AI Tools · Tech Notes', W - padX, footY); ctx.textAlign = 'left';

    var top = ruleY + 40 * s, bottom = footY - 70 * s;
    var tw = W / H > 1.9 ? W * 0.82 - padX : W - padX * 2;
    var L = stack(ctx, d, { x: padX, y: top, w: tw, h: bottom - top },
      { family: SERIF, maxSize: 104 * s, minSize: 26 * s, maxLines: W / H > 1.9 ? 2 : (W / H < 1.2 ? 4 : 3), lineHeight: 1.22 },
      { family: SANS, maxSize: 28 * s, minSize: 16 * s, maxH: 84 * s, gap: 22 * s, maxLines: 2 }, 'middle');
    T.draw(ctx, L.title, padX, L.ty, { color: p.ink, hlColor: p.ink, hlBg: alpha(p.accent, 0.35), hlUnderline: true });
    if (L.sub) T.draw(ctx, L.sub, padX, L.sy, { color: alpha(p.ink, 0.66) });
  }

  function spaced(ctx, text, x, y, spacing) {
    for (var i = 0; i < text.length; i++) { ctx.fillText(text[i], x, y); x += ctx.measureText(text[i]).width + spacing; }
    return x;
  }

  /* ---------------------------------------------------------------- 3. Terminal */
  function terminal(ctx, W, H, d, p) {
    var s = scaleOf(W, H), m = Math.min(W, H) * 0.07;
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = alpha(p.green, 0.09);
    for (var x = 12 * s; x < W; x += 28 * s) for (var y = 12 * s; y < H; y += 28 * s) ctx.fillRect(x, y, 2 * s, 2 * s);
    var gl = ctx.createRadialGradient(W * 0.8, H * 0.2, 0, W * 0.8, H * 0.2, W * 0.6);
    gl.addColorStop(0, alpha(p.green, 0.12)); gl.addColorStop(1, alpha(p.green, 0));
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);

    var wx = m, wy = m, ww = W - m * 2, wh = H - m * 2, bar = 46 * s;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40 * s; ctx.shadowOffsetY = 12 * s;
    rr(ctx, wx, wy, ww, wh, 16 * s); ctx.fillStyle = p.win; ctx.fill(); ctx.restore();
    rr(ctx, wx, wy, ww, wh, 16 * s); ctx.lineWidth = 1.5 * s; ctx.strokeStyle = alpha(p.text, 0.12); ctx.stroke();
    ctx.save(); rr(ctx, wx, wy, ww, wh, 16 * s); ctx.clip();
    ctx.fillStyle = alpha(p.text, 0.05); ctx.fillRect(wx, wy, ww, bar); ctx.restore();
    ['#FF5F57', '#FEBC2E', '#28C840'].forEach(function (c, i) {
      ctx.beginPath(); ctx.arc(wx + 26 * s + i * 24 * s, wy + bar / 2, 7 * s, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
    });
    ctx.font = '500 ' + (16 * s) + 'px ' + MONO; ctx.fillStyle = alpha(p.text, 0.5); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('~/' + (d.handle || '').replace(/^@/, '') + ' — zsh', wx + ww / 2, wy + bar / 2);
    ctx.textAlign = 'left';

    var ix = wx + 44 * s, iw = ww - 88 * s, iy = wy + bar + 34 * s;
    var mono = 22 * s;
    ctx.font = '500 ' + mono + 'px ' + MONO; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = p.green; var px = spacedPlain(ctx, '➜ ', ix, iy + mono);
    ctx.fillStyle = p.accent; px = spacedPlain(ctx, '~ ', px, iy + mono);
    ctx.fillStyle = p.text; spacedPlain(ctx, 'cat ' + (d.tag ? d.tag.replace(/\s+/g, '_') : 'article') + '.md', px, iy + mono);

    var footY = wy + wh - 30 * s;
    var top = iy + mono + 30 * s, bottom = footY - 44 * s;
    // Reserve room for the block cursor drawn after the last line.
    var L = stack(ctx, d, { x: ix, y: top, w: iw * (W / H > 1.9 ? 0.92 : 1) - 70 * s, h: bottom - top },
      { family: SANS, maxSize: 96 * s, minSize: 26 * s, maxLines: W / H > 1.9 ? 2 : (W / H < 1.2 ? 4 : 3), lineHeight: 1.2 },
      { family: MONO + ',' + SANS, weight: 400, maxSize: 24 * s, minSize: 15 * s, maxH: 74 * s, gap: 22 * s, maxLines: 2 }, W / H > 1.9 ? 'top' : 'middle');
    T.draw(ctx, L.title, ix, L.ty, { color: p.text, hlColor: p.green });
    // cursor after last title line
    var last = L.title.lines[L.title.lines.length - 1] || [];
    var lw = last.reduce(function (a, t) { return a + t.w; }, 0);
    var cy = L.ty + (L.title.lines.length - 1) * L.title.size * L.title.lineHeight;
    ctx.fillStyle = p.green; ctx.fillRect(ix + lw + L.title.size * 0.15, cy + L.title.size * 0.08, L.title.size * 0.45, L.title.size * 0.92);
    if (L.sub) {
      var subBlock = L.sub;
      ctx.font = subBlock.font; ctx.fillStyle = alpha(p.text, 0.45);
      T.draw(ctx, subBlock, ix, L.sy, { color: alpha(p.text, 0.55) });
    }
    ctx.font = '500 ' + (18 * s) + 'px ' + MONO; ctx.fillStyle = p.green; ctx.textBaseline = 'alphabetic';
    var fx = spacedPlain(ctx, '✓ ', ix, footY);
    ctx.fillStyle = alpha(p.text, 0.55);
    spacedPlain(ctx, 'by ' + (d.handle || ''), fx, footY);
    ctx.textAlign = 'right'; ctx.fillStyle = alpha(p.text, 0.35);
    ctx.fillText('utf-8  ·  ' + ymd(), wx + ww - 44 * s, footY); ctx.textAlign = 'left';
  }
  function spacedPlain(ctx, t, x, y) { ctx.fillText(t, x, y); return x + ctx.measureText(t).width; }

  /* ---------------------------------------------------------------- 4. Poster (大字报) */
  function poster(ctx, W, H, d, p) {
    var s = scaleOf(W, H), pad = Math.min(W, H) * 0.09;
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
    // giant outlined "AI"
    ctx.save(); ctx.font = '700 ' + Math.min(H * 1.05, W * 0.62) + 'px ' + SANS; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'right';
    ctx.lineWidth = 3 * s; ctx.strokeStyle = alpha(p.ink, 0.13); ctx.strokeText('AI', W + H * 0.04, H * 0.98); ctx.restore();
    // hazard stripes bottom
    var sh = 16 * s; ctx.save(); ctx.beginPath(); ctx.rect(0, H - sh, W, sh); ctx.clip();
    ctx.fillStyle = p.ink; ctx.fillRect(0, H - sh, W, sh); ctx.fillStyle = p.bg;
    for (var x = -sh; x < W + sh; x += sh * 2) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + sh, H - sh); ctx.lineTo(x + sh * 2, H - sh); ctx.lineTo(x + sh, H); ctx.fill(); }
    ctx.restore();
    // left bar
    ctx.fillStyle = p.ink; ctx.fillRect(pad * 0.45, pad, 10 * s, H - pad * 2 - sh);

    var x0 = pad * 0.45 + 40 * s;
    var tagH = 0;
    if (d.tag) {
      var tg = pill(ctx, x0, pad, d.tag, { size: 24 * s, bg: p.accent, color: p.accentText, radius: 0, weight: 700 });
      tagH = tg.h;
    }
    var footH = 40 * s;
    var top = pad + tagH + 26 * s, bottom = H - sh - pad * 0.7 - footH;
    var tw = W / H > 1.9 ? W * 0.84 - x0 : W - x0 - pad * 0.6;
    var L = stack(ctx, d, { x: x0, y: top, w: tw, h: bottom - top },
      { family: SANS, maxSize: 132 * s, minSize: 28 * s, maxLines: W / H > 1.9 ? 2 : (W / H < 1.2 ? 4 : 3), lineHeight: 1.12 },
      { family: SANS, weight: 700, maxSize: 30 * s, minSize: 16 * s, maxH: 80 * s, gap: 30 * s, maxLines: 2 }, 'middle');
    T.draw(ctx, L.title, x0, L.ty, { color: p.ink, hlColor: p.bg, hlBg: p.ink });
    if (L.sub) T.draw(ctx, L.sub, x0, L.sy, { color: alpha(p.ink, 0.75) });
    ctx.font = '700 ' + (22 * s) + 'px ' + SANS; ctx.fillStyle = p.ink; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'right';
    ctx.fillText((d.handle || '') + '  →', W - pad * 0.6, H - sh - pad * 0.55); ctx.textAlign = 'left';
  }

  /* ---------------------------------------------------------------- 5. Collage */
  function collage(ctx, W, H, d, p) {
    var s = scaleOf(W, H), pad = Math.min(W, H) * 0.08;
    ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = alpha(p.ink, 0.1);
    for (var x = 10 * s; x < W; x += 26 * s) for (var y = 10 * s; y < H; y += 26 * s) { ctx.beginPath(); ctx.arc(x, y, 1.6 * s, 0, Math.PI * 2); ctx.fill(); }
    var wide = W / H > 1.5;
    // Collage cards region
    var cx, cy, cw, ch;
    if (wide) { cx = W * 0.6; cy = pad * 0.6; cw = W - cx - pad * 0.5; ch = H - pad * 1.2; }
    else { cx = pad; cy = pad * 0.6; cw = W - pad * 2; ch = H * 0.42; }
    var k = Math.min(cw / 560, ch / 470);
    function card(x, y, w, h, rot, bg, drawFn) {
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot);
      ctx.shadowColor = 'rgba(20,20,40,0.22)'; ctx.shadowBlur = 30 * k; ctx.shadowOffsetY = 12 * k;
      rr(ctx, -w / 2, -h / 2, w, h, 18 * k); ctx.fillStyle = bg; ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.save(); rr(ctx, -w / 2, -h / 2, w, h, 18 * k); ctx.clip(); drawFn(-w / 2, -h / 2, w, h); ctx.restore();
      ctx.restore();
    }
    var ox = cx + (cw - 560 * k) / 2, oy = cy + (ch - 470 * k) / 2;
    // image card
    card(ox + 250 * k, oy + 10 * k, 300 * k, 220 * k, 0.07, p.c1, function (x, y, w, h) {
      var g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, p.c1); g.addColorStop(1, p.c2);
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x + w * 0.72, y + h * 0.35, h * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w * 0.35, y + h * 0.5); ctx.lineTo(x + w * 0.6, y + h * 0.78); ctx.lineTo(x + w * 0.8, y + h * 0.6); ctx.lineTo(x + w, y + h); ctx.fill();
      star(ctx, x + w * 0.2, y + h * 0.25, 18 * k, '#fff');
    });
    // chart card
    card(ox + 10 * k, oy + 40 * k, 250 * k, 200 * k, -0.06, p.card, function (x, y, w, h) {
      ctx.fillStyle = alpha(p.ink, 0.8); ctx.font = '700 ' + (16 * k) + 'px ' + SANS; ctx.textBaseline = 'top';
      ctx.fillText('Views', x + 20 * k, y + 18 * k);
      var hs = [0.3, 0.45, 0.38, 0.62, 0.55, 0.85];
      hs.forEach(function (v, i) {
        ctx.fillStyle = i === hs.length - 1 ? p.c2 : alpha(p.c1, 0.55);
        var bw = 22 * k, bx = x + 22 * k + i * 36 * k, bh = (h - 70 * k) * v;
        rr(ctx, bx, y + h - 20 * k - bh, bw, bh, 5 * k); ctx.fill();
      });
    });
    // chat card
    card(ox + 120 * k, oy + 240 * k, 380 * k, 210 * k, 0.025, p.card, function (x, y, w, h) {
      function bubble(bx, by, bw, bh, c) { rr(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = c; ctx.fill(); }
      ctx.beginPath(); ctx.arc(x + 34 * k, y + 38 * k, 16 * k, 0, Math.PI * 2); ctx.fillStyle = p.c2; ctx.fill();
      bubble(x + 62 * k, y + 24 * k, 220 * k, 28 * k, alpha(p.ink, 0.08));
      bubble(x + w - 250 * k, y + 70 * k, 230 * k, 28 * k, p.c1);
      bubble(x + 62 * k, y + 116 * k, 280 * k, 28 * k, alpha(p.ink, 0.08));
      bubble(x + 62 * k, y + 156 * k, 160 * k, 28 * k, alpha(p.ink, 0.08));
    });
    // sticky note
    card(ox + 2 * k, oy + 270 * k, 120 * k, 120 * k, -0.12, p.note, function (x, y, w, h) {
      ctx.fillStyle = alpha('#000000', 0.7); ctx.font = '700 ' + (40 * k) + 'px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('AI', x + w / 2, y + h / 2); ctx.textAlign = 'left';
    });

    // main title card
    var mx, my, mw, mh;
    if (wide) { mx = pad * 0.7; my = pad * 0.7; mw = W * 0.58 - pad * 0.7; mh = H - pad * 1.4; }
    else { mx = pad; my = cy + ch + pad * 0.4; mw = W - pad * 2; mh = H - my - pad * 0.7; }
    ctx.save(); ctx.shadowColor = 'rgba(20,20,40,0.18)'; ctx.shadowBlur = 40 * s; ctx.shadowOffsetY = 14 * s;
    rr(ctx, mx, my, mw, mh, 26 * s); ctx.fillStyle = p.card; ctx.fill(); ctx.restore();
    var ip = 44 * s, tagH = 0;
    if (d.tag) tagH = pill(ctx, mx + ip, my + ip * 0.9, d.tag, { size: 20 * s, bg: alpha(p.c1, 0.18), color: p.c2 }).h;
    var footH = 46 * s;
    var top = my + ip * 0.9 + tagH + 22 * s, bottom = my + mh - ip * 0.8 - footH - 18 * s;
    var L = stack(ctx, d, { x: mx + ip, y: top, w: mw - ip * 2, h: bottom - top },
      { family: SANS, maxSize: 84 * s, minSize: 24 * s, maxLines: 3, lineHeight: 1.2 },
      { family: SANS, maxSize: 26 * s, minSize: 15 * s, maxH: 74 * s, gap: 18 * s, maxLines: 2 }, 'middle');
    T.draw(ctx, L.title, mx + ip, L.ty, { color: p.ink, hlColor: p.c2 });
    if (L.sub) T.draw(ctx, L.sub, mx + ip, L.sy, { color: alpha(p.ink, 0.6) });
    byline(ctx, mx + ip, my + mh - ip * 0.8 - footH / 2 + 10 * s, d.handle, { size: 20 * s, color: alpha(p.ink, 0.8), avatarBg: p.c2, avatarFg: '#fff' });
  }

  /* ---------------------------------------------------------------- 6. Neon grid */
  function neon(ctx, W, H, d, p) {
    var s = scaleOf(W, H), pad = Math.min(W, H) * 0.08;
    var bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, p.bg); bg.addColorStop(1, p.bg2);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // perspective floor grid
    var hz = H * 0.66;
    ctx.save(); ctx.beginPath(); ctx.rect(0, hz, W, H - hz); ctx.clip();
    ctx.strokeStyle = alpha(p.glow, 0.35); ctx.lineWidth = 1.5 * s;
    for (var i = -24; i <= 24; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 20 * s, hz); ctx.lineTo(W / 2 + i * 160 * s, H); ctx.stroke(); }
    for (var j = 1; j < 12; j++) { var yy = hz + Math.pow(j / 11, 2) * (H - hz); ctx.globalAlpha = 0.2 + 0.8 * j / 11; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); }
    ctx.restore();
    var fade = ctx.createLinearGradient(0, hz, 0, hz + (H - hz) * 0.6); fade.addColorStop(0, p.bg2); fade.addColorStop(1, alpha(p.bg2, 0));
    ctx.fillStyle = fade; ctx.fillRect(0, hz, W, H - hz);
    var halo = ctx.createRadialGradient(W / 2, hz, 0, W / 2, hz, W * 0.5);
    halo.addColorStop(0, alpha(p.glow, 0.28)); halo.addColorStop(1, alpha(p.glow, 0));
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
    // stars
    var r = rng(9); for (var k = 0; k < 90; k++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + r() * 0.5) + ')'; ctx.fillRect(r() * W, r() * hz * 0.95, 1.6 * s, 1.6 * s); }
    // corner brackets
    ctx.strokeStyle = alpha(p.glow, 0.85); ctx.lineWidth = 3 * s; var b = 34 * s, m = pad * 0.55;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(function (c) {
      ctx.beginPath(); ctx.moveTo(c[0], c[1] + b * c[3]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0] + b * c[2], c[1]); ctx.stroke();
    });
    var tagH = 0;
    if (d.tag) {
      var label = '[ ' + d.tag + ' ]';
      ctx.font = '700 ' + (22 * s) + 'px ' + MONO + ',' + SANS; ctx.fillStyle = p.glow; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(label, W / 2, pad); ctx.textAlign = 'left'; tagH = 22 * s * 1.3;
    }
    var footH = 40 * s;
    var top = pad + tagH + 26 * s, bottom = H - pad - footH;
    var tw = W / H > 1.9 ? W * 0.78 : W - pad * 2.4;
    var L = stack(ctx, d, { x: W / 2, y: top, w: tw, h: bottom - top },
      { family: SANS, maxSize: 108 * s, minSize: 26 * s, maxLines: W / H > 1.9 ? 2 : (W / H < 1.2 ? 4 : 3), lineHeight: 1.18 },
      { family: SANS, maxSize: 28 * s, minSize: 16 * s, maxH: 80 * s, gap: 22 * s, maxLines: 2 }, 'middle');
    T.draw(ctx, L.title, W / 2, L.ty, { align: 'center', color: '#FFFFFF', hlColor: p.glow, shadow: { color: alpha(p.glow, 0.9), blur: 28 * s } });
    if (L.sub) T.draw(ctx, L.sub, W / 2, L.sy, { align: 'center', color: alpha('#FFFFFF', 0.72) });
    byline(ctx, W / 2, H - pad - footH / 2 + 6 * s, d.handle, { size: 20 * s, color: alpha('#FFFFFF', 0.85), align: 'center', avatarBg: p.glow, avatarFg: p.bg });
  }

  var STYLES = [
    { id: 'gradient', name: { zh: '渐变大字', en: 'Bold Gradient' }, render: gradient, palettes: [
      { id: 'aurora', name: { zh: '极光紫', en: 'Aurora' }, c: ['#2E1065', '#6D28D9', '#2563EB', '#22D3EE'], hl: '#FDE68A', sw: '#6D28D9' },
      { id: 'sunset', name: { zh: '日落橙', en: 'Sunset' }, c: ['#4C0519', '#BE185D', '#F97316', '#FBBF24'], hl: '#FEF08A', sw: '#F97316' },
      { id: 'mint', name: { zh: '薄荷绿', en: 'Mint' }, c: ['#022C22', '#047857', '#0284C7', '#5EEAD4'], hl: '#FDE68A', sw: '#059669' }] },
    { id: 'editorial', name: { zh: '极简杂志', en: 'Minimal Editorial' }, render: editorial, palettes: [
      { id: 'paper', name: { zh: '米白纸', en: 'Paper' }, bg: '#F3EFE6', ink: '#161514', accent: '#C2410C', sw: '#F3EFE6' },
      { id: 'night', name: { zh: '夜读', en: 'Night' }, bg: '#121212', ink: '#F3EEE3', accent: '#E3B341', sw: '#121212' },
      { id: 'sage', name: { zh: '鼠尾草', en: 'Sage' }, bg: '#E3EAE0', ink: '#1D2A21', accent: '#2F7A55', sw: '#E3EAE0' }] },
    { id: 'terminal', name: { zh: '终端代码', en: 'Terminal' }, render: terminal, palettes: [
      { id: 'github', name: { zh: '暗夜', en: 'Dark' }, bg: '#0B0F14', win: '#161B22', green: '#3FB950', accent: '#58A6FF', text: '#E6EDF3', sw: '#161B22' },
      { id: 'dracula', name: { zh: '德古拉', en: 'Dracula' }, bg: '#191724', win: '#282A36', green: '#50FA7B', accent: '#FF79C6', text: '#F8F8F2', sw: '#282A36' },
      { id: 'amber', name: { zh: '琥珀屏', en: 'Amber' }, bg: '#0F0B04', win: '#1A1408', green: '#FFB000', accent: '#FF6B35', text: '#FFE8B8', sw: '#FFB000' }] },
    { id: 'poster', name: { zh: '大字报', en: 'Poster' }, render: poster, palettes: [
      { id: 'yellow', name: { zh: '警示黄', en: 'Yellow' }, bg: '#FFD43B', ink: '#111111', accent: '#E03131', accentText: '#FFFFFF', sw: '#FFD43B' },
      { id: 'red', name: { zh: '中国红', en: 'Red' }, bg: '#D9302C', ink: '#FFF8E7', accent: '#111111', accentText: '#FFD43B', sw: '#D9302C' },
      { id: 'mono', name: { zh: '黑白', en: 'Mono' }, bg: '#F5F5F0', ink: '#111111', accent: '#1C64F2', accentText: '#FFFFFF', sw: '#F5F5F0' }] },
    { id: 'collage', name: { zh: '卡片拼贴', en: 'Card Collage' }, render: collage, palettes: [
      { id: 'lilac', name: { zh: '淡紫', en: 'Lilac' }, bg: '#ECEAFB', card: '#FFFFFF', ink: '#1E1B3A', c1: '#8B7CF6', c2: '#5B3DF5', note: '#FDE68A', sw: '#8B7CF6' },
      { id: 'peach', name: { zh: '蜜桃', en: 'Peach' }, bg: '#FBEFE6', card: '#FFFFFF', ink: '#2B1A12', c1: '#FB923C', c2: '#E8590C', note: '#BBF7D0', sw: '#FB923C' },
      { id: 'ink', name: { zh: '墨色', en: 'Ink' }, bg: '#15151C', card: '#22222C', ink: '#F4F4F8', c1: '#38BDF8', c2: '#22D3EE', note: '#F9A8D4', sw: '#22222C' }] },
    { id: 'neon', name: { zh: '霓虹网格', en: 'Neon Grid' }, render: neon, palettes: [
      { id: 'cyan', name: { zh: '赛博青', en: 'Cyan' }, bg: '#030712', bg2: '#0B1B3A', glow: '#22D3EE', sw: '#22D3EE' },
      { id: 'violet', name: { zh: '电光紫', en: 'Violet' }, bg: '#08040F', bg2: '#2A0E4A', glow: '#D946EF', sw: '#D946EF' },
      { id: 'lime', name: { zh: '荧光绿', en: 'Lime' }, bg: '#020A05', bg2: '#0C2A18', glow: '#A3E635', sw: '#A3E635' }] }
  ];

  var SIZES = [
    { id: 'cover', w: 1500, h: 600, name: { zh: '长文封面 5:2', en: 'Article cover 5:2' } },
    { id: 'body', w: 1200, h: 675, name: { zh: '正文配图 16:9', en: 'In-body 16:9' } },
    { id: 'square', w: 1080, h: 1080, name: { zh: '方图 1:1', en: 'Square 1:1' } }
  ];

  function render(canvas, styleId, paletteId, sizeId, data, scale) {
    var st = STYLES.find(function (x) { return x.id === styleId; }) || STYLES[0];
    var pal = st.palettes.find(function (x) { return x.id === paletteId; }) || st.palettes[0];
    var sz = SIZES.find(function (x) { return x.id === sizeId; }) || SIZES[0];
    scale = scale || 1;
    canvas.width = sz.w * scale; canvas.height = sz.h * scale;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, sz.w, sz.h);
    st.render(ctx, sz.w, sz.h, data, pal);
    return { style: st, palette: pal, size: sz };
  }

  global.CoverStyles = { STYLES: STYLES, SIZES: SIZES, render: render, FONTS: { SANS: SANS, SERIF: SERIF, MONO: MONO } };
})(window);
