// iBOT-style masked patch prediction: the student sees masked patches and must
// predict the teacher's (unmasked) patch-token distribution at those positions.
// props: { G: 14, ratio: 0.3 }
import { h, frame, slider, button, fmt } from '../lib/dom.js';
import { N, sceneCanvas, patchFeatures, pcaRGB } from '../lib/scene.js';

export default function mount(el, { G = 14, ratio = 0.3 } = {}) {
  const { stage, controls, readout } = frame(el, { caption: 'Left: the student sees a global crop with random patches replaced by a learnable [MASK] token. Right: the teacher sees the full crop. Its patch tokens (coloured by PCA) at the masked positions are the targets. To fill a hole, the student has to understand its surroundings: wall around a gap means more wall, or a window.' });
  const feats = patchFeatures(N / G);
  const rgb = pcaRGB(feats);
  const S = 240;
  const mk = () => { const c = h('canvas', { width: S, height: S, style: { width: '100%', borderRadius: '8px' } }); return [c, c.getContext('2d')]; };
  const [a, actx] = mk(), [b, bctx] = mk();
  const src = sceneCanvas();
  const col = (c, t) => h('figure', { style: { margin: 0, flex: '1 1 200px', maxWidth: '260px' } }, c, h('figcaption', { class: 'small muted', style: { textAlign: 'center' } }, t));
  stage.append(col(a, 'student input (masked)'), col(b, 'teacher targets at masked patches'));
  [actx, bctx].forEach((c) => { c.imageSmoothingEnabled = false; });
  let r = ratio, mask = [];

  function sample() { mask = Array.from({ length: G * G }, () => Math.random() < r); draw(); }
  function draw() {
    const c = S / G;
    actx.drawImage(src, 0, 0, S, S); bctx.drawImage(src, 0, 0, S, S);
    bctx.fillStyle = 'rgba(0,0,0,.55)'; bctx.fillRect(0, 0, S, S);
    let n = 0;
    mask.forEach((m, i) => {
      if (!m) return; n++;
      const x = (i % G) * c, y = Math.floor(i / G) * c;
      actx.fillStyle = '#8a8d94'; actx.fillRect(x, y, c, c);
      actx.strokeStyle = 'rgba(255,255,255,.5)'; actx.strokeRect(x + 0.5, y + 0.5, c - 1, c - 1);
      const [rr, gg, bb] = rgb[i]; bctx.fillStyle = `rgb(${rr * 255},${gg * 255},${bb * 255})`; bctx.fillRect(x, y, c, c);
    });
    readout.innerHTML = `<b>${n}</b> of ${G * G} patches masked (${fmt((n / (G * G)) * 100, 0)}%). Loss = cross-entropy between teacher and student prototype distributions, averaged over the masked patches only.`;
  }
  controls.append(
    slider({ label: 'mask ratio', min: 0.1, max: 0.5, step: 0.05, value: r, format: (v) => `${Math.round(v * 100)}%`, oninput: (v) => { r = v; sample(); } }).el,
    button('🎲 new mask', sample),
  );
  sample();
}
