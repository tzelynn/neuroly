// Clickable image + per-patch overlay (attention spotlight, PCA colours, masks).
import { h } from './dom.js';
import { N, sceneCanvas } from './scene.js';

const S = 336; // overlay canvas internal size (3× the scene)

/**
 * patchOverlay({G, onPick}) → { el, draw(values|rgb, mode, q), drawMasks(list) , ctx }
 * mode: 'spot' (dim low values), 'heat' (colour), 'rgb' (values are [r,g,b] 0..1)
 */
export function patchOverlay({ G, onPick, initial = null }) {
  const base = sceneCanvas();
  const ov = h('canvas', { width: S, height: S, 'aria-label': 'image patches — tap to choose a query patch' });
  const ctx = ov.getContext('2d');
  const el = h('div', { class: 'overlay-wrap' }, base, ov);
  let q = initial;

  const pick = (ev) => {
    const r = ov.getBoundingClientRect();
    const x = Math.floor(((ev.clientX - r.left) / r.width) * G);
    const y = Math.floor(((ev.clientY - r.top) / r.height) * G);
    if (x < 0 || y < 0 || x >= G || y >= G) return;
    q = y * G + x;
    onPick && onPick(q);
  };
  if (onPick) {
    ov.addEventListener('pointerdown', (e) => { ov.setPointerCapture?.(e.pointerId); pick(e); });
    ov.addEventListener('pointermove', (e) => { if (e.buttons) pick(e); });
  }

  function grid(alpha = 0.18) {
    const c = S / G;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < G; i++) { ctx.moveTo(i * c + 0.5, 0); ctx.lineTo(i * c + 0.5, S); ctx.moveTo(0, i * c + 0.5); ctx.lineTo(S, i * c + 0.5); }
    ctx.stroke();
  }

  function outline(qq, color = '#fff') {
    if (qq == null) return;
    const c = S / G, x = (qq % G) * c, y = Math.floor(qq / G) * c;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.strokeRect(x + 1, y + 1, c - 2, c - 2);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, c - 2, c - 2);
  }

  function draw(values, mode = 'spot', qq = q) {
    ctx.clearRect(0, 0, S, S);
    const c = S / G;
    let max = 0; if (mode !== 'rgb') for (const v of values) max = Math.max(max, v);
    for (let i = 0; i < G * G; i++) {
      const x = (i % G) * c, y = Math.floor(i / G) * c;
      if (mode === 'rgb') { const [r, g, b] = values[i]; ctx.fillStyle = `rgba(${r * 255},${g * 255},${b * 255},0.88)`; }
      else if (mode === 'spot') { const v = Math.sqrt(values[i] / (max || 1)); ctx.fillStyle = `rgba(10,10,20,${0.82 * (1 - v)})`; }
      else { const v = values[i] / (max || 1); ctx.fillStyle = `rgba(255,${Math.round(120 + 100 * (1 - v))},40,${0.75 * v})`; }
      ctx.fillRect(x, y, c + 0.5, c + 0.5);
    }
    grid(mode === 'rgb' ? 0.08 : 0.15);
    outline(qq);
  }

  /** masks: [{mask (N×N), color:[r,g,b], box, label}] */
  function drawMasks(list, { dim = 0.35 } = {}) {
    ctx.clearRect(0, 0, S, S);
    const img = ctx.createImageData(S, S);
    const k = S / N;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = Math.floor(y / k) * N + Math.floor(x / k);
      const o = (y * S + x) * 4;
      let hit = false;
      for (const m of list) if (m.mask[i]) { img.data[o] = m.color[0]; img.data[o + 1] = m.color[1]; img.data[o + 2] = m.color[2]; img.data[o + 3] = 150; hit = true; break; }
      if (!hit && dim) img.data[o + 3] = 255 * dim;
    }
    ctx.putImageData(img, 0, 0);
    for (const m of list) if (m.box) {
      const [x0, y0, x1, y1] = m.box.map((v) => v * k);
      ctx.strokeStyle = `rgb(${m.color})`; ctx.lineWidth = 2.5; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      if (m.label) {
        ctx.font = '600 15px system-ui, sans-serif';
        const tw = ctx.measureText(m.label).width + 8;
        const ty = y0 > 20 ? y0 - 20 : y1;
        ctx.fillStyle = `rgb(${m.color})`; ctx.fillRect(x0 - 1, ty, tw, 20);
        ctx.fillStyle = '#fff'; ctx.fillText(m.label, x0 + 3, ty + 15);
      }
    }
  }

  return { el, ctx, draw, drawMasks, grid, outline, size: S, get q() { return q; }, set q(v) { q = v; } };
}
