// Mixup vs CutMix on two toy images, with the resulting soft label.
import { h, frame, slider, segmented, button, fmt } from '../lib/dom.js';
import { N, getScene, hash } from '../lib/scene.js';

function boatImage() {
  const d = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let c;
    if (y < 60) { const t = y / 60; c = [255 - 60 * t, 190 + 20 * t, 150 + 80 * t]; } // dusk sky
    else { const w = Math.sin(x / 4 + y * 0.9) * 10; c = [40 + w, 90 + w, 150 + w]; } // sea
    if (Math.hypot(x - 30, y - 44) < 12) c = [255, 140, 60];
    const hull = y >= 70 && y <= 80 && x >= 44 + (y - 70) && x <= 92 - (y - 70);
    const sail = y >= 30 && y < 70 && x >= 66 && x <= 66 + ((y - 30) * 22) / 40;
    const mast = x >= 64 && x <= 65 && y >= 26 && y < 70;
    if (hull) c = [120, 60, 40]; if (sail) c = [245, 240, 230]; if (mast) c = [80, 50, 30];
    const n = (hash(x, y, 31) - 0.5) * 8; const i = (y * N + x) * 4;
    d[i] = c[0] + n; d[i + 1] = c[1] + n; d[i + 2] = c[2] + n; d[i + 3] = 255;
  }
  return d;
}

export default function mount(el) {
  const { stage, controls, readout } = frame(el, { caption: 'Mixup blends whole images. CutMix pastes a box from one image into the other. In both cases the label is mixed in the same proportion, so the model learns calibrated, less over-confident predictions and can\'t rely on one discriminative region.' });
  const A = getScene().rgba, B = boatImage();
  const cv = h('canvas', { width: N, height: N, class: 'px', style: { width: '100%', maxWidth: '260px', borderRadius: '8px' } });
  const ctx = cv.getContext('2d');
  const label = h('div', { class: 'bars', style: { flex: '1 1 200px', maxWidth: '280px' } });
  stage.append(cv, label);
  let lam = 0.65, mode = 'mixup', box = [0.5, 0.5];

  function update() {
    const out = new Uint8ClampedArray(N * N * 4);
    let areaA = lam;
    if (mode === 'mixup') { for (let i = 0; i < out.length; i++) out[i] = lam * A[i] + (1 - lam) * B[i]; }
    else {
      const r = Math.sqrt(1 - lam), w = Math.round(N * r), hh = Math.round(N * r);
      const x0 = Math.round(Math.max(0, Math.min(N - w, box[0] * N - w / 2))), y0 = Math.round(Math.max(0, Math.min(N - hh, box[1] * N - hh / 2)));
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const inB = x >= x0 && x < x0 + w && y >= y0 && y < y0 + hh, s = inB ? B : A, i = (y * N + x) * 4;
        out[i] = s[i]; out[i + 1] = s[i + 1]; out[i + 2] = s[i + 2]; out[i + 3] = 255;
      }
      areaA = 1 - (w * hh) / (N * N);
    }
    ctx.putImageData(new ImageData(out, N, N), 0, 0);
    label.replaceChildren(h('div', { class: 'ops-title' }, 'training target'),
      ...[['house', areaA, false], ['boat', 1 - areaA, true]].map(([l, v, hl]) => h('div', { class: `bar-row ${hl ? 'hl' : ''}` }, h('span', {}, l), h('div', { class: 'track' }, h('div', { class: 'fill', style: { width: `${v * 100}%` } })), h('span', { class: 'val' }, fmt(v, 2)))));
    readout.innerHTML = `λ = <b>${fmt(lam, 2)}</b> · loss = ${fmt(areaA, 2)}·CE(house) + ${fmt(1 - areaA, 2)}·CE(boat)${mode === 'cutmix' ? ' · λ is recomputed from the actual box area' : ''}`;
  }
  controls.append(
    segmented([{ value: 'mixup', label: 'Mixup' }, { value: 'cutmix', label: 'CutMix' }], mode, (v) => { mode = v; update(); }).el,
    slider({ label: 'λ', min: 0, max: 1, step: 0.01, value: lam, format: (v) => fmt(v, 2), oninput: (v) => { lam = v; update(); } }).el,
    button('🎲 new box', () => { box = [Math.random(), Math.random()]; mode === 'cutmix' ? update() : null; }),
  );
  update();
}
