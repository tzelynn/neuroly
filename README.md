# neuroly

**Live site: https://tzelynn.github.io/neuroly/**

Interactive, animated explainers for modern vision networks. Each model page covers:

- **Architecture**: a tappable, animated diagram. Box height shows resolution and width shows channels.
- **What each stage sees**: feature maps, attention, patch similarity, PCA and masks, computed live on a toy image.
- **How it learns**: every loss with its formula and a small control to build intuition.
- **Techniques worth stealing**: what each trick is, why it works (with ablation numbers), and how to use it in your own projects.
- **Fine-tuning tips** and references.

Models so far: ResNet-50 · ViT · ConvNeXt · DINOv3 · SAM 3.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
node scripts/validate.mjs      # check all model files
```

There's no build step and there are no dependencies. Everything is vanilla ES modules, it works
offline once loaded, and widgets lazy-load and pause when off-screen, so pages stay light on phones.

## Add a model

With Claude Code, ask e.g. *"add CLIP to the site"*. The project skill
`.claude/skills/add-model` guides the agent through research, data, widgets, validation and
visual checks. By hand: copy `models/_template/model.js` to `models/<id>/model.js`, fill it in
(schema in `.claude/skills/add-model/reference/schema.md`), add the id to `models/registry.js`,
and run `node scripts/validate.mjs <id>`. Use `/dev/?model=<id>` to preview every view and widget at once.
