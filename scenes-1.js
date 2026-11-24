/* RAMOS story site: scenes S01 to S10 */
(function () {
  'use strict';
  const R = window.RAMOS, S = R.svg, D = R.data;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------- shared drawing ---------- */
  function nationalBase(svg, extraW, opts) {
    const N = D.national;
    svg.setAttribute('viewBox', `0 0 ${N.W + (extraW || 0)} ${N.H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.classList.add('natscale');
    const g = S('g', null, svg);
    S('path', { d: N.outline, class: 'land', style: opts && opts.landStyle || '' }, g);
    return g;
  }
  // a pile of prunings: short strokes in a mound
  function pile(parent, cx, cy, w, h, color, seed, n) {
    const rnd = R.rand(seed || 3);
    const g = S('g', { 'aria-hidden': 'true' }, parent);
    n = n || 90;
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1;
      const hh = h * (1 - u * u) * rnd();
      const x = cx + u * w / 2, y = cy - hh;
      const a = (rnd() - .5) * 2.4, L = 10 + rnd() * 22;
      S('line', { x1: x - Math.cos(a) * L / 2, y1: y - Math.sin(a) * L / 2, x2: x + Math.cos(a) * L / 2, y2: y + Math.sin(a) * L / 2,
        style: `stroke:${color};stroke-width:${1.2 + rnd() * 1.6};stroke-linecap:round;opacity:${.55 + rnd() * .45}` }, g);
    }
    return g;
  }
  R.pile = pile;
  function fo(parent, x, y, w, h, html, cls) {
    const f = R.fo(parent, x, y, w, h, html);
    if (cls) f.firstChild.classList.add(cls);
    return f;
  }
  R.foL = fo;
  const show = (el, on) => { el.style.opacity = on === true ? 1 : on === false ? 0 : on; };

  /* ======================= S01 Leftovers ======================= */
  (function () {
    let circles = [], vals = [], max = 1, word, spark, mark, monthEl, lastMonth = -1, s01sec, heroImg;
    R.scene('s01', {
      data: ['national', 'embers'], live: true,
      init(svg, sec) {
        const N = D.national, E = D.embers;
        s01sec = sec;
        const H = (window.RAMOS_CONFIG || {}).HERO || {};
        if (H.src) {
          const bg = sec.querySelector('.hero-bg');
          heroImg = R.html('img', { src: H.src, alt: '' }, bg);
          if (H.credit) R.html('span', { class: 'credit', text: H.credit }, bg);
        }
        nationalBase(svg, 0, { landStyle: 'fill:#161b22;stroke:#3a4452;stroke-width:.8' });
        const g = S('g', null, svg);
        E.m.forEach(m => { m[2].forEach(v => { if (v > max) max = v; }); });
        E.m.forEach(m => {
          circles.push(S('circle', { cx: m[0], cy: m[1], r: 2, style: 'fill:#ffb35c;mix-blend-mode:screen' }, g));
          vals.push(m[2]);
        });
        // national monthly sparkline
        spark = S('g', { transform: `translate(20,${N.H - 70})` }, svg);
        const nm = E.national, nmax = Math.max(...nm), w = 230;
        let d = '';
        nm.forEach((v, i) => { d += (i ? 'L' : 'M') + (i / 71 * w).toFixed(1) + ',' + (40 - v / nmax * 38).toFixed(1); });
        S('path', { d, style: 'fill:none;stroke:#ffb35c;stroke-width:1.4;opacity:.8' }, spark);
        S('text', { x: 0, y: 56, class: 'lbl-s', style: 'fill:#a9b1bb', text: 'Requests nationally, 2020 to 2025' }, spark);
        mark = S('line', { x1: 0, x2: 0, y1: 0, y2: 42, style: 'stroke:#eef0f2;stroke-width:1.2' }, spark);
        word = S('text', { x: N.W / 2, y: N.H * .47, 'text-anchor': 'middle', class: 'wordmark', style: 'font-size:92px;fill:#eef0f2;opacity:0' , text: 'RAMOS' }, svg);
        monthEl = document.getElementById('s01-month');
      },
      update(p, t) {
        const hero = 1 - R.ease(R.seg(p, .26, .42));
        s01sec.style.setProperty('--hero', (.18 + .82 * hero).toFixed(3));
        s01sec.style.setProperty('--map', R.ease(R.seg(p, .3, .45)).toFixed(3));
        if (heroImg) heroImg.style.transform = `scale(${(1.04 + .1 * p).toFixed(3)})`;
        const mi = Math.min(71, Math.floor(R.seg(p, .38, .88) * 71.999));
        circles.forEach((c, i) => {
          const v = vals[i][mi] / max;
          const fl = .75 + .25 * Math.sin(t / 180 + i * 1.7) * Math.sin(t / 470 + i);
          c.setAttribute('r', (0.6 + 9 * Math.sqrt(v)).toFixed(2));
          c.style.opacity = (Math.min(1, .1 + 1.4 * Math.sqrt(v)) * fl * (1 - .6 * R.seg(p, .88, 1))).toFixed(3);
        });
        mark.setAttribute('x1', mi / 71 * 230); mark.setAttribute('x2', mi / 71 * 230);
        word.style.opacity = R.ease(R.seg(p, .86, .98));
        if (mi !== lastMonth && monthEl) { monthEl.textContent = 'Month shown: ' + MONTHS[mi % 12] + ' ' + (2020 + Math.floor(mi / 12)) + '.'; lastMonth = mi; }
      }
    });
  })();

  /* ======================= S02a Burned, buried, wasted ======================= */
  (function () {
    let ribbons = [], clipR, labs = [], bubbles = [], smoke = [], townG, farmG, forestG, tabs = [], farmBars = [];
    R.scene('s02a', {
      live: true,
      init(svg) {
        svg.setAttribute('viewBox', '0 0 920 600');
        // three sources, one at a time: towns, farms, forests
        ['Towns', 'Farms', 'Forests'].forEach((t, i) => {
          const g = S('g', { transform: `translate(${20 + i * 128},4)` }, svg);
          const r = S('rect', { x: 0, y: 0, width: 116, height: 34, rx: 17, style: 'fill:#1c1c1e;stroke:#3a3a3c' }, g);
          const tx = S('text', { x: 58, y: 23, 'text-anchor': 'middle', style: 'font-size:15px;font-weight:600;fill:var(--muted)', text: t }, g);
          tabs.push([r, tx]);
        });
        townG = S('g', { transform: 'translate(0,40)' }, svg);
        const svg0 = svg; svg = townG;
        const defs = S('defs', null, svg0);
        const cp = S('clipPath', { id: 's02aclip' }, defs);
        clipR = S('rect', { x: 0, y: 0, width: 0, height: 560 }, cp);
        const tot = R.num('L103'), k = 420 / tot, gap = 16;
        const x0 = 70, x1 = 590, top = 70;
        const parts = [
          ['committed: composted or digested', R.num('L104'), 'var(--good)', R.N('L104', { unit: 'kt' })],
          ['landfill', R.num('L106', 0), 'var(--scar)', R.N('L106', { part: 0, unit: 'kt', nochip: true })],
          ['incineration', R.num('L106', 1), 'var(--fire)', R.N('L106', { part: 1, unit: 'kt', nochip: true })],
          ['mechanical treatment only', R.num('L106', 2), 'var(--muted)', R.N('L106', { part: 2, unit: 'kt' })]
        ];
        S('rect', { x: x0 - 26, y: top, width: 26, height: tot * k, style: 'fill:var(--f-food)' }, svg);
        fo(svg, 0, top + tot * k + 8, 300, 60, `<span class="fo-s">Municipal biowaste</span><br>${R.N('L103', { unit: 'kt' })}`);
        const g = S('g', { 'clip-path': 'url(#s02aclip)' }, svg);
        let ly = top, ry = top;
        parts.forEach(([name, v, col, html], i) => {
          const h = v * k, y2 = ry + i * gap;
          const d = `M${x0},${ly} C${(x0 + x1) / 2},${ly} ${(x0 + x1) / 2},${y2} ${x1},${y2} L${x1},${y2 + h} C${(x0 + x1) / 2},${y2 + h} ${(x0 + x1) / 2},${ly + h} ${x0},${ly + h} Z`;
          ribbons.push(S('path', { d, style: `fill:${col};opacity:.55` }, g));
          S('rect', { x: x1, y: y2, width: 14, height: h, style: `fill:${col}` }, g);
          labs.push(fo(svg, x1 + 22, y2 + h / 2 - 22, 300, 50, `<span class="fo-s">${name}</span><br>${html}`));
          if (i === 1) for (let b = 0; b < 9; b++) bubbles.push({ el: S('text', { x: x1 + 8, y: y2, 'text-anchor': 'middle', style: 'font-size:12px;fill:var(--ink-2);opacity:0', text: 'CH4' }, svg), o: b / 9, x: x1 + 5 + (b % 3) * 4, y: y2 });
          if (i === 2) for (let b = 0; b < 8; b++) smoke.push({ el: S('circle', { r: 6, cx: x1 + 7, cy: y2, style: 'fill:var(--muted);opacity:0' }, svg), o: b / 8, y: y2 });
          ly += h; ry += h;
        });
        // the uncommitted bracket
        const yb0 = top + R.num('L104') * k + gap, yb1 = top + tot * k + 3 * gap;
        const br = S('g', null, svg);
        S('path', { d: `M${x1 + 270},${yb0} l10,0 l0,${yb1 - yb0} l-10,0`, style: 'fill:none;stroke:var(--ink);stroke-width:1.6' }, br);
        fo(br, x1 + 186, yb1 + 6, 140, 80, `<span class="fo-s" style="display:block;text-align:right">uncommitted</span><span style="display:block;text-align:right">${R.N('L105', { part: 1, unit: '%' })}</span>`);
        labs.push(br);
        labs.forEach(l => l.style.opacity = 0);
        S('text', { x: 0, y: 30, style: 'font-size:22px;font-weight:700;letter-spacing:-.02em;fill:var(--ink)', text: 'In the towns: where municipal biowaste goes, 2024' }, townG);
        svg = svg0;
        // ---- farms: share of prunings burned in the field ----
        farmG = S('g', { transform: 'translate(0,40)', style: 'opacity:0' }, svg);
        S('text', { x: 0, y: 30, style: 'font-size:22px;font-weight:700;letter-spacing:-.02em;fill:var(--ink)', text: 'On the farms: share of prunings burned in the field' }, farmG);
        const fdefs = S('linearGradient', { id: 's02aflame', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
        S('stop', { offset: '0', 'stop-color': '#ff6b2a' }, fdefs); S('stop', { offset: '1', 'stop-color': '#ffcf7a' }, fdefs);
        const crops = [['Olive', 'L015', null, 'var(--f-olive)'], ['Vine', 'L021', 0, 'var(--f-vine)'], ['Fruit', 'L021', 1, 'var(--f-fruit)'], ['Almond and pistachio', 'L021', 2, 'var(--f-straw)'], ['Walnut and hazelnut', 'L021', 3, 'var(--f-manure)']];
        const BX = 250, BW = 560;
        crops.forEach(([nm, id, part, col], i) => {
          const y = 80 + i * 78;
          S('circle', { cx: 12, cy: y + 18, r: 7, style: `fill:${col}` }, farmG);
          S('text', { x: 28, y: y + 24, style: 'font-size:18px;font-weight:600;fill:var(--ink)', text: nm }, farmG);
          S('rect', { x: BX, y: y + 2, width: BW, height: 32, rx: 10, style: 'fill:#1c1c1e' }, farmG);
          const v = part === null ? R.num(id) : R.num(id, part);
          const b = S('rect', { x: BX, y: y + 2, width: 0, height: 32, rx: 10, style: 'fill:url(#s02aflame)' }, farmG);
          b.dataset.w = v * BW; farmBars.push(b);
          fo(farmG, BX, y + 38, 560, 30, `<span class="fo-xs">${Math.round(v * 100)} % burned ${R.chipHTML(id)}</span>`);
        });
        fo(farmG, 0, 478, 860, 60, '<span class="fo-s">Share of removable dry matter burned in the open, by crop. The rest is mostly chipped and left, used as firewood or sold.</span>');
        // ---- forests: what is left behind becomes fuel ----
        forestG = S('g', { transform: 'translate(0,40)', style: 'opacity:0' }, svg);
        S('text', { x: 0, y: 30, style: 'font-size:22px;font-weight:700;letter-spacing:-.02em;fill:var(--ink)', text: 'In the forests: what is left behind becomes fuel' }, forestG);
        fo(forestG, 0, 70, 860, 150, `<div style="font-size:84px;font-weight:800;letter-spacing:-.05em;line-height:1;background:linear-gradient(100deg,#ffd27a,#ff6b2a);-webkit-background-clip:text;background-clip:text;color:transparent">${R.part('L007')} kha</div><div class="fo-s" style="margin-top:8px">burned by wildfire in an average year, 1975 to 2025 ${R.chipHTML('L007')}</div>`);
        // a small strip of trees, some burned
        for (let i = 0; i < 26; i++) {
          const x = 20 + i * 33, h = 46 + (i * 37 % 23), burned = (i * 7) % 5 < 2;
          S('rect', { x: x - 2, y: 330 - h * .35, width: 4, height: h * .35, style: `fill:${burned ? '#2a2420' : '#6b5240'}` }, forestG);
          S('path', { d: `M${x},${330 - h} L${x - 13},${330 - h * .3} L${x + 13},${330 - h * .3} Z`, style: `fill:${burned ? '#3a2a22' : 'var(--f-forest)'};opacity:${burned ? .9 : .8}` }, forestG);
        }
        S('rect', { x: 0, y: 330, width: 880, height: 8, rx: 4, style: 'fill:#4a3a2a' }, forestG);
        fo(forestG, 0, 360, 860, 150, `<span class="fo-s">Slash from thinning and felling is often left on the ground, where it dries and adds to the fuel load. Burning season peaks in November and February ${R.N('L008', { unit: '%' })} of requests to burn.</span>`);
      },
      update(p, t) {
        const ph = p < .44 ? 0 : p < .72 ? 1 : 2;
        tabs.forEach(([r, tx], i) => { r.style.fill = i === ph ? '#f5f5f7' : '#1c1c1e'; tx.style.fill = i === ph ? '#000' : 'var(--muted)'; });
        townG.style.opacity = 1 - R.seg(p, .4, .46); farmG.style.opacity = R.seg(p, .44, .5) * (1 - R.seg(p, .68, .74)); forestG.style.opacity = R.seg(p, .72, .78);
        farmBars.forEach((b, i) => b.setAttribute('width', (+b.dataset.w * R.ease(R.seg(p, .46 + i * .03, .58 + i * .03))).toFixed(1)));
        const g = R.ease(R.seg(p, .03, .25));
        clipR.setAttribute('width', 920 * g);
        labs.forEach((l, i) => l.style.opacity = R.seg(p, .15 + i * .04, .22 + i * .04));
        const on = R.seg(p, .25, .32) * (1 - R.seg(p, .4, .44));
        bubbles.forEach(b => { const k = ((t / 3000) + b.o) % 1; b.el.setAttribute('y', (b.y - k * 60).toFixed(1)); b.el.setAttribute('x', (b.x + Math.sin(k * 6 + b.o * 9) * 6).toFixed(1)); b.el.style.opacity = (on * (1 - k) * .9).toFixed(2); });
        smoke.forEach(b => { const k = ((t / 2600) + b.o) % 1; b.el.setAttribute('cy', (b.y - k * 70).toFixed(1)); b.el.setAttribute('r', (4 + k * 12).toFixed(1)); b.el.style.opacity = (on * (1 - k) * .35).toFixed(2); });
      }
    });
  })();

  /* ======================= S02b Closing the land's loops ======================= */
  (function () {
    let stations = [], procs = [], links = [], dots = [], ring, centre, air;
    const CX = 460, CY = 285, RR = 225;
    R.scene('s02b', {
      live: true,
      init(svg) {
        svg.setAttribute('viewBox', '0 0 920 580');
        ring = S('circle', { cx: CX, cy: CY, r: RR, style: 'fill:none;stroke:var(--line);stroke-width:10' }, svg);
        const ringFlow = S('circle', { cx: CX, cy: CY, r: RR, style: 'fill:none;stroke:var(--good);stroke-width:3;stroke-dasharray:4 14;opacity:.8' }, svg);
        dots.push(ringFlow);
        const ST = [
          [-90, 'Fields, forests, towns', 'grow and use biomass'],
          [-18, 'Residues', 'prunings, slash, food waste, manure'],
          [54, 'Products', 'biomethane, biochar, compost, power'],
          [126, 'End use', R.isPartner ? 'gas grid, concrete, heat, industry' : 'gas grid, cement, heat, industry'],
          [198, 'Back to the soil', 'char, digestate, compost: carbon and nutrients']
        ];
        ST.forEach(([a, name, sub], i) => {
          const r = a * Math.PI / 180, x = CX + Math.cos(r) * RR, y = CY + Math.sin(r) * RR;
          const g = S('g', null, svg);
          S('circle', { cx: x, cy: y, r: 13, style: 'fill:var(--ground);stroke:var(--ink);stroke-width:3' }, g);
          const left = Math.cos(r) < -.2, w = 210;
          fo(g, left ? x - w - 20 : (Math.abs(Math.cos(r)) < .2 ? x - w / 2 : x + 20), Math.abs(Math.cos(r)) < .2 ? (Math.sin(r) < 0 ? y - 66 : y + 18) : y - 22, w, 64, `<div class="${left ? 'fo-r' : ''}"><strong>${name}</strong><br><span class="fo-xs">${sub}</span></div>`);
          stations.push(g);
        });
        // the four conversion routes in the middle
        const P = [['Anaerobic digestion', 'biomethane and digestate', 'var(--p-gas)'], ['Pyrolysis', 'biochar, carbon stored', 'var(--p-char)'], ['Composting', 'compost for soils', 'var(--good)'], ['Gasification', 'power, heat, fuels', 'var(--p-power)']];
        const rs = ST[1], pr = ST[2];
        const sx = CX + Math.cos(rs[0] * Math.PI / 180) * RR, sy = CY + Math.sin(rs[0] * Math.PI / 180) * RR;
        const px = CX + Math.cos(pr[0] * Math.PI / 180) * RR, py = CY + Math.sin(pr[0] * Math.PI / 180) * RR;
        P.forEach(([name, out, col], i) => {
          const bx = CX - 162 + (i % 2) * 168, by = CY - 82 + Math.floor(i / 2) * 84;
          const l1 = S('path', { d: `M${sx},${sy} Q${CX + 120},${by + 30} ${bx + 140},${by + 30}`, style: `fill:none;stroke:${col};stroke-width:2;stroke-dasharray:5 5;opacity:.7` }, svg);
          const l2 = S('path', { d: `M${bx + 70},${by + 60} Q${px - 60},${py - 40} ${px},${py}`, style: `fill:none;stroke:${col};stroke-width:2;stroke-dasharray:5 5;opacity:.7` }, svg);
          links.push(l1, l2);
          const g = S('g', null, svg);
          S('rect', { x: bx, y: by, width: 156, height: 70, rx: 8, style: `fill:var(--panel);stroke:${col};stroke-width:2` }, g);
          fo(g, bx + 6, by + 5, 144, 62, `<div style="text-align:center;line-height:1.15"><strong style="font-size:14px">${name}</strong><br><span class="fo-xs">${out}</span></div>`);
          procs.push(g);
        });
        centre = S('text', { x: CX, y: CY + 112, 'text-anchor': 'middle', style: 'font-family:var(--serif);font-size:24px;fill:var(--ink)', text: 'The land’s metabolism' }, svg);
        air = S('g', null, svg);
        const ax = CX + Math.cos(-90 * Math.PI / 180) * RR;
        S('path', { d: `M${ax - 70},${CY - RR - 70} Q${ax - 40},${CY - RR - 30} ${ax - 12},${CY - RR - 8}`, style: 'fill:none;stroke:var(--good);stroke-width:2.5;marker-end:none' }, air);
        S('text', { x: ax - 160, y: CY - RR - 74, style: 'font-size:15px;fill:var(--good)', text: 'CO2 drawn from the air' }, air);
        [...stations, ...procs, ...links, centre, air].forEach(e => e.style.opacity = 0);
      },
      update(p, t) {
        stations.forEach((g, i) => g.style.opacity = R.seg(p, .04 + i * .08, .12 + i * .08));
        procs.forEach((g, i) => g.style.opacity = R.seg(p, .4 + i * .06, .48 + i * .06));
        links.forEach((l, i) => { l.style.opacity = .7 * R.seg(p, .4 + Math.floor(i / 2) * .06, .5 + Math.floor(i / 2) * .06); l.style.strokeDashoffset = (-(t || 0) / 40).toFixed(1); });
        centre.style.opacity = R.seg(p, .7, .8);
        air.style.opacity = R.seg(p, .1, .2);
        dots[0].style.strokeDashoffset = (-(t || 0) / 30).toFixed(1);
        dots[0].style.opacity = .8 * R.seg(p, .02, .1);
      }
    });
  })();

  /* ======================= S02 The same tonne, counted twice ======================= */
  (function () {
    let left, right, overlap, split, labsL, labsR, labO, oneFate;
    // partner: a schematic in large type. Each pathway claims the whole pool, so the claims add up to three pools.
    const pst = {};
    function partnerInit(svg) {
      svg.setAttribute('viewBox', '0 0 900 560');
      const X0 = 230, U = 190, H = 64;
      const row = (y, label, sub, col) => {
        const g = S('g', null, svg);
        S('text', { x: X0 - 20, y: y + 30, 'text-anchor': 'end', style: 'font-size:24px;font-weight:700;fill:var(--ink)', text: label }, g);
        if (sub) S('text', { x: X0 - 20, y: y + 54, 'text-anchor': 'end', style: 'font-size:16px;fill:var(--ink-2)', text: sub }, g);
        return g;
      };
      // what exists
      pst.exist = row(30, 'Residue that exists', 'one finite pool');
      S('rect', { x: X0, y: 30, width: U, height: H, rx: 14, style: 'fill:var(--f-olive)' }, pst.exist);
      // what the studies claim
      pst.claimLab = row(150, 'Claimed by studies', 'each pathway assessed alone');
      const cols = [['Biochar', 'var(--p-char)'], ['Biomethane', 'var(--p-gas)'], ['Bioenergy', 'var(--p-power)']];
      pst.claims = cols.map(([nm, c], i) => {
        const g = S('g', null, svg);
        S('rect', { x: X0 + i * (U + 8), y: 150, width: U, height: H, rx: 14, style: `fill:${c}` }, g);
        S('text', { x: X0 + i * (U + 8) + U / 2, y: 190, 'text-anchor': 'middle', style: 'font-size:21px;font-weight:700;fill:#000', text: nm }, g);
        return g;
      });
      // guide showing the real limit
      pst.limit = S('g', null, svg);
      S('line', { x1: X0 + U, x2: X0 + U, y1: 18, y2: 236, style: 'stroke:var(--fire);stroke-width:3;stroke-dasharray:7 6' }, pst.limit);
      S('text', { x: X0 + U + 12, y: 132, style: 'font-size:18px;font-weight:700;fill:var(--fire)', text: 'what the land can supply' }, pst.limit);
      pst.over = S('text', { x: X0 + U + 12 + 280, y: 262, 'text-anchor': 'middle', style: 'font-size:22px;font-weight:800;fill:var(--fire)', text: 'claims exceed the resource' }, svg);
      // RAMOS: one pool split once
      pst.ramosLab = row(320, 'Allocated by RAMOS', 'each tonne to one pathway');
      const split = [.45, .35, .2];
      let x = X0; pst.split = cols.map(([nm, c], i) => { const w = U * split[i]; const r = S('rect', { x, y: 320, width: w - 3, height: H, rx: 10, style: `fill:${c}` }, svg); x += w; return r; });
      pst.ok = S('text', { x: X0 + U + 20, y: 362, style: 'font-size:22px;font-weight:800;fill:var(--good)', text: 'within the resource' }, svg);
      fo(svg, X0 - 210, 440, 860, 60, '<span class="fo-s">Schematic. Bar lengths show the logic, not values. The national multiplier is reported after the 2 December freeze.</span>');
    }
    function partnerUpdate(p) {
      const a = R.seg(p, .02, .15);
      pst.exist.style.opacity = a;
      pst.claimLab.style.opacity = R.seg(p, .15, .25);
      pst.claims.forEach((g, i) => g.style.opacity = R.seg(p, .2 + i * .08, .3 + i * .08));
      pst.limit.style.opacity = R.seg(p, .45, .55); pst.over.style.opacity = R.seg(p, .5, .6);
      const r = R.seg(p, .65, .78);
      pst.ramosLab.style.opacity = r; pst.split.forEach(e => e.style.opacity = r); pst.ok.style.opacity = R.seg(p, .75, .85);
    }
    R.scene('s02', {
      init(svg) {
        if (R.isPartner) return partnerInit(svg);
        svg.setAttribute('viewBox', '0 0 920 560');
        const cy = 270, r = 190;
        left = S('g', null, svg); right = S('g', null, svg);
        S('circle', { cx: 350, cy, r, style: 'fill:var(--p-char);opacity:.14;stroke:var(--p-char);stroke-width:2.5' }, left);
        S('circle', { cx: 570, cy, r, style: 'fill:var(--p-gas);opacity:.14;stroke:var(--p-gas);stroke-width:2.5' }, right);
        S('text', { x: 230, y: 60, 'text-anchor': 'middle', style: 'font-weight:600;font-size:19px', text: R.isPartner ? 'Biochar plans' : 'Biochar paper' }, left);
        S('text', { x: 690, y: 60, 'text-anchor': 'middle', style: 'font-weight:600;font-size:19px', text: R.isPartner ? 'Biomethane plans' : 'Biomethane paper' }, right);
        labsL = fo(left, 175, 220, 170, 110, `<span class="fo-s">agricultural residues</span><br>${R.N('L109', { part: 0, unit: 'Mt/yr', nochip: true })}<br><span class="fo-xs">to biochar</span>`);
        labsR = fo(right, 580, 220, 180, 120, `<span class="fo-s">biowaste of</span><br>${R.N('L093', { part: 0, unit: 'municipalities', nochip: true })}<br><span class="fo-xs">to ${R.N('L093', { part: 1, unit: 'bcm biomethane' })}</span>`);
        const defs = S('defs', null, svg);
        const cpL = S('clipPath', { id: 's02cl' }, defs); S('circle', { cx: 350, cy, r }, cpL);
        overlap = S('g', { 'clip-path': 'url(#s02cl)' }, svg);
        S('circle', { cx: 570, cy, r, style: 'fill:var(--f-food);opacity:.5' }, overlap);
        labO = fo(svg, 375, 200, 170, 150, `<div style="text-align:center"><span class="fo-s">municipal organics</span><br>${R.N('L109', { part: 1, unit: 'Mt/yr' })}<br><strong style="color:var(--fire)">claimed twice</strong></div>`);
        split = S('line', { x1: 460, x2: 460, y1: cy - 150, y2: cy + 150, style: 'stroke:var(--ink);stroke-width:3;stroke-dasharray:6 5;opacity:0' }, svg);
        oneFate = S('text', { x: 460, y: cy + 230, 'text-anchor': 'middle', style: 'font-family:var(--serif);font-size:26px;opacity:0', text: 'One tonne, one fate' }, svg);
      },
      update(p) {
        if (R.isPartner) return partnerUpdate(p);
        const a = R.ease(R.seg(p, 0, .3));
        left.setAttribute('transform', `translate(${(-160 * (1 - a)).toFixed(1)},0)`);
        right.setAttribute('transform', `translate(${(160 * (1 - a)).toFixed(1)},0)`);
        left.style.opacity = right.style.opacity = a;
        const o = R.seg(p, .3, .45);
        overlap.style.opacity = o * (.75 + .25 * Math.sin(p * 40));
        labO.style.opacity = o;
        const s = R.ease(R.seg(p, .72, .88));
        split.style.opacity = s; oneFate.style.opacity = s;
        overlap.style.opacity = o * (1 - s * .6);
      }
    });
  })();

  /* ======================= S03 One tonne, one fate ======================= */
  (function () {
    let groups = [];
    function branch(parent, x, y, ang, len, depth, rnd, out) {
      if (depth <= 0 || len < 4) return;
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      const mx = (x + x2) / 2 + (rnd() - .5) * len * .3, my = (y + y2) / 2 + (rnd() - .5) * len * .3;
      const p = S('path', { d: `M${x.toFixed(1)},${y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`,
        style: `fill:none;stroke:var(--hypha);stroke-width:${(depth * .45).toFixed(2)};stroke-linecap:round` }, parent);
      out.push([p, depth]);
      const n = rnd() < .35 ? 3 : 2;
      for (let i = 0; i < n; i++) branch(parent, x2, y2, ang + (rnd() - .5) * 1.4, len * (.62 + rnd() * .18), depth - 1, rnd, out);
    }
    R.scene('s03', {
      init(svg) {
        svg.setAttribute('viewBox', '0 0 900 560');
        const L = ['R', 'A', 'M', 'O', 'S'], W = ['Residue', 'Allocation', 'Mapping', 'Optimisation', 'Sustainability'];
        L.forEach((l, i) => {
          const x = 110 + i * 170;
          const g = S('g', null, svg);
          S('text', { x, y: 170, 'text-anchor': 'middle', class: 'wordmark', style: 'font-size:120px;fill:var(--ink)', text: l }, g);
          S('text', { x, y: 215, 'text-anchor': 'middle', class: 'lbl', style: 'font-size:19px', text: W[i] }, g);
          const paths = [];
          branch(g, x, 235, Math.PI / 2 + (i - 2) * .06, 70, 7, R.rand(40 + i * 7), paths);
          paths.forEach(([p]) => { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; p.dataset.len = len; });
          groups.push({ g, paths });
        });
      },
      update(p) {
        groups.forEach((o, i) => {
          const a = R.seg(p, i * .1, i * .1 + .16);
          o.g.style.opacity = R.ease(a);
          const b = R.seg(p, .45 + i * .04, .9);
          o.paths.forEach(([el, depth]) => {
            const local = R.clamp((b * 8 - (7 - depth)) );
            el.style.strokeDashoffset = (+el.dataset.len * (1 - local)).toFixed(1);
            el.style.opacity = local > 0 ? 1 : 0;
          });
        });
      }
    });
  })();

  /* schematic field mosaic shared by S04 and S05: returns [pathD, municipalityIndex] */
  // irregular field mosaic: a Voronoi tessellation of jittered seed points, small fields in the north,
  // large ones in the south, some fields cut into long thin strips like the northern minifundio
  R.mosaicCells = function (N, scale, seed) {
    const rnd = R.rand(seed || 17), cells = [];
    const cents = N.munis.map((m, i) => [m.x, m.y, i]);
    const near = (x, y) => { let b = 0, d = 1e9; for (const c of cents) { const e = (c[0] - x) ** 2 + (c[1] - y) ** 2; if (e < d) { d = e; b = c[2]; } } return b; };
    const size = y => (6 + 15 * (y / N.H) ** 1.4) * scale;
    const pts = [];
    for (let y = 0; y < N.H;) { const st = size(y); for (let x = -st * rnd(); x < N.W + st;) { const sx = st * (.7 + rnd() * .9); pts.push([x + (rnd() - .5) * sx * .8, y + (rnd() - .5) * st * .8, st]); x += sx; } y += st * (.75 + rnd() * .5); }
    const G = 40, grid = new Map(), key = (i, j) => i + ',' + j;
    pts.forEach((p, k) => { const kk = key(Math.floor(p[0] / G), Math.floor(p[1] / G)); if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push(k); });
    const clip = (poly, nx, ny, c) => {   // keep the side where nx*x + ny*y <= c
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const A = poly[i], B = poly[(i + 1) % poly.length];
        const da = nx * A[0] + ny * A[1] - c, db = nx * B[0] + ny * B[1] - c;
        if (da <= 0) out.push(A);
        if ((da < 0) !== (db < 0)) { const t = da / (da - db); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
      }
      return out;
    };
    pts.forEach(([px, py, st], k) => {
      const R0 = st * 1.6;
      let poly = [[px - R0, py - R0], [px + R0, py - R0], [px + R0, py + R0], [px - R0, py + R0]];
      const gi = Math.floor(px / G), gj = Math.floor(py / G), rr = Math.ceil(R0 * 2 / G);
      for (let i = gi - rr; i <= gi + rr; i++) for (let j = gj - rr; j <= gj + rr; j++) {
        const list = grid.get(key(i, j)); if (!list) continue;
        for (const q of list) { if (q === k) continue; const [qx, qy] = pts[q]; const dx = qx - px, dy = qy - py; if (dx * dx + dy * dy > 16 * R0 * R0) continue; poly = clip(poly, dx, dy, (qx * qx + qy * qy - px * px - py * py) / 2); if (poly.length < 3) break; }
        if (poly.length < 3) break;
      }
      if (poly.length < 3) return;
      // a small gap between fields: pull each corner towards the centre
      const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
      const shrink = Math.max(.55, 1 - .9 / st);
      const sh = poly.map(([x, y]) => [cx + (x - cx) * shrink, cy + (y - cy) * shrink]);
      const mi = near(cx, cy);
      // northern strips: cut some fields into two to four long parallel plots
      if (cy < N.H * .55 && rnd() < .35) {
        const n = 2 + Math.floor(rnd() * 3), ang = rnd() * Math.PI, nx = Math.cos(ang), ny = Math.sin(ang);
        const proj = sh.map(([x, y]) => nx * x + ny * y), lo = Math.min(...proj), hi = Math.max(...proj);
        for (let s2 = 0; s2 < n; s2++) {
          let piece = clip(sh, nx, ny, lo + (hi - lo) * (s2 + 1) / n - .3);
          piece = clip(piece, -nx, -ny, -(lo + (hi - lo) * s2 / n + .3));
          if (piece.length >= 3) cells.push(['M' + piece.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z', mi]);
        }
      } else cells.push(['M' + sh.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z', mi]);
    });
    return cells;
  };

  /* ======================= S04 Every residue, on a real map ======================= */
  (function () {
    let layers = [], badges = [];
    // schematic parcel mosaic: small fields in the north, large in the south,
    // each field tinted by its municipality's feedstock mix (F1 classes). Not real parcels.
    function mosaic(N) {
      const cells = R.mosaicCells(N, 1, 17);
      const rnd = R.rand(23), out = R.FEEDS.map(() => ''), none = [];
      cells.forEach(([d, mi]) => {
        const c = N.munis[mi].c;
        const wts = c.map(v => v * v), tot = wts.reduce((a, b) => a + b, 0) + 6;
        let r = rnd() * tot, k = -1;
        for (let i = 0; i < wts.length; i++) { if (r < wts[i]) { k = i; break; } r -= wts[i]; }
        if (k >= 0) out[k] += d; else none.push(d);
      });
      return { out, none: none.join('') };
    }
    R.scene('s04', {
      data: ['national', 'enduse', 'fire'],
      init(svg) {
        const N = D.national, U = D.enduse;
        nationalBase(svg, 370);
        const defs = S('defs', null, svg);
        const cp = S('clipPath', { id: 's04clip' }, defs);
        S('path', { d: N.outline }, cp);
        const L = [];
        // 1 boundaries
        const gM = S('g', null, svg);
        N.munis.forEach(m => S('path', { d: m.d, class: 'muni' }, gM));
        L.push([gM, 'Boundaries', 'CAOP 2025, DGT. 278 municipalities']);
        // 2 parcels as a schematic mosaic
        const gP = S('g', { 'clip-path': 'url(#s04clip)' }, svg);
        const M = mosaic(N);
        S('path', { d: M.none, style: 'fill:var(--ink-2);opacity:.08' }, gP);
        R.FEEDS.forEach((f, i) => S('path', { d: M.out[i], style: `fill:var(${f.v});opacity:.36` }, gP));
        L.push([gP, 'Farm and forest parcels', `iSIP (IFAP), COSc (DGT). ${R.N('L001', { unit: 'parcels' })}, shown as a schematic mosaic`]);
        // 3 burned areas
        const gF = S('g', null, svg);
        if (D.fire) S('path', { d: D.fire.years.map(y => y[1]).join(''), style: 'fill:var(--fire);opacity:.38' }, gF);
        L.push([gF, 'Burned areas', `ICNF, ${R.N('L006', { unit: '' })}`]);
        // 4 lines: gas grid
        const gG = S('g', null, svg);
        S('path', { d: U.pipes.join(''), style: 'fill:none;stroke:var(--p-gas);stroke-width:1.6' }, gG);
        L.push([gG, 'Gas grid', 'OpenInfraMap and OpenStreetMap (ODbL)']);
        // 5 points
        const gW = S('g', null, svg);
        U.emitters.forEach(e => S('circle', { cx: e[0], cy: e[1], r: 3.2, style: 'fill:var(--ink-2);opacity:.75' }, gW));
        U.hubs.forEach(h => S('rect', { x: h[0] - 4, y: h[1] - 4, width: 8, height: 8, style: 'fill:none;stroke:var(--ink);stroke-width:1.4' }, gW));
        U.kilns.forEach(k => S('rect', { x: k[0] - 5, y: k[1] - 5, width: 10, height: 10, style: 'fill:var(--p-char)' }, gW));
        N.wastePlants.forEach(([x, y]) => S('circle', { cx: x, cy: y, r: 5, style: 'fill:var(--f-food);stroke:var(--ground);stroke-width:1.2' }, gW));
        L.push([gW, 'Points', R.isPartner ? 'Biowaste plants (APA), industrial emitters (EU ETS, E-PRTR), ports and airports' : 'Biowaste plants (APA), industrial emitters (EU ETS, E-PRTR), cement kilns, ports and airports']);
        const bx = N.W + 18;
        L.forEach(([g, t, txt], i) => {
          const b = S('g', null, svg);
          S('rect', { x: bx, y: 40 + i * 205, width: 350, height: 185, rx: 10, style: 'fill:var(--panel);stroke:var(--line)' }, b);
          S('text', { x: bx + 16, y: 76 + i * 205, style: 'font-weight:600;font-size:25px', text: t }, b);
          fo(b, bx + 14, 86 + i * 205, 326, 134, `<span class="fo-s">${txt}</span>`);
          layers.push(g); badges.push(b);
        });
        const tot = S('g', null, svg);
        fo(tot, bx, 40 + 5 * 205, 310, 80, `<span class="fo-s">${R.N('L002', { unit: 'datasets in the library' })}</span>`);
        badges.push(tot);
        layers.concat(badges).forEach(l => l.style.opacity = 0);
      },
      update(p) {
        layers.forEach((g, i) => {
          const a = R.ease(R.seg(p, .04 + i * .15, .16 + i * .15));
          g.style.opacity = a; badges[i].style.opacity = a;
        });
        badges[badges.length - 1].style.opacity = R.seg(p, .8, .9);
      }
    });
  })();

  /* ======================= S05 The feedstocks ======================= */
  (function () {
    // each feedstock is a continuous sheet of fields, no municipal lines; sheets drop
    // onto an exploded layer stack one at a time
    const OP = [0, .28, .5, .75, 1];
    let sheets = [], legend, shown = -2;
    const SH = 'matrix(1,0,-0.55,0.36,0,0)';
    function legendHTML(i) {
      if (i < 0) return '';
      const f = R.FEEDS[i];
      let tag = '';
      if (f.k === 'manure') tag = '<span class="chip wip">work in progress</span>';
      if (f.k === 'forest') tag = '<span class="chip prov">provisional</span>';
      if (f.k === 'straw') tag = '<span class="chip prov">mapped, kept out of totals</span>';
      const ramp = [1, 2, 3, 4].map(c => `<span class="sw" style="background:var(${f.v});opacity:${OP[c]}"></span>`).join('');
      return `<span class="k">${R.feedIcon(f, 22)} <strong>${f.name}</strong>${tag}</span><span class="k">presence class 1 to 4 ${ramp}</span>`;
    }
    R.scene('s05', {
      data: ['national'],
      init(svg) {
        const N = D.national;
        const n = R.FEEDS.length, gap = 92;
        const shearW = N.W + .55 * N.H, sheetH = N.H * .36;
        const W = shearW + 440, H = sheetH + gap * (n - 1) + 60;
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.classList.add('natscale');
        const defs = S('defs', null, svg);
        S('path', { id: 's05out', d: N.outline }, defs);
        const cp = S('clipPath', { id: 's05clip' }, defs); S('use', { href: '#s05out' }, cp);
        const cells = R.mosaicCells(N, 1.25, 29);
        R.FEEDS.forEach((f, k) => {
          const y0 = 30 + gap * (n - 1 - k);          // first feedstock at the bottom
          const outer = S('g', { transform: `translate(${.55 * N.H},${y0})` }, svg);
          const g = S('g', { transform: SH }, outer);
          S('use', { href: '#s05out', style: 'fill:var(--land);stroke:var(--land-edge);stroke-width:2;opacity:.92' }, g);
          const byCls = ['', '', '', '', ''];
          cells.forEach(([d, mi]) => { const c = N.munis[mi].c[k]; if (c) byCls[c] += d; });
          const fg = S('g', { 'clip-path': 'url(#s05clip)' }, g);
          [1, 2, 3, 4].forEach(c => S('path', { d: byCls[c], style: `fill:var(${f.v});opacity:${OP[c]}` }, fg));
          const lab = S('g', null, outer);
          R.feedGlyph(lab, f, shearW - .55 * N.H + 20, sheetH * .5 - 24, 34);
          S('text', { x: shearW - .55 * N.H + 62, y: sheetH * .5, style: 'font-size:24px;font-weight:600', text: f.name }, lab);
          if (f.k === 'manure' && !R.isPartner) S('text', { x: shearW - .55 * N.H + 62, y: sheetH * .5 + 28, style: 'font-size:19px;fill:var(--warn)', text: 'work in progress' }, lab);
          sheets.push({ outer, y0, lab });
        });
        legend = document.createElement('div'); legend.className = 'legend'; legend.setAttribute('aria-live', 'polite');
        document.getElementById('s05-cap').before(legend);
      },
      update(p) {
        const n = sheets.length;
        let top = -1;
        sheets.forEach((s, k) => {
          const a = R.ease(R.seg(p, .04 + k * .12, .14 + k * .12));
          if (a > .5) top = k;
          s.outer.setAttribute('transform', `translate(${(.55 * D.national.H).toFixed(1)},${(s.y0 - (1 - a) * 160).toFixed(1)})`);
          s.outer.style.opacity = a;
          // older sheets fade a little so the newest reads first, all return at the end
          const done = R.seg(p, .9, 1);
          s.outer.querySelector('g').style.opacity = (k === top || done > 0) ? 1 : .72;
        });
        if (top !== shown) {
          legend.innerHTML = top >= n - 1 && p > .9 ? '<span class="k">All seven streams, stacked. Each keeps its own colour.</span>' : legendHTML(top);
          shown = top;
        }
      }
    });
  })();

  /* ======================= S06 Fire as a shared layer ======================= */
  (function () {
    let yearPaths = [], counter, svgEl, names = [], clusterPath, W, H, box;
    R.scene('s06', {
      data: ['national', 'fire'],
      init(svg, sec) {
        svgEl = svg;
        const N = D.national; W = N.W; H = N.H; box = N.clusterBox;
        nationalBase(svg);
        const g = S('g', null, svg);
        D.fire.years.forEach(([y, d]) => yearPaths.push([y, S('path', { d, style: 'fill:var(--scar);opacity:0' }, g)]));
        clusterPath = S('path', { d: N.cluster, style: 'fill:none;stroke:var(--ink);stroke-width:1.2;opacity:0' }, svg);
        N.munis.filter(m => m.cl).forEach(m => names.push(S('text', { x: m.x, y: m.y, 'text-anchor': 'middle', style: 'fill:var(--ink);font-weight:600;opacity:0', text: m.name }, svg)));
        counter = R.html('div', { class: 'yearcounter', 'aria-hidden': 'true' });
        counter.style.cssText = 'position:absolute;top:8%;left:6%;font-family:var(--serif);font-size:clamp(36px,5vw,64px);color:var(--ink);font-variant-numeric:tabular-nums';
        sec.querySelector('.stage').style.position = 'relative';
        sec.querySelector('.stage').appendChild(counter);
      },
      update(p) {
        let Y;
        if (p < .5) Y = 1975 + Math.floor(R.seg(p, 0, .5) * 42.999);
        else if (p < .58) Y = 2017;
        else Y = 2017 + Math.ceil(R.seg(p, .58, .7) * 8);
        const zoom = R.ease(R.seg(p, .72, .95));
        yearPaths.forEach(([y, el]) => {
          if (y > Y) { el.style.opacity = 0; return; }
          const cur = y === Y || (zoom > 0 && y === 2017);
          el.style.fill = cur ? 'var(--fire)' : 'var(--scar)';
          el.style.opacity = cur ? .9 : .45 * (1 - zoom * .5);
        });
        counter.textContent = Y;
        counter.style.opacity = 1 - zoom;
        const pad = 30;
        const vx = R.lerp(0, box[0] - pad, zoom), vy = R.lerp(0, box[1] - pad, zoom);
        const vw = R.lerp(W, box[2] + 2 * pad, zoom), vh = R.lerp(H, box[3] + 2 * pad, zoom);
        svgEl.setAttribute('viewBox', `${vx.toFixed(2)} ${vy.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`);
        clusterPath.style.opacity = R.seg(p, .7, .8);
        clusterPath.style.strokeWidth = (1.4 * vw / W).toFixed(3);
        names.forEach(t => { t.style.opacity = R.seg(p, .9, 1); t.style.fontSize = (20 * vw / W).toFixed(2) + 'px'; });
      }
    });
  })();

  /* ======================= S07 From crop to residue ======================= */
  (function () {
    let falling = [], pileG, counterFo, vine, valEl;
    R.scene('s07', {
      init(svg) {
        svg.setAttribute('viewBox', '0 0 860 520');
        S('path', { d: 'M0,330 C200,250 420,300 600,240 C700,210 800,230 860,220 L860,520 L0,520 Z', style: 'fill:var(--ground-2)' }, svg);
        S('path', { d: 'M0,430 C250,400 600,420 860,390 L860,520 L0,520 Z', style: 'fill:var(--land)' }, svg);
        const trees = [[110, 300], [300, 280], [490, 262], [680, 238]];
        const rnd = R.rand(21);
        trees.forEach(([x, y]) => {
          S('path', { d: `M${x},${y} C${x - 4},${y - 30} ${x + 6},${y - 50} ${x},${y - 70}`, style: 'fill:none;stroke:var(--f-manure);stroke-width:7;stroke-linecap:round' }, svg);
          for (let k = 0; k < 6; k++) S('ellipse', { cx: x + (rnd() - .5) * 70, cy: y - 80 - rnd() * 34, rx: 22 + rnd() * 16, ry: 14 + rnd() * 8, style: 'fill:var(--f-olive);opacity:.55' }, svg);
          for (let k = 0; k < 7; k++) {
            const sx = x + (rnd() - .5) * 80, sy = y - 70 - rnd() * 40;
            const a = rnd() * 3, L = 16 + rnd() * 14;
            const l = S('line', { x1: -L / 2, y1: 0, x2: L / 2, y2: 0, style: 'stroke:var(--f-olive);stroke-width:2.2;stroke-linecap:round' }, svg);
            falling.push({ l, sx, sy, a, tx: 380 + (rnd() - .5) * 150, ty: 470 - rnd() * 28, d: rnd() * .25 });
          }
        });
        pileG = pile(svg, 380, 478, 230, 70, 'var(--f-olive)', 4, 90);
        counterFo = fo(svg, 560, 410, 300, 90, `<span class="fo-xl"><span class="v" id="s07-val">0.00</span> <span class="u">${R.row('L097').unit}</span></span><br>${R.chipHTML('L097')}`);
        valEl = counterFo.querySelector('#s07-val');
        vine = S('g', null, svg);
        S('rect', { x: 20, y: 20, width: 250, height: 150, rx: 8, style: 'fill:var(--panel);stroke:var(--line)' }, vine);
        for (let r = 0; r < 5; r++) {
          S('line', { x1: 40, x2: 250, y1: 60 + r * 18, y2: 52 + r * 18, style: 'stroke:var(--f-vine);stroke-width:2;stroke-dasharray:3 6' }, vine);
        }
        pile(vine, 145, 152, 90, 26, 'var(--f-vine)', 8, 40);
        S('text', { x: 36, y: 42, class: 'lbl', text: 'A Dão vineyard, same method' }, vine);
      },
      update(p) {
        const fall = R.seg(p, .1, .6);
        falling.forEach(f => {
          const k = R.ease(R.clamp((fall - f.d) / .7));
          const x = R.lerp(f.sx, f.tx, k), y = R.lerp(f.sy, f.ty, k * k);
          f.l.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(f.a * 57 + k * 200).toFixed(0)})`);
          f.l.style.opacity = k > .98 ? 0 : 1;
        });
        const grow = R.ease(R.seg(p, .2, .65));
        pileG.setAttribute('transform', `translate(380,478) scale(${(.15 + .85 * grow).toFixed(3)}) translate(-380,-478)`);
        const target = R.num('L097');
        valEl.textContent = (target * grow).toFixed(2);
        vine.style.opacity = R.seg(p, .72, .85);
      }
    });
  })();

  /* ======================= S08 What happens today ======================= */
  (function () {
    let slices = [], block, labelsG, bracket, multi;
    const F = [
      ['L015', 'burned in the field', 'var(--fire)'],
      ['L016', 'chipped and left', 'var(--f-olive)'],
      ['L017', 'undeclared, other', 'hatch'],
      ['L018', 'firewood', 'var(--f-manure)'],
      ['L019', 'sold or delivered', 'var(--p-power)']
    ];
    /* partner: 100 branches leave one pile and settle where they go today */
    const PT = {};
    function partnerInit(svg) {
      svg.setAttribute('viewBox', '0 0 860 560');
      const D = [
        { id: 'L015', name: 'burned in the field', col: 'var(--fire)', x: 60, cols: 10 },
        { id: 'L016', name: 'chipped and left', col: '#8a6a45', x: 300, cols: 10, chip: 1 },
        { id: 'L017', name: 'undeclared', col: '#636366', x: 560, cols: 2 },
        { id: 'L018', name: 'firewood', col: 'var(--f-manure)', x: 652, cols: 5 },
        { id: 'L019', name: 'sold', col: 'var(--p-power)', x: 792, cols: 1 }
      ];
      let left = 100; D.forEach((d, i) => { d.n = i < D.length - 1 ? Math.round(R.num(d.id) * 100) : 0; });
      D[D.length - 1].n = 100 - D.slice(0, -1).reduce((a, d) => a + d.n, 0);
      const base = 330, pitch = 22, rowH = 9, rnd = R.rand(41);
      S('text', { x: 430, y: 34, 'text-anchor': 'middle', class: 'lbl', style: 'font-weight:600', text: 'One tonne of olive prunings, drawn as 100 branches' }, svg);
      PT.sticks = []; const order = [];
      D.forEach((d, di) => { for (let j = 0; j < d.n; j++) {
        const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd());
        const sx = 430 + Math.cos(a) * 150 * rr, sy = 105 + Math.sin(a) * 42 * rr, sr = (rnd() - .5) * 160;
        const tx = d.x + (j % d.cols) * pitch + 2, ty = base - 6 - Math.floor(j / d.cols) * rowH;
        const tr = d.chip ? (rnd() - .5) * 70 : 0;
        const g = S('g', null, svg);
        const r = S('rect', { x: -9, y: -2, width: 18, height: 4, rx: 2, class: 'pb-st', style: 'fill:#c9b07a' }, g);
        const o = { g, r, sx, sy, sr, tx: tx + 9, ty, tr, col: d.col, sc: d.chip ? .55 : 1, landed: false };
        PT.sticks.push(o); order.push(o);
      } });
      for (let i = order.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [order[i], order[k]] = [order[k], order[i]]; }
      order.forEach((o, i) => { o.t0 = .06 + i * .0026; });
      S('line', { x1: 50, y1: base, x2: 810, y2: base, style: 'stroke:var(--line);stroke-width:1' }, svg);
      PT.flame = S('g', { class: 'pb-flame' }, svg);
      [[-60, .62], [0, .86], [60, .66], [-30, .56], [30, .6]].forEach(([dx, k]) => S('path', { d: `M${170 + dx},${base - 52} c${-14 * k},${-24 * k} ${6 * k},${-34 * k} 0,${-62 * k} c${24 * k},${27 * k} ${19 * k},${46 * k} 0,${62 * k}z`, style: 'fill:url(#pbfl)' }, PT.flame));
      const defs = S('defs', null, svg), lg = S('linearGradient', { id: 'pbfl', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
      S('stop', { offset: '0', 'stop-color': '#ff6b2a' }, lg); S('stop', { offset: '1', 'stop-color': '#ffd27a', 'stop-opacity': '.5' }, lg);
      PT.labels = S('g', null, svg);
      const LW = [[60, 220], [300, 220], [552, 96], [652, 120], [770, 90]];
      D.forEach((d, i) => {
        const extra = d.id === 'L017' ? `<br>${R.noinfo('carbon: NO INFO')}` : '';
        fo(PT.labels, LW[i][0], base + 10, LW[i][1], 112, `<span class="fo-s">${d.name}</span><br>${R.N(d.id, { unit: '' })}${extra}`);
      });
      PT.bracket = S('g', null, svg);
      const c1 = 60, c2 = 606, m1 = 646, m2 = 816, by = 212;
      S('path', { d: `M${c1},${by + 8} L${c1},${by} L${c2},${by} L${c2},${by + 8}`, style: 'fill:none;stroke:var(--ink);stroke-width:1.6' }, PT.bracket);
      S('path', { d: `M${m1},${by + 8} L${m1},${by} L${m2},${by} L${m2},${by + 8}`, style: 'fill:none;stroke:var(--muted);stroke-width:1.6' }, PT.bracket);
      fo(PT.bracket, 310, by - 46, 290, 44, `<span style="display:block;text-align:right"><strong>Contestable</strong> ${R.N('L020', { part: 0, unit: '' })}</span>`);
      fo(PT.bracket, m1 - 20, by - 46, 230, 44, `<strong>Committed</strong> ${R.N('L020', { part: 1, unit: '' })}`);
      PT.multi = S('g', null, svg);
      S('text', { x: 60, y: 468, class: 'lbl', style: 'font-weight:600', text: 'Burned today, other prunings (out of 20 branches)' }, PT.multi);
      fo(PT.multi, 422, 452, 200, 30, R.chipHTML('L021'));
      const M = [['Vine', 0, '--f-vine'], ['Fruit', 1, '--f-fruit'], ['Almond and pistachio', 2, '--f-fruit'], ['Walnut and hazelnut', 3, '--f-fruit']];
      M.forEach(([name, part], i) => {
        const yy = 490 + i * 20, k = Math.round(R.num('L021', part) * 20);
        S('text', { x: 60, y: yy + 5, class: 'lbl-s', style: 'font-size:14px', text: name }, PT.multi);
        for (let j = 0; j < 20; j++) S('rect', { x: 240 + j * 22, y: yy - 2, width: 18, height: 5, rx: 2.5, style: `fill:${j < k ? 'var(--fire)' : '#3a3a3c'}` }, PT.multi);
        S('text', { x: 690, y: yy + 5, class: 'lbl-s num', style: 'font-size:14px;fill:var(--ink)', text: R.part('L021', part) }, PT.multi);
      });
    }
    function partnerUpdate(p) {
      PT.sticks.forEach(o => {
        const t = R.ease(R.seg(p, o.t0, o.t0 + .14));
        const x = o.sx + (o.tx - o.sx) * t, y = o.sy + (o.ty - o.sy) * t - Math.sin(Math.PI * t) * 60;
        const rot = o.sr + (o.tr - o.sr) * t, sc = 1 + (o.sc - 1) * R.seg(t, .7, 1);
        o.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${sc.toFixed(2)} 1)`);
        const land = t > .92; if (land !== o.landed) { o.landed = land; o.r.style.fill = land ? o.col : '#c9b07a'; }
      });
      PT.flame.style.opacity = R.seg(p, .48, .56);
      PT.labels.style.opacity = R.seg(p, .42, .52);
      PT.bracket.style.opacity = R.seg(p, .56, .64);
      PT.multi.style.opacity = R.seg(p, .68, .78);
    }
    R.scene('s08', {
      init(svg) {
        if (R.isPartner) return partnerInit(svg);
        svg.setAttribute('viewBox', '0 0 860 560');
        const hatch = R.hatch(svg, 's08h');
        const x0 = 60, W = 740, y = 150, h = 56;
        block = S('g', null, svg);
        pile(block, 430, y + h, 200, 80, 'var(--f-olive)', 12, 80);
        let x = x0;
        F.forEach(([id, name, col], i) => {
          const w = W * R.num(id);
          const r = S('rect', { x, y, width: Math.max(w, 1.5), height: h, style: `fill:${col === 'hatch' ? hatch : col};stroke:var(--ground);stroke-width:1.5` }, svg);
          slices.push({ r, x, w });
          x += w;
        });
        labelsG = S('g', null, svg);
        const colW = W / 5;
        F.forEach(([id, name], i) => {
          const s = slices[i], lx = x0 + i * colW + 6, ly = y + h + 60;
          S('path', { d: `M${s.x + s.w / 2},${y + h + 2} L${s.x + s.w / 2},${y + h + 26} L${lx + 8},${ly - 6}`, style: 'fill:none;stroke:var(--muted);stroke-width:1' }, labelsG);
          const extra = id === 'L017' ? `<br>${R.noinfo('carbon: NO INFO')}` : '';
          fo(labelsG, lx, ly, colW - 6, 110, `<span class="fo-s">${name}</span><br>${R.N(id, { unit: '' })}${extra}`);
        });
        bracket = S('g', null, svg);
        const c1 = slices[0].x, c2 = slices[2].x + slices[2].w, m2 = slices[4].x + slices[4].w;
        S('path', { d: `M${c1},${y - 10} L${c1},${y - 22} L${c2 - 2},${y - 22} L${c2 - 2},${y - 10}`, style: 'fill:none;stroke:var(--ink);stroke-width:1.6' }, bracket);
        S('path', { d: `M${c2 + 2},${y - 10} L${c2 + 2},${y - 22} L${m2},${y - 22} L${m2},${y - 10}`, style: 'fill:none;stroke:var(--muted);stroke-width:1.6' }, bracket);
        fo(bracket, c1, y - 96, 420, 70, `<strong>Contestable</strong> ${R.N('L020', { part: 0, unit: '' })}`);
        fo(bracket, c2 - 160, y - 96, 240, 70, `<span style="display:block;text-align:right"><strong>Committed</strong> ${R.N('L020', { part: 1, unit: '' })}</span>`);
        multi = S('g', null, svg);
        const M = [['vine', 'Vine', 0, '--f-vine'], ['fruit', 'Fruit', 1, '--f-fruit'], ['almond', 'Almond and pistachio', 2, '--f-fruit'], ['walnut', 'Walnut and hazelnut', 3, '--f-fruit']];
        S('text', { x: x0, y: 420, class: 'lbl', style: 'font-weight:600', text: 'Burned share today, other prunings' }, multi);
        fo(multi, x0 + 300, 400, 300, 30, R.chipHTML('L021'));
        M.forEach(([k, name, part, v], i) => {
          const yy = 440 + i * 28, val = R.num('L021', part);
          S('text', { x: x0, y: yy + 15, class: 'lbl-s', style: 'font-size:15px', text: name }, multi);
          S('rect', { x: x0 + 190, y: yy, width: 400, height: 18, style: 'fill:var(--ground-2)' }, multi);
          S('rect', { x: x0 + 190, y: yy, width: 400 * val, height: 18, style: `fill:var(${v})` }, multi);
          S('text', { x: x0 + 196 + 400 * val, y: yy + 14, class: 'lbl-s num', style: 'font-size:15px;fill:var(--ink)', text: R.part('L021', part) }, multi);
        });
      },
      update(p) {
        if (R.isPartner) return partnerUpdate(p);
        const split = R.ease(R.seg(p, .05, .3));
        block.style.opacity = 1 - split;
        slices.forEach((s, i) => { s.r.style.opacity = R.seg(p, .1 + i * .04, .25 + i * .04); });
        labelsG.style.opacity = R.seg(p, .3, .42);
        bracket.style.opacity = R.seg(p, .45, .55);
        multi.style.opacity = R.seg(p, .62, .74);
      }
    });
  })();

  /* ======================= S09 Same tonne, opposite sign ======================= */
  // Two identical tonnes, two histories. Collect both and the climate result has opposite signs.
  (function () {
    const st = {};
    R.scene('s09', {
      init(svg) {
        svg.setAttribute('viewBox', '0 0 900 600');
        const burn = R.num('L022'), left = R.num('L025', 0), soil = R.num('L023'), n2o = R.num('L024');
        const tile = (x, title, sub, col) => {
          const g = S('g', null, svg);
          S('rect', { x, y: 10, width: 420, height: 470, rx: 26, style: 'fill:#111113;stroke:#2c2c2e' }, g);
          S('text', { x: x + 28, y: 50, style: 'font-size:13px;font-weight:700;letter-spacing:.06em;fill:var(--muted)', text: 'WAS GOING TO BE' }, g);
          S('text', { x: x + 28, y: 82, style: `font-size:28px;font-weight:700;letter-spacing:-.02em;fill:${col}`, text: title }, g);
          S('text', { x: x + 28, y: 106, style: 'font-size:14px;fill:var(--ink-2)', text: sub }, g);
          return g;
        };
        // ---- left: burned in the field ----
        st.L = tile(20, 'Burned in the field', 'Open burning releases methane and nitrous oxide', 'var(--fire)');
        const gx = 230, gy = 270;
        st.pileL = pile(svg, gx, gy, 200, 60, 'var(--f-olive)', 31, 80);
        st.fire = S('g', null, svg);
        [[-40, 0, 1], [0, -18, 1.25], [40, 0, 1], [-18, 8, .9], [20, 6, .9]].forEach(([dx, dy, k]) => S('path', { d: `M${gx + dx},${gy - 20 + dy} c${-18 * k},${-30 * k} ${8 * k},${-42 * k} 0,${-78 * k} c${30 * k},${34 * k} ${24 * k},${58 * k} 0,${78 * k}z`, style: 'fill:url(#s09flame)' }, st.fire));
        const defs = S('defs', null, svg); const lg = S('linearGradient', { id: 's09flame', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
        S('stop', { offset: '0', 'stop-color': '#ff6b2a' }, lg); S('stop', { offset: '1', 'stop-color': '#ffd27a', 'stop-opacity': '.6' }, lg);
        st.gas = []; const rnd = R.rand(7);
        for (let i = 0; i < 8; i++) {
          const g = S('g', null, svg), x = 130 + rnd() * 200, y = 130 + rnd() * 50;
          S('circle', { cx: x, cy: y, r: 17, style: 'fill:#2a1b14;stroke:var(--fire);stroke-width:1.5' }, g);
          S('text', { x, y: y + 5, 'text-anchor': 'middle', style: 'font-size:12px;font-weight:700;fill:var(--fire)', text: i % 3 ? 'CH4' : 'N2O' }, g);
          st.gas.push(g);
        }
        // ---- right: chipped and left on the soil ----
        st.Rt = tile(460, 'Chipped and left', 'Chips feed soil carbon as they rot', 'var(--warn)');
        S('rect', { x: 490, y: 250, width: 360, height: 90, rx: 10, style: 'fill:#5a4030' }, svg);
        st.chips = S('g', null, svg);
        for (let i = 0; i < 70; i++) { const x = 500 + rnd() * 340, y = 238 + rnd() * 10; S('rect', { x, y, width: 7 + rnd() * 8, height: 4, rx: 1.5, transform: `rotate(${((rnd() - .5) * 40).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`, style: 'fill:#c9b07a' }, st.chips); }
        st.cdots = [];
        for (let i = 0; i < 18; i++) st.cdots.push(S('circle', { cx: 505 + rnd() * 330, cy: 262 + rnd() * 66, r: 4, style: 'fill:#1a1a1a;stroke:#d8d2c8;stroke-width:1' }, svg));
        S('text', { x: 840, y: 334, 'text-anchor': 'end', style: 'font-size:12px;fill:#e8d8c0', text: 'soil carbon' }, svg);
        // ---- the action, shared ----
        st.act = S('g', null, svg);
        S('rect', { x: 330, y: 362, width: 240, height: 40, rx: 20, style: 'fill:#f5f5f7' }, st.act);
        S('text', { x: 450, y: 388, 'text-anchor': 'middle', style: 'font-size:16px;font-weight:700;fill:#000', text: 'RAMOS collects the tonne' }, st.act);
        // ---- results ----
        const res = (x, v, col, line1, line2) => {
          const g = S('g', null, svg);
          S('text', { x: x + 28, y: 452, style: `font-size:56px;font-weight:800;letter-spacing:-.04em;fill:${col}`, text: (v > 0 ? '+' : '−') + Math.abs(Math.round(v)) }, g);
          S('text', { x: x + 28 + (String(Math.abs(Math.round(v))).length + 1) * 33, y: 438, style: 'font-size:13px;fill:var(--ink-2)', text: 'kg CO2e' }, g);
          S('text', { x: x + 28 + (String(Math.abs(Math.round(v))).length + 1) * 33, y: 455, style: 'font-size:13px;fill:var(--ink-2)', text: 'per t dry matter' }, g);
          fo(g, x + 24, 460, 380, 30, `<span class="fo-xs">${line1}</span>`);
          return g;
        };
        st.rL = res(20, burn, 'var(--good)', `fire gases avoided ${R.chipHTML('L022')}`);
        st.rR = res(460, left, 'var(--warn)', `soil ${R.N('L023', { unit: '', nochip: true })}, soil N2O ${R.N('L024', { unit: '', nochip: true })}, 100 yr ${R.chipHTML('L025')}`);
        // ---- punchline ----
        const avg = (burn + left) / 2;
        st.punch = fo(svg, 20, 500, 860, 96, `<div style="font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1.2">Same truck, same wood, <span style="color:var(--good)">opposite sign</span>.</div><div class="fo-s" style="margin-top:4px">Averaged, the two would read about ${avg > 0 ? '+' : ''}${avg.toFixed(0)} kg, which hides both. RAMOS keeps each tonne's own history.</div>`);
      },
      update(p) {
        const col = R.ease(R.seg(p, .22, .4));
        st.act.style.opacity = R.seg(p, .14, .22);
        st.act.style.transform = `translateY(${(-6 * (1 - R.seg(p, .14, .22))).toFixed(1)}px)`;
        // left: fire dies, gas molecules fade and are crossed out
        st.fire.style.opacity = 1 - col;
        st.pileL.style.opacity = 1 - col * .85;
        st.gas.forEach((g, i) => { g.style.opacity = 1 - R.clamp(col * 1.4 - i * .05); g.style.transform = `translateY(${(-col * 30).toFixed(1)}px)`; });
        // right: chips lift away, the soil carbon they would have fed fades
        st.chips.style.transform = `translateY(${(-60 * col).toFixed(1)}px)`; st.chips.style.opacity = 1 - col;
        st.cdots.forEach((d, i) => d.style.opacity = 1 - R.clamp(col * 1.5 - (i % 6) * .08) * .85);
        st.rL.style.opacity = R.seg(p, .42, .52); st.rR.style.opacity = R.seg(p, .5, .6);
        st.punch.style.opacity = R.seg(p, .66, .76);
      }
    });
  })();

  /* ======================= S10 How much may be taken ======================= */
  // One hectare of prunings, cut down step by step by each limit; then the map shows where the hard limits fall.
  (function () {
    const st = {};
    R.scene('s10', {
      data: ['cluster'],
      init(svg) {
        const C = D.cluster;
        svg.setAttribute('viewBox', `0 0 ${C.W} ${C.H}`);
        svg.classList.add('clscale');
        const hatch = R.hatch(svg, 's10h', 'var(--f-forest)');
        // ---- phase A: one hectare, step by step ----
        const A = st.A = S('svg', { x: 0, y: 0, width: C.W, height: C.H, viewBox: '0 0 860 620', class: 'nest' }, svg);
        const arise = R.num('L097'), soil = R.num('L100'), reach = R.num('L033');
        const afterSoil = arise * soil, afterReach = afterSoil * reach;
        st.v = { arise, afterSoil, afterReach };
        const X0 = 40, W = 780, K = W / arise, Y = 150, H = 70;
        st.K = K; st.X0 = X0; st.Y = Y; st.H = H;
        S('text', { x: X0, y: 40, style: 'font-size:22px;font-weight:700;letter-spacing:-.02em;fill:var(--ink)', text: 'One hectare of olive prunings, a traditional grove' }, A);
        st.headNum = fo(A, X0, 54, 780, 80, '');
        // the pile as a bar, with the slices that each limit keeps on the ground
        S('rect', { x: X0, y: Y, width: W, height: H, rx: 14, style: 'fill:#1c1c1e' }, A);
        st.bar = S('rect', { x: X0, y: Y, width: W, height: H, rx: 14, style: 'fill:var(--f-olive)' }, A);
        st.sSoil = S('rect', { x: X0 + afterSoil * K, y: Y, width: (arise - afterSoil) * K, height: H, rx: 14, style: 'fill:#7a5a3a;opacity:0' }, A);
        st.sReach = S('rect', { x: X0 + afterReach * K, y: Y, width: (afterSoil - afterReach) * K, height: H, rx: 14, style: 'fill:#5a5a5e;opacity:0' }, A);
        // step cards
        const card = (y, n, title, html, col) => {
          const g = S('g', { style: 'opacity:0' }, A);
          S('circle', { cx: X0 + 18, cy: y + 18, r: 18, style: `fill:${col}` }, g);
          S('text', { x: X0 + 18, y: y + 25, 'text-anchor': 'middle', style: 'font-size:19px;font-weight:800;fill:#000', text: n }, g);
          fo(g, X0 + 50, y - 2, 730, 80, `<div style="font-size:20px;font-weight:700;color:var(--ink)">${title}</div><span class="fo-s">${html}</span>`);
          return g;
        };
        st.c1 = card(262, '1', 'The soil keeps its share', `On flat ground in the Centro, ${R.N('L100', { unit: '' })} of the prunings may leave. The rest feeds the soil.`, '#c99a68');
        st.c2 = card(352, '2', 'Machines cannot reach everything', `Technical recovery ${R.N('L033', { unit: '' })}: a quarter stays where the crew cannot work.`, '#a1a1a6');
        st.c3 = card(442, '3', 'Some land keeps everything', `Steep ground (${R.part('L030')}) keeps all of it ${R.N('L101', { unit: '' })}. Protected areas: no collection at all.`, 'var(--good)');
        st.c3.dataset.k = 1;
        S('text', { x: X0 + afterSoil * K, y: Y + H + 22, 'text-anchor': 'middle', style: 'font-size:13px;fill:var(--muted)', text: 'soil' }, A);
        // ---- phase B: where the hard limits fall ----
        const B = st.B = S('g', { style: 'opacity:0' }, svg);
        S('image', { href: 'cluster_hillshade.jpg', x: 0, y: 0, width: C.W, height: C.H, preserveAspectRatio: 'none', style: 'opacity:.55' }, B);
        st.steep = S('image', { href: 'cluster_steep.png', x: 0, y: 0, width: C.W, height: C.H, preserveAspectRatio: 'none', style: 'opacity:0' }, B);
        st.prot = S('g', { style: 'opacity:0' }, B);
        C.protected.forEach(pa => S('path', { d: pa.d, style: `fill:${hatch};stroke:var(--f-forest);stroke-width:1.5` }, st.prot));
        C.munis.forEach(m => {
          S('path', { d: m.d, style: 'fill:none;stroke:var(--ink);stroke-width:1.4;opacity:.7' }, B);
          S('text', { x: m.x, y: m.y, 'text-anchor': 'middle', style: 'font-size:22px;font-weight:600;paint-order:stroke;stroke:#000;stroke-width:4;fill:var(--ink)', text: m.name }, B);
        });
        const lx = 40, ly = C.H - 150;
        const leg = S('g', null, B);
        S('rect', { x: lx, y: ly, width: 560, height: 130, rx: 20, style: 'fill:rgb(22 22 24 / .88);stroke:#3a3a3c' }, leg);
        S('text', { x: lx + 24, y: ly + 36, style: 'font-size:22px;font-weight:700;fill:var(--ink)', text: 'On the map: where the hard limits fall' }, leg);
        st.l1 = S('g', null, leg); S('rect', { x: lx + 24, y: ly + 58, width: 26, height: 20, rx: 4, style: 'fill:#d85a3a' }, st.l1); S('text', { x: lx + 60, y: ly + 75, style: 'font-size:19px;fill:var(--ink)', text: 'steep, above 25 % slope: keeps everything' }, st.l1);
        st.l2 = S('g', null, leg); S('rect', { x: lx + 24, y: ly + 92, width: 26, height: 20, rx: 4, style: `fill:${hatch};stroke:var(--f-forest)` }, st.l2); S('text', { x: lx + 60, y: ly + 109, style: 'font-size:19px;fill:var(--ink)', text: 'protected: no collection' }, st.l2);
      },
      update(p) {
        if (R.isPartner) p = Math.min(.42, p * .5);   // partner: the one-hectare design only, no map
        const v = st.v, K = st.K;
        const s1 = R.ease(R.seg(p, .08, .16)), s2 = R.ease(R.seg(p, .2, .28));
        // the bar shrinks as each slice drops to the ground and turns its own colour
        const left = R.lerp(R.lerp(v.arise, v.afterSoil, s1), v.afterReach, s2);
        st.bar.setAttribute('width', (left * K).toFixed(1));
        st.sSoil.style.opacity = s1; st.sSoil.setAttribute('y', st.Y + s1 * 6);
        st.sReach.style.opacity = s2; st.sReach.setAttribute('y', st.Y + s2 * 6);
        st.c1.style.opacity = R.seg(p, .05, .1); st.c2.style.opacity = R.seg(p, .18, .23); st.c3.style.opacity = R.seg(p, .3, .35);
        const html = `<div style="font-size:56px;font-weight:800;letter-spacing:-.04em;line-height:1;color:${s2 > .9 ? 'var(--good)' : 'var(--ink)'}">${left.toFixed(2)} <span style="font-size:20px;font-weight:600;color:var(--ink-2)">t DM/ha ${s2 > .9 ? 'can leave the field' : s1 > .02 ? 'left' : 'arises'}</span></div>`;
        if (st.lastH !== html) { st.lastH = html; st.headNum.firstChild.innerHTML = html; }
        const sw = R.seg(p, .44, .52);
        st.A.style.opacity = 1 - sw; st.B.style.opacity = sw;
        const k1 = R.seg(p, .56, .64), k2 = R.seg(p, .72, .8);
        st.steep.style.opacity = .75 * k1; st.prot.style.opacity = k2;
        st.l1.style.opacity = .3 + .7 * k1; st.l2.style.opacity = .3 + .7 * k2;
      }
    });
  })();
})();
