# Widget catalog

Reference widgets as `{ name: '<file name>', props: { … } }`. All are lazy-loaded and pause
off-screen. Preview any widget with `/dev/?widget=<name>`.

## Generic (reuse freely)

| name | what it shows | props |
|---|---|---|
| `bar-chart` | animated horizontal bars: params, accuracies, ablations | `title`, `unit`, `items:[{label, value, highlight?, note?}]`, `max?`, `decimals?`, `caption?` |
| `cross-entropy` | softmax probabilities, −log p curve, label-smoothing toggle | `classes: string[]` (first = true class), `smoothing` (bool, show toggle), `eps` |
| `receptive-field` | theoretical vs effective receptive field per stage on the image | `stages:[{name, rf}]`, `input` (px the rf refers to, default 224) |
| `residual-gradient` | gradient magnitude per layer, plain vs residual, depth slider | – |
| `batchnorm` | real forward pass: activation histograms under bad init / He init / BN | – |
| `stochastic-depth` | DropPath: blocks randomly skipped each step | `blocks`, `pmax` |
| `mixup-cutmix` | mixes two images and their labels | – |
| `patchify` | image → patch tokens with a cost readout | `input` (224), `sizes` ([32,16,8]), `initial` |
| `attention-matrix` | softmax(q·k/τ) over 7 named tokens, temperature slider | – |
| `position-embedding` | learned absolute vs RoPE similarity patterns | `mode: 'learned'|'rope'`, `both` (show toggle), `G` |
| `multi-crop` | global/local crops, teacher vs student views | `globals`, `locals`, `globalScale`, `localScale`, `globalPx`, `localPx` |
| `dino-distill` | collapse vs centering vs Sinkhorn-Knopp, teacher temperature | `modes` (subset of `['none','center','sk']`), `initial` |
| `masked-patches` | masked-patch prediction (iBOT/MAE-style) targets | `G`, `ratio` |
| `koleo` | live KoLeo spreading on the unit circle | `n` |
| `hungarian` | DETR bipartite matching with a cost matrix | – |
| `focal-dice` | focal loss vs CE curve (γ slider) and Dice overlap | – |

## Model-specific (useful as templates)

| name | model | notes |
|---|---|---|
| `convnext-roadmap` | ConvNeXt | stepper through design changes, accuracy line chart. Copy the pattern for any "ablation path" paper |
| `gram-anchoring` | DINOv3 | iteration slider; dense vs global curves; Gram matrices; patch-similarity map |
| `presence-head` | SAM 3 | prompt chips, query scores × presence, threshold. Pattern for open-vocabulary detectors |
| `tracker` | SAM 3 | toy video: detections, memory propagation, masklet score timeline |

## Shared helpers for new widgets

- `lib/dom.js`: `h()` (HTML) and `s()` (SVG) element factories, `frame(el,{caption})` →
  `{stage, controls, readout}`, `slider`, `segmented`, `toggle`, `button`, `animate(el, fn)`,
  `scope.add(cleanup)`, `fmt`, `clamp`, `lerp`.
- `lib/scene.js`: `N` (=112), `getScene()` (`rgba`, `cls`, `obj`), `featureMaps(kind,res)`,
  `patchFeatures(p,{noise,global,artifacts})`, `attention(f,q,depth)`, `similarity(f,q)`,
  `pcaRGB(f)`, `instances(concept)` → `[{mask, box}]`, `sceneCanvas()`, `conv3`, `blur`, `pool`,
  `hash`.
- `lib/patchviz.js`: `patchOverlay({G, onPick})` → `{el, draw(values, 'spot'|'heat'|'rgb', q), drawMasks([{mask, box, color, label}]), ctx, size}`.
- `lib/canvas.js`: `makeCanvas`, `mapCanvas(values,w,h,{signed})`, `viridis`, `diverging`, `normalize`.
