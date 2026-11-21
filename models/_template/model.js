// TEMPLATE — copy to models/<id>/model.js, fill every TODO, add <id> to models/registry.js,
// then run `node scripts/validate.mjs <id>`. Folders starting with "_" are ignored by the site.
// Schema: .claude/skills/add-model/reference/schema.md · Widgets: .../reference/widgets.md
export default {
  id: 'TODO-id', // must equal the folder name
  name: 'TODO Full Name',
  short: 'TODO', // tab label
  year: 2025,
  org: 'TODO lab',
  family: 'TODO (CNN | Transformer | Self-supervised ViT | …)',
  task: 'TODO task',
  params: 'TODO params',
  tags: ['TODO'],
  buildsOn: [], // prerequisite model ids, e.g. ['vit']
  tagline: 'TODO: one or two sentences with the big idea.',
  paper: { title: 'TODO', url: 'https://arxiv.org/abs/TODO' },
  code: 'https://github.com/TODO',
  facts: [
    { value: 'TODO', label: 'headline number' },
  ],

  takeaways: [
    'TODO: how <b>technique A</b> works and why it helps.',
    'TODO: what features each stage extracts.',
    'TODO: the loss(es) and what they optimise.',
    'TODO: what you can reuse in your own projects.',
  ],

  sections: [
    {
      type: 'architecture',
      intro: 'TODO: one paragraph orienting the reader.',
      stages: [
        { name: 'Input', kind: 'io', shape: [224, 224, 3], summary: 'TODO', learns: '—' },
        { name: 'TODO block', kind: 'conv', shape: [56, 56, 256], repeat: 3, skip: true, ops: ['TODO op 1', 'TODO op 2'], summary: 'TODO', learns: 'TODO: what features this stage extracts.' },
        { name: 'Head', kind: 'head', shape: [1, 1, 1000], label: '1000 classes', summary: 'TODO', learns: 'TODO' },
      ],
      caption: 'TODO: variant / shape notes.',
    },
    {
      type: 'features',
      intro: 'TODO',
      stages: [
        { label: 'Input', view: 'input' },
        { label: 'Early', view: 'edges', res: 56, caption: 'TODO' },
        { label: 'Late', view: 'objects', res: 7, caption: 'TODO' },
      ],
    },
    {
      type: 'losses',
      intro: 'TODO',
      items: [
        {
          name: 'TODO loss',
          formula: 'ℒ = −log <i>p<sub>y</sub></i>',
          terms: [['p<sub>y</sub>', 'TODO']],
          explain: 'TODO',
          widget: { name: 'cross-entropy', props: { classes: ['a', 'b', 'c'] } },
        },
      ],
    },
    {
      type: 'techniques',
      items: [
        { name: 'TODO technique', tag: 'core idea', what: 'TODO', why: 'TODO (cite the ablation number)', apply: 'TODO: concrete advice for the reader\'s own project' },
      ],
    },
    {
      type: 'tips',
      items: [
        { title: 'TODO', body: 'TODO: using / fine-tuning advice from the paper or repo.' },
      ],
    },
    {
      type: 'references',
      items: [
        { label: 'TODO paper', url: 'https://arxiv.org/abs/TODO' },
      ],
    },
  ],
};
