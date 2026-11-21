# Model data schema

`models/<id>/model.js` must `export default { … }` a plain object (no imports, no DOM).
Strings marked *(html)* accept inline `<b> <i> <code> <sub> <sup> <br>`.

## Top level

| field | req | type | notes |
|---|---|---|---|
| `id` | ✓ | string | equals folder name |
| `name` | ✓ | string | page title, e.g. "Vision Transformer (ViT-B/16)" |
| `short` | | string | tab label (defaults to `name`) |
| `year`, `org` | ✓ | number, string | |
| `family` | ✓ | string | e.g. "CNN", "Transformer", "Self-supervised ViT" |
| `task` | ✓ | string | |
| `params` | | string | e.g. "86M params" |
| `tags` | | string[] | small chips |
| `buildsOn` | | id[] | prerequisite model ids (learning path) |
| `tagline` | ✓ | string | one or two sentences: the big idea |
| `paper` | ✓ | `{title, url}` | |
| `code` | | url | official repo |
| `facts` | | `[{value, label}]` | 3–4 headline numbers |
| `takeaways` | ✓ | string[] *(html)* | 4–6 learning outcomes |
| `sections` | ✓ | Section[] | rendered in order; the TOC is generated |

Every section accepts `title`, `intro` *(html)*, `id` (anchor) and `nav` (short TOC label), which
override the defaults.

## Section types

### `architecture`
```js
{ type: 'architecture', intro, caption, stages: [Stage, …] }
```
Stage:
| field | notes |
|---|---|
| `name` ✓ | block label |
| `kind` | `io` · `conv` · `attn` · `norm` (pool/norm/embed) · `head` · `misc` (sets colour) |
| `shape` | `[H, W, C]` of the stage output. Box height ∝ log2(H), width ∝ log2(C). For token sequences use the token grid, e.g. `[14,14,768]`, plus `tokens: true` (label shows `196×768`) |
| `label` | overrides the shape label (e.g. `'197×768'`, `'1000 classes'`) |
| `repeat` | number of stacked blocks (shows ×n) |
| `side` | short chip above the block for a side input (≤ 25 chars), e.g. `'text prompt'` |
| `summary` ✓ *(html)* | what the stage does |
| `learns` *(html)* | **what features it extracts**: always fill this in |
| `ops` | string[]: ops inside the block, top to bottom |
| `skip` | `true` or a string: draws a residual bracket |
| `opsTitle`, `params`, `details` *(html)* | optional extras |
| `widget` | `{name, props}` shown in the detail panel |

### `features`
```js
{ type: 'features', intro, note, stages: [{ label, view, caption, …opts }] }
```
Views (all computed live on the 112×112 toy scene):
| view | shows | options |
|---|---|---|
| `input` | the image | |
| `edges` | 4 real conv-filter maps (oriented edges, colour opponent) | `res` |
| `textures` | texture, stripes, corners, smooth | `res` |
| `parts` | window, roof, post, foliage detectors | `res` |
| `objects` | house, tree, sky, ground | `res` |
| `attention` | tap a patch to see its attention | `depth` 0 (local) … 1 (semantic), `artifacts` (high-norm tokens, n), `patch` (px, default 8 → 14×14) |
| `similarity` | cosine similarity to the tapped patch | `noise` 0–1, `global` 0–1 (loss of locality) |
| `pca` | top-3 PCA of patch features as RGB | `noise`, `global`, `artifacts` |
| `concept` | prompt-conditioned heat map | `concepts: string[]` |
| `masks` | instance masks per concept | `concepts: string[]` |

`res` should divide 112: use 112, 56, 28, 14, 7 or 4 (treat 112 as "224-px input ÷ 2", so a
ResNet stage at 56×56 uses `res: 56`). Scene concepts: house, tree (×2), window (×2), door, roof,
sun, cloud, sky, grass. Anything else counts as absent, which is useful for showing absence.

### `losses`
```js
{ type: 'losses', intro, items: [{ name, weight, formula /*html*/, terms: [[sym, desc], …], explain /*html*/, intuition, widget }] }
```

### `techniques`
```js
{ type: 'techniques', items: [{ name, tag, what, why, apply /*all html*/, widget }] }
```
`why` should cite evidence (ablation numbers). `apply` is advice for the reader's *own* projects.

### `widget`
```js
{ type: 'widget', id, title, nav, intro, widget: {name, props}, caption }
```
A standalone interactive section for a model's signature idea.

### `tips`
```js
{ type: 'tips', intro, items: [{ title, body /*html*/ }] }   // using & fine-tuning
```

### `references`
```js
{ type: 'references', items: [{ label, url, note }] }
```
