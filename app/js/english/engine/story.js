// Chapter loading, selection and validation.
//
// validateChapter() is the corpus sweep — the analogue of PowerMath's
// 3,840-question generator sweep. It runs in the browser test page over every
// shipped chapter, so a corpus edit cannot ship broken: a power word that does
// not actually occur in the prose, a glossary gap, a stale word count or a
// missing question all fail the build before they reach him.

import { tokenise, normalise } from './vocab.js';

export const REL = ['behind', 'in front of', 'under', 'on top of', 'next to', 'inside'];

export function chapterText(ch) {
  return (ch.steps ?? []).map((s) => s.text ?? '').join(' ');
}

export function wordCount(ch) {
  return tokenise(chapterText(ch)).length;
}

// Returns [] for a valid chapter, otherwise one readable string per problem.
export function validateChapter(ch, { requireAudio = false } = {}) {
  const e = [];
  const at = ch?.id ? `chapter ${ch.id}` : 'chapter (no id)';

  for (const f of ['id', 'arc', 'title', 'level', 'power', 'glossary', 'steps', 'talk']) {
    if (ch?.[f] == null) e.push(`${at}: missing "${f}"`);
  }
  if (e.length) return e;

  if (!Number.isInteger(ch.level) || ch.level < 1 || ch.level > 10) {
    e.push(`${at}: level must be an integer 1..10, got ${ch.level}`);
  }
  if (!Array.isArray(ch.steps) || !ch.steps.length) e.push(`${at}: no steps`);
  if (!Array.isArray(ch.talk) || !ch.talk.length) e.push(`${at}: no talk questions`);
  if (!Array.isArray(ch.power) || ch.power.length !== 3) {
    e.push(`${at}: expected exactly 3 power words, got ${ch.power?.length}`);
  }

  const ids = new Set();
  for (const [i, st] of (ch.steps ?? []).entries()) {
    const where = `${at} step ${st?.id ?? '#' + i}`;
    if (!st?.id) e.push(`${where}: missing id`);
    else if (ids.has(st.id)) e.push(`${where}: duplicate step id`);
    else ids.add(st.id);
    if (!st?.text || !st.text.trim()) e.push(`${where}: empty text`);
    if (requireAudio) {
      if (!st?.audio) e.push(`${where}: missing audio path`);
      if (!st?.durationSec) e.push(`${where}: missing durationSec`);
      if (!st?.srcHash) e.push(`${where}: missing srcHash`);
    }
  }

  // Every power word must actually occur in the prose. Authoring a chapter
  // around three words and then not using one of them is the single easiest
  // mistake to make here, and it silently breaks the CREATE requirement.
  const tokens = new Set(tokenise(chapterText(ch)));
  for (const w of ch.power ?? []) {
    const n = normalise(w);
    if (!n) { e.push(`${at}: blank power word`); continue; }
    if (!tokens.has(n) && !hasInflection(tokens, n)) {
      e.push(`${at}: power word "${w}" never appears in the text`);
    }
    if (!ch.glossary?.[n] && !ch.glossary?.[w]) e.push(`${at}: power word "${w}" has no glossary entry`);
  }

  for (const [w, g] of Object.entries(ch.glossary ?? {})) {
    if (!g?.de) e.push(`${at}: glossary "${w}" missing German gloss`);
    if (!g?.en) e.push(`${at}: glossary "${w}" missing English paraphrase`);
  }

  for (const [i, q] of (ch.talk ?? []).entries()) {
    if (!q?.q) e.push(`${at}: talk #${i} missing question`);
    if (!Array.isArray(q?.expect) || !q.expect.length) e.push(`${at}: talk #${i} missing expected keywords`);
  }

  // words is a stored convenience for the controller; it must not drift.
  const actual = wordCount(ch);
  if (ch.words != null && Math.abs(ch.words - actual) > 2) {
    e.push(`${at}: stored words=${ch.words} but text has ${actual}`);
  }

  return e;
}

// Accept the common REGULAR inflections, so "creep" authored against "creeping"
// passes. Irregulars ("creep" vs "crept") are deliberately NOT handled: teaching
// this validator English morphology is not worth it, and the authoring rule is
// simply to list the power word in the form the prose uses. The test suite pins
// that contract so it does not get quietly "fixed" later.
function hasInflection(tokens, stem) {
  const cands = [stem + 's', stem + 'es', stem + 'ed', stem + 'ing', stem + 'd',
    stem.replace(/e$/, '') + 'ing', stem.replace(/y$/, 'ies'), stem.replace(/y$/, 'ied')];
  return cands.some((c) => tokens.has(c));
}

export function glossFor(ch, rawWord) {
  const w = normalise(rawWord);
  return ch.glossary?.[w] ?? null;
}

// The next chapter of an arc: the earliest not-yet-completed one whose level is
// closest to his band. Chapters are authored in narrative order, so the story
// order is never broken — the band only decides which VARIANT is served when an
// arc offers several at a beat.
export function nextChapter(arc, state) {
  const done = new Set(state.story?.completed ?? []);
  const remaining = (arc.chapters ?? []).filter((c) => !done.has(c.id));
  if (!remaining.length) return null;
  const beat = remaining[0].beat ?? 0;
  const atBeat = remaining.filter((c) => (c.beat ?? 0) === beat);
  const band = state.level?.band ?? 4;
  return atBeat.reduce((best, c) =>
    Math.abs(c.level - band) < Math.abs(best.level - band) ? c : best, atBeat[0]);
}

export async function loadChapter(arcId, chapterId, fetchFn = fetch) {
  const res = await fetchFn(`./data/story/${arcId}/${chapterId}.json`);
  if (!res.ok) throw new Error(`chapter ${chapterId}: HTTP ${res.status}`);
  return res.json();
}
