// ConvNeXt's "modernising a ResNet" roadmap (Liu et al. 2022, Fig. 2).
// Step through each design change and watch the block and accuracy evolve.
import { h, s, frame, button, scope } from '../lib/dom.js';

const RES = ['1×1 conv (reduce)', 'BN · ReLU', '3×3 conv', 'BN · ReLU', '1×1 conv (expand)', 'BN', '⊕ skip · ReLU'];
const STEPS = [
  { name: 'ResNet-50 baseline', acc: 76.1, group: 'start', stem: '7×7 conv s2 + max-pool', ratio: '3 : 4 : 6 : 3', ops: RES, note: 'The original 90-epoch SGD recipe.' },
  { name: 'Modern training recipe', acc: 78.8, group: 'training', ops: RES, note: '300 epochs with AdamW, Mixup, CutMix, RandAugment, Random Erasing, stochastic depth and label smoothing. +2.7% before any architecture change. Much of the reported "Transformer advantage" was really training.' },
  { name: 'Stage ratio 3:3:9:3', acc: 79.4, group: 'macro', ratio: '3 : 3 : 9 : 3', ops: RES, note: 'Matches Swin-T\'s 1:1:3:1 compute distribution and puts more blocks in the 14×14 stage.' },
  { name: '“Patchify” stem', acc: 79.5, group: 'macro', stem: '4×4 conv, stride 4', ops: RES, note: 'Replaces the 7×7 conv + max-pool with non-overlapping 4×4 patches, as in ViT and Swin.' },
  { name: 'Depthwise conv + width 96', acc: 80.5, group: 'ResNeXt', ops: ['1×1 conv (reduce)', 'BN · ReLU', '3×3 depthwise conv', 'BN · ReLU', '1×1 conv (expand)', 'BN', '⊕ skip · ReLU'], note: 'Depthwise conv mixes only spatially, one channel at a time, much like self-attention mixing tokens. The FLOPs saved go into width (64 → 96).' },
  { name: 'Inverted bottleneck', acc: 80.6, group: 'block', ops: ['1×1 conv (expand ×4)', 'BN · ReLU', '3×3 depthwise conv', 'BN · ReLU', '1×1 conv (reduce)', 'BN', '⊕ skip · ReLU'], note: 'Wide in the middle, narrow at the ends, like the Transformer MLP (4× expansion).' },
  { name: 'Move depthwise conv up', acc: 79.9, group: 'block', ops: ['3×3 depthwise conv', 'BN · ReLU', '1×1 conv (expand ×4)', 'BN · ReLU', '1×1 conv (reduce)', 'BN', '⊕ skip · ReLU'], note: 'Spatial mixing first, then the MLP, as attention comes before the MLP in a Transformer. Accuracy dips temporarily, but large kernels are now cheap because they run on the narrow tensor.' },
  { name: 'Kernel 7×7', acc: 80.6, group: 'block', ops: ['7×7 depthwise conv', 'BN · ReLU', '1×1 conv (expand ×4)', 'BN · ReLU', '1×1 conv (reduce)', 'BN', '⊕ skip · ReLU'], note: 'Matches Swin\'s 7×7 attention window. Gains saturate at 7×7.' },
  { name: 'ReLU → GELU', acc: 80.6, group: 'micro', ops: ['7×7 depthwise conv', 'BN · GELU', '1×1 conv (expand ×4)', 'BN · GELU', '1×1 conv (reduce)', 'BN', '⊕ skip'], note: 'No change in accuracy, but it matches Transformers.' },
  { name: 'Fewer activations', acc: 81.3, group: 'micro', ops: ['7×7 depthwise conv', 'BN', '1×1 conv (expand ×4)', 'BN · GELU', '1×1 conv (reduce)', 'BN', '⊕ skip'], note: 'Only one GELU per block, between the two 1×1 convs, exactly like a Transformer MLP. +0.7%.' },
  { name: 'Fewer norms', acc: 81.4, group: 'micro', ops: ['7×7 depthwise conv', 'BN', '1×1 conv (expand ×4)', 'GELU', '1×1 conv (reduce)', '⊕ skip'], note: 'A single norm layer per block.' },
  { name: 'BN → LayerNorm', acc: 81.5, group: 'micro', ops: ['7×7 depthwise conv', 'LayerNorm', '1×1 conv (expand ×4)', 'GELU', '1×1 conv (reduce)', '⊕ skip'], note: 'LN per position over channels. It is independent of batch size, which is helpful for detection and segmentation fine-tuning.' },
  { name: 'Separate downsampling', acc: 82.0, group: 'micro', ops: ['7×7 depthwise conv', 'LayerNorm', '1×1 conv (expand ×4)', 'GELU', '1×1 conv (reduce)', 'layer scale γ', '⊕ skip'], note: 'Between stages: LN, then a 2×2 conv with stride 2, instead of striding inside a block. The normalisation keeps training stable. This is ConvNeXt-T: 82.0%, above Swin-T\'s 81.3% at similar FLOPs.' },
];

export default function mount(el) {
  const { stage, controls, readout } = frame(el, { caption: 'Each step is one experiment from the paper (ImageNet-1k top-1, ResNet-50 / ConvNeXt-T scale). Highlighted ops changed in that step.' });
  let i = 0, timer = 0;
  const left = h('div', { style: { flex: '1 1 240px', minWidth: '220px' } });
  const svg = s('svg', { class: 'viz', viewBox: '0 0 320 190', style: 'flex:1 1 280px;max-width:380px' });
  stage.style.alignItems = 'flex-start';
  stage.append(left, svg);

  const W = 320, X0 = 34, Y0 = 12, PW = 276, PH = 140, lo = 75.5, hi = 82.5;
  const X = (k) => X0 + (k / (STEPS.length - 1)) * PW, Y = (a) => Y0 + PH - ((a - lo) / (hi - lo)) * PH;

  function cur(key) { for (let k = i; k >= 0; k--) if (STEPS[k][key]) return STEPS[k][key]; return ''; }

  function draw() {
    const st = STEPS[i], prev = STEPS[i - 1];
    const ops = h('div', { class: 'ops skip' });
    st.ops.forEach((o, k) => {
      if (k) ops.append(h('div', { class: 'arrow' }));
      const changed = prev && prev.ops[k] !== o;
      ops.append(h('div', { class: 'op', style: changed ? { borderColor: 'var(--k-attn)', background: 'color-mix(in srgb, var(--k-attn) 14%, var(--surface))' } : {} }, o));
    });
    left.replaceChildren(
      h('div', { class: 'eyebrow' }, `step ${i}/${STEPS.length - 1} · ${st.group}`),
      h('h3', {}, st.name),
      h('div', { class: 'small muted', style: { marginBottom: '8px' } }, `stem: ${cur('stem')} · blocks per stage: ${cur('ratio')}`),
      ops,
    );
    svg.replaceChildren(
      s('line', { x1: X0, y1: Y0 + PH, x2: X0 + PW, y2: Y0 + PH, stroke: 'var(--line)' }),
      ...[76, 78, 80, 82].map((a) => s('g', {}, s('line', { x1: X0, x2: X0 + PW, y1: Y(a), y2: Y(a), stroke: 'var(--line)', 'stroke-dasharray': '2 4' }), s('text', { x: X0 - 6, y: Y(a) + 4, 'text-anchor': 'end' }, a))),
      s('polyline', { points: STEPS.slice(0, i + 1).map((t, k) => `${X(k)},${Y(t.acc)}`).join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }),
      s('polyline', { points: STEPS.map((t, k) => `${X(k)},${Y(t.acc)}`).join(' '), fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.5 }),
      ...STEPS.map((t, k) => s('circle', { cx: X(k), cy: Y(t.acc), r: k === i ? 6 : 3, fill: k <= i ? 'var(--accent)' : 'var(--surface)', stroke: 'var(--accent)', style: 'cursor:pointer', onclick: () => { stopPlay(); i = k; draw(); } })),
      s('text', { x: X(i), y: Y(st.acc) - 12, 'text-anchor': i > 9 ? 'end' : 'middle', class: 'ink mono', style: 'font-weight:600' }, `${st.acc}%`),
      s('text', { x: X0 + PW / 2, y: 182, 'text-anchor': 'middle' }, 'design step →'),
    );
    readout.innerHTML = st.note;
  }
  function stopPlay() { clearInterval(timer); timer = 0; playBtn.textContent = '▶ Play'; }
  const playBtn = button('▶ Play', () => {
    if (timer) return stopPlay();
    if (i === STEPS.length - 1) i = 0;
    playBtn.textContent = '❚❚ Pause'; draw();
    timer = setInterval(() => { if (i >= STEPS.length - 1) return stopPlay(); i++; draw(); }, 2200);
  }, 'primary');
  scope.add(stopPlay);
  controls.append(playBtn, button('‹ prev', () => { stopPlay(); i = Math.max(0, i - 1); draw(); }), button('next ›', () => { stopPlay(); i = Math.min(STEPS.length - 1, i + 1); draw(); }));
  draw();
}
