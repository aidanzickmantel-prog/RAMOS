/* RAMOS story site: scenes S11 to S23 */
(function () {
  'use strict';
  const R = window.RAMOS, S = R.svg, D = R.data, fo = R.foL, pile = R.pile;

  function branch(parent, x, y, ang, len, depth, rnd, out, style) {
    if (depth <= 0 || len < 3) return;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    const mx = (x + x2) / 2 + (rnd() - .5) * len * .35, my = (y + y2) / 2 + (rnd() - .5) * len * .35;
    const p = S('path', { d: `M${x.toFixed(1)},${y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`,
      style: style || `fill:none;stroke:var(--hypha);stroke-width:${(depth * .42).toFixed(2)};stroke-linecap:round` }, parent);
    out.push([p, depth]);
    const n = rnd() < .35 ? 3 : 2;
    for (let i = 0; i < n; i++) branch(parent, x2, y2, ang + (rnd() - .5) * 1.5, len * (.6 + rnd() * .2), depth - 1, rnd, out, style);
  }
  function prepDash(paths) {
    paths.forEach(([p]) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.dataset.len = L; });
  }
  function growDash(paths, k, maxDepth) {
    paths.forEach(([el, depth]) => {
      const local = R.clamp(k * maxDepth - (maxDepth - depth));
      el.style.strokeDashoffset = (+el.dataset.len * (1 - local)).toFixed(1);
    });
  }

  function truck(parent, x, y, s, bodyColor) {   // generic tipper, facing left
    const g = S('g', { transform: `translate(${x},${y}) scale(${s || 1})`, 'aria-hidden': 'true' }, parent);
    S('rect', { x: 0, y: -62, width: 56, height: 52, rx: 6, style: 'fill:var(--ink-2)' }, g);         // cab
    S('rect', { x: 8, y: -54, width: 26, height: 20, rx: 3, style: 'fill:var(--ground-2)' }, g);       // window
    S('rect', { x: 60, y: -82, width: 200, height: 72, style: `fill:none;stroke:${bodyColor || 'var(--ink-2)'};stroke-width:4` }, g); // body
    S('rect', { x: -4, y: -12, width: 268, height: 10, style: 'fill:var(--ink-2)' }, g);
    [28, 150, 220].forEach(cx => { S('circle', { cx, cy: 2, r: 15, style: 'fill:var(--ink)' }, g); S('circle', { cx, cy: 2, r: 6, style: 'fill:var(--line)' }, g); });
    return g;
  }
  function person(parent, x, y, s) {
    const g = S('g', { transform: `translate(${x},${y}) scale(${s || 1})`, 'aria-hidden': 'true' }, parent);
    S('circle', { cx: 0, cy: -64, r: 9, style: 'fill:var(--f-manure)' }, g);
    S('path', { d: 'M-11,-52 L11,-52 L13,-20 L-13,-20 Z', style: 'fill:var(--p-power)' }, g);
    S('path', { d: 'M-9,-40 L9,-40', style: 'stroke:var(--ground);stroke-width:3' }, g);
    S('path', { d: 'M-8,-20 L-10,0 M8,-20 L10,0', style: 'stroke:var(--ink-2);stroke-width:6;stroke-linecap:round' }, g);
    return g;
  }
  function stat(parent, x, y, w, h, html) { return fo(parent, x, y, w, h, `<div class="statbox">${html}</div>`); }

  /* ======================= S11 The roadside pile ======================= */
  (function () {
    let bundles = [], fillR, gauge, gaugeTxt, crew = [];
    R.scene('s11', {
      init(svg) {
        svg.setAttribute('viewBox', '0 0 860 560');
        S('rect', { x: 0, y: 0, width: 860, height: 300, style: 'fill:var(--ground-2)' }, svg);
        S('path', { d: 'M0,330 C200,300 500,320 860,290 L860,400 C520,420 220,400 0,430 Z', style: 'fill:var(--land);stroke:var(--land-edge)' }, svg);
        S('text', { x: 20, y: 452, class: 'lbl-s', text: 'farm track' }, svg);
        pile(svg, 150, 350, 210, 90, 'var(--f-olive)', 17, 120);
        const T = truck(svg, 470, 352, 1.15);
        fillR = S('rect', { x: 470 + 64 * 1.15, y: 352 - 10 * 1.15, width: 192 * 1.15, height: 0, style: 'fill:var(--f-olive);opacity:.55' }, svg);
        svg.appendChild(T);
        crew = [person(svg, 285, 372), person(svg, 390, 366)];
        const rnd = R.rand(4);
        for (let i = 0; i < 8; i++) {
          const b = S('g', { 'aria-hidden': 'true' }, svg);
          for (let k = 0; k < 5; k++) S('line', { x1: -12, y1: (rnd() - .5) * 8, x2: 12, y2: (rnd() - .5) * 8, style: 'stroke:var(--f-olive);stroke-width:2;stroke-linecap:round' }, b);
          bundles.push(b);
        }
        // gauges
        const gx = 600, gy = 60;
        S('text', { x: gx, y: gy, style: 'font-weight:600;font-size:17px', text: 'Truck body, loose prunings' }, svg);
        S('text', { x: gx, y: gy + 30, class: 'lbl-s', style: 'font-size:15px', text: 'Volume' }, svg);
        S('rect', { x: gx + 70, y: gy + 18, width: 170, height: 16, style: 'fill:var(--ground)' }, svg);
        gauge = { vol: S('rect', { x: gx + 70, y: gy + 18, width: 0, height: 16, style: 'fill:var(--f-olive)' }, svg) };
        S('text', { x: gx, y: gy + 60, class: 'lbl-s', style: 'font-size:15px', text: 'Weight' }, svg);
        S('rect', { x: gx + 70, y: gy + 48, width: 170, height: 16, style: 'fill:var(--ground)' }, svg);
        gauge.wt = S('rect', { x: gx + 70, y: gy + 48, width: 0, height: 16, style: 'fill:var(--ink-2)' }, svg);
        const body = R.num('L043', 1), pay = R.num('L043', 2), rho = R.num('L034');
        gauge.frac = body * rho / 1000 / pay;
        stat(svg, 20, 20, 520, 150, `Loose prunings ${R.N('L034')}<br>Truck tier 2: ${R.N('L043', { part: 1, unit: 'm³ body', nochip: true })}, ${R.N('L043', { part: 2, unit: 't payload' })}<br>Full by volume at <span class="v">${(body * rho / 1000).toFixed(3)} t</span>, a weight share of <span class="v">${Math.round(gauge.frac * 100)}%</span> <span class="fo-s">(computed from L043 and L034)</span>`);
        stat(svg, 20, 470, 820, 90, `Hand loading ${R.N('L036')}. Cap ${R.N('L037', { unit: 't per worker per shift' })}. Season ${R.N('L038', { unit: '' })}.`);
      },
      update(p) {
        const n = bundles.length;
        bundles.forEach((b, i) => {
          const k = R.clamp(R.seg(p, .05, .7) * n - i);
          const x = R.lerp(190, 560 + (i % 4) * 40, k), y = R.lerp(330, 300 - Math.sin(k * Math.PI) * 60, k);
          b.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
          b.style.opacity = k <= 0 || k >= 1 ? 0 : 1;
        });
        const f = R.ease(R.seg(p, .1, .75));
        const h = 72 * 1.15 * f;
        fillR.setAttribute('height', h.toFixed(1)); fillR.setAttribute('y', (352 - 10 * 1.15 - h).toFixed(1));
        gauge.vol.setAttribute('width', 170 * f); gauge.wt.setAttribute('width', 170 * f * gauge.frac);
        crew[0].setAttribute('transform', `translate(${285 + Math.sin(p * 40) * 6},372)`);
      }
    });
  })();

  /* ======================= S12 The chipper crew ======================= */
  (function () {
    let chips = [], fillR, wt;
    R.scene('s12', {
      init(svg) {
        svg.setAttribute('viewBox', '0 0 860 560');
        S('rect', { x: 0, y: 0, width: 860, height: 300, style: 'fill:var(--ground-2)' }, svg);
        S('path', { d: 'M0,330 C200,300 500,320 860,290 L860,400 C520,420 220,400 0,430 Z', style: 'fill:var(--land);stroke:var(--land-edge)' }, svg);
        pile(svg, 250, 360, 150, 70, 'var(--f-olive)', 23, 80);
        // towed chipper behind the truck: infeed faces the pile, chute into the body
        const cg = S('g', { 'aria-hidden': 'true', transform: 'translate(220,0)' }, svg);
        S('rect', { x: 230, y: 300, width: 90, height: 50, rx: 6, style: 'fill:var(--ink-2)' }, cg);
        S('path', { d: 'M230,312 L190,300 L190,346 L230,340 Z', style: 'fill:var(--muted)' }, cg);  // infeed table
        S('path', { d: 'M300,300 L320,240 L342,232 L332,252 L318,300 Z', style: 'fill:var(--ink-2)' }, cg); // chute
        S('circle', { cx: 275, cy: 362, r: 13, style: 'fill:var(--ink)' }, cg);
        S('line', { x1: 320, y1: 340, x2: 378, y2: 340, style: 'stroke:var(--ink-2);stroke-width:5' }, cg); // drawbar
        person(svg, 345, 372); person(svg, 395, 368);
        truck(svg, 600, 352, 1.0).setAttribute('transform', 'translate(860,352) scale(-1,1)');
        // body cutaway (truck mirrored: body spans x 600..800)
        fillR = S('rect', { x: 604, y: 340, width: 192, height: 0, style: 'fill:var(--f-olive);opacity:.8' }, svg);
        const rnd = R.rand(12);
        for (let i = 0; i < 40; i++) chips.push({ el: S('rect', { width: 5, height: 3, style: 'fill:var(--f-olive)' }, svg), o: rnd(), dx: rnd() * 160 });
        // density comparison
        const bx = 40, by = 40;
        S('text', { x: bx, y: by, style: 'font-weight:600;font-size:17px', text: 'Bulk density' }, svg);
        const lo = R.num('L039', 1), hi = R.num('L039', 0), k = 0.9;
        S('rect', { x: bx, y: by + 14, width: lo * k, height: 20, style: 'fill:var(--f-olive);opacity:.45' }, svg);
        S('text', { x: bx + lo * k + 8, y: by + 30, class: 'lbl-s', style: 'font-size:15px', text: 'loose' }, svg);
        S('rect', { x: bx, y: by + 44, width: hi * k, height: 20, style: 'fill:var(--f-olive)' }, svg);
        S('text', { x: bx + hi * k + 8, y: by + 60, class: 'lbl-s', style: 'font-size:15px', text: 'chips' }, svg);
        fo(svg, bx, by + 70, 420, 34, R.N('L039'));
        const body = R.num('L043', 1), pay = R.num('L043', 2);
        wt = stat(svg, 470, 30, 380, 120, `Chips in the same ${R.N('L043', { part: 1, unit: 'm³ body', nochip: true })}: <span class="v">${(body * hi / 1000).toFixed(2)} t</span>, above the ${R.N('L043', { part: 2, unit: 't payload', nochip: true })}. Now weight fills first. <span class="fo-s">(computed from L039 and L043)</span>`);
        stat(svg, 20, 455, 830, 100, `Crew of two ${R.N('L040')}. Setup per stop ${R.N('L041')}. Delay factor ${R.N('L042')}.<br><span class="fo-s">Tier 2: ${R.row('L043').value}</span>${R.chipHTML('L043')}`);
      },
      update(p) {
        const f = R.ease(R.seg(p, .15, .8));
        fillR.setAttribute('height', 66 * f); fillR.setAttribute('y', 340 - 66 * f);
        chips.forEach(c => {
          const t = ((p * 6 + c.o) % 1);
          const x = R.lerp(558, 640 + c.dx * .8, t), y = 232 - Math.sin(t * Math.PI) * 60 + t * 70;
          c.el.setAttribute('x', x.toFixed(1)); c.el.setAttribute('y', y.toFixed(1));
          c.el.style.opacity = p > .05 && p < .85 ? 1 : 0;
        });
        wt.style.opacity = R.seg(p, .6, .7);
      }
    });
  })();

  /* ======================= cluster map base ======================= */
  function clusterBase(svg, opts) {
    const C = D.cluster;
    svg.setAttribute('viewBox', `0 0 ${C.W} ${C.H}`);
    svg.classList.add('clscale');
    const g = S('g', null, svg);
    S('image', { href: 'cluster_hillshade.jpg', x: 0, y: 0, width: C.W, height: C.H, preserveAspectRatio: 'none', style: `opacity:${opts && opts.hs || .45}` }, g);
    const roads = S('g', null, g);
    S('path', { d: C.road_track, style: 'fill:none;stroke:var(--f-manure);stroke-width:.7;opacity:.45' }, roads);
    S('path', { d: C.road_local, style: 'fill:none;stroke:var(--ink-2);stroke-width:.7;opacity:.45' }, roads);
    S('path', { d: C.road_secondary, style: 'fill:none;stroke:var(--ink-2);stroke-width:1.6;opacity:.7' }, roads);
    S('path', { d: C.road_main, style: 'fill:none;stroke:var(--ink-2);stroke-width:2.2;opacity:.55' }, roads);
    C.munis.forEach(m => S('path', { d: m.d, style: 'fill:none;stroke:var(--ink);stroke-width:1.6;opacity:.55;stroke-dasharray:8 5' }, g));
    return { g, roads };
  }
  function buckets(list, n) {           // group catchment segments by flow (log scale)
    const out = Array.from({ length: n }, () => '');
    const mx = Math.log(Math.max(...list.map(r => r[1])) + 1);
    list.forEach(r => { const b = Math.min(n - 1, Math.floor(Math.log(r[1] + 1) / mx * n)); out[b] += r[0]; });
    return out;
  }

  /* ======================= S13 Farm to farm to plant ======================= */
  (function () {
    let legs = [], stops = [], truckDot, threads = [], tipsG, plantN, pareto, stats, costs, zoomBox, svgEl, label;
    R.scene('s13', {
      data: ['cluster'],
      init(svg) {
        const C = D.cluster;
        svgEl = svg;
        clusterBase(svg);
        const mine = C.catch.filter(r => r[2] === 0);
        const B = buckets(mine, 14);
        const tg = S('g', null, svg);
        B.forEach((d, i) => threads.push(S('path', { d, style: `fill:none;stroke:var(--f-olive);stroke-width:${(1 + i * .45).toFixed(2)};stroke-linecap:round;opacity:0` }, tg)));
        tipsG = S('g', { style: 'opacity:0' }, svg);
        C.tips.filter(t => t[2] === 0).forEach(t => S('circle', { cx: t[0], cy: t[1], r: 2.6, style: 'fill:var(--f-olive)' }, tipsG));
        C.run.legs.forEach(d => {
          const p = S('path', { d, style: 'fill:none;stroke:var(--ink);stroke-width:4;stroke-linecap:round;stroke-linejoin:round' }, svg);
          const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; legs.push([p, L]);
        });
        C.run.stops.forEach(s => stops.push(S('circle', { cx: s[0], cy: s[1], r: 7, style: 'fill:var(--f-olive);stroke:var(--ground);stroke-width:2;opacity:.35' }, svg)));
        const pl = C.plants[0];
        plantN = S('g', null, svg);
        S('circle', { cx: pl[0], cy: pl[1], r: 15, style: 'fill:var(--ground);stroke:var(--ink);stroke-width:4' }, plantN);
        S('text', { x: pl[0] + 22, y: pl[1] + 6, style: 'font-size:22px;font-weight:600;paint-order:stroke;stroke:var(--ground);stroke-width:5', text: 'plant (illustrative)' }, plantN);
        truckDot = S('circle', { r: 9, style: 'fill:var(--p-power);stroke:var(--ink);stroke-width:2' }, svg);
        let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
        C.run.stops.concat([[pl[0], pl[1]]]).forEach(([x, y]) => { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); });
        const cw = Math.max(bx1 - bx0, (by1 - by0) * C.W / C.H) + 80, chh = cw * C.H / C.W;
        zoomBox = [(bx0 + bx1) / 2 - cw / 2, (by0 + by1) / 2 - chh / 2, cw, chh];
        stats = stat(svg, 20, 20, 520, 200, `<strong>Worked example</strong> ${R.N('L044', { unit: '' })}<br>Road graph ${R.N('L050', { unit: '' })}<br>Track share ${R.N('L051', { unit: '% of length' })}. Track speed ${R.N('L052')}.<br>Snap cap ${R.N('L053')}. Tour constant k ${R.N('L054', { unit: '' })}.`);
        // Pareto inset
        pareto = S('g', { transform: `translate(${C.W - 560},${C.H - 440}) scale(1.35)`, class: 'nest' }, svg);
        S('rect', { x: 0, y: 0, width: 400, height: 310, rx: 10, style: 'fill:var(--panel);stroke:var(--line);opacity:.96' }, pareto);
        S('text', { x: 18, y: 32, style: 'font-weight:600;font-size:19px', text: 'Cost and emissions, options' }, pareto);
        const ax = 60, ay = 250, aw = 300, ah = 170;
        S('path', { d: `M${ax},${ay - ah} L${ax},${ay} L${ax + aw},${ay}`, style: 'fill:none;stroke:var(--ink-2);stroke-width:1.5' }, pareto);
        S('text', { x: ax + aw, y: ay + 26, 'text-anchor': 'end', class: 'lbl-s', style: 'font-size:15px', text: 'cost per tonne' }, pareto);
        S('text', { x: ax - 10, y: ay - ah - 10, class: 'lbl-s', style: 'font-size:15px', text: 'emissions per tonne' }, pareto);
        if (R.ledger.L045 && R.ledger.L046 && R.ledger.L047) {
          const cx = v => ax + (v - 70) / 50 * aw;
          const t2 = R.num('L045');
          S('circle', { cx: cx(t2), cy: ay - ah * .45, r: 8, style: 'fill:var(--f-olive)' }, pareto);
          S('text', { x: cx(t2) + 12, y: ay - ah * .45 - 10, class: 'lbl-s', style: 'font-size:14px;fill:var(--ink)', text: 'truck towing chipper' }, pareto);
          [[0, 'tractor and trailer'], [1, 'small rigid truck']].forEach(([k, nm], i) => {
            const x = cx(R.num('L047', k));
            S('line', { x1: x, x2: x, y1: ay - ah, y2: ay, style: 'stroke:var(--muted);stroke-width:1.5;stroke-dasharray:4 4' }, pareto);
            S('text', { x: x - 4, y: ay - ah + 16 + i * 18, 'text-anchor': 'end', class: 'lbl-s', style: 'font-size:13px', text: nm }, pareto);
          });
          costs = fo(pareto, 14, 262, 380, 48, `<span class="fo-s">${R.N('L045')}, ${R.N('L046', { nochip: true })}. Comparators ${R.N('L047', { nochip: true })}, emissions ${R.noinfo()}</span>`);
          costs.setAttribute('data-collab', '');
        } else {
          [[.3, .55], [.6, .35], [.75, .7]].forEach(([u, v]) => S('circle', { cx: ax + u * aw, cy: ay - v * ah, r: 8, style: 'fill:var(--f-olive);opacity:.8' }, pareto));
          S('text', { x: 18, y: 290, class: 'lbl-s', style: 'font-size:14px', text: 'Schematic, values withheld' }, pareto);
        }
      },
      update(p) {
        const run = R.seg(p, .05, .55), n = legs.length;
        let pos = null;
        legs.forEach(([el, L], i) => {
          const k = R.clamp(run * n - i);
          el.style.strokeDashoffset = (L * (1 - k)).toFixed(1);
          if (k > 0 && k < 1) pos = el.getPointAtLength(L * k);
          if (k >= 1 && i === n - 1) pos = el.getPointAtLength(L);
        });
        if (!pos) pos = legs[0][0].getPointAtLength(0);
        const C = D.cluster, z = R.ease(R.seg(p, .5, .62));
        const vb = [0, 1, 2, 3].map(i => R.lerp(zoomBox[i], [0, 0, C.W, C.H][i], z));
        svgEl.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' '));
        const sc = vb[2] / C.W;
        truckDot.setAttribute('cx', pos.x); truckDot.setAttribute('cy', pos.y); truckDot.setAttribute('r', 9 * sc + 2);
        truckDot.style.strokeWidth = 2 * sc + .4;
        legs.forEach(([el]) => el.style.strokeWidth = 4 * sc + .8);
        stops.forEach((s, i) => { const hit = run * n > i; s.style.opacity = hit ? 1 : .35; s.setAttribute('r', (hit ? 9 : 7) * sc + 1.5); s.style.strokeWidth = 2 * sc; });
        plantN.firstChild.setAttribute('r', 15 * sc + 3); plantN.firstChild.style.strokeWidth = 4 * sc + .6;
        plantN.lastChild.style.fontSize = (22 * sc + 6) + 'px';
        plantN.lastChild.setAttribute('x', +plantN.firstChild.getAttribute('cx') + 22 * sc + 6);
        const th = R.seg(p, .58, .9);
        tipsG.style.opacity = R.seg(p, .56, .62);
        threads.forEach((t, i) => { t.style.opacity = R.clamp(th * threads.length - i) * .9; });
        pareto.style.opacity = R.seg(p, .86, .95);
        stats.style.opacity = R.seg(p, .62, .68) * (1 - R.seg(p, .82, .88));
      }
    });
  })();

  /* ======================= S14 A plant sized to its catchment ======================= */
  (function () {
    let threads = [], plants = [], depot, stats;
    R.scene('s14', {
      data: ['cluster'],
      init(svg) {
        const C = D.cluster;
        const base = clusterBase(svg, { hs: .35 });
        base.roads.style.opacity = .5;
        const B = buckets(C.catch, 16);
        const tg = S('g', null, svg);
        B.forEach((d, i) => threads.push(S('path', { d, style: `fill:none;stroke:var(--hypha);stroke-width:${(0.9 + i * .55).toFixed(2)};stroke-linecap:round;stroke-linejoin:round;opacity:0` }, tg)));
        const counts = [0, 0, 0]; C.tips.forEach(t => counts[t[2]]++);
        const mx = Math.max(...counts);
        C.plants.forEach((pl, i) => {
          const g = S('g', null, svg);
          S('circle', { cx: pl[0], cy: pl[1], r: 10 + 16 * Math.sqrt(counts[i] / mx), style: 'fill:var(--ground);stroke:var(--ink);stroke-width:4' }, g);
          S('text', { x: pl[0] + 30, y: pl[1] + 7, style: 'font-size:22px;font-weight:600;paint-order:stroke;stroke:var(--ground);stroke-width:5', text: 'plant node near ' + pl[2] }, g);
          plants.push(g);
        });
        depot = S('g', null, svg);
        S('circle', { cx: C.depot[0], cy: C.depot[1], r: 13, style: 'fill:none;stroke:var(--warn);stroke-width:3;stroke-dasharray:5 4' }, depot);
        fo(depot, C.depot[0] + 18, C.depot[1] - 18, 300, 40, 'depot <span class="chip wip">work in progress</span>');
        stats = stat(svg, 20, 20, 560, 150, `Fixed plant ${R.N('L056', { unit: '' })}<br>Capital scaling ${R.N('L057', { unit: 'power law' })}<br>Discount rate ${R.N('L058')}`);
      },
      update(p) {
        const g = R.seg(p, .05, .75);
        const n = threads.length;
        threads.forEach((t, i) => { t.style.opacity = R.clamp(g * n - (n - 1 - i)) * .95; });
        plants.forEach(pl => pl.style.opacity = R.seg(p, 0, .1));
        depot.style.opacity = R.seg(p, .78, .86);
        stats.style.opacity = R.seg(p, .4, .5);
      }
    });
  })();

  /* ======================= S15 The biochar plant ======================= */
  (function () {
    let bars = [], glow, flow, marker, labels = [];
    R.scene('s15', {
      init(svg) {
        svg.setAttribute('viewBox', '0 0 960 600');
        // plant cutaway
        const pg = S('g', null, svg);
        S('path', { d: 'M20,330 L20,150 L120,100 L420,100 L420,330 Z', style: 'fill:var(--ground-2);stroke:var(--line);stroke-width:2' }, pg);
        pile(pg, 70, 320, 80, 40, 'var(--f-olive)', 3, 40); pile(pg, 70, 320, 50, 26, 'var(--f-forest)', 9, 20);
        S('text', { x: 40, y: 345, class: 'lbl-s', text: 'reception' }, pg);
        S('rect', { x: 120, y: 230, width: 90, height: 40, rx: 20, style: 'fill:var(--muted)' }, pg);
        S('text', { x: 130, y: 290, class: 'lbl-s', text: 'dryer' }, pg);
        const defs = S('defs', null, svg);
        const lg = S('linearGradient', { id: 's15g', x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
        S('stop', { offset: '0', 'stop-color': '#f5a142' }, lg); S('stop', { offset: '1', 'stop-color': '#c23b22' }, lg);
        S('rect', { x: 240, y: 150, width: 60, height: 150, rx: 12, style: 'fill:var(--ink-2)' }, pg);
        glow = S('rect', { x: 248, y: 160, width: 44, height: 130, rx: 8, style: 'fill:url(#s15g);opacity:.2' }, pg);
        S('text', { x: 232, y: 140, class: 'lbl-s', text: 'reactor, no oxygen' }, pg);
        flow = S('path', { d: 'M300,170 C360,120 380,250 250,262 L210,250', style: 'fill:none;stroke:var(--p-power);stroke-width:2.5;stroke-dasharray:6 6' }, pg);
        S('text', { x: 318, y: 132, class: 'lbl-s', text: 'gas loop heats the process' }, pg);
        S('path', { d: 'M300,300 L410,310', style: 'stroke:var(--ink-2);stroke-width:6' }, pg);
        for (let i = 0; i < 6; i++) S('rect', { x: 312 + i * 16, y: 294 + i * .9, width: 9, height: 6, style: 'fill:var(--p-char)' }, pg);
        S('text', { x: 330, y: 345, class: 'lbl-s', text: 'char out' }, pg);
        // waterfall
        const x0 = 470, base = 470, k = 300;
        const vals = [
          [1, 'wet tonne in', '1 t', 'var(--f-olive)'],
          [R.num('L059'), 'dry matter', R.part('L059') + ' t', 'var(--f-olive)'],
          [R.num('L059') * R.num('L060'), 'char', (R.num('L059') * R.num('L060')).toFixed(4) + ' t', 'var(--p-char)'],
          [R.num('L059') * R.num('L060') * R.num('L061'), 'carbon in char', (R.num('L059') * R.num('L060') * R.num('L061')).toFixed(4) + ' t', 'var(--p-char)'],
          [R.num('L063'), 'CO2e in char', R.part('L063') + ' t', 'var(--good)']
        ];
        fo(svg, x0 - 10, 60, 470, 40, `<span class="fo-xs">Bars, t per wet tonne ${R.chipHTML('L063')}</span>`);
        S('line', { x1: x0 - 10, x2: 950, y1: base, y2: base, style: 'stroke:var(--ink-2);stroke-width:1.5' }, svg);
        vals.forEach(([v, name, html, col], i) => {
          const x = x0 + i * 96;
          const r = S('rect', { x, width: 64, y: base, height: 0, style: `fill:${col};opacity:${i === 2 || i === 3 ? .85 : 1}` }, svg);
          r.dataset.h = v * k; bars.push(r);
          S('text', { x: x + 32, y: base + 22, 'text-anchor': 'middle', class: 'lbl-s', style: 'font-size:13.5px', text: name }, svg);
          labels.push(fo(svg, x - 16, base - v * k - 30, 96, 28, `<span class="fo-xs" style="display:block;text-align:center;font-weight:600;color:var(--ink)">${html}</span>`));
        });
        stat(svg, 470, 500, 480, 96, `<span class="fo-xs">1 wet tonne × ${R.N('L059', { unit: 'DM' })} × ${R.N('L060', { unit: 'char yield' })} × ${R.N('L061', { unit: 'C' })} × ${R.N('L062', { unit: '' })} = ${R.N('L063')}. Char and carbon bars are computed from these.</span>`);
        // moisture envelope
        const mx = 40, my = 420, mw = 380;
        S('text', { x: mx, y: my - 12, style: 'font-weight:600;font-size:16px', text: 'Moisture envelope, % wet basis' }, svg);
        const pct = v => mx + v / 60 * mw;
        const a = R.num('L065', 0), b = R.num('L065', 2), c = R.num('L065', 3);
        S('rect', { x: pct(0), y: my, width: pct(a) - pct(0), height: 18, style: 'fill:var(--good);opacity:.6' }, svg);
        S('rect', { x: pct(a), y: my, width: pct(b) - pct(a), height: 18, style: 'fill:var(--p-power);opacity:.6' }, svg);
        S('rect', { x: pct(c), y: my, width: pct(60) - pct(c), height: 18, style: 'fill:var(--fire);opacity:.6' }, svg);
        marker = S('path', { d: 'M0,-4 L-7,-16 L7,-16 Z', style: 'fill:var(--ink)' }, svg);
        marker.dataset.from = R.num('L066', 0); marker.dataset.to = R.num('L066', 1); marker.dataset.mx = mx; marker.dataset.mw = mw; marker.dataset.my = my;
        fo(svg, mx - 20, my + 24, 440, 110, `<span class="fo-s">${R.N('L065', { unit: '' })}<br>Olive prunings through the season ${R.N('L066')}</span>`);
      },
      update(p) {
        glow.style.opacity = .2 + .8 * R.seg(p, .05, .25);
        flow.style.strokeDashoffset = -p * 200;
        bars.forEach((r, i) => {
          const k = R.ease(R.seg(p, .15 + i * .12, .27 + i * .12));
          const h = +r.dataset.h * k; r.setAttribute('height', h); r.setAttribute('y', 470 - h);
          labels[i].style.opacity = k > .9 ? 1 : 0;
        });
        const m = R.seg(p, .3, .9);
        const v = R.lerp(+marker.dataset.from, +marker.dataset.to, m);
        marker.setAttribute('transform', `translate(${(+marker.dataset.mx + v / 60 * +marker.dataset.mw).toFixed(1)},${marker.dataset.my})`);
      }
    });
  })();

  /* ======================= S16 The biomethane plant ======================= */
  (function () {
    let pipes = [], tanker, domes = [];
    R.scene('s16', {
      live: true,
      init(svg) {
        svg.setAttribute('viewBox', '0 0 920 580');
        S('rect', { x: 0, y: 360, width: 920, height: 220, style: 'fill:var(--land)' }, svg);
        S('rect', { x: 30, y: 300, width: 150, height: 60, style: 'fill:var(--ground-2);stroke:var(--line);stroke-width:2' }, svg);
        pile(svg, 75, 355, 70, 34, 'var(--f-food)', 1, 40); pile(svg, 140, 355, 60, 30, 'var(--f-manure)', 2, 35);
        S('text', { x: 36, y: 386, class: 'lbl-s', text: 'reception: food waste, manure' }, svg);
        fo(svg, 30, 230, 200, 60, '<span class="chip wip">manure: work in progress</span>');
        [260, 400].forEach((x, i) => {
          const g = S('g', null, svg);
          S('rect', { x, y: 270, width: 110, height: 90, style: 'fill:var(--muted)' }, g);
          S('path', { d: `M${x},270 C${x},215 ${x + 110},215 ${x + 110},270 Z`, style: 'fill:var(--ground-2);stroke:var(--muted);stroke-width:3' }, g);
          domes.push(g);
        });
        S('text', { x: 300, y: 386, class: 'lbl-s', text: 'digesters' }, svg);
        S('rect', { x: 560, y: 290, width: 90, height: 70, style: 'fill:var(--ink-2)' }, svg);
        S('text', { x: 552, y: 386, class: 'lbl-s', text: 'upgrading' }, svg);
        const gas = S('path', { d: 'M510,300 L560,310 M650,320 L720,320 L720,470 L900,470', style: 'fill:none;stroke:var(--p-gas);stroke-width:6;stroke-dasharray:10 8' }, svg);
        pipes.push(gas);
        S('text', { x: 730, y: 455, class: 'lbl-s', text: 'grid injection, underground' }, svg);
        const dig = S('path', { d: 'M455,360 L455,420 L600,420', style: 'fill:none;stroke:var(--f-manure);stroke-width:5;stroke-dasharray:10 8' }, svg);
        pipes.push(dig);
        tanker = S('g', null, svg);
        S('rect', { x: 0, y: -34, width: 110, height: 34, rx: 16, style: 'fill:var(--f-manure)' }, tanker);
        S('rect', { x: 110, y: -40, width: 34, height: 40, rx: 4, style: 'fill:var(--ink-2)' }, tanker);
        [22, 90, 126].forEach(cx => S('circle', { cx, cy: 4, r: 9, style: 'fill:var(--ink)' }, tanker));
        S('text', { x: 0, y: 30, class: 'lbl-s', text: 'digestate to the fields' }, tanker);
        const casc = S('path', { d: 'M470,262 C520,150 700,140 790,200', style: 'fill:none;stroke:var(--p-char);stroke-width:2.5;stroke-dasharray:2 7' }, svg);
        pipes.push(casc);
        S('rect', { x: 770, y: 200, width: 110, height: 60, rx: 6, class: 'wip-box', style: 'fill:none;stroke:var(--warn);stroke-width:1.5;stroke-dasharray:5 4' }, svg);
        S('text', { x: 783, y: 236, class: 'lbl-s', text: 'pyrolysis' }, svg);
        fo(svg, 640, 120, 280, 60, '<span class="fo-s">digestate to pyrolysis cascade</span> <span class="chip wip">work in progress</span>');
        stat(svg, 20, 20, 560, 120, `Food waste dry matter ${R.N('L067')}<br>Methane, full-scale plant ${R.N('L068')}<br>Biowaste capture rate ${R.N('L069')}`);
        stat(svg, 600, 20, 300, 90, `Digestate yield ${R.noinfo()}`);
      },
      update(p, t) {
        pipes.forEach((pp, i) => pp.style.strokeDashoffset = (-(t || 0) / (i === 2 ? 60 : 30)).toFixed(1));
        tanker.setAttribute('transform', `translate(${R.lerp(470, 560, R.seg(p, .3, 1)).toFixed(1)},${R.lerp(540, 520, R.seg(p, .3, 1))})`);
        domes.forEach((d, i) => d.style.opacity = .6 + .4 * R.seg(p, .05 + i * .1, .25 + i * .1));
      }
    });
  })();

  /* ======================= S17 The gasifier ======================= */
  (function () {
    let pieces = [], branchG;
    R.scene('s17', {
      init(svg) {
        svg.setAttribute('viewBox', '0 0 920 580');
        S('rect', { x: 0, y: 420, width: 920, height: 160, style: 'fill:var(--land)' }, svg);
        S('path', { d: 'M60,180 L200,180 L160,260 L100,260 Z', style: 'fill:var(--muted)' }, svg);
        S('text', { x: 80, y: 168, class: 'lbl-s', text: 'chip hopper' }, svg);
        S('rect', { x: 96, y: 262, width: 68, height: 8, style: 'fill:var(--fire)' }, svg);
        S('text', { x: 20, y: 300, class: 'lbl-s', text: 'ash gate' }, svg);
        S('rect', { x: 240, y: 170, width: 70, height: 250, rx: 10, style: 'fill:var(--ink-2)' }, svg);
        S('text', { x: 222, y: 160, class: 'lbl-s', text: 'downdraft gasifier' }, svg);
        S('path', { d: 'M310,250 L380,250', style: 'stroke:var(--p-power);stroke-width:5' }, svg);
        S('rect', { x: 380, y: 210, width: 80, height: 120, rx: 6, style: 'fill:var(--muted)' }, svg);
        S('text', { x: 378, y: 200, class: 'lbl-s', text: 'gas cleaning' }, svg);
        S('path', { d: 'M460,270 L520,270', style: 'stroke:var(--p-power);stroke-width:5' }, svg);
        S('rect', { x: 520, y: 240, width: 160, height: 90, rx: 8, style: 'fill:var(--ink-2)' }, svg);
        S('text', { x: 530, y: 350, class: 'lbl-s', text: 'engine and generator, heat' }, svg);
        S('path', { d: 'M680,280 L760,280', style: 'stroke:var(--p-power);stroke-width:4;stroke-dasharray:8 5' }, svg);
        S('text', { x: 700, y: 268, class: 'lbl-s', text: 'power and heat' }, svg);
        branchG = S('g', { style: 'opacity:.45' }, svg);
        S('path', { d: 'M420,210 C420,120 600,110 640,120', style: 'fill:none;stroke:var(--p-gas);stroke-width:4;stroke-dasharray:6 5' }, branchG);
        S('rect', { x: 640, y: 80, width: 170, height: 80, rx: 8, style: 'fill:none;stroke:var(--warn);stroke-width:2;stroke-dasharray:6 4' }, branchG);
        S('text', { x: 652, y: 112, class: 'lbl-s', text: 'fuel synthesis' }, branchG);
        fo(svg, 640, 166, 260, 40, '<span class="chip wip">work in progress</span>');
        const rnd = R.rand(5);
        for (let i = 0; i < 18; i++) {
          const olive = i % 2 === 0;
          pieces.push({ el: S('rect', { width: 9, height: 5, style: `fill:var(${olive ? '--f-olive' : '--f-forest'})` }, svg), olive, o: rnd(), x: 110 + rnd() * 40 });
        }
        stat(svg, 20, 440, 880, 130, `Configurations ${R.N('L070', { unit: '' })}<br>Olive wood ash vs small gasifier limit ${R.N('L071')}`);
        fo(svg, 20, 20, 400, 40, '<span class="chip wip">designed and costed, not yet an engine pathway</span>');
      },
      update(p) {
        pieces.forEach(c => {
          const t = (p * 4 + c.o) % 1;
          let x = c.x, y = R.lerp(120, 262, Math.min(1, t * 1.4));
          if (c.olive && t > .72) { const b = (t - .72) / .28; x = c.x - b * 90; y = 262 - Math.sin(b * Math.PI) * 50; }
          if (!c.olive && t > .72) { const b = (t - .72) / .28; x = R.lerp(c.x, 270, b); y = R.lerp(262, 300, b); }
          c.el.setAttribute('x', x.toFixed(1)); c.el.setAttribute('y', y.toFixed(1));
        });
        branchG.style.opacity = .25 + .3 * R.seg(p, .4, .7);
      }
    });
  })();

  /* ======================= S18 The auction ======================= */
  // Read at a glance: a headline answer, a podium of offers for one tonne, and one chart of offer against carbon price.
  (function () {
    const st = {};
    // podium geometry
    const PZ = 318, PK = .95, COLX = [95, 225, 355], CW = 84;
    // chart geometry
    const CX0 = 520, CX1 = 860, CY0 = 136, CY1 = 430, VMIN = -80, VMAX = 110;
    const cx = c => CX0 + c / 300 * (CX1 - CX0), cy = v => CY1 - (v - VMIN) / (VMAX - VMIN) * (CY1 - CY0);
    // partner edition: schematic only, no values, until the corrected olive pool shares arrive
    function partnerInit(svg) {
      const X0 = 110, X1 = 840, Y0 = 120, Y1 = 430;
      st.X0 = X0; st.X1 = X1; st.Y0 = Y0; st.Y1 = Y1;
      st.head = fo(svg, 20, 6, 860, 90, '');
      const band0 = X0 + (X1 - X0) * .1, band1 = X0 + (X1 - X0) * .5;
      S('rect', { x: band0, y: Y0, width: band1 - band0, height: Y1 - Y0, rx: 14, style: 'fill:var(--good);opacity:.1' }, svg);
      S('text', { x: (band0 + band1) / 2, y: Y0 + 26, 'text-anchor': 'middle', style: 'font-size:16px;font-weight:700;fill:var(--good)', text: "today's prices, 108 to 130 EUR/t" }, svg);
      S('line', { x1: X0, x2: X0, y1: Y0, y2: Y1, style: 'stroke:var(--line);stroke-width:2' }, svg);
      S('line', { x1: X0, x2: X1, y1: Y1, y2: Y1, style: 'stroke:var(--line);stroke-width:2' }, svg);
      S('text', { x: X0 - 14, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', transform: `rotate(-90 ${X0 - 14} ${(Y0 + Y1) / 2})`, style: 'font-size:15px;fill:var(--ink-2)', text: 'payable share of the olive pool' }, svg);
      S('text', { x: (X0 + X1) / 2, y: Y1 + 30, 'text-anchor': 'middle', style: 'font-size:15px;fill:var(--ink-2)', text: 'carbon removal price' }, svg);
      // the shape: flat across the band, then a cliff just above it
      const pts = [[0, .3], [.1, .32], [.5, .33], [.56, .38], [.62, .62], [.68, .82], [1, .9]];
      const xy = ([u, v]) => [X0 + (X1 - X0) * u, Y1 - (Y1 - Y0) * v];
      const d = pts.map((q, i) => (i ? 'L' : 'M') + xy(q).map(n => n.toFixed(1)).join(',')).join('');
      st.path = S('path', { d, style: 'fill:none;stroke:var(--p-char);stroke-width:5;stroke-linejoin:round;stroke-linecap:round' }, svg);
      st.len = st.path.getTotalLength(); st.path.style.strokeDasharray = st.len; st.path.style.strokeDashoffset = st.len;
      const [cx, cy] = xy([.6, .55]);
      st.cliff = S('g', { style: 'opacity:0' }, svg);
      S('circle', { cx, cy, r: 9, style: 'fill:#ff9f43' }, st.cliff);
      S('text', { x: cx + 18, y: cy + 6, style: 'font-size:20px;font-weight:800;fill:#ff9f43', text: 'the cliff' }, st.cliff);
    }
    function partnerUpdate(p) {
      const k = R.ease(R.seg(p, .1, .7));
      st.path.style.strokeDashoffset = (st.len * (1 - k)).toFixed(1);
      st.cliff.style.opacity = R.seg(p, .6, .7);
      const big = 'font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.15';
      const head = p < .5 ? `<div style="${big}">Across today's prices: <span style="color:var(--good)">the payable share barely moves.</span></div>`
        : `<div style="${big}">Just above that range: <span style="color:#ff9f43">it climbs steeply.</span></div>`;
      if (st.msg !== head) { st.msg = head; st.head.firstChild.innerHTML = head; }
    }
    R.scene('s18', {
      init(svg) {
        svg.setAttribute('viewBox', '0 0 900 600');
        if (R.isPartner) return partnerInit(svg);
        const data = !!(R.ledger.L072 && R.ledger.L073);
        st.show = data && !R.isPublic;
        st.pts = data ? [0, 1, 2, 3, 4].map(i => R.num('L072', i)) : [-60, -25, -2, 28, 90];
        st.meth = data ? R.num('L073') : -50;
        st.P = [0, 100, 150, 200, 300];
        // headline answer
        st.head = fo(svg, 20, 4, 860, 84, '');
        // ---- podium: who can pay for this tonne? ----
        S('text', { x: 30, y: 116, style: 'font-size:15px;font-weight:600;fill:var(--ink-2)', text: 'Offers for one tonne of olive prunings' }, svg);
        S('rect', { x: 30, y: 136, width: 400, height: PZ - 136, rx: 16, style: 'fill:var(--good);opacity:.09' }, svg);
        S('rect', { x: 30, y: PZ, width: 400, height: 112, rx: 16, style: 'fill:var(--fire);opacity:.09' }, svg);
        S('text', { x: 44, y: 158, style: 'font-size:13px;font-weight:600;fill:var(--good)', text: 'CAN PAY' }, svg);
        S('text', { x: 44, y: PZ + 102, style: 'font-size:13px;font-weight:600;fill:var(--fire)', text: 'WOULD LOSE MONEY' }, svg);
        S('line', { x1: 30, x2: 430, y1: PZ, y2: PZ, style: 'stroke:var(--ink);stroke-width:2' }, svg);
        const cols = [['Biochar', 'var(--p-char)'], ['Biomethane', 'var(--p-gas)'], ['Leave it', 'var(--muted)']];
        st.cols = cols.map(([nm, col], i) => {
          const x = COLX[i];
          const bar = S('rect', { x: x - CW / 2, y: PZ, width: CW, height: 0, rx: 10, style: `fill:${col}` }, svg);
          const val = S('text', { x, y: PZ, 'text-anchor': 'middle', style: 'font-size:15px;font-weight:700;fill:var(--ink)', text: '' }, svg);
          S('text', { x, y: 458, 'text-anchor': 'middle', style: 'font-size:16px;font-weight:600', text: nm }, svg);
          return { bar, val, x };
        });
        S('text', { x: COLX[2], y: 476, 'text-anchor': 'middle', style: 'font-size:12.5px;fill:var(--muted)', text: 'offers 0' }, svg);
        st.tonne = S('g', { style: 'transition:transform .5s cubic-bezier(.3,.8,.3,1)' }, svg);
        S('rect', { x: -22, y: -22, width: 44, height: 44, rx: 10, style: 'fill:var(--f-olive)' }, st.tonne);
        S('text', { x: 0, y: 6, 'text-anchor': 'middle', style: 'font-size:15px;font-weight:700;fill:#000', text: '1 t' }, st.tonne);
        S('rect', { x: 28, y: -11, width: 60, height: 22, rx: 11, style: 'fill:var(--good)' }, st.tonne);
        S('text', { x: 58, y: 5, 'text-anchor': 'middle', style: 'font-size:12px;font-weight:800;fill:#000', text: 'WINS' }, st.tonne);
        // ---- chart: offer against carbon price ----
        S('text', { x: CX0, y: 116, style: 'font-size:15px;font-weight:600;fill:var(--ink-2)', text: 'How the offers move with the carbon price' }, svg);
        const z = cy(0);
        st.cross = (() => { for (let j = 0; j < 4; j++) if (st.pts[j] <= 0 && st.pts[j + 1] > 0) return st.P[j] + (0 - st.pts[j]) / (st.pts[j + 1] - st.pts[j]) * (st.P[j + 1] - st.P[j]); return 300; })();
        S('rect', { x: cx(st.cross), y: CY0, width: CX1 - cx(st.cross), height: z - CY0, style: 'fill:var(--good);opacity:.12' }, svg);
        S('text', { x: (cx(st.cross) + CX1) / 2, y: CY0 + 22, 'text-anchor': 'middle', style: 'font-size:13px;font-weight:700;fill:var(--good)', text: 'biochar wins here' }, svg);
        S('line', { x1: CX0, x2: CX1, y1: z, y2: z, style: 'stroke:var(--ink);stroke-width:1.5' }, svg);
        S('text', { x: CX0 - 8, y: z + 4, 'text-anchor': 'end', style: 'font-size:12px;fill:var(--ink-2)', text: '0' }, svg);
        S('line', { x1: CX0, x2: CX0, y1: CY0, y2: CY1, style: 'stroke:var(--line);stroke-width:1' }, svg);
        st.P.forEach(v => S('text', { x: cx(v), y: CY1 + 22, 'text-anchor': 'middle', style: 'font-size:12.5px;fill:var(--muted)', text: v }, svg));
        S('text', { x: (CX0 + CX1) / 2, y: CY1 + 44, 'text-anchor': 'middle', style: 'font-size:13px;fill:var(--ink-2)', text: 'carbon price, EUR per tonne of CO2' }, svg);
        S('path', { d: st.P.map((c, j) => (j ? 'L' : 'M') + cx(c).toFixed(1) + ',' + cy(st.pts[j]).toFixed(1)).join(''), style: 'fill:none;stroke:var(--p-char);stroke-width:4;stroke-linejoin:round' }, svg);
        S('line', { x1: CX0, x2: CX1, y1: cy(st.meth), y2: cy(st.meth), style: 'stroke:var(--p-gas);stroke-width:4' }, svg);
        S('text', { x: CX1, y: cy(st.pts[4]) - 10, 'text-anchor': 'end', style: 'font-size:13px;font-weight:600;fill:var(--p-char)', text: 'biochar' }, svg);
        S('text', { x: CX1, y: cy(st.meth) + 20, 'text-anchor': 'end', style: 'font-size:13px;font-weight:600;fill:var(--p-gas)', text: 'biomethane, flat' }, svg);
        S('circle', { cx: cx(st.cross), cy: z, r: 6, style: 'fill:var(--good)' }, svg);
        if (st.show) fo(svg, cx(st.cross) - 250, z - 64, 240, 56, `<div style="text-align:right" class="fo-xs">biochar crosses zero at ${R.N('L074')}</div>`).setAttribute('data-collab', '');
        st.mark = S('line', { x1: CX0, x2: CX0, y1: CY0, y2: CY1, style: 'stroke:#ff9f43;stroke-width:2' }, svg);
        st.dot = S('circle', { cx: CX0, cy: cy(st.pts[0]), r: 8, style: 'fill:var(--p-char);stroke:#000;stroke-width:2' }, svg);
        st.price = S('text', { x: CX0, y: CY1 - 10, 'text-anchor': 'start', style: 'font-size:16px;font-weight:700;fill:#ff9f43', text: '' }, svg);
        fo(svg, 20, 500, 860, 40, `<span class="fo-xs">Not priced yet: gasification ${R.noinfo()} compost ${R.noinfo()} <span class="chip wip">work in progress</span></span>`);
      },
      update(p) {
        if (R.isPartner) return partnerUpdate(p);
        const c = R.seg(p, .12, .88) * 300, P = st.P;
        let j = 0; while (j < 3 && c > P[j + 1]) j++;
        const bc = R.lerp(st.pts[j], st.pts[j + 1], (c - P[j]) / (P[j + 1] - P[j]));
        const grow = R.ease(R.seg(p, 0, .1));
        [bc, st.meth, 0].forEach((v, i) => {
          const col = st.cols[i], h = Math.abs(v) * PK * grow;
          col.bar.setAttribute('height', Math.max(i === 2 ? 3 : 0, h).toFixed(1)); col.bar.setAttribute('y', (v >= 0 ? PZ - h : PZ).toFixed(1));
          col.val.textContent = st.show && i < 2 ? (v > 0 ? '+' : '') + Math.round(v) + ' EUR' : '';
          col.val.setAttribute('y', (v >= 0 ? PZ - h - 8 : PZ + h + 20).toFixed(1));
        });
        const win = bc > 0 && bc >= st.meth ? 0 : st.meth > 0 ? 1 : 2;
        const wv = [bc, st.meth, 0][win];
        const ty = (wv > 0 ? PZ - wv * PK * grow : PZ) - 28;
        st.tonne.style.transform = `translate(${st.cols[win].x}px,${ty.toFixed(1)}px)`;
        st.tonne.style.opacity = grow;
        st.mark.setAttribute('x1', cx(c)); st.mark.setAttribute('x2', cx(c));
        st.dot.setAttribute('cx', cx(c)); st.dot.setAttribute('cy', cy(bc));
        st.price.setAttribute('x', cx(c) + 8); st.price.setAttribute('text-anchor', c > 220 ? 'end' : 'start'); if (c > 220) st.price.setAttribute('x', cx(c) - 8); st.price.textContent = st.show ? Math.round(c) + ' EUR' : '';
        const big = 'font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.15';
        const msg = win === 2
          ? `<div style="${big}">${c < 20 ? 'No carbon price:' : 'Carbon price rising:'} <span style="color:var(--fire)">nobody can pay.</span></div><div class="fo-s" style="margin-top:4px">The tonne stays on the farm.</div>`
          : `<div style="${big}">With a carbon price: <span style="color:var(--good)">biochar wins the tonne.</span></div><div class="fo-s" style="margin-top:4px">Its char stores carbon, so every euro of carbon price raises its offer.</div>`;
        if (st.msg !== msg) { st.msg = msg; st.head.firstChild.innerHTML = msg; }
      }
    });
  })();

  /* ======================= S19 Where the products go ======================= */
  (function () {
    let pipes, emit, flows = [], gap, resid, charF, gasF, soils; const st19 = {};
    R.scene('s19', {
      data: ['national', 'enduse', 'mycelium'], live: true,
      init(svg) {
        const N = D.national, U = D.enduse;
        svg.setAttribute('viewBox', `0 0 ${N.W + 340} ${N.H}`);
        svg.classList.add('natscale');
        S('path', { d: N.outline, class: 'land' }, svg);
        pipes = S('path', { d: U.pipes.join(''), style: 'fill:none;stroke:var(--p-gas);stroke-width:1.8;stroke-dasharray:6 5;opacity:.85' }, svg);
        emit = S('g', null, svg);
        const mx = Math.max(...U.emitters.map(e => e[2]));
        U.emitters.forEach(e => S('circle', { cx: e[0], cy: e[1], r: (1.5 + 16 * Math.sqrt(e[2] / mx)).toFixed(1), style: `fill:var(--muted);opacity:.45;stroke:var(--ink-2);stroke-width:.5` }, emit));
        U.hubs.forEach(h => S('rect', { x: h[0] - 4, y: h[1] - 4, width: 8, height: 8, style: 'fill:none;stroke:var(--ink);stroke-width:1.4' }, emit));
        // every municipality: residue to its nearest plant hub, in its main feedstock colour
        const Mx = D.mycelium;
        resid = S('g', null, svg);
        const byF = R.FEEDS.map(() => '');
        Mx.edges.forEach(e => { byF[e[4]] += `M${e[0]},${e[1]}L${e[2]},${e[3]}`; });
        R.FEEDS.forEach((f, i) => { if (byF[i]) S('path', { d: byF[i], style: `fill:none;stroke:var(${f.v});stroke-width:1.1;opacity:.75;stroke-dasharray:3 4` }, resid); });
        // hubs: biochar to the nearest active kiln and back to farm soils, biomethane to the nearest pipeline
        const hubs = N.wastePlants;
        const kilns = U.kilns.filter(k => k[2]);
        const pipePts = []; U.pipes.forEach(d => d.replace(/M/g, ' ').trim().split(/\s+/).forEach(t => { const q = t.split(',').map(Number); if (q.length === 2 && !isNaN(q[0])) pipePts.push(q); }));
        let cd = '', gd = '', sd = '';
        hubs.forEach(([x, y], i) => {
          const k = kilns.reduce((a, b) => ((b[0] - x) ** 2 + (b[1] - y) ** 2 < (a[0] - x) ** 2 + (a[1] - y) ** 2 ? b : a), kilns[0]);
          cd += `M${x},${y}Q${((x + k[0]) / 2 + 25).toFixed(1)},${((y + k[1]) / 2).toFixed(1)} ${k[0]},${k[1]}`;
          const g = pipePts.reduce((a, b) => ((b[0] - x) ** 2 + (b[1] - y) ** 2 < (a[0] - x) ** 2 + (a[1] - y) ** 2 ? b : a), pipePts[0]);
          if (g && Math.hypot(g[0] - x, g[1] - y) < 120) gd += `M${x},${y}L${g[0]},${g[1]}`;
        });
        Mx.edges.forEach((e, i) => { if (i % 3 === 0 && (e[4] === 1 || e[4] === 2 || e[4] === 3)) sd += `M${e[2]},${e[3]}Q${((e[0] + e[2]) / 2 - 12).toFixed(1)},${((e[1] + e[3]) / 2).toFixed(1)} ${e[0]},${e[1]}`; });
        charF = S('path', { d: cd, style: 'fill:none;stroke:var(--p-char);stroke-width:2.2;opacity:.75;stroke-dasharray:7 6' }, svg);
        soils = S('path', { d: sd, style: 'fill:none;stroke:var(--p-char);stroke-width:1.2;opacity:.5;stroke-dasharray:2 5' }, svg);
        gasF = S('path', { d: gd, style: 'fill:none;stroke:var(--p-gas);stroke-width:2.4;opacity:.9;stroke-dasharray:5 5' }, svg);
        flows = [];
        // the plants and kilns as their own layers so each step can light them
        st19.plants = S('g', null, svg); N.wastePlants.forEach(([x, y]) => S('circle', { cx: x, cy: y, r: 5, style: 'fill:var(--f-food);stroke:#000;stroke-width:1' }, st19.plants));
        st19.kilns = S('g', null, svg); U.kilns.forEach(k => S('rect', { x: k[0] - 7, y: k[1] - 7, width: 14, height: 14, rx: 2, style: 'fill:var(--p-char);stroke:#000;stroke-width:1' }, st19.kilns));
        // four steps, read top to bottom, each lighting its own layer on the map
        const lx = N.W + 20;
        const steps = [
          ['1', 'Residue goes to a plant', 'Every municipality sends its residue to the nearest plant hub, in its feedstock colour.', 'var(--f-olive)'],
          R.isPartner ? ['2', 'Biochar goes to soils and concrete', `Char goes back to farm soils, and into ready-mix concrete as sand replacement.`, 'var(--p-char)'] : ['2', 'Biochar goes to soils and kilns', 'Char travels to cement kilns and back out to farm soils.', 'var(--p-char)'],
          ['3', 'Biomethane joins the gas grid', 'Gas is upgraded and injected at the nearest pipeline.', 'var(--p-gas)'],
          ['4', 'Who needs removals', 'Industrial emitters, sized by verified emissions, against the national gap.', 'var(--muted)']
        ];
        st19.steps = steps.map(([n, t, d, col], i) => {
          const g = S('g', { transform: `translate(${lx},${30 + i * 165})` }, svg);
          S('circle', { cx: 22, cy: 22, r: 22, style: `fill:${col}` }, g);
          S('text', { x: 22, y: 31, 'text-anchor': 'middle', style: 'font-size:26px;font-weight:700;fill:#000', text: n }, g);
          fo(g, 56, 2, 280, 160, `<div style="font-size:30px;font-weight:700;line-height:1.1;letter-spacing:-.02em;margin-bottom:6px">${t}</div><span class="fo-s">${d}</span>`);
          return g;
        });
        if (R.isPartner) st19.conc = fo(svg, N.W + 20, 700, 330, 420, `<div class="statbox"><strong>Concrete</strong><br><span class="fo-s">Cement is out: EN 197-1 caps organics at 0.5%. Ready-mix is ${R.N('L114')}. A ${R.N('L115')} sand replacement absorbs the whole pool. On farm soils the char is worth ${R.N('L116')} to the farmer.</span></div>`);
        gap = S('g', null, svg);
        const gy = 700;
        fo(gap, lx, gy, 330, 60, `<span class="fo-s"><strong style="color:var(--ink)">Neutrality gap</strong> ${R.N('L079')}</span>`);
        S('rect', { x: lx, y: gy + 66, width: 280, height: 34, rx: 8, style: 'fill:none;stroke:var(--ink);stroke-width:1.5' }, gap);
        S('rect', { x: lx + 280, y: gy + 66, width: 38, height: 34, rx: 8, style: 'fill:none;stroke:var(--ink);stroke-width:1.5;stroke-dasharray:4 3' }, gap);
        fo(gap, lx, gy + 106, 330, 200, `<span class="fo-s">share covered ${R.noinfo()} output not built<br>dashed: aviation and shipping ${R.N('L080')}<br>emitters wired ${R.N('L077', { unit: '' })}</span>`);
      },
      update(p, t) {
        const tt = (t || 0);
        const step = p < .26 ? 0 : p < .5 ? 1 : p < .72 ? 2 : 3;
        const lit = (k) => step === k ? 1 : step > k ? .28 : 0;
        st19.steps.forEach((g, i) => g.style.opacity = i === step ? 1 : i < step ? .45 : .2);
        resid.style.opacity = lit(0) * R.seg(p, .02, .1);
        st19.plants.style.opacity = step <= 1 ? 1 : .4;
        resid.querySelectorAll('path').forEach(e => e.style.strokeDashoffset = (-tt / 60).toFixed(1));
        charF.style.opacity = .85 * lit(1); charF.style.strokeDashoffset = (-tt / 45).toFixed(1);
        soils.style.opacity = .6 * lit(1); soils.style.strokeDashoffset = (-tt / 70).toFixed(1);
        st19.kilns.style.opacity = R.isPartner ? 0 : step === 1 ? 1 : step > 1 ? .4 : .15;
        if (R.isPartner) { charF.style.opacity = 0; if (st19.conc) st19.conc.style.opacity = step === 1 ? 1 : 0; }
        pipes.style.opacity = step === 2 ? .95 : .25; pipes.style.strokeDashoffset = (-tt / 40).toFixed(1);
        gasF.style.opacity = .95 * lit(2); gasF.style.strokeDashoffset = (-tt / 35).toFixed(1);
        emit.style.opacity = step === 3 ? 1 : 0;
        gap.style.opacity = step === 3 ? 1 : 0;
      }
    });
  })();

  /* ======================= S20 Back into the soil ======================= */
  (function () {
    let hyph = [], tl, curves = [], glowC = [];
    R.scene('s20', {
      init(svg) {
        svg.setAttribute('viewBox', '0 0 920 580');
        S('rect', { x: 20, y: 60, width: 400, height: 30, style: 'fill:var(--f-forest);opacity:.35' }, svg);
        S('rect', { x: 20, y: 90, width: 400, height: 330, style: 'fill:var(--f-manure);opacity:.28' }, svg);
        S('text', { x: 28, y: 50, class: 'lbl-s', text: 'below the surface of the field' }, svg);
        const rnd = R.rand(13);
        const roots = S('g', null, svg);
        for (let i = 0; i < 5; i++) {
          const x = 60 + i * 80;
          const o = [];
          branch(roots, x, 90, Math.PI / 2, 60, 5, R.rand(30 + i), o, 'fill:none;stroke:var(--f-manure);stroke-width:2;stroke-linecap:round;opacity:.8');
        }
        for (let i = 0; i < 26; i++) {
          const x = 40 + rnd() * 360, y = 120 + rnd() * 280;
          glowC.push(S('rect', { x, y, width: 8 + rnd() * 6, height: 6 + rnd() * 4, rx: 2, style: 'fill:var(--p-char)' }, svg));
          if (i % 2 === 0) branch(svg, x + 5, y + 3, rnd() * 6.28, 20, 4, R.rand(100 + i), hyph, 'fill:none;stroke:var(--hypha);stroke-width:1;stroke-linecap:round');
        }
        prepDash(hyph);
        // permanence chart
        const ox = 490, oy = 400, w = 400, h = 300;
        S('path', { d: `M${ox},${oy - h} L${ox},${oy} L${ox + w},${oy}`, style: 'fill:none;stroke:var(--ink-2);stroke-width:1.5' }, svg);
        [0, 100, 200].forEach(y => S('text', { x: ox + y / 200 * w, y: oy + 22, 'text-anchor': 'middle', class: 'lbl-s', style: 'font-size:14px', text: y + ' yr' }, svg));
        S('text', { x: ox - 8, y: oy - h - 10, class: 'lbl-s', style: 'font-size:14px', text: 'share of char carbon still stored' }, svg);
        const mk = (end, T, col, name, id, shape) => {
          let d = '';
          for (let t = 0; t <= T; t += 4) { const y = shape === 'fast' ? 1 - (1 - end) * (1 - Math.exp(-t / 25)) / (1 - Math.exp(-T / 25)) : 1 - (1 - end) * t / T; d += (t ? 'L' : 'M') + (ox + t / 200 * w).toFixed(1) + ',' + (oy - y * h).toFixed(1); }
          const p = S('path', { d, style: `fill:none;stroke:${col};stroke-width:3` }, svg);
          const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.dataset.len = L;
          const i = curves.length;
          const lab = fo(svg, ox + 14, oy - 118 + i * 36, 390, 36, `<span class="fo-s"><span class="sw" style="display:inline-block;width:18px;height:4px;vertical-align:4px;background:${col}"></span> ${name}</span> ${R.N(id, { unit: '' })}`);
          curves.push([p, L, lab, T]);
        };
        mk(R.num('L083'), 100, 'var(--good)', 'physical, 100 yr', 'L083', 'fast');
        mk(R.num('L084'), 200, 'var(--p-gas)', 'EU credit, 200 yr', 'L084');
        const yP = oy - R.num('L085') * h;
        const pl = S('line', { x1: ox, x2: ox + 40, y1: yP, y2: yP, style: 'stroke:var(--f-vine);stroke-width:3;stroke-dasharray:5 4' }, svg);
        const plab = fo(svg, ox + 14, oy - 118 + 2 * 36, 390, 36, `<span class="fo-s"><span class="sw" style="display:inline-block;width:18px;height:4px;vertical-align:4px;background:var(--f-vine)"></span> submitted paper composite, tick at left</span> ${R.N('L085', { unit: '' })}`);
        curves.push([pl, 0, plab, 0]);
        tl = S('line', { x1: ox, x2: ox, y1: oy - h, y2: oy, style: 'stroke:var(--ink);stroke-width:1;opacity:.6' }, svg);
        stat(svg, 20, 440, 420, 130, `<strong>Removed</strong>, per wet tonne<br>${R.N('L064', { part: 0, unit: 't CO2e stored after 100 yr', nochip: true })}<br>${R.N('L064', { part: 1, unit: 't CO2e net of plant operation' })}`);
        stat(svg, 470, 440, 430, 130, `<strong>Avoided</strong>, kept in its own column<br>${R.noinfo()}<br><span class="fo-s">Never added to removals. H/C<sub>org</sub> gate and olive char ${R.N('L086', { unit: '' })}. Beats chips on soil after ${R.N('L087')}.</span>`);
      },
      update(p) {
        const t = R.seg(p, .1, .85);
        tl.setAttribute('x1', 490 + t * 400); tl.setAttribute('x2', 490 + t * 400);
        curves.forEach(([el, L, lab, T]) => {
          if (L) el.style.strokeDashoffset = (L * (1 - R.clamp(t * 200 / T))).toFixed(1);
          lab.style.opacity = T ? (t * 200 >= T ? 1 : 0) : R.seg(p, .1, .2);
          if (!T) el.style.opacity = R.seg(p, .1, .2);
        });
        growDash(hyph, R.seg(p, .3, .95), 4);
        glowC.forEach((c, i) => c.style.opacity = .6 + .4 * Math.sin(i + p * 10) ** 2);
      }
    });
  })();

  /* ======================= S21 Biodiversity response ======================= */
  (function () {
    let life = [], dials = [], inset;
    R.scene('s21', {
      data: ['cluster'],
      init(svg) {
        svg.setAttribute('viewBox', '0 0 920 580');
        S('rect', { x: 0, y: 330, width: 560, height: 250, style: 'fill:var(--f-manure);opacity:.25' }, svg);
        S('path', { d: 'M120,330 C116,260 130,210 120,150', style: 'fill:none;stroke:var(--f-manure);stroke-width:12;stroke-linecap:round' }, svg);
        [[80, 140], [150, 120], [120, 95], [175, 160]].forEach(([x, y]) => S('ellipse', { cx: x, cy: y, rx: 50, ry: 28, style: 'fill:var(--f-olive);opacity:.55' }, svg));
        S('rect', { x: 260, y: 300, width: 200, height: 34, rx: 17, style: 'fill:var(--f-manure)' }, svg);
        S('text', { x: 268, y: 290, class: 'lbl-s', text: 'deadwood stays' }, svg);
        const g1 = S('g', null, svg);
        [[300, 318], [340, 312], [400, 322]].forEach(([x, y]) => { S('ellipse', { cx: x, cy: y, rx: 7, ry: 4.5, style: 'fill:var(--ink)' }, g1); });
        const g2 = S('g', null, svg);
        S('path', { d: 'M160,96 q10,-12 22,0 q-6,4 -11,4 z M182,96 l10,-4', style: 'fill:var(--ink);stroke:var(--ink);stroke-width:1.5' }, g2);
        const g3 = S('g', null, svg);
        for (let i = 0; i < 18; i++) S('rect', { x: 40 + i * 12, y: 326, width: 9, height: 4, style: 'fill:var(--f-olive)' }, g3);
        [[70, 326], [130, 326], [190, 326]].forEach(([x, y]) => { S('path', { d: `M${x - 10},${y - 8} Q${x},${y - 22} ${x + 10},${y - 8} Z`, style: 'fill:var(--hypha)' }, g3); S('rect', { x: x - 2, y: y - 9, width: 4, height: 9, style: 'fill:var(--hypha)' }, g3); });
        life = [g3, g1, g2];
        // dials
        [['carbon', false], ['cost', false], ['biodiversity', true]].forEach(([nm, wip], i) => {
          const g = S('g', { transform: `translate(${640},${80 + i * 120})` }, svg);
          S('path', { d: 'M-55,0 A55,55 0 0 1 55,0', style: `fill:none;stroke:${wip ? 'var(--warn)' : 'var(--ink-2)'};stroke-width:9;${wip ? 'stroke-dasharray:8 6' : ''}` }, g);
          S('text', { x: 75, y: -6, style: 'font-size:19px;font-weight:600', text: nm }, g);
          if (wip) fo(g, 75, 2, 220, 40, '<span class="chip wip">work in progress</span>');
          dials.push(g);
        });
        stat(svg, 600, 420, 310, 70, `<span class="fo-s">Tier 1 agreement, GLOBIO and COSc ${R.N('L088', { unit: '' })}</span>`);
        // inset: protected areas over the cluster
        const C = D.cluster;
        inset = S('svg', { x: 20, y: 380, width: 300, height: 190, viewBox: `0 0 ${C.W} ${C.H}` }, svg);
        const hatch = R.hatch(svg, 's21h', 'var(--f-forest)');
        S('rect', { x: 0, y: 0, width: C.W, height: C.H, style: 'fill:var(--panel);stroke:var(--line);stroke-width:6' }, inset);
        C.munis.forEach(m => S('path', { d: m.d, style: 'fill:var(--land);stroke:var(--ink-2);stroke-width:4' }, inset));
        C.protected.forEach(pa => S('path', { d: pa.d, style: `fill:${hatch};stroke:var(--f-forest);stroke-width:6` }, inset));
        S('text', { x: 340, y: 560, class: 'lbl-s', text: 'protected: no collection' }, svg);
      },
      update(p) {
        life.forEach((g, i) => g.style.opacity = R.seg(p, .08 + i * .12, .2 + i * .12));
        dials.forEach((g, i) => g.style.opacity = R.seg(p, .45 + i * .08, .55 + i * .08));
        inset.style.opacity = R.seg(p, .7, .8);
      }
    });
  })();

  /* ======================= S22 What RAMOS can be used for ======================= */
  (function () {
    let cards = [], nodes = [], badges = [];
    R.scene('s22', {
      init(svg) {
        svg.setAttribute('viewBox', '0 0 940 640');
        const Q = [['A municipality', 'Where should a plant go, and what would it gather?'], ['A researcher', 'What does each pathway need to win?'], ['A planner', 'How much of the national gap could residues cover, at what cost and with what effect on biodiversity?']];
        Q.forEach(([who, q], i) => {
          const g = S('g', null, svg);
          S('rect', { x: 20 + i * 305, y: 20, width: 290, height: 150, rx: 10, style: 'fill:var(--panel);stroke:var(--line)' }, g);
          S('text', { x: 36 + i * 305, y: 52, style: 'font-weight:600;font-size:18px', text: who }, g);
          fo(g, 34 + i * 305, 62, 262, 104, `<span class="fo-q">${q}</span>`);
          cards.push(g);
        });
        // engine nodes by status (L090)
        const tot = R.num('L090', 1), built = R.num('L090', 2), part = R.num('L090', 3), stub = R.num('L090', 4);
        S('text', { x: 20, y: 214, style: 'font-weight:600;font-size:18px', text: 'The engine, node by node' }, svg);
        for (let i = 0; i < tot; i++) {
          const col = i % 14, row = Math.floor(i / 14);
          const x = 36 + col * 34, y = 246 + row * 34;
          const st = i < built ? 'b' : i < built + part ? 'p' : i < built + part + stub ? 's' : 'n';
          const st2 = { b: 'fill:var(--ink-2)', p: 'fill:var(--ink-2);opacity:.45;stroke:var(--ink-2);stroke-dasharray:3 2', s: 'fill:none;stroke:var(--ink-2);stroke-width:1.5', n: 'fill:none;stroke:var(--warn);stroke-width:1.5;stroke-dasharray:3 3' }[st];
          nodes.push(S('rect', { x, y, width: 24, height: 24, rx: 5, style: st2 }, svg));
        }
        fo(svg, 520, 236, 410, 150, `<span class="fo-s">${R.N('L090', { unit: '' })}<br>Solid: built. Faded: partly built. Outline: stub. Dashed: not built yet.</span>`);
        const B = [
          ['Sourced', `${R.N('L003')}, ${R.N('L002')}`],
          ['Graded', R.N('L004', { unit: 'parameter rows reviewed' })],
          ['Reproducible', `Biomethane paper ${R.N('L093', { unit: '' })}. Biochar paper ${R.N('L092', { nochip: true })}${R.chipHTML('L092')}`],
          ['Checked', `Carbon closure within ${R.N('L089')} on every run. Tests ${R.N('L094', { unit: '' })}`],
          ['Audited', R.isPublic || !R.ledger.L091 ? 'Independently audited' : `Independent audit ${R.N('L091', { unit: 'findings' })}`]
        ];
        B.forEach(([t, html], i) => {
          const g = S('g', null, svg);
          const x = 20 + (i % 3) * 305, y = 430 + Math.floor(i / 3) * 105;
          S('rect', { x, y, width: 290, height: 96, rx: 48, style: 'fill:none;stroke:var(--ink-2);stroke-width:1.5' }, g);
          S('text', { x: x + 22, y: y + 30, style: 'font-weight:600;font-size:17px', text: t }, g);
          fo(g, x + 20, y + 36, 256, 60, `<span class="fo-xs">${html}</span>`);
          badges.push(g);
        });
      },
      update(p) {
        cards.forEach((g, i) => { const k = R.ease(R.seg(p, i * .08, .12 + i * .08)); g.style.opacity = k; g.setAttribute('transform', `translate(${(1 - k) * 40},0)`); });
        const n = nodes.length;
        nodes.forEach((r, i) => r.style.visibility = R.seg(p, .3, .6) * n > i ? 'visible' : 'hidden');
        badges.forEach((g, i) => g.style.opacity = R.seg(p, .62 + i * .06, .7 + i * .06));
      }
    });
  })();

  /* ======================= S23 The mycelium ======================= */
  (function () {
    let edges = [], trunks = [], tips = [], word, letters = [], under, nat, finalLine;
    R.scene('s23', {
      data: ['national', 'mycelium'], live: true,
      init(svg) {
        const N = D.national, M = D.mycelium;
        svg.setAttribute('viewBox', `0 0 ${N.W} ${N.H}`);
        svg.classList.add('natscale');
        nat = S('g', null, svg);
        S('path', { d: N.outline, style: 'fill:#141921;stroke:#2c3440;stroke-width:.8' }, nat);
        const rnd = R.rand(23);
        M.trunk.forEach(t => trunks.push({ el: S('path', { style: 'fill:none;stroke:#d8c29e;stroke-linecap:round' }, nat), t, o: (rnd() - .5) * 60 }));
        M.edges.forEach(e => {
          const f = R.FEEDS[e[4]];
          edges.push({ el: S('path', { style: 'fill:none;stroke-linecap:round' }, nat), e, f, o: (rnd() - .5) * 40 });
          tips.push(S('circle', { cx: e[0], cy: e[1], r: 1.6, style: `fill:var(${f.v})` }, nat));
        });
        // below ground
        under = S('g', { style: 'opacity:0' }, svg);
        S('rect', { x: -3000, y: -3000, width: N.W + 6000, height: N.H + 6000, style: 'fill:#120f0c' }, under);
        const ho = [];
        for (let i = 0; i < 9; i++) branch(under, 40 + rnd() * (N.W - 80), 40 + rnd() * (N.H - 80), rnd() * 6.28, 70, 6, R.rand(200 + i), ho, 'fill:none;stroke:#d8c29e;stroke-width:1.1;stroke-linecap:round;opacity:.8');
        for (let i = 0; i < 4; i++) branch(under, N.W * (.2 + i * .2), 0, Math.PI / 2, 140, 6, R.rand(300 + i), ho, 'fill:none;stroke:#7a5a3c;stroke-width:3;stroke-linecap:round');
        prepDash(ho);
        under.dataset.n = ho.length; under._ho = ho;
        // wordmark
        word = S('g', { style: 'opacity:0' }, svg);
        S('rect', { x: N.W * .08, y: N.H * .36, width: N.W * .84, height: N.H * .28, rx: 14, style: 'fill:#0e1116;opacity:.78' }, word);
        'RAMOS'.split('').forEach((l, i) => {
          const x = N.W * (.18 + i * .16);
          S('text', { x, y: N.H * .5, 'text-anchor': 'middle', class: 'wordmark', style: 'font-size:84px;fill:#eef0f2', text: l }, word);
          const o = [];
          branch(word, x, N.H * .5 + 14, Math.PI / 2 + (i - 2) * .07, 34, 5, R.rand(60 + i), o, 'fill:none;stroke:#d8c29e;stroke-width:1.4;stroke-linecap:round');
          prepDash(o); letters.push(o);
        });
        finalLine = S('g', { style: 'opacity:0' }, svg);
        S('rect', { x: N.W * .04, y: N.H * .665, width: N.W * .92, height: 110, rx: 12, style: 'fill:#0e1116;opacity:.82' }, finalLine);
        const ft = S('text', { x: N.W / 2, y: N.H * .665 + 46, 'text-anchor': 'middle', style: 'font-family:var(--serif);font-size:27px;fill:#eef0f2' }, finalLine);
        S('tspan', { x: N.W / 2, dy: 0, text: 'Model human systems on nature,' }, ft);
        S('tspan', { x: N.W / 2, dy: 36, text: 'in a way that helps us and our planet.' }, ft);
      },
      update(p, t) {
        const m = R.ease(R.seg(p, .05, .4));
        const col = R.seg(p, .15, .4);
        const curve = (x1, y1, x2, y2, o, k) => {
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
          return `M${x1},${y1} Q${(mx - dy / L * o * k).toFixed(1)},${(my + dx / L * o * k).toFixed(1)} ${x2},${y2}`;
        };
        edges.forEach(({ el, e, f, o }) => {
          el.setAttribute('d', curve(e[0], e[1], e[2], e[3], o, m));
          el.style.stroke = col > .5 ? `var(${f.v})` : '#5c6470';
          el.style.strokeWidth = (0.5 + .5 * m).toFixed(2);
          el.style.strokeDasharray = m > .5 ? '3 3' : '';
          el.style.strokeDashoffset = ((t || 0) / -90).toFixed(1);
          el.style.opacity = .55 + .35 * m;
        });
        trunks.forEach(({ el, t: tr, o }) => { el.setAttribute('d', curve(tr[0], tr[1], tr[2], tr[3], o, m)); el.style.strokeWidth = (1 + 1.6 * m).toFixed(2); el.style.opacity = .5 + .5 * m; });
        tips.forEach(c => c.setAttribute('r', (1.2 + 1.6 * m).toFixed(2)));
        const dive = R.seg(p, .45, .52) * (1 - R.seg(p, .66, .73));
        under.style.opacity = dive;
        growDash(under._ho, R.seg(p, .47, .66), 6);
        nat.style.opacity = 1 - dive * .9;
        const w = R.seg(p, .76, .86);
        word.style.opacity = w;
        letters.forEach(o => growDash(o, R.seg(p, .8, .95), 5));
        finalLine.style.opacity = R.seg(p, .9, .98);
      }
    });
  })();
})();
