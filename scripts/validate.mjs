#!/usr/bin/env node
// Validate every model file against the schema used by the renderer.
// Usage: node scripts/validate.mjs [modelId]
// Exit code 1 on any error. No dependencies.
import { readdir, access } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...p) => path.join(root, ...p);

const SECTION_TYPES = ['takeaways', 'architecture', 'features', 'losses', 'techniques', 'widget', 'tips', 'references'];
const KINDS = ['io', 'conv', 'attn', 'norm', 'head', 'misc'];
const VIEWS = ['input', 'edges', 'textures', 'parts', 'objects', 'attention', 'similarity', 'pca', 'concept', 'masks'];
const REQUIRED = ['id', 'name', 'year', 'org', 'family', 'task', 'tagline', 'paper', 'takeaways', 'sections'];
const CONCEPTS = ['house', 'tree', 'window', 'door', 'roof', 'sun', 'cloud', 'sky', 'grass'];

const errors = [], warnings = [];
const err = (m, msg) => errors.push(`✗ [${m}] ${msg}`);
const warn = (m, msg) => warnings.push(`! [${m}] ${msg}`);

const widgetFiles = new Set((await readdir(rel('assets/js/widgets'))).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)));
const usedWidgets = new Set();

function checkWidget(id, where, w) {
  if (!w) return;
  if (typeof w !== 'object' || !w.name) return err(id, `${where}: widget must be {name, props?}`);
  usedWidgets.add(w.name);
  if (!widgetFiles.has(w.name)) err(id, `${where}: widget "${w.name}" has no file assets/js/widgets/${w.name}.js`);
  if (w.props && typeof w.props !== 'object') err(id, `${where}: widget props must be an object`);
}

function checkHtml(id, where, s) {
  if (typeof s !== 'string') return;
  const open = (s.match(/<(b|i|code|sub|sup|span|br)\b/g) || []).filter((t) => t !== '<br').length;
  const close = (s.match(/<\/(b|i|code|sub|sup|span)>/g) || []).length;
  if (open !== close) warn(id, `${where}: unbalanced inline HTML tags (${open} open vs ${close} close)`);
}

const registry = (await import(pathToFileURL(rel('models/registry.js')))).default;
const only = process.argv[2];
const dirs = (await readdir(rel('models'), { withFileTypes: true })).filter((d) => d.isDirectory() && !d.name.startsWith('_')).map((d) => d.name);
for (const d of dirs) if (!registry.includes(d)) warn(d, 'folder exists but id is not listed in models/registry.js');

for (const id of registry) {
  if (only && id !== only) continue;
  const file = rel('models', id, 'model.js');
  try { await access(file); } catch { err(id, `listed in registry but ${path.relative(root, file)} is missing`); continue; }
  let m;
  try { m = (await import(pathToFileURL(file))).default; } catch (e) { err(id, `failed to import: ${e.message}`); continue; }
  for (const k of REQUIRED) if (m[k] == null) err(id, `missing required field "${k}"`);
  if (m.id !== id) err(id, `id "${m.id}" must equal its folder name "${id}"`);
  if (m.paper && !/^https?:\/\//.test(m.paper.url || '')) err(id, 'paper.url must be an http(s) URL');
  if (!Array.isArray(m.takeaways) || m.takeaways.length < 3) warn(id, 'aim for 3–6 takeaways (learning outcomes)');
  (m.buildsOn || []).forEach((b) => { if (!registry.includes(b)) warn(id, `buildsOn "${b}" is not a registered model`); });
  const types = new Set();
  (m.sections || []).forEach((sec, i) => {
    const where = `sections[${i}] (${sec.type})`;
    if (!SECTION_TYPES.includes(sec.type)) return err(id, `${where}: unknown section type; expected one of ${SECTION_TYPES.join(', ')}`);
    types.add(sec.type);
    checkHtml(id, `${where}.intro`, sec.intro);
    if (sec.type === 'architecture') {
      if (!sec.stages?.length) err(id, `${where}: needs stages[]`);
      sec.stages?.forEach((st, j) => {
        const w = `${where}.stages[${j}] "${st.name}"`;
        if (!st.name || !st.summary) err(id, `${w}: needs name and summary`);
        if (st.kind && !KINDS.includes(st.kind)) err(id, `${w}: kind must be one of ${KINDS.join(', ')}`);
        if (st.shape && (!Array.isArray(st.shape) || st.shape.length !== 3)) err(id, `${w}: shape must be [H, W, C]`);
        if (!st.shape && !st.label) warn(id, `${w}: no shape or label; box will use a default size`);
        checkWidget(id, w, st.widget); checkHtml(id, `${w}.summary`, st.summary); checkHtml(id, `${w}.learns`, st.learns);
      });
    }
    if (sec.type === 'features') {
      sec.stages?.forEach((st, j) => {
        const w = `${where}.stages[${j}] "${st.label}"`;
        if (!VIEWS.includes(st.view)) err(id, `${w}: view must be one of ${VIEWS.join(', ')}`);
        if (['edges', 'textures', 'parts', 'objects'].includes(st.view) && !(st.res > 0 && 112 % st.res === 0 || st.res === 112)) warn(id, `${w}: res should divide 112 (e.g. 112, 56, 28, 14, 7, 4)`);
        (st.concepts || []).forEach((c) => { if (!CONCEPTS.includes(c)) warn(id, `${w}: concept "${c}" is not in the toy scene (fine for showing absence)`); });
      });
    }
    if (sec.type === 'losses') sec.items?.forEach((l, j) => { if (!l.name || !l.explain) err(id, `${where}.items[${j}]: needs name and explain`); checkWidget(id, `${where}.items[${j}]`, l.widget); checkHtml(id, `${where}.items[${j}].explain`, l.explain); });
    if (sec.type === 'techniques') sec.items?.forEach((t, j) => { for (const k of ['name', 'what', 'why', 'apply']) if (!t[k]) err(id, `${where}.items[${j}]: needs "${k}"`); checkWidget(id, `${where}.items[${j}]`, t.widget); });
    if (sec.type === 'widget') { if (!sec.title) err(id, `${where}: needs a title`); checkWidget(id, where, sec.widget); }
    if (sec.type === 'tips') sec.items?.forEach((t, j) => { if (!t.title || !t.body) err(id, `${where}.items[${j}]: needs title and body`); });
    if (sec.type === 'references') sec.items?.forEach((r, j) => { if (!/^https?:\/\//.test(r.url || '')) err(id, `${where}.items[${j}]: url must be http(s)`); });
  });
  for (const t of ['architecture', 'features', 'losses', 'techniques', 'references']) if (!types.has(t)) warn(id, `no "${t}" section (recommended)`);
  console.log(`✓ ${id} — ${m.sections.length} sections`);
}

// make sure every widget module at least parses / imports (no DOM needed at import time)
for (const w of widgetFiles) {
  try { const mod = await import(pathToFileURL(rel('assets/js/widgets', `${w}.js`))); if (typeof mod.default !== 'function') err(`widget:${w}`, 'must `export default function mount(el, props)`'); } catch (e) { err(`widget:${w}`, `import failed: ${e.message}`); }
}
for (const w of widgetFiles) if (!usedWidgets.has(w) && !only) warn(`widget:${w}`, 'not used by any model (fine if new)');

warnings.forEach((w) => console.warn(w));
errors.forEach((e) => console.error(e));
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
