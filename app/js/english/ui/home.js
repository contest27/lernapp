// HOME — his base. The only "progress" the game ever shows him is the world he
// has built: no scores, no levels, no streak, no words-learned counter. All of
// that is measured and none of it is displayed. See the framing decision in
// Wordforge's CLAUDE.md — ported verbatim, only the state plumbing changed.
//
// Re-homed under the Lernapp hub: state moved from Wordforge's flat
// store.state to the english slice (en()); screen name prefixed 'en-' to
// avoid colliding with the maths screens; registerScreen happens at import
// time, matching the hub's self-registering UI modules.

import { h, store, go, toast, en, registerScreen } from '../../shell/core.js';
import { renderScene } from './world-scenes.js';
import { arcById } from '../content/story-index.js';
import { nextChapter, loadChapter } from '../engine/story.js';
import { startSession } from './read.js';

let host = null;
let loading = false;

async function continueStory() {
  if (loading) return;
  const arc = arcById(en().story.arcId);
  const meta = nextChapter(arc, en());
  if (!meta) { toast('That is the end of this story — for now.'); return; }

  loading = true;
  render();
  try {
    const chapter = await loadChapter(arc.id, meta.id);
    startSession(chapter);
    en().activeChapter = meta.id;
    store.save();
    go('en-read');
  } catch (e) {
    toast('That chapter would not open.');
  } finally {
    loading = false;
  }
}

// Long-press rather than a tap: the parent corner is one screen away for an
// adult and effectively invisible to a ten-year-old who is not looking for
// it. Parent corner is hub-owned now (Wordforge's own parent.js did not come
// along as a screen — see parent-section.js) so this opens the hub's gate,
// exactly like the maths home screen's gear icon.
function parentGate(el) {
  let timer = null;
  const start = () => { timer = setTimeout(() => go('parentgate'), 1400); };
  const cancel = () => { clearTimeout(timer); };
  el.addEventListener('pointerdown', start);
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, cancel);
  return el;
}

function worldStrip() {
  const scenes = en().world.scenes.slice(-8).reverse();
  if (!scenes.length) {
    return h('div', { class: 'empty' }, 'Nothing here yet. Read a chapter and the forge opens.');
  }
  return h('div', { class: 'strip' },
    ...scenes.map((entry) => {
      const card = h('div', { class: 'strip-card' });
      card.append(renderScene(entry.scene));
      card.append(h('div', { class: 'strip-cap' }, entry.prompt));
      return card;
    }));
}

function render() {
  if (!host) return;
  const arc = arcById(en().story.arcId);
  const meta = nextChapter(arc, en());
  const done = en().story.completed.length;

  // replaceChildren() is a native DOM method, not the h() helper — it does not
  // filter falsy children the way h() does, so a bare `cond ? h(...) : null`
  // in this list would stringify to a literal "null" text node. Build the
  // list and filter it explicitly (this bug is latent in Wordforge's own
  // source too; flagged upstream rather than silently diverging here).
  host.replaceChildren(...[
    h('div', { class: 'topbar' },
      // The way back out of English into the hub — Wordforge had no "hub" to
      // return to, so this is new: a small icon ahead of the wordmark.
      h('button', { class: 'icon small', 'aria-label': 'Back to Lernapp', onclick: () => go('home') }, '🏫'),
      parentGate(h('div', { class: 'brand' }, 'WORDFORGE')),
      h('div', { class: 'sparks' }, '✦ ' + en().tokens),
    ),

    h('div', { class: 'hero' },
      h('div', { class: 'hero-arc' }, arc.title),
      h('div', { class: 'hero-title' }, meta ? meta.title : 'The end — for now'),
      h('div', { class: 'hero-blurb' }, done ? arc.blurb : arc.blurb),
      h('button', { class: 'btn big wide', onclick: continueStory, disabled: loading || !meta },
        loading ? 'opening…' : done ? 'keep going ›' : 'begin ›'),
    ),

    en().tokens > 0
      ? h('button', { class: 'btn ghost wide', onclick: () => go('en-create') }, '✦ open the forge')
      : null,

    h('h2', { class: 'section' }, 'Your world'),
    worldStrip(),
  ].filter(Boolean));
}

export function homeScreen() {
  host = h('div', { class: 'screen en en-hero' });
  queueMicrotask(render);
  return host;
}

registerScreen('en-home', homeScreen);
