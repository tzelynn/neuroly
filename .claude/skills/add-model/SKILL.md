---
name: add-model
description: Add a new neural-network model page to the Neuroly site (interactive architecture, feature, loss and technique explainers). Use when the user asks to add, create or write up a model/architecture/paper (e.g. "add CLIP", "add a page for YOLOv8", "explain Mask2Former on the site"), or to update an existing model page with new research.
---

# Add a model to Neuroly

Neuroly is a static, no-build site. A model page is **pure data** (`models/<id>/model.js`) that
shared components render. Interactive pieces are small **widgets** (`assets/js/widgets/<name>.js`)
referenced by name. Most new models need *zero* new code: write the data file and reuse widgets.

Read `reference/schema.md` (the data format) and `reference/widgets.md` (reusable widgets and
their props) in this skill folder before writing. Look at one existing model as a style guide:
`models/resnet50/model.js` (CNN), `models/vit/model.js` (transformer), `models/dinov3/model.js`
(self-supervised), `models/sam3/model.js` (detection/segmentation).

## Workflow

1. **Research first — never write from memory alone.**
   - Read the paper (arXiv abs + HTML full text) and the official repo README (and training docs).
     For several models, or a recent/unfamiliar one, delegate research to a subagent per model with
     the checklist below and ask for a ≤900-word factual brief with unverified items marked.
   - Checklist: task & input/output; stage-by-stage architecture with tensor shapes (H×W×C or
     tokens×dim), block internals, param counts / FLOPs; every loss with its exact formula and
     weights; training recipe (data, optimiser, schedule, augmentation, stages); the 3–6 techniques
     that make it work *and the ablation numbers proving it*; headline results; official advice on
     using / fine-tuning it (resolution, normalisation, which layers, gotchas); links.
   - If a fact can't be verified, leave it out or label it approximate. Don't invent numbers.

2. **Create the data file**: copy `models/_template/model.js` to `models/<id>/model.js`
   (`id` = lowercase folder name, e.g. `clip`, `yolov8`). Fill in every section. Required
   sections, in order: `architecture`, `features`, `losses`, `techniques`, `tips`, `references`.
   Add `widget` sections for a model's signature idea (e.g. ConvNeXt's roadmap).

3. **Map content to the learning goals.** Each page must answer:
   - *How does it work?* → `architecture` stages, each with `summary`, `learns`, `ops`.
   - *What features are extracted at each stage?* → the `features` section (pick views per stage)
     and each stage's `learns` field.
   - *How does it learn?* → `losses`: formula (inline HTML), `terms`, `explain`, and a widget
     whenever one fits.
   - *What can I reuse?* → `techniques`: every item has `what` / `why` (with evidence) /
     `apply` (concrete advice for the reader's own projects), plus `tips` for fine-tuning.

4. **Reuse widgets** from `reference/widgets.md`. Only write a new widget when the model's key
   idea can't be shown with an existing one. Follow the widget contract (below) and add it to
   `reference/widgets.md`.

5. **Register** the id in `models/registry.js` (the order is the home page's learning path) and set
   `buildsOn` to prerequisite model ids.

6. **Validate**: `node scripts/validate.mjs <id>`. It must report 0 errors. It checks required
   fields, section and stage types, feature views, widget files, links, and imports every widget.

7. **Preview & check visually** (serve from the repo root):
   ```bash
   python3 -m http.server 8765          # run in background
   CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"   # or google-chrome / chromium
   "$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=1100,9000 --virtual-time-budget=6000 \
     --screenshot=/tmp/page.png "http://localhost:8765/#/<id>"
   "$CH" ... --screenshot=/tmp/gallery.png "http://localhost:8765/dev/?model=<id>"       # every view & widget expanded
   "$CH" ... --window-size=420,5000 --screenshot=/tmp/mobile.png "http://localhost:8765/dev/mobile.html?page=<id>"
   ```
   Crop tall screenshots (`sips -c <h> <w> --cropOffset <y> 0 in.png --out out.png` on macOS) and
   read them. Check text overflow, overlapping labels, empty widgets and the 375px layout. Headless
   Chrome barely advances `requestAnimationFrame` and CSS transitions, so animations may look
   frozen in screenshots. That's expected.

## Writing style

- Plain, concrete, short. Write for an ML practitioner who wants intuition plus transferable tricks.
- Lead with the *idea*, then the evidence (ablation numbers), then how to use it.
- `takeaways`: 4–6 learning outcomes, each naming a technique in **bold**.
- Inline HTML only: `<b> <i> <code> <sub> <sup> <br>`. Formulas use `<i>` for variables and
  Unicode math (Σ, ‖·‖, ∈, ⊤, ℒ, √).
- Be honest about illustrations. Feature maps and attention are computed on a toy scene; add a
  `note` to the `features` section when the simulation is loose, and call schematic charts "schematic".

## Widget contract (only if you need a new one)

```js
// assets/js/widgets/<kebab-name>.js
import { h, s, frame, slider, segmented, toggle, button, animate, fmt } from '../lib/dom.js';
export default function mount(el, props = {}) {
  const { stage, controls, readout } = frame(el, { caption: 'One or two sentences on what to try.' });
  // build DOM/SVG/canvas into `stage`, controls into `controls`, live text into `readout`
}
```
- No dependencies and no network. It must be importable in Node without a DOM: no DOM access at
  module top level.
- Performance budget: under ~20 ms per interaction; canvases ≤ 336 px internal size; use
  `animate(el, fn)` (pauses off-screen and in hidden tabs, so never use bare `requestAnimationFrame`
  loops); `setInterval` must be cleared via `scope.add(() => clearInterval(id))`.
- Theme: colours come from CSS variables (`var(--accent)`, `--ink`, `--ink-2`, `--line`,
  `--k-conv`, `--k-attn`, `--k-head`, `--good`, `--bad`) so dark mode works. Inside `<canvas>`,
  only use colours that read well on both themes.
- Mobile: layout must work at 340 px. Use `flex-wrap`, `max-width:100%`, and pointer events
  (not mouse events).
- Toy-scene helpers live in `assets/js/lib/scene.js` (`getScene`, `featureMaps`, `patchFeatures`,
  `attention`, `similarity`, `pcaRGB`, `instances`), `lib/patchviz.js` (clickable patch overlay,
  masks/boxes) and `lib/canvas.js` (colormaps, value maps).

## Adding a new section type or feature view

Rare. Section types: add a renderer in `assets/js/components/sections.js` (`RENDER` +
`SECTION_META`). Feature views: `assets/js/components/features.js`. Then update
`SECTION_TYPES` / `VIEWS` in `scripts/validate.mjs` and document it in `reference/schema.md`.
