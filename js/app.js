(function () {
  'use strict';
  var S = window.CoverStyles, P = window.CoverPrompts, I = window.I18N;
  var DEFAULTS = {
    title: '我让 AI 做了个 X 长文封面生成器，*开源了*',
    subtitle: '6 种风格 · 5:2 封面 / 16:9 配图 · 附 AI 生图提示词',
    handle: '@Cuiszt_Cui',
    tag: '开源工具',
    style: 'gradient', palette: 'aurora', size: 'cover', lang: 'zh', hd: false
  };
  var KEY = 'xcover.state.v1';
  var state = Object.assign({}, DEFAULTS);
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('canvas');

  function t(k) { return (I[state.lang] || I.zh)[k] || k; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* file:// may block */ } }
  function data() { return { title: state.title, subtitle: state.subtitle, handle: state.handle, tag: state.tag }; }
  function currentStyle() { return S.STYLES.find(function (s) { return s.id === state.style; }) || S.STYLES[0]; }

  function applyI18n() {
    document.documentElement.lang = state.lang === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('.lang button').forEach(function (b) { b.classList.toggle('on', b.dataset.lang === state.lang); });
  }

  function buildStyleGrid() {
    var grid = $('styleGrid'); grid.innerHTML = '';
    S.STYLES.forEach(function (st) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'style-card' + (st.id === state.style ? ' on' : '');
      b.dataset.style = st.id;
      var c = document.createElement('canvas'); b.appendChild(c);
      var sp = document.createElement('span'); sp.textContent = st.name[state.lang]; b.appendChild(sp);
      b.addEventListener('click', function () { state.style = st.id; state.palette = st.palettes[0].id; refreshAll(); });
      grid.appendChild(b);
    });
  }

  function drawThumbs() {
    document.querySelectorAll('.style-card').forEach(function (b) {
      var st = S.STYLES.find(function (s) { return s.id === b.dataset.style; });
      var full = document.createElement('canvas');
      S.render(full, st.id, st.id === state.style ? state.palette : st.palettes[0].id, 'cover', data(), 1);
      var c = b.querySelector('canvas'); c.width = 300; c.height = 120;
      c.getContext('2d').drawImage(full, 0, 0, 300, 120);
    });
  }

  function buildPalettes() {
    var box = $('palettes'); box.innerHTML = '';
    currentStyle().palettes.forEach(function (p) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'swatch' + (p.id === state.palette ? ' on' : '');
      var i = document.createElement('i'); i.style.background = p.sw; b.appendChild(i);
      b.appendChild(document.createTextNode(p.name[state.lang]));
      b.addEventListener('click', function () { state.palette = p.id; refreshAll(); });
      box.appendChild(b);
    });
  }

  function buildSizes() {
    var box = $('sizes'); box.innerHTML = '';
    S.SIZES.forEach(function (sz) {
      var b = document.createElement('button'); b.type = 'button'; b.className = sz.id === state.size ? 'on' : '';
      b.innerHTML = '<span></span><em>' + sz.w + '×' + sz.h + '</em>';
      b.querySelector('span').textContent = sz.name[state.lang];
      b.addEventListener('click', function () { state.size = sz.id; refreshAll(); });
      box.appendChild(b);
    });
  }

  function renderPreview() {
    var r = S.render(canvas, state.style, state.palette, state.size, data(), 1);
    $('dims').textContent = r.size.w + ' × ' + r.size.h + (state.hd ? '  → ' + r.size.w * 2 + ' × ' + r.size.h * 2 : '');
  }

  function renderPrompts() {
    var p = P.build(state.style, state.palette, state.size, data());
    $('pBgZh').textContent = p.bgZh; $('pBgEn').textContent = p.bgEn;
    $('pTextZh').textContent = p.textZh; $('pTextEn').textContent = p.textEn;
    $('pMj').textContent = p.mj;
  }

  function refreshAll() {
    applyI18n(); buildStyleGrid(); buildPalettes(); buildSizes();
    renderPreview(); drawThumbs(); renderPrompts(); save();
  }
  var pending = null;
  function refreshLight() {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(function () { renderPreview(); drawThumbs(); renderPrompts(); save(); });
  }

  function fileName(sizeId) {
    var sz = S.SIZES.find(function (s) { return s.id === sizeId; });
    var k = state.hd ? 2 : 1;
    return 'x-cover-' + state.style + '-' + state.palette + '-' + sz.w * k + 'x' + sz.h * k + '.png';
  }

  function toDataURL(styleId, paletteId, sizeId, scale, d) {
    var c = document.createElement('canvas');
    S.render(c, styleId, paletteId, sizeId, d || data(), scale || 1);
    return c.toDataURL('image/png');
  }

  function download(sizeId) {
    var url = toDataURL(state.style, state.palette, sizeId, state.hd ? 2 : 1);
    var a = document.createElement('a'); a.href = url; a.download = fileName(sizeId);
    document.body.appendChild(a); a.click(); a.remove();
  }

  function copyText(text, btn) {
    function ok() { btn.textContent = t('copied'); btn.classList.add('done'); setTimeout(function () { btn.textContent = t('copy'); btn.classList.remove('done'); }, 1400); }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(ok, fallback); } else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { /* noop */ } ta.remove();
    }
  }

  // Wire up inputs
  ['title', 'subtitle', 'handle', 'tag'].forEach(function (k) {
    var el = $(k); el.value = state[k];
    el.addEventListener('input', function () { state[k] = el.value; refreshLight(); });
  });
  $('hd').checked = !!state.hd;
  $('hd').addEventListener('change', function () { state.hd = $('hd').checked; refreshLight(); });
  $('export').addEventListener('click', function () { download(state.size); });
  $('exportAll').addEventListener('click', function () { S.SIZES.forEach(function (s, i) { setTimeout(function () { download(s.id); }, i * 350); }); });
  $('reset').addEventListener('click', function () {
    ['title', 'subtitle', 'handle', 'tag'].forEach(function (k) { state[k] = DEFAULTS[k]; $(k).value = DEFAULTS[k]; });
    refreshAll();
  });
  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () { state.lang = b.dataset.lang; refreshAll(); });
  });
  document.querySelectorAll('.copy').forEach(function (b) {
    b.addEventListener('click', function () { copyText($(b.dataset.target).textContent, b); });
  });

  // Small API for automation / tests.
  window.CoverGen = { state: state, toDataURL: toDataURL, refresh: refreshAll };

  // Wait for fonts (system CJK fonts) before the first paint so measurements are right.
  var F = S.FONTS;
  var loads = ['700 40px ' + F.SANS, '400 40px ' + F.SANS, '700 40px ' + F.SERIF, '400 20px ' + F.MONO].map(function (f) {
    return document.fonts && document.fonts.load ? document.fonts.load(f, '中文 Aa') : Promise.resolve();
  });
  Promise.all(loads).catch(function () {}).then(function () { refreshAll(); document.body.dataset.ready = '1'; });
})();
