// Image → patches → token sequence, with cost readout.
// props: { input: 224, sizes: [32,16,8], initial: 16 }
import { h, frame, segmented, animate } from '../lib/dom.js';
import { N, getScene } from '../lib/scene.js';

export default function mount(el, { input = 224, sizes = [32, 16, 8], initial = 16 } = {}) {
  const { stage, controls, readout } = frame(el, { caption: 'The image is cut into non-overlapping P×P patches. Each patch is flattened and linearly projected into a token, and the tokens are read in raster order. Smaller patches give more detail but quadratically more attention cost.' });
  const S = 300;
  const img = h('canvas', { width: S, height: S, style: { width: '100%', maxWidth: '300px', borderRadius: '8px' } });
  const strip = h('canvas', { width: 600, height: 60, style: { width: '100%', maxWidth: '600px' } });
  stage.append(img, strip);
  const ictx = img.getContext('2d'), sctx = strip.getContext('2d');
  const src = document.createElement('canvas'); src.width = N; src.height = N;
  src.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(getScene().rgba), N, N), 0, 0);
  ictx.imageSmoothingEnabled = false; sctx.imageSmoothingEnabled = false;

  let P = initial, t0 = 0;
  const anim = animate(el, (t) => {
    if (!t0) t0 = t;
    const G = input / P, n = G * G, pk = N / G; // scene px per patch
    const k = Math.min(n, Math.floor((t - t0) / Math.max(8, 1800 / n)));
    ictx.clearRect(0, 0, S, S);
    ictx.drawImage(src, 0, 0, S, S);
    ictx.strokeStyle = 'rgba(255,255,255,.7)'; ictx.lineWidth = 1;
    const c = S / G;
    for (let i = 1; i < G; i++) { ictx.beginPath(); ictx.moveTo(i * c, 0); ictx.lineTo(i * c, S); ictx.moveTo(0, i * c); ictx.lineTo(S, i * c); ictx.stroke(); }
    if (k < n) { const x = (k % G) * c, y = Math.floor(k / G) * c; ictx.strokeStyle = '#ff6a3d'; ictx.lineWidth = 3; ictx.strokeRect(x, y, c, c); }
    // token strip: show the most recent tokens as a sequence
    sctx.clearRect(0, 0, 600, 60);
    const tw = 34, show = Math.floor(600 / (tw + 4));
    const start = Math.max(0, k - show + 1);
    for (let j = start; j <= Math.min(k, n - 1); j++) {
      const x = (j - start) * (tw + 4) + 2;
      sctx.drawImage(src, (j % G) * pk, Math.floor(j / G) * pk, pk, pk, x, 4, tw, tw);
      sctx.fillStyle = getComputedStyle(el).color; sctx.font = '10px ui-monospace, monospace'; sctx.textAlign = 'center';
      sctx.fillText(j + 1, x + tw / 2, 54);
    }
    return k < n;
  });

  function update() {
    const G = input / P, n = G * G;
    readout.innerHTML = `P = ${P}px → <b>${G}×${G} = ${n}</b> tokens (+1 [CLS]) · attention pairs per layer ≈ <b>${((n + 1) ** 2).toLocaleString()}</b> · each token = ${P}×${P}×3 = ${P * P * 3} numbers projected to D`;
    t0 = 0; anim.restart();
  }
  controls.append(segmented(sizes.map((s) => ({ value: s, label: `${s}×${s}` })), P, (v) => { P = v; update(); }, 'patch size').el);
  update();
}
