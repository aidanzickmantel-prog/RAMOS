/* RAMOS story site: core (scroll engine, numbers, method panel, navigation) */
(function () {
  'use strict';
  const CFG = window.RAMOS_CONFIG || { EDITION: 'committee', RENDERS: {} };
  const EDITION = ['public', 'partner'].includes(CFG.EDITION) ? CFG.EDITION : 'committee';
  const D = (window.RAMOS_DATA = window.RAMOS_DATA || {});
  const LEDGER = D.ledger || {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NS = 'http://www.w3.org/2000/svg';

  const R = (window.RAMOS = {
    edition: EDITION, isPublic: EDITION === 'public', isPartner: EDITION === 'partner', data: D, ledger: LEDGER,
    reduced: () => reduced.matches, scenes: {}
  });

  /* ---------------- helpers ---------------- */
  R.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  R.seg = (p, a, b) => R.clamp((p - a) / (b - a));           // sub-progress of p in [a,b]
  R.ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  R.lerp = (a, b, t) => a + (b - a) * t;
  R.rand = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

  R.svg = function (tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined) continue;
      if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v);
    }
    if (parent) parent.appendChild(el);
    return el;
  };
  R.html = function (tag, attrs, parent) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(el);
    return el;
  };
  R.fo = function (parent, x, y, w, h, html) {     // HTML inside SVG (for chips)
    const f = R.svg('foreignObject', { x, y, width: w, height: h }, parent);
    const div = document.createElement('div');
    div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    div.className = 'fo';
    div.innerHTML = html;
    f.appendChild(div);
    return f;
  };
  R.hatch = function (svg, id, color) {
    const defs = svg.querySelector('defs') || R.svg('defs', null, svg);
    const p = R.svg('pattern', { id, width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    R.svg('line', { x1: 0, y1: 0, x2: 0, y2: 7, style: `stroke:${color || 'var(--hatch)'};stroke-width:1.4` }, p);
    return `url(#${id})`;
  };

  /* ---------------- ledger numbers ---------------- */
  const NUM_RE = /[−+-]?\d[\d,]*(?:\.\d+)?/g;
  R.row = function (id) {
    const r = LEDGER[id];
    if (!r) console.warn('[RAMOS] ledger id not available in this edition:', id);
    return r;
  };
  R.part = function (id, part) {
    const r = R.row(id); if (!r) return null;
    if (part === undefined || part === null || part === '') return r.value;
    const m = r.value.match(NUM_RE);
    return m && m[+part] !== undefined ? m[+part] : r.value;
  };
  R.num = function (id, part) {           // numeric value of a ledger entry or part
    const v = R.part(id, part);
    return v === null ? NaN : parseFloat(String(v).replace(/,/g, '').replace('−', '-'));
  };
  R.chips = function (r) {
    if (!r) return [];
    const s = (r.status || '').toLowerCase();
    const flag = (r.public_flag || '').toLowerCase();
    const out = [];
    if (s.startsWith('superseded') || flag.startsWith('do not show') || s.includes('withdrawn')) return [['withdrawn', 'withdrawn']];
    if (s.startsWith('submitted paper')) return [['prov', 'paper under review']];
    if (s.startsWith('illustrative')) {
      out.push(['illus', r.status.replace(/\s*\([^)]*\)/g, '')]);
    } else if (s.includes('work in progress')) out.push(['wip', 'work in progress']);
    else if (s.startsWith('decided')) out.push(['decided', s.includes('sensitivity') ? 'decided, sensitivity only' : 'decided']);
    else if (s.startsWith('provisional')) out.push(['prov', 'provisional']);
    else if (!s.startsWith('confirmed')) out.push(['prov', r.status]);
    if (s.includes('under review') || (r.grade || '').toLowerCase().includes('under audit')) out.push(['review', 'under review']);
    return out;
  };
  R.chipHTML = function (id) {
    return R.chips(R.row(id)).map(([c, t]) => `<span class="chip ${c}">${t}</span>`).join('');
  };
  const minus = s => String(s).replace(/(^|\s|\()-(?=\d)/g, '$1−');
  /* The only way a number gets on screen: from the ledger, with its chip. */
  R.N = function (id, opts) {
    opts = opts || {};
    const r = R.row(id);
    if (!r) return `<span class="noinfo" title="${id} not in this edition">NO INFO</span>`;
    const v = minus(R.part(id, opts.part));
    const unit = opts.unit !== undefined ? opts.unit : r.unit;
    const tip = `${id} · ${r.what}${r.grade ? ' · grade ' + r.grade : ''}`;
    const long = (String(v) + unit).length > 34 ? ' long' : '';
    return `<span class="n${long}" data-lid="${id}" title="${tip.replace(/"/g, '&quot;')}"><span class="vu"><span class="v">${v}</span>${unit ? ' <span class="u">' + unit + '</span>' : ''}</span>${opts.nochip ? '' : R.chipHTML(id)}</span>`;
  };
  /* olive zones: share of the biochar pool that pays for its feedstock at each observed CDR price (L126, engine cache 21 Nov) */
  R.cdrRungs = function () {
    const prices = [108, 130, 152.62, 155];
    return prices.map((p, i) => ({ price: p, share: R.num('L126', i) }));
  };
  R.noinfo = (label) => `<span class="noinfo" title="No reliable value exists">${label || 'NO INFO'}</span>`;
  function fillNumbers(root) {
    root.querySelectorAll('[data-l]').forEach(el => {
      const o = {};
      if (el.dataset.part !== undefined) o.part = el.dataset.part;
      if (el.dataset.unit !== undefined) o.unit = el.dataset.unit;
      el.outerHTML = R.N(el.dataset.l, o);
    });
  }

  /* ---------------- feedstocks ---------------- */
  R.FEEDS = [
    { k: 'forest', name: 'Forest residues', v: '--f-forest', ico: 'M10 2 L15 9 H12 L16 14 H11 V18 H9 V14 H4 L8 9 H5 Z' },
    { k: 'olive', name: 'Olive prunings', v: '--f-olive', ico: 'M3 17 C7 12 11 8 17 3 M7 12 C5 10 5 8 6 7 C8 8 8 10 7 12 M11 8 C11 5 13 4 14 4 C14 6 13 8 11 8 M10 11 C13 10 15 11 16 12 C14 13 12 13 10 11' },
    { k: 'vine', name: 'Vine prunings', v: '--f-vine', ico: 'M4 18 C6 13 6 8 10 5 C13 3 16 4 16 7 C16 9 14 10 12 9 M10 5 C9 3 10 2 11 2' },
    { k: 'straw', name: 'Cereal straw', v: '--f-straw', ico: 'M3 7 H17 V15 H3 Z M3 11 H17 M7 7 V15 M13 7 V15' },
    { k: 'fruit', name: 'Fruit and nut prunings', v: '--f-fruit', ico: 'M4 17 L14 5 M9 11 L14 12 M14 5 C16 6 17 8 16 10 C14 10 13 8 14 5 M6 9 A2.5 2.5 0 1 0 6.01 9' },
    { k: 'food', name: 'Municipal food waste', v: '--f-food', ico: 'M3 10 H17 C17 14 14 17 10 17 C6 17 3 14 3 10 Z M7 7 C7 5 9 5 9 3 M12 7 C12 5 14 5 14 3' },
    { k: 'manure', name: 'Manure', v: '--f-manure', ico: 'M3 16 C3 12 6 11 8 11 C8 8 11 7 12 8 C14 8 16 10 15 12 C17 12 18 14 17 16 Z' }
  ];
  R.feedIcon = function (f, size) {
    return `<svg class="feed-ico" viewBox="0 0 20 20" width="${size || 20}" height="${size || 20}" aria-hidden="true"><path d="${f.ico}" style="fill:none;stroke:var(${f.v});stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"/></svg>`;
  };
  R.feedGlyph = function (parent, f, x, y, s) {
    const g = R.svg('g', { transform: `translate(${x},${y}) scale(${(s || 20) / 20})`, 'aria-hidden': 'true' }, parent);
    R.svg('path', { d: f.ico, style: `fill:none;stroke:var(${f.v});stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round` }, g);
    return g;
  };

  /* ---------------- data loading ---------------- */
  const loading = {};
  R.load = function (names) {
    return Promise.all((names || []).map(n => {
      if (D[n]) return Promise.resolve();
      if (!loading[n]) loading[n] = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = n + '.js';
        s.onload = res; s.onerror = () => { console.error('[RAMOS] failed to load', n); rej(n); };
        document.head.appendChild(s);
      });
      return loading[n];
    }));
  };

  /* ---------------- scene registry & scroll engine ---------------- */
  const sections = [];
  R.scene = function (id, def) { R.scenes[id] = def; };

  function sizeScenes() {
    const vh = window.innerHeight;
    sections.forEach(s => { s.el.style.height = Math.round((parseFloat(s.el.dataset.len) || 2) * vh) + 'px'; });
  }
  function progress(s) {
    const vh = window.innerHeight;
    const top = s.el.offsetTop, h = s.el.offsetHeight;
    return R.clamp((window.scrollY - top) / Math.max(1, h - vh));
  }
  function ensureInit(s) {
    if (s.state) return;
    const def = R.scenes[s.id];
    if (!def) { s.state = 'none'; return; }
    s.state = 'loading';
    R.load(def.data).then(() => {
      const svg = s.el.querySelector('svg.viz');
      if (svg && s.alt) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', s.alt); }
      try { def.init && def.init(svg, s.el); } catch (e) { console.error('[RAMOS] init', s.id, e); }
      setupRender(s);
      s.state = 'ready';
      s.last = -1;
      tick();
    }).catch(() => { s.state = 'failed'; });
  }
  function setupRender(s) {
    const key = s.stage && s.stage.dataset.render;
    const spec = key && CFG.RENDERS && CFG.RENDERS[key];
    if (!spec || !spec.frames) return;
    const fig = s.stage.querySelector('figure');
    const svg = fig.querySelector('svg.viz');
    const img = R.html('img', { alt: spec.alt || s.alt || '', class: 'render', style: 'width:100%;height:100%;object-fit:contain' });
    fig.insertBefore(img, svg);
    svg.style.display = 'none';
    s.render = { img, spec };
  }
  function drawRender(s, p) {
    const { img, spec } = s.render;
    const i = Math.min(spec.count - 1, Math.round(p * (spec.count - 1)));
    const src = spec.frames + String(i).padStart(3, '0') + (spec.ext || '.webp');
    if (img.getAttribute('src') !== src) img.src = src;
  }

  let ticking = false, live = false;
  function tick() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(frame);
  }
  function frame(t) {
    ticking = false;
    const vh = window.innerHeight, y = window.scrollY;
    let anyLive = false, activeIdx = 0;
    sections.forEach((s, i) => {
      const top = s.el.offsetTop, bot = top + s.el.offsetHeight;
      if (y + 5 >= top) activeIdx = i;
      const near = bot > y - vh * 1.5 && top < y + vh * 2.5;
      if (near) ensureInit(s);
      const visible = bot > y && top < y + vh;
      if (visible && s.state === 'ready') {
        const def = R.scenes[s.id];
        let p = progress(s);
        if (reduced.matches) p = 1;
        if (s.render) drawRender(s, p);
        else if (def.update && (p !== s.last || def.live)) {
          try { def.update(p, t || 0); } catch (e) { console.error('[RAMOS] update', s.id, e); }
        }
        s.last = p;
        if (def.live && !reduced.matches) anyLive = true;
      }
    });
    // preload data of the next two scenes
    for (let k = activeIdx + 1; k <= activeIdx + 2 && k < sections.length; k++) {
      const def = R.scenes[sections[k].id]; if (def && def.data) R.load(def.data).catch(() => {});
    }
    updateRail(activeIdx);
    if (anyLive) { live = true; tick(); } else live = false;
  }

  /* ---------------- rail ---------------- */
  const ACTS = ['Why', 'Portugal', 'The parcel', 'Collection', 'The plant on the map', 'Inside the plants', R.isPartner ? 'End use and impacts' : 'Competition and end use', 'What it is for'];
  let railLinks = [];
  function buildRail() {
    const rail = document.getElementById('rail');
    ACTS.forEach((name, a) => {
      const first = sections.find(s => s.act === a);
      if (!first) return;
      const n = sections.filter(s => s.act === a).length;
      const link = R.html('a', { href: '#' + first.id, style: `flex:${n}` }, rail);
      R.html('i', { class: 'fill' }, link);
      R.html('span', { text: `Act ${a} · ${name}` }, link);
      link.addEventListener('click', e => { e.preventDefault(); goTo(sections.indexOf(first)); });
      railLinks.push({ link, act: a });
    });
  }
  const STAGES = [['map', 'Map'], ['arising', 'Arising'], ['today', 'Today'], ['limits', 'Limits'], ['collection', 'Collection'], ['plants', 'Plants'], ['competition', 'Competition'], ['enduse', 'End use'], ['impacts', 'Impacts'], ['uses', 'Uses']];
  let chainLinks = [];
  function buildChain() {
    const nav = document.getElementById('chain'); if (!nav) return;
    let shown = 0;
    STAGES.forEach(([k, name], i) => {
      const first = sections.find(s => s.el.dataset.stage === k && getComputedStyle(s.el).display !== 'none');
      if (!first && R.isPartner) return;
      if (shown++) R.html('i', { 'aria-hidden': 'true' }, nav);
      const a = R.html('a', { href: first ? '#' + first.id : '#', text: name }, nav);
      a.addEventListener('click', e => { e.preventDefault(); if (first) goTo(sections.indexOf(first)); });
      chainLinks.push([k, a]);
    });
  }
  function updateChain(idx) {
    const st = sections[idx] && sections[idx].el.dataset.stage;
    const si = STAGES.findIndex(x => x[0] === st);
    const nav = document.getElementById('chain');
    if (nav) nav.style.opacity = st ? 1 : 0;
    chainLinks.forEach(([k, a], i) => {
      a.classList.toggle('done', st === 'all' || (si >= 0 && STAGES.findIndex(x => x[0] === k) < si));
      if (k === st || st === 'all') a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
  }
  function updateRail(idx) {
    updateChain(idx);
    const s = sections[idx]; if (!s) return;
    document.body.classList.toggle('on-night', s.el.classList.contains('night'));
    const mobile = window.innerWidth <= 820;
    railLinks.forEach(({ link, act }) => {
      const inAct = sections.filter(x => x.act === act);
      const startY = inAct[0].el.offsetTop;
      const last = inAct[inAct.length - 1].el;
      const endY = last.offsetTop + last.offsetHeight - window.innerHeight;
      const f = R.clamp((window.scrollY - startY) / Math.max(1, endY - startY));
      const fill = link.firstChild;
      if (mobile) { fill.style.width = (f * 100) + '%'; fill.style.height = '4px'; }
      else { fill.style.height = (f * 100) + '%'; fill.style.width = ''; }
      link.setAttribute('aria-current', act === s.act ? 'true' : 'false');
    });
  }

  /* ---------------- keyboard ---------------- */
  let pending = null;
  function currentIdx() {
    if (pending && performance.now() - pending.t < 1100) return pending.i;
    let idx = 0; const y = window.scrollY;
    sections.forEach((s, i) => { if (y + 5 >= s.el.offsetTop) idx = i; });
    return idx;
  }
  function goTo(i) {
    if (i < 0) i = 0;
    if (i >= sections.length) { document.getElementById('credits').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' }); return; }
    pending = { i, t: performance.now() };
    window.scrollTo({ top: sections[i].el.offsetTop, behavior: reduced.matches ? 'auto' : 'smooth' });
    const h = sections[i].el.querySelector('h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  R.goTo = goTo;
  document.addEventListener('keydown', e => {
    if (methodOpen) {
      if (e.key === 'Escape') { e.preventDefault(); closeMethod(); }
      else if (e.key === 'Tab') trapTab(e);
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    const next = ['ArrowDown', 'PageDown', 'ArrowRight'].includes(e.key);
    const prev = ['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key);
    if (!next && !prev) return;
    e.preventDefault();
    const i = currentIdx();
    const atStart = pending && performance.now() - pending.t < 1100 ? true : Math.abs(window.scrollY - sections[i].el.offsetTop) < 8;
    if (next) goTo(i + 1);
    else goTo(atStart ? i - 1 : i);
  });

  /* ---------------- method panel ---------------- */
  const panel = document.getElementById('method');
  const body = document.getElementById('method-body');
  const scrim = document.getElementById('scrim');
  let methodOpen = false, opener = null;
  const collab = s => String(s).replace(/\[\[([\s\S]*?)\]\]/g, '<span class="collab" data-collab>$1</span>');

  function ledgerRow(id) {
    const r = R.row(id); if (!r) return '';
    const range = r.low || r.high ? ` · range ${minus(r.low || '?')} to ${minus(r.high || '?')}` : '';
    return `<div class="lrow" id="lrow-${id}"><span class="id">${id}</span>${r.what}<br>
      <span class="v"><strong>${minus(r.value)}</strong> ${r.unit}</span>${R.chipHTML(id)}
      <div class="meta">Grade ${r.grade || 'n/a'}${range} · ${r.date}</div>
      ${r.source ? `<div class="meta collab" data-collab>Source: ${r.source}${r.note ? '<br>Note: ' + r.note : ''}</div>` : ''}</div>`;
  }
  function eqBlock(num) {
    const e = (D.equations || {})[num]; if (!e) return '';
    return `<div class="eq"><div class="t">Eq ${num}. ${e.title}</div><div class="st">${e.status}${e.refs ? '<span data-collab>, ' + e.refs.replace(/^[^,]*,?\s*/, '') + '</span>' : ''}</div>
      <pre>${e.formula}</pre>${e.notes && e.notes.length ? '<ul data-collab>' + e.notes.map(n => '<li>' + n + '</li>').join('') + '</ul>' : ''}</div>`;
  }
  function openMethod(id, focusL, btn) {
    const M = (window.RAMOS_METHOD || {})[id] || {};
    const sec = document.getElementById(id);
    const title = sec ? sec.querySelector('h2').textContent : 'Method';
    const ids = new Set(M.ledger || []);
    if (sec) sec.querySelectorAll('[data-lid]').forEach(n => ids.add(n.dataset.lid));
    let h = `<p class="kicker">${sec ? sec.querySelector('.kicker').textContent : ''}</p>`;
    (M.text || []).forEach(t => { h += `<p>${collab(t)}</p>`; });
    if (R.isPublic && M.text && M.text.length) h += '<p><em>Technical references in the methods paper, in preparation.</em></p>';
    if (M.eq && M.eq.length) h += '<h3>Equations</h3>' + M.eq.map(eqBlock).join('');
    if (M.data) h += `<h3>Datasets</h3><p>${collab(M.data)}</p>`;
    if (M.gaps) h += `<h3>Gaps and status</h3><p>${collab(M.gaps)}</p>`;
    const list = [...ids].filter(x => LEDGER[x]).sort();
    if (list.length) h += '<h3>Numbers on this scene</h3>' + list.map(ledgerRow).join('');
    body.innerHTML = h;
    document.getElementById('method-h').textContent = 'Method: ' + title;
    panel.classList.add('open'); scrim.classList.add('on');
    methodOpen = true; opener = btn || document.activeElement;
    body.scrollTop = 0;
    document.getElementById('method-close').focus();
    if (focusL) {
      const row = document.getElementById('lrow-' + focusL);
      if (row) { row.classList.add('flash'); row.scrollIntoView({ block: 'center' }); }
    }
  }
  function closeMethod() {
    panel.classList.remove('open'); scrim.classList.remove('on'); methodOpen = false;
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }
  function trapTab(e) {
    const f = [...panel.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  R.openMethod = openMethod;
  document.getElementById('method-close').addEventListener('click', closeMethod);
  scrim.addEventListener('click', closeMethod);
  document.addEventListener('click', e => {
    const b = e.target.closest('.method-btn');
    if (b) { openMethod(b.dataset.method, null, b); return; }
    const n = e.target.closest('.story [data-lid], figcaption [data-lid]');
    if (n) { const sec = n.closest('.scene'); if (sec) openMethod(sec.id, n.dataset.lid, n); }
  });

  /* ---------------- equation texture ---------------- */
  function eqTexture(sec) {
    const nums = (sec.dataset.eqtex || '').split(/\s+/).filter(Boolean);
    const E = D.equations || {};
    const txt = nums.map(n => E[n] ? E[n].formula : '').filter(Boolean);
    if (!txt.length) return;
    const div = R.html('div', { class: 'eqtex', 'aria-hidden': 'true' });
    div.textContent = (txt.join('      ') + '      ').repeat(6);
    sec.querySelector('.pin').prepend(div);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    fillNumbers(document);
    document.querySelectorAll('.scene').forEach(el => {
      const stage = el.querySelector('.stage');
      sections.push({ el, id: el.id, act: +el.dataset.act, stage, alt: stage ? stage.dataset.alt : '' });
      if (el.dataset.eqtex) eqTexture(el);
    });
    sizeScenes();
    buildRail();
    buildChain();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', () => {
      sizeScenes();
      sections.forEach(s => { const d = R.scenes[s.id]; if (s.state === 'ready' && d && d.resize) d.resize(); s.last = -1; });
      tick();
    });
    reduced.addEventListener && reduced.addEventListener('change', () => { sections.forEach(s => s.last = -1); tick(); });
    if (location.hash) { const t = document.querySelector(location.hash); if (t) setTimeout(() => window.scrollTo(0, t.offsetTop), 0); }
    tick();
  }
  R.boot = boot;
  document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0));
})();
