// Interactive architecture diagram.
// Box height ∝ log2(spatial resolution), width ∝ log2(channels) — so you can
// *see* a CNN trading resolution for channels, or a ViT staying isotropic.
import { h, button, scope, reducedMotion } from '../lib/dom.js';
import { widgetSlot } from '../lib/widgets.js';

const KIND = {
  io: ['--k-norm', 'input / output'],
  conv: ['--k-conv', 'convolution'],
  attn: ['--k-attn', 'attention / transformer'],
  norm: ['--k-norm', 'pool / norm / embed'],
  head: ['--k-head', 'head'],
  misc: ['--k-misc', 'other'],
};

function shapeLabel(st) {
  if (st.label) return st.label;
  if (!st.shape) return '';
  const [H, W, C] = st.shape;
  if (st.tokens) return `${H * W}×${C}`;
  return `${H}×${W}×${C}`;
}

function boxSize(st) {
  if (!st.shape) return [30, 60];
  const [H, , C] = st.shape;
  const hgt = Math.max(28, Math.min(132, 22 + 13 * Math.log2(Math.max(1, H))));
  const wid = Math.max(12, Math.min(64, 4 + 5 * Math.log2(Math.max(1, C))));
  return [wid, hgt];
}

export function architecture(sec) {
  const stages = sec.stages;
  let active = 0, timer = 0;

  const usedKinds = [...new Set(stages.map((s) => s.kind || 'misc'))];
  const playBtn = button('▶ Play', () => (timer ? stop() : play()), 'primary');
  const bar = h('div', { class: 'arch-bar' },
    playBtn,
    button('‹', () => { stop(); select(Math.max(0, active - 1)); }, 'icon'),
    button('›', () => { stop(); select(Math.min(stages.length - 1, active + 1)); }, 'icon'),
    h('span', { class: 'muted small' }, 'Tap a block'),
    h('div', { class: 'legend' }, ...usedKinds.map((k) => h('span', {}, h('i', { style: { background: `var(${KIND[k]?.[0] || '--k-misc'})` } }), KIND[k]?.[1] || k))),
  );

  const track = h('div', { class: 'arch-track', role: 'list' });
  const nodes = [], links = [];
  stages.forEach((st, i) => {
    if (i > 0) { const l = h('div', { class: 'arch-link', 'aria-hidden': 'true' }, h('span', { class: 'pulse' })); links.push(l); track.append(l); }
    const [w, hh] = boxSize(st);
    const node = h('button', {
      class: 'arch-node', type: 'button', role: 'listitem', 'aria-label': `${st.name}, ${shapeLabel(st)}`,
      style: { '--w': `${w}px`, '--h': `${hh}px`, '--kc': `var(${KIND[st.kind || 'misc']?.[0] || '--k-misc'})` },
      onclick: () => { stop(); select(i); },
    },
    st.side && h('span', { class: 'arch-side' }, st.side),
    st.repeat && h('span', { class: 'arch-rep' }, `×${st.repeat}`),
    h('div', { class: 'arch-box' }),
    h('div', { class: 'arch-name' }, st.name),
    h('div', { class: 'arch-shape' }, shapeLabel(st)));
    nodes.push(node); track.append(node);
  });

  const detail = h('div', { class: 'arch-detail', 'aria-live': 'polite' });

  function renderDetail(st) {
    const left = h('div', {},
      h('h3', {}, st.name),
      h('div', { class: 'sub' }, [shapeLabel(st) && `out: ${shapeLabel(st)}`, st.repeat && `repeated ×${st.repeat}`, st.params && `params: ${st.params}`].filter(Boolean).join(' · ')),
      h('p', { html: st.summary || '' }),
      st.learns && h('div', { class: 'learns', html: `<b>Learns:</b> ${st.learns}` }),
      st.details && h('p', { class: 'muted small', style: { marginTop: '10px' }, html: st.details }),
    );
    const right = h('div', {});
    if (st.ops?.length) {
      const ops = h('div', { class: `ops ${st.skip ? 'skip' : ''}` });
      st.ops.forEach((o, i) => { if (i) ops.append(h('div', { class: 'arrow' })); ops.append(h('div', { class: 'op' }, o)); });
      if (st.skip) ops.append(h('div', { class: 'plus' }, typeof st.skip === 'string' ? st.skip : '⊕ add input (skip connection)'));
      right.append(h('div', { class: 'ops-title' }, st.opsTitle || 'Inside the block'), ops);
    }
    if (st.widget) right.append(widgetSlot(st.widget));
    detail.replaceChildren(left, right);
  }

  function select(i, fromPlay = false) {
    nodes[active]?.classList.remove('on');
    active = i;
    nodes[i].classList.add('on');
    if (fromPlay && i > 0 && !reducedMotion()) {
      const l = links[i - 1]; l.classList.remove('flow'); void l.offsetWidth; l.classList.add('flow');
    }
    const n = nodes[i];
    const target = n.offsetLeft - track.clientWidth / 2 + n.clientWidth / 2;
    track.scrollTo({ left: target, behavior: reducedMotion() ? 'auto' : 'smooth' });
    renderDetail(stages[i]);
  }

  function play() {
    playBtn.textContent = '❚❚ Pause';
    if (active >= stages.length - 1) select(0, true);
    timer = setInterval(() => {
      if (active >= stages.length - 1) { stop(); return; }
      select(active + 1, true);
    }, 2600);
  }
  function stop() { clearInterval(timer); timer = 0; playBtn.textContent = '▶ Play'; }
  scope.add(stop);

  const root = h('div', { class: 'arch' }, bar, track, detail);
  select(0);
  if (sec.caption) root.append(h('p', { class: 'w-caption', style: { padding: '0 18px 14px' }, html: sec.caption }));
  return root;
}
