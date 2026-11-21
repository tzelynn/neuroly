// Multi-crop augmentation for self-distillation (DINO family).
// props: { globals: 2, locals: 8, globalScale: [0.32,1], localScale: [0.05,0.32], globalPx: 256, localPx: 112 }
import { h, frame, button } from '../lib/dom.js';
import { N, sceneCanvas } from '../lib/scene.js';

export default function mount(el, { globals = 2, locals = 8, globalScale = [0.32, 1], localScale = [0.05, 0.32], globalPx = 256, localPx = 112 } = {}) {
  const { stage, controls, readout } = frame(el, { caption: `Each image gives ${globals} large "global" crops (${globalPx}²) and ${locals} small "local" crops (${localPx}²). The teacher sees only global crops. The student must predict the teacher's output for a global view from every crop, including tiny local ones, so it learns that a patch of roof implies "house".` });
  const src = sceneCanvas();
  const S = 300;
  const main = h('canvas', { width: S, height: S, style: { width: '100%', maxWidth: '300px', borderRadius: '8px' } });
  const tiles = h('div', { style: { flex: '1 1 260px', display: 'grid', gap: '8px' } });
  stage.style.alignItems = 'flex-start';
  stage.append(main, tiles);
  const ctx = main.getContext('2d'); ctx.imageSmoothingEnabled = false;

  function crop([lo, hi]) {
    const area = lo + Math.random() * (hi - lo), ar = Math.exp((Math.random() - 0.5) * 0.6);
    const w = Math.min(1, Math.sqrt(area * ar)), hh = Math.min(1, Math.sqrt(area / ar));
    return [Math.random() * (1 - w), Math.random() * (1 - hh), w, hh];
  }
  function tile(c, size, color, label) {
    const cv = h('canvas', { width: size, height: size, class: 'px', style: { width: `${size}px`, height: `${size}px`, borderRadius: '6px', outline: `2px solid ${color}` }, title: label });
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(src, c[0] * N, c[1] * N, c[2] * N, c[3] * N, 0, 0, size, size);
    return cv;
  }
  function sample() {
    const G = Array.from({ length: globals }, () => crop(globalScale));
    const L = Array.from({ length: locals }, () => crop(localScale));
    ctx.clearRect(0, 0, S, S); ctx.drawImage(src, 0, 0, S, S);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, S, S);
    const box = (c, col, wdt) => { ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.strokeRect(c[0] * S, c[1] * S, c[2] * S, c[3] * S); };
    L.forEach((c) => box(c, '#7ad3ff', 1.5)); G.forEach((c) => box(c, '#ffb347', 3));
    tiles.replaceChildren(
      h('div', { class: 'ops-title' }, 'global crops → teacher + student'),
      h('div', { style: { display: 'flex', gap: '8px' } }, ...G.map((c, i) => tile(c, 92, '#ffb347', `global ${i + 1}`))),
      h('div', { class: 'ops-title', style: { marginTop: '6px' } }, 'local crops → student only'),
      h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, ...L.map((c, i) => tile(c, 46, '#7ad3ff', `local ${i + 1}`))),
    );
    readout.innerHTML = `Loss pairs per image: each of ${locals} local + ${globals} global student views × ${globals} teacher views (excluding identical pairs) = <b>${locals * globals + globals * (globals - 1)}</b> cross-view matches.`;
  }
  controls.append(button('🎲 resample crops', sample, 'primary'));
  sample();
}
