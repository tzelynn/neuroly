// KoLeo regulariser: −(1/n) Σ log(min_j ‖xᵢ − xⱼ‖) on L2-normalised features.
// Live simulation on the unit circle: points clumped → spread out.
import { h, s, frame, button, animate, fmt } from '../lib/dom.js';

export default function mount(el, { n = 20 } = {}) {
  const { stage, controls, readout } = frame(el, { caption: 'Each dot is one image\'s normalised embedding in a batch. KoLeo pushes every point away from its nearest neighbour, so features spread uniformly over the sphere. Retrieval and k-NN work better when embeddings don\'t clump.' });
  const R = 100, C = 120;
  const svg = s('svg', { class: 'viz', viewBox: '0 0 240 240', style: 'max-width:260px' });
  stage.append(svg);
  let pts = [], running = false;

  function reset() {
    pts = Array.from({ length: n }, (_, i) => { const a = (i < n * 0.7 ? 0.6 : 2.4) + (Math.random() - 0.5) * 0.7; return [Math.cos(a), Math.sin(a)]; });
    draw();
  }
  function nn(i) { let b = -1, d = 9; pts.forEach((p, j) => { if (j !== i) { const dd = Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]); if (dd < d) { d = dd; b = j; } } }); return [b, d]; }
  function loss() { return -pts.reduce((a, _, i) => a + Math.log(Math.max(1e-4, nn(i)[1])), 0) / n; }
  function step() {
    const g = pts.map((p, i) => { const [j, d] = nn(i); const q = pts[j]; return [(p[0] - q[0]) / (d * d + 1e-3), (p[1] - q[1]) / (d * d + 1e-3)]; });
    pts = pts.map((p, i) => { const x = p[0] + 0.004 * g[i][0], y = p[1] + 0.004 * g[i][1], m = Math.hypot(x, y); return [x / m, y / m]; });
  }
  function draw() {
    svg.replaceChildren(s('circle', { cx: C, cy: C, r: R, fill: 'none', stroke: 'var(--line)', 'stroke-width': 1.5 }));
    pts.forEach((p, i) => {
      const [j] = nn(i), q = pts[j];
      svg.append(s('line', { x1: C + p[0] * R, y1: C + p[1] * R, x2: C + q[0] * R, y2: C + q[1] * R, stroke: 'var(--k-head)', 'stroke-opacity': 0.35 }));
    });
    pts.forEach((p) => svg.append(s('circle', { cx: C + p[0] * R, cy: C + p[1] * R, r: 5, fill: 'var(--accent)' })));
    const md = Math.min(...pts.map((_, i) => nn(i)[1]));
    readout.innerHTML = `KoLeo loss <b>${fmt(loss(), 3)}</b> · smallest neighbour distance <b>${fmt(md, 3)}</b> (uniform ideal ≈ ${fmt(2 * Math.sin(Math.PI / n), 3)})`;
  }
  const anim = animate(el, () => { if (!running) return false; for (let k = 0; k < 3; k++) step(); draw(); });
  const go = button('▶ apply KoLeo', () => { running = !running; go.textContent = running ? '❚❚ pause' : '▶ apply KoLeo'; if (running) anim.restart(); }, 'primary');
  controls.append(go, button('↺ reset (clumped)', () => { reset(); }));
  reset();
}
