/* Chemetil — hero de metal líquido + interacções */
(function () {
  'use strict';

  /* ---------- i18n ---------- */
  function applyLang(lang) {
    var dict = I18N[lang] || I18N.pt;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (dict[k]) el.textContent = dict[k];
    });
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang').forEach(function (b) {
      b.classList.toggle('on', b.dataset.lang === lang);
    });
    try { localStorage.setItem('chemetil-lang', lang); } catch (e) {}
  }
  document.querySelectorAll('.lang').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.dataset.lang); });
  });
  var saved = null;
  try { saved = localStorage.getItem('chemetil-lang'); } catch (e) {}
  var urlLang = new URLSearchParams(location.search).get('lang');
  if (urlLang && I18N[urlLang]) applyLang(urlLang);
  else if (saved && I18N[saved]) applyLang(saved);

  /* ---------- year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  /* ---------- WebGL liquid metal ---------- */
  var canvas = document.getElementById('gl');
  var art = document.getElementById('hero');
  var gl = canvas.getContext('webgl', { antialias: false });
  if (!gl) { canvas.style.background = 'radial-gradient(circle at 50% 40%, #3a2c08, #0a0b0e)'; return; }

  var vsrc = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
  var fsrc = [
    'precision highp float;',
    'uniform float t;',
    'uniform vec2 res;',
    'uniform vec2 mouse;',
    'uniform vec3 tintLo;',
    'uniform vec3 tintMid;',
    'uniform vec3 tintHi;',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  float a = hash(i); float b = hash(i + vec2(1.0, 0.0)); float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }',
    'float fbm(vec2 p){ float v = 0.0; float amp = 0.5;',
    '  for (int i = 0; i < 5; i++) { v += amp * noise(p); p = p * 2.03 + vec2(11.7, 5.3); amp *= 0.52; } return v; }',
    'float height(vec2 uv){',
    '  vec2 p = uv * vec2(res.x / res.y, 1.0) * 2.1;',
    '  vec2 warp = vec2(fbm(p * 1.6 - vec2(t * 0.05, 0.0)), fbm(p * 1.6 + vec2(0.0, t * 0.04)));',
    '  float h = fbm(p + warp * 1.1 + vec2(t * 0.07, -t * 0.05));',
    '  h = (h - 0.32) * 1.5;',
    '  float d = length((uv - mouse) * vec2(res.x / res.y, 1.0));',
    '  h += 0.11 * sin(26.0 * d - t * 3.2) * exp(-5.0 * d);',
    '  return h; }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / res;',
    '  float e = 1.6 / res.y;',
    '  float h  = height(uv);',
    '  float hx = height(uv + vec2(e, 0.0)) - height(uv - vec2(e, 0.0));',
    '  float hy = height(uv + vec2(0.0, e)) - height(uv - vec2(0.0, e));',
    '  vec3 n = normalize(vec3(-hx / (2.0 * e) * 0.30, -hy / (2.0 * e) * 0.30, 1.0));',
    '  vec3 vdir = vec3(0.0, 0.0, 1.0);',
    '  vec3 l1 = normalize(vec3(0.45, 0.65, 0.62));',
    '  vec3 l2 = normalize(vec3(-0.55, -0.25, 0.5));',
    '  float diff = max(dot(n, l1), 0.0);',
    '  float spec1 = pow(max(dot(reflect(-l1, n), vdir), 0.0), 52.0);',
    '  float spec2 = pow(max(dot(reflect(-l2, n), vdir), 0.0), 30.0);',
    '  float fres = pow(1.0 - max(dot(n, vdir), 0.0), 2.6);',
    '  float band = smoothstep(0.28, 0.9, h);',
    '  vec3 col = mix(tintLo * 0.55, tintMid, band * 0.6 + diff * 0.42);',
    '  col += spec1 * tintHi * 1.15 + spec2 * tintMid * 0.35;',
    '  col += fres * tintMid * 0.4;',
    '  col += 0.045 * fres * vec3(sin(h * 42.0 + t * 0.6), sin(h * 42.0 + 2.1 + t * 0.6), sin(h * 42.0 + 4.2 + t * 0.6));',
    '  float vig = 1.0 - 0.5 * pow(length(uv - vec2(0.5, 0.46)), 1.6);',
    '  col *= vig;',
    '  gl_FragColor = vec4(col, 1.0); }'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vsrc));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fsrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.background = 'radial-gradient(circle at 50% 40%, #3a2c08, #0a0b0e)'; return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uT = gl.getUniformLocation(prog, 't');
  var uRes = gl.getUniformLocation(prog, 'res');
  var uMouse = gl.getUniformLocation(prog, 'mouse');
  var uLo = gl.getUniformLocation(prog, 'tintLo');
  var uMid = gl.getUniformLocation(prog, 'tintMid');
  var uHi = gl.getUniformLocation(prog, 'tintHi');

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    var r = art.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  var FIN = {
    ouro:   { lo: [0.23, 0.16, 0.04], mid: [0.83, 0.66, 0.26], hi: [0.99, 0.91, 0.55], css: ['#5c430e', '#d4a843', '#f6e27a'] },
    cobre:  { lo: [0.26, 0.11, 0.05], mid: [0.72, 0.45, 0.20], hi: [1.00, 0.72, 0.52], css: ['#421c0d', '#b87333', '#ffb885'] },
    bronze: { lo: [0.22, 0.16, 0.06], mid: [0.60, 0.45, 0.22], hi: [0.93, 0.81, 0.55], css: ['#382910', '#9a7338', '#edcf8c'] },
    niquel: { lo: [0.14, 0.13, 0.11], mid: [0.66, 0.62, 0.54], hi: [0.95, 0.93, 0.86], css: ['#24211c', '#a89e8a', '#f2ecdc'] },
    cromo:  { lo: [0.05, 0.07, 0.11], mid: [0.62, 0.70, 0.82], hi: [1.00, 1.00, 1.00], css: ['#141c2b', '#9fb3d1', '#ffffff'] },
    zinco:  { lo: [0.09, 0.12, 0.14], mid: [0.44, 0.53, 0.58], hi: [0.78, 0.87, 0.91], css: ['#243036', '#708894', '#c7dde8'] }
  };
  var cur = { lo: FIN.ouro.lo.slice(), mid: FIN.ouro.mid.slice(), hi: FIN.ouro.hi.slice() };
  var tgt = FIN.ouro;

  document.querySelectorAll('.fin').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.fin').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      tgt = FIN[b.dataset.f];
      var root = document.documentElement.style;
      root.setProperty('--m-dark', tgt.css[0]);
      root.setProperty('--m-mid', tgt.css[1]);
      root.setProperty('--m-hi', tgt.css[2]);
    });
  });

  var mx = 0.5, my = 0.45, tx = 0.5, ty = 0.45, hasMouse = false;
  art.addEventListener('mousemove', function (ev) {
    var r = art.getBoundingClientRect();
    tx = (ev.clientX - r.left) / r.width;
    ty = 1.0 - (ev.clientY - r.top) / r.height;
    hasMouse = true;
  });

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var start = performance.now();

  function lerp3(a, b, k) { a[0] += (b[0] - a[0]) * k; a[1] += (b[1] - a[1]) * k; a[2] += (b[2] - a[2]) * k; }

  function frame(now) {
    var t = (now - start) / 1000;
    if (!hasMouse) { tx = 0.5 + 0.22 * Math.sin(t * 0.23); ty = 0.45 + 0.16 * Math.cos(t * 0.19); }
    mx += (tx - mx) * 0.045; my += (ty - my) * 0.045;
    lerp3(cur.lo, tgt.lo, 0.035); lerp3(cur.mid, tgt.mid, 0.035); lerp3(cur.hi, tgt.hi, 0.035);
    gl.uniform1f(uT, t);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mx, my);
    gl.uniform3fv(uLo, cur.lo);
    gl.uniform3fv(uMid, cur.mid);
    gl.uniform3fv(uHi, cur.hi);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduced) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
