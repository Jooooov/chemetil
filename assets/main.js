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

  /* ---------- contacto (endereço montado em JS — invisível a scrapers) ---------- */
  var ADDR = ['chemetil', 'gmail.com'].join('@');
  var mailbtn = document.getElementById('mailbtn');
  if (mailbtn) mailbtn.addEventListener('click', function (ev) {
    ev.preventDefault();
    location.href = 'mailto:' + ADDR;
  });
  var cform = document.getElementById('cform');
  var fmsg = document.getElementById('fmsg');
  var FMSG = {
    pt: { ok: 'Mensagem enviada. Respondemos em breve.', err: 'Não foi possível enviar — use o botão "Abrir no seu email".', req: 'Preencha nome, email e mensagem.' },
    en: { ok: 'Message sent. We will reply shortly.', err: 'Could not send — use the "Open in your email" button.', req: 'Please fill in name, email and message.' },
    es: { ok: 'Mensaje enviado. Respondemos en breve.', err: 'No se pudo enviar — use el botón "Abrir en su email".', req: 'Rellene nombre, email y mensaje.' }
  };
  if (cform) cform.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var m = FMSG[document.documentElement.lang] || FMSG.pt;
    var f = new FormData(cform);
    if (!f.get('name') || !f.get('email') || !f.get('message')) { fmsg.textContent = m.req; return; }
    if (f.get('_honey')) return;
    fmsg.textContent = '…';
    fetch('https://formsubmit.co/ajax/' + ADDR, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: f
    }).then(function (r) { return r.json(); }).then(function (j) {
      fmsg.textContent = (j && (j.success === 'true' || j.success === true)) ? m.ok : m.err;
      if (j && (j.success === 'true' || j.success === true)) cform.reset();
    }).catch(function () { fmsg.textContent = m.err; });
  });

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
    cobre:  { lo: [0.24, 0.08, 0.04], mid: [0.80, 0.38, 0.22], hi: [1.00, 0.72, 0.58], css: ['#3d140a', '#cc6138', '#ffb894'] },
    bronze: { lo: [0.16, 0.11, 0.05], mid: [0.49, 0.33, 0.15], hi: [0.85, 0.66, 0.42], css: ['#2f1e0a', '#7d5525', '#d9a86c'] },
    niquel: { lo: [0.14, 0.13, 0.11], mid: [0.66, 0.62, 0.54], hi: [0.95, 0.93, 0.86], css: ['#24211c', '#a89e8a', '#f2ecdc'] },
    cromo:  { lo: [0.05, 0.07, 0.11], mid: [0.62, 0.70, 0.82], hi: [1.00, 1.00, 1.00], css: ['#141c2b', '#9fb3d1', '#ffffff'] },
    zinco:  { lo: [0.09, 0.12, 0.14], mid: [0.44, 0.53, 0.58], hi: [0.78, 0.87, 0.91], css: ['#243036', '#708894', '#c7dde8'] }
  };
  var cur = { lo: FIN.ouro.lo.slice(), mid: FIN.ouro.mid.slice(), hi: FIN.ouro.hi.slice() };
  var tgt = FIN.ouro;

  var reducedFin = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hEls = document.querySelectorAll('.hero-core .m-anchor, .hero-core .bond');
  var fillEl = document.querySelector('.hero-core .hero-fill');
  function replayH() {
    if (reducedFin) return;
    if (fillEl) {
      fillEl.style.animation = 'none';
      void fillEl.offsetWidth;
      fillEl.style.animation = 'plate 1.6s cubic-bezier(.55,.06,.28,1) .1s forwards, sheen 7s linear 1.8s infinite';
    }
    hEls.forEach(function (el) {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = 'methyl-in 1.2s ease 1.4s forwards';
    });
  }

  function applyFinish(key) {
    document.querySelectorAll('.fin').forEach(function (x) { x.classList.toggle('on', x.dataset.f === key); });
    tgt = FIN[key];
    var root = document.documentElement.style;
    root.setProperty('--m-dark', tgt.css[0]);
    root.setProperty('--m-mid', tgt.css[1]);
    root.setProperty('--m-hi', tgt.css[2]);
    replayH();
  }

  /* auto-play: roda os acabamentos até o utilizador escolher um */
  var ORDER = ['ouro', 'cobre', 'bronze', 'niquel', 'cromo', 'zinco'];
  var autoIdx = 0, autoTimer = null;
  if (!reducedFin) {
    autoTimer = setInterval(function () {
      if (document.hidden) return;
      autoIdx = (autoIdx + 1) % ORDER.length;
      applyFinish(ORDER[autoIdx]);
    }, 7000);
  }

  document.querySelectorAll('.fin').forEach(function (b) {
    b.addEventListener('click', function () {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
      applyFinish(b.dataset.f);
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

/* ---------- peças de metal 3D na galeria ---------- */
(function () {
  'use strict';
  var RF = {
    ouro:   { dk:[0.23,0.16,0.04], mid:[0.83,0.66,0.26], hi:[0.99,0.91,0.55] },
    cobre:  { dk:[0.26,0.11,0.05], mid:[0.72,0.45,0.20], hi:[1.00,0.72,0.52] },
    bronze: { dk:[0.16,0.11,0.05], mid:[0.49,0.33,0.15], hi:[0.85,0.66,0.42] },
    niquel: { dk:[0.14,0.13,0.11], mid:[0.66,0.62,0.54], hi:[0.95,0.93,0.86] },
    cromo:  { dk:[0.05,0.07,0.11], mid:[0.62,0.70,0.82], hi:[1.00,1.00,1.00] },
    zinco:  { dk:[0.09,0.12,0.14], mid:[0.44,0.53,0.58], hi:[0.78,0.87,0.91] },
    gunmetal:     { dk:[0.05,0.06,0.09], mid:[0.29,0.32,0.38], hi:[0.72,0.77,0.86] },
    brancobronze: { dk:[0.28,0.25,0.20], mid:[0.79,0.75,0.65], hi:[0.98,0.96,0.89] },
    oxid:         { dk:[0.03,0.02,0.02], mid:[0.18,0.15,0.13], hi:[0.52,0.44,0.36] }
  };
  function torus(R, r, nu, nv) {
    var pos = [], nor = [], idx = [];
    for (var i = 0; i <= nu; i++) {
      var u = i / nu * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
      for (var j = 0; j <= nv; j++) {
        var v = j / nv * Math.PI * 2, cv2 = Math.cos(v), sv = Math.sin(v);
        pos.push((R + r * cv2) * cu, (R + r * cv2) * su, r * sv);
        nor.push(cv2 * cu, cv2 * su, sv);
      }
    }
    for (i = 0; i < nu; i++) for (var j2 = 0; j2 < nv; j2++) {
      var a = i * (nv + 1) + j2, b = a + nv + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
  }
  var MESH = torus(0.62, 0.3, 56, 28);
  var VS = 'attribute vec3 p; attribute vec3 n; uniform mat3 rot; varying vec3 vn;' +
    'void main(){ vec3 q = rot * p; vn = rot * n; gl_Position = vec4(q.xy * 0.85, q.z * 0.25, 1.0); }';
  var FS = 'precision mediump float; varying vec3 vn; uniform vec3 dk; uniform vec3 mid; uniform vec3 hi;' +
    'void main(){ vec3 n = normalize(vn); vec3 v = vec3(0.0,0.0,1.0);' +
    'vec3 l1 = normalize(vec3(0.5,0.7,0.6));' +
    'float sp1 = pow(max(dot(reflect(-l1,n),v),0.0), 110.0);' +
    'float fres = pow(1.0-max(dot(n,v),0.0), 2.8);' +
    'vec3 r = reflect(-v, n);' +
    'float m2 = 2.0*sqrt(r.x*r.x + r.y*r.y + (r.z+1.0)*(r.z+1.0));' +
    'vec2 muv = r.xy/m2 + 0.5;' +
    'float sky = smoothstep(0.34, 0.78, muv.y);' +
    'float st1 = exp(-pow((muv.y-0.70)*9.0, 2.0));' +
    'float st2 = exp(-pow((muv.y-0.34)*15.0, 2.0));' +
    'float st3 = exp(-pow((muv.x-0.24)*11.0, 2.0))*0.35;' +
    'vec3 col = mix(dk*0.65, mid, 0.2 + 0.62*sky);' +
    'col = mix(col, dk*0.45, smoothstep(0.30, 0.04, muv.y)*0.65);' +
    'col += hi*(st1*0.95 + st2*0.4 + st3);' +
    'col += sp1*hi*1.3 + fres*hi*0.35;' +
    'col = pow(col, vec3(0.9));' +
    'gl_FragColor = vec4(col, 1.0); }';
  function mat3rot(ax, ay) {
    var cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
    return new Float32Array([cy, 0, -sy, sx * sy, cx, sx * cy, cx * sy, -sx, cx * cy]);
  }
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('canvas.swatch3d').forEach(function (cv) {
    var gl = cv.getContext('webgl', { antialias: true });
    var f = RF[cv.dataset.f];
    if (!gl || !f) { cv.style.background = 'radial-gradient(circle at 32% 30%, #777, #333)'; cv.style.borderRadius = '50%'; return; }
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr); gl.useProgram(pr);
    function buf(t, d) { var b = gl.createBuffer(); gl.bindBuffer(t, b); gl.bufferData(t, d, gl.STATIC_DRAW); return b; }
    buf(gl.ARRAY_BUFFER, MESH.pos);
    var lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 3, gl.FLOAT, false, 0, 0);
    buf(gl.ARRAY_BUFFER, MESH.nor);
    var ln = gl.getAttribLocation(pr, 'n'); gl.enableVertexAttribArray(ln); gl.vertexAttribPointer(ln, 3, gl.FLOAT, false, 0, 0);
    buf(gl.ELEMENT_ARRAY_BUFFER, MESH.idx);
    gl.uniform3fv(gl.getUniformLocation(pr, 'dk'), f.dk);
    gl.uniform3fv(gl.getUniformLocation(pr, 'mid'), f.mid);
    gl.uniform3fv(gl.getUniformLocation(pr, 'hi'), f.hi);
    var uRot = gl.getUniformLocation(pr, 'rot');
    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(0, 0, 0, 0);
    var ax = 0.9, ay = 0, vx = 0, vy = 0.008, drag = null, visible = false, raf = null;
    cv.addEventListener('mousedown', function (e) { e.preventDefault(); drag = [e.clientX, e.clientY]; cv.style.cursor = 'grabbing'; });
    window.addEventListener('mouseup', function () { drag = null; cv.style.cursor = 'grab'; });
    window.addEventListener('mousemove', function (e) {
      if (!drag) return;
      vy = (e.clientX - drag[0]) * 0.004; vx = (e.clientY - drag[1]) * 0.004;
      drag = [e.clientX, e.clientY];
    });
    function frame() {
      raf = null;
      ax += vx; ay += vy;
      if (!drag) { vx *= 0.95; vy = vy * 0.95 + 0.008 * 0.05; }
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix3fv(uRot, false, mat3rot(ax, ay));
      gl.drawElements(gl.TRIANGLES, MESH.idx.length, gl.UNSIGNED_SHORT, 0);
      if (visible && !reduced) raf = requestAnimationFrame(frame);
    }
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    }, { threshold: 0.05 }).observe(cv);
    frame();
  });
})();
