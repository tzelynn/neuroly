// Gradient flow through a plain vs residual stack.
// Each plain layer scales the backward signal by a gain < 1 (≈ 0.8, jittered);
// a residual layer passes it through 1 + (gain − 1)·small. Product over depth.
import { h, frame, slider, segmented, fmt } from '../lib/dom.js';
import { hash } from '../lib/scene.js';

export default function mount(el) {
  let depth = 30, mode = 'plain';
  const { stage, controls, readout } = frame(el, { caption: 'Bars show the gradient size reaching each layer during backprop (log scale), from the loss on the right back to layer 1 on the left. Plain stacks multiply many factors below 1, so the signal vanishes. With skips, each block adds to an identity path instead.' });
  const row = h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '2px', height: '140px', width: '100%', padding: '0 4px', borderBottom: '1px solid var(--line)' } });
  const labels = h('div', { style: { display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '.75rem', color: 'var(--ink-3)', marginTop: '4px' } }, h('span', {}, 'layer 1 (input side)'), h('span', {}, 'loss →'));
  stage.append(h('div', { style: { width: '100%' } }, row, labels));

  function grads() {
    const g = new Array(depth); let acc = 1;
    for (let l = depth - 1; l >= 0; l--) {
      g[l] = acc;
      const gain = 0.78 + 0.12 * hash(l, 1, 4); // plain layer jacobian scale
      acc *= mode === 'plain' ? gain : 1 + (gain - 1) * 0.08 + 0.004;
    }
    return g;
  }

  function update() {
    const g = grads();
    row.replaceChildren(...g.map((v, i) => {
      const hgt = Math.max(2, ((Math.log10(v) + 5) / 5.2) * 100);
      const b = h('div', { title: `layer ${i + 1}: ${v.toExponential(1)}`, style: { flex: '1', height: '2%', background: v < 1e-2 ? 'var(--bad)' : 'var(--accent)', borderRadius: '2px 2px 0 0', transition: `height .35s ease ${((depth - i) * 12)}ms`, opacity: 0.85 } });
      setTimeout(() => { b.style.height = `${hgt}%`; }, 30);
      return b;
    }));
    readout.innerHTML = `Gradient reaching layer 1: <b>${g[0].toExponential(1)}</b> ${mode === 'plain' ? (g[0] < 1e-2 ? '<span style="color:var(--bad)">vanished: early layers barely learn</span>' : '') : '<span style="color:var(--good)">healthy: every layer gets signal</span>'}`;
  }

  controls.append(
    segmented([{ value: 'plain', label: 'Plain stack' }, { value: 'res', label: 'With skips' }], mode, (v) => { mode = v; update(); }).el,
    slider({ label: 'depth', min: 6, max: 100, step: 1, value: depth, format: (v) => `${v} layers`, oninput: (v) => { depth = v; update(); } }).el,
  );
  update();
}
