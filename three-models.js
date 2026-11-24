/* RAMOS story site: detailed generic models for the 3D scenes (three.js r128).
 * Prunings, olive trees, the arborist rig, plant components, and 3D labels.
 * Everything is procedural and generic: no brands or vendor shapes.
 */
(function () {
  'use strict';
  if (!window.THREE) return;
  const T = window.THREE;
  const M = (window.RAMOS3M = {});
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const rand = seed => { let s = (seed >>> 0) || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const std = (color, rough, metal, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: rough === undefined ? .85 : rough, metalness: metal || 0 }, extra || {}));
  M.std = std;

  /* ---------- geometry merge with per-vertex colour ---------- */
  function merge(parts) {
    let n = 0;
    const ps = parts.map(([g, m, c]) => {
      const gi = (g.index ? g.toNonIndexed() : g.clone());
      if (m) gi.applyMatrix4(m);
      if (!gi.attributes.normal) gi.computeVertexNormals();
      n += gi.attributes.position.count;
      return [gi, c];
    });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    ps.forEach(([g, c]) => {
      const P = g.attributes.position.array, N = g.attributes.normal.array, k = P.length / 3;
      pos.set(P, o * 3); nor.set(N, o * 3);
      for (let i = 0; i < k; i++) {
        const cc = typeof c === 'function' ? c(i, P[i * 3], P[i * 3 + 1], P[i * 3 + 2]) : c;
        col[(o + i) * 3] = cc.r; col[(o + i) * 3 + 1] = cc.g; col[(o + i) * 3 + 2] = cc.b;
      }
      o += k;
    });
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3));
    out.setAttribute('normal', new T.BufferAttribute(nor, 3));
    out.setAttribute('color', new T.BufferAttribute(col, 3));
    return out;
  }
  M.merge = merge;

  /* ---------- one olive leaf (lanceolate) ---------- */
  const leafG = (() => {
    const g = new T.BufferGeometry();
    const v = [0, 0, 0, .011, .035, 0, 0, .085, 0, 0, 0, 0, 0, .085, 0, -.011, .035, 0];
    g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  })();

  /* ---------- a pruned branch: forked stem, side shoots, leaves ---------- */
  M.twigGeo = function (seed, opts) {
    opts = opts || {};
    const rnd = rand(seed);
    const parts = [];
    const bark = new T.Color(opts.bark || '#6e5a44');
    const L = (opts.len || 1.1) * (.75 + rnd() * .5);
    const pts = [new T.Vector3(0, 0, 0)];
    for (let i = 1; i <= 4; i++) pts.push(new T.Vector3((rnd() - .5) * .12 * i, L * i / 4, (rnd() - .5) * .12 * i));
    const stem = new T.CatmullRomCurve3(pts);
    parts.push([new T.TubeGeometry(stem, 8, opts.r || .02, 5, false), null, c => bark.clone().offsetHSL(0, 0, (hash(c, 3) - .5) * .06)]);
    const leafA = new T.Color(opts.leafA || '#4d5a39'), leafB = new T.Color(opts.leafB || '#9aa48a');
    const shoots = 3 + Math.floor(rnd() * 3);
    const addLeaves = (curve, count) => {
      if (opts.leafless) return;
      for (let k = 0; k < count; k++) {
        const t = .2 + .8 * rnd();
        const p = curve.getPoint(t), tan = curve.getTangent(t);
        const m = new T.Matrix4();
        const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), tan.clone().applyAxisAngle(new T.Vector3(rnd() - .5, 0, rnd() - .5).normalize(), .7 + rnd() * .5));
        q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rnd() * 6.28));
        const s = (opts.leafScale || 1.6) * (.75 + rnd() * .5);
        m.compose(p, q, new T.Vector3(s, s, s));
        const col = leafA.clone().lerp(leafB, rnd() * rnd());
        parts.push([leafG, m, col]);
      }
    };
    for (let s = 0; s < shoots; s++) {
      const t = .25 + .65 * rnd();
      const p0 = stem.getPoint(t), tan = stem.getTangent(t);
      const axis = new T.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).normalize();
      const dir = tan.clone().applyAxisAngle(axis, .55 + rnd() * .45);
      const l = L * (.22 + rnd() * .3);
      const c = new T.CatmullRomCurve3([p0, p0.clone().add(dir.clone().multiplyScalar(l * .5)).add(new T.Vector3(0, l * .08, 0)), p0.clone().add(dir.clone().multiplyScalar(l))]);
      parts.push([new T.TubeGeometry(c, 4, (opts.r || .02) * .5, 4, false), null, bark]);
      addLeaves(c, opts.leaves === undefined ? 9 : opts.leaves);
    }
    addLeaves(stem, opts.leaves === undefined ? 7 : Math.round(opts.leaves * .7));
    return merge(parts);
  };

  /* ---------- a pile of real-looking prunings, grows with setFill(0..1) ---------- */
  M.prunings = function (n, radius, height, seed, opts) {
    opts = opts || {};
    const rnd = rand(seed || 3);
    const variants = opts.variants || 6;
    const mat = std(0xffffff, .85, 0, { vertexColors: true, side: T.DoubleSide });
    const g = new T.Group();
    const meshes = [];
    const per = Math.ceil(n / variants);
    for (let v = 0; v < variants; v++) {
      const geo = M.twigGeo(seed * 31 + v * 7, opts);
      const mesh = new T.InstancedMesh(geo, mat, per);
      mesh.castShadow = true; mesh.receiveShadow = true;
      const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3();
      for (let i = 0; i < per; i++) {
        const k = (i * variants + v) / n, a = rnd() * 6.28, r = radius * Math.sqrt(rnd()) * (1 - k * .5);
        const y = height * (k * .85 + rnd() * .15) * (1 - (r / radius) ** 2 * .75);
        p.set(Math.cos(a) * r, Math.max(.02, y), Math.sin(a) * r);
        e.set(Math.PI / 2 + (rnd() - .5) * .9, rnd() * 6.28, (rnd() - .5) * .9, 'YXZ');
        q.setFromEuler(e);
        const sc = .8 + rnd() * .5; s.set(sc, sc, sc);
        m.compose(p, q, s); mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
      meshes.push(mesh); g.add(mesh);
    }
    g.userData.setFill = f => meshes.forEach(m => { m.count = Math.round(per * Math.max(0, Math.min(1, f))); });
    return g;
  };

  /* ---------- an old olive tree: gnarled bole, limbs, silver-green crown ---------- */
  M.oliveTree = function (seed, opts) {
    opts = opts || {};
    const rnd = rand(seed);
    const barkA = new T.Color(opts.bark || '#5d5145'), barkB = new T.Color('#3e352d');
    const wood = [], crown = [];
    const barkCol = (i, x, y, z) => barkA.clone().lerp(barkB, hash(Math.round(x * 20), Math.round(y * 20 + z * 7)) * .8);
    // flared bole
    const bole = new T.CylinderGeometry(.26, .42, .6, 12, 3);
    const bp = bole.attributes.position;
    for (let i = 0; i < bp.count; i++) { const n = 1 + (hash(i, seed) - .5) * .25; bp.setX(i, bp.getX(i) * n); bp.setZ(i, bp.getZ(i) * n); }
    wood.push([bole, new T.Matrix4().makeTranslation(0, .3, 0), barkCol]);
    // two or three twisted stems
    const stems = 2 + Math.floor(rnd() * 2), tops = [];
    for (let s = 0; s < stems; s++) {
      const a = s / stems * 6.28 + rnd(), lean = .25 + rnd() * .2;
      const pts = [new T.Vector3(Math.cos(a) * .08, .3, Math.sin(a) * .08)];
      for (let k = 1; k <= 4; k++) pts.push(new T.Vector3(Math.cos(a + k * .5) * (.1 + lean * k * .25), .3 + k * .42, Math.sin(a + k * .5) * (.1 + lean * k * .25)));
      const c = new T.CatmullRomCurve3(pts);
      wood.push([new T.TubeGeometry(c, 14, .14 - s * .015, 8, false), null, barkCol]);
      tops.push(pts[pts.length - 1]);
    }
    // limbs from each stem top
    const ends = [];
    tops.forEach(tp => {
      const nl = 2 + Math.floor(rnd() * 2);
      for (let l = 0; l < nl; l++) {
        const a = rnd() * 6.28, out = 1 + rnd() * .9;
        const end = new T.Vector3(tp.x + Math.cos(a) * out, tp.y + .7 + rnd() * .8, tp.z + Math.sin(a) * out);
        const mid = tp.clone().lerp(end, .5).add(new T.Vector3(0, .2, 0));
        wood.push([new T.TubeGeometry(new T.CatmullRomCurve3([tp, mid, end]), 8, .06, 6, false), null, barkCol]);
        ends.push(end);
      }
    });
    // crown: many small noisy clumps, silver-green
    const ca = new T.Color(opts.leafA || '#3c4730'), cb = new T.Color(opts.leafB || '#7b8670');
    ends.forEach((e, ei) => {
      const nclump = 7 + Math.floor(rnd() * 5);
      for (let k = 0; k < nclump; k++) {
        const r = .28 + rnd() * .3;
        const ic = new T.IcosahedronGeometry(r, 2);
        const pa = ic.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
          const n = 1 + (hash(Math.round(x * 40) + ei, Math.round(y * 40 + z * 13) + k) - .5) * .55;
          pa.setXYZ(i, x * n, y * n * .75, z * n);
        }
        ic.computeVertexNormals();
        const m = new T.Matrix4().makeTranslation(e.x + (rnd() - .5) * 1.1, e.y + (rnd() - .35) * .6, e.z + (rnd() - .5) * 1.1);
        crown.push([ic, m, (i, x, y, z) => ca.clone().lerp(cb, Math.max(0, Math.min(1, hash(Math.round(x * 30), Math.round(z * 30)) * .7 + (y - e.y) * .4)))]);
      }
    });
    const g = new T.Group();
    const w = new T.Mesh(merge(wood), std(0xffffff, .95, 0, { vertexColors: true }));
    const c = new T.Mesh(merge(crown), std(0xffffff, .82, 0, { vertexColors: true }));
    w.castShadow = c.castShadow = true; w.receiveShadow = c.receiveShadow = true;
    g.add(w); g.add(c);
    g.userData.crown = ends;
    return g;
  };

  /* ---------- grass tufts over a terrain ---------- */
  M.grass = function (count, w, d, hfn, seed, colA, colB) {
    if (window.RAMOS3_COMPACT) { const a = Math.min(w, RAMOS3_COMPACT.w) * Math.min(d, RAMOS3_COMPACT.d) / (w * d); w = Math.min(w, RAMOS3_COMPACT.w); d = Math.min(d, RAMOS3_COMPACT.d); count = Math.round(count * a); }
    const rnd = rand(seed || 9);
    const blade = new T.ConeGeometry(.025, .3, 3); blade.translate(0, .15, 0);
    const parts = [];
    for (let i = 0; i < 6; i++) { const m = new T.Matrix4().compose(new T.Vector3((rnd() - .5) * .12, 0, (rnd() - .5) * .12), new T.Quaternion().setFromEuler(new T.Euler((rnd() - .5) * .6, 0, (rnd() - .5) * .6)), new T.Vector3(1, .7 + rnd() * .6, 1)); parts.push([blade, m, new T.Color(colA || '#7d8a52').lerp(new T.Color(colB || '#a3a066'), rnd())]); }
    const tuft = merge(parts);
    const mesh = new T.InstancedMesh(tuft, std(0xffffff, .95, 0, { vertexColors: true }), count);
    const m = new T.Matrix4();
    for (let i = 0; i < count; i++) { const x = (rnd() - .5) * w, z = (rnd() - .5) * d; m.compose(new T.Vector3(x, hfn ? hfn(x, z) : 0, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rnd() * 6), new T.Vector3(1, 1, 1).multiplyScalar(.7 + rnd() * .8)); mesh.setMatrixAt(i, m); }
    mesh.receiveShadow = true;
    return mesh;
  };

  /* ---------- wheels and small parts ---------- */
  function wheel(r, w) {
    const g = new T.Group();
    const tyre = new T.Mesh(new T.CylinderGeometry(r, r, w, 28), std(0x161616, .95)); tyre.rotation.x = Math.PI / 2; tyre.castShadow = true; g.add(tyre);
    const rim = new T.Mesh(new T.CylinderGeometry(r * .58, r * .58, w + .02, 18), std(0xb9bec4, .35, .8)); rim.rotation.x = Math.PI / 2; g.add(rim);
    const hub = new T.Mesh(new T.CylinderGeometry(r * .2, r * .2, w + .05, 10), std(0x55595e, .4, .7)); hub.rotation.x = Math.PI / 2; g.add(hub);
    return g;
  }
  M.wheel = wheel;
  const box = (w, h, d, mat, x, y, z, parent) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; };
  const cyl = (rt, rb, h, mat, x, y, z, parent, seg) => { const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 24), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; };
  const tube = (pts, r, mat, parent, seg) => { const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), seg || 24, r, 10), mat); m.castShadow = true; if (parent) parent.add(m); return m; };
  M.box = box; M.cyl = cyl; M.tube = tube;
  function rail(pts, parent, mat) {     // simple handrail: posts and two rails
    mat = mat || std(0xd8b23a, .5, .4);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = new T.Vector3(...pts[i]), b = new T.Vector3(...pts[i + 1]);
      [0.55, 1.05].forEach(h => tube([[a.x, a.y + h, a.z], [b.x, b.y + h, b.z]], .025, mat, parent, 2));
      cyl(.025, .025, 1.05, mat, a.x, a.y + .52, a.z, parent, 6);
    }
    const l = pts[pts.length - 1]; cyl(.025, .025, 1.05, mat, l[0], l[1] + .52, l[2], parent, 6);
  }
  M.rail = rail;
  function ladder(x, y0, y1, z, parent, rotY) {
    const g = new T.Group(); const m = std(0xd8b23a, .5, .4);
    [-.22, .22].forEach(o => cyl(.03, .03, y1 - y0, m, o, (y1 - y0) / 2, 0, g, 6));
    for (let y = .3; y < y1 - y0; y += .3) { const r = cyl(.02, .02, .44, m, 0, y, 0, g, 6); r.rotation.z = Math.PI / 2; }
    g.position.set(x, y0, z); g.rotation.y = rotY || 0; parent.add(g); return g;
  }
  M.ladder = ladder;

  /* ---------- arborist rig: cab-over tipper with enclosed chip box ---------- */
  M.arboristTruck = function (opts) {
    opts = opts || {};
    const g = new T.Group();
    const white = std(opts.cab || '#e9e7e1', .35, .15), dark = std(0x1d1f22, .7, .3), glass = std(0x1d2a33, .08, .7, { envMapIntensity: 1 });
    const alu = std('#b9bdc1', .4, .75), trim = std('#2b2d30', .6, .4);
    // chassis rails
    box(7.2, .28, .9, dark, -.2, .78, 0, g);
    // cab-over crew cab
    const cab = new T.Group(); g.add(cab);
    box(2.2, 2.2, 2.3, white, 2.35, 2.0, 0, cab);
    box(.06, .95, 2.05, glass, 3.47, 2.45, 0, cab);                 // windscreen
    [-1.16, 1.16].forEach(z => { box(1.0, .7, .04, glass, 2.85, 2.45, z, cab); box(.8, .6, .04, glass, 1.75, 2.45, z, cab); });
    box(.12, .5, 2.3, trim, 3.46, 1.15, 0, cab);                     // bumper
    box(.05, .55, 1.4, trim, 3.47, 1.65, 0, cab);                    // grille
    [-.85, .85].forEach(z => box(.06, .14, .35, std(0xfff4d6, .2, 0, { emissive: 0xfff4d6, emissiveIntensity: .25 }), 3.48, 1.35, z, cab));
    [-1.28, 1.28].forEach(z => { const arm = box(.05, .05, .25, trim, 3.3, 2.6, z * .96, cab); const mir = box(.08, .35, .2, trim, 3.3, 2.45, z * 1.06, cab); });
    box(2.2, .08, 2.3, trim, 2.35, 3.12, 0, cab);                    // roof
    box(.6, .18, 2.0, std('#ffb000', .4, 0, { emissive: 0xff9000, emissiveIntensity: .4 }), 2.3, 3.24, 0, cab); // beacon bar
    [-1.17, 1.17].forEach(z => box(.9, .9, .02, trim, 2.4, 1.55, z, cab)); // door lines
    // enclosed chip box with an open hood at the front top
    const bx0 = -3.75, bx1 = 1.1, by0 = 1.0, by1 = 3.2, bw = 2.4;
    const L = bx1 - bx0, cx = (bx0 + bx1) / 2;
    box(L, .1, bw, alu, cx, by0, 0, g);
    box(.08, by1 - by0, bw, alu, bx1, (by0 + by1) / 2, 0, g);                      // headboard
    const far = box(L, by1 - by0, .06, alu, cx, (by0 + by1) / 2, -bw / 2, g);
    const nearMat = opts.cutaway ? std('#b9bdc1', .4, .7, { transparent: true, opacity: .2, depthWrite: false }) : alu;
    let near;
    if (opts.rearOpen) { near = box(L, by1 - by0, .06, alu, cx, (by0 + by1) / 2, bw / 2, g); }
    else if (opts.sideOpen) {
      // the near side opens: a low solid wall, then an open bay the chipper blows into, with the side door swung up
      const wallH = 1.05;
      near = box(L, wallH, .06, alu, cx, by0 + wallH / 2, bw / 2, g);
      box(L, .12, .08, trim, cx, by1 - .06, bw / 2, g);                                   // top rail
      [bx0 + .05, bx1 - .05].forEach(x => box(.1, by1 - by0, .1, trim, x, (by0 + by1) / 2, bw / 2, g));
      const door = box(L - .3, by1 - by0 - wallH - .1, .05, alu, cx, by1 + .02, bw / 2 + .55, g);     // gull-wing door, swung up and out
      door.rotation.x = -1.15; door.position.set(cx, by1 + .38, bw / 2 + .5);
      [bx0 + .5, bx1 - .5].forEach(x => { const st = cyl(.025, .025, .9, trim, x, by1 + .1, bw / 2 + .25, g, 6); st.rotation.x = -.9; });
      box(L - .2, .04, .04, std('#ffb000', .4, 0), cx, by0 + wallH + .02, bw / 2 + .04, g);         // hi-vis edge
    } else { near = box(L, by1 - by0, .06, nearMat, cx, (by0 + by1) / 2, bw / 2, g); }
    near.castShadow = false;
    if (opts.rearOpen) {
      // rear: lower doors closed, the upper rear door hinged up so the chute blows straight in
      const lowH = 1.05;
      box(.08, lowH, bw, alu, bx0, by0 + lowH / 2, 0, g);
      box(.02, lowH - .1, .02, trim, bx0 - .05, by0 + lowH / 2, 0, g);
      [-bw / 2 + .05, bw / 2 - .05].forEach(z => box(.1, by1 - by0, .1, trim, bx0, (by0 + by1) / 2, z, g));
      const up = box(.05, by1 - by0 - lowH, bw - .1, alu, bx0 - .5, by1 + .3, 0, g); up.rotation.z = 1.05;
      box(.04, .04, bw - .2, std('#ffb000', .4, 0), bx0 - .03, by0 + lowH + .02, 0, g);
    } else {
      box(.08, by1 - by0, bw, alu, bx0, (by0 + by1) / 2, 0, g);                      // rear doors
      box(.02, by1 - by0 - .1, .02, trim, bx0 - .05, (by0 + by1) / 2, 0, g);
    }
    box(opts.sideOpen || opts.rearOpen ? L : L - 1.2, .06, bw, alu, opts.sideOpen || opts.rearOpen ? cx : cx + .6, by1, 0, g);     // roof
    for (let i = 0; i < 7; i++) { box(.05, by1 - by0, .07, trim, bx0 + .3 + i * (L - .6) / 6, (by0 + by1) / 2, -bw / 2 - .04, g); }
    if (!opts.sideOpen) for (let i = 0; i < 7; i++) { const r = box(.05, by1 - by0, .07, opts.cutaway ? nearMat : trim, bx0 + .3 + i * (L - .6) / 6, (by0 + by1) / 2, bw / 2 + .04, g); r.castShadow = false; }
    // wheels: single front, dual rear
    [[2.45, 1.05], [2.45, -1.05]].forEach(([x, z]) => { const w = wheel(.52, .32); w.position.set(x, .52, z); g.add(w); });
    [[-1.7, 1.0], [-1.7, -1.0], [-1.7, .68], [-1.7, -.68]].forEach(([x, z]) => { const w = wheel(.52, .3); w.position.set(x, .52, z); g.add(w); });
    box(1.4, .08, .25, dark, -1.7, 1.12, 1.2, g); box(1.4, .08, .25, dark, -1.7, 1.12, -1.2, g); // mudguards
    box(.4, .2, .2, dark, -3.85, .62, 0, g);                           // tow hitch
    g.userData.box = { x0: bx0 + .1, x1: bx1 - .1, y0: by0 + .05, y1: by1 - .05, z0: -bw / 2 + .1, z1: bw / 2 - .1 };
    g.userData.hood = opts.rearOpen ? new T.Vector3(bx0 + 1.6, by1 - .6, 0) : opts.sideOpen ? new T.Vector3(cx, by1 - .45, bw / 2 - .2) : new T.Vector3(bx0 + .6, by1 + .05, 0);
    g.userData.hitch = new T.Vector3(-3.95, .62, 0);
    return g;
  };

  const lerpN = (a, b, t) => a + (b - a) * t;
  /* ---------- towed drum chipper, hand-fed, discharge into the chip box ---------- */
  M.drumChipper = function (opts) {
    opts = opts || {};
    const g = new T.Group();
    const body = std(opts.body || '#3d4246', .45, .35), dark = std(0x1a1c1e, .7, .3), steel = std('#8d9399', .4, .7);
    const yellow = std('#e7b416', .45, .1), black = std('#151515', .6);
    // frame and drawbar (drawbar points +x to the truck)
    box(2.6, .16, .9, dark, 0, .62, 0, g);
    box(1.9, .1, .1, dark, 2.15, .62, 0, g);
    const eye = new T.Mesh(new T.TorusGeometry(.09, .03, 8, 16), dark); eye.position.set(3.1, .62, 0); eye.rotation.x = Math.PI / 2; g.add(eye);
    cyl(.05, .05, .5, dark, 1.6, .38, 0, g, 8);                         // jockey wheel post
    const jw = wheel(.12, .08); jw.position.set(1.6, .12, 0); g.add(jw);
    // engine hood
    const hood = box(1.3, .9, 1.15, body, .75, 1.2, 0, g);
    for (let i = 0; i < 6; i++) box(.02, .5, .9, dark, .3 + i * .15, 1.2, .58, g);   // louvres
    // drum housing (horizontal cylinder across)
    const drum = cyl(.62, .62, 1.0, body, -.35, 1.35, 0, g, 32); drum.rotation.x = Math.PI / 2;
    const plate = cyl(.64, .64, .04, steel, -.35, 1.35, .52, g, 32); plate.rotation.x = Math.PI / 2;
    // infeed chute at the back, tapering towards the feed rollers
    const chute = new T.Mesh(new T.CylinderGeometry(.4, .72, 1.0, 4, 1, true), std(opts.body || '#3d4246', .5, .35, { side: T.DoubleSide }));
    chute.rotation.z = Math.PI / 2; chute.rotation.x = Math.PI / 4; chute.position.set(-1.45, 1.18, 0); chute.castShadow = true; g.add(chute);
    box(.6, .06, 1.25, steel, -2.35, .78, 0, g);                       // infeed table
    const roller = cyl(.2, .2, .95, steel, -1.0, 1.25, 0, g, 16); roller.rotation.x = Math.PI / 2;
    // yellow safety bar around the infeed mouth with black stripes
    const bar = new T.Group(); g.add(bar);
    [[-2.2, .78, .7, -2.2, 1.85, .7], [-2.2, .78, -.7, -2.2, 1.85, -.7], [-2.2, 1.85, .7, -2.2, 1.85, -.7]].forEach(([x1, y1, z1, x2, y2, z2]) => tube([[x1, y1, z1], [x2, y2, z2]], .04, yellow, bar, 2));
    for (let i = 0; i < 4; i++) { const s = cyl(.045, .045, .08, black, -2.2, 1.85, -.5 + i * .33, bar, 8); s.rotation.x = Math.PI / 2; }
    // discharge: vertical riser from the drum, then a swan neck forward to the truck hood
    let disc, discEnd;
    if (opts.straightChute) {
      // one straight discharge tube from the drum outlet, angled up towards the truck, with a small deflector cap
      const a0 = new T.Vector3(-.25, 1.85, 0), a1 = new T.Vector3(1.325, 2.675, 0);
      const dir = a1.clone().sub(a0), len = dir.length();
      const tubeM = new T.Mesh(new T.CylinderGeometry(.12, .14, len, 18), body); tubeM.position.copy(a0).add(a1).multiplyScalar(.5);
      tubeM.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize()); tubeM.castShadow = true; g.add(tubeM);
      const collar = new T.Mesh(new T.CylinderGeometry(.18, .18, .18, 18), steel); collar.position.copy(a0); collar.quaternion.copy(tubeM.quaternion); g.add(collar);
      const capD = new T.Mesh(new T.CylinderGeometry(.14, .19, .3, 16, 1, true, 0, Math.PI), std('#e7b416', .45, .1, { side: T.DoubleSide }));
      capD.position.copy(a1).add(dir.clone().normalize().multiplyScalar(.1)); capD.quaternion.copy(tubeM.quaternion); capD.rotateY(Math.PI / 2); g.add(capD);
      const crank = cyl(.02, .02, .7, dark, .4, 2.25, .22, g, 6); crank.rotation.z = -1.2;
      disc = [[a0.x, a0.y, 0], [lerpN(a0.x, a1.x, .5), lerpN(a0.y, a1.y, .5), 0], [a1.x, a1.y, 0]];
      discEnd = new T.Vector3(a1.x + .2, a1.y + .05, 0);
    } else if (opts.shortChute) {
      // short swivel chute: a stub riser, a turret ring and a deflector hood aimed sideways (-z)
      disc = [[-.35, 1.9, 0], [-.35, 2.45, 0], [-.35, 2.78, -.22], [-.35, 2.86, -.62]];
      tube(disc, .19, body, g, 24);
      const ring = new T.Mesh(new T.TorusGeometry(.24, .045, 8, 24), steel); ring.rotation.x = Math.PI / 2; ring.position.set(-.35, 2.2, 0); g.add(ring);
      const hoodD = new T.Mesh(new T.CylinderGeometry(.26, .2, .34, 16, 1, true, 0, Math.PI), std('#e7b416', .45, .1, { side: T.DoubleSide }));
      hoodD.rotation.x = Math.PI / 2; hoodD.rotation.y = Math.PI / 2; hoodD.position.set(-.35, 2.92, -.78); g.add(hoodD);
      const lever = tube([[-.35, 2.86, -.62], [-.05, 2.3, -.3], [.2, 1.85, -.1]], .02, dark, g, 6);
      discEnd = new T.Vector3(-.35, 2.86, -.95);
    } else {
      disc = [[-.35, 1.9, 0], [-.35, 2.9, 0], [.2, 3.65, 0], [1.7, 4.0, 0], [3.3, 3.8, 0]];
      tube(disc, .17, body, g, 30);
      const cap = new T.Mesh(new T.CylinderGeometry(.22, .3, .45, 14, 1, true), std(opts.body || '#3d4246', .5, .35, { side: T.DoubleSide }));
      cap.position.set(3.55, 3.7, 0); cap.rotation.z = Math.PI / 2 + .45; g.add(cap);
      discEnd = new T.Vector3(3.85, 3.5, 0);
    }
    // axle and wheels, mudguards
    [.62, -.62].forEach(z => { const w = wheel(.36, .22); w.position.set(.2, .36, z); g.add(w); box(.9, .05, .3, dark, .2, .8, z * 1.05, g); });
    // tail lights
    [-.42, .42].forEach(z => box(.04, .1, .18, std(0xcc2222, .3, 0, { emissive: 0x660000, emissiveIntensity: .6 }), -1.3, .7, z, g));
    g.userData.discharge = new T.CatmullRomCurve3(disc.map(p => new T.Vector3(...p)).concat([discEnd]));
    g.userData.infeed = new T.Vector3(-2.3, 1.05, 0);
    return g;
  };

  /* ---------- a person in work clothes and hi-vis ---------- */
  M.worker = function (seed) {
    const rnd = rand(seed || 1);
    const g = new T.Group();
    const trousers = std('#2f3640', .9), vest = std('#ff9f1a', .55, 0, { emissive: 0xff7a00, emissiveIntensity: .08 }), skin = std(['#c89a7a', '#a97b5c', '#e0b394'][Math.floor(rnd() * 3)], .7);
    const boots = std('#1c1a18', .8), helmet = std('#f2f2ee', .35), visor = std('#2a6b3a', .4);
    const legs = [];
    [-.11, .11].forEach(x => { const l = new T.Group(); const up = cyl(.08, .075, .5, trousers, 0, -.25, 0, l, 10); const lo = cyl(.07, .065, .45, trousers, 0, -.72, 0, l, 10); box(.13, .1, .26, boots, 0, -.98, .05, l); l.position.set(x, 1.0, 0); g.add(l); legs.push(l); });
    cyl(.2, .19, .62, std('#3b4350', .8), 0, 1.3, 0, g, 12);
    const v = cyl(.215, .205, .5, vest, 0, 1.36, 0, g, 12);
    [1.24, 1.42].forEach(y => cyl(.218, .218, .045, std(0xdddddd, .3, .3, { emissive: 0x888888, emissiveIntensity: .5 }), 0, y, 0, g, 12));
    cyl(.06, .06, .1, skin, 0, 1.66, 0, g, 8);
    const head = new T.Mesh(new T.SphereGeometry(.12, 16, 12), skin); head.position.y = 1.8; head.castShadow = true; g.add(head);
    const hat = new T.Mesh(new T.SphereGeometry(.14, 16, 10, 0, 6.28, 0, 1.5), helmet); hat.position.y = 1.83; hat.castShadow = true; g.add(hat);
    box(.22, .1, .03, visor, 0, 1.8, .14, g);                                  // visor
    [-.15, .15].forEach(x => { const e = new T.Mesh(new T.SphereGeometry(.05, 8, 6), std('#d33', .5)); e.position.set(x, 1.82, 0); g.add(e); }); // ear defenders
    const arms = [];
    [-.27, .27].forEach(x => { const a = new T.Group(); cyl(.06, .055, .34, vest, 0, -.17, 0, a, 8); cyl(.05, .045, .32, std('#3b4350', .8), 0, -.48, 0, a, 8); const glove = new T.Mesh(new T.SphereGeometry(.055, 8, 6), std('#d9c27a', .8)); glove.position.y = -.66; a.add(glove); a.position.set(x, 1.6, 0); g.add(a); arms.push(a); });
    g.userData.legs = legs; g.userData.arms = arms;
    g.userData.walk = (phase, amt) => { const s = Math.sin(phase) * .5 * amt; legs[0].rotation.x = s; legs[1].rotation.x = -s; };
    return g;
  };

  /* ---------- big bag of char on a pallet ---------- */
  M.bigBag = function (fillCol) {
    const g = new T.Group();
    box(1.2, .14, 1.0, std('#a3825a', .9), 0, .07, 0, g);
    const geo = new T.BoxGeometry(1.0, 1.1, .95, 4, 4, 4);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const bulge = 1 + .08 * Math.cos(y * 2.6); p.setX(i, p.getX(i) * bulge); p.setZ(i, p.getZ(i) * bulge); if (y > .5) p.setY(i, .55 + (hash(i, 5) - .5) * .06); }
    geo.computeVertexNormals();
    const b = new T.Mesh(geo, std('#ecebe5', .95)); b.position.y = .7; b.castShadow = true; b.receiveShadow = true; g.add(b);
    [[-.45, -.42], [.45, -.42], [-.45, .42], [.45, .42]].forEach(([x, z]) => { const l = new T.Mesh(new T.TorusGeometry(.1, .025, 6, 12, Math.PI), std('#d8d6cf', .9)); l.position.set(x, 1.27, z); g.add(l); });
    return g;
  };

  /* ---------- labels projected from 3D points into the host ---------- */
  M.labels = function (host) {
    const list = [];
    return {
      add(text, pos, opts) {
        const el = document.createElement('div');
        el.className = 'l3' + (opts && opts.wip ? ' wip' : '');
        el.innerHTML = text + (opts && opts.wip ? ' <span class="chip wip">work in progress</span>' : '');
        host.appendChild(el);
        list.push({ el, pos: pos.clone(), show: opts && opts.show });
        return el;
      },
      update(camera, p) {
        const w = host.clientWidth, h = host.clientHeight, v = new T.Vector3();
        const placed = [];
        list.forEach(l => {
          v.copy(l.pos); if (host._group) v.applyMatrix4(host._group.matrixWorld); v.project(camera);
          const vis = v.z < 1 && v.x > -1.05 && v.x < 1.05 && v.y > -1.05 && v.y < 1.05 && (!l.show || (p >= l.show[0] && p <= l.show[1]));
          l.el.style.opacity = vis ? 1 : 0;
          const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
          if (!l.bw) { l.bw = l.el.offsetWidth; l.bh = l.el.offsetHeight; }
          if (vis) placed.push({ l, x, y, ty: y });
          else l.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
        });
        // keep labels from overlapping: nudge later labels upward until they clear the ones already placed
        placed.sort((a, b) => b.y - a.y);
        const boxes = [];
        placed.forEach(o => {
          const bw = o.l.bw + 6, bh = o.l.bh + 4;
          let ty = o.y, guard = 0, hit = true;
          while (hit && guard++ < 12) {
            hit = false;
            for (const b of boxes) if (Math.abs(o.x - b.x) < (bw + b.w) / 2 && ty > b.ty - bh && ty - bh < b.ty) { ty = b.ty - b.h - 2; hit = true; }
          }
          boxes.push({ x: o.x, ty, w: bw, h: bh });
          const lift = o.y - ty;
          o.l.el.style.transform = `translate(${o.x.toFixed(1)}px,${ty.toFixed(1)}px) translate(-50%,-100%)`;
          o.l.el.style.setProperty('--lift', (10 + lift).toFixed(0) + 'px');
        });
      }
    };
  };
})();
