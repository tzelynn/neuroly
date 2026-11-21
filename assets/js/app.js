// Entry point: hash router, home page, model page shell.
import { h, scope } from './lib/dom.js';
import { renderSection, SECTION_META } from './components/sections.js';
import registry from '../../models/registry.js';

const app = document.getElementById('app');
const tabs = document.getElementById('tabs');
let models = [];

async function boot() {
  models = await Promise.all(registry.map((id) => import(`../../models/${id}/model.js`).then((m) => m.default)));
  tabs.append(...models.map((m) => h('a', { href: `#/${m.id}`, 'data-id': m.id }, m.short || m.name)));
  addEventListener('hashchange', route);
  route();
}

function route() {
  scope.flush();
  const [id, section] = location.hash.replace(/^#\/?/, '').split('/');
  const model = models.find((m) => m.id === id);
  app.replaceChildren(model ? modelPage(model) : homePage());
  document.title = model ? `${model.name} — Neuroly` : 'Neuroly — see how vision models learn';
  for (const a of tabs.children) a.classList.toggle('on', a.dataset.id === id);
  const activeTab = tabs.querySelector('.on');
  if (activeTab) tabs.scrollTo({ left: activeTab.offsetLeft - 60, behavior: 'smooth' });
  if (model && section) requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView());
  else window.scrollTo(0, 0);
}

/* ------------------------------ home ------------------------------ */
function homePage() {
  const byId = Object.fromEntries(models.map((m) => [m.id, m]));
  return h('div', {},
    h('section', { class: 'home-hero' },
      h('div', { class: 'eyebrow' }, 'Interactive explainers'),
      h('h1', {}, 'See how vision networks learn.'),
      h('p', {}, 'Each model gets a page you can play with. It walks through the architecture stage by stage, shows the features each stage extracts, explains the losses that shape learning, and lists the training tricks you can reuse in your own projects.'),
    ),
    h('div', { class: 'how' },
      ...[
        ['Architecture', 'Tap through the network. Box height shows spatial resolution and width shows channels.'],
        ['What each stage sees', 'The features each layer extracts, computed live on a toy image.'],
        ['How it learns', 'Each loss function with a small control you can move to build intuition.'],
        ['Steal this', 'Each technique ends with notes on how to apply it to your own work.'],
      ].map(([t, d]) => h('div', { class: 'card' }, h('h3', {}, t), h('p', {}, d))),
    ),
    h('h2', {}, 'Learning path'),
    h('p', { class: 'muted small' }, 'Ordered so that each model builds on the ones before it.'),
    h('div', { class: 'path' }, ...models.map((m) => h('a', { class: 'card', href: `#/${m.id}` },
      h('div', { class: 'card-top' }, h('h3', {}, m.name), h('span', { class: 'muted small' }, `${m.year} · ${m.org}`)),
      h('p', {}, m.tagline),
      h('div', { class: 'chips' }, h('span', { class: 'chip accent' }, m.family), h('span', { class: 'chip' }, m.task), m.params && h('span', { class: 'chip' }, m.params)),
      m.buildsOn?.length ? h('div', { class: 'lineage' }, 'builds on', ...m.buildsOn.map((b) => h('span', { class: 'chip' }, byId[b]?.short || b))) : null,
    ))),
  );
}

/* ------------------------------ model ------------------------------ */
function modelPage(m) {
  const sections = [{ type: 'takeaways', items: m.takeaways }, ...m.sections];
  const ids = new Map();
  const toc = h('nav', { class: 'toc', 'aria-label': 'Sections' });
  const body = sections.map((sec) => {
    const meta = SECTION_META[sec.type] || {};
    let id = sec.id || meta.id || sec.type;
    while (ids.has(id)) id += '-2';
    ids.set(id, true);
    const title = sec.title || meta.title || sec.type;
    toc.append(h('a', { href: `#/${m.id}/${id}`, onclick: (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); history.replaceState(null, '', `#/${m.id}/${id}`); } }, sec.nav || meta.nav || title));
    return h('section', { class: 'block', id },
      meta.eyebrow && h('div', { class: 'eyebrow' }, meta.eyebrow),
      h('h2', {}, title),
      sec.intro && h('p', { class: 'intro', html: sec.intro }),
      renderSection(sec, m),
    );
  });

  // highlight the TOC entry for the section in view
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) for (const a of toc.children) a.classList.toggle('on', a.getAttribute('href').endsWith(`/${e.target.id}`));
  }, { rootMargin: '-40% 0px -55% 0px' });
  requestAnimationFrame(() => body.forEach((b) => io.observe(b)));
  scope.add(() => io.disconnect());

  return h('article', { class: 'model' },
    h('header', { class: 'hero' },
      h('div', { class: 'eyebrow' }, `${m.year} · ${m.org}`),
      h('h1', {}, m.name),
      h('p', { class: 'tagline' }, m.tagline),
      h('div', { class: 'meta' }, h('span', { class: 'chip accent' }, m.family), h('span', { class: 'chip' }, m.task), m.params && h('span', { class: 'chip' }, m.params), ...(m.tags || []).map((t) => h('span', { class: 'chip' }, t))),
      h('div', { class: 'links' }, m.paper && h('a', { href: m.paper.url, target: '_blank', rel: 'noopener' }, 'Paper ↗'), m.code && h('a', { href: m.code, target: '_blank', rel: 'noopener' }, 'Code ↗')),
      m.facts?.length ? h('div', { class: 'facts' }, ...m.facts.map((f) => h('div', { class: 'fact' }, h('b', {}, f.value), h('span', {}, f.label)))) : null,
    ),
    toc,
    ...body,
  );
}

boot().catch((e) => { app.replaceChildren(h('p', { class: 'loading' }, `Failed to load: ${e.message}`)); console.error(e); });
