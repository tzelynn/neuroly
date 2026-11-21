// Focal loss (per-pixel/query classification) and Dice loss (mask overlap).
import { h, s, frame, slider, fmt } from '../lib/dom.js';

export default function mount(el) {
  const { stage, controls, readout } = frame(el, { caption: 'Left: focal loss multiplies cross-entropy by (1−p)^γ. Easy, already-correct pixels or queries (p → 1) contribute almost nothing, so training concentrates on hard ones such as object boundaries and look-alike negatives. Right: Dice loss = 1 − 2|A∩B| / (|A|+|B|) scores overlap directly, so a small object counts as much as a large one.' });
  const W = 260, H = 170, X0 = 30, Y0 = 10, PW = 220, PH = 130;
  const fsvg = s('svg', { class: 'viz', viewBox: `0 0 ${W} ${H}`, style: 'max-width:300px' });
  const dsvg = s('svg', { class: 'viz', viewBox: `0 0 ${W} ${H}`, style: 'max-width:300px' });
  stage.append(fsvg, dsvg);
  let gamma = 2, shift = 10;
  const X = (p) => X0 + p * PW, Y = (l) => Y0 + PH - Math.min(1, l / 3) * PH;
  const curve = (g) => { let d = ''; for (let i = 1; i <= 100; i++) { const p = i / 100; d += `${i > 1 ? 'L' : 'M'}${X(p)},${Y(-((1 - p) ** g) * Math.log(p))}`; } return d; };

  function update() {
    fsvg.replaceChildren(
      s('line', { x1: X0, y1: Y0 + PH, x2: X0 + PW, y2: Y0 + PH, stroke: 'var(--line)' }), s('line', { x1: X0, y1: Y0, x2: X0, y2: Y0 + PH, stroke: 'var(--line)' }),
      s('rect', { x: X(0.8), y: Y0, width: X(1) - X(0.8), height: PH, fill: 'var(--accent-soft)' }),
      s('text', { x: X(0.9), y: Y0 + 12, 'text-anchor': 'middle' }, 'easy'),
      s('path', { d: curve(0), fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }),
      s('path', { d: curve(gamma), fill: 'none', stroke: 'var(--k-head)', 'stroke-width': 2.2 }),
      s('text', { x: X0 + PW / 2, y: H - 6, 'text-anchor': 'middle' }, 'p of the correct label'),
      s('text', { x: X(0.12), y: Y(2.3) }, 'CE'), s('text', { x: X(0.3), y: Y(-((0.7) ** gamma) * Math.log(0.3)) - 6, style: 'fill:var(--k-head)' }, `focal γ=${gamma}`),
    );
    // dice: GT square vs predicted (shifted) square on a 40×40 grid
    const n = 40, g = [12, 12, 28, 28], p = [12 + shift, 12 + shift * 0.4, 28 + shift, 28 + shift * 0.4];
    const ix = Math.max(0, Math.min(g[2], p[2]) - Math.max(g[0], p[0])) * Math.max(0, Math.min(g[3], p[3]) - Math.max(g[1], p[1]));
    const dice = (2 * ix) / (2 * 16 * 16);
    const sc = 120 / n, ox = 70, oy = 14;
    dsvg.replaceChildren(
      s('rect', { x: ox, y: oy, width: 120, height: 120, fill: 'var(--surface-2)', rx: 4 }),
      s('rect', { x: ox + g[0] * sc, y: oy + g[1] * sc, width: 16 * sc, height: 16 * sc, fill: 'var(--good)', 'fill-opacity': 0.35, stroke: 'var(--good)' }),
      s('rect', { x: ox + p[0] * sc, y: oy + p[1] * sc, width: 16 * sc, height: 16 * sc, fill: 'var(--k-head)', 'fill-opacity': 0.35, stroke: 'var(--k-head)', 'stroke-dasharray': '4 2' }),
      s('text', { x: ox + 60, y: 156, 'text-anchor': 'middle' }, `Dice = ${fmt(dice, 2)} → loss ${fmt(1 - dice, 2)}`),
      s('text', { x: 10, y: 40 }, 'GT'), s('rect', { x: 10, y: 46, width: 12, height: 12, fill: 'var(--good)', 'fill-opacity': .5 }),
      s('text', { x: 10, y: 80 }, 'pred'), s('rect', { x: 10, y: 86, width: 12, height: 12, fill: 'var(--k-head)', 'fill-opacity': .5 }),
    );
    readout.innerHTML = `At p = 0.9, focal loss is <b>${fmt((0.1 ** gamma) * 100, 1)}%</b> of cross-entropy, so easy examples are down-weighted ${fmt(1 / (0.1 ** gamma || 1), 0)}×. SAM 3 weights mask focal : dice = 200 : 10.`;
  }
  controls.append(
    slider({ label: 'focal γ', min: 0, max: 5, step: 0.5, value: gamma, format: (v) => fmt(v, 1), oninput: (v) => { gamma = v; update(); } }).el,
    slider({ label: 'mask offset', min: 0, max: 16, step: 1, value: shift, format: (v) => `${v}px`, oninput: (v) => { shift = v; update(); } }).el,
  );
  update();
}
