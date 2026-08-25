// Synced from powermath-trainer @ 85699c4 (tooling/content-neutral).
// Only the engine import paths differ: content lives one level deeper here.
import { shuffle, ri } from '../../engine/rng.js';
import { fmt } from '../../engine/check.js';

// Question builders. Every question carries: kind, prompt, tier, answer fields,
// and optional svg / hint / explain. IDs are set by the session composer.

export function num(prompt, answer, { unit = '', tier = 2, svg = '', hint = '', explain = '', tolerance = 0 } = {}) {
  return { kind: 'num', prompt, answer, unit, tier, svg, hint, explain, tolerance };
}

export function mc(prompt, options, answerIndex, { tier = 2, svg = '', hint = '', explain = '' } = {}) {
  return { kind: 'mc', prompt, options, answerIndex, tier, svg, hint, explain };
}

// Build an MC from a correct value and distractors, shuffled deterministically.
// Distractors equal to the answer or to each other are dropped.
export function mcFrom(rng, prompt, correct, distractors, opts = {}) {
  const asStr = (v) => (typeof v === 'number' ? fmt(v) : String(v));
  const cStr = asStr(correct);
  const seen = new Set([cStr]);
  const ds = [];
  for (const d of distractors) {
    const s = asStr(d);
    if (!seen.has(s) && ds.length < 3) { seen.add(s); ds.push(s); }
  }
  const options = shuffle(rng, [cStr, ...ds]);
  return mc(prompt, options, options.indexOf(cStr), opts);
}

export function tf(prompt, answer, { tier = 1, svg = '', hint = '', explain = '' } = {}) {
  return { kind: 'tf', prompt, answer, tier, svg, hint, explain };
}

export function frac(prompt, n, d, { exact = false, tier = 2, svg = '', hint = '', explain = '' } = {}) {
  return { kind: 'frac', prompt, answer: { n, d }, exact, tier, svg, hint, explain };
}

// items: values shown to the child; correctOrder: same values in the right order.
export function order(prompt, rng, correctOrder, { tier = 2, svg = '', hint = '', explain = '' } = {}) {
  const items = shuffle(rng, correctOrder.slice());
  // Reshuffle once if the shuffle happened to produce the solved order.
  const same = items.every((v, i) => String(v) === String(correctOrder[i]));
  return {
    kind: 'order',
    prompt,
    items: same ? items.slice().reverse() : items,
    correctOrder: correctOrder.map(String),
    tier, svg, hint, explain,
  };
}

// Scenario rotation ------------------------------------------------------------
// Word-problem slots hand a pool of builder functions to scenario(); indices
// are dealt like a shuffled deck, without replacement, so the child never sees
// the same story again until the whole pool has been used — and never twice in
// a row across deck boundaries. Deck state lives for the page load (a session
// is built in one go, so one build never repeats a story); shuffles draw from
// the caller's rng, keeping the test sweep deterministic.
const decks = new Map();

export function scenario(rng, key, builders) {
  const n = builders.length;
  const prev = decks.get(key);
  let deck = prev && prev.n === n && prev.left.length ? prev : null;
  if (!deck) {
    const left = shuffle(rng, [...Array(n).keys()]);
    // left is drawn from the end; avoid starting where the old deck stopped.
    if (n > 1 && prev && left[n - 1] === prev.last) {
      [left[0], left[n - 1]] = [left[n - 1], left[0]];
    }
    deck = { n, left, last: -1 };
    decks.set(key, deck);
  }
  deck.last = deck.left.pop();
  return builders[deck.last](rng);
}

// Place-value helpers ----------------------------------------------------------

// Which positions in a number may be named BY THEIR DIGIT without ambiguity.
//
// "What is the value of the digit 5 in 556,539?" is not a question — it has
// three answers. A digit may only be referred to by its own face value if it
// occurs exactly once in the number. Zeros are excluded as well: a zero is a
// place holder, and asking what it is worth teaches the wrong idea.
//
// Reported from the device 2026-08-25; the generator had been picking a
// position and then naming the digit that happened to sit there.
export function unambiguousDigitPositions(s, positions = null) {
  const count = {};
  for (const ch of s) count[ch] = (count[ch] ?? 0) + 1;
  const ps = positions ?? [...s].map((_, i) => i);
  return ps.filter((p) => s[p] !== '0' && count[s[p]] === 1);
}

// Distractor helpers -----------------------------------------------------------

// Plausible wrong numbers near a correct value.
export function nearMisses(rng, v, { spread = null } = {}) {
  const s = spread ?? Math.max(1, Math.round(Math.abs(v) * 0.1));
  const set = new Set();
  let guard = 0;
  while (set.size < 3 && guard++ < 50) {
    const cand = v + (rng() < 0.5 ? -1 : 1) * ri(rng, 1, s);
    if (cand !== v) set.add(cand);
  }
  return [...set];
}

// Inline stacked fraction for prompts and options.
export function fr(n, d) {
  return `<span class="frac"><b>${n}</b><i>${d}</i></span>`;
}

export function money(v) {
  return '£' + v.toFixed(2);
}

export { fmt, ri, shuffle };
export { pick, distinctInts } from '../../engine/rng.js';
