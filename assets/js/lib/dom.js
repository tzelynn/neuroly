// Tiny DOM helpers shared by every component and widget. No framework.

const SVGNS = 'http://www.w3.org/2000/svg';

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

function setAttrs(el, attrs, isSvg) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') isSvg ? el.setAttribute('class', v) : (el.className = v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) p.startsWith('--') ? el.style.setProperty(p, val) : (el.style[p] = val);
    }
    else el.setAttribute(k, v === true ? '' : v);
  }
}

/** h('div', {class:'x', onclick}, child, 'text', [more]) */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  setAttrs(el, attrs, false);
  append(el, kids);
  return el;
}

/** SVG element factory, same signature as h(). */
export function s(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  setAttrs(el, attrs, true);
  append(el, kids);
  return el;
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Read a CSS custom property from :root (theme-aware colours). */
export const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/* ---------- page scope: cleanup when the route changes ---------- */
const cleanups = new Set();
export const scope = {
  add(fn) { cleanups.add(fn); return fn; },
  flush() { for (const fn of cleanups) { try { fn(); } catch (e) { console.warn(e); } } cleanups.clear(); },
};

/**
 * Run fn(time, dt) on requestAnimationFrame only while `el` is on screen and
 * the tab is visible. Return false from fn to stop. Saves battery on mobile.
 */
export function animate(el, fn) {
  let raf = 0, last = 0, visible = false, done = false;
  const tick = (t) => {
    const dt = Math.min(50, t - (last || t));
    last = t;
    if (fn(t, dt) === false) { done = true; stop(); return; }
    raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!raf && !done && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); });
  io.observe(el);
  // Widgets mount only when near the viewport, so assume visible until the observer says otherwise.
  visible = true; start();
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  const api = {
    restart() { done = false; start(); },
    stop,
    destroy() { stop(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); },
  };
  scope.add(api.destroy);
  return api;
}

/** Call cb once when el first comes near the viewport (lazy work). */
export function whenVisible(el, cb, rootMargin = '250px') {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); cb(); }
  }, { rootMargin });
  io.observe(el);
  scope.add(() => io.disconnect());
}

/* ---------- small controls ---------- */

export function slider({ label, min = 0, max = 1, step = 0.01, value = 0, format = (v) => v, oninput }) {
  const out = h('output', {}, format(value));
  const input = h('input', { type: 'range', min, max, step, value, 'aria-label': label });
  input.addEventListener('input', () => { const v = +input.value; out.textContent = format(v); oninput && oninput(v); });
  const el = h('label', { class: 'ctl slider' }, h('span', { class: 'ctl-label' }, label), input, out);
  return {
    el,
    get: () => +input.value,
    set(v, fire = true) { input.value = v; out.textContent = format(+input.value); fire && oninput && oninput(+input.value); },
  };
}

/** Segmented button group. options: [{value,label}] or strings. */
export function segmented(options, value, onchange, ariaLabel = 'options') {
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  const el = h('div', { class: 'seg', role: 'tablist', 'aria-label': ariaLabel });
  const btns = opts.map((o) => h('button', {
    type: 'button', role: 'tab', class: o.value === value ? 'on' : '',
    'aria-selected': String(o.value === value),
    onclick: () => api.set(o.value),
  }, o.label));
  el.append(...btns);
  const api = {
    el,
    get: () => value,
    set(v, fire = true) {
      value = v;
      btns.forEach((b, i) => { const on = opts[i].value === v; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
      fire && onchange && onchange(v);
    },
  };
  return api;
}

export function toggle(label, checked, onchange) {
  const input = h('input', { type: 'checkbox' });
  input.checked = !!checked;
  input.addEventListener('change', () => onchange && onchange(input.checked));
  return { el: h('label', { class: 'ctl toggle' }, input, h('span', {}, label)), get: () => input.checked, set(v) { input.checked = v; onchange && onchange(v); } };
}

export const button = (label, onclick, cls = '') => h('button', { type: 'button', class: `btn ${cls}`, onclick }, label);

/** Standard widget frame: optional caption, a stage area, a controls row, a readout. */
export function frame(el, { caption } = {}) {
  const stage = h('div', { class: 'w-stage' });
  const controls = h('div', { class: 'w-controls' });
  const readout = h('div', { class: 'w-readout', 'aria-live': 'polite' });
  el.append(stage, controls, readout);
  if (caption) el.append(h('p', { class: 'w-caption' }, caption));
  return { stage, controls, readout };
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const fmt = (v, d = 2) => Number(v).toFixed(d);
