// SAM 3 video: detector + memory tracker + masklet detection score (MDS).
// A toy clip: two cars drive past the house; the detector misses car 1 for a
// few frames (tracker memory carries it) and fires once on a false positive
// (a tentative masklet that is dropped because its MDS goes negative).
import { h, s, frame, slider, button, animate } from '../lib/dom.js';
import { sceneCanvas } from '../lib/scene.js';

const T = 60, DELAY = 15;
const carA = (t) => [-14 + t * 2.2, 80];
const carB = (t) => (t >= 22 ? [118 - (t - 22) * 2.0, 86] : null);
const det = (t) => {
  const out = [];
  const a = carA(t); if (a[0] > -8 && a[0] < 112 && !(t >= 30 && t <= 34)) out.push({ obj: 'A', x: a[0], y: a[1] });
  const b = carB(t); if (b && b[0] < 108 && b[0] > -10) out.push({ obj: 'B', x: b[0], y: b[1] });
  if (t >= 10 && t <= 12) out.push({ obj: 'FP', x: 84, y: 14 });
  return out;
};

// precompute masklets: matched detection (+1) / propagated only (−1)
function simulate() {
  const tracks = { A: { id: 1, color: '#5b5bd6', start: null, hist: [] }, B: { id: 2, color: '#2f8f6a', start: null, hist: [] }, FP: { id: 3, color: '#c0392b', start: null, hist: [] } };
  for (let t = 0; t < T; t++) {
    const d = det(t); const seen = new Set(d.map((x) => x.obj));
    for (const [k, tr] of Object.entries(tracks)) {
      if (tr.start == null && seen.has(k)) tr.start = t;
      if (tr.start == null || tr.dead != null) { tr.hist.push(null); continue; }
      const prev = tr.hist.filter((x) => x).at(-1)?.mds ?? 0;
      const visible = k === 'A' ? carA(t)[0] < 112 : k === 'B' ? (carB(t)?.[0] ?? -99) > -10 : true;
      if (!visible) { tr.hist.push(null); continue; }
      const mds = prev + (seen.has(k) ? 1 : -1);
      if (mds < 0 && t - tr.start <= DELAY) { tr.dead = t; tr.hist.push({ mds, matched: false, dropped: true }); continue; }
      tr.hist.push({ mds, matched: seen.has(k), confirmed: t - tr.start >= DELAY || mds > 0 });
    }
  }
  return tracks;
}

export default function mount(el) {
  const { stage, controls, readout } = frame(el, { caption: 'The detector runs on every frame. The tracker propagates each masklet using its memory bank, and the two are matched by IoU. A masklet gains +1 per matched frame and −1 otherwise (the masklet detection score, MDS). A new masklet that falls below 0 within the 15-frame confirmation delay is dropped, which removes one-off false detections. Memory carries a real object through missed detections.' });
  const tracks = simulate();
  const base = sceneCanvas();
  const S = 336;
  const cv = h('canvas', { width: S, height: S, style: { width: '100%', maxWidth: '320px', borderRadius: '8px' } });
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const tl = s('svg', { class: 'viz', viewBox: `0 0 ${T * 5 + 70} 92`, style: 'max-width:420px' });
  stage.append(cv, tl);
  let t = 0, playing = true, acc = 0;

  function car(x, y, col) {
    const k = S / 112;
    ctx.fillStyle = col; ctx.fillRect(x * k, (y - 4) * k, 14 * k, 6 * k); ctx.fillRect((x + 3) * k, (y - 8) * k, 8 * k, 4 * k);
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc((x + 3) * k, (y + 2) * k, 2 * k, 0, 7); ctx.arc((x + 11) * k, (y + 2) * k, 2 * k, 0, 7); ctx.fill();
  }
  function draw() {
    const k = S / 112;
    ctx.drawImage(base, 0, 0, S, S);
    const a = carA(t); car(a[0], a[1], '#d64545');
    const b = carB(t); if (b) car(b[0], b[1], '#e8b030');
    const d = det(t);
    for (const [key, tr] of Object.entries(tracks)) {
      const st = tr.hist[t]; if (!st) continue;
      const pos = key === 'A' ? carA(t) : key === 'B' ? carB(t) : [84, 14];
      if (!pos) continue;
      const bx = key === 'FP' ? [pos[0] - 2, pos[1] - 6, 16, 14] : [pos[0] - 1, pos[1] - 10, 16, 15];
      ctx.strokeStyle = tr.color; ctx.lineWidth = 3; ctx.setLineDash(st.dropped ? [2, 4] : st.confirmed ? [] : [6, 4]);
      ctx.strokeRect(bx[0] * k, bx[1] * k, bx[2] * k, bx[3] * k); ctx.setLineDash([]);
      ctx.fillStyle = tr.color; ctx.fillRect(bx[0] * k, (bx[1] - 6) * k, 38, 16);
      ctx.fillStyle = '#fff'; ctx.font = '600 12px system-ui'; ctx.fillText(`ID ${tr.id}`, bx[0] * k + 4, (bx[1] - 6) * k + 12);
    }
    d.forEach((x) => { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc((x.x + 7) * k, (x.y - 3) * k, 3, 0, 7); ctx.fill(); });
    // timeline
    tl.replaceChildren();
    Object.values(tracks).forEach((tr, r) => {
      const y = 10 + r * 24;
      tl.append(s('text', { x: 0, y: y + 10 }, `ID ${tr.id}`));
      tr.hist.forEach((st, f) => { if (st) tl.append(s('rect', { x: 50 + f * 5, y, width: 4, height: 14, rx: 1, fill: st.dropped ? 'var(--bad)' : st.matched ? tr.color : 'var(--ink-3)', opacity: f <= t ? 1 : 0.18 })); });
      const st = tr.hist[t]; if (st) tl.append(s('text', { x: 54 + T * 5, y: y + 11, class: 'mono' }, `${st.mds >= 0 ? '+' : ''}${st.mds}`));
    });
    tl.append(s('line', { x1: 52 + t * 5, x2: 52 + t * 5, y1: 4, y2: 82, stroke: 'var(--ink)' }));
    const notes = [];
    if (t >= 30 && t <= 34) notes.push('detector misses car 1, but the <b>tracker memory</b> keeps ID 1 alive (grey ticks)');
    if (t >= 10 && t <= 13) notes.push('a <b>false detection</b> on the sun starts tentative masklet ID 3');
    if (tracks.FP.dead != null && t >= tracks.FP.dead && t < tracks.FP.dead + 6) notes.push('ID 3\'s MDS dropped below 0 inside the confirmation window, so it is <b>removed</b>');
    if (t >= 27 && t <= 31) notes.push('car 2 enters: an unmatched detection starts <b>new ID 2</b>');
    readout.innerHTML = `frame <b>${t + 1}/${T}</b>${notes.length ? ' · ' + notes.join(' · ') : ''}`;
  }
  const sl = slider({ label: 'frame', min: 0, max: T - 1, step: 1, value: 0, format: (v) => v + 1, oninput: (v) => { t = v; playing = false; pb.textContent = '▶ play'; draw(); } });
  const pb = button('❚❚ pause', () => { playing = !playing; pb.textContent = playing ? '❚❚ pause' : '▶ play'; if (playing) { if (t >= T - 1) t = 0; anim.restart(); } }, 'primary');
  const anim = animate(el, (_, dt) => {
    if (!playing) return false;
    acc += dt; if (acc > 140) { acc = 0; t = (t + 1) % T; sl.set(t, false); draw(); }
  });
  controls.append(pb, sl.el);
  draw();
}
