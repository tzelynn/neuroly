// Receptive field on the toy image. Tap to move the unit; slider picks the stage.
// props: { stages: [{name, rf}], input: 224 (px the rf numbers refer to) }
import { h, frame, segmented } from '../lib/dom.js';
import { N, sceneCanvas } from '../lib/scene.js';

export default function mount(el, { stages = [], input = 224 } = {}) {
  const { stage, controls, readout } = frame(el, { caption: 'The square shows the theoretical receptive field: every input pixel that can influence one unit. The glow shows the effective receptive field, which is roughly Gaussian and much smaller because central pixels dominate. Tap the image to move the unit.' });
  const S = 336;
  const ov = h('canvas', { width: S, height: S });
  const ctx = ov.getContext('2d');
  stage.append(h('div', { class: 'overlay-wrap' }, sceneCanvas(), ov));
  let si = Math.min(3, stages.length - 1), cx = S * 0.55, cy = S * 0.6;

  function draw() {
    const st = stages[si];
    const r = (st.rf / input) * S;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(10,10,20,.45)'; ctx.fillRect(0, 0, S, S);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const sig = r / 5;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, sig * 2.5);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    ctx.restore();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.strokeRect(cx - r / 2, cy - r / 2, r, r);
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
    readout.innerHTML = `<b>${st.name}</b>: theoretical RF <b>${st.rf}px</b> on a ${input}px input${st.rf >= input ? ' (bigger than the whole image, so the unit can use global context)' : ` (${Math.round((st.rf / input) * 100)}% of the image width)`}`;
  }
  ov.addEventListener('pointerdown', (e) => { const r = ov.getBoundingClientRect(); cx = ((e.clientX - r.left) / r.width) * S; cy = ((e.clientY - r.top) / r.height) * S; draw(); });
  controls.append(segmented(stages.map((s, i) => ({ value: i, label: s.name })), si, (v) => { si = v; draw(); }).el);
  draw();
}
