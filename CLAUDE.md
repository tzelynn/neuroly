# Neuroly

Interactive, animated explainers for vision neural networks: architecture, the features each stage
extracts, losses, and reusable training techniques. Static site for GitHub Pages: **vanilla ES
modules, no build step, no dependencies.**

## Layout
- `index.html`, `assets/css/style.css`: shell and theme (CSS variables, light/dark).
- `assets/js/app.js`: hash router (`#/<modelId>/<section>`), home page, model page shell.
- `assets/js/components/`: section renderers (`sections.js`), `architecture.js` (interactive
  diagram), `features.js` (per-stage feature views).
- `assets/js/widgets/<name>.js`: lazy-loaded interactive widgets, `export default mount(el, props)`.
- `assets/js/lib/`: `dom.js` (helpers, `animate`, controls), `scene.js` (procedural toy image and
  feature simulation), `patchviz.js`, `canvas.js`.
- `models/<id>/model.js`: **pure data** per model. `models/registry.js` sets the order.
- `scripts/validate.mjs`: schema checker (`node scripts/validate.mjs [id]`).
- `dev/index.html` (all views and widgets expanded, `?model=` / `?widget=`) and `dev/mobile.html?page=<id>`.

## Adding or updating a model
Use the **`add-model` skill** (`.claude/skills/add-model/SKILL.md`). In short: research the paper
and repo → copy `models/_template/model.js` → reuse widgets → register → validate → screenshot.

## Rules
- Keep it light: no frameworks, CDNs or model weights. Widgets compute on the 112×112 toy scene in
  well under 20 ms. Animations use `animate()`, which pauses off-screen.
- Facts must come from the paper or official repo. Label simulated visuals as illustrative.
- Use theme colours via CSS variables. Layouts must work at 340 px wide.
- Run `node scripts/validate.mjs` before committing (CI runs it too).
- Local preview: `python3 -m http.server 8000`, then open http://localhost:8000.
