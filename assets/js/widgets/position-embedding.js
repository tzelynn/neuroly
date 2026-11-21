// Position encoding similarity. mode 'learned' (ViT: absolute, learned —
// similarity shows row/column structure) or 'rope' (relative: attention bias
// depends only on the offset, so the pattern moves with the query).
// props: { mode: 'learned'|'rope', G: 14 }
import { h, frame, segmented } from '../lib/dom.js';

export default function mount(el, { mode = 'learned', G = 14, both = false } = {}) {
  const { stage, controls, readout } = frame(el, { caption: mode === 'rope' || both ? 'Tap a cell. With RoPE, query and key vectors are rotated by angles proportional to their (x, y) position. Their dot product then depends only on the relative offset, so the pattern is the same shape wherever you tap and extends to any image size.' : 'Tap a cell to see the cosine similarity between its learned position embedding and every other one. ViT learns this 2-D structure from scratch: nearby patches, and patches in the same row or column, end up with similar embeddings.' });
  const S = 280;
  const cv = h('canvas', { width: S, height: S, style: { width: '100%', maxWidth: '280px', borderRadius: '8px', cursor: 'crosshair', touchAction: 'none' } });
  stage.append(cv);
  const ctx = cv.getContext('2d');
  let q = Math.floor(G / 3) * G + Math.floor(G / 2), m = mode;

  function sim(i) {
    const x = i % G, y = Math.floor(i / G), qx = q % G, qy = Math.floor(q / G);
    const dx = x - qx, dy = y - qy;
    if (m === 'learned') {
      // learned absolute embeddings: local blob + row/col bands, slightly irregular near borders
      const edge = 1 - 0.25 * (Math.min(x, G - 1 - x, y, G - 1 - y) === 0);
      return edge * (0.55 * Math.exp(-(dx * dx + dy * dy) / 6) + 0.25 * Math.exp(-dy * dy / 0.8) + 0.25 * Math.exp(-dx * dx / 0.8));
    }
    // RoPE: sum of cosines over a few frequencies of the offset
    let s = 0; const fr = [0.9, 0.5, 0.25, 0.12];
    for (const f of fr) s += Math.cos(f * dx) + Math.cos(f * dy);
    return s / (2 * fr.length);
  }

  function draw() {
    const c = S / G;
    const vals = Array.from({ length: G * G }, (_, i) => sim(i));
    const lo = Math.min(...vals), hi = Math.max(...vals);
    vals.forEach((v, i) => {
      const t = (v - lo) / (hi - lo || 1);
      ctx.fillStyle = `rgb(${Math.round(30 + 225 * t)},${Math.round(40 + 150 * t * t)},${Math.round(90 + 40 * (1 - t))})`;
      ctx.fillRect((i % G) * c, Math.floor(i / G) * c, c - 1, c - 1);
    });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect((q % G) * c + 1, Math.floor(q / G) * c + 1, c - 3, c - 3);
    readout.innerHTML = m === 'learned' ? 'Absolute, learned: one vector per position. Changing resolution requires <b>interpolating</b> the embedding grid.' : 'Relative (RoPE): no position vectors are added. The rotation encodes <b>offsets</b>, which generalise to unseen resolutions.';
  }
  const pick = (e) => { const r = cv.getBoundingClientRect(); const x = Math.floor(((e.clientX - r.left) / r.width) * G), y = Math.floor(((e.clientY - r.top) / r.height) * G); if (x >= 0 && y >= 0 && x < G && y < G) { q = y * G + x; draw(); } };
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture?.(e.pointerId); pick(e); });
  cv.addEventListener('pointermove', (e) => e.buttons && pick(e));
  if (both) controls.append(segmented([{ value: 'learned', label: 'Learned absolute (ViT)' }, { value: 'rope', label: 'RoPE (relative)' }], m, (v) => { m = v; draw(); }).el);
  draw();
}
