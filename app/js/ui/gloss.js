// Tap a word, get its German meaning.
//
// This is the ONLY German the app offers. Whole-lesson and whole-question
// translations were removed on 2026-08-16: with them the child could read the
// lesson entirely in German and never meet the English at all. A single word
// unblocks him without replacing the text.
//
// Lookup order: offline glossary → cached tutor answer → tutor → honest no.
// The first two need neither network nor API key, and the glossary covers the
// maths and instruction vocabulary of the whole course, so the common case is
// instant and works on a plane.

import { h, store, cur, logQa } from '../shell/core.js';
import { lookupGloss, normaliseWord } from '../maths/content/glossary.js';
import { askTutor, glossSystemPrompt } from '../qa/tutor.js';
import * as tts from '../tts.js';

// Letters only: numbers must never become tappable (a gloss on "45" would be
// nonsense) and they are what the maths is about.
const WORD_RE = /[A-Za-z][A-Za-z'’]*(?:-[A-Za-z]+)*/g;
// Separate, non-global twin for the filter: `.test()` on a /g regex advances
// lastIndex, so reusing WORD_RE there would accept every second text node.
const HAS_WORD = /[A-Za-z]/;

// Text inside these is left alone: fraction stacks and diagrams are layout, not
// prose, and a nested button would be invalid markup.
const SKIP = 'button, a, svg, .frac, .vis, .no-gloss';

// Wrap every word of `root`'s text in a tappable button, in place.
//
// Pure DOM, no store: the caller decides what a tap does. `textContent` is
// unchanged afterwards (same words, same spacing), which is what the unit test
// pins — speech and answer-checking read the original strings and must not see
// a difference.
export function tokenizeInto(root) {
  if (!root) return root;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!HAS_WORD.test(node.nodeValue || '')) return NodeFilter.FILTER_REJECT;
      return node.parentElement?.closest(SKIP)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  // Collected first: replacing a node while the walker is positioned on it
  // would cut the walk short.
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);

  for (const node of nodes) {
    const text = node.nodeValue;
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const m of text.matchAll(WORD_RE)) {
      if (m.index > last) frag.append(text.slice(last, m.index));
      frag.append(h('button', { class: 'w', type: 'button' }, m[0]));
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.append(text.slice(last));
    node.replaceWith(frag);
  }
  return root;
}

// Tokenize `root` and wire one delegated listener for the whole subtree —
// cheaper and simpler than a listener per word, and it survives words added
// later. `topicId` only labels the log entry.
export function attachGloss(root, { topicId = null } = {}) {
  if (!root) return root;
  tokenizeInto(root);
  root.addEventListener('click', (e) => {
    const btn = e.target.closest?.('button.w');
    if (!btn || !root.contains(btn)) return;
    e.preventDefault();
    e.stopPropagation();
    openGloss(btn, topicId);
  });
  return root;
}

// The sentence the word sits in, for context: "left" is "übrig" in one sentence
// and "links" in the next. Falls back to the whole block when there is no
// sentence punctuation (question prompts often have none).
export function sentenceAround(el) {
  const block = el.closest('p, li, td, h1, h2, h3, .prompt, .ex-step, .seg-text') || el.parentElement;
  const full = (block?.textContent || '').replace(/\s+/g, ' ').trim();
  const word = el.textContent;
  const sentences = full.match(/[^.!?]+[.!?]*/g) || [full];
  return (sentences.find((s) => s.includes(word)) || full).trim();
}

// ---------------------------------------------------------------- the lookup

// Returns { text, source } or null when nothing can be offered.
export async function glossFor(word, sentence) {
  const offline = lookupGloss(word);
  if (offline) return { text: offline, source: 'glossary' };

  const key = normaliseWord(word);
  const cached = cur().glossCache?.[key];
  if (cached) return { text: cached, source: 'cache' };

  const apiKey = store.state.shell.apiKey;
  if (!apiKey || !key) return null;

  const answer = await askTutor({
    question: `Wort: "${word}"\nSatz: ${sentence}`,
    apiKey,
    system: glossSystemPrompt(),
  });
  const text = String(answer).trim();
  if (text) {
    cur().glossCache[key] = text;
    store.save();
  }
  return text ? { text, source: 'tutor' } : null;
}

// ---------------------------------------------------------------- the popover

let openPop = null;

export function closeGloss() {
  openPop?.remove();
  openPop = null;
}

function openGloss(btn, topicId) {
  closeGloss();
  const word = btn.textContent;
  const sentence = sentenceAround(btn);

  const body = h('div', { class: 'gloss-body' }, 'Einen Moment…');
  const pop = h('div', { class: 'gloss-pop', role: 'dialog' },
    h('div', { class: 'gloss-head' },
      h('b', {}, word),
      h('button', { class: 'gloss-x', 'aria-label': 'Close', onclick: closeGloss }, '✕')),
    body);
  document.body.append(pop);
  openPop = pop;
  place(pop, btn);
  btn.classList.add('w-on');

  // Dismiss on anything that means "I am done reading": a tap elsewhere, a
  // scroll, Escape. Registered after this click finishes bubbling, or the very
  // tap that opened the popover would close it again.
  const dismiss = () => {
    btn.classList.remove('w-on');
    closeGloss();
    document.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('scroll', dismiss, true);
    document.removeEventListener('keydown', onKey, true);
  };
  const onDown = (e) => { if (!pop.contains(e.target)) dismiss(); };
  const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
  setTimeout(() => {
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', dismiss, true);
    document.addEventListener('keydown', onKey, true);
  }, 0);

  glossFor(word, sentence).then((hit) => {
    if (openPop !== pop) return;                 // he moved on already
    if (!hit) {
      body.replaceChildren(h('p', {}, store.state.shell.apiKey
        ? 'Das Wort kenne ich nicht. Frag Mama oder Papa!'
        : 'Dieses Wort steht nicht in meinem Wörterbuch — und der Tutor ist aus. Frag Mama oder Papa!'));
      place(pop, btn);
      return;
    }
    body.replaceChildren(h('p', { class: 'gloss-de' }, hit.text));
    if (tts.germanVoice()) {
      body.append(h('button', {
        class: 'seg-play', 'aria-label': 'Auf Deutsch vorlesen',
        onclick: () => tts.speak(hit.text, { rate: store.state.shell.rate, lang: 'de' }),
      }, '🔊'));
    }
    place(pop, btn);
    // Logged so the parent corner shows a real vocabulary list — which words
    // he stumbled over, not just that he asked for help.
    logQa(topicId, word, hit.text, 'gloss');
  }).catch(() => {
    if (openPop !== pop) return;
    body.replaceChildren(h('p', {}, 'Dafür brauche ich das Internet. Frag Mama oder Papa!'));
    place(pop, btn);
  });
}

// Anchor under the word, clamped into the viewport. Measured after insertion,
// and again when the content changes height, so the box never hangs off screen.
function place(pop, btn) {
  const r = btn.getBoundingClientRect();
  const w = pop.offsetWidth;
  const hgt = pop.offsetHeight;
  const margin = 8;
  const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, margin), window.innerWidth - w - margin);
  const below = r.bottom + margin;
  const top = below + hgt > window.innerHeight - margin && r.top - hgt - margin > margin
    ? r.top - hgt - margin       // no room underneath: flip above the word
    : below;
  pop.style.left = Math.round(left) + 'px';
  pop.style.top = Math.round(top + window.scrollY) + 'px';
}
