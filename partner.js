/* RAMOS partner edition: the LandOS carbon price slider. Four observed rungs only (L126). */
(function () {
  'use strict';
  const R = window.RAMOS;
  if (!R || !R.isPartner) return;
  const rng = document.getElementById('cdr-range'), val = document.getElementById('cdr-val'), out = document.getElementById('cdr-out');
  if (!rng) return;
  const rungs = R.cdrRungs();
  function draw() {
    const r = rungs[+rng.value];
    val.textContent = r.price + ' EUR/t';
    out.innerHTML = `<b>${r.share.toFixed(2)} %</b> of the olive-zone biochar pool covers its feedstock cost ${R.chipHTML('L126')}`;
  }
  rng.addEventListener('input', draw);
  draw();
})();
/* How it works: a tonne travels along the seven-step pipeline as you scroll; nodes jump to a step */
(function () {
  const R = window.RAMOS; if (!R || !R.isPartner) return;
  const sec = document.getElementById('s03h'); if (!sec) return;
  const nodes = [...sec.querySelectorAll('.fl-node')], dets = [...sec.querySelectorAll('.fl-det')], fill = document.getElementById('fl-fill'), tonne = document.getElementById('fl-tonne');
  const n = nodes.length; let cur = -1;
  function tick() {
    const r = sec.getBoundingClientRect(), span = r.height - innerHeight;
    const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    const i = Math.min(n - 1, Math.floor(p * n * .999)), f = Math.min(1, p * n * .999 - i);
    const pos = (i + Math.min(1, f * 1.6) * (i < n - 1 ? 0 : 0)) / (n - 1);
    const at = i / (n - 1);
    fill.style.width = (at * 100) + '%'; tonne.style.left = `calc(${(at * 100).toFixed(2)}% - ${(at * 64).toFixed(1)}px)`;
    if (i !== cur) { cur = i; nodes.forEach((e, k) => { e.classList.toggle('on', k === i); e.classList.toggle('done', k < i); }); dets.forEach((e, k) => e.classList.toggle('on', k === i)); }
  }
  nodes.forEach((e, k) => e.addEventListener('click', () => { const span = sec.offsetHeight - innerHeight; scrollTo({ top: sec.offsetTop + span * (k + .5) / n, behavior: 'smooth' }); }));
  addEventListener('scroll', tick, { passive: true }); tick();
})();
/* Model scope: five layers, one at a time, driven by scroll; tabs jump to a layer */
(function () {
  const R = window.RAMOS; if (!R || !R.isPartner) return;
  const sec = document.getElementById('s03w'); if (!sec) return;
  const tabs = [...sec.querySelectorAll('.sx-tab')], panes = [...sec.querySelectorAll('.sx-pane')], fill = document.getElementById('sx-fill');
  let cur = -1;
  const prog = () => { const r = sec.getBoundingClientRect(), span = r.height - innerHeight; return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0; };
  function show(i) { if (i === cur) return; cur = i; tabs.forEach((t, k) => t.classList.toggle('on', k === i)); panes.forEach((p, k) => p.classList.toggle('on', k === i)); }
  function tick() { const p = prog(); show(Math.min(panes.length - 1, Math.floor(p * panes.length * .999))); if (fill) fill.style.height = (p * 100).toFixed(1) + '%'; }
  tabs.forEach((t, k) => t.addEventListener('click', () => { const span = sec.offsetHeight - innerHeight; scrollTo({ top: sec.offsetTop + span * (k + .5) / panes.length, behavior: 'smooth' }); }));
  addEventListener('scroll', tick, { passive: true }); tick();
})();
/* What makes it different: cards light up in turn; card 4 runs a test counter */
(function () {
  const R = window.RAMOS; if (!R || !R.isPartner) return;
  const sec = document.getElementById('s03d'); if (!sec) return;
  const cards = [...sec.querySelectorAll('.dx-card')], grid = sec.querySelector('.dx-grid'), num = document.getElementById('dx-n');
  for (let k = 0; k < 48; k++) grid.appendChild(document.createElement('i'));
  const cells = [...grid.children]; let cur = -2, raf = 0;
  function count(run) {
    cancelAnimationFrame(raf);
    if (!run) { num.textContent = '0'; cells.forEach(c => c.classList.remove('ok')); return; }
    const t0 = performance.now(), D = 1600;
    const step = t => { const f = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - f, 3);
      num.textContent = (f < 1 ? Math.round(e * 2950) : '~3,000').toLocaleString('en');
      cells.forEach((c, k) => c.classList.toggle('ok', k < Math.round(e * cells.length)));
      if (f < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  function tick() {
    const r = sec.getBoundingClientRect(), span = r.height - innerHeight;
    const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    const i = r.top > innerHeight * .5 ? -1 : Math.min(cards.length - 1, Math.floor(p * cards.length * .999));
    if (i === cur) return;
    const prev = cur; cur = i;
    cards.forEach((c, k) => { c.classList.toggle('on', k === i); c.classList.toggle('seen', k < i); });
    if (i === 3 && prev !== 3) count(true); else if (i < 3 && prev >= 3) count(false);
  }
  addEventListener('scroll', tick, { passive: true }); tick();
})();
