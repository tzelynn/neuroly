// Real forward pass of a 30-layer ReLU MLP (width 64, batch 128) under
// different initialisations / BatchNorm, showing activation histograms.
import { h, s, frame, segmented, fmt } from '../lib/dom.js';
import { hash } from '../lib/scene.js';

const W = 64, B = 128, L = 30, SHOW = [1, 5, 15, 30];

function gauss(i, j, k) { // deterministic Box–Muller
  const u = Math.max(1e-7, hash(i, j, k)), v = hash(j, i, k + 7);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function run(mode) {
  let x = Array.from({ length: B }, (_, b) => Float32Array.from({ length: W }, (_, i) => gauss(b, i, 1)));
  const out = {};
  const scale = mode === 'small' ? Math.sqrt(1 / W) * 0.6 : mode === 'large' ? Math.sqrt(2 / W) * 1.5 : Math.sqrt(2 / W);
  for (let l = 1; l <= L; l++) {
    const Wm = Array.from({ length: W }, (_, i) => Float32Array.from({ length: W }, (_, j) => gauss(i + l * 101, j, 3) * scale));
    let z = x.map((row) => Float32Array.from({ length: W }, (_, i) => { let s = 0; const w = Wm[i]; for (let j = 0; j < W; j++) s += w[j] * row[j]; return s; }));
    if (mode === 'bn') {
      for (let i = 0; i < W; i++) {
        let m = 0; for (let b = 0; b < B; b++) m += z[b][i]; m /= B;
        let v = 0; for (let b = 0; b < B; b++) v += (z[b][i] - m) ** 2; v /= B;
        const sd = Math.sqrt(v + 1e-5); for (let b = 0; b < B; b++) z[b][i] = (z[b][i] - m) / sd;
      }
    }
    x = z.map((row) => row.map((v) => Math.max(0, v)));
    if (SHOW.includes(l)) out[l] = z.flatMap((r) => Array.from(r));
  }
  return out;
}

export default function mount(el) {
  const { stage, controls, readout } = frame(el, { caption: 'This is a real forward pass through 30 random ReLU layers, computed in your browser. Each histogram shows pre-activation values at one depth. Bad initialisation makes them collapse to 0 or blow up. He init roughly preserves scale, and BatchNorm forces mean 0 and std 1 at every layer.' });
  const cache = {};
  const plots = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '10px', width: '100%' } });
  stage.append(plots);

  function update(mode) {
    const data = cache[mode] || (cache[mode] = run(mode));
    plots.replaceChildren(...SHOW.map((l) => {
      const v = data[l];
      let m = 0; for (const a of v) m += a; m /= v.length;
      let sd = 0; for (const a of v) sd += (a - m) ** 2; sd = Math.sqrt(sd / v.length);
      const bins = new Array(24).fill(0), lo = -4, hi = 4;
      for (const a of v) { const b = Math.floor(((a - lo) / (hi - lo)) * 24); if (b >= 0 && b < 24) bins[b]++; }
      const mx = Math.max(...bins, 1);
      const svg = s('svg', { class: 'viz', viewBox: '0 0 120 70' },
        ...bins.map((c, i) => s('rect', { x: i * 5, y: 56 - (c / mx) * 50, width: 4.2, height: (c / mx) * 50, fill: sd < 0.05 || sd > 20 ? 'var(--bad)' : 'var(--accent)' })),
        s('line', { x1: 60, x2: 60, y1: 4, y2: 56, stroke: 'var(--line)' }),
        s('text', { x: 60, y: 68, 'text-anchor': 'middle' }, `layer ${l} · std ${sd < 1e-3 ? sd.toExponential(0) : sd > 1e3 ? sd.toExponential(0) : fmt(sd, 2)}`));
      return svg;
    }));
    const last = data[30]; let sd = 0, m = 0; for (const a of last) m += a / last.length; for (const a of last) sd += (a - m) ** 2 / last.length; sd = Math.sqrt(sd);
    readout.innerHTML = `Std at layer 30: <b>${sd < 1e-3 || sd > 1e3 ? sd.toExponential(1) : fmt(sd, 2)}</b> · ${({ small: 'signal vanished', large: 'signal exploded', he: 'scale roughly preserved', bn: 'normalised at every layer' })[mode]}`;
  }
  controls.append(segmented([{ value: 'small', label: 'Too small init' }, { value: 'large', label: 'Too large init' }, { value: 'he', label: 'He init' }, { value: 'bn', label: '+ BatchNorm' }], 'small', update).el);
  update('small');
}
