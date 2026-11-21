// Generic horizontal bar chart — reuse for parameter counts, accuracies, ablations.
// props: { title?, unit?, items: [{label, value, highlight?, note?}], max?, decimals?, caption? }
import { h } from '../lib/dom.js';

export default function mount(el, { title, unit = '', items = [], max, decimals = 0, caption } = {}) {
  const M = max ?? Math.max(...items.map((i) => i.value));
  if (title) el.append(h('div', { class: 'ops-title' }, title));
  const fills = [];
  el.append(h('div', { class: 'bars' }, ...items.map((it) => {
    const fill = h('div', { class: 'fill', style: { width: '0%' } });
    fills.push([fill, (it.value / M) * 100]);
    return h('div', { class: `bar-row ${it.highlight ? 'hl' : ''}` },
      h('span', {}, it.label, it.note ? h('span', { class: 'muted small' }, ` ${it.note}`) : null),
      h('div', { class: 'track' }, fill),
      h('span', { class: 'val' }, `${it.value.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}${unit ? ` ${unit}` : ''}`));
  })));
  if (caption) el.append(h('p', { class: 'w-caption', html: caption }));
  // widgets mount lazily as they approach the viewport, so a short delay is enough to animate the fill in
  setTimeout(() => fills.forEach(([f, w]) => { f.style.width = `${Math.max(0.5, w)}%`; }), 120);
}
