// SAM 3 presence head: final score = p(present) × p(query matches | present).
// Type-free: pick a noun-phrase prompt; queries are simulated on the toy scene.
import { h, frame, segmented, slider, toggle, fmt } from '../lib/dom.js';
import { instances } from '../lib/scene.js';
import { patchOverlay } from '../lib/patchviz.js';

const COLORS = [[91, 91, 214], [194, 87, 26], [47, 143, 106], [180, 58, 106]];
// distractor queries: [concept prompt, box (scene px), local score, what it really is]
const DISTRACT = {
  window: [[[55, 72, 65, 90], 0.42, 'door']],
  tree: [[[1, 84, 40, 100], 0.31, 'grass']],
  house: [],
  door: [[[44, 62, 52, 70], 0.38, 'window']],
  sun: [[[21, 6, 54, 26], 0.27, 'cloud']],
  dog: [[[85, 51, 106, 94], 0.58, 'small tree'], [[55, 72, 65, 90], 0.31, 'door']],
  car: [[[55, 72, 65, 90], 0.55, 'door'], [[40, 56, 80, 90], 0.36, 'wall']],
  boat: [[[36, 34, 84, 56], 0.61, 'roof (hull-shaped)']],
};
const PRESENT = { window: 0.98, tree: 0.97, house: 0.99, door: 0.95, sun: 0.97, dog: 0.03, car: 0.05, boat: 0.04 };

export default function mount(el) {
  const { stage, controls, readout } = frame(el, { caption: 'Each object query outputs a local score: "does this box match the phrase, assuming the phrase is in the image?" A single learned presence token answers "is the phrase in the image at all?". Their product is the final score. Try an absent concept (dog, car, boat) with the presence head off: look-alike regions pass the threshold as false positives.' });
  const ov = patchOverlay({ G: 14 });
  const list = h('div', { style: { flex: '1 1 260px', maxWidth: '340px', display: 'grid', gap: '6px', alignContent: 'start' } });
  stage.style.alignItems = 'flex-start';
  stage.append(h('div', { style: { flex: '1 1 240px', maxWidth: '320px' } }, ov.el), list);
  let prompt = 'window', usePresence = true, thr = 0.5;

  function update() {
    const pres = PRESENT[prompt];
    const queries = [
      ...instances(prompt).map((inst, i) => ({ box: inst.box, mask: inst.mask, local: 0.93 - i * 0.04, truth: prompt })),
      ...(DISTRACT[prompt] || []).map(([box, local, truth]) => ({ box, local, truth, mask: null })),
    ];
    queries.forEach((q) => { q.final = usePresence ? pres * q.local : q.local; q.keep = q.final >= thr; });
    const kept = queries.filter((q) => q.keep);
    ov.drawMasks(kept.map((q, i) => ({ mask: q.mask || boxMask(q.box), box: q.box, color: q.truth === prompt ? COLORS[i % 4] : [192, 57, 43], label: fmt(q.final, 2) })), { dim: 0.4 });
    // dashed boxes for rejected queries
    const ctx = ov.ctx, k = ov.size / 112;
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.75)';
    queries.filter((q) => !q.keep).forEach((q) => { const [x0, y0, x1, y1] = q.box.map((v) => v * k); ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); });
    ctx.setLineDash([]);

    list.replaceChildren(
      h('div', { class: 'bar-row' }, h('span', {}, h('b', {}, 'presence token')), h('div', { class: 'track' }, h('div', { class: 'fill', style: { width: `${pres * 100}%`, background: 'var(--k-head)', opacity: usePresence ? 1 : 0.25 } })), h('span', { class: 'val' }, usePresence ? fmt(pres, 2) : 'off')),
      h('div', { class: 'ops-title', style: { marginTop: '6px' } }, 'object queries (local → final)'),
      ...queries.map((q) => h('div', { class: 'bar-row' },
        h('span', { class: 'small' }, q.truth === prompt ? `✓ ${q.truth}` : `✗ ${q.truth}`),
        h('div', { class: 'track', style: { position: 'relative' } },
          h('div', { class: 'fill', style: { width: `${q.local * 100}%`, opacity: 0.25, position: 'absolute', inset: '0 auto 0 0' } }),
          h('div', { class: 'fill', style: { width: `${q.final * 100}%`, position: 'absolute', inset: '0 auto 0 0', background: q.keep ? (q.truth === prompt ? 'var(--good)' : 'var(--bad)') : 'var(--ink-3)' } }),
          h('div', { style: { position: 'absolute', left: `${thr * 100}%`, top: '-2px', bottom: '-2px', width: '2px', background: 'var(--ink)' } })),
        h('span', { class: 'val' }, fmt(q.final, 2)))),
    );
    const fp = kept.filter((q) => q.truth !== prompt).length, tp = kept.length - fp, total = instances(prompt).length;
    readout.innerHTML = `“${prompt}”: <b>${tp}/${total}</b> instances found${fp ? ` · <span style="color:var(--bad)"><b>${fp}</b> false positive${fp > 1 ? 's' : ''}</span>` : ''}${!total && !fp ? ' · <span style="color:var(--good)">correctly reports “not present”</span>' : ''}`;
  }
  function boxMask([x0, y0, x1, y1]) { const m = new Float32Array(112 * 112); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * 112 + x] = 1; return m; }

  controls.append(
    segmented(['window', 'tree', 'house', 'door', 'sun', 'dog', 'car', 'boat'].map((c) => ({ value: c, label: `“${c}”` })), prompt, (v) => { prompt = v; update(); }, 'prompt').el,
    toggle('presence head', usePresence, (v) => { usePresence = v; update(); }).el,
    slider({ label: 'threshold', min: 0.1, max: 0.9, step: 0.05, value: thr, format: (v) => fmt(v, 2), oninput: (v) => { thr = v; update(); } }).el,
  );
  update();
}
