// DINOv3 Gram anchoring. Long training slowly degrades dense (patch) features
// while global metrics keep improving. Gram anchoring regularises the student's
// patch-similarity structure (Gram matrix) towards an earlier "Gram teacher".
import { h, s, frame, slider, toggle, fmt } from '../lib/dom.js';
import { patchFeatures, similarity, pcaRGB } from '../lib/scene.js';
import { patchOverlay } from '../lib/patchviz.js';

const MAX = 1.3; // M iterations shown
const START = 1.0; // Gram anchoring starts at 1M iterations

function degradation(it, gram) {
  let d = Math.max(0, Math.min(1, (it - 0.2) / 0.8));
  if (gram && it > START) d *= Math.exp(-(it - START) / 0.02); // repairs within ~10k–50k its
  return d;
}
const globalAcc = (it) => 74 + 14 * (1 - Math.exp(-it / 0.35));
const denseScore = (it, gram) => { const up = 40 + 14 * Math.min(1, it / 0.2); return up - 13 * degradation(it, gram) + (gram && it > START ? 2.5 * (1 - Math.exp(-(it - START) / 0.03)) : 0); };

export default function mount(el) {
  const { stage, controls, readout } = frame(el, { caption: 'Schematic, based on the DINOv3 paper (Figs. 5–6 and §4). Patch features are simulated on the toy image. Tap a patch to change the reference. The loss compares X·Xᵀ (cosine similarities between all patch pairs) of the student and the Gram teacher, so features may drift as long as their relationships stay intact.' });
  const G = 14;
  let it = 0.6, gram = false, q = 8 * G + 5;
  const ov = patchOverlay({ G, initial: q, onPick: (v) => { q = v; update(); } });
  const right = h('div', { style: { flex: '1 1 260px', maxWidth: '360px', display: 'grid', gap: '8px' } });
  stage.style.alignItems = 'flex-start';
  stage.append(h('div', { style: { flex: '1 1 240px', maxWidth: '320px' } }, ov.el, h('div', { class: 'small muted', style: { textAlign: 'center', marginTop: '4px' } }, 'cosine similarity to the selected patch')), right);
  const chart = s('svg', { class: 'viz', viewBox: '0 0 300 150' });
  const gramRow = h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } });
  right.append(chart, gramRow);

  const teacher = patchFeatures(16, {}); // Gram teacher: early, clean features (7×7 for a compact Gram matrix)
  const gramOf = (F) => F.map((a) => F.map((b) => { let d = 0, na = 0, nb = 0; for (let k = 0; k < a.length; k++) { d += a[k] * b[k]; na += a[k] * a[k]; nb += b[k] * b[k]; } return d / Math.sqrt(na * nb + 1e-9); }));
  const Gt = gramOf(teacher.F);

  function gramCanvas(M) {
    const n = M.length, c = h('canvas', { width: n, height: n, class: 'px', style: { width: '96px', height: '96px', borderRadius: '4px' } });
    const x = c.getContext('2d'), img = x.createImageData(n, n);
    M.forEach((r, i) => r.forEach((v, j) => { const o = (i * n + j) * 4, t = (v + 1) / 2; img.data[o] = 30 + 220 * t; img.data[o + 1] = 40 + 120 * t * t; img.data[o + 2] = 120 - 60 * t; img.data[o + 3] = 255; }));
    x.putImageData(img, 0, 0); return c;
  }

  function update() {
    const d = degradation(it, gram);
    const feats = patchFeatures(8, { noise: 0.75 * d, global: 0.45 * d, artifacts: 0, seed: 3 });
    ov.draw(similarity(feats, q).map((v) => Math.max(0, v) ** 3), 'spot', q);
    // chart
    const X = (t) => 30 + (t / MAX) * 260, Yg = (a) => 10 + (90 - a) * 2.4, Yd = (a) => 10 + (60 - a) * 4.2;
    const path = (f) => Array.from({ length: 131 }, (_, i) => { const t = (i / 130) * MAX; return `${i ? 'L' : 'M'}${X(t)},${f(t)}`; }).join('');
    chart.replaceChildren(
      s('line', { x1: 30, x2: 290, y1: 130, y2: 130, stroke: 'var(--line)' }),
      s('rect', { x: X(START), y: 6, width: X(MAX) - X(START), height: 124, fill: 'var(--accent-soft)', opacity: gram ? 0.9 : 0 }),
      s('path', { d: path((t) => Yg(globalAcc(t))), fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.5 }),
      s('path', { d: path((t) => Yd(denseScore(t, false))), fill: 'none', stroke: 'var(--bad)', 'stroke-width': 2, opacity: gram ? 0.35 : 1, 'stroke-dasharray': gram ? '4 3' : '' }),
      gram ? s('path', { d: path((t) => Yd(denseScore(t, true))), fill: 'none', stroke: 'var(--good)', 'stroke-width': 2.2 }) : null,
      s('line', { x1: X(it), x2: X(it), y1: 6, y2: 130, stroke: 'var(--ink)', 'stroke-width': 1 }),
      s('text', { x: 32, y: 146 }, '0'), s('text', { x: X(1), y: 146, 'text-anchor': 'middle' }, '1M'), s('text', { x: 290, y: 146, 'text-anchor': 'end' }, 'iterations'),
      s('text', { x: 292, y: Yg(globalAcc(MAX)) - 4, 'text-anchor': 'end' }, 'global (k-NN / linear)'),
      s('text', { x: 292, y: Yd(denseScore(MAX, gram)) + 14, 'text-anchor': 'end', style: `fill:${gram ? 'var(--good)' : 'var(--bad)'}` }, 'dense (segmentation)'),
    );
    const Gs = gramOf(patchFeatures(16, { noise: 0.75 * d, global: 0.45 * d, seed: 3 }).F);
    let L = 0; Gs.forEach((r, i) => r.forEach((v, j) => { L += (v - Gt[i][j]) ** 2; }));
    gramRow.replaceChildren(
      h('figure', { style: { margin: 0, textAlign: 'center' } }, gramCanvas(Gs), h('figcaption', { class: 'small muted' }, 'student X·Xᵀ')),
      h('span', { class: 'muted' }, 'vs'),
      h('figure', { style: { margin: 0, textAlign: 'center' } }, gramCanvas(Gt), h('figcaption', { class: 'small muted' }, 'Gram teacher')),
      h('div', { class: 'small' }, '‖ΔG‖²', h('br'), h('b', { class: 'mono' }, fmt(L, 1))),
    );
    readout.innerHTML = `iteration <b>${Math.round(it * 1000)}k</b> · ${d < 0.1 ? '<span style="color:var(--good)">patch similarities are clean and local</span>' : d < 0.5 ? 'patch features are starting to lose locality' : '<span style="color:var(--bad)">noisy similarity: unrelated patches look alike</span>'}`;
  }

  controls.append(
    slider({ label: 'training iteration', min: 0, max: MAX, step: 0.01, value: it, format: (v) => `${Math.round(v * 1000)}k`, oninput: (v) => { it = v; update(); } }).el,
    toggle('Gram anchoring (from 1M)', gram, (v) => { gram = v; update(); }).el,
  );
  update();
}
