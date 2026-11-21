// DETR-style bipartite (Hungarian) matching between predictions and targets.
// Brute-force optimal assignment (tiny sizes) with cost = cls + L1 + GIoU.
import { h, s, frame, button, fmt } from '../lib/dom.js';
import { instances } from '../lib/scene.js';
import { patchOverlay } from '../lib/patchviz.js';

const W_CLS = 2, W_L1 = 5, W_GIOU = 2;
const area = (b) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
function giou(a, b) {
  const ix = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  const inter = area(ix), uni = area(a) + area(b) - inter;
  const c = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
  return inter / uni - (area(c) - uni) / area(c);
}
const l1 = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / 112;

function perms(n, k) { // all injective maps from k targets → n predictions
  const out = []; const rec = (cur, used) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = 0; i < n; i++) if (!used[i]) { used[i] = 1; cur.push(i); rec(cur, used); cur.pop(); used[i] = 0; } };
  rec([], []); return out;
}

export default function mount(el) {
  const { stage, controls, readout } = frame(el, { caption: 'Prompt: “window”. Two ground-truth windows (solid) and five predicted queries (dashed). Matching finds the one-to-one assignment with the lowest total cost. Matched queries learn to regress their box and mask. Every other query, including the near-duplicate, is trained to output "no match". That is why DETR-style detectors need no NMS.' });
  const gt = instances('window').map((i) => i.box);
  const ov = patchOverlay({ G: 14 });
  const table = h('div', { style: { flex: '1 1 260px', maxWidth: '360px', overflowX: 'auto' } });
  stage.style.alignItems = 'flex-start';
  stage.append(h('div', { style: { flex: '1 1 240px', maxWidth: '320px' } }, ov.el), table);
  let preds;
  const jit = (b, a) => b.map((v) => v + (Math.random() - 0.5) * a);
  function sample() {
    preds = [
      { box: jit(gt[0], 4), p: 0.7 + Math.random() * 0.25 },
      { box: jit(gt[0], 9), p: 0.5 + Math.random() * 0.3 }, // duplicate
      { box: jit(gt[1], 5), p: 0.6 + Math.random() * 0.3 },
      { box: jit([55, 72, 65, 90], 3), p: 0.3 + Math.random() * 0.3 }, // door
      { box: jit([8, 38, 24, 56], 6), p: 0.1 + Math.random() * 0.2 }, // leaves
    ].map((q) => ({ ...q, box: [Math.min(q.box[0], q.box[2] - 2), Math.min(q.box[1], q.box[3] - 2), q.box[2], q.box[3]] }));
    update();
  }
  function update() {
    const C = gt.map((g) => preds.map((q) => W_CLS * -q.p + W_L1 * l1(q.box, g) + W_GIOU * (1 - giou(q.box, g))));
    let best = null, bc = Infinity;
    for (const p of perms(preds.length, gt.length)) { const c = p.reduce((s, j, i) => s + C[i][j], 0); if (c < bc) { bc = c; best = p; } }
    const cols = [[91, 91, 214], [47, 143, 106]];
    ov.drawMasks([], { dim: 0.25 });
    const ctx = ov.ctx, k = ov.size / 112;
    gt.forEach((g, i) => { ctx.strokeStyle = `rgb(${cols[i]})`; ctx.lineWidth = 3; ctx.strokeRect(g[0] * k, g[1] * k, (g[2] - g[0]) * k, (g[3] - g[1]) * k); });
    preds.forEach((q, j) => {
      const m = best.indexOf(j);
      ctx.setLineDash([5, 3]); ctx.lineWidth = 2; ctx.strokeStyle = m >= 0 ? `rgb(${cols[m]})` : 'rgba(255,255,255,.8)';
      const b = q.box.map((v) => v * k); ctx.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.font = '600 13px system-ui'; ctx.fillText(`q${j + 1}`, b[2] + 2, b[1] + 11);
    });
    const th = (t) => h('th', { style: { padding: '4px 6px', fontWeight: 600, fontSize: '.78rem', color: 'var(--ink-2)' } }, t);
    table.replaceChildren(h('div', { class: 'ops-title' }, 'cost matrix (lower = better match)'), h('table', { style: { borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: '.8rem' } },
      h('tr', {}, th(''), ...preds.map((_, j) => th(`q${j + 1}`))),
      ...gt.map((_, i) => h('tr', {}, th(`GT${i + 1}`), ...preds.map((_, j) => h('td', { style: { padding: '4px 6px', textAlign: 'center', borderRadius: '4px', background: best[i] === j ? `rgba(${cols[i]},.25)` : 'transparent', fontWeight: best[i] === j ? 700 : 400 } }, fmt(C[i][j], 1))))),
      h('tr', {}, th('target'), ...preds.map((_, j) => h('td', { style: { padding: '4px 6px', textAlign: 'center', fontSize: '.7rem', color: best.includes(j) ? 'var(--good)' : 'var(--ink-3)' } }, best.includes(j) ? `GT${best.indexOf(j) + 1}` : '∅'))),
    ));
    readout.innerHTML = `Optimal total cost <b>${fmt(bc, 2)}</b> · cost = ${W_CLS}·(−p) + ${W_L1}·L1 + ${W_GIOU}·(1−GIoU) · <b>${preds.length - gt.length}</b> queries get the "no match" target`;
  }
  controls.append(button('🎲 new predictions', sample, 'primary'));
  sample();
}
