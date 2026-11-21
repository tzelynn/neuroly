// A tiny procedural "photo" (112×112) with a known per-pixel label map.
// Every feature/attention/segmentation visualisation runs on it, in-browser,
// in a few milliseconds — no model weights, no GPU.
//
// Honesty note shown in the UI: early-layer maps are computed with real
// convolution filters; deeper maps are *simulated* from the known scene parts
// to illustrate the kind of features those layers are known to encode.

export const N = 112;
export const CLASSES = ['sky', 'sun', 'cloud', 'grass', 'wall', 'roof', 'door', 'window', 'trunk', 'leaves'];
const CI = Object.fromEntries(CLASSES.map((c, i) => [c, i]));
const BASE = {
  sky: [150, 196, 235], sun: [255, 204, 80], cloud: [246, 248, 252], grass: [104, 166, 84], wall: [216, 172, 128],
  roof: [178, 76, 60], door: [104, 68, 46], window: [118, 168, 212], trunk: [116, 80, 54], leaves: [62, 132, 70],
};
// object ids: 0 background, 1 house, 2 big tree, 3 small tree, 4 sun, 5 cloud
export const OBJECTS = ['background', 'house', 'tree', 'tree', 'sun', 'cloud'];

function hash(x, y, s = 0) {
  let n = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967295;
}
// smooth value noise
function vnoise(x, y, scale, s) {
  const gx = x / scale, gy = y / scale, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const sm = (t) => t * t * (3 - 2 * t);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  const u = sm(fx), v = sm(fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export { hash };

const dist = (x, y, cx, cy) => Math.hypot(x - cx, y - cy);

function paint(x, y) {
  let c = 'sky', o = 0;
  if (y > 84 + 2.5 * Math.sin(x / 9)) c = 'grass';
  if (dist(x, y, 90, 20) <= 9) { c = 'sun'; o = 4; }
  if (dist(x, y, 28, 18) < 6.5 || dist(x, y, 37, 14) < 8 || dist(x, y, 46, 18) < 6) { c = 'cloud'; o = 5; }
  if (x >= 12 && x <= 18 && y >= 58 && y <= 92) { c = 'trunk'; o = 2; }
  if (dist(x, y, 15, 50) <= 13 + 1.6 * Math.sin(Math.atan2(y - 50, x - 15) * 5)) { c = 'leaves'; o = 2; }
  if (x >= 40 && x <= 80 && y >= 56 && y <= 90) { c = 'wall'; o = 1; }
  if (y >= 34 && y < 56 && Math.abs(x - 60) <= ((y - 34) * 25) / 22) { c = 'roof'; o = 1; }
  if (x >= 55 && x <= 65 && y >= 72 && y <= 90) { c = 'door'; o = 1; }
  if (((x >= 44 && x <= 52) || (x >= 68 && x <= 76)) && y >= 62 && y <= 70) { c = 'window'; o = 1; }
  if (x >= 93 && x <= 97 && y >= 70 && y <= 94) { c = 'trunk'; o = 3; }
  if (dist(x, y, 95, 61) <= 10 + 1.2 * Math.sin(Math.atan2(y - 61, x - 95) * 6)) { c = 'leaves'; o = 3; }
  return [c, o];
}

function colour(c, x, y) {
  let [r, g, b] = BASE[c];
  let k = 1;
  switch (c) {
    case 'sky': { const t = (y / 84) * 0.35; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; break; }
    case 'grass': k = 0.8 + 0.3 * hash(x, Math.floor(y / 3), 3) + 0.15 * vnoise(x, y, 6, 4); break;
    case 'leaves': k = 0.7 + 0.55 * vnoise(x, y, 3, 7); break;
    case 'wall': if (y % 6 === 0 || (x + (Math.floor(y / 6) % 2) * 5) % 10 === 0) k = 0.78; break;
    case 'roof': if ((x + y) % 5 === 0) k = 0.75; break;
    case 'window': if (x === 48 || x === 72 || y === 66) { r = g = b = 240; } else if (x - y > -16 && x - y < -12) k = 1.25; break;
    case 'door': if (x === 63 && y === 81) { r = g = b = 230; } break;
    case 'trunk': k = 0.85 + 0.3 * hash(x, 0, 9); break;
    case 'sun': { const t = 1 - dist(x, y, 90, 20) / 9; r += (255 - r) * t * 0.6; g += (255 - g) * t * 0.6; b += (255 - b) * t * 0.6; break; }
    default: break;
  }
  const n = (hash(x, y, 11) - 0.5) * 8;
  return [r * k + n, g * k + n, b * k + n];
}

let cache = null;
export function getScene() {
  if (cache) return cache;
  const rgba = new Uint8ClampedArray(N * N * 4);
  const cls = new Uint8Array(N * N);
  const obj = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    const [c, o] = paint(x, y);
    const [r, g, b] = colour(c, x, y);
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = 255;
    cls[i] = CI[c]; obj[i] = o;
  }
  cache = { N, rgba, cls, obj };
  return cache;
}

/* ------------------------- image operations ------------------------- */

export function gray() {
  const { rgba } = getScene(); const g = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) g[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
  return g;
}

export function conv3(src, k, n = N) {
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let s = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const xx = Math.min(n - 1, Math.max(0, x + i)), yy = Math.min(n - 1, Math.max(0, y + j));
      s += src[yy * n + xx] * k[(j + 1) * 3 + (i + 1)];
    }
    out[y * n + x] = s;
  }
  return out;
}

export function blur(src, r, n = N) {
  if (r <= 0) return src;
  const tmp = new Float32Array(n * n), out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let s = 0, c = 0;
    for (let i = -r; i <= r; i++) { const xx = x + i; if (xx >= 0 && xx < n) { s += src[y * n + xx]; c++; } }
    tmp[y * n + x] = s / c;
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let s = 0, c = 0;
    for (let j = -r; j <= r; j++) { const yy = y + j; if (yy >= 0 && yy < n) { s += tmp[yy * n + x]; c++; } }
    out[y * n + x] = s / c;
  }
  return out;
}

/** Average-pool an N×N map down to res×res. */
export function pool(src, res, n = N) {
  if (res >= n) return src;
  const out = new Float32Array(res * res), f = n / res;
  for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) {
    let s = 0, c = 0;
    for (let j = Math.floor(y * f); j < Math.floor((y + 1) * f); j++) for (let i = Math.floor(x * f); i < Math.floor((x + 1) * f); i++) { s += src[j * n + i]; c++; }
    out[y * res + x] = s / c;
  }
  return out;
}

export function classMask(names) {
  const { cls } = getScene(); const set = new Set(names.map((c) => CI[c]));
  const m = new Float32Array(N * N); for (let i = 0; i < N * N; i++) m[i] = set.has(cls[i]) ? 1 : 0; return m;
}
export function objectMask(ids) {
  const { obj } = getScene(); const set = new Set(ids);
  const m = new Float32Array(N * N); for (let i = 0; i < N * N; i++) m[i] = set.has(obj[i]) ? 1 : 0; return m;
}

const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
const DIAG = [0, 1, 2, -1, 0, 1, -2, -1, 0];

/**
 * Feature maps for a "kind" of layer. Returns [{data, n, signed, caption}].
 * kinds: edges | textures | parts | objects
 */
const mapsCache = new Map();
export function featureMaps(kind, res) {
  const key = `${kind}@${res}`;
  if (!mapsCache.has(key)) mapsCache.set(key, computeFeatureMaps(kind, res));
  return mapsCache.get(key); // callers only read the maps, so sharing them is safe
}

function computeFeatureMaps(kind, res) {
  const g = gray();
  const { rgba } = getScene();
  let maps;
  if (kind === 'edges') {
    const opp = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) opp[i] = (rgba[i * 4 + 2] - (rgba[i * 4] + rgba[i * 4 + 1]) / 2) / 255;
    maps = [
      { data: conv3(g, SOBEL_X), signed: true, caption: 'vertical edges' },
      { data: conv3(g, SOBEL_Y), signed: true, caption: 'horizontal edges' },
      { data: conv3(g, DIAG), signed: true, caption: 'diagonal edges' },
      { data: opp, signed: true, caption: 'blue ↔ yellow colour' },
    ];
  } else if (kind === 'textures') {
    const gx = conv3(g, SOBEL_X).map(Math.abs), gy = conv3(g, SOBEL_Y).map(Math.abs);
    const e = gx.map((v, i) => v + gy[i]);
    const corner = gx.map((v, i) => Math.sqrt(v * gy[i]));
    const fine = blur(e, 2);
    const gxBlur = blur(gx, 2); // hoisted: calling blur() inside map() re-blurred the image once per pixel
    const stripes = blur(gy, 2).map((v, i) => Math.max(0, v - gxBlur[i]));
    const flat = blur(e, 3).map((v) => Math.exp(-v * 6));
    maps = [
      { data: fine, caption: 'busy texture (leaves, grass)' },
      { data: stripes, caption: 'horizontal stripes (bricks)' },
      { data: blur(corner, 1), caption: 'corners & junctions' },
      { data: flat, caption: 'smooth regions (sky)' },
    ];
  } else if (kind === 'parts') {
    maps = [
      { data: blur(classMask(['window']), 2), caption: 'window-like' },
      { data: blur(classMask(['roof']), 2), caption: 'roof / triangle' },
      { data: blur(classMask(['door', 'trunk']), 2), caption: 'vertical post (door, trunk)' },
      { data: blur(classMask(['leaves']), 2), caption: 'foliage blob' },
    ];
  } else if (kind === 'objects') {
    maps = [
      { data: blur(objectMask([1]), 3), caption: '“house”' },
      { data: blur(objectMask([2, 3]), 3), caption: '“tree”' },
      { data: blur(classMask(['sky', 'sun', 'cloud']), 3), caption: '“sky”' },
      { data: blur(classMask(['grass']), 3), caption: '“ground”' },
    ];
  } else throw new Error(`unknown feature kind ${kind}`);
  return maps.map((m) => ({ ...m, data: pool(m.data, res), n: Math.min(res, N) }));
}

/* ------------------------- token / patch features ------------------------- */

const GROUP = { sky: 0, sun: 0, cloud: 0, grass: 1, wall: 2, roof: 2, door: 2, window: 2, trunk: 3, leaves: 3 };
const D = 8;
const EMB = CLASSES.map((c, ci) => {
  const v = new Float32Array(D); v[GROUP[c]] = 1;
  for (let k = 0; k < 4; k++) v[4 + k] = (hash(ci, k, 21) - 0.5) * 1.1; // part-specific detail
  return v;
});

/**
 * Patch features for a G×G token grid (G = N/p).
 * opts.noise   – 0..1, random per-patch noise (simulates degraded dense features)
 * opts.artifacts – number of high-norm outlier tokens in low-information patches
 * opts.global  – 0..1, how much every patch is pulled towards the image mean (loss of locality)
 */
export function patchFeatures(p = 8, { noise = 0, artifacts = 0, global = 0, seed = 1 } = {}) {
  const { cls } = getScene();
  const G = N / p;
  const F = [];
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    const f = new Float32Array(D);
    for (let y = gy * p; y < (gy + 1) * p; y++) for (let x = gx * p; x < (gx + 1) * p; x++) {
      const e = EMB[cls[y * N + x]]; for (let k = 0; k < D; k++) f[k] += e[k] / (p * p);
    }
    F.push(f);
  }
  const mean = new Float32Array(D); for (const f of F) for (let k = 0; k < D; k++) mean[k] += f[k] / F.length;
  F.forEach((f, i) => {
    for (let k = 0; k < D; k++) {
      f[k] = f[k] * (1 - global) + mean[k] * global;
      if (noise) f[k] += (hash(i, k, seed) - 0.5) * 2.2 * noise;
    }
  });
  if (artifacts) {
    // high-norm "register-like" tokens appear in redundant background (sky) patches
    const sky = []; F.forEach((_, i) => { const x = (i % G) * p + p / 2, y = Math.floor(i / G) * p + p / 2; if (cls[y * N + x] === 0) sky.push(i); });
    for (let a = 0; a < Math.min(artifacts, sky.length); a++) {
      const i = sky[Math.floor(hash(a, 3, 5) * sky.length)];
      for (let k = 0; k < D; k++) F[i][k] = mean[k] * 6 + 1.5;
    }
  }
  return { G, p, F };
}

const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (let k = 0; k < a.length; k++) { d += a[k] * b[k]; na += a[k] * a[k]; nb += b[k] * b[k]; } return d / Math.sqrt(na * nb + 1e-9); };
export const norm = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0));

/** Cosine similarity of every patch to patch q. */
export function similarity({ F }, q) { return Float32Array.from(F, (f) => cos(f, F[q])); }

/**
 * Attention from query patch q. depth (0..1) blends local/positional attention
 * (early layers) into semantic attention (late layers).
 */
export function attention({ G, F }, q, depth = 1, temp = 0.12) {
  const qx = q % G, qy = Math.floor(q / G), sigma = Math.max(0.8, G / 9);
  const logits = F.map((f, i) => {
    const dx = (i % G) - qx, dy = Math.floor(i / G) - qy;
    const pos = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    const dot = f.reduce((s, v, k) => s + v * F[q][k], 0) / Math.sqrt(F[q].reduce((s, v) => s + v * v, 0) + 1e-9);
    return (depth * dot + (1 - depth) * pos) / temp;
  });
  const m = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - m)); const z = e.reduce((a, b) => a + b, 0);
  return Float32Array.from(e, (v) => v / z);
}

/** Project features to 3 principal components → RGB in [0,1] per patch. */
export function pcaRGB({ F }) {
  const n = F.length, d = F[0].length;
  const mean = new Float32Array(d); for (const f of F) for (let k = 0; k < d; k++) mean[k] += f[k] / n;
  const X = F.map((f) => Float32Array.from(f, (v, k) => v - mean[k]));
  const C = Array.from({ length: d }, () => new Float32Array(d));
  for (const x of X) for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] += (x[i] * x[j]) / n;
  const comps = [];
  for (let c = 0; c < 3; c++) {
    let v = Float32Array.from({ length: d }, (_, k) => hash(c, k, 77) - 0.5);
    for (let it = 0; it < 60; it++) {
      const w = new Float32Array(d);
      for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) w[i] += C[i][j] * v[j];
      for (const u of comps) { const p = w.reduce((s, x, k) => s + x * u[k], 0); for (let k = 0; k < d; k++) w[k] -= p * u[k]; }
      const nn = norm(w) || 1; v = w.map((x) => x / nn);
    }
    comps.push(v);
  }
  const proj = comps.map((u) => X.map((x) => x.reduce((s, v, k) => s + v * u[k], 0)));
  const scaled = proj.map((p) => { const lo = Math.min(...p), hi = Math.max(...p), r = hi - lo || 1; return p.map((v) => 0.12 + 0.76 * ((v - lo) / r)); });
  return F.map((_, i) => [scaled[0][i], scaled[1][i], scaled[2][i]]);
}

/* ------------------------- concepts / instances ------------------------- */

const CONCEPTS = {
  house: () => [objectMask([1])],
  tree: () => [objectMask([2]), objectMask([3])],
  window: () => { const m = classMask(['window']); const a = new Float32Array(N * N), b = new Float32Array(N * N); m.forEach((v, i) => { if (v) ((i % N) < 60 ? a : b)[i] = 1; }); return [a, b]; },
  door: () => [classMask(['door'])],
  roof: () => [classMask(['roof'])],
  sun: () => [classMask(['sun'])],
  cloud: () => [classMask(['cloud'])],
  sky: () => [classMask(['sky'])],
  grass: () => [classMask(['grass'])],
};
export const CONCEPT_NAMES = Object.keys(CONCEPTS);

export function boxOf(mask) {
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  mask.forEach((v, i) => { if (v) { const x = i % N, y = Math.floor(i / N); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } });
  return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
}

/** All instances of a concept: [{mask, box}] (empty if absent from the scene). */
export function instances(concept) {
  const f = CONCEPTS[concept]; if (!f) return [];
  return f().map((mask) => ({ mask, box: boxOf(mask) }));
}

/** Draw the scene into a canvas element (pixelated) at native N×N. */
export function sceneCanvas() {
  const { rgba } = getScene();
  const c = document.createElement('canvas'); c.width = N; c.height = N; c.className = 'px';
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), N, N), 0, 0);
  return c;
}
