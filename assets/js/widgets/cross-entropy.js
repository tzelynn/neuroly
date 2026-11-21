// Softmax + cross-entropy explorer, with optional label smoothing.
// props: { classes: string[], smoothing?: boolean (show toggle on), eps?: 0.1 }
import { h, s, frame, slider, toggle, fmt } from '../lib/dom.js';

export default function mount(el, { classes = ['cat', 'dog', 'car', 'tree', 'boat'], smoothing = true, eps = 0.1 } = {}) {
  const K = classes.length;
  const others = classes.map((_, i) => (i === 0 ? 0 : [1.2, 0.4, -0.3, -0.8, 0.1, -1][i - 1] ?? 0));
  let zTrue = 1.5, smooth = false;
  const { stage, controls, readout } = frame(el, { caption: 'Drag the slider to change the true class’s logit. The left chart shows softmax probabilities against the target. The right chart shows where you sit on the −log p curve.' });

  const W = 260, H = 170;
  const bars = s('svg', { class: 'viz', viewBox: `0 0 ${W} ${H}`, style: 'max-width:300px' });
  const curve = s('svg', { class: 'viz', viewBox: `0 0 ${W} ${H}`, style: 'max-width:300px' });
  stage.append(bars, curve);

  // static curve
  const X0 = 34, Y0 = 10, PW = W - 46, PH = H - 40;
  const X = (p) => X0 + p * PW, Y = (l) => Y0 + PH - Math.min(1, l / 5) * PH;
  let d = ''; for (let i = 1; i <= 100; i++) { const p = i / 100; d += `${i === 1 ? 'M' : 'L'}${X(p)},${Y(-Math.log(p))}`; }
  curve.append(
    s('line', { x1: X0, y1: Y0, x2: X0, y2: Y0 + PH, stroke: 'var(--line)' }),
    s('line', { x1: X0, y1: Y0 + PH, x2: X0 + PW, y2: Y0 + PH, stroke: 'var(--line)' }),
    s('path', { d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }),
    s('text', { x: X0 + PW / 2, y: H - 6, 'text-anchor': 'middle' }, 'p(true class)'),
    s('text', { x: X0 + 8, y: Y0 + 10 }, 'loss'),
    s('text', { x: X0 - 4, y: Y(5) + 4, 'text-anchor': 'end' }, '5'),
    s('text', { x: X0 - 4, y: Y(0) + 4, 'text-anchor': 'end' }, '0'),
  );
  const dot = s('circle', { r: 5, fill: 'var(--k-head)' });
  const guide = s('line', { stroke: 'var(--k-head)', 'stroke-dasharray': '3 3' });
  curve.append(guide, dot);

  function update() {
    const z = others.map((v, i) => (i === 0 ? zTrue : v));
    const m = Math.max(...z); const e = z.map((v) => Math.exp(v - m)); const Z = e.reduce((a, b) => a + b, 0);
    const p = e.map((v) => v / Z);
    const target = classes.map((_, i) => (smooth ? (i === 0 ? 1 - eps + eps / K : eps / K) : i === 0 ? 1 : 0));
    const loss = -target.reduce((acc, t, i) => acc + t * Math.log(p[i]), 0);

    bars.replaceChildren();
    const bw = (W - 20) / K;
    classes.forEach((c, i) => {
      const x = 10 + i * bw, bh = p[i] * (H - 40), th = target[i] * (H - 40);
      bars.append(
        s('rect', { x: x + 4, y: H - 24 - bh, width: bw - 8, height: bh, rx: 3, fill: i === 0 ? 'var(--accent)' : 'var(--ink-3)', opacity: i === 0 ? 1 : 0.5 }),
        s('rect', { x: x + 4, y: H - 24 - th, width: bw - 8, height: th, rx: 3, fill: 'none', stroke: 'var(--k-head)', 'stroke-dasharray': '3 2' }),
        s('text', { x: x + bw / 2, y: H - 8, 'text-anchor': 'middle', class: i === 0 ? 'ink' : '' }, c + (i === 0 ? ' ✓' : '')),
        s('text', { x: x + bw / 2, y: H - 28 - bh, 'text-anchor': 'middle', class: 'mono' }, fmt(p[i], 2)),
      );
    });
    dot.setAttribute('cx', X(p[0])); dot.setAttribute('cy', Y(-Math.log(p[0])));
    guide.setAttribute('x1', X(p[0])); guide.setAttribute('x2', X(p[0])); guide.setAttribute('y1', Y0 + PH); guide.setAttribute('y2', Y(-Math.log(p[0])));
    readout.innerHTML = `p(true) = <b>${fmt(p[0], 3)}</b> · loss = <b>${fmt(loss, 3)}</b> · gradient on true logit = <b>${fmt(p[0] - target[0], 3)}</b>` +
      (smooth ? ' <span class="muted">· with smoothing, the loss can\'t reach 0, so the model stops pushing logits to infinity</span>' : '');
  }

  controls.append(slider({ label: 'true-class logit', min: -4, max: 8, step: 0.1, value: zTrue, format: (v) => fmt(v, 1), oninput: (v) => { zTrue = v; update(); } }).el);
  if (smoothing) controls.append(toggle(`label smoothing ε=${eps}`, false, (v) => { smooth = v; update(); }).el);
  update();
}
