// Lazy widget loader shared by all components.
import { h, whenVisible } from './dom.js';

/**
 * Lazy widget slot: the widget module is fetched and mounted only when the
 * slot nears the viewport. spec = { name, props }.
 */
export function widgetSlot(spec) {
  if (!spec) return null;
  const el = h('div', { class: 'widget loading-w' }, 'loading interactive…');
  whenVisible(el, async () => {
    try {
      const mod = await import(`../widgets/${spec.name}.js`);
      el.classList.remove('loading-w');
      el.textContent = '';
      mod.default(el, spec.props || {});
    } catch (e) {
      el.textContent = `Widget “${spec.name}” failed to load.`;
      console.error(e);
    }
  });
  return el;
}
