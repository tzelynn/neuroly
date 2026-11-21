// Why self-distillation needs centering / Sinkhorn-Knopp and sharpening.
// A batch of B images × K prototypes. Raw teacher logits share a common bias
// (a collapse direction) plus a weak per-image signal.
import { h, s, frame, slider, segmented, fmt } from '../lib/dom.js';
import { hash } from '../lib/scene.js';

const B = 8, K = 12;

export default function mount(el, { modes = ['none', 'center', 'sk'], initial = 'none' } = {}) {
  const { stage, controls, readout } = frame(el, { caption: 'Rows are images in a batch, columns are prototypes, and cells are the teacher\'s target probabilities. Collapse happens when every image maps to the same prototype, or when targets become uniform. Centering removes the shared bias, and a low teacher temperature sharpens each row. Sinkhorn-Knopp (used in DINOv3) forces prototypes to be used equally across the batch.' });
  const svg = s('svg', { class: 'viz', viewBox: `0 0 ${K * 22 + 70} ${B * 22 + 40}`, style: 'max-width:420px' });
  stage.append(svg);
  let mode = initial, tau = 0.06;
  const raw = Array.from({ length: B }, (_, b) => Array.from({ length: K }, (_, k) => {
    const bias = k === 2 ? 0.55 : k === 7 ? 0.3 : 0; // dominant prototypes → collapse
    const signal = k === (b * 5 + 1) % K ? 0.32 : 0;
    return bias + signal + (hash(b, k, 13) - 0.5) * 0.12;
  }));

  function targets() {
    let L = raw.map((r) => r.slice());
    if (mode === 'center') {
      const c = Array.from({ length: K }, (_, k) => L.reduce((a, r) => a + r[k], 0) / B);
      L = L.map((r) => r.map((v, k) => v - c[k]));
    }
    let P = L.map((r) => { const m = Math.max(...r); const e = r.map((v) => Math.exp((v - m) / tau)); const z = e.reduce((a, b) => a + b, 0); return e.map((v) => v / z); });
    if (mode === 'sk') {
      let Q = L.map((r) => r.map((v) => Math.exp((v - Math.max(...r)) / tau)));
      for (let it = 0; it < 3; it++) {
        for (let k = 0; k < K; k++) { const cs = Q.reduce((a, r) => a + r[k], 0) || 1; Q.forEach((r) => { r[k] /= cs * K; }); }
        Q.forEach((r) => { const rs = r.reduce((a, b) => a + b, 0) || 1; for (let k = 0; k < K; k++) r[k] /= rs; });
      }
      P = Q;
    }
    return P;
  }

  const H = (p) => -p.reduce((a, v) => a + (v > 1e-12 ? v * Math.log(v) : 0), 0);

  function update() {
    const P = targets();
    svg.replaceChildren(s('text', { x: 60, y: 12 }, 'prototypes →'));
    P.forEach((r, b) => {
      svg.append(s('text', { x: 54, y: 34 + b * 22, 'text-anchor': 'end' }, `img ${b + 1}`));
      r.forEach((v, k) => svg.append(s('rect', { x: 60 + k * 22, y: 20 + b * 22, width: 20, height: 20, rx: 3, fill: 'var(--k-head)', 'fill-opacity': 0.06 + 0.94 * Math.min(1, v * 1.4) })));
    });
    const mean = Array.from({ length: K }, (_, k) => P.reduce((a, r) => a + r[k], 0) / B);
    const usage = H(mean) / Math.log(K), sharp = 1 - P.reduce((a, r) => a + H(r), 0) / B / Math.log(K);
    const argmaxes = new Set(P.map((r) => r.indexOf(Math.max(...r))));
    const verdict = argmaxes.size <= 2 && sharp > 0.4 ? '<span style="color:var(--bad)">collapse: (almost) every image gets the same target</span>'
      : sharp < 0.15 ? '<span style="color:var(--bad)">collapse to uniform: targets carry no information</span>'
        : '<span style="color:var(--good)">healthy: images get distinct, confident targets</span>';
    readout.innerHTML = `prototype usage <b>${fmt(usage * 100, 0)}%</b> · row sharpness <b>${fmt(sharp * 100, 0)}%</b> · distinct targets <b>${argmaxes.size}/${B}</b><br>${verdict}`;
  }
  const labels = { none: 'No centering', center: 'Centering (DINO)', sk: 'Sinkhorn-Knopp (DINOv3)' };
  controls.append(
    segmented(modes.map((m) => ({ value: m, label: labels[m] })), mode, (v) => { mode = v; update(); }).el,
    slider({ label: 'teacher temp τₜ', min: 0.02, max: 0.5, step: 0.01, value: tau, format: (v) => fmt(v, 2), oninput: (v) => { tau = v; update(); } }).el,
  );
  update();
}
