// Section renderers. A model file is a list of typed sections; each type maps
// to a renderer here. To add a new section type: add a renderer + SECTION_META
// entry, and document it in .claude/skills/add-model/reference/schema.md.
import { h } from '../lib/dom.js';
import { widgetSlot } from '../lib/widgets.js';
import { architecture } from './architecture.js';
import { features } from './features.js';

export const SECTION_META = {
  takeaways: { id: 'learn', title: 'What you’ll learn', nav: 'Overview', eyebrow: 'Learning outcomes' },
  architecture: { id: 'architecture', title: 'Architecture', eyebrow: 'Explore the network' },
  features: { id: 'features', title: 'What each stage sees', nav: 'Features', eyebrow: 'Feature extraction' },
  losses: { id: 'losses', title: 'How it learns', nav: 'Losses', eyebrow: 'Objectives' },
  techniques: { id: 'techniques', title: 'Techniques that aid learning', nav: 'Techniques', eyebrow: 'Tricks worth stealing' },
  widget: { eyebrow: 'Interactive' },
  tips: { id: 'finetune', title: 'Using & fine-tuning it', nav: 'Fine-tuning', eyebrow: 'In practice' },
  references: { id: 'refs', title: 'References', nav: 'Refs' },
};

const RENDER = {
  takeaways: (s) => h('ol', { class: 'takeaways' }, ...s.items.map((t) => h('li', { html: t }))),
  architecture,
  features,
  losses: (s) => h('div', { class: 'stack' }, ...s.items.map((l) => h('div', { class: 'panel loss' },
    h('h3', {}, l.name, l.weight && h('span', { class: 'chip' }, l.weight)),
    l.formula && h('div', { class: 'formula', html: l.formula }),
    l.terms && h('dl', { class: 'terms' }, ...l.terms.flatMap(([sym, desc]) => [h('dt', { html: sym }), h('dd', { html: desc })])),
    h('p', { html: l.explain }),
    l.intuition && h('p', { class: 'muted small', html: `<b>Intuition:</b> ${l.intuition}` }),
    widgetSlot(l.widget),
  ))),
  techniques: (s) => h('div', { class: 'stack' }, ...s.items.map((t) => h('div', { class: 'panel tech' },
    h('h3', {}, t.name, t.tag && h('span', { class: 'chip' }, t.tag)),
    h('div', { class: 'tech-grid' },
      h('div', {}, h('span', { class: 'lbl' }, 'What'), h('span', { html: t.what })),
      h('div', {}, h('span', { class: 'lbl' }, 'Why it helps'), h('span', { html: t.why })),
      h('div', { class: 'apply' }, h('span', { class: 'lbl' }, 'Use it in your project'), h('span', { html: t.apply })),
    ),
    widgetSlot(t.widget),
  ))),
  widget: (s) => h('div', { class: 'panel' }, widgetSlot(s.widget), s.caption && h('p', { class: 'w-caption', html: s.caption })),
  tips: (s) => h('div', { class: 'tips' }, ...s.items.map((t) => h('div', { class: 'panel' }, h('h3', {}, t.title), h('p', { html: t.body })))),
  references: (s) => h('ol', { class: 'refs' }, ...s.items.map((r) => h('li', {}, h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.label), r.note && h('span', { class: 'muted' }, ` — ${r.note}`)))),
};

export const SECTION_TYPES = Object.keys(RENDER);

export function renderSection(sec, model) {
  const r = RENDER[sec.type];
  if (!r) return h('p', { class: 'muted' }, `Unknown section type “${sec.type}”.`);
  return r(sec, model);
}
