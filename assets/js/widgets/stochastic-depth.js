// Stochastic depth (DropPath): each residual block is skipped at random during
// training, with drop probability rising linearly with depth.
// props: { blocks: 18, pmax: 0.1 }
import { h, frame, slider, animate, fmt } from '../lib/dom.js';

export default function mount(el, { blocks = 18, pmax = 0.1 } = {}) {
  const { stage, controls, readout } = frame(el, { caption: 'Each training step samples a different, shallower sub-network. Faded blocks are skipped and only their identity path is used. At test time every block runs, with its output scaled by its survival probability. This implicit ensemble regularises training, and dropped blocks save compute.' });
  const row = h('div', { style: { display: 'flex', gap: '4px', alignItems: 'center', width: '100%', flexWrap: 'wrap', justifyContent: 'center' } });
  stage.append(row);
  let p = pmax, last = 0, step = 0;
  const cells = Array.from({ length: blocks }, (_, l) => {
    const c = h('div', { style: { width: '26px', height: '44px', borderRadius: '5px', border: '1.5px solid var(--accent)', background: 'color-mix(in srgb, var(--accent) 30%, var(--surface))', transition: 'opacity .25s, transform .25s', display: 'grid', placeItems: 'center', fontSize: '.62rem', color: 'var(--ink-2)' } }, l + 1);
    row.append(c); return c;
  });
  function sample() {
    let alive = 0;
    cells.forEach((c, l) => {
      const drop = (p * (l + 1)) / blocks;
      const on = Math.random() >= drop; alive += on;
      c.style.opacity = on ? 1 : 0.18; c.style.transform = on ? 'none' : 'scale(.8)';
      c.title = `block ${l + 1}: drop p=${fmt(drop, 2)}`;
    });
    step++;
    const expected = cells.reduce((s, _, l) => s + 1 - (p * (l + 1)) / blocks, 0);
    readout.innerHTML = `step ${step}: <b>${alive}/${blocks}</b> blocks active · expected depth ${fmt(expected, 1)} · last block drop p = <b>${fmt(p, 2)}</b>`;
  }
  animate(el, (t) => { if (t - last > 900) { last = t; sample(); } });
  controls.append(slider({ label: 'max drop rate', min: 0, max: 0.6, step: 0.05, value: p, format: (v) => fmt(v, 2), oninput: (v) => { p = v; sample(); } }).el);
  sample();
}
