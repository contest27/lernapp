// The vocabulary model: PowerMath's mastery.js (EWMA + Leitner) applied per WORD
// instead of per topic, with one addition — evidence kinds.
//
// A maths attempt is a clean binary: right or wrong. A word encounter is not.
// Reading a word without needing help is weak evidence that he knows it; using
// it correctly in his own sentence is strong evidence; tapping it for a German
// gloss is strong evidence he does NOT. So the single `tier` of the maths model
// becomes a table of evidence kinds with their own weights and polarity.

// Ported under the Lernapp hub: Wordforge's own engine/storage.js was NOT
// carried over (the shell owns persistence — see shell/storage.js). addDays
// lives in the engine files shared by every module.
import { addDays } from '../../engine/storage.js';

// w = how far this encounter moves the score toward its verdict.
// ok = the verdict itself; null means the caller decides (a quiz can go either way).
export const EVIDENCE = {
  // Passive exposure. Deliberately tiny: he may well have skipped the word, or
  // inferred it from context and forgotten it by tomorrow.
  read:   { w: 0.05, ok: true },
  // He tapped for the translation. The most reliable signal in the whole app,
  // because it is volunteered rather than inferred — and it is what drives the
  // difficulty controller.
  gloss:  { w: 0.30, ok: false },
  // Used correctly in a spoken answer about the chapter.
  talk:   { w: 0.17, ok: true },
  // Used correctly in a written CREATE prompt. Productive written use is the
  // hardest thing he does here, so it moves the score most among the positives.
  create: { w: 0.22, ok: true },
  // Explicit recall check; polarity comes from the caller.
  quiz:   { w: 0.20, ok: null },
};

export function newWord(initialScore = 30) {
  return { score: clamp(initialScore), seen: 0, glossed: 0, used: 0, lastSeen: null, due: null, box: 1 };
}

// Strip everything that is not part of the word itself so "Robot," "robot" and
// "robot." are one entry. Internal apostrophes survive ("don't", "robot's").
export function normalise(word) {
  return String(word).toLowerCase().replace(/^[^a-z']+|[^a-z']+$/g, '').replace(/^'+|'+$/g, '');
}

export function tokenise(text) {
  return String(text).split(/\s+/).map(normalise).filter(Boolean);
}

export function updateWord(v, kind, ok = null) {
  const ev = EVIDENCE[kind];
  if (!ev) throw new Error('unknown evidence kind: ' + kind);
  const verdict = ev.ok === null ? !!ok : ev.ok;
  v.score = clamp(Math.round(v.score * (1 - ev.w) + (verdict ? 100 : 0) * ev.w));
  if (kind === 'read') v.seen += 1;
  if (kind === 'gloss') { v.glossed += 1; v.seen += 1; }
  if (kind === 'talk' || kind === 'create') { v.used += 1; v.seen += 1; }
  return v;
}

export function bandOf(score) {
  if (score < 60) return 'new';
  if (score <= 85) return 'learning';
  return 'known';
}

// Leitner intervals keyed off the band, exactly as the maths app schedules
// topics. A word he just glossed comes back tomorrow; a secure one waits a week.
export function scheduleWord(v, today) {
  const band = bandOf(v.score);
  const gap = band === 'new' ? 1 : band === 'learning' ? 3 : 7;
  v.box = band === 'new' ? 1 : band === 'learning' ? 2 : 3;
  v.lastSeen = today;
  v.due = addDays(today, gap);
  return v;
}

function ensure(state, word) {
  if (!state.vocab[word]) state.vocab[word] = newWord();
  return state.vocab[word];
}

// Record one encounter and reschedule. Returns the word record.
export function record(state, rawWord, kind, today, ok = null) {
  const word = normalise(rawWord);
  if (!word) return null;
  const v = ensure(state, word);
  updateWord(v, kind, ok);
  scheduleWord(v, today);
  return v;
}

// Batch update after a finished chapter: every token counts as passive
// exposure, except the ones he tapped — those are recorded as glosses instead,
// never both. Double-counting would let one tap move the score twice.
export function recordChapter(state, chapterText, glossedWords, today) {
  const glossed = new Set([...glossedWords].map(normalise).filter(Boolean));
  const counted = new Set();
  for (const w of tokenise(chapterText)) {
    if (counted.has(w)) continue;   // once per chapter, not once per occurrence
    counted.add(w);
    record(state, w, glossed.has(w) ? 'gloss' : 'read', today);
  }
  for (const w of glossed) if (!counted.has(w)) record(state, w, 'gloss', today);
  return state;
}

// Words due for review today, weakest first. Used to seed the power words of
// upcoming chapters and the requirements of CREATE quests, so review happens
// inside the story instead of as a separate drill he would notice and resent.
export function dueWords(state, today, max = 12) {
  return Object.entries(state.vocab)
    .filter(([, v]) => v.due && v.due <= today && bandOf(v.score) !== 'known')
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, max)
    .map(([w]) => w);
}

// Counts for the parent corner. Nothing here is ever shown to the child.
export function summary(state) {
  const all = Object.values(state.vocab);
  const by = { new: 0, learning: 0, known: 0 };
  for (const v of all) by[bandOf(v.score)] += 1;
  return { tracked: all.length, ...by, produced: all.filter((v) => v.used > 0).length };
}

function clamp(x) {
  return Math.max(5, Math.min(100, x));
}
