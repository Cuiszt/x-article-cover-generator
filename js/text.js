/* Text layout engine for canvas: CJK-aware wrapping, kinsoku, highlight markup, auto-fit. */
(function (global) {
  'use strict';

  // Characters that must not start a line (closing punctuation) / end a line (opening).
  var NO_START = '，。、．：；！？）】》」』〉’”%‰°,.:;!?)]}>…—~～·';
  var NO_END = '（【《「『〈‘“([{<#@$¥￥';

  function isCJK(ch) {
    return /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]/.test(ch);
  }

  /** Parse `*highlight*` markup into [{text, hl}] runs. */
  function parseMarkup(src) {
    var runs = [], hl = false, buf = '';
    for (var i = 0; i < src.length; i++) {
      var c = src[i];
      if (c === '*') { if (buf) runs.push({ text: buf, hl: hl }); buf = ''; hl = !hl; continue; }
      buf += c;
    }
    if (buf) runs.push({ text: buf, hl: hl });
    return runs;
  }

  function stripMarkup(src) { return String(src || '').replace(/\*/g, ''); }

  /** Split runs into breakable tokens: each CJK char, each Latin word, each space. */
  // Chinese word segmentation (keeps words like 封面/生成器 on one line) when the browser supports it.
  var segmenter = null;
  try { if (typeof Intl !== 'undefined' && Intl.Segmenter) segmenter = new Intl.Segmenter('zh', { granularity: 'word' }); } catch (e) { segmenter = null; }

  function pushCJK(tokens, buf, hl) {
    if (!buf) return;
    if (segmenter) {
      for (var it = segmenter.segment(buf)[Symbol.iterator](), r = it.next(); !r.done; r = it.next()) {
        var w = r.value.segment;
        // Very long "words" are rare; split them so wrapping stays flexible.
        if (w.length > 5) w.split('').forEach(function (c) { tokens.push({ t: c, hl: hl }); });
        else tokens.push({ t: w, hl: hl });
      }
    } else buf.split('').forEach(function (c) { tokens.push({ t: c, hl: hl }); });
  }

  function tokenize(runs) {
    var tokens = [];
    runs.forEach(function (run) {
      var re = /(\s+)|([A-Za-z0-9\u00C0-\u024F_\-.'’+#@/&%:]+)|([\s\S])/g, m, cjk = '';
      while ((m = re.exec(run.text))) {
        if (m[3] && isCJK(m[3]) && NO_START.indexOf(m[3]) < 0 && NO_END.indexOf(m[3]) < 0) { cjk += m[3]; continue; }
        pushCJK(tokens, cjk, run.hl); cjk = '';
        if (m[1]) tokens.push({ t: ' ', hl: run.hl, space: true, nl: /\n/.test(m[1]) });
        else tokens.push({ t: m[0], hl: run.hl });
      }
      pushCJK(tokens, cjk, run.hl);
    });
    return tokens;
  }

  function measure(ctx, s) { return ctx.measureText(s).width; }

  /** Glue punctuation to neighbours so lines never start with "，" or end with "「". */
  function glue(tokens) {
    var out = [];
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      var prev = out[out.length - 1];
      if (prev && !prev.space && !tk.space && tk.t.length === 1 && NO_START.indexOf(tk.t) >= 0 && prev.hl === tk.hl) { prev.t += tk.t; continue; }
      if (prev && !prev.space && !tk.space && prev.open && prev.hl === tk.hl) { prev.t += tk.t; prev.open = false; continue; }
      out.push({ t: tk.t, hl: tk.hl, space: tk.space, nl: tk.nl, open: tk.t.length === 1 && NO_END.indexOf(tk.t) >= 0 });
    }
    return out;
  }

  /** Penalty for breaking the line between token a and token b. */
  function breakPenalty(a, b) {
    if (!a || !b) return 0;
    if (a.space || b.space) return 0;                       // natural space
    var lastA = a.t[a.t.length - 1], firstB = b.t[0];
    if (NO_START.indexOf(lastA) >= 0) return 0;             // after punctuation
    if (isCJK(lastA) !== isCJK(firstB)) return 0.05;        // CJK <-> Latin boundary
    if (isCJK(lastA) && isCJK(firstB)) return (a.t.length === 1 && b.t.length === 1) ? 0.4 : 0.25; // inside Chinese
    return 0.5;
  }

  /**
   * Optimal line breaking (small dynamic programme): prefers breaks at spaces and
   * punctuation, avoids splitting likely words (长|文) and one-character last lines,
   * and keeps lines balanced. Returns array of lines; each line is array of {t, hl, w}.
   */
  function wrap(ctx, tokens, maxWidth, maxLines) {
    maxLines = maxLines || 99;
    // Hard-break any token wider than the box (long URLs / English words).
    var tks = [];
    tokens.forEach(function (tk) {
      var w = measure(ctx, tk.t);
      if (!tk.space && w > maxWidth && tk.t.length > 1) tk.t.split('').forEach(function (c) { tks.push({ t: c, hl: tk.hl, w: measure(ctx, c) }); });
      else tks.push({ t: tk.t, hl: tk.hl, space: tk.space, nl: tk.nl, w: tk.space ? measure(ctx, ' ') : w });
    });
    // Split into paragraphs at explicit newlines, wrap each, concatenate.
    var paras = [[]];
    tks.forEach(function (tk) { if (tk.nl) paras.push([]); else paras[paras.length - 1].push(tk); });
    var lines = [];
    var pen = 0;
    paras.forEach(function (para) { var r = wrapPara(para, maxWidth, Math.max(1, maxLines - lines.length)); pen += r.pen || 0; lines = lines.concat(r); });
    lines.pen = pen;
    return lines;
  }

  function trimLine(arr) {
    var a = 0, b = arr.length;
    while (a < b && arr[a].space) a++;
    while (b > a && arr[b - 1].space) b--;
    return arr.slice(a, b);
  }

  function wrapPara(tks, maxWidth, maxLines) {
    var n = tks.length;
    if (!n) return [];
    var INF = 1e9;
    // best[j] = {cost, lines, prev}
    var best = new Array(n + 1);
    best[0] = { cost: 0, lines: 0, prev: -1, pen: 0 };
    for (var j = 1; j <= n; j++) {
      best[j] = { cost: INF, lines: 0, prev: -1, pen: 0 };
      for (var i = j - 1; i >= 0; i--) {
        if (!best[i] || best[i].cost >= INF) continue;
        var line = trimLine(tks.slice(i, j));
        if (!line.length) continue;
        var w = 0; for (var k = 0; k < line.length; k++) w += line[k].w;
        if (w > maxWidth && line.length > 1) break; // only gets wider as i decreases
        var slack = (maxWidth - Math.min(w, maxWidth)) / maxWidth;
        var isLast = j === n;
        var cost = slack * slack + 0.08, pen = 0;
        if (j < n) pen += breakPenalty(tks[j - 1], tks[j]);
        if (isLast) {
          var chars = line.map(function (x) { return x.t; }).join('').replace(/\s/g, '').length;
          if (chars <= 2 && i > 0) pen += 0.8;
        }
        cost += pen;
        var total = best[i].cost + cost, ln = best[i].lines + 1;
        if (ln > maxLines) continue;
        if (total < best[j].cost) best[j] = { cost: total, lines: ln, prev: i, pen: best[i].pen + pen };
      }
    }
    if (best[n].cost >= INF) {
      // Could not fit within maxLines: greedy fallback (caller will shrink the font).
      var out = [], cur = [], cw = 0;
      tks.forEach(function (tk) {
        if (cw + tk.w > maxWidth && cur.length) { out.push(trimLine(cur)); cur = []; cw = 0; }
        cur.push(tk); cw += tk.w;
      });
      if (cur.length) out.push(trimLine(cur));
      out.pen = 1;
      return out;
    }
    var res = [], at = n;
    while (at > 0) { var pv = best[at].prev; res.unshift(trimLine(tks.slice(pv, at))); at = pv; }
    res.pen = best[n].pen;
    return res;
  }

  function lineWidth(line) {
    var w = 0;
    for (var i = 0; i < line.length; i++) w += line[i].w;
    return w;
  }

  /**
   * Find the largest font size so the text fits in box {w,h} within maxLines.
   * opts: {family, weight, maxSize, minSize, lineHeight, maxLines, balance, letterSpacing}
   */
  function fit(ctx, src, box, opts) {
    var runs = parseMarkup(src || '');
    var lh = opts.lineHeight || 1.25, best = null;
    var tokens = glue(tokenize(runs));
    // For each allowed line count, find the largest size that fits, then look a little
    // smaller for cleaner line breaks. Quality = size, discounted for bad breaks / extra lines.
    function search(maxLines) {
      var size = opts.maxSize, min = opts.minSize || 12, found = null, floor = min;
      while (size >= floor) {
        ctx.font = (opts.weight || 700) + ' ' + size + 'px ' + opts.family;
        var lines = wrap(ctx, tokens, box.w, maxLines);
        var h = lines.length * size * lh - size * (lh - 1);
        var widest = Math.max.apply(null, lines.map(lineWidth).concat([0]));
        if (lines.length <= maxLines && h <= box.h && widest <= box.w * 1.001) {
          var q = size * Math.max(0.4, 1 - 0.35 * (lines.pen || 0));
          if (!found) floor = Math.max(min, size * 0.85);
          if (!found || q > found.q) found = { size: size, lines: lines, q: q };
        }
        size -= Math.max(1, Math.round(size * 0.02));
      }
      return found;
    }
    var base = opts.maxLines || 4;
    for (var extra = 0; extra <= 2; extra++) {
      var r = search(base + extra);
      if (r) { r.q *= Math.pow(0.8, extra); if (!best || r.q > best.q) best = r; }
    }
    if (!best) {
      var ml = opts.maxLines || 4, sz = opts.minSize || 12;
      ctx.font = (opts.weight || 700) + ' ' + sz + 'px ' + opts.family;
      var ls = wrap(ctx, tokens, box.w);
      var keep = Math.max(1, Math.min(ls.length, Math.floor((box.h + sz * (lh - 1)) / (sz * lh)), ml + 2));
      best = { size: sz, lines: ls.slice(0, keep), truncated: ls.length > keep };
      if (best.truncated) { var last = best.lines[keep - 1]; last.push({ t: '…', w: measure(ctx, '…') }); }
    }
    best.lineHeight = lh;
    best.height = best.lines.length * best.size * lh - best.size * (lh - 1);
    best.width = Math.max.apply(null, best.lines.map(lineWidth));
    best.font = (opts.weight || 700) + ' ' + best.size + 'px ' + opts.family;
    return best;
  }

  /**
   * Draw a fitted block. y is the top of the block. Text drawn with textBaseline 'alphabetic'.
   * style: {color, hlColor, hlBg, hlPad, align:'left'|'center', shadow, stroke}
   */
  function draw(ctx, block, x, y, style) {
    style = style || {};
    ctx.save();
    ctx.font = block.font;
    ctx.textBaseline = 'alphabetic';
    var size = block.size, lh = block.lineHeight;
    block.lines.forEach(function (line, i) {
      var lw = lineWidth(line);
      var cx = style.align === 'center' ? x - lw / 2 : (style.align === 'right' ? x - lw : x);
      var base = y + size * 0.88 + i * size * lh;
      // highlight backgrounds first
      if (style.hlBg) {
        var hx = cx, start = null;
        line.forEach(function (tk, j) {
          if (tk.hl && start === null) start = hx;
          var endRun = tk.hl && (j === line.length - 1 || !line[j + 1].hl);
          hx += tk.w;
          if (endRun) {
            var pad = style.hlPad != null ? style.hlPad : size * 0.12;
            ctx.fillStyle = style.hlBg;
            if (style.hlUnderline) ctx.fillRect(start - pad * 0.3, base - size * 0.32, hx - start + pad * 0.6, size * 0.38);
            else ctx.fillRect(start - pad, base - size * 0.92, hx - start + pad * 2, size * 1.14);
            start = null;
          }
        });
      }
      var tx = cx;
      line.forEach(function (tk) {
        ctx.fillStyle = tk.hl && style.hlColor ? style.hlColor : style.color;
        if (style.shadow) { ctx.shadowColor = style.shadow.color; ctx.shadowBlur = style.shadow.blur; ctx.shadowOffsetX = style.shadow.x || 0; ctx.shadowOffsetY = style.shadow.y || 0; }
        if (style.stroke) { ctx.lineWidth = style.stroke.width; ctx.strokeStyle = style.stroke.color; ctx.lineJoin = 'round'; ctx.strokeText(tk.t, tx, base); }
        ctx.fillText(tk.t, tx, base);
        tx += tk.w;
      });
    });
    ctx.restore();
  }

  global.TextKit = { fit: fit, draw: draw, parseMarkup: parseMarkup, stripMarkup: stripMarkup, isCJK: isCJK };
})(window);
