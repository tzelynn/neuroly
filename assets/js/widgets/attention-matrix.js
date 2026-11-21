// Self-attention as a matrix over a few named tokens from the toy image.
// softmax(q·k / τ) per row. Tap a row to see what that token mixes in.
import { h, s, frame, slider, fmt } from '../lib/dom.js';
import { patchFeatures } from '../lib/scene.js';

const TOKENS = [ // [label, patch index on 14×14 grid]
  ['sky', 1 * 14 + 8], ['sun', 2 * 14 + 11], ['roof', 5 * 14 + 7], ['wall', 9 * 14 + 9], ['window', 8 * 14 + 6], ['leaves', 6 * 14 + 1], ['grass', 12 * 14 + 4],
];

export default function mount(el) {
  const { stage, controls, readout } = frame(el, { caption: 'Each row is one query token and each column is a key. Row i holds softmax(qᵢ·kⱼ/τ), and the token\'s output is the weighted average of the value vectors. Lower τ (larger √d scaling) gives sharper attention. Tap a row.' });
  const { F } = patchFeatures(8);
  const feats = TOKENS.map(([, i]) => F[i]);
  const n = TOKENS.length, C = 30, X0 = 60, Y0 = 50;
  const svg = s('svg', { class: 'viz', viewBox: `0 0 ${X0 + n * C + 10} ${Y0 + n * C + 10}`, style: 'max-width:360px' });
  stage.append(svg);
  let tau = 0.35, row = 3;

  function update() {
    const A = feats.map((q) => {
      const l = feats.map((k) => q.reduce((a, v, i) => a + v * k[i], 0) / tau);
      const m = Math.max(...l), e = l.map((v) => Math.exp(v - m)), z = e.reduce((a, b) => a + b, 0);
      return e.map((v) => v / z);
    });
    svg.replaceChildren();
    TOKENS.forEach(([lab], j) => {
      svg.append(s('text', { x: X0 + j * C + C / 2, y: Y0 - 8, 'text-anchor': 'end', transform: `rotate(-40 ${X0 + j * C + C / 2} ${Y0 - 8})` }, lab));
      svg.append(s('text', { x: X0 - 6, y: Y0 + j * C + C / 2 + 4, 'text-anchor': 'end', class: j === row ? 'ink' : '' }, lab));
    });
    A.forEach((r, i) => r.forEach((v, j) => {
      svg.append(s('rect', { x: X0 + j * C + 1, y: Y0 + i * C + 1, width: C - 2, height: C - 2, rx: 3, fill: 'var(--k-attn)', 'fill-opacity': 0.08 + 0.92 * v, style: 'cursor:pointer', onclick: () => { row = i; update(); } }));
      if (i === row) svg.append(s('text', { x: X0 + j * C + C / 2, y: Y0 + i * C + C / 2 + 4, 'text-anchor': 'middle', class: 'mono ink', style: 'font-size:9px;pointer-events:none' }, fmt(v, 2)));
    }));
    svg.append(s('rect', { x: X0, y: Y0 + row * C, width: n * C, height: C, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.5, rx: 4 }));
    const top = A[row].map((v, j) => [v, TOKENS[j][0]]).sort((a, b) => b[0] - a[0]).slice(0, 3);
    readout.innerHTML = `The <b>${TOKENS[row][0]}</b> token mixes in ${top.map(([v, l]) => `<b>${l}</b> ${Math.round(v * 100)}%`).join(', ')}.`;
  }
  controls.append(slider({ label: 'temperature τ', min: 0.08, max: 2, step: 0.01, value: tau, format: (v) => fmt(v, 2), oninput: (v) => { tau = v; update(); } }).el);
  update();
}
