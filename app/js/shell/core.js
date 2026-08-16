// The shell's tiny runtime: one store, one screen registry, one DOM helper.
// Same pattern as the Y5 trainer's ui/core.js, re-homed on the hub storage.

import * as storage from './storage.js';

export const store = {
  state: storage.load(),
  save() { storage.save(this.state); },
};

const screens = {};
let current = { name: 'home', params: null };
let rootEl = null;

export function registerScreen(name, fn) { screens[name] = fn; }

export function mount(el) { rootEl = el; }

// Global chrome subscribes here; every navigation fires it.
const afterRender = [];
export function onAfterRender(fn) { afterRender.push(fn); }

export function go(name, params = null) {
  current = { name, params };
  window.scrollTo(0, 0);
  rerender();
}

export function rerender() {
  if (!rootEl) return;
  const fn = screens[current.name];
  rootEl.replaceChildren(fn ? fn(current.params) : h('div', {}, 'Missing screen: ' + current.name));
  for (const f of afterRender) f();
}

export function currentScreen() { return current.name; }

// DOM helper: h('button', {class:'big', onclick:fn}, 'Hi'). 'html' attr sets innerHTML.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function toast(msg, ms = 2200) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, ms);
}
