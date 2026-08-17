// Shared SVG DOM helpers — core.js h() uses createElement and cannot build
// namespaced SVG elements. Used by ui/watch-scenes.js and ui/map-scene.js;
// everything renders fine on a detached DOM (tests rely on that).

export const SVG_NS = 'http://www.w3.org/2000/svg';

export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

// Stagger index -> transition delay (CSS: calc(var(--i, 0) * 0.12s)).
export function di(el, i) {
  el.style.setProperty('--i', String(i));
  return el;
}
