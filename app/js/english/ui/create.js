// CREATE — the spending beat, and the reason he opens the app.
//
// He types an English sentence; the genie renders EXACTLY what he wrote. Thin
// English gets a thin world. That gradient is the whole design: an image model
// would understand "make big robot cool explosion" perfectly and teach nothing.
//
// Typed rather than spoken on purpose. Spelling and word retrieval are a real
// EAL weakness, and the CREATE beat is where writing them is worth the effort.
//
// Ported under the Lernapp hub: shell.apiKey replaces settings.apiKey, en()
// replaces store.state for everything else.

import { h, store, go, toast, SPARK, en, registerScreen } from '../../shell/core.js';
import { aiReady } from '../../qa/endpoint.js';
import { mountScene } from './world-scenes.js';
import { judge } from '../qa/genie.js';
import { record, normalise } from '../engine/vocab.js';
import { dayKey } from '../../engine/storage.js';
import { currentSession } from './read.js';

let forge = null;
let host = null;

export function startForge(chapter) {
  forge = { chapter, prompt: '', busy: false, result: null };
  return forge;
}

async function cast() {
  const text = (forge.prompt || '').trim();
  if (text.length < 3) { toast('Tell the world what to do.'); return; }
  if (en().tokens < 1) { toast('No sparks left — read another chapter.'); return; }
  // The key is normally the server's, not this device's — see qa/endpoint.js.
  if (!aiReady(store.state.shell.apiKey)) { toast('Ask a grown-up to set the app up first.'); return; }

  forge.busy = true;
  render();

  try {
    const res = await judge({ prompt: text, chapter: forge.chapter, apiKey: store.state.shell.apiKey });
    const today = dayKey();

    en().promptLog.push({
      day: today,
      chapterId: forge.chapter.id,
      prompt: text,
      usedPower: res.usedPower,
      literal: res.literal,
      nudge: res.nudge,
      reject: res.reject,
    });

    if (res.reject) {
      forge.busy = false;
      forge.result = null;
      store.save();
      toast('The world will not do that one. Try something else.');
      render();
      return;
    }

    // Productive written use — the strongest positive evidence in the model.
    for (const w of res.usedPower) record(en(), normalise(w), 'create', today);

    en().tokens -= 1;
    en().world.scenes.push({ day: today, prompt: text, scene: res.scene });
    store.save();

    forge.busy = false;
    forge.result = res;
    render();
  } catch (e) {
    forge.busy = false;
    toast(e.offline ? 'No connection right now.' : 'The forge is cold — try again.');
    render();
  }
}

function runes() {
  const used = new Set((forge.result?.usedPower ?? []).map(normalise));
  return h('div', { class: 'runes' },
    ...(forge.chapter.power ?? []).map((w) =>
      h('span', { class: 'rune' + (used.has(normalise(w)) ? ' lit' : '') }, w)));
}

function render() {
  if (!host || !forge) return;
  const res = forge.result;

  host.replaceChildren(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon', onclick: () => go('en-home') }, '‹'),
      h('div', { class: 'topbar-title' }, 'The Forge'),
      h('div', { class: 'sparks' }, '✦ ' + en().tokens),
    ),

    res
      ? h('div', {},
          h('div', { class: 'scene-host', id: 'scene' }),
          h('div', { class: 'spark-line' },
            res.literal ? 'The world did exactly what you said.' : SPARK[en().world.scenes.length % SPARK.length]),
          res.nudge ? h('div', { class: 'nudge' }, res.nudge) : null,
          runes(),
          h('div', { class: 'readbar' },
            h('button', {
              class: 'btn ghost wide',
              onclick: () => { forge.result = null; forge.prompt = ''; render(); },
              disabled: en().tokens < 1,
            }, en().tokens < 1 ? 'no sparks left' : 'change it again'),
            h('button', { class: 'btn wide', onclick: () => go('en-home') }, 'to the base →'),
          ),
        )
      : h('div', {},
          h('div', { class: 'forge-intro' }, 'Say what happens next. The world will do exactly what you say — no more, no less.'),
          runes(),
          h('textarea', {
            id: 'prompt', class: 'answer big', rows: 3,
            placeholder: 'The rusty robot crept behind the tall tree…',
            oninput: (e) => { forge.prompt = e.target.value; },
          }, forge.prompt || ''),
          h('div', { class: 'readbar' },
            h('button', { class: 'btn wide big', onclick: cast, disabled: forge.busy },
              forge.busy ? 'the world listens…' : '✦ change the world'),
          ),
          h('div', { class: 'hint' }, 'Using the three words above makes it stronger.'),
        ),
  );

  if (res) mountScene(host.querySelector('#scene'), res.scene);
}

export function createScreen() {
  const rs = currentSession();
  const chapter = forge?.chapter ?? rs?.chapter;
  if (!chapter) { go('en-home'); return h('div'); }
  if (!forge || forge.chapter.id !== chapter.id) startForge(chapter);
  host = h('div', { class: 'screen en forge' });
  queueMicrotask(render);
  return host;
}

registerScreen('en-create', createScreen);
