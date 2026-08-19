// READ — the earning beat. One paragraph at a time, each with its own scene,
// narrated by a real en-GB voice, every word tappable for a German gloss.
//
// The per-paragraph scene is not decoration: it is drawn by the SAME renderer
// and the SAME descriptor schema that CREATE uses. By the time he writes his
// first prompt he has spent chapters reading that visual language, so the
// mapping from words to world is already familiar.
//
// Ported under the Lernapp hub: shell.apiKey/voiceURI/rate replace
// settings.apiKey/voiceURI/rate, en() replaces store.state for everything
// else, and every internal go('home') is go('en-home') — this screen never
// leaves the English module on its own steam.

import { h, store, go, toast, en, registerScreen } from '../../shell/core.js';
import { mountScene } from './world-scenes.js';
import * as audio from './audio.js';
import * as tts from '../../tts.js';
import { lookup } from '../qa/gloss.js';
import { normalise } from '../engine/vocab.js';

// Survives rerenders; rebuilt whenever a different chapter is opened.
let session = null;

export function startSession(chapter) {
  session = {
    chapter,
    step: 0,
    glossed: new Set(),
    startedAt: Date.now(),
    autoPlay: false,   // set once he has tapped anything, so iOS lets us speak
  };
  return session;
}

export function currentSession() { return session; }

export function elapsedSeconds() {
  return session ? Math.round((Date.now() - session.startedAt) / 1000) : 0;
}

// Split a paragraph into tappable word spans, keeping punctuation visible but
// out of the lookup. Exported so the tests can check tokenisation without a DOM
// event loop.
export function splitWords(text) {
  return String(text).split(/(\s+)/).map((chunk) => {
    if (/^\s+$/.test(chunk) || !chunk) return { space: chunk };
    const word = normalise(chunk);
    return { raw: chunk, word: word || null };
  });
}

function glossSheet(word, sentence) {
  const sheet = h('div', { class: 'sheet' });
  const card = h('div', { class: 'sheet-card' },
    h('div', { class: 'gloss-word' }, word),
    h('div', { class: 'gloss-body' }, h('div', { class: 'spinner' })),
  );
  sheet.append(card);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.remove(); });
  document.body.append(sheet);
  requestAnimationFrame(() => sheet.classList.add('show'));

  lookup({
    word,
    sentence,
    chapter: session?.chapter,
    state: en(),
    apiKey: store.state.shell.apiKey,
  }).then((g) => {
    store.save();
    const body = card.querySelector('.gloss-body');
    // replaceChildren() is native, not the h() helper — a bare `? h(...) :
    // null` here would stringify to a literal "null" text node, so the list
    // is filtered explicitly (see the same note in home.js).
    body.replaceChildren(...[
      g.de ? h('div', { class: 'gloss-de' }, g.de) : null,
      g.en ? h('div', { class: 'gloss-en' }, g.en) : null,
      !g.de && !g.en ? h('div', { class: 'gloss-en' }, 'I do not know that one yet.') : null,
      tts.available()
        ? h('button', {
            class: 'btn ghost small',
            onclick: () => tts.speak(word, { rate: 0.8, voiceURI: store.state.shell.voiceURI }),
          }, '🔊 say it')
        : null,
      h('button', { class: 'btn small', onclick: () => sheet.remove() }, 'got it'),
    ].filter(Boolean));
  });

  return sheet;
}

function paragraph(step) {
  const p = h('p', { class: 'prose' });
  for (const part of splitWords(step.text)) {
    if (part.space != null) { p.append(document.createTextNode(part.space)); continue; }
    if (!part.word) { p.append(document.createTextNode(part.raw)); continue; }
    const isPower = (session.chapter.power ?? []).some((w) => normalise(w) === part.word);
    const span = h('span', {
      class: 'w' + (isPower ? ' power' : '') + (session.glossed.has(part.word) ? ' tapped' : ''),
      onclick: () => {
        session.glossed.add(part.word);
        span.classList.add('tapped');
        glossSheet(part.word, step.text);
      },
    }, part.raw);
    p.append(span);
  }
  return p;
}

function speak() {
  if (!session) return;
  const step = session.chapter.steps[session.step];
  session.autoPlay = true;
  audio.play(session.chapter.arc, step, {
    voiceURI: store.state.shell.voiceURI,
    rate: store.state.shell.rate,
  });
}

function advance(delta) {
  audio.stop();
  const last = session.chapter.steps.length - 1;
  const next = session.step + delta;
  if (next < 0) return;
  if (next > last) { go('en-talk'); return; }
  session.step = next;
  render();
}

let host = null;

function render() {
  if (!host || !session) return;
  const step = session.chapter.steps[session.step];
  const total = session.chapter.steps.length;

  host.replaceChildren(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon', onclick: () => { audio.stop(); go('en-home'); } }, '‹'),
      h('div', { class: 'topbar-title' }, session.chapter.title),
      h('div', { class: 'dots' },
        ...session.chapter.steps.map((_, i) =>
          h('span', { class: 'dot' + (i === session.step ? ' on' : i < session.step ? ' done' : '') }))),
    ),
    h('div', { class: 'scene-host', id: 'scene' }),
    paragraph(step),
    h('div', { class: 'readbar' },
      h('button', { class: 'btn ghost', onclick: () => advance(-1), disabled: session.step === 0 }, '‹'),
      h('button', { class: 'btn ghost wide', onclick: speak }, '🔊 listen'),
      h('button', { class: 'btn wide', onclick: () => advance(1) },
        session.step === total - 1 ? 'talk about it →' : 'next ›'),
    ),
    h('div', { class: 'hint' }, 'Tap any word you do not know.'),
  );

  mountScene(host.querySelector('#scene'), step.scene ?? {});
  if (session.autoPlay) speak();
}

export function readScreen() {
  if (!session) { go('en-home'); return h('div'); }
  host = h('div', { class: 'screen en read' });
  // The first render happens synchronously so the router has a node to mount.
  queueMicrotask(render);
  return host;
}

export function abandon() {
  audio.stop();
  const s = session;
  session = null;
  return s;
}

registerScreen('en-read', readScreen);
