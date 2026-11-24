/* RAMOS story site: live 3D scenes (three.js r128).
 * One shared WebGL renderer. Each 3D scene builds its own THREE.Scene and
 * camera, and the renderer's canvas moves into whichever 3D stage is most
 * visible. Numbers and chips stay in an SVG overlay above the canvas, drawn
 * from the ledger like everywhere else. Equipment is generic: no brands.
 * If WebGL is not available, the drawn schematics in scenes-1/2.js stay.
 */
(function () {
  'use strict';
  const R = window.RAMOS, S = R.svg, D = R.data;
  if (!window.THREE) { console.warn('[RAMOS] three.js not loaded, keeping schematics'); return; }
  const T = window.THREE;
  let renderer;
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('no webgl');
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { console.warn('[RAMOS] WebGL unavailable, keeping schematics'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .74;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';

  const fo = R.foL;
  const stat = (parent, x, y, w, h, html) => fo(parent, x, y, w, h, `<div class="statbox">${html}</div>`);
  const clamp = R.clamp, seg = R.seg, ease = R.ease, lerp = R.lerp;

  /* ---------------- helpers ---------------- */
  function cssColor(sec, name, fallback) {
    const v = getComputedStyle(sec).getPropertyValue(name).trim();
    const c = new T.Color();
    try { c.set(v || fallback || '#888'); } catch (e) { c.set(fallback || '#888'); }
    return c;
  }
  const std = (color, rough, metal, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: rough === undefined ? .85 : rough, metalness: metal || 0 }, extra || {}));
  function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
  }
  const fbm = (x, y) => vnoise(x, y) * .55 + vnoise(x * 2.1, y * 2.1) * .3 + vnoise(x * 4.3, y * 4.3) * .15;
  function terrain(w, d, seg, amp, scale, color, tint) {
    if (window.RAMOS3_COMPACT) { w = Math.min(w, RAMOS3_COMPACT.w); d = Math.min(d, RAMOS3_COMPACT.d); seg = Math.min(seg, 80); }
    const g = new T.PlaneGeometry(w, d, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, cols = [];
    const base = new T.Color(color), t2 = new T.Color(tint || color);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const n = fbm(x * scale + 3, z * scale + 7);
      pos.setY(i, (n - .5) * amp);
      const c = base.clone().lerp(t2, clamp(fbm(x * .3, z * .3) * 1.4 - .2));
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    const m = new T.Mesh(g, std(0xffffff, .95, 0, { vertexColors: true }));
    m.receiveShadow = true;
    m.userData.h = (x, z) => (fbm(x * scale + 3, z * scale + 7) - .5) * amp;
    return m;
  }
  function lights(scene, o) {
    o = o || {};
    if (window.RAMOS3_COMPACT) { const sun = new T.Object3D(); sun.target = new T.Object3D(); return { hemi: new T.Object3D(), sun }; }
    const hemi = new T.HemisphereLight(o.sky || 0xdfe6ee, o.ground || 0x4a3f30, (o.hemi || .55) * .8);
    scene.add(hemi);
    const sun = new T.DirectionalLight(o.sun || 0xfff1dc, (o.sunI || 1.6) * 1.25);
    sun.position.set(...(o.dir || [12, 18, 8]));
    sun.castShadow = true;
    const s = o.shadow || 22;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: .5, far: 120 });
    sun.shadow.mapSize.set(o.map || 1536, o.map || 1536);
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = .02;
    scene.add(sun);
    // keynote: a cool rim light from behind and a soft fill, so objects lift off the black
    const rim = new T.DirectionalLight(o.rimC || 0xbcd4ff, o.rim === undefined ? .9 : o.rim);
    const d = o.dir || [12, 18, 8]; rim.position.set(-d[0] * .8, d[1] * .7, -d[2] * 1.6 - 10); scene.add(rim);
    return { hemi, sun, rim };
  }
  const sticks = new T.CylinderGeometry(.018, .028, 1, 5);
  sticks.translate(0, .5, 0);
  // a pile of prunings: instanced sticks in a mound; mesh.count grows it
  function pileMesh(color, n, radius, height, seed, len) {
    const rnd = R.rand(seed || 3);
    const mesh = new T.InstancedMesh(sticks, std(color, .9), n);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3();
    const tint = new T.Color();
    for (let i = 0; i < n; i++) {
      const k = i / n, a = rnd() * Math.PI * 2, r = radius * Math.sqrt(rnd()) * (1 - k * .55);
      const y = height * (k * .9 + rnd() * .1) * (1 - (r / radius) ** 2 * .7);
      p.set(Math.cos(a) * r, Math.max(0, y), Math.sin(a) * r);
      e.set((rnd() - .5) * 2.6 + Math.PI / 2, rnd() * 6.28, (rnd() - .5) * 1.2);
      q.setFromEuler(e);
      const L = (len || 1.1) * (.5 + rnd() * .8);
      s.set(.7 + rnd() * .8, L, .7 + rnd() * .8);
      m.compose(p, q, s); mesh.setMatrixAt(i, m);
      tint.copy(new T.Color(color)).offsetHSL(0, (rnd() - .5) * .1, (rnd() - .5) * .12);
      mesh.setColorAt(i, tint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }
  function oliveTree(seed, barkC, leafC) {
    const rnd = R.rand(seed);
    const g = new T.Group();
    const bark = std(barkC, .95);
    const pts = [];
    for (let i = 0; i <= 5; i++) pts.push(new T.Vector3((rnd() - .5) * .35, i * .42, (rnd() - .5) * .35));
    const trunk = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, .2, 7, false), bark);
    trunk.castShadow = true; g.add(trunk);
    const top = pts[pts.length - 1];
    const leaf = std(leafC, .8, 0, { flatShading: true });
    for (let b = 0; b < 4; b++) {
      const a = b / 4 * 6.28 + rnd();
      const end = new T.Vector3(top.x + Math.cos(a) * 1.3, top.y + .6 + rnd() * .5, top.z + Math.sin(a) * 1.3);
      const limb = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([top.clone().add(new T.Vector3(0, -.3, 0)), top.clone().lerp(end, .5).add(new T.Vector3(0, .25, 0)), end]), 8, .09, 5, false), bark);
      limb.castShadow = true; g.add(limb);
      for (let k = 0; k < 3; k++) {
        const ic = new T.IcosahedronGeometry(.55 + rnd() * .35, 1);
        const pa = ic.attributes.position;
        for (let i = 0; i < pa.count; i++) pa.setXYZ(i, pa.getX(i) * (1 + (rnd() - .5) * .35), pa.getY(i) * (.7 + (rnd() - .5) * .2), pa.getZ(i) * (1 + (rnd() - .5) * .35));
        ic.computeVertexNormals();
        const blob = new T.Mesh(ic, leaf);
        blob.position.copy(end).add(new T.Vector3((rnd() - .5) * .9, (rnd() - .2) * .5, (rnd() - .5) * .9));
        blob.castShadow = true; blob.receiveShadow = true;
        g.add(blob);
      }
    }
    g.userData.crown = top.clone().add(new T.Vector3(0, .9, 0));
    return g;
  }
  function person(vest, skin, dark) {
    const g = new T.Group();
    const legM = std(dark, .9), vestM = std(vest, .6, 0, { emissive: vest, emissiveIntensity: .12 });
    [-.11, .11].forEach(x => { const l = new T.Mesh(new T.CylinderGeometry(.075, .07, .85, 8), legM); l.position.set(x, .43, 0); l.castShadow = true; g.add(l); });
    const body = new T.Mesh(new T.CylinderGeometry(.2, .18, .65, 10), vestM); body.position.y = 1.18; body.castShadow = true; g.add(body);
    const band = new T.Mesh(new T.CylinderGeometry(.205, .205, .05, 10), std(0xdddddd, .3, .2, { emissive: 0x666666, emissiveIntensity: .4 })); band.position.y = 1.05; g.add(band);
    const head = new T.Mesh(new T.SphereGeometry(.13, 14, 12), std(skin, .7)); head.position.y = 1.66; head.castShadow = true; g.add(head);
    const cap = new T.Mesh(new T.SphereGeometry(.14, 12, 8, 0, 6.28, 0, 1.4), std(dark, .8)); cap.position.y = 1.7; g.add(cap);
    const arms = [];
    [-.26, .26].forEach(x => { const a = new T.Mesh(new T.CylinderGeometry(.055, .05, .6, 8), vestM); a.geometry.translate(0, -.3, 0); a.position.set(x, 1.45, 0); a.castShadow = true; g.add(a); arms.push(a); });
    g.userData.arms = arms;
    return g;
  }
  function wheel(r, w, rubber, hub) {
    const g = new T.Group();
    const t = new T.Mesh(new T.CylinderGeometry(r, r, w, 22), rubber); t.rotation.z = Math.PI / 2; t.castShadow = true; g.add(t);
    const h = new T.Mesh(new T.CylinderGeometry(r * .55, r * .55, w + .02, 14), hub); h.rotation.z = Math.PI / 2; g.add(h);
    return g;
  }
  // generic rigid tipper truck, facing +x; body interior box returned for loading
  function truck(cabC, bodyC, opts) {
    opts = opts || {};
    const g = new T.Group();
    const cabM = std(cabC, .45, .3), steel = std(bodyC, .55, .55), dark = std(0x1d1f22, .8), glass = std(0x22303a, .15, .6), rubber = std(0x151515, .95), hub = std(0x9aa0a6, .4, .7);
    const chassis = new T.Mesh(new T.BoxGeometry(6.4, .3, 1.5), dark); chassis.position.set(0, .75, 0); chassis.castShadow = true; g.add(chassis);
    const cab = new T.Mesh(new T.BoxGeometry(1.7, 1.9, 2.2), cabM); cab.position.set(2.45, 1.85, 0); cab.castShadow = true; g.add(cab);
    const ws = new T.Mesh(new T.BoxGeometry(.05, .8, 1.9), glass); ws.position.set(3.31, 2.25, 0); g.add(ws);
    [-1.11, 1.11].forEach(z => { const sw = new T.Mesh(new T.BoxGeometry(.9, .6, .03), glass); sw.position.set(2.6, 2.3, z); g.add(sw); });
    const bumper = new T.Mesh(new T.BoxGeometry(.2, .35, 2.2), dark); bumper.position.set(3.35, .95, 0); g.add(bumper);
    const L = 4.2, H = 1.2, W = 2.3, x0 = -.95;
    const floor = new T.Mesh(new T.BoxGeometry(L, .1, W), steel); floor.position.set(x0, 1.0, 0); floor.receiveShadow = true; g.add(floor);
    const front = new T.Mesh(new T.BoxGeometry(.1, H + .3, W), steel); front.position.set(x0 + L / 2, 1.0 + (H + .3) / 2, 0); g.add(front);
    const tail = new T.Mesh(new T.BoxGeometry(.1, H, W), steel); tail.position.set(x0 - L / 2, 1.0 + H / 2, 0); g.add(tail);
    const sideMat = opts.cutaway ? std(bodyC, .5, .5, { transparent: true, opacity: .22, depthWrite: false }) : steel;
    const near = new T.Mesh(new T.BoxGeometry(L, H, .08), sideMat); near.position.set(x0, 1.0 + H / 2, W / 2); g.add(near);
    const far = new T.Mesh(new T.BoxGeometry(L, H, .08), steel); far.position.set(x0, 1.0 + H / 2, -W / 2); g.add(far);
    [front, tail, far].forEach(m => { m.castShadow = true; m.receiveShadow = true; });
    for (let i = 0; i < 5; i++) { const rib = new T.Mesh(new T.BoxGeometry(.06, H, .12), steel); rib.position.set(x0 - L / 2 + .4 + i * .85, 1.0 + H / 2, -W / 2 - .05); g.add(rib); }
    [[2.4, 1.05], [2.4, -1.05], [-1.6, 1.05], [-1.6, -1.05], [-2.6, 1.05], [-2.6, -1.05]].forEach(([x, z]) => { const w = wheel(.5, .35, rubber, hub); w.position.set(x, .5, z); g.add(w); });
    g.userData.body = { x0: x0 - L / 2 + .1, x1: x0 + L / 2 - .1, y0: 1.05, y1: 1.0 + H, z0: -W / 2 + .1, z1: W / 2 - .1 };
    return g;
  }
  function chipper(c) {
    const g = new T.Group();
    const m = std(c, .5, .45), dark = std(0x1d1f22, .8), rubber = std(0x151515, .95), hub = std(0x9aa0a6, .4, .7);
    const frame = new T.Mesh(new T.BoxGeometry(2.4, .2, 1.1), dark); frame.position.set(0, .6, 0); g.add(frame);
    const drum = new T.Mesh(new T.CylinderGeometry(.55, .55, .9, 24), m); drum.rotation.x = Math.PI / 2; drum.position.set(.2, 1.25, 0); drum.castShadow = true; g.add(drum);
    const engine = new T.Mesh(new T.BoxGeometry(.9, .7, .95), m); engine.position.set(.95, 1.05, 0); engine.castShadow = true; g.add(engine);
    const hop = new T.Mesh(new T.CylinderGeometry(.75, .35, .9, 4, 1, true), std(c, .6, .4, { side: T.DoubleSide })); hop.rotation.z = Math.PI / 2; hop.rotation.x = Math.PI / 4; hop.position.set(-.85, 1.15, 0); hop.castShadow = true; g.add(hop);
    const table = new T.Mesh(new T.BoxGeometry(.7, .06, .9), dark); table.position.set(-1.55, 1.0, 0); g.add(table);
    const chuteCurve = new T.CatmullRomCurve3([new T.Vector3(.2, 1.7, 0), new T.Vector3(.4, 2.6, 0), new T.Vector3(1.2, 3.0, 0), new T.Vector3(1.7, 2.85, 0)]);
    const chute = new T.Mesh(new T.TubeGeometry(chuteCurve, 20, .16, 10, false), m); chute.castShadow = true; g.add(chute);
    const bar = new T.Mesh(new T.BoxGeometry(1.4, .1, .1), dark); bar.position.set(1.9, .65, 0); g.add(bar);
    [.6, -.6].forEach(z => { const w = wheel(.4, .25, rubber, hub); w.position.set(0, .4, z); g.add(w); });
    g.userData.chute = chuteCurve;
    return g;
  }
  function ground(w, d, color) {
    if (window.RAMOS3_COMPACT) { w = Math.min(w, RAMOS3_COMPACT.w); d = Math.min(d, RAMOS3_COMPACT.d); }
    const m = new T.Mesh(new T.PlaneGeometry(w, d), std(color, .95));
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m;
  }
  function track(len, w, color) {     // dirt track with two ruts
    const g = new T.Group();
    const base = new T.Mesh(new T.PlaneGeometry(len, w, 60, 6), std(color, 1));
    base.rotation.x = -Math.PI / 2; base.position.y = .01; base.receiveShadow = true;
    const pa = base.geometry.attributes.position;
    for (let i = 0; i < pa.count; i++) pa.setZ(i, (hash(pa.getX(i), pa.getY(i)) - .5) * .04);
    base.geometry.computeVertexNormals();
    g.add(base);
    [-.75, .75].forEach(z => { const r = new T.Mesh(new T.PlaneGeometry(len, .35), std(new T.Color(color).multiplyScalar(.78), 1)); r.rotation.x = -Math.PI / 2; r.position.set(0, .02, z); r.receiveShadow = true; g.add(r); });
    return g;
  }
  function overlayWrap(sec, rect) {
    const stage = sec.querySelector('.stage');
    const fig = stage.querySelector('figure');
    const svg = fig.querySelector('svg.viz');
    let wrap = fig.querySelector('.v3');
    if (!wrap) {
      wrap = R.html('div', { class: 'v3' });
      fig.insertBefore(wrap, svg);
      const host = R.html('div', { class: 'v3host' }, wrap);
      wrap.appendChild(svg);
      wrap._host = host;
    }
    const [x, y, w, h] = rect || [0, 0, 1, 1];
    Object.assign(wrap._host.style, { left: x * 100 + '%', top: y * 100 + '%', width: w * 100 + '%', height: h * 100 + '%' });
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.classList.add('over3d');
    return { svg, host: wrap._host };
  }

  /* ---------------- manager ---------------- */
  const list = [];
  let current = null;
  const defs = {};
  function add(id, def) {
    defs[id] = def;
    const old = R.scenes[id];
    R.scene(id, {
      data: (old && old.data || []).concat(def.data || []).filter((v, i, a) => a.indexOf(v) === i),
      live: true,
      init(svgOld, sec) {
        const { svg, host } = overlayWrap(sec, def.rect);
        const scene = new T.Scene();
        const camera = new T.PerspectiveCamera(def.fov || 38, 1.6, def.near || .1, def.far || 600);
        const ctx = { sec, svg, host, scene, camera, C: (n, f) => cssColor(sec, n, f), p: 0, t: 0 };
        def.build(ctx);
        const entry = { id, sec, ctx, def };
        list.push(entry);
        sec._r3 = entry;
      },
      update(p, t) {
        const e = R.scenes[id] && list.find(x => x.id === id);
        if (!e) return;
        e.ctx.p = p; e.ctx.t = t || 0;
        if (def.overlay) def.overlay(e.ctx, p, t || 0);
        e.dirty = true;
      }
    });
  }
  function frame() {
    // pick the most visible 3D scene and draw only that one
    let best = null, bestA = 0;
    const vh = window.innerHeight;
    list.forEach(e => {
      if (e.progress) e.ctx.p = e.progress();
      const r = e.ctx.host.getBoundingClientRect();
      const a = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      if (a > bestA) { bestA = a; best = e; }
    });
    if (best && bestA > 20) {
      const host = best.ctx.host;
      if (canvas.parentNode !== host) host.appendChild(canvas);
      const w = host.clientWidth, h = host.clientHeight;
      if (w > 0 && h > 0) {
        const sz = renderer.getSize(new T.Vector2());
        if (sz.x !== w || sz.y !== h) renderer.setSize(w, h, false);
        best.ctx.camera.aspect = w / h; best.ctx.camera.updateProjectionMatrix();
        best.def.update(best.ctx, R.reduced() ? 1 : best.ctx.p, best.ctx.t);
        renderer.render(best.ctx.scene, best.ctx.camera);
      }
      current = best;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.RAMOS3 = { add, T, defs, renderer, helpers: { lights, terrain, ground, track, pileMesh, oliveTree, cssColor } };

  /* ======================= S01 hero: a smouldering pile at night ======================= */
  (function hero() {
    const H = (window.RAMOS_CONFIG || {}).HERO || {};
    const sec = document.getElementById('s01');
    const host = document.getElementById('hero-bg');
    if (H.src || !sec || !host) return;
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(34, 1.6, .1, 300);
    const ctx = { sec, host, scene, camera, C: (n, f) => cssColor(sec, n, f), p: 0, t: 0 };
    scene.fog = new T.FogExp2(0x0b0f16, .045);
    scene.add(new T.HemisphereLight(0x3a4a66, 0x0a0806, .55));
    const moon = new T.DirectionalLight(0x8fa6d6, .55); moon.position.set(-8, 14, -10); scene.add(moon);
    const fire = new T.PointLight(0xff7a2a, 3.2, 16, 1.6); fire.position.set(.6, .9, 1.4); fire.castShadow = true;
    fire.shadow.mapSize.set(1024, 1024); scene.add(fire);
    const ter = terrain(80, 60, 70, 1.1, .08, '#2a2a1e', '#1e2418'); scene.add(ter);
    // olive trees as dark silhouettes behind
    const rnd = R.rand(3);
    for (let i = 0; i < 9; i++) {
      const tr = oliveTree(70 + i, '#2a221c', '#2c3524');
      const x = -14 + i * 4 + (rnd() - .5) * 2, z = -7 - rnd() * 8;
      tr.position.set(x, ter.userData.h(x, z) - .1, z); tr.scale.setScalar(1.3 + rnd() * .4); tr.rotation.y = rnd() * 6;
      scene.add(tr);
    }
    // the pile of olive prunings, and a burning edge in front
    // the pile of olive prunings: real branch shapes with leaves
    const pile = window.RAMOS3M.prunings(520, 1.5, .95, 41, { len: 1.3 });
    pile.position.set(-.2, 0, -.1); pile.scale.setScalar(1.15);
    scene.add(pile);
    const coals = new T.InstancedMesh(new T.DodecahedronGeometry(.07, 0), new T.MeshStandardMaterial({ color: 0x220a02, emissive: 0xff6a20, emissiveIntensity: 3, roughness: .8 }), 120);
    const m4 = new T.Matrix4();
    for (let i = 0; i < 120; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 1.1; m4.makeTranslation(.6 + Math.cos(a) * r, .05 + rnd() * .25, 1.6 + Math.sin(a) * r * .6); coals.setMatrixAt(i, m4); }
    scene.add(coals);
    const flameM = new T.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false });
    const flames = Array.from({ length: 7 }, (_, i) => { const f = new T.Mesh(new T.ConeGeometry(.22 + rnd() * .15, .9 + rnd() * .8, 10, 1, true), flameM); f.position.set(.2 + rnd() * .9, .45, 1.3 + rnd() * .5); scene.add(f); return f; });
    // sparks and smoke
    const N = 260, sp = new Float32Array(N * 3), seed = Array.from({ length: N }, (_, i) => [hash(i, 1), hash(i, 2), hash(i, 3)]);
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g2 = cv.getContext('2d'); const rg = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(.4, 'rgba(255,255,255,.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = rg; g2.fillRect(0, 0, 64, 64);
    const dot = new T.CanvasTexture(cv);
    const sparks = new T.Points(sg, new T.PointsMaterial({ map: dot, color: 0xffb35c, size: .09, transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false }));
    scene.add(sparks);
    const SM = 90, smp = new Float32Array(SM * 3);
    const smg = new T.BufferGeometry(); smg.setAttribute('position', new T.BufferAttribute(smp, 3));
    const smoke = new T.Points(smg, new T.PointsMaterial({ map: dot, color: 0x6a7078, size: 2.4, transparent: true, opacity: .12, depthWrite: false }));
    scene.add(smoke);
    const def = {
      update(c, p, t) {
        camera.position.set(lerp(-6.5, -3, p), lerp(2.6, 1.9, p), lerp(14, 9.5, p));
        camera.lookAt(-1.6, 1.2, 0);
        const fl = .8 + .2 * Math.sin(t / 90) * Math.sin(t / 37 + 1);
        fire.intensity = 3.2 * fl;
        coals.material.emissiveIntensity = 2.6 + .8 * Math.sin(t / 300);
        flames.forEach((f, i) => { f.scale.y = .7 + .4 * Math.abs(Math.sin(t / (120 + i * 17) + i)); f.rotation.y = t / 500 + i; });
        for (let i = 0; i < N; i++) {
          const [a, b, cc] = seed[i], k = ((t / (2600 + a * 1800)) + a) % 1;
          sp[i * 3] = .6 + (b - .5) * 1.2 + Math.sin(k * 6 + cc * 9) * .3 * k;
          sp[i * 3 + 1] = .3 + k * 4.5;
          sp[i * 3 + 2] = 1.5 + (cc - .5) * .8 + k * .4;
        }
        sg.attributes.position.needsUpdate = true;
        for (let i = 0; i < SM; i++) {
          const k = ((t / 9000) + hash(i, 7)) % 1;
          smp[i * 3] = .6 + (hash(i, 8) - .5) * 1.5 + k * 2.5; smp[i * 3 + 1] = 1 + k * 6; smp[i * 3 + 2] = 1.2 + (hash(i, 9) - .5) * 1.5;
        }
        smg.attributes.position.needsUpdate = true;
      }
    };
    const entry = { id: 'hero', sec, ctx, def, progress: () => {
      const top = sec.offsetTop, h = sec.offsetHeight;
      return clamp((window.scrollY - top) / Math.max(1, h - window.innerHeight));
    } };
    list.push(entry);
  })();

  const MM = window.RAMOS3M;

  /* ======================= S07 olive grove in winter ======================= */
  add('s07', {
    rect: [0, 0, 1, 1],
    build(c) {
      const { scene, C } = c;
      scene.fog = new T.Fog(new T.Color('#000000'), 26, 70);
      lights(scene, { dir: [-14, 11, 10], sunI: .95, sun: 0xfff6ea, sky: 0xcfd8e0, ground: 0x3a3626, hemi: .45, rim: .45, shadow: 26, map: 2048 });
      const ter = terrain(120, 80, 110, 3.0, .045, '#6b6a3e', '#4c5a30');
      scene.add(ter); c.ter = ter;
      scene.add(MM.grass(5000, 90, 60, ter.userData.h, 4, '#76824c', '#a29d63'));
      c.trees = [];
      const rnd = R.rand(11);
      for (let i = -3; i <= 2; i++) for (let j = -2; j <= 1; j++) {
        const x = i * 10 + (rnd() - .5) * 3, z = j * 10 + (rnd() - .5) * 3;
        const tr = MM.oliveTree(20 + i * 7 + j * 3);
        tr.position.set(x, ter.userData.h(x, z) - .05, z);
        tr.rotation.y = rnd() * 6; tr.scale.setScalar(1.1 + rnd() * .3);
        scene.add(tr); c.trees.push(tr);
        // bare soil ring under each tree, as in a worked grove
        const ring = new T.Mesh(new T.CircleGeometry(2.4, 24), MM.std('#8a7457', 1)); ring.rotation.x = -Math.PI / 2; ring.position.set(x, ter.userData.h(x, z) + .03, z); ring.receiveShadow = true; scene.add(ring);
      }
      c.pileAt = new T.Vector3(1.5, ter.userData.h(1.5, 8.5) + .02, 8.5);
      c.pile = MM.prunings(240, 1.5, .85, 4); c.pile.position.copy(c.pileAt); scene.add(c.pile);
      // falling branches from the nearest crowns
      const twigMat = MM.std(0xffffff, .85, 0, { vertexColors: true, side: T.DoubleSide });
      const geos = [0, 1, 2, 3].map(k => MM.twigGeo(90 + k));
      c.fall = [];
      const near = c.trees.filter(t => t.position.z > -1 && Math.abs(t.position.x) < 14);
      for (let k = 0; k < 26; k++) {
        const tr = near[k % near.length];
        const m = new T.Mesh(geos[k % 4], twigMat); m.castShadow = true;
        const start = tr.position.clone().add(new T.Vector3((rnd() - .5) * 2.4, 2.8 + rnd() * 1.2, (rnd() - .5) * 2.4));
        const end = c.pileAt.clone().add(new T.Vector3((rnd() - .5) * 2.2, .35 + rnd() * .4, (rnd() - .5) * 2.2));
        c.fall.push({ m, start, end, d: rnd() * .5, r: rnd() * 6 }); scene.add(m);
      }
      // a pruner at work by the nearest tree
      c.pruner = MM.worker(3); c.pruner.position.set(-1.5, ter.userData.h(-1.5, 4.5), 4.5); c.pruner.rotation.y = 2.4; scene.add(c.pruner);
      c.pruner.userData.arms.forEach(a => a.rotation.x = -2.2);
      // vineyard to the right: trained vines, winter canes, wires
      const post = MM.std('#4a4036', .9), wire = new T.LineBasicMaterial({ color: 0x8a8a8a });
      const vineMat = MM.std(0xffffff, .9, 0, { vertexColors: true });
      const vgeo = [0, 1, 2].map(k => MM.twigGeo(300 + k, { leafless: true, bark: '#5e4430', r: .016, len: .9 }));
      for (let r = 0; r < 7; r++) {
        const z = -7 + r * 2.2;
        for (let k = 0; k < 10; k++) {
          const x = 33 + k * 1.5, y = ter.userData.h(x, z);
          const p = new T.Mesh(new T.CylinderGeometry(.04, .05, 1.7, 6), post); p.position.set(x, y + .85, z); p.castShadow = true; scene.add(p);
          const tk = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(x + .5, y, z), new T.Vector3(x + .55, y + .5, z + .05), new T.Vector3(x + .45, y + .95, z)]), 8, .055, 6), MM.std('#2e241c', .95));
          tk.castShadow = true; scene.add(tk);
          for (let q = 0; q < 4; q++) { const cn = new T.Mesh(vgeo[q % 3], vineMat); cn.position.set(x + .45, y + .95, z); cn.rotation.set((q - 1.5) * .35, q, (q - 1.5) * .25); cn.castShadow = true; scene.add(cn); }
        }
        const gw = new T.BufferGeometry().setFromPoints([new T.Vector3(33, ter.userData.h(33, z) + 1.0, z), new T.Vector3(46.5, ter.userData.h(46.5, z) + 1.0, z)]);
        scene.add(new T.Line(gw, wire));
      }
      c.vpile = MM.prunings(120, 1.0, .5, 8, { leafless: true, bark: '#5e4430', r: .016, len: .9 });
      c.vpile.position.set(39, ter.userData.h(39, 8), 8); scene.add(c.vpile);
      if (!c.svg) return;

      // overlay
      const svg = c.svg;
      svg.setAttribute('viewBox', '0 0 860 520');
      c.counter = R.isPartner
        ? fo(svg, 20, 18, 380, 96, `<div class="statbox"><span class="fo-xl"><span class="v" id="s07v">1.1 to 2.6</span> <span class="u">t DM/ha/yr</span></span><br><span class="fo-xs">traditional groves, depending on the region</span></div>`)
        : fo(svg, 20, 18, 340, 96, `<div class="statbox"><span class="fo-xl"><span class="v" id="s07v">0.00</span> <span class="u">${R.row('L097').unit}</span></span><br>${R.chipHTML('L097')} <span class="fo-xs">traditional grove, Centro</span></div>`);
      c.val = c.counter.querySelector('#s07v');
      c.vlab = fo(svg, 520, 18, 320, 60, '<div class="statbox fo-s">A Dão vineyard, same method. Canes, no leaves, in winter</div>');
    },
    overlay(c, p) {
      if (!R.isPartner) c.val.textContent = (R.num('L097') * ease(seg(p, .2, .65))).toFixed(2); else c.counter.style.opacity = seg(p, .15, .3);
      c.vlab.style.opacity = seg(p, .72, .82);
    },
    update(c, p, t) {
      const cam = c.camera;
      const a = ease(seg(p, 0, .7)), v = ease(seg(p, .72, .95));
      const pos = new T.Vector3(lerp(-9, 4.2, a), lerp(8, 2.8, a), lerp(25, 15.2, a));
      const look = new T.Vector3(lerp(0, 1.2, a), lerp(1.8, .9, a), lerp(-2, 7.6, a));
      pos.lerp(new T.Vector3(36, 3.0, 13.5), v); look.lerp(new T.Vector3(40, 1, 3), v);
      cam.position.copy(pos); cam.lookAt(look);
      const fall = seg(p, .1, .62);
      c.fall.forEach(f => {
        const k = ease(clamp((fall - f.d) / .5));
        f.m.position.lerpVectors(f.start, f.end, k);
        f.m.position.y = lerp(f.start.y, f.end.y, k * k) + Math.sin(k * Math.PI) * .35;
        f.m.rotation.set(f.r + k * 3 + Math.PI / 2 * k, f.r * 2, .3);
        f.m.visible = k < .985 && fall > 0;
      });
      c.pile.userData.setFill(.12 + .88 * ease(seg(p, .18, .66)));
      c.vpile.userData.setFill(ease(seg(p, .74, .92)));
      c.pruner.userData.arms[0].rotation.x = -2.2 + Math.sin(t / 260) * .25;
    }
  });

  /* ======================= S12 chipped at the roadside, then hauled ======================= */
  add('s12', {
    rect: [0, 0, 1, 1],
    build(c) {
      const { scene, C } = c;
      scene.fog = new T.Fog(new T.Color('#000000'), 28, 80);
      c.L = lights(scene, { dir: [-10, 14, 10], sunI: 1.45, shadow: 22, map: 2048 });
      scene.add(c.L.sun.target);
      const ter = terrain(220, 90, 120, 1.2, .035, '#83824f', '#66704a'); ter.position.set(30, -.25, 0); scene.add(ter);
      { const gr = MM.grass(6000, 200, 70, null, 7); gr.position.set(30, -.2, 0); scene.add(gr); }
      const tr = track(150, 3.6, '#a88f6c'); tr.position.set(30, 0, 0); scene.add(tr);
      const road = new T.Mesh(new T.PlaneGeometry(9, 90), MM.std('#4d4c49', .9)); road.rotation.x = -Math.PI / 2; road.position.set(92, .03, 0); road.receiveShadow = true; scene.add(road);
      for (let z = -40; z < 40; z += 4) { const d = new T.Mesh(new T.PlaneGeometry(.15, 2), MM.std('#e8e6df', .6)); d.rotation.x = -Math.PI / 2; d.position.set(92, .04, z); scene.add(d); }
      const rnd = R.rand(5);
      for (let i = 0; i < 18; i++) { const x = -20 + i * 6.5 + (rnd() - .5) * 2, z = i % 2 ? 19 + rnd() * 8 : -(7 + rnd() * 6); const o = MM.oliveTree(500 + i); o.position.set(x, -.2, z); o.rotation.y = rnd() * 6; o.scale.setScalar(1 + rnd() * .3); scene.add(o); }
      // the rig: arborist truck and towed drum chipper, generic
      c.truck = MM.arboristTruck({ rearOpen: true }); scene.add(c.truck);
      c.ch = MM.drumChipper({ straightChute: true, body: '#c65a1e' }); scene.add(c.ch);
      c.tx0 = 4;
      // pile of olive prunings at the track side, behind the chipper's infeed
      c.pileAt = new T.Vector3(c.tx0 - 12.6, 0, 2.8);
      c.pile = MM.prunings(320, 1.9, 1.05, 23); c.pile.position.copy(c.pileAt); scene.add(c.pile);
      // chips: a heap inside the box and a stream from the chute
      const olive = C('--f-olive', '#7a7a12');
      const chipCol = new T.Color('#b39566').lerp(olive, .25);
      const b = c.truck.userData.box;
      const hg = new T.BoxGeometry(b.x1 - b.x0, 1, b.z1 - b.z0, 16, 1, 8);
      const hp = hg.attributes.position;
      for (let i = 0; i < hp.count; i++) if (hp.getY(i) > 0) hp.setY(i, .5 - Math.abs(hp.getX(i) + 1) * .06 + (hash(hp.getX(i) * 5, hp.getZ(i) * 5) - .5) * .12);
      hg.computeVertexNormals(); hg.translate(0, .5, 0);
      c.heap = new T.Mesh(hg, MM.std(chipCol, .95)); c.heap.position.set((b.x0 + b.x1) / 2, b.y0, 0); c.truck.add(c.heap);
      c.boxH = b.y1 - b.y0;
      c.chips = new T.InstancedMesh(new T.BoxGeometry(.05, .02, .035), MM.std(chipCol, .8), 300); scene.add(c.chips);
      c.chipO = Array.from({ length: 300 }, (_, i) => [hash(i, 1), hash(i, 2) - .5, hash(i, 3) - .5]);
      // crew: one carries branches from the pile, one feeds the infeed
      c.crew = [MM.worker(1), MM.worker(2)]; c.crew.forEach(w => scene.add(w));
      const twigMat = MM.std(0xffffff, .85, 0, { vertexColors: true, side: T.DoubleSide });
      c.branch = new T.Mesh(MM.twigGeo(77, { len: 1.5 }), twigMat); c.branch.castShadow = true; scene.add(c.branch);
      if (!c.svg) return;

      // overlay
      const svg = c.svg; svg.setAttribute('viewBox', '0 0 860 560');
      const bx = 30, by = 36;
      c.dens = S('g', null, svg);
      S('rect', { x: bx - 14, y: by - 26, width: 440, height: 140, rx: 8, style: 'fill:var(--panel);opacity:.92;stroke:var(--line)' }, c.dens);
      S('text', { x: bx, y: by, style: 'font-weight:600;font-size:17px', text: 'Bulk density' }, c.dens);
      const lo = R.num('L039', 1), hi = R.num('L039', 0);
      S('rect', { x: bx, y: by + 14, width: lo, height: 20, style: 'fill:var(--f-olive);opacity:.45' }, c.dens);
      S('text', { x: bx + lo + 8, y: by + 30, class: 'lbl-s', style: 'font-size:15px', text: 'loose branches' }, c.dens);
      S('rect', { x: bx, y: by + 44, width: hi, height: 20, style: 'fill:var(--f-olive)' }, c.dens);
      S('text', { x: bx + hi + 8, y: by + 60, class: 'lbl-s', style: 'font-size:15px', text: 'chips' }, c.dens);
      fo(c.dens, bx, by + 72, 420, 34, R.N('L039'));
      c.crewBox = stat(svg, 16, 452, 828, 100, `Crew of two ${R.N('L040')}. Setup per stop ${R.N('L041')}. Delay factor ${R.N('L042')}.<br><span class="fo-s">Tier 2: ${R.row('L043').value}</span>${R.chipHTML('L043')}`);
      c.haulBox = stat(svg, 16, 452, 828, 100, `<strong>Then the haul.</strong> Worked example ${R.N('L044', { unit: '' })}<br><span class="fo-s">Prunings arrive for collection</span> ${R.N('L038', { unit: '' })}`);
      c.labels = MM.labels(c.host);
      c.lab = [c.labels.add('chip truck, loaded through the rear door', new T.Vector3(), {}), c.labels.add('towed drum chipper, straight chute', new T.Vector3(), {}), c.labels.add('olive prunings at the track side', c.pileAt.clone().add(new T.Vector3(0, 1.6, 0)), {})];
    },
    overlay(c, p) {
      c.dens.style.opacity = 1 - seg(p, .5, .58);
      c.crewBox.style.opacity = 1 - seg(p, .5, .58);
      c.haulBox.style.opacity = seg(p, .58, .66);
    },
    update(c, p, t) {
      const drive = ease(seg(p, .58, 1));
      const tx = lerp(c.tx0, 78, drive);
      c.truck.position.set(tx, 0, 0);
      c.ch.position.set(tx - 7.05, 0, 0);
      const spin = drive * 60;
      [c.truck, c.ch].forEach(g => g.traverse(o => { if (o.geometry && o.geometry.type === 'CylinderGeometry' && o.rotation.x === Math.PI / 2 && o.geometry.parameters.radiusTop > .3) o.rotation.y = spin; }));
      // chipping phase
      const chip = seg(p, .06, .52);
      c.pile.userData.setFill(1 - chip * .96);
      c.heap.scale.y = Math.max(.02, ease(chip) * c.boxH * .92);
      const on = chip > 0 && chip < 1;
      const m = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(1, 1, 1), zero = new T.Vector3(0, 0, 0), pp = new T.Vector3();
      const end = c.ch.userData.discharge.getPoint(1).clone().add(c.ch.position);
      const hoodW = c.truck.userData.hood.clone().add(c.truck.position);
      c.chipO.forEach(([o, dz, dx], i) => {
        const k = ((t / 700 + o) % 1);
        pp.copy(end).lerp(hoodW, k); pp.y += Math.sin(k * Math.PI) * .25 - k * .4; pp.z += dz * .5 * k; pp.x += dx * .4 * k;
        q.setFromEuler(new T.Euler(o * 9 + t / 150, o * 5, i));
        m.compose(pp, q, on ? sc : zero); c.chips.setMatrixAt(i, m);
      });
      c.chips.instanceMatrix.needsUpdate = true;
      // crew: carrier walks pile to infeed with a branch, feeder stays at the table
      const inf = c.ch.userData.infeed.clone().add(c.ch.position);
      const cyc = (p * 11) % 1, go = cyc < .5, k = go ? cyc * 2 : (1 - cyc) * 2;
      const from = c.pileAt.clone().add(new T.Vector3(1.4, 0, -.6)), to = inf.clone().add(new T.Vector3(-.9, -inf.y, 1.1));
      const w0 = c.crew[0];
      w0.position.lerpVectors(from, to, ease(k));
      w0.lookAt(go ? to.x : from.x, 0, go ? to.z : from.z);
      w0.userData.walk(t / 140, on ? 1 : 0);
      w0.userData.arms.forEach(a => a.rotation.x = go ? -1.1 : Math.sin(t / 140) * .4);
      c.branch.visible = on && go;
      c.branch.position.copy(w0.position).add(new T.Vector3(0, 1.1, 0));
      c.branch.rotation.set(0, 0, -Math.PI / 2 + .2);
      const w1 = c.crew[1];
      w1.position.copy(inf).add(new T.Vector3(-.9, -inf.y, -1.1)); w1.lookAt(inf.x, 0, inf.z);
      w1.userData.arms.forEach((a, i) => a.rotation.x = -1.2 + (on ? Math.sin(t / 200 + i) * .35 : 0));
      if (drive > 0) { c.crew.forEach(w => w.visible = drive < .05); c.branch.visible = false; } else c.crew.forEach(w => w.visible = true);
      // camera: three-quarter view of the work, then follow the haul
      const cam = c.camera;
      const a = ease(seg(p, 0, .5));
      const work = new T.Vector3(lerp(c.tx0 - 17, c.tx0 - 12.5, a), lerp(4.6, 3.8, a), lerp(12.5, 10.5, a));
      const workL = new T.Vector3(c.tx0 - 6.2, 1.8, 0);
      const fol = new T.Vector3(tx - 15, 6.5, 13), folL = new T.Vector3(tx - 2, 1.6, 0);
      const f = ease(seg(p, .55, .68));
      cam.position.copy(work).lerp(fol, f); cam.lookAt(workL.clone().lerp(folL, f));
      c.L.sun.position.set(tx - 10, 14, 10); c.L.sun.target.position.set(tx - 4, 0, 0);
      // label anchors follow the rig
      if (c.labels) {
        c.labels.update(cam, p);
        const proj = (el, v) => { const w = c.host.clientWidth, h = c.host.clientHeight; const pv = v.clone().project(cam); const bw = el.offsetWidth + 6, x = Math.min(Math.max((pv.x + 1) / 2 * w, bw / 2 + 8), w - bw / 2 - 8); el.style.transform = `translate(${x.toFixed(1)}px,${((1 - pv.y) / 2 * h).toFixed(1)}px) translate(-50%,-100%)`; el.style.opacity = pv.z < 1 ? 1 : 0; };
        proj(c.lab[0], new T.Vector3(tx - .5, 3.9, 0));
        proj(c.lab[1], c.ch.position.clone().add(new T.Vector3(-.3, 3.3, 0)));
        c.lab[2].style.opacity = 1 - seg(p, .45, .55);
      }
    }
  });

  /* ======================= S15 the biochar plant ======================= */
  add('s15', {
    rect: [0, 0, 1, .63],
    build(c) {
      const { scene, C } = c;
      lights(scene, { dir: [12, 18, 10], sunI: 1.2, hemi: .75, shadow: 32, map: 2048 });
      scene.fog = new T.Fog(new T.Color('#000000'), 70, 150);
      const conc = MM.std('#bdb9b1', .92), steel = MM.std('#9aa1a7', .4, .75), dark = MM.std('#3b3f44', .6, .5), clad = MM.std('#d6d3cb', .8, .1);
      const rust = MM.std('#6a6f74', .35, .8), insul = MM.std('#c9ccce', .55, .5), amber = MM.std('#b8862f', .4, .6), grate = MM.std('#8a8f94', .6, .6);
      scene.add(ground(240, 240, '#4a4a42'));
      MM.box(62, .1, 42, MM.std('#6c6a64', .95), 2, .05, 3, scene);                              // yard
      MM.box(26, .3, 14, conc, 0, .15, 0, scene);
      // steel portal frame and cladding (back and left wall), open front and roof
      for (let i = 0; i < 7; i++) { MM.box(.3, 8, .3, steel, -12 + i * 4, 4.3, -6.8, scene); MM.box(.3, 8, .3, steel, -12 + i * 4, 4.3, 6.8, scene); MM.box(.22, .35, 13.6, steel, -12 + i * 4, 8.3, 0, scene); }
      for (let i = 0; i < 52; i++) MM.box(.48, 8, .06, clad, -12.6 + i * .49, 4.3, -7.0, scene);
      for (let i = 0; i < 28; i++) MM.box(.06, 8, .48, clad, -12.9, 4.3, -6.6 + i * .49, scene);
      MM.box(26, .1, 4.5, MM.std('#c7c9cb', .5, .5), 0, 8.5, -4.8, scene);              // part roof
      // reception bunker with the chip pile
      MM.box(.4, 2.4, 6, conc, -10.4, 1.5, 1, scene); MM.box(5, 2.4, .4, conc, -8.1, 1.5, -2.2, scene);
      const pile = new T.Mesh(new T.ConeGeometry(2.3, 2.0, 40, 6), MM.std(new T.Color('#b39566').lerp(C('--f-olive', '#7a7a12'), .25), 1));
      const pp = pile.geometry.attributes.position;
      for (let i = 0; i < pp.count; i++) { if (pp.getY(i) < .99) { const n = 1 + (hash(i, 9) - .5) * .18; pp.setX(i, pp.getX(i) * n); pp.setZ(i, pp.getZ(i) * n); pp.setY(i, pp.getY(i) + (hash(i, 4) - .5) * .1); } }
      pile.geometry.computeVertexNormals(); pile.position.set(-8.2, 1.3, .4); pile.castShadow = pile.receiveShadow = true; scene.add(pile);
      for (let i = 0; i < 5; i++) MM.box(4.4, .02, .08, dark, -8, .31, -1.6 + i * .7, scene);                       // walking floor slats
      // inclined belt conveyor to the dryer
      const belt = new T.Group(); scene.add(belt);
      MM.box(6.2, .12, .9, dark, 0, 0, 0, belt); MM.box(6.2, .3, .06, steel, 0, .15, .48, belt); MM.box(6.2, .3, .06, steel, 0, .15, -.48, belt);
      belt.position.set(-4.6, 2.2, 1.5); belt.rotation.z = .32;
      [[-6.8, 1.2], [-4.6, 2.0], [-2.4, 2.8]].forEach(([x, h]) => MM.box(.12, h, .12, steel, x, h / 2 + .3, 1.5, scene));
      c.beltChips = Array.from({ length: 10 }, () => { const m = new T.Mesh(new T.BoxGeometry(.25, .12, .25), MM.std('#b39566', .95)); scene.add(m); return m; });
      // rotary dryer on riding rings with burner and hoods
      c.dryer = MM.cyl(1.25, 1.25, 6.5, rust, -1.0, 3.4, -2.6, scene, 36); c.dryer.rotation.z = Math.PI / 2;
      [-3.5, -1.0, 1.5].forEach(x => { const r = new T.Mesh(new T.TorusGeometry(1.3, .1, 10, 36), dark); r.rotation.y = Math.PI / 2; r.position.set(x, 3.4, -2.6); scene.add(r); });
      [-3.5, 1.5].forEach(x => { MM.box(.6, 2.2, 2.2, dark, x, 1.25, -2.6, scene); });
      MM.box(1.2, 2.8, 2.8, insul, -4.9, 3.4, -2.6, scene);                         // feed hood
      MM.box(1.2, 2.8, 2.8, insul, 2.9, 3.4, -2.6, scene);                          // discharge hood
      MM.box(1, 1, 1, dark, -1.0, 1.6, -4.3, scene);                                // drive motor
      c.burner = new T.PointLight(0xff8a3a, 0, 5); c.burner.position.set(-5.6, 3.4, -2.6); scene.add(c.burner);
      // pyrolysis reactor: insulated retort with a sight glass, top feed, platform and ladder
      const rx = 6.2, rz = -1.2;
      MM.cyl(1.55, 1.55, 6.2, insul, rx, 3.6, rz, scene, 40);
      for (let i = 0; i < 5; i++) { const f = new T.Mesh(new T.TorusGeometry(1.57, .07, 8, 40), rust); f.rotation.x = Math.PI / 2; f.position.set(rx, 1.0 + i * 1.3, rz); scene.add(f); }
      c.glass = new T.Mesh(new T.PlaneGeometry(.55, 2.4), MM.std('#3a1a08', .3, 0, { emissive: new T.Color('#ff5a10'), emissiveIntensity: .2 }));
      c.glass.position.set(rx, 3.6, rz + 1.56); scene.add(c.glass);
      c.glow = new T.PointLight(0xff6a20, 0, 8); c.glow.position.set(rx, 3.6, rz + 2.4); scene.add(c.glow);
      MM.cyl(1.0, 1.55, .9, rust, rx, 7.15, rz, scene, 40);                                   // top cone
      MM.cyl(.35, .35, 1.0, steel, rx, 8.0, rz, scene, 16);                                    // rotary valve
      MM.cyl(.8, .3, 1.0, steel, rx, 9.0, rz, scene, 16);                                      // feed hopper
      const plat = MM.box(4.4, .1, 4.4, grate, rx, 7.0, rz, scene);
      MM.rail([[rx - 2.2, 7.05, rz - 2.2], [rx + 2.2, 7.05, rz - 2.2], [rx + 2.2, 7.05, rz + 2.2], [rx - 2.2, 7.05, rz + 2.2]], scene);
      MM.ladder(rx - 2.4, .3, 7.0, rz + 1.2, scene, Math.PI / 2);
      // conveyor from dryer discharge to the reactor top
      MM.tube([[3.4, 4.6, -2.6], [4.6, 7.6, -2.0], [rx, 9.5, rz]], .28, steel, scene);
      // afterburner (thermal oxidiser) and the hot gas loop back to the dryer
      const ab = MM.cyl(1.1, 1.1, 4.6, MM.std('#7e8388', .45, .7), 9.8, 5.0, -3.6, scene, 32); ab.rotation.x = Math.PI / 2;
      MM.tube([[rx, 7.6, rz - .6], [rx + 1.6, 8.0, -3.6], [9.8, 6.2, -3.6]], .35, amber, scene);          // pyrolysis gas to afterburner
      const loop = new T.CatmullRomCurve3([new T.Vector3(9.8, 6.1, -5.9), new T.Vector3(8, 9.8, -5.6), new T.Vector3(0, 10, -5.2), new T.Vector3(-5.2, 8.0, -4.4), new T.Vector3(-5.2, 4.8, -2.6)]);
      scene.add(Object.assign(new T.Mesh(new T.TubeGeometry(loop, 60, .38, 12), amber), { castShadow: true }));
      c.loop = loop;
      c.puffs = Array.from({ length: 16 }, () => { const m = new T.Mesh(new T.SphereGeometry(.2, 10, 8), MM.std('#ffb347', .3, 0, { emissive: new T.Color('#ff9a2a'), emissiveIntensity: 1 })); scene.add(m); return m; });
      MM.cyl(.45, .55, 14, steel, 11.6, 7.2, -5.2, scene, 20);                                       // stack
      const ring = new T.Mesh(new T.TorusGeometry(.9, .06, 6, 24), grate); ring.rotation.x = Math.PI / 2; ring.position.set(11.6, 10, -5.2); scene.add(ring);
      MM.tube([[9.8, 5.0, -1.3], [11.0, 5.4, -1.0], [11.6, 2.0, -5.2]], .3, steel, scene);
      // char out: water-jacketed cooling screw to the bagging frame
      const scr = new T.CatmullRomCurve3([new T.Vector3(rx, .8, rz + 1.2), new T.Vector3(rx + 1.5, 1.6, rz + 3.0), new T.Vector3(rx + 3.4, 3.0, rz + 4.6)]);
      scene.add(Object.assign(new T.Mesh(new T.TubeGeometry(scr, 30, .3, 12), MM.std('#556066', .4, .7)), { castShadow: true }));
      for (let i = 1; i < 6; i++) { const r = new T.Mesh(new T.TorusGeometry(.34, .05, 6, 16), MM.std('#2c65ad', .4, .4)); const pt = scr.getPoint(i / 6); r.position.copy(pt); r.lookAt(scr.getPoint(i / 6 + .01)); scene.add(r); }
      c.scr = scr;
      const fx = rx + 3.6, fz = rz + 4.8;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => MM.box(.12, 3.2, .12, steel, fx + a * .8, 1.9, fz + b * .8, scene));
      MM.box(1.8, .12, 1.8, steel, fx, 3.4, fz, scene);
      const hang = MM.bigBag(); hang.position.set(fx, .3, fz); scene.add(hang);
      for (let i = 0; i < 3; i++) { const bb = MM.bigBag(); bb.position.set(fx - 3 + i * 1.4, .3, fz + 2.4); scene.add(bb); }
      c.charBits = Array.from({ length: 12 }, () => { const m = new T.Mesh(new T.DodecahedronGeometry(.1, 0), MM.std(C('--p-char', '#2a2826'), .9)); scene.add(m); return m; });
      // control container
      const cont = MM.box(6, 2.6, 2.4, MM.std('#5f7f6a', .6, .3), -6.5, 1.6, 5.2, scene);
      for (let i = 0; i < 24; i++) MM.box(.04, 2.4, .05, MM.std('#4e6b58', .6, .3), -9.3 + i * .24, 1.6, 6.42, scene);
      MM.box(1, .7, .05, MM.std(0x1d2a33, .1, .7), -5.0, 2.0, 6.43, scene);
      // ---- the site around the process: delivery, loader, weighbridge, char store, fence ----
      const yel = MM.std('#e2a516', .45, .2), blk = MM.std('#1c1c1e', .7, .2), mesh = MM.std('#9aa0a6', .5, .6, { transparent: true, opacity: .35 });
      // delivery: a chip truck backed up to the reception bunker
      c.deliv = MM.arboristTruck({ cab: '#dcdcd8' }); c.deliv.rotation.y = -Math.PI / 2; c.deliv.position.set(-8.2, 0, 9.8); scene.add(c.deliv);
      // wheel loader pushing chips into the walking floor
      const ld = new T.Group(); scene.add(ld);
      MM.box(2.6, 1.1, 1.6, yel, 0, 1.25, 0, ld); MM.box(1.1, 1.2, 1.4, yel, -.6, 2.3, 0, ld); MM.box(1.0, .8, 1.3, MM.std(0x1d2a33, .1, .7), -.6, 2.4, 0, ld);
      MM.box(.5, .9, 2.0, blk, 2.0, .75, 0, ld); MM.box(.12, .12, 1.8, blk, 1.6, 1.2, 0, ld);
      [[-.8, .85], [-.8, -.85], [1.0, .85], [1.0, -.85]].forEach(([x, z]) => { const w = MM.wheel(.55, .4); w.position.set(x, .55, z); ld.add(w); });
      ld.position.set(-14.5, 0, 2.5); ld.rotation.y = .25; c.loader = ld;
      // weighbridge and gatehouse
      MM.box(3.4, .18, 10, MM.std('#3a3a3c', .8), -24, .14, 13, scene);
      MM.box(2.2, 2.4, 2.2, MM.std('#e8e6e0', .6), -27.2, 1.25, 17, scene); MM.box(.05, .7, 1.4, MM.std(0x1d2a33, .1, .7), -26.08, 1.7, 17, scene);
      // char store: a shade roof over rows of big bags, ready for farms and kilns
      for (let i = 0; i < 4; i++) [6.5, 13.5].forEach(z => MM.box(.2, 4.2, .2, MM.std('#9aa1a7', .4, .75), 15 + i * 4, 2.2, z, scene));
      const sr = MM.box(13.5, .12, 8, MM.std('#c7c9cb', .5, .5), 21, 4.35, 10, scene); sr.rotation.x = .06;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const bb = MM.bigBag(); bb.position.set(16 + i * 2.4, .1, 7.8 + j * 2.1); scene.add(bb); }
      // water tank for the quench and a small office
      MM.cyl(1.6, 1.6, 4.2, MM.std('#5a6a74', .5, .4), 18, 2.2, -6, scene, 32);
      MM.box(5, 2.6, 2.4, MM.std('#e8e6e0', .6), 22.5, 1.4, 1, scene); for (let i = 0; i < 3; i++) MM.box(.9, .7, .05, MM.std(0x1d2a33, .1, .7), 20.8 + i * 1.6, 1.8, 2.22, scene);
      // perimeter fence
      const fx0 = -29, fx1 = 33, fz0 = -18, fz1 = 24;
      const fence = (x1, z1, x2, z2) => { const L2 = Math.hypot(x2 - x1, z2 - z1), n = Math.ceil(L2 / 3); for (let i = 0; i <= n; i++) MM.cyl(.05, .05, 2, MM.std('#6e7378', .5, .6), lerp(x1, x2, i / n), 1, lerp(z1, z2, i / n), scene, 6); const pnl = MM.box(L2, 1.8, .02, mesh, (x1 + x2) / 2, 1, (z1 + z2) / 2, scene); pnl.rotation.y = -Math.atan2(z2 - z1, x2 - x1); pnl.castShadow = false; };
      fence(fx0, fz0, fx1, fz0); fence(fx1, fz0, fx1, fz1); fence(fx0, fz0, fx0, 8); fence(fx0, fz1, fx1, fz1);
      // olive groves beyond the fence, the plant's catchment
      for (let i = 0; i < 16; i++) { const o = MM.oliveTree(900 + i); const a = i / 16 * Math.PI * 2; o.position.set(2 + Math.cos(a) * 46 + hash(i, 1) * 6, 0, 3 + Math.sin(a) * 36 + hash(i, 2) * 6); o.scale.setScalar(1.2); scene.add(o); }
      // labels
      c.labels = MM.labels(c.host);
      [['reception', [-8.2, 3.2, .4]], ['rotary dryer', [-1.0, 5.0, -2.6]], ['reactor, no oxygen', [rx, 9.8, rz]], ['afterburner', [9.8, 6.6, -3.6]], ['hot gas heats the dryer', [2, 10.4, -5.2]], ['char cooling screw', [rx + 1.6, 2.4, rz + 3.0]], ['char in big bags', [fx, 3.9, fz]], ['control room', [-6.5, 3.3, 5.2]], ['chips delivered', [-8.2, 4.0, 10.5]], ['char store, big bags to farms and kilns', [21, 5.2, 10]], ['weighbridge', [-24, 1.2, 18]]]
        .forEach(([t, p], i) => c.labels.add(t, new T.Vector3(...p), { show: i < 8 ? [.32, 1.01] : [-.01, .4] }));
      if (!c.svg) return;

      // overlay: waterfall, chain, moisture envelope
      const svg = c.svg; svg.setAttribute('viewBox', '0 0 960 600'); svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
      const x0 = 520, base = 552, k = 120;
      const vals = [
        [1, 'wet tonne in', '1 t', 'var(--f-olive)'],
        [R.num('L059'), 'dry matter', R.part('L059') + ' t', 'var(--f-olive)'],
        [R.num('L059') * R.num('L060'), 'char', (R.num('L059') * R.num('L060')).toFixed(4) + ' t', 'var(--p-char)'],
        [R.num('L059') * R.num('L060') * R.num('L061'), 'carbon in char', (R.num('L059') * R.num('L060') * R.num('L061')).toFixed(4) + ' t', 'var(--p-char)'],
        [R.num('L063'), 'CO2e in char', R.part('L063') + ' t', 'var(--good)']
      ];
      fo(svg, x0 - 10, R.isPartner ? 366 : 392, 450, 30, `<span class="fo-xs">One wet tonne in, t at each step ${R.chipHTML('L063')}</span>`);
      S('line', { x1: x0 - 10, x2: 955, y1: base, y2: base, style: 'stroke:var(--ink-2);stroke-width:1.5' }, svg);
      c.bars = []; c.blabs = [];
      vals.forEach(([v, name, html, col], i) => {
        const x = x0 + i * 88;
        const r = S('rect', { x, width: 54, rx: 6, y: base, height: 0, style: `fill:${col};opacity:${i === 2 || i === 3 ? .85 : 1}` }, svg);
        r.dataset.h = v * k; c.bars.push(r);
        S('text', { x: x + 27, y: base + 20, 'text-anchor': 'middle', class: 'lbl-s', style: 'font-size:13px', text: name }, svg);
        c.blabs.push(fo(svg, x - 20, base - v * k - 28, 94, 28, `<span class="fo-xs" style="display:block;text-align:center;font-weight:600;color:var(--ink)">${html}</span>`));
      });
      if (!R.isPartner) stat(svg, 14, 500, 460, 96, `<span class="fo-xs">1 wet tonne × ${R.N('L059', { unit: 'DM' })} × ${R.N('L060', { unit: 'char yield' })} × ${R.N('L061', { unit: 'C' })} × ${R.N('L062', { unit: '' })} = ${R.N('L063')}. Char and carbon bars are computed from these.</span>`);
      const mx = 30, my = 428, mw = 400;
      S('text', { x: mx, y: my - (R.isPartner ? 26 : 12), style: 'font-weight:600;font-size:16px', text: 'Moisture envelope, % wet basis' }, svg);
      const pct = v => mx + v / 60 * mw;
      const A = R.num('L065', 0), B = R.num('L065', 2), Cc = R.num('L065', 3);
      S('rect', { x: pct(0), y: my, width: pct(A) - pct(0), height: 18, style: 'fill:var(--good);opacity:.6' }, svg);
      S('rect', { x: pct(A), y: my, width: pct(B) - pct(A), height: 18, style: 'fill:var(--p-power);opacity:.6' }, svg);
      S('rect', { x: pct(Cc), y: my, width: pct(60) - pct(Cc), height: 18, style: 'fill:var(--fire);opacity:.6' }, svg);
      c.marker = S('path', { d: 'M0,-4 L-7,-16 L7,-16 Z', style: 'fill:var(--ink)' }, svg);
      c.mk = { from: R.num('L066', 0), to: R.num('L066', 1), mx, mw, my };
      fo(svg, mx - 10, my + 22, 450, R.isPartner ? 90 : 56, `<span class="fo-xs">${R.N('L065', { unit: '' })}<br>Olive prunings through the season ${R.N('L066')}</span>`);
    },
    overlay(c, p) {
      c.bars.forEach((r, i) => {
        const k = ease(seg(p, .15 + i * .12, .27 + i * .12));
        const h = +r.dataset.h * k; r.setAttribute('height', h); r.setAttribute('y', 552 - h);
        c.blabs[i].style.opacity = k > .9 ? 1 : 0;
      });
      const v = lerp(c.mk.from, c.mk.to, seg(p, .3, .9));
      c.marker.setAttribute('transform', `translate(${(c.mk.mx + v / 60 * c.mk.mw).toFixed(1)},${c.mk.my})`);
    },
    update(c, p, t) {
      // start wide on the whole site, then move in on the process line
      const a = lerp(-.55, .45, p), z = ease(seg(p, 0, .45)), R0 = lerp(54, 38, z);
      c.camera.position.set(Math.sin(a) * R0 + 1, lerp(27, 18, z), Math.cos(a) * R0 + 3);
      c.camera.lookAt(lerp(1, 1, z), lerp(1.5, 3.4, z), lerp(3, -.5, z));
      c.loader.position.x = -14.5 + Math.sin(t / 2600) * 1.6;
      c.dryer.rotation.x = t / 1400;
      const g = .15 + .85 * seg(p, .05, .3);
      c.glass.material.emissiveIntensity = g * (1.1 + .15 * Math.sin(t / 160));
      c.glow.intensity = g * 2.4; c.burner.intensity = g * 1.6;
      c.puffs.forEach((m, i) => { m.position.copy(c.loop.getPoint(((t / 5200) + i / 16) % 1)); m.visible = p > .05; });
      c.beltChips.forEach((m, i) => { const k = ((t / 3800) + i / 10) % 1; m.position.set(-7.5 + k * 5.8, 1.35 + k * 1.95, 1.5); });
      c.charBits.forEach((m, i) => { const k = ((t / 3600) + i / 12) % 1; m.position.copy(c.scr.getPoint(k)).add(new T.Vector3(0, .32, 0)); m.visible = p > .1; });
      c.labels.update(c.camera, p);
    }
  });

  /* ======================= S16 the biomethane plant ======================= */
  add('s16', {
    rect: [0, .2, 1, .8],
    build(c) {
      const { scene, C } = c;
      lights(scene, { dir: [16, 20, 12], shadow: 30, map: 2048 });
      scene.fog = new T.Fog(new T.Color('#000000'), 60, 150);
      const ter = terrain(200, 140, 70, 1.2, .03, '#86865a', '#6c774b'); ter.position.y = -.3; scene.add(ter);
      { const gr = MM.grass(5000, 180, 120, null, 3); gr.position.set(0, -.25, 0); scene.add(gr); }
      const conc = MM.std('#bdb8ae', .9), steel = MM.std('#9aa1a7', .4, .75), ss = MM.std('#cfd3d6', .25, .9), dark = MM.std('#3b3f44', .6, .5), grate = MM.std('#8a8f94', .6, .6);
      MM.box(48, .3, 28, conc, 0, .15, 0, scene);
      const road = new T.Mesh(new T.PlaneGeometry(140, 5), MM.std('#55534f', .9)); road.rotation.x = -Math.PI / 2; road.position.set(0, .03, 17); road.receiveShadow = true; scene.add(road);
      // reception hall with an open roller door and the feedstock inside
      const hall = new T.Group(); scene.add(hall); hall.position.set(-17, 0, -3);
      const clad = MM.std('#c9c6bd', .75, .1);
      MM.box(11, 6, .2, clad, 0, 3.3, -4.5, hall); MM.box(.2, 6, 9, clad, -5.5, 3.3, 0, hall); MM.box(.2, 6, 9, clad, 5.5, 3.3, 0, hall);
      MM.box(11.4, .2, 9.4, MM.std('#a9adb1', .5, .5), 0, 6.4, 0, hall);
      MM.box(4, 1.2, .2, clad, -3.5, 5.7, 4.5, hall); MM.box(4, 1.2, .2, clad, 3.5, 5.7, 4.5, hall); MM.box(3.0, .4, .3, dark, 0, 5.9, 4.5, hall); // door opening
      MM.box(3.6, 6, .2, clad, -3.7, 3.3, 4.5, hall); MM.box(3.6, 6, .2, clad, 3.7, 3.3, 4.5, hall);
      const heap = (col, x, z, r, h) => { const g = new T.SphereGeometry(r, 28, 14, 0, 6.28, 0, Math.PI / 2); const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const n = 1 + (hash(i, 3) - .5) * .25; pa.setX(i, pa.getX(i) * n); pa.setZ(i, pa.getZ(i) * n); } g.computeVertexNormals(); const m = new T.Mesh(g, MM.std(col, 1)); m.scale.y = h / r; m.position.set(x, .3, z); m.castShadow = true; hall.add(m); };
      heap(new T.Color('#6b5a3c').lerp(C('--f-food', '#137373'), .35), -2.2, -1, 2.2, 1.4);
      heap(new T.Color('#5a4630').lerp(C('--f-manure', '#6e4a2a'), .3), 2.4, -1.4, 1.8, 1.1);
      // pre-treatment (depackaging) and hygienisation tanks
      MM.box(5, 2.6, 2.4, MM.std('#5d6f7c', .55, .35), -8.5, 1.6, 4.2, scene);
      MM.cyl(.6, 1.2, 1.2, steel, -8.5, 3.5, 4.2, scene, 16);
      [0, 1, 2].forEach(i => { MM.cyl(.8, .8, 3.2, ss, -4.5 + i * 1.9, 1.9, 6.3, scene, 24); const top = new T.Mesh(new T.SphereGeometry(.8, 16, 8, 0, 6.28, 0, Math.PI / 2), ss); top.position.set(-4.5 + i * 1.9, 3.5, 6.3); scene.add(top); });
      // two digesters: concrete walls with formwork lines, double membrane roofs, stairs, agitators
      const digs = [[-1, -5], [10, -5]];
      digs.forEach(([x, z]) => {
        const wall = MM.cyl(6, 6, 6, MM.std('#a9a69e', .9), x, 3.3, z, scene, 48);
        for (let i = 1; i < 6; i++) { const l = new T.Mesh(new T.TorusGeometry(6.01, .03, 4, 48), MM.std('#8f8c85', .9)); l.rotation.x = Math.PI / 2; l.position.set(x, .3 + i, z); scene.add(l); }
        const dome = new T.Mesh(new T.SphereGeometry(6.05, 48, 18, 0, 6.28, 0, Math.PI / 2), MM.std('#eceae4', .55)); dome.scale.y = .5; dome.position.set(x, 6.3, z); dome.castShadow = true; scene.add(dome);
        const ring = new T.Mesh(new T.TorusGeometry(6.05, .12, 8, 48), steel); ring.rotation.x = Math.PI / 2; ring.position.set(x, 6.3, z); scene.add(ring);
        [0, 2.1, 4.2].forEach(a => { const m = MM.box(.6, .6, .9, MM.std('#2c65ad', .5, .3), x + Math.cos(a) * 6.3, 2.2, z + Math.sin(a) * 6.3, scene); m.rotation.y = -a; });
        const st = new T.Group(); scene.add(st);
        for (let s = 0; s < 14; s++) MM.box(1.0, .08, .3, grate, x + 6.6, .4 + s * .43, z - 2.6 + s * .3, st);
        MM.box(1.6, .1, 1.6, grate, x + 6.8, 6.3, z + 2, scene);
      });
      // gas holder pipe, upgrading containers with coolers, compressor, flare
      MM.tube([[-1, 8.8, -5], [4.5, 9.6, -5], [10, 8.8, -5]], .18, steel, scene);
      MM.tube([[4.5, 9.6, -5], [8, 7, 2], [15, 2.6, 5]], .2, steel, scene);
      [0, 1].forEach(i => { MM.box(6, 2.6, 2.4, MM.std('#e2e2de', .5, .2), 18 + i * 0, 1.6, 4 + i * 3, scene); for (let k = 0; k < 3; k++) MM.cyl(.45, .45, .3, dark, 16.5 + k * 1.5, 3.1, 4 + i * 3, scene, 16); });
      MM.box(2.4, 2, 2, MM.std('#8b98a3', .5, .4), 22.5, 1.3, 5.5, scene);
      MM.cyl(.25, .3, 9, steel, 23, 4.8, -6, scene, 14); MM.cyl(.4, .3, .7, MM.std('#c23b22', .5, .2), 23, 9.6, -6, scene, 14);
      // grid injection station in a fenced yard, the pipe goes underground
      const gx = 27.5, gz = 10;
      MM.box(2.2, 2.2, 1.8, MM.std('#d9d6cf', .6, .2), gx, 1.4, gz, scene);
      for (let i = 0; i <= 8; i++) { MM.cyl(.04, .04, 1.8, steel, gx - 3 + i * .75, 1.2, gz - 3, scene, 6); MM.cyl(.04, .04, 1.8, steel, gx - 3 + i * .75, 1.2, gz + 3, scene, 6); }
      for (let i = 0; i <= 8; i++) { MM.cyl(.04, .04, 1.8, steel, gx - 3, 1.2, gz - 3 + i * .75, scene, 6); MM.cyl(.04, .04, 1.8, steel, gx + 3, 1.2, gz - 3 + i * .75, scene, 6); }
      const gas = new T.CatmullRomCurve3([new T.Vector3(21, 1.4, 5.5), new T.Vector3(24.5, 1.4, 6.5), new T.Vector3(gx - 1.1, 1.4, gz), new T.Vector3(gx + .2, .6, gz + 1.2), new T.Vector3(gx + 1.2, -1.5, gz + 2.5)]);
      scene.add(Object.assign(new T.Mesh(new T.TubeGeometry(gas, 40, .22, 10), MM.std(C('--p-gas', '#2c65ad'), .4, .3)), { castShadow: true }));
      c.gas = gas;
      c.puffs = Array.from({ length: 14 }, () => { const m = new T.Mesh(new T.SphereGeometry(.17, 8, 6), MM.std('#9cc4ff', .3, 0, { emissive: new T.Color('#4c8ee8'), emissiveIntensity: .9 })); scene.add(m); return m; });
      // digestate store and tanker
      const ds = MM.cyl(5, 5, 3.2, MM.std('#8a857b', .9), -2, 1.9, 9, scene, 40);
      const cover = new T.Mesh(new T.ConeGeometry(5.1, 1.4, 40), MM.std('#4e5a4a', .8)); cover.position.set(-2, 4.2, 9); cover.castShadow = true; scene.add(cover);
      const tk = new T.Group();
      const tank = MM.cyl(1, 1, 5, MM.std('#9aa1a7', .35, .7), -.4, 1.75, 0, tk, 24); tank.rotation.z = Math.PI / 2;
      MM.box(1.6, 2.0, 2.2, MM.std('#e9e7e1', .4, .15), 2.8, 1.6, 0, tk);
      MM.box(.06, .8, 1.9, MM.std(0x1d2a33, .1, .7), 3.62, 2.0, 0, tk);
      [2.6, -1.4, -2.6].forEach(x => [-.95, .95].forEach(z => { const w = MM.wheel(.48, .3); w.position.set(x, .48, z); tk.add(w); }));
      tk.position.set(-10, 0, 17); scene.add(tk); c.tanker = tk;
      // cascade to pyrolysis (work in progress): dashed arc to a translucent unit
      const arcPts = new T.CatmullRomCurve3([new T.Vector3(-2, 4.8, 9), new T.Vector3(6, 13, 11), new T.Vector3(16, 10, 12), new T.Vector3(19, 2.8, 12)]).getPoints(60);
      const arc = new T.Line(new T.BufferGeometry().setFromPoints(arcPts), new T.LineDashedMaterial({ color: C('--warn', '#b0640c'), dashSize: .6, gapSize: .5 }));
      arc.computeLineDistances(); scene.add(arc);
      const ghost = new T.Mesh(new T.BoxGeometry(4, 3, 3), new T.MeshStandardMaterial({ color: C('--warn', '#b0640c'), transparent: true, opacity: .16, depthWrite: false }));
      ghost.position.set(19.5, 1.8, 12); scene.add(ghost);
      const ge = new T.LineSegments(new T.EdgesGeometry(ghost.geometry), new T.LineDashedMaterial({ color: C('--warn', '#b0640c'), dashSize: .3, gapSize: .2 }));
      ge.position.copy(ghost.position); ge.computeLineDistances(); scene.add(ge);
      // labels
      c.labels = MM.labels(c.host);
      [['reception: food waste and manure', [-17, 7.2, -3]], ['pre-treatment', [-8.5, 4.4, 4.2]], ['hygienisation', [-2.6, 4.8, 6.3]], ['digesters', [4.5, 10.2, -5]], ['upgrading to biomethane', [18, 3.8, 5.5]], ['flare', [23, 10.4, -6]], ['grid injection, underground', [gx, 3.2, gz]], ['digestate store', [-2, 5.4, 9]]]
        .forEach(([t, p]) => c.labels.add(t, new T.Vector3(...p)));
      c.labels.add('digestate to pyrolysis', new T.Vector3(19.5, 4.0, 12), { wip: !R.isPartner });
      if (!c.svg) return;

      // overlay
      const svg = c.svg; svg.setAttribute('viewBox', '0 0 920 580');
      stat(svg, 16, 10, 520, 112, `Food waste dry matter ${R.N('L067')}<br>Methane, full-scale plant ${R.N('L068')}<br>Biowaste capture rate ${R.N('L069')}`);
      stat(svg, 556, 10, 348, 112, `Digestate yield ${R.noinfo()}<br><span class="fo-s">Manure stream</span> ${R.isPartner ? '<span class="fo-s">in, at parish level, six species</span>' : '<span class="chip wip">work in progress</span>'}`);
    },
    update(c, p, t) {
      const a = lerp(-.4, .5, p);
      c.camera.position.set(Math.sin(a) * 58 + 2, 30, Math.cos(a) * 58 + 4);
      c.camera.lookAt(3, 2, 2);
      c.puffs.forEach((m, i) => m.position.copy(c.gas.getPoint(((t / 4500) + i / 14) % 1)));
      c.tanker.position.x = lerp(-10, 50, ease(seg(p, .35, 1)));
      c.labels.update(c.camera, p);
    }
  });

  /* ======================= S17 the gasifier ======================= */
  add('s17', {
    rect: [0, .06, 1, .66],
    build(c) {
      const { scene, C } = c;
      lights(scene, { dir: [14, 20, 12], sunI: 1.2, hemi: .75, shadow: 34, map: 2048 });
      scene.fog = new T.Fog(new T.Color('#000000'), 75, 160);
      const conc = std('#8e8b84', .95), steel = std('#9aa1a7', .4, .75), dark = std('#33373b', .6, .5), clad = std('#cfccc4', .8, .1);
      const insul = std('#c9ccce', .5, .55), amber = std('#c48a2c', .4, .6), green = std('#4f6b5a', .6, .3), red = std('#a8432f', .5, .3), blue = std('#3a6ea8', .5, .3);
      scene.add(ground(260, 260, '#45443e'));
      MM.box(66, .1, 40, std('#6a6862', .95), 2, .05, 1, scene);                                   // yard
      MM.box(30, .3, 15, std('#a7a49c', .9), 0, .15, 0, scene);                                    // hall floor
      // the hall: steel portal frames, cladding on the back and left, open front, half roof
      for (let i = 0; i < 8; i++) { const x = -15 + i * (30 / 7); MM.box(.3, 9, .3, steel, x, 4.8, -7.3, scene); MM.box(.3, 9, .3, steel, x, 4.8, 7.3, scene); MM.box(.22, .4, 14.8, steel, x, 9.3, 0, scene); }
      for (let i = 0; i < 61; i++) MM.box(.48, 9, .06, clad, -15 + i * .49, 4.8, -7.5, scene);
      for (let i = 0; i < 30; i++) MM.box(.06, 9, .48, clad, -15.2, 4.8, -7.1 + i * .49, scene);
      MM.box(30.4, .1, 6.5, std('#bfc1c3', .5, .5), 0, 9.55, -4.2, scene);
      // ---- fuel: outdoor chip bunker, belt dryer, conveyor into the hall ----
      [[-27, -4, .4, 10], [-19, -4, .4, 10]].forEach(([x, z, w, d]) => MM.box(w, 2.6, d, conc, x, 1.4, z + 5 - d / 2 + 0, scene));
      MM.box(8.4, 2.6, .4, conc, -23, 1.4, -9, scene);
      const pile = new T.Mesh(new T.ConeGeometry(3.4, 2.8, 40, 5), std('#a68a5c', 1)); pile.position.set(-23, 1.5, -3.6); pile.scale.z = 1.4; pile.castShadow = pile.receiveShadow = true; scene.add(pile);
      MM.box(7, 2.6, 3, std('#8b9298', .5, .5), -22, 1.6, 6.5, scene);                             // belt dryer
      for (let i = 0; i < 6; i++) MM.box(.04, 2.2, 3.02, dark, -25 + i * 1.2, 1.6, 6.5, scene);
      MM.cyl(.3, .3, 3, steel, -19.4, 4, 6.5, scene, 14);                                           // dryer fan stack
      c.deliv = MM.arboristTruck({ cab: '#dcdcd8' }); c.deliv.rotation.y = Math.PI / 2; c.deliv.position.set(-23, 0, 12); scene.add(c.deliv);
      MM.tube([[-19.5, 1.8, -2], [-16, 5.5, -2], [-11.6, 8.6, -2]], .32, dark, scene);              // inclined screw into the hall
      // day hopper with the ash check gate, and the ash skip below
      const hop = new T.Mesh(new T.CylinderGeometry(1.9, .55, 2.4, 4, 1, true), std('#7d8580', .5, .5, { side: T.DoubleSide })); hop.rotation.y = Math.PI / 4; hop.position.set(-10, 6.5, -2); hop.castShadow = true; scene.add(hop);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => MM.box(.2, 5.3, .2, dark, -10 + x * 1.2, 2.8, -2 + z * 1.2, scene));
      c.gate = new T.Mesh(new T.BoxGeometry(1.5, .14, 1.5), std('#c23b22', .5, 0, { emissive: new T.Color('#c23b22'), emissiveIntensity: .5 })); c.gate.position.set(-10, 7.75, -2); scene.add(c.gate);
      MM.box(2.2, 1.0, 1.6, std('#e2a516', .5, .3), -13.3, .8, 1.8, scene);                          // reject skip
      // two downdraft gasifier reactors fed by screws from the hopper
      c.reactors = [];
      [-3.4, 1.4].forEach((z, i) => {
        const rx = -5.6;
        MM.tube([[-10, 5.2, -2], [-7.5, 6.6, z * .5 - 1], [rx, 7.4, z]], .18, dark, scene);
        MM.cyl(1.0, 1.0, 5.2, insul, rx, 3.2, z, scene, 32);
        for (let k = 0; k < 4; k++) { const f = new T.Mesh(new T.TorusGeometry(1.03, .06, 8, 32), dark); f.rotation.x = Math.PI / 2; f.position.set(rx, 1.2 + k * 1.3, z); scene.add(f); }
        MM.cyl(.6, 1.0, .8, steel, rx, 6.2, z, scene, 32); MM.cyl(.3, .3, .8, steel, rx, 7.0, z, scene, 14);
        const glass = new T.Mesh(new T.PlaneGeometry(.35, .9), std('#3a1a08', .3, 0, { emissive: new T.Color('#ff5a10'), emissiveIntensity: .8 })); glass.position.set(rx, 2.2, z + 1.02); scene.add(glass); c.reactors.push(glass);
        MM.tube([[rx, .5, z + .6], [rx + 1.4, .45, z + 1.2], [rx + 2.6, .7, z + 1.6]], .12, dark, scene);  // ash screw
        MM.box(.8, 2.6, .8, dark, rx + 1.2, 1.4, z - .9, scene);                                      // air blower
      });
      MM.box(1.6, .9, 1.2, std('#e2a516', .5, .3), -2.6, .6, 3.4, scene);                             // ash skip
      // gas cooling and cleaning: cooler, cyclone, bag filter
      MM.cyl(.6, .6, 6.4, steel, -1.4, 3.4, -4.4, scene, 24);
      MM.cyl(.75, .75, 1.8, steel, -1.2, 4.8, -.2, scene, 24); const cone = new T.Mesh(new T.ConeGeometry(.75, 1.6, 24), steel); cone.rotation.x = Math.PI; cone.position.set(-1.2, 3.1, -.2); cone.castShadow = true; scene.add(cone);
      MM.box(3.4, 2.6, 2.6, std('#a5abaf', .5, .5), 2.6, 4.4, -2.6, scene);
      for (let k = 0; k < 3; k++) { const pyr = new T.Mesh(new T.ConeGeometry(.75, 1.1, 4), std('#8f969c', .5, .5)); pyr.rotation.x = Math.PI; pyr.rotation.y = Math.PI / 4; pyr.position.set(1.6 + k * 1.0, 2.55, -2.6); scene.add(pyr); }
      [[1.2, -3.8], [4, -3.8], [1.2, -1.4], [4, -1.4]].forEach(([x, z]) => MM.box(.14, 3, .14, dark, x, 1.6, z, scene));
      [[-5.6, 7.6, -3.4], [-5.6, 7.6, 1.4]].forEach(p0 => MM.tube([p0, [-3.6, 8.2, -2], [-1.4, 6.8, -4.4]], .2, amber, scene));
      MM.tube([[-1.4, .8, -4.4], [-1.3, .8, -2.2], [-1.2, 5.5, -.2]], .2, amber, scene);
      MM.tube([[-1.2, 5.8, -.2], [.4, 6.6, -1.2], [1.4, 5.6, -2.6]], .2, amber, scene);
      MM.tube([[4.3, 4.4, -2.6], [5.6, 4.8, -2.2], [6.6, 2.6, -1.6]], .2, amber, scene);
      // two engine gensets in acoustic enclosures, exhaust up through the roof
      c.stacks = [];
      [-3.4, .8].forEach((z, i) => {
        MM.box(6, 2.8, 2.4, green, 9.6, 1.7, z, scene);
        for (let k = 0; k < 10; k++) MM.box(.05, 1.6, .05, std('#3e5848', .6, .3), 7.2 + k * .5, 1.9, z + 1.23, scene);
        MM.box(1.2, 1.2, .05, std('#2c3b33', .6), 11.8, 1.9, z + 1.23, scene);
        MM.cyl(.22, .22, 7.4, steel, 11.6, 6.8, z - .6, scene, 14);
        c.stacks.push(new T.Vector3(11.6, 10.6, z - .6));
      });
      MM.box(3, 2.2, 1.6, std('#e8e6e0', .6), -10.5, 1.3, 5, scene);                                // control room
      MM.box(1.2, .7, .04, std(0x1d2a33, .1, .7), -10.5, 1.6, 5.82, scene);
      // outside right: heat store, district heat pipes, transformer, flare
      MM.cyl(2, 2, 10, std('#b6b9bb', .5, .4), 20, 5.1, -3, scene, 36);
      for (let k = 0; k < 5; k++) { const r = new T.Mesh(new T.TorusGeometry(2.03, .05, 6, 36), dark); r.rotation.x = Math.PI / 2; r.position.set(20, 1 + k * 2.2, -3); scene.add(r); }
      MM.tube([[12.6, 1.2, -1], [16, 1.2, -1], [18.2, 1.2, -2]], .16, red, scene);
      MM.tube([[12.6, .8, -.4], [16, .8, -.4], [18.2, .8, -1.4]], .16, blue, scene);
      MM.tube([[21.8, 1.2, -2], [28, 1.2, -2], [32, 1.2, -2]], .16, red, scene); MM.tube([[21.8, .8, -1.4], [28, .8, -1.4], [32, .8, -1.4]], .16, blue, scene);
      MM.box(2.4, 2.2, 1.8, std('#7c8288', .5, .5), 19, 1.2, 5, scene);
      for (let k = 0; k < 8; k++) MM.box(.05, 1.6, 1.9, dark, 17.9 + k * .3, 1.2, 5, scene);
      for (let k = 0; k < 3; k++) MM.cyl(.08, .08, 1.2, std('#d7d0c2', .5), 18.4 + k * .6, 2.9, 5, scene, 8);
      MM.cyl(.2, .26, 7, steel, 24, 3.6, 6, scene, 12);
      c.flare = new T.PointLight(0xff8a3a, 0, 6); c.flare.position.set(24, 7.4, 6); scene.add(c.flare);
      c.flame = new T.Mesh(new T.ConeGeometry(.22, .8, 10, 1, true), new T.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false })); c.flame.position.set(24, 7.5, 6); scene.add(c.flame);
      for (let i = 0; i < 14; i++) { const o = MM.oliveTree(950 + i); const a2 = i / 14 * Math.PI * 2; o.position.set(2 + Math.cos(a2) * 48, 0, 1 + Math.sin(a2) * 34); o.scale.setScalar(1.2); scene.add(o); }
      c.puffs = Array.from({ length: 10 }, () => { const m = new T.Mesh(new T.SphereGeometry(.35, 10, 8), new T.MeshStandardMaterial({ color: 0xdedede, transparent: true, opacity: .25, depthWrite: false })); scene.add(m); return m; });
      // fuel synthesis branch, translucent (work in progress)
      const wipC = C('--warn', '#b0640c');
      const ghostM = new T.MeshStandardMaterial({ color: C('--p-gas', '#2c65ad'), transparent: true, opacity: .14, depthWrite: false });
      const tower = new T.Mesh(new T.CylinderGeometry(1.2, 1.2, 9, 24), ghostM); tower.position.set(26, 4.6, -6); scene.add(tower);
      const te = new T.LineSegments(new T.EdgesGeometry(new T.CylinderGeometry(1.2, 1.2, 9, 12)), new T.LineDashedMaterial({ color: wipC, dashSize: .3, gapSize: .25 }));
      te.position.copy(tower.position); te.computeLineDistances(); scene.add(te);
      const br = new T.Line(new T.BufferGeometry().setFromPoints(new T.CatmullRomCurve3([new T.Vector3(4.3, 5, -2.6), new T.Vector3(14, 8.5, -6), new T.Vector3(26, 8, -6)]).getPoints(40)), new T.LineDashedMaterial({ color: wipC, dashSize: .35, gapSize: .3 }));
      br.computeLineDistances(); scene.add(br);
      // chips falling from the conveyor onto the gate: olive bounces off to the skip (too much ash), forest passes
      const chipG = new T.BoxGeometry(.2, .09, .13);
      c.chips = Array.from({ length: 22 }, (_, i) => {
        const ol = i % 2 === 0;
        const m = new T.Mesh(chipG, std(ol ? C('--f-olive', '#7a7a12') : C('--f-forest', '#2e6a3c'), .9)); m.castShadow = true; scene.add(m);
        return { m, ol, o: hash(i, 4), x: (hash(i, 5) - .5) * 1.0, z: (hash(i, 6) - .5) * 1.0 };
      });
      c.labels = MM.labels(c.host);
      [['chip store', [-23, 4.2, -3.6]], ['belt dryer', [-22, 3.6, 6.5]], ['day hopper, ash check', [-10, 9.2, -2]], ['downdraft gasifiers', [-5.6, 8.4, 1.4]], ['gas cooling and cleaning', [1.4, 6.4, -2.6]],
        ['engine gensets: power and heat', [9.6, 3.8, .8]], ['heat store and district heat', [20, 10.8, -3]], ['grid connection', [19, 3.2, 5]], [R.isPartner ? 'fuel synthesis' : 'fuel synthesis, work in progress', [26, 9.8, -6]]]
        .forEach(([tx, pp]) => c.labels.add(tx, new T.Vector3(...pp)));
      if (!c.svg) return;

      // overlay
      const svg = c.svg; svg.setAttribute('viewBox', '0 0 920 580'); svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
      stat(svg, 16, 448, 888, 126, `${R.isPartner ? '<span class="fo-xs">An engine pathway, feedstock cost included. Fuel synthesis drawn translucent.</span>' : '<span class="chip wip" style="margin-left:0">designed and costed, not yet an engine pathway</span> <span class="fo-xs">fuel synthesis drawn translucent</span>'}<br>Configurations ${R.N('L070', { unit: '' })}<br>Olive wood ash vs small gasifier limit ${R.N('L071')}. <span class="fo-xs">Red gate at the hopper: olive chips bounce to the reject skip.</span>`);
    },
    update(c, p, t) {
      const a = lerp(-.6, .4, p), z = ease(seg(p, 0, .5)), R0 = lerp(62, 44, z);
      c.camera.position.set(Math.sin(a) * R0 - 2, lerp(30, 19, z), Math.cos(a) * R0 + 2);
      c.camera.lookAt(lerp(0, 1, z), lerp(1.5, 2.6, z), lerp(1, -1, z));
      c.chips.forEach(ch => {
        const k = ((t / 2600) + ch.o) % 1;
        let x = -10.8 + ch.x * .5, y = lerp(8.7, 7.82, Math.min(1, k * 1.5)), zz = -2 + ch.z * .5;
        if (k > .66) {
          const b = (k - .66) / .34;
          if (ch.ol) { x = -10.8 - b * 2.5; y = 7.82 + Math.sin(b * Math.PI) * 1.2 - b * b * 6.6; zz = -2 + b * 3.8; }
          else { y = 7.82 - b * 1.6; x = -10.8 + b * .8; }
        }
        ch.m.position.set(x, y, zz); ch.m.rotation.set(k * 9, ch.o * 6, 0);
        ch.m.visible = y > 1.2;
      });
      c.gate.material.emissiveIntensity = .4 + .4 * Math.max(0, Math.sin(t / 300));
      c.reactors.forEach((g, i) => g.material.emissiveIntensity = .7 + .25 * Math.sin(t / 180 + i));
      c.flame.scale.y = .8 + .3 * Math.sin(t / 90); c.flare.intensity = 1.2 + .4 * Math.sin(t / 120);
      c.puffs.forEach((m, i) => { const k = ((t / 4200) + i / 10) % 1, st = c.stacks[i % 2]; m.position.set(st.x + k * 1.5, st.y + k * 6, st.z - k); m.scale.setScalar(.6 + k * 2.4); m.material.opacity = .28 * (1 - k); });
      c.labels.update(c.camera, p);
    }
  });

  /* partner: one tonne of olive prunings, three fates (engine 24 Nov, L127 to L130) */
  function s09Chart(c) {
    c.chart = true; c.host.style.display = 'none';
    const svg = c.svg; svg.setAttribute('viewBox', '0 0 900 620');
    const Z = 350, K = .3, W = 110, xs = [120, 330, 520];
    const y = v => Z - v * K;
    S('text', { x: 20, y: 30, style: 'font-size:22px;font-weight:700;letter-spacing:-.02em;fill:var(--ink)', text: 'One tonne of olive prunings, three fates' }, svg);
    S('text', { x: 20, y: 54, style: 'font-size:14px;fill:var(--ink-2)', text: 'kg CO2e per tonne of dry matter. Up: carbon kept out of the air. Down: emitted.' }, svg);
    S('text', { x: 20, y: y(600) + 5, style: 'font-size:12px;fill:var(--muted)', text: '+600' }, svg);
    S('text', { x: 20, y: y(300) + 5, style: 'font-size:12px;fill:var(--muted)', text: '+300' }, svg);
    S('text', { x: 20, y: y(-200) + 5, style: 'font-size:12px;fill:var(--muted)', text: '−200' }, svg);
    [600, 300, -200].forEach(v => S('line', { x1: 60, x2: 880, y1: y(v), y2: y(v), style: 'stroke:#1f1f22;stroke-width:1' }, svg));
    S('line', { x1: 60, x2: 880, y1: Z, y2: Z, style: 'stroke:var(--ink-2);stroke-width:2' }, svg);
    S('text', { x: 24, y: Z + 5, style: 'font-size:12px;fill:var(--ink-2)', text: '0' }, svg);
    c.bars = [];
    const bar = (x, v, col, op) => { const r = S('rect', { x: x - W / 2, y: Z, width: W, height: 0, rx: 8, style: `fill:${col};opacity:${op || 1}` }, svg); c.bars.push([r, v]); return r; };
    const whisk = (x, lo, hi) => { const g = S('g', { style: 'opacity:0' }, svg); S('line', { x1: x, x2: x, y1: y(lo), y2: y(hi), style: 'stroke:#f5f5f7;stroke-width:2' }, g); [lo, hi].forEach(v => S('line', { x1: x - 12, x2: x + 12, y1: y(v), y2: y(v), style: 'stroke:#f5f5f7;stroke-width:2' }, g)); return g; };
    const title = (x, t, col) => S('text', { x, y: 92, 'text-anchor': 'middle', style: `font-size:18px;font-weight:700;fill:${col}`, text: t }, svg);
    c.groups = [];
    // 1 burned
    title(xs[0], 'Burned in the field', 'var(--fire)');
    bar(xs[0], -198, '#e0482b');
    const w1 = whisk(xs[0], -148, -268);
    const l1 = fo(svg, xs[0] - 105, y(-268) + 8, 210, 140, `<div style="text-align:center"><b style="font-size:26px;color:#ff6b4a">−198</b><br><span class="fo-xs">methane and nitrous oxide from the fire, range 148 to 268</span><br><span class="fo-xs" style="color:var(--muted)">Its CO2 goes back to the air too, which is not even counted here.</span></div>`);
    c.groups.push([w1, l1]);
    // 2 chipped
    title(xs[1], 'Chipped and left', '#c99a68');
    bar(xs[1], 190, '#8a5a34');
    const w2 = whisk(xs[1], 166, 258);
    const l2a = fo(svg, xs[1] - 100, y(258) - 52, 200, 44, `<div style="text-align:center"><b style="font-size:26px;color:#d8a878">+190</b></div>`);
    const l2b = fo(svg, xs[1] - 105, Z + 10, 210, 120, `<div style="text-align:center"><span class="fo-xs">soil carbon kept over 100 years, range 166 to 258</span><br><span class="fo-xs" style="color:var(--muted)">Most of the wood rots back to the air within a few years.</span></div>`);
    c.groups.push([w2, l2a, l2b]);
    // 3 biochar
    title(xs[2], 'Turned into biochar', 'var(--ink)');
    bar(xs[2], 579, '#2c2c2e'); c.bars[c.bars.length - 1][0].style.stroke = '#d8d2c8'; c.bars[c.bars.length - 1][0].style.strokeWidth = '1.5';
    const band = S('rect', { x: xs[2] - W / 2 - 6, y: y(735), width: W + 12, height: y(422) - y(735), rx: 8, style: 'fill:none;stroke:#8e8e93;stroke-width:1.5;stroke-dasharray:5 4;opacity:0' }, svg);
    const marks = S('g', { style: 'opacity:0' }, svg);
    [[735, 'submitted paper method'], [579, 'physical, 100 years'], [422, 'EU CRCF credit rules (strictest)']].forEach(([v, t]) => {
      S('line', { x1: xs[2] - W / 2 - 6, x2: xs[2] + W / 2 + 18, y1: y(v), y2: y(v), style: `stroke:${v === 579 ? '#f5f5f7' : '#8e8e93'};stroke-width:2` }, marks);
      S('text', { x: xs[2] + W / 2 + 24, y: y(v) + 6, style: `font-size:${v === 579 ? 16 : 14}px;font-weight:${v === 579 ? 700 : 500};fill:var(--ink)`, text: `+${v}  ${t}` }, marks);
    });
    S('rect', { x: xs[2] - W / 2, y: y(735), width: W, height: 0, style: 'opacity:0' }, svg);
    const gdown = S('rect', { x: xs[2] - W / 2, y: Z, width: W, height: 0, rx: 6, style: 'fill:#8e8e93;opacity:.45' }, svg);
    const gsolid = S('rect', { x: xs[2] - W / 2, y: Z, width: W, height: 0, rx: 6, style: 'fill:#8e8e93' }, svg);
    c.gd = [[gdown, 60], [gsolid, 28]];
    c.gmark = S('line', { x1: xs[2] - W / 2 - 6, x2: xs[2] + W / 2 + 6, y1: Z + 51 * K, y2: Z + 51 * K, style: 'stroke:#f5f5f7;stroke-width:2;opacity:0' }, svg);
    const l3 = fo(svg, xs[2] + W / 2 + 18, Z + 4, 300, 70, `<div><b style="font-size:20px;color:#c7c7cc">−28 to −60</b><br><span class="fo-xs">collection, chipping and plant energy. Line at −51: conservative estimate</span></div>`);
    c.groups.push([band, marks, l3]);
    fo(svg, 20, 584, 860, 34, '<span class="fo-xs" style="color:var(--muted)">Olive prunings, per t DM, central values with ranges. Char yield 0.26 t/t DM, char carbon 84%. Engine 24 Nov <span class="chip prov">provisional</span></span>');
    c.Z = Z; c.K = K;
  }
  function s09ChartUpdate(c, p) {
    c.bars.forEach(([r, v], i) => { const k = ease(seg(p, .08 + i * .18, .22 + i * .18)), h = Math.abs(v) * c.K * k; r.setAttribute('height', h.toFixed(1)); r.setAttribute('y', (v >= 0 ? c.Z - h : c.Z).toFixed(1)); });
    const kg = ease(seg(p, .48, .58)); c.gd.forEach(([r, v]) => r.setAttribute('height', (v * c.K * kg).toFixed(1))); c.gmark.style.opacity = kg;
    c.groups.forEach((g, i) => g.forEach(e => e.style.opacity = seg(p, .18 + i * .18, .26 + i * .18)));
  }

  /* ======================= S09 same tonne, opposite sign: two small 3D dioramas ======================= */
  add('s09', {
    rect: [.02, .17, .96, .44],
    fov: 30,
    build(c) {
      if (R.isPartner) return s09Chart(c);
      const { scene, C } = c;
      lights(scene, { dir: [4, 9, 7], hemi: .7, sunI: 1.1, shadow: 9, rim: 1.2 });
      // ---- left: a pile of prunings burning in a grove ----
      const L = new T.Group(); L.position.x = -3.94; L.scale.setScalar(.85); scene.add(L); c.Lg = L;
      const soilM = std('#5a4632', 1);
      const disc = new T.Mesh(new T.CylinderGeometry(2.9, 3.1, .35, 48), soilM); disc.position.y = -.18; disc.receiveShadow = true; L.add(disc);
      const g1 = MM.grass(260, 5.2, 5.2, null, 11, '#7d8a52', '#a3a066'); g1.position.y = 0; L.add(g1);
      const ot = MM.oliveTree(321); ot.position.set(-1.9, 0, -1.4); ot.scale.setScalar(.75); L.add(ot);
      c.pileL = MM.prunings(320, 1.25, .85, 7); L.add(c.pileL);
      c.char = new T.Mesh(new T.CylinderGeometry(1.1, 1.3, .08, 32), std('#1c1a18', .9)); c.char.position.y = .04; L.add(c.char);
      const flameM = new T.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false });
      const flameM2 = new T.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .7, blending: T.AdditiveBlending, depthWrite: false });
      c.flames = [];
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, r = i % 3 === 0 ? 0 : .45 + hash(i, 2) * .4; const fh = 1.5 + hash(i, 3) * 1.1; const f = new T.Mesh(new T.ConeGeometry(.28 + hash(i, 1) * .2, fh, 10, 1, true), i % 2 ? flameM : flameM2); f.geometry.translate(0, fh / 2, 0); f.position.set(Math.cos(a) * r * .8, .45, Math.sin(a) * r * .8); L.add(f); c.flames.push(f); }
      c.fireLight = new T.PointLight(0xff7a2a, 3, 9, 1.6); c.fireLight.position.set(0, 1.2, .4); L.add(c.fireLight);
      c.smoke = Array.from({ length: 14 }, (_, i) => { const m = new T.Mesh(new T.SphereGeometry(.3, 12, 10), new T.MeshStandardMaterial({ color: 0x8a8580, transparent: true, opacity: .35, depthWrite: false, roughness: 1 })); L.add(m); return { m, o: i / 14, x: (hash(i, 7) - .5) * .6 }; });
      const ePos = new Float32Array(90 * 3); const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.BufferAttribute(ePos, 3));
      c.embers = new T.Points(eg, new T.PointsMaterial({ color: 0xffb060, size: .07, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false })); L.add(c.embers);
      c.eo = Array.from({ length: 90 }, (_, i) => [hash(i, 1), (hash(i, 2) - .5) * 1.4, (hash(i, 3) - .5) * 1.4]);
      // ---- right: chips on the soil, feeding soil carbon ----
      const Rg = new T.Group(); Rg.position.set(3.94, .5, 0); Rg.scale.setScalar(.85); scene.add(Rg); c.Rg = Rg;
      const W = 5.2, Dp = 3.2;
      const top = MM.box(W, .9, Dp, std('#5b4330', 1), 0, -.45, 0, Rg);
      MM.box(W, 1.1, Dp, std('#7a5b40', 1), 0, -1.45, 0, Rg);
      const g2 = MM.grass(160, W - .2, Dp - .2, null, 12, '#6f8f45', '#9aa356'); Rg.add(g2);
      c.chipsR = new T.InstancedMesh(new T.BoxGeometry(.16, .035, .09), std('#c9ae7a', .85), 900); c.chipsR.castShadow = true; Rg.add(c.chipsR);
      c.chipD = Array.from({ length: 900 }, (_, i) => [(hash(i, 4) - .5) * (W - .3), .03 + hash(i, 8) * .06, (hash(i, 5) - .5) * (Dp - .3), hash(i, 6) * 6.28, hash(i, 9)]);
      // soil carbon: dark aggregates on the cut face, more near the top
      c.soc = new T.InstancedMesh(new T.DodecahedronGeometry(.06, 0), std('#1a1a1a', .6), 220); Rg.add(c.soc);
      c.socD = Array.from({ length: 220 }, (_, i) => [(hash(i, 21) - .5) * (W - .3), -Math.pow(hash(i, 22), 1.8) * 1.7 - .05, Dp / 2 + .03, hash(i, 23)]);
      // roots
      const rootM = std('#d9c29a', .8);
      for (let i = 0; i < 6; i++) { const x0 = -2 + i * .8; const cu = new T.CatmullRomCurve3([new T.Vector3(x0, 0, Dp / 2 + .02), new T.Vector3(x0 + (hash(i, 1) - .5) * .4, -.6, Dp / 2 + .03), new T.Vector3(x0 + (hash(i, 2) - .5) * .7, -1.3, Dp / 2 + .03)]); Rg.add(new T.Mesh(new T.TubeGeometry(cu, 16, .025, 5), rootM)); }
      const sh = new T.Mesh(new T.PlaneGeometry(40, 20), new T.ShadowMaterial({ opacity: .4 })); sh.rotation.x = -Math.PI / 2; sh.position.y = -2.0; sh.receiveShadow = true; scene.add(sh);
      // gas badges above the fire
      c.labels = MM.labels(c.host);
      c.gas = ['CH4', 'N2O', 'CH4', 'CH4', 'N2O', 'CH4'].map((t, i) => { const el = document.createElement('div'); el.className = 'l3 gasb'; el.style.transition = 'none'; el.innerHTML = `<span style="color:#ff8a70;font-weight:700">${t}</span>`; c.host.appendChild(el); return { el, o: i / 6, x: (i % 3 - 1) * .7 }; });
      c.socLab = c.labels.add('soil carbon the chips would build', new T.Vector3(3.94, -.6, Dp / 2 * .85));
      if (!c.svg) return;

      // ---- overlay: tiles, the action, results and the punchline ----
      const svg = c.svg; svg.setAttribute('viewBox', '0 0 900 600');
      const burn = R.num('L022'), left = R.num('L025', 0);
      const tile = (x, title, sub, col) => {
        const g = S('g', null, svg);
        S('rect', { x, y: 10, width: 420, height: 470, rx: 26, style: 'fill:none;stroke:#2c2c2e;stroke-width:1.5' }, g);
        S('text', { x: x + 28, y: 50, style: 'font-size:13px;font-weight:700;letter-spacing:.06em;fill:var(--muted)', text: 'WAS GOING TO BE' }, g);
        S('text', { x: x + 28, y: 82, style: `font-size:28px;font-weight:700;letter-spacing:-.02em;fill:${col}`, text: title }, g);
        S('text', { x: x + 28, y: 104, style: 'font-size:14px;fill:var(--ink-2)', text: sub }, g);
      };
      tile(20, 'Burned in the field', 'Open burning releases methane and nitrous oxide', 'var(--fire)');
      tile(460, 'Chipped and left', 'Chips build soil carbon as they decompose', 'var(--warn)');
      c.act = S('g', null, svg);
      S('rect', { x: 330, y: 366, width: 240, height: 40, rx: 20, style: 'fill:#f5f5f7' }, c.act);
      S('text', { x: 450, y: 392, 'text-anchor': 'middle', style: 'font-size:16px;font-weight:700;fill:#000', text: 'RAMOS collects the tonne' }, c.act);
      const res = (x, v, col, line) => {
        const g = S('g', null, svg);
        const n = (v > 0 ? '+' : '−') + Math.abs(Math.round(v));
        S('text', { x: x + 28, y: 456, style: `font-size:52px;font-weight:800;letter-spacing:-.04em;fill:${col}`, text: n }, g);
        S('text', { x: x + 40 + n.length * 29, y: 440, style: 'font-size:13px;fill:var(--ink-2)', text: 'kg CO2e' }, g);
        S('text', { x: x + 40 + n.length * 29, y: 456, style: 'font-size:13px;fill:var(--ink-2)', text: 'per t dry matter' }, g);
        fo(g, x + 24, 462, 390, 30, `<span class="fo-xs">${line}</span>`);
        return g;
      };
      c.rL = res(20, burn, 'var(--good)', `fire gases avoided ${R.chipHTML('L022')}`);
      c.rR = res(460, left, 'var(--warn)', `soil ${R.N('L023', { unit: '', nochip: true })}, soil N2O ${R.N('L024', { unit: '', nochip: true })}, 100 yr ${R.chipHTML('L025')}`);
      const avg = (burn + left) / 2;
      c.punch = fo(svg, 20, 500, 860, 96, R.isPartner
        ? `<div style="font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1.2">Same material, <span style="color:var(--good)">opposite climate effect</span>.</div><div class="fo-s" style="margin-top:4px">Each tonne is accounted for against its own counterfactual, never an average.</div>`
        : `<div style="font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1.2">Same truck, same wood, <span style="color:var(--good)">opposite sign</span>.</div><div class="fo-s" style="margin-top:4px">Averaged, the two would read about ${avg > 0 ? '+' : ''}${avg.toFixed(0)} kg, which hides both. RAMOS keeps each tonne's own history.</div>`);
    },
    overlay(c, p) {
      if (c.chart) return s09ChartUpdate(c, p);
      if (!c.act) return;
      c.act.style.opacity = seg(p, .14, .22);
      c.rL.style.opacity = seg(p, .42, .52); c.rR.style.opacity = seg(p, .5, .6);
      c.punch.style.opacity = seg(p, .66, .76);
    },
    update(c, p, t) {
      if (c.chart) return;
      const cam = c.camera;
      // keep the 3D band locked to the tiles: the host spans the svg's illustration strip (y 116 to 362 of 600)
      if (c.svg && c.host.parentNode) { const sr = c.svg.getBoundingClientRect(), wr = c.host.parentNode.getBoundingClientRect(); const k = Math.min(sr.width / 900, sr.height / 600), ox = (sr.width - 900 * k) / 2, oy = (sr.height - 600 * k) / 2; Object.assign(c.host.style, { left: (sr.left - wr.left + ox + 20 * k) + 'px', width: (860 * k) + 'px', top: (sr.top - wr.top + oy + 116 * k) + 'px', height: (246 * k) + 'px' }); }
      cam.position.set(0, 2.2, 8.6); cam.lookAt(0, .55, 0);
      const col = ease(seg(p, .22, .4)), fire = 1 - col;
      // left: the fire dies down, the pile is lifted away, smoke and gases stop
      c.flames.forEach((f, i) => { f.visible = fire > .02; f.scale.set(1, fire * (.8 + .35 * Math.sin(t / 90 + i * 1.7)), 1); });
      c.fireLight.intensity = 3 * fire * (.85 + .15 * Math.sin(t / 70));
      c.pileL.position.y = col * 2.4; c.pileL.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = 1 - col; } }); c.pileL.visible = col < .98;
      c.char.material.color.set(col > .5 ? '#3b2f24' : '#1c1a18');
      c.smoke.forEach(s => { const k = ((t / 4200) + s.o) % 1; s.m.position.set(s.x + k * .8, 1.3 + k * 3.2, -k * .4); s.m.scale.setScalar(.6 + k * 2.2); s.m.material.opacity = .35 * (1 - k) * fire; });
      const ep = c.embers.geometry.attributes.position;
      c.eo.forEach(([o, x, z], i) => { const k = ((t / 1800) + o) % 1; ep.setXYZ(i, x * (1 - k * .3), .4 + k * 2.6, z * (1 - k * .3)); });
      ep.needsUpdate = true; c.embers.material.opacity = .9 * fire;
      // right: chips lift off and the soil carbon they would have built fades
      const m = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), pos = new T.Vector3();
      c.chipD.forEach(([x, y, z, r, k], i) => { const lift = clamp(col * 1.6 - k * .6); pos.set(x, y + ease(lift) * 2.6, z); q.setFromEuler(new T.Euler(lift * 3, r, lift * 2)); sc.setScalar(lift > .97 ? .0001 : 1); m.compose(pos, q, sc); c.chipsR.setMatrixAt(i, m); });
      c.chipsR.instanceMatrix.needsUpdate = true;
      c.socD.forEach(([x, y, z, k], i) => { const fade = col * (k < .6 ? 1 : .3); pos.set(x, y, z); sc.setScalar(Math.max(.0001, 1 - fade * .85)); q.identity(); m.compose(pos, q, sc); c.soc.setMatrixAt(i, m); });
      c.soc.instanceMatrix.needsUpdate = true;
      // gas badges rise above the fire and stop when it is out
      const wL = new T.Vector3();
      c.labels.update(cam, p);
      c.gas.forEach(g => { const k = ((t / 3600) + g.o) % 1; wL.set(c.Lg.position.x + g.x * .85 + k * .4, 1.9 + k * .9, .3); const v = wL.clone().project(cam); const w = c.host.clientWidth, h = c.host.clientHeight; g.el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px,${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%,-100%)`; g.el.style.opacity = (fire * (1 - k)).toFixed(2); });
      c.socLab.style.opacity = 1 - col;
    }
  });

  /* ======================= S20 back into the soil ======================= */
  add('s20', {
    rect: [0, .02, .5, .72],
    build(c) {
      const { scene, C } = c;
      lights(scene, { dir: [7, 12, 10], hemi: .8, sunI: 1.25, shadow: 9, rim: 1.1 });
      // a soil monolith cut out of the field: litter, topsoil, subsoil, parent material
      const W = 9, Dp = 4, TOP = 2.2;
      c.W = W; c.Dp = Dp; c.TOP = TOP;
      const layer = (h, yTop, col, rough) => { const m = new T.Mesh(new T.BoxGeometry(W, h, Dp, 60, 10, 1), std(col, rough || 1)); const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { if (pa.getZ(i) > 0) pa.setZ(i, pa.getZ(i) + (hash(pa.getX(i) * 4, pa.getY(i) * 4) - .5) * .07); } m.geometry.computeVertexNormals(); m.position.y = yTop - h / 2; m.receiveShadow = true; m.castShadow = true; scene.add(m); return m; };
      layer(.12, TOP, '#3f3a26');                 // litter
      layer(1.25, TOP - .12, '#7a573b');          // topsoil
      layer(1.5, TOP - 1.37, '#9b7550');          // subsoil
      layer(1.4, TOP - 2.87, '#b39a78', .95);     // parent material
      // stones in the deeper layers
      for (let i = 0; i < 26; i++) { const st = new T.Mesh(new T.DodecahedronGeometry(.06 + hash(i, 3) * .1, 0), std('#8a7f6e', .9)); st.position.set((hash(i, 1) - .5) * (W - .4), TOP - 1.6 - hash(i, 2) * 2.4, Dp / 2 + .02); st.scale.z = .5; scene.add(st); }
      // grass and a young olive on top
      const grass = MM.grass(420, W - .2, Dp - .2, null, 31, '#6f8f45', '#9aa356'); grass.position.y = TOP; scene.add(grass);
      // biochar: granules spread on the surface, then carried down by water, roots and worms
      const charC = new T.Color('#1a1a1a');
      const N = 900; c.N = N;
      c.gran = new T.InstancedMesh(new T.DodecahedronGeometry(.075, 0), std(charC, .35, .3), N);
      c.gran.castShadow = true; scene.add(c.gran);
      c.gd = Array.from({ length: N }, (_, i) => {
        const front = i < N * .72;                       // most sit on the cut face so we can watch them move
        const depth = Math.min(2.6, -Math.log(1 - hash(i, 11) * .985) * .38);   // mostly shallow, a long tail
        return { x: (hash(i, 12) - .5) * (W - .3), z: front ? Dp / 2 + .015 : (hash(i, 13) - .5) * (Dp - .3), d: depth, drop: 1.5 + hash(i, 14) * 3, s: .7 + hash(i, 15) * .9, w: (hash(i, 16) - .5) * .3, k: hash(i, 17) };
      });
      // a dark film on the surface that thins as the char moves down
      c.film = new T.Mesh(new T.BoxGeometry(W - .05, .05, Dp - .05), std(charC, .7)); c.film.position.y = TOP + .03; scene.add(c.film);
      // roots
      const rootM = std('#d9c29a', .8);
      for (let i = 0; i < 8; i++) {
        const rnd = R.rand(50 + i); const pts = [new T.Vector3(-3.6 + i * 1.03, TOP, Dp / 2 + .03)]; let x = pts[0].x, y = TOP;
        const depth = 1.4 + rnd() * 1.6; for (let k = 0; k < 7; k++) { x += (rnd() - .5) * .45; y -= depth / 7; pts.push(new T.Vector3(x, y, Dp / 2 + .03)); }
        const cu = new T.CatmullRomCurve3(pts); scene.add(new T.Mesh(new T.TubeGeometry(cu, 30, .03, 5), rootM));
        for (let k = 0; k < 3; k++) { const pt = cu.getPoint(.25 + k * .22); const sub = new T.CatmullRomCurve3([pt, pt.clone().add(new T.Vector3((rnd() - .5) * .9, -.3, .01)), pt.clone().add(new T.Vector3((rnd() - .5) * 1.3, -.75, .02))]); scene.add(new T.Mesh(new T.TubeGeometry(sub, 10, .014, 4), rootM)); }
      }
      // earthworms: soft tubes that slide along the face
      c.worms = [0, 1].map(i => { const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.35, 0, 0), new T.Vector3(-.1, .05, 0), new T.Vector3(.15, -.03, 0), new T.Vector3(.38, .02, 0)]), 16, .035, 6), std('#b9766a', .6)); m.position.set(-2 + i * 3.4, TOP - .45 - i * .4, Dp / 2 + .04); scene.add(m); return m; });
      // fungal hyphae that wrap the char in the topsoil
      const hy = []; const rnd = R.rand(91);
      for (let i = 0; i < 40; i++) {
        let q = new T.Vector3((rnd() - .5) * (W - .6), TOP - .15 - rnd() * 1.0, Dp / 2 + .025);
        for (let k = 0; k < 10; k++) { const q2 = q.clone().add(new T.Vector3((rnd() - .5) * .3, (rnd() - .5) * .26, 0)); hy.push(q, q2); q = q2; }
      }
      const hg = new T.BufferGeometry().setFromPoints(hy);
      c.hy = new T.LineSegments(hg, new T.LineBasicMaterial({ color: new T.Color('#f3e6c8'), transparent: true, opacity: .85 }));
      c.hyN = hy.length; hg.setDrawRange(0, 0); scene.add(c.hy);
      // a ground shadow catcher under the monolith
      const sh = new T.Mesh(new T.PlaneGeometry(30, 30), new T.ShadowMaterial({ opacity: .45 })); sh.rotation.x = -Math.PI / 2; sh.position.y = TOP - 4.27; sh.receiveShadow = true; scene.add(sh);
      // labels
      c.labels = MM.labels(c.host);
      c.labels.add('biochar spread on the field', new T.Vector3(-2.6, TOP + .5, Dp / 2), { show: [-.01, .45] });
      c.labels.add('carried down by water, roots and worms', new T.Vector3(1.6, TOP - .9, Dp / 2), { show: [.3, 1.01] });
      c.labels.add('topsoil', new T.Vector3(W / 2 - .6, TOP - .4, Dp / 2), {});
      c.labels.add('subsoil', new T.Vector3(W / 2 - .6, TOP - 1.9, Dp / 2), {});
      c.remain = R.num('L083');
      if (!c.svg) return;

      // overlay: permanence chart and the two separate counters
      const svg = c.svg; svg.setAttribute('viewBox', R.isPartner ? '0 0 920 610' : '0 0 920 580');
      const ox = 490, oy = 400, w = 400, h = 300, LG = R.isPartner ? [oy - 156, 42, 50] : [oy - 118, 36, 36];
      S('path', { d: `M${ox},${oy - h} L${ox},${oy} L${ox + w},${oy}`, style: 'fill:none;stroke:var(--ink-2);stroke-width:1.5' }, svg);
      [0, 100, 200].forEach(y => S('text', { x: ox + y / 200 * w, y: oy + 22, 'text-anchor': 'middle', class: 'lbl-s', style: 'font-size:14px', text: y + ' yr' }, svg));
      S('text', { x: ox - 8, y: oy - h - 10, class: 'lbl-s', style: 'font-size:14px', text: 'share of char carbon still stored' }, svg);
      c.curves = [];
      const mk = (end, Tt, col, name, id, shape) => {
        let d = '';
        for (let tt = 0; tt <= Tt; tt += 4) { const y = shape === 'fast' ? 1 - (1 - end) * (1 - Math.exp(-tt / 25)) / (1 - Math.exp(-Tt / 25)) : 1 - (1 - end) * tt / Tt; d += (tt ? 'L' : 'M') + (ox + tt / 200 * w).toFixed(1) + ',' + (oy - y * h).toFixed(1); }
        const pth = S('path', { d, style: `fill:none;stroke:${col};stroke-width:3` }, svg);
        const L = pth.getTotalLength(); pth.style.strokeDasharray = L; pth.style.strokeDashoffset = L;
        const lab = fo(svg, ox + 14, LG[0] + c.curves.length * LG[1], 400, LG[2], `<span class="fo-s"><span style="display:inline-block;width:18px;height:4px;vertical-align:4px;background:${col}"></span> ${name}</span> ${R.N(id, { unit: '' })}`);
        c.curves.push([pth, L, lab, Tt]);
      };
      mk(R.num('L084'), 200, 'var(--p-gas)', 'EU credit, 200 yr', 'L084');
      mk(R.num('L083'), 100, 'var(--good)', 'physical, 100 yr', 'L083', 'fast');
      const yP = oy - R.num('L085') * h;
      const pl = S('line', { x1: ox, x2: ox + 40, y1: yP, y2: yP, style: 'stroke:var(--f-vine);stroke-width:3;stroke-dasharray:5 4' }, svg);
      const plab = fo(svg, ox + 14, LG[0] + 2 * LG[1], 400, LG[2], `<span class="fo-s"><span style="display:inline-block;width:18px;height:4px;vertical-align:4px;background:var(--f-vine)"></span> submitted paper composite, tick at left</span> ${R.N('L085', { unit: '' })}`);
      c.curves.push([pl, 0, plab, 0]);
      c.tl = S('line', { x1: ox, x2: ox, y1: oy - h, y2: oy, style: 'stroke:var(--ink);stroke-width:1;opacity:.6' }, svg);
      stat(svg, 16, 440, 430, R.isPartner ? 160 : 130, `<strong>Removed</strong>, per wet tonne<br>${R.N('L064', { part: 0, unit: 't CO2e stored after 100 yr', nochip: true })}<br>${R.N('L064', { part: 1, unit: 't CO2e net of plant operation' })}`);
      stat(svg, 470, 440, 434, R.isPartner ? 160 : 130, `<strong>Avoided</strong>, kept in its own column<br>${R.noinfo()}<br><span class="fo-s">Never added to removals. H/C<sub>org</sub> gate and olive char ${R.N('L086', { unit: '' })}. Beats chips on soil after ${R.N('L087')}.</span>`);
    },
    overlay(c, p) {
      const t = seg(p, .1, .85);
      c.tl.setAttribute('x1', 490 + t * 400); c.tl.setAttribute('x2', 490 + t * 400);
      c.curves.forEach(([el, L, lab, Tt]) => {
        if (L) el.style.strokeDashoffset = (L * (1 - clamp(t * 200 / Tt))).toFixed(1);
        lab.style.opacity = Tt ? (t * 200 >= Tt ? 1 : 0) : seg(p, .1, .2);
        if (!Tt) el.style.opacity = seg(p, .1, .2);
      });
    },
    update(c, p, t) {
      const a = lerp(-.42, .32, p);
      c.camera.position.set(Math.sin(a) * 22, lerp(7, 4, ease(seg(p, .1, .5))), Math.cos(a) * 22);
      c.camera.lookAt(0, .2, 0);
      const spread = ease(seg(p, .02, .16)), move = ease(seg(p, .2, .92)), yrs = seg(p, .1, .85) * 200;
      // share of char carbon still there, the fast physical curve, used only to thin the granules
      const left = 1 - (1 - c.remain) * (1 - Math.exp(-Math.min(yrs, 100) / 25)) / (1 - Math.exp(-100 / 25));
      const m = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), pos = new T.Vector3();
      c.gd.forEach((g, i) => {
        const fall = clamp(spread * 1.6 - g.k * .6);                       // granules land a few at a time
        const y = lerp(c.TOP + g.drop, c.TOP + .05, ease(fall)) - g.d * move;
        const gone = g.k > left + .02 ? clamp((1 - left) * 4) : 0;         // the share that decays fades out
        pos.set(g.x + g.w * move, y, g.z);
        q.setFromEuler(new T.Euler(i, i * 2.3, i * .7));
        sc.setScalar(fall > 0 ? g.s * (1 - gone) : 0.0001);
        m.compose(pos, q, sc); c.gran.setMatrixAt(i, m);
      });
      c.gran.instanceMatrix.needsUpdate = true;
      c.film.scale.y = Math.max(.01, spread * (1 - move * .85)); c.film.visible = spread > .02;
      c.worms.forEach((w, i) => { w.position.x = (i ? 1.4 : -2) + Math.sin(t / 2600 + i * 2) * .9; w.rotation.z = Math.sin(t / 1300 + i) * .25; });
      c.hy.geometry.setDrawRange(0, Math.floor(c.hyN * ease(seg(p, .35, .95)) / 2) * 2);
      c.labels.update(c.camera, p);
    }
  });

  /* ======================= S21 biodiversity: two halves of one plot ======================= */
  add('s21', {
    rect: [0, .03, .6, .74],
    data: ['cluster'],
    build(c) {
      const { scene } = c;
      lights(scene, { dir: [8, 14, 9], hemi: .85, sunI: 1.3, shadow: 11, rim: 1.0 });
      const W = 16, Dp = 10;
      // the plot: a slab of land, left half fully collected, right half keeps a share on the floor
      const soil = MM.box(W, .9, Dp, std('#4a3a2a', 1), 0, -.45, 0, scene);
      const bare = MM.box(W / 2, .04, Dp, std('#8b7656', 1), -W / 4, .02, 0, scene);
      const kept = MM.box(W / 2, .04, Dp, std('#5c5a34', 1), W / 4, .02, 0, scene);
      MM.box(.04, 1.6, Dp + .2, std('#f5f5f7', .4, 0, { transparent: true, opacity: .5 }), 0, .4, 0, scene).castShadow = false;
      // olive trees on both sides
      [[-5.2, -2.6], [-2.6, 2.4], [2.6, -2.6], [5.2, 2.4]].forEach(([x, z], i) => { const o = MM.oliveTree(700 + i); o.position.set(x, 0, z); o.scale.setScalar(.95); scene.add(o); });
      // sparse grass on the bare half, a thick sward with flowers on the kept half
      const g1 = MM.grass(260, W / 2 - .3, Dp - .3, null, 41, '#8a8a52', '#a39e66'); g1.position.set(-W / 4, .04, 0); scene.add(g1);
      c.life = new T.Group(); scene.add(c.life);
      const g2 = MM.grass(1800, W / 2 - .3, Dp - .3, null, 42, '#5f8a3f', '#8fae4f'); g2.position.set(W / 4, .04, 0); c.life.add(g2); c.g2 = g2;
      const fl = new T.InstancedMesh(new T.SphereGeometry(.06, 6, 5), std('#ffffff', .6), 160); const fm = new T.Matrix4();
      for (let i = 0; i < 160; i++) { fm.makeTranslation(.3 + hash(i, 1) * (W / 2 - .6), .32 + hash(i, 2) * .1, (hash(i, 3) - .5) * (Dp - .6)); fl.setMatrixAt(i, fm); fl.setColorAt(i, new T.Color(['#f5f5f7', '#ffd23f', '#c9a0ff'][i % 3])); }
      c.life.add(fl); c.fl = fl;
      // chipped mulch on the kept half
      const mulch = new T.InstancedMesh(new T.BoxGeometry(.12, .025, .07), std('#b39566', .9), 1400); const mm = new T.Matrix4();
      for (let i = 0; i < 1400; i++) { const a = hash(i, 5) * 6.28, r = Math.sqrt(hash(i, 6)) * 1.6; const cx = [2.6, 5.2][i % 2], cz = [-2.6, 2.4][i % 2]; mm.compose(new T.Vector3(cx + Math.cos(a) * r, .06, cz + Math.sin(a) * r), new T.Quaternion().setFromEuler(new T.Euler(0, hash(i, 7) * 6, 0)), new T.Vector3(1, 1, 1)); mulch.setMatrixAt(i, mm); }
      c.life.add(mulch); c.mulch = mulch;
      // deadwood log with beetles
      const log = MM.cyl(.32, .36, 3.4, std('#5a4634', .95), 4.6, .3, -.4, c.life, 18); log.rotation.z = Math.PI / 2; log.rotation.y = .4; c.log = log;
      const end = MM.cyl(.3, .3, .02, std('#a88a62', .9), 4.6 - 1.56, .3, -.4 - .67, c.life, 18); end.rotation.z = Math.PI / 2; end.rotation.y = .4; c.logEnd = end;
      c.beetles = Array.from({ length: 5 }, (_, i) => { const b = new T.Mesh(new T.SphereGeometry(.07, 10, 8), std('#16301f', .25, .6)); b.scale.set(1.4, .7, 1); c.life.add(b); return b; });
      // fungi on the chips and the log
      const fungus = (x, z, s, col) => { const g = new T.Group(); MM.cyl(.03 * s, .04 * s, .18 * s, std('#efe6d2', .8), 0, .09 * s, 0, g, 8); const cap = new T.Mesh(new T.SphereGeometry(.12 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(col, .7)); cap.position.y = .17 * s; g.add(cap); g.position.set(x, .05, z); c.life.add(g); return g; };
      c.fungi = [[2.2, -2.0, 1, '#d8893a'], [2.9, -3.1, .8, '#d8893a'], [3.2, -2.2, 1.2, '#e8d8b0'], [5.5, 2.9, 1, '#c86a2a'], [4.8, 1.9, .9, '#e8d8b0'], [3.6, -.6, .9, '#d8893a']].map(a => fungus(...a));
      // a bird on the kept side and a lizard on the log
      const bird = new T.Group(); c.life.add(bird);
      const bb = new T.Mesh(new T.SphereGeometry(.16, 14, 10), std('#6b4a35', .7)); bb.scale.set(1.3, 1, 1); bird.add(bb);
      const bh = new T.Mesh(new T.SphereGeometry(.1, 12, 10), std('#3b2b22', .7)); bh.position.set(.18, .1, 0); bird.add(bh);
      const beak = new T.Mesh(new T.ConeGeometry(.03, .09, 6), std('#e0a02a', .5)); beak.rotation.z = -Math.PI / 2; beak.position.set(.3, .09, 0); bird.add(beak);
      const tail = MM.box(.2, .03, .1, std('#4a3426', .7), -.25, .03, 0, bird); tail.rotation.z = .3;
      bird.position.set(5.4, 2.55, 2.4); c.bird = bird;
      const liz = new T.Group(); c.life.add(liz);
      const lb = new T.Mesh(new T.CylinderGeometry(.05, .03, .38, 8), std('#6e8a3a', .5)); lb.rotation.z = Math.PI / 2; liz.add(lb);
      liz.position.set(4.6, .66, -.4); liz.rotation.y = .4; c.liz = liz;
      // the bare half: a few dry stones, nothing else
      for (let i = 0; i < 18; i++) { const st = new T.Mesh(new T.DodecahedronGeometry(.08 + hash(i, 9) * .1, 0), std('#a49680', .9)); st.position.set(-.5 - hash(i, 1) * 7.2, .07, (hash(i, 2) - .5) * 9); scene.add(st); }
      const sh = new T.Mesh(new T.PlaneGeometry(60, 60), new T.ShadowMaterial({ opacity: .45 })); sh.rotation.x = -Math.PI / 2; sh.position.y = -.9; sh.receiveShadow = true; scene.add(sh);
      c.labels = MM.labels(c.host);
      c.labels.add('everything collected', new T.Vector3(-W / 4, 1.0, Dp / 2), {});
      c.labels.add('a share left on the floor', new T.Vector3(W / 4, 1.0, Dp / 2), {});
      c.labels.add('deadwood habitat', new T.Vector3(4.6, 1.1, -.4), { show: [.25, 1.01] });
      c.labels.add('fungi on chips', new T.Vector3(2.6, .7, -2.4), { show: [.38, 1.01] });
      c.labels.add('birds and insects', new T.Vector3(5.4, 3.0, 2.4), { show: [.5, 1.01] });
      if (!c.svg) return;

      // overlay: three lenses and the protected areas
      const svg = c.svg; svg.setAttribute('viewBox', '0 0 920 580');
      c.dials = [];
      [['carbon', false, 'var(--good)'], ['cost', false, 'var(--p-power)'], ['biodiversity', true, 'var(--warn)']].forEach(([nm, wip, col], i) => {
        const g = S('g', { transform: `translate(${640},${70 + i * 98})` }, svg);
        S('path', { d: 'M-40,0 A40,40 0 0 1 40,0', style: `fill:none;stroke:var(--line);stroke-width:8;stroke-linecap:round` }, g);
        S('path', { d: 'M-40,0 A40,40 0 0 1 28,-28', style: `fill:none;stroke:${col};stroke-width:8;stroke-linecap:round;${wip ? 'stroke-dasharray:6 7' : ''}` }, g);
        S('text', { x: 60, y: -10, style: 'font-size:19px;font-weight:700', text: nm }, g);
        fo(g, 58, -2, 240, 40, wip ? '<span class="chip wip">work in progress</span>' : '<span class="fo-xs">a lens of its own</span>');
        c.dials.push(g);
      });
      c.stat = stat(svg, 596, 352, 314, 64, `<span class="fo-s">Tier 1 agreement, GLOBIO and COSc ${R.N('L088', { unit: '' })}</span>`);
      const Cl = D.cluster;
      c.inset = S('svg', { x: 600, y: 428, width: 220, height: 140, viewBox: `0 0 ${Cl.W} ${Cl.H}` }, svg);
      const hatch = R.hatch(svg, 's21h3', 'var(--f-forest)');
      S('rect', { x: 0, y: 0, width: Cl.W, height: Cl.H, rx: 30, style: 'fill:var(--panel);stroke:var(--line);stroke-width:6' }, c.inset);
      Cl.munis.forEach(m => S('path', { d: m.d, style: 'fill:var(--land);stroke:var(--ink-2);stroke-width:4' }, c.inset));
      Cl.protected.forEach(pa => S('path', { d: pa.d, style: `fill:${hatch};stroke:var(--f-forest);stroke-width:6` }, c.inset));
      c.plab = fo(svg, 826, 470, 94, 80, '<span class="fo-xs">protected: no collection</span>');
    },
    overlay(c, p) {
      c.dials.forEach((g, i) => g.style.opacity = seg(p, .55 + i * .07, .65 + i * .07));
      c.stat.style.opacity = seg(p, .75, .82); c.inset.style.opacity = seg(p, .8, .88); c.plab.style.opacity = c.inset.style.opacity;
    },
    update(c, p, t) {
      const a = lerp(-.55, .25, p);
      c.camera.position.set(Math.sin(a) * 27, lerp(13, 9, p), Math.cos(a) * 27);
      c.camera.lookAt(0, .6, 0);
      // life returns to the kept half
      const k = ease(seg(p, .08, .3));
      [c.g2, c.fl, c.mulch].forEach(o => { o.scale.y = Math.max(.01, k); o.visible = k > .02; });
      const lg = ease(seg(p, .22, .36)); c.log.visible = c.logEnd.visible = lg > .02; c.log.scale.set(1, Math.max(.01, lg), 1);
      c.beetles.forEach(b => b.visible = p > .3); c.liz.visible = p > .4; c.bird.visible = p > .5;
      c.fungi.forEach((f, i) => f.scale.setScalar(Math.max(.01, ease(seg(p, .3 + i * .03, .45 + i * .03)))));
      c.beetles.forEach((b, i) => { const u = ((t / 9000) + i / 5) % 1; b.position.set(4.6 + (u - .5) * 2.8 * Math.cos(.4), .62, -.4 - (u - .5) * 2.8 * Math.sin(.4) + .05); b.rotation.y = -.4; });
      c.bird.position.y = 2.55 + Math.abs(Math.sin(t / 900)) * .06; c.bird.rotation.y = Math.sin(t / 2100) * .6;
      c.liz.position.x = 4.6 + Math.sin(t / 3000) * .5;
      c.labels.update(c.camera, p);
    }
  });

  /* ======================= S23 the mycelium ======================= */
  add('s23', {
    rect: [0, 0, 1, 1],
    fov: 42, near: 2, far: 6000,
    data: ['national', 'mycelium'],
    build(c) {
      const { scene, C } = c;
      const N = D.national, M = D.mycelium;
      scene.fog = new T.FogExp2(0x0b0e12, .00055);
      scene.add(new T.HemisphereLight(0x8090a8, 0x101010, .9));
      const X = x => x - N.W / 2, Z = y => y - N.H / 2;
      // Portugal as a thin dark slab, from the outline path
      const shapes = [];
      N.outline.split('Z').forEach(sub => {
        const pts = sub.replace('M', '').trim().split(/\s+/).filter(Boolean).map(s => s.split(',').map(Number));
        if (pts.length < 3) return;
        shapes.push(new T.Shape(pts.map(([x, y]) => new T.Vector2(X(x), -Z(y)))));
      });
      const slab = new T.Mesh(new T.ExtrudeGeometry(shapes, { depth: 3, bevelEnabled: false }), new T.MeshStandardMaterial({ color: 0x141a22, roughness: .95, metalness: 0 }));
      slab.rotation.x = -Math.PI / 2; slab.position.y = -3; scene.add(slab);
      // network: municipality tips to waste plants, plants to each other
      const FC = R.FEEDS.map(f => C(f.v, '#999'));
      const grey = new T.Color('#5c6470');
      const SEGN = 14;
      c.edges = M.edges.map((e, i) => ({ e, col: FC[e[4]], o: (hash(i, 3) - .5) * 40 }));
      const pos = new Float32Array(c.edges.length * SEGN * 2 * 3), col = new Float32Array(pos.length);
      c.lg = new T.BufferGeometry();
      c.lg.setAttribute('position', new T.BufferAttribute(pos, 3));
      c.lg.setAttribute('color', new T.BufferAttribute(col, 3));
      c.lines = new T.LineSegments(c.lg, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .85 }));
      scene.add(c.lines);
      c.grey = grey; c.SEGN = SEGN; c.X = X; c.Z = Z;
      const hyC = new T.Color('#d8c29e');
      c.trunks = new T.Group(); scene.add(c.trunks);
      M.trunk.forEach((tr, i) => {
        const a = new T.Vector3(X(tr[0]), .5, Z(tr[1])), b = new T.Vector3(X(tr[2]), .5, Z(tr[3]));
        const mid = a.clone().lerp(b, .5); const d = b.clone().sub(a); const n = new T.Vector3(-d.z, 0, d.x).normalize().multiplyScalar((hash(i, 9) - .5) * 30);
        const cu = new T.QuadraticBezierCurve3(a, mid.add(n), b);
        c.trunks.add(new T.Mesh(new T.TubeGeometry(cu, 24, 1.1, 6), new T.MeshBasicMaterial({ color: hyC, transparent: true, opacity: .85 })));
      });
      // tips and the residue moving inward
      const tp = new Float32Array(M.edges.length * 3), tc = new Float32Array(M.edges.length * 3);
      M.edges.forEach((e, i) => { tp.set([X(e[0]), .6, Z(e[1])], i * 3); const k = FC[e[4]]; tc.set([k.r, k.g, k.b], i * 3); });
      const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.BufferAttribute(tp, 3)); tg.setAttribute('color', new T.BufferAttribute(tc, 3));
      c.tips = new T.Points(tg, new T.PointsMaterial({ size: 5, vertexColors: true, sizeAttenuation: true }));
      scene.add(c.tips);
      const fp = new Float32Array(M.edges.length * 3);
      c.fg = new T.BufferGeometry(); c.fg.setAttribute('position', new T.BufferAttribute(fp, 3)); c.fg.setAttribute('color', new T.BufferAttribute(tc.slice(), 3));
      c.flow = new T.Points(c.fg, new T.PointsMaterial({ size: 3.2, vertexColors: true, transparent: true, opacity: .95 }));
      scene.add(c.flow);
      // below ground: hyphae hanging under the map, around roots
      const under = [];
      const rnd = R.rand(7);
      const grow = (p, dir, len, depth) => {
        if (depth <= 0) return;
        const q = p.clone().add(dir.clone().multiplyScalar(len));
        under.push(p, q);
        const n = rnd() < .4 ? 3 : 2;
        for (let i = 0; i < n; i++) grow(q, dir.clone().add(new T.Vector3((rnd() - .5) * 1.3, (rnd() - .7) * .6, (rnd() - .5) * 1.3)).normalize(), len * .72, depth - 1);
      };
      for (let i = 0; i < 26; i++) { const e = M.edges[Math.floor(rnd() * M.edges.length)]; grow(new T.Vector3(X(e[0]), -3, Z(e[1])), new T.Vector3(0, -1, 0), 26, 7); }
      c.ug = new T.BufferGeometry().setFromPoints(under);
      c.underN = under.length; c.ug.setDrawRange(0, 0);
      c.under = new T.LineSegments(c.ug, new T.LineBasicMaterial({ color: hyC, transparent: true, opacity: .8 }));
      scene.add(c.under);
      if (!c.svg) return;

      // overlay: the wordmark with branching letters and the final line
      const svg = c.svg; svg.setAttribute('viewBox', `0 0 ${N.W} ${N.H}`); svg.classList.add('natscale');
      c.word = S('g', { style: 'opacity:0' }, svg);
      S('rect', { x: N.W * .08, y: N.H * .36, width: N.W * .84, height: N.H * .28, rx: 14, style: 'fill:#0e1116;opacity:.78' }, c.word);
      c.letters = [];
      'RAMOS'.split('').forEach((l, i) => {
        const x = N.W * (.18 + i * .16);
        S('text', { x, y: N.H * .5, 'text-anchor': 'middle', class: 'wordmark', style: 'font-size:84px;fill:#eef0f2', text: l }, c.word);
        const o = [];
        const br = (x0, y0, ang, len, depth, rr) => { if (depth <= 0) return; const x2 = x0 + Math.cos(ang) * len, y2 = y0 + Math.sin(ang) * len; const pth = S('path', { d: `M${x0.toFixed(1)},${y0.toFixed(1)} Q${((x0 + x2) / 2 + (rr() - .5) * len * .35).toFixed(1)},${((y0 + y2) / 2).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`, style: `fill:none;stroke:#d8c29e;stroke-width:${(depth * .3).toFixed(2)};stroke-linecap:round` }, c.word); o.push([pth, depth]); for (let k = 0; k < 2; k++) br(x2, y2, ang + (rr() - .5) * 1.5, len * .66, depth - 1, rr); };
        br(x, N.H * .5 + 14, Math.PI / 2 + (i - 2) * .07, 34, 5, R.rand(60 + i));
        o.forEach(([pp]) => { const L = pp.getTotalLength(); pp.style.strokeDasharray = L; pp.style.strokeDashoffset = L; pp.dataset.len = L; });
        c.letters.push(o);
      });
      c.final = S('g', { style: 'opacity:0' }, svg);
      S('rect', { x: N.W * .04, y: N.H * .665, width: N.W * .92, height: 110, rx: 12, style: 'fill:#0e1116;opacity:.82' }, c.final);
      const ft = S('text', { x: N.W / 2, y: N.H * .665 + 46, 'text-anchor': 'middle', style: 'font-family:var(--serif);font-size:27px;fill:#eef0f2' }, c.final);
      S('tspan', { x: N.W / 2, dy: 0, text: 'Model human systems on nature,' }, ft);
      S('tspan', { x: N.W / 2, dy: 36, text: 'in a way that helps us and our planet.' }, ft);
    },
    overlay(c, p) {
      c.word.style.opacity = seg(p, .76, .86);
      c.letters.forEach(o => { const k = seg(p, .8, .95); o.forEach(([el, depth]) => { const l = clamp(k * 5 - (5 - depth)); el.style.strokeDashoffset = (+el.dataset.len * (1 - l)).toFixed(1); el.style.opacity = l > 0 ? 1 : 0; }); });
      c.final.style.opacity = seg(p, .9, .98);
    },
    update(c, p, t) {
      const m = ease(seg(p, .05, .4)), colK = seg(p, .15, .4);
      const pos = c.lg.attributes.position.array, col = c.lg.attributes.color.array;
      let j = 0;
      const tmp = new T.Color();
      c.edges.forEach(({ e, col: fc, o }) => {
        const x1 = c.X(e[0]), z1 = c.Z(e[1]), x2 = c.X(e[2]), z2 = c.Z(e[3]);
        const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz) || 1;
        const cx = (x1 + x2) / 2 - dz / L * o * m, cz = (z1 + z2) / 2 + dx / L * o * m;
        tmp.copy(c.grey).lerp(fc, colK);
        let px = x1, pz = z1;
        for (let k = 1; k <= c.SEGN; k++) {
          const u = k / c.SEGN, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, d = u * u;
          const qx = a * x1 + b * cx + d * x2, qz = a * z1 + b * cz + d * z2;
          pos[j] = px; pos[j + 1] = .5; pos[j + 2] = pz; pos[j + 3] = qx; pos[j + 4] = .5; pos[j + 5] = qz;
          col[j] = col[j + 3] = tmp.r; col[j + 1] = col[j + 4] = tmp.g; col[j + 2] = col[j + 5] = tmp.b;
          j += 6; px = qx; pz = qz;
        }
      });
      c.lg.attributes.position.needsUpdate = true; c.lg.attributes.color.needsUpdate = true;
      c.trunks.children.forEach(tb => tb.material.opacity = .25 + .65 * m);
      c.tips.material.size = 3 + 4 * m;
      // residue moving inward along each thread
      const fp = c.fg.attributes.position.array;
      c.edges.forEach(({ e, o }, i) => {
        const u = ((t / 6000) + hash(i, 1)) % 1;
        const x1 = c.X(e[0]), z1 = c.Z(e[1]), x2 = c.X(e[2]), z2 = c.Z(e[3]);
        const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz) || 1;
        const cx = (x1 + x2) / 2 - dz / L * o * m, cz = (z1 + z2) / 2 + dx / L * o * m;
        const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, d = u * u;
        fp[i * 3] = a * x1 + b * cx + d * x2; fp[i * 3 + 1] = .9; fp[i * 3 + 2] = a * z1 + b * cz + d * z2;
      });
      c.fg.attributes.position.needsUpdate = true;
      c.flow.visible = colK > .5;
      // camera: top down, tilt, dive below, rise back
      const tilt = ease(seg(p, .1, .42)), dive = ease(seg(p, .45, .58)) * (1 - ease(seg(p, .66, .78)));
      const cam = c.camera;
      const top = new T.Vector3(0, 1500, 1), obl = new T.Vector3(-260, 520, 640), below = new T.Vector3(-120, -150, 260);
      cam.position.copy(top).lerp(obl, tilt).lerp(below, dive);
      const look = new T.Vector3(0, 0, 0).lerp(new T.Vector3(-30, -110, 60), dive);
      cam.lookAt(look);
      c.ug.setDrawRange(0, Math.floor(c.underN * ease(seg(p, .44, .66)) / 2) * 2);
    }
  });
})();
