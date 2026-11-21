// Canvas helpers: DPR-aware canvases, colormaps, and value-map rendering.
import { h } from './dom.js';

/** A crisp canvas of CSS size w×h (DPR capped at 2 to save memory on phones). */
export function makeCanvas(w, h_, cls = '') {
  const c = h('canvas', { class: cls });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(w * dpr);
  c.height = Math.round(h_ * dpr);
  c.style.aspectRatio = `${w} / ${h_}`;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  return { c, ctx, w, h: h_ };
}

const VIRIDIS = [[68, 1, 84], [65, 68, 135], [42, 120, 142], [34, 168, 132], [122, 209, 81], [253, 231, 37]];
const DIVERGING = [[49, 104, 196], [148, 180, 226], [236, 236, 236], [236, 150, 120], [196, 52, 44]];

function ramp(stops, t) {
  t = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  const f = t - i, a = stops[i], b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
export const viridis = (t) => ramp(VIRIDIS, t);
export const diverging = (t) => ramp(DIVERGING, t); // t in [0,1], 0.5 = zero

/** Normalise array to [0,1] (or [-1,1] mapped to [0,1] when signed). */
export function normalize(a, signed = false) {
  const out = new Float32Array(a.length);
  if (signed) {
    let m = 1e-9; for (const v of a) m = Math.max(m, Math.abs(v));
    for (let i = 0; i < a.length; i++) out[i] = 0.5 + 0.5 * (a[i] / m);
  } else {
    let lo = Infinity, hi = -Infinity; for (const v of a) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const r = hi - lo || 1; for (let i = 0; i < a.length; i++) out[i] = (a[i] - lo) / r;
  }
  return out;
}

/** Render an n×n (or w×h) value map to a small pixelated canvas. */
export function mapCanvas(data, w, h_ = w, { signed = false, cmap } = {}) {
  const c = h('canvas', { class: 'px' });
  c.width = w; c.height = h_;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h_);
  const n = normalize(data, signed);
  const f = cmap || (signed ? diverging : viridis);
  for (let i = 0; i < w * h_; i++) {
    const [r, g, b] = f(n[i]);
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Draw RGBA bytes (w×h) into a new pixelated canvas. */
export function rgbaCanvas(rgba, w, h_ = w) {
  const c = h('canvas', { class: 'px' });
  c.width = w; c.height = h_;
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h_), 0, 0);
  return c;
}

/** Simple line plot of y=f(x) into ctx box. Returns mapping helpers. */
export function plotAxes(ctx, { x0, y0, w, h: hh, xmin, xmax, ymin, ymax, color = '#888' }) {
  const X = (x) => x0 + ((x - xmin) / (xmax - xmin)) * w;
  const Y = (y) => y0 + hh - ((y - ymin) / (ymax - ymin)) * hh;
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + hh); ctx.lineTo(x0 + w, y0 + hh); ctx.stroke();
  return { X, Y };
}

export function plotLine(ctx, f, { X, Y }, xmin, xmax, color, width = 2, steps = 120) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const x = xmin + ((xmax - xmin) * i) / steps;
    const y = f(x);
    i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y));
  }
  ctx.stroke();
}
