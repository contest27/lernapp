// The Year 5 bridge: what an imported PowerMath-Trainer backup is worth for
// Year 6.
//
// WHY THIS EXISTS. The engine opens every curriculum with a warm-up check
// (scheduler.planSession returns { kind: 'diagnostic' } until the slice's
// diagnosticDone is set). That was right for Year 5, where the app knew
// nothing about him. For Year 6 it was wrong twice over: the check asked
// Year 6 material he has not been taught yet, and the Year 5 scores — a whole
// year of evidence, already imported — sat unused, because importY5Backup
// only ever set diagnosticDone on the y5 slice, never on the active y6 one.
//
// So the Year 5 mastery IS the diagnostic. It is better evidence than twelve
// questions could ever be, and it costs him nothing.
//
// Lives here rather than in shell/storage.js because it is curriculum
// knowledge (which strand feeds which), and storage.js must stay free of
// content imports.

import { newMastery } from '../engine/mastery.js';
import { topics } from './content/index.js';
import { y5Topics, y5TopicById, Y5_TO_Y6_STRAND } from './content/y5.js';

// The Year 5 topic -> strand table that used to live here is gone: since B4
// (2026-09-07) the Year 5 topic modules themselves are in content/y5.js, and
// so is the Year 5 -> Year 6 strand map. Re-exported for the tests.
export { Y5_TO_Y6_STRAND };

// How a Year 5 score becomes a Year 6 prior.
//
// Shrunk 40 % towards the middle: a Year 5 score of 90 says "solid ground",
// not "the Year 6 topic sits". Capped at 85 so nothing starts in the `secure`
// band before it has been practised once, and floored at 30 so a weak Year 5
// topic still leaves room to fall.
export const SHRINK = 0.6;
export const PRIOR_MIN = 30;
export const PRIOR_MAX = 85;

export function priorFromY5(y5mean) {
  const p = Math.round(50 + SHRINK * (y5mean - 50));
  return Math.max(PRIOR_MIN, Math.min(PRIOR_MAX, p));
}

// Mean Year 5 score per Year 6 strand, or {} when there is nothing to go on.
//
// Only COMPLETED Year 5 topics count. Year 5 ran its own diagnostic, and
// applyDiagnostic wrote a prior onto every topic in the curriculum — reading
// all mastery entries would therefore feed Year 5's guesses back in as if they
// were evidence. A strand with no completed topic falls back to whatever
// mastery it has, which is exactly that guess, and is better than nothing.
export function strandMeans(y5) {
  const completed = new Set(y5.completed ?? []);
  const buckets = {};   // y6 strand -> { done: [], any: [] }
  for (const [topicId, m] of Object.entries(y5.mastery ?? {})) {
    if (!m || typeof m.score !== 'number') continue;
    const y5strand = y5TopicById(topicId)?.strand;
    if (!y5strand) continue; // an unknown topic id (hand-edited backup): ignore
    for (const y6strand of Y5_TO_Y6_STRAND[y5strand] ?? []) {
      const b = buckets[y6strand] ?? (buckets[y6strand] = { done: [], any: [] });
      b.any.push(m.score);
      if (completed.has(topicId)) b.done.push(m.score);
    }
  }
  const out = {};
  for (const [strand, b] of Object.entries(buckets)) {
    const src = b.done.length ? b.done : b.any;
    if (src.length) out[strand] = src.reduce((a, x) => a + x, 0) / src.length;
  }
  return out;
}

// Seed the active Year 6 slice from an imported Year 5 one and retire the
// warm-up check. Returns true when it actually seeded.
//
// Runs on every launch, so it is guarded twice:
//
// 1. `y5Seeded` makes it a ONE-TIME migration. It used to be guarded by
//    diagnosticDone instead, which had it backwards: a device that had already
//    sat the old check was locked out of the Year 5 priors forever — and that
//    check is the very thing we decided was worthless, since it asked Year 6
//    material before a single Year 6 lesson.
// 2. Real practice outranks a borrowed prior. One completed topic or one
//    answered question and this never touches the slice again. (A diagnostic
//    answer is not one of those: recordResult only fills the session's own
//    strand tally for diagnostic items, never state.attempts.)
export function seedY6FromY5(state) {
  const y5 = state.maths?.y5;
  const y6 = state.maths?.[state.maths?.active ?? 'y6'];
  if (!y5 || !y6) return false;
  if (y6.y5Seeded) return false;
  if (y6.completed.length || y6.attempts.length) return false;

  const means = strandMeans(y5);
  // A backup whose topic ids we do not recognise (a hand-edited file, or a
  // future Year 5 rename) tells us nothing. Seeding neutral priors and marking
  // the check done would then quietly throw away the one thing that could
  // still calibrate the year, so the warm-up check stands instead.
  if (!Object.keys(means).length) return false;

  for (const t of topics) {
    const mean = means[t.strand];
    y6.mastery[t.id] = newMastery(mean == null ? 50 : priorFromY5(mean));
  }
  y6.y5Seeded = true;
  y6.diagnosticDone = true;
  // A warm-up check he had already started must not outlive it. Without this,
  // the day card still finds a resumable session from today and offers
  // "Continue" straight back into the questions we just retired.
  if (y6.activeSession?.kind === 'diagnostic') y6.activeSession = null;
  return true;
}

// Put the Year 5 topics into the Year 6 review pool (phase B4, 2026-09-07).
//
// The scheduler reviews whatever is in `completed` and has a mastery entry
// (dueReviewTopics), so this is all it takes: every Year 5 topic is entered as
// completed, with its Year 5 score where the import has one and a neutral 50
// where it does not, and due TODAY so the whole pool is on offer at once —
// weakest-first and the Leitner gaps spread it from there.
//
// Guards, in order:
// 1. `y5ReviewSeeded` makes it a one-time migration (it runs on every launch).
// 2. It needs the y5 slice: without an import the app knows nothing about how
//    Year 5 went, and a pool of guesses would still be a pool of guesses. The
//    parent corner says so next to the import button.
// Unlike seedY6FromY5 it does NOT require an untouched Year 6 slice — the
// device this was built for already had two weeks of Year 6 practice.
//
// The ids go to the FRONT of `completed`: nextNewTopic reads the last two
// entries to avoid three days of the same strand, and those must stay the
// child's real Year 6 history. Returns true when it seeded.
export function seedReviewPoolFromY5(state, today) {
  const y5 = state.maths?.y5;
  const y6 = state.maths?.[state.maths?.active ?? 'y6'];
  if (!y5 || !y6) return false;
  if (y6.y5ReviewSeeded) return false;

  const fresh = [];
  for (const t of y5Topics) {
    const m = y5.mastery?.[t.id];
    if (!y6.mastery[t.id]) {
      const entry = newMastery(typeof m?.score === 'number' ? m.score : 50);
      entry.attempts = m?.attempts ?? 0;
      entry.correct = m?.correct ?? 0;
      entry.lastSeen = m?.lastSeen ?? null;
      entry.box = m?.box ?? 1;
      entry.due = today;
      y6.mastery[t.id] = entry;
    }
    if (y5.stars?.[t.id] && !y6.stars[t.id]) y6.stars[t.id] = y5.stars[t.id];
    if (!y6.completed.includes(t.id)) fresh.push(t.id);
  }
  y6.completed = [...fresh, ...y6.completed];
  y6.y5ReviewSeeded = true;
  return true;
}

// How many Year 6 strands the import could speak to — for the parent corner,
// which should say what the import actually bought.
export function seededStrands(state) {
  const y5 = state.maths?.y5;
  if (!y5) return [];
  const means = strandMeans(y5);
  return [...new Set(topics.map((t) => t.strand))].filter((s) => means[s] != null);
}
