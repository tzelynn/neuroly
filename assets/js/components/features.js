// "What each stage sees": a stage selector + feature maps on the toy image.
//
// stage.view:
//   input                       – the raw image
//   edges|textures|parts|objects – 4 feature maps at stage.res (CNN-style)
//   attention                   – tap a patch; stage.depth (0 early … 1 late) blends local→semantic
//   similarity                  – tap a patch; cosine similarity of patch features (DINO-style)
//   pca                         – first 3 principal components of patch features as RGB
//   concept                     – prompt-conditioned heat map for a noun phrase (stage.concepts = [..])
//   masks                       – final instance masks for a noun phrase (stage.concepts = [..])
// optional: stage.patch (px, default 8 → 14×14 grid), stage.noise, stage.artifacts, stage.global
import { h, segmented } from '../lib/dom.js';
import { mapCanvas } from '../lib/canvas.js';
import { N, featureMaps, sceneCanvas, patchFeatures, attention, similarity, pcaRGB, instances, pool, blur } from '../lib/scene.js';
import { patchOverlay } from '../lib/patchviz.js';

function resGrid(res) {
  // show the stage's spatial grid on top of the input image
  const wrap = h('div', { class: 'overlay-wrap' }, sceneCanvas());
  if (res && res < N) {
    const c = h('canvas', { width: 336, height: 336 }); const ctx = c.getContext('2d');
    const cell = 336 / res; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < res; i++) { ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, 336); ctx.moveTo(0, i * cell); ctx.lineTo(336, i * cell); }
    ctx.stroke(); c.style.pointerEvents = 'none'; wrap.append(c);
  }
  return wrap;
}

function mapsView(st) {
  const maps = featureMaps(st.view, st.res || 28);
  return h('div', { class: 'feat-maps' }, ...maps.map((m) => h('figure', {},
    mapCanvas(m.data, m.n, m.n, { signed: m.signed }),
    h('figcaption', {}, m.caption, h('br'), h('span', { class: 'res-tag' }, `${m.n}×${m.n}`)),
  )));
}

function patchView(st) {
  const p = st.patch || 8, G = N / p;
  const feats = patchFeatures(p, { noise: st.noise || 0, artifacts: st.artifacts || 0, global: st.global || 0 });
  const note = h('p', { class: 'small muted' });
  let q = st.query ?? Math.floor(G * 0.62) * G + Math.floor(G * 0.42); // a wall patch
  const ov = patchOverlay({ G, initial: q, onPick: (qq) => { q = qq; draw(); } });
  function draw() {
    if (st.view === 'pca') { ov.draw(pcaRGB(feats), 'rgb', null); note.textContent = 'Each patch is coloured by its first 3 principal components. Patches with similar features get similar colours, so object parts emerge without any labels.'; return; }
    const vals = st.view === 'similarity' ? similarity(feats, q).map((v) => Math.max(0, v) ** 3) : attention(feats, q, st.depth ?? 1);
    ov.draw(vals, 'spot', q);
    note.textContent = st.view === 'similarity' ? 'Tap or drag on any patch. Bright patches have features similar to the one you picked.' : 'Tap or drag on any patch to make it the query. Bright regions are where that token attends.';
  }
  draw();
  return { left: ov.el, right: note };
}

const MASK_COLORS = [[91, 91, 214], [194, 87, 26], [47, 143, 106], [180, 58, 106]];

function conceptView(st) {
  const concepts = st.concepts || ['house', 'window', 'tree', 'dog'];
  const G = 14;
  const ov = patchOverlay({ G });
  const note = h('p', { class: 'small muted' });
  const draw = (c) => {
    const inst = instances(c);
    if (st.view === 'masks') {
      ov.drawMasks(inst.map((m, i) => ({ mask: m.mask, box: m.box, color: MASK_COLORS[i % 4], label: `#${i + 1}` })));
      note.innerHTML = inst.length ? `<b>${inst.length}</b> instance${inst.length > 1 ? 's' : ''} of “${c}”, each with its own mask, box and ID.` : `“${c}” is not in the image. The presence head outputs a low score, so <b>no masks</b> are returned.`;
    } else {
      const m = new Float32Array(N * N); inst.forEach((x) => x.mask.forEach((v, i) => { if (v) m[i] = 1; }));
      const heat = pool(blur(m, 4), G);
      ov.draw(inst.length ? heat.map((v) => v + 0.02) : heat.map(() => 0), 'heat', null);
      note.innerHTML = inst.length ? `Image tokens that match “${c}” light up after cross-attending to the text tokens.` : `Nothing matches “${c}”, so the conditioned features stay flat.`;
    }
  };
  const seg = segmented(concepts.map((c) => ({ value: c, label: `“${c}”` })), concepts[0], draw, 'prompt');
  draw(concepts[0]);
  return { left: ov.el, right: h('div', {}, seg.el, note) };
}

export function features(sec) {
  const stages = sec.stages;
  const body = h('div', { class: 'feat-body' });
  const caption = h('p', { class: 'feat-caption' });

  function show(i) {
    const st = stages[i];
    body.replaceChildren();
    if (['concept', 'masks'].includes(st.view)) {
      const { left, right } = conceptView(st);
      body.append(h('div', { class: 'feat-input' }, left), right);
    } else if (['attention', 'similarity', 'pca'].includes(st.view)) {
      const { left, right } = patchView(st);
      body.append(h('div', { class: 'feat-input' }, left), h('div', {}, right));
    } else if (st.view === 'input') {
      body.append(h('div', { class: 'feat-input' }, resGrid(0)), h('div', {}, h('p', { class: 'small muted' }, `A ${N}×${N} toy scene with known parts: sky, sun, cloud, house (roof, wall, door, windows), two trees and grass. All the maps on this page are computed from it in your browser.`)));
    } else {
      body.append(h('div', { class: 'feat-input' }, resGrid(st.res)), mapsView(st));
    }
    caption.innerHTML = `<b>${st.label}.</b> ${st.caption || ''}`;
  }

  const seg = segmented(stages.map((s, i) => ({ value: i, label: s.label })), 0, show, 'stage');
  show(0);
  return h('div', { class: 'panel' }, seg.el, body, caption,
    h('p', { class: 'w-caption' }, sec.note || 'Illustrative. Edge maps come from real convolution filters on the toy image. Deeper maps are simulated from the scene\'s known parts to show the kind of feature each stage encodes.'));
}
