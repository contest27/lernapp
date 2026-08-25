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

// Year 5 topic -> Year 5 strand. Copied from powermath-trainer's
// content/index.js + c5a/c5b/c5c topic list; the Y5 TOPIC MODULES are not
// ported yet (phase B4), so an imported y5 slice carries topic ids and scores
// but no strand information of its own. When B4 lands, this table is replaced
// by the real content module's journeyMeta.strandOf.
export const Y5_TOPIC_STRAND = {
  'u01-pv100k': 'place', 'u02-pv1m': 'place', 'u02-negatives': 'place',
  'u03-column': 'addsub', 'u03-mental': 'addsub', 'u03-problems': 'addsub',
  'u04-graphs': 'stats',
  'u05-factors': 'multdiv', 'u05-squares': 'multdiv',
  'u06-perimeter': 'measure', 'u06-area': 'measure',
  'u07-written-mult': 'multdiv', 'u07-long-mult': 'multdiv', 'u07-division': 'multdiv',
  'u08-equivalent': 'fractions', 'u08-mixed': 'fractions',
  'u09-addsub-frac': 'fractions', 'u09-mixed-addsub': 'fractions',
  'u10-mult-frac': 'fractions', 'u10-frac-amounts': 'fractions',
  'u11-decimals-frac': 'decimals', 'u11-compare-dec': 'decimals', 'u11-percent': 'decimals',
  'u12-addsub-dec': 'decimals', 'u12-shift-dec': 'decimals',
  'u13-angle-types': 'geometry', 'u13-missing-angles': 'geometry',
  'u14-shapes': 'geometry', 'u15-position': 'geometry',
  'u16-metric': 'measure', 'u16-imperial-time': 'measure', 'u17-volume': 'measure',
};

// Year 5 strand -> the Year 6 strands it is evidence for. A list, because the
// mapping is genuinely one-to-many in both directions: Year 5 split arithmetic
// into addsub + multdiv where Year 6 has one fourops strand, and Year 5 kept a
// single geometry strand where Year 6 has two (position, shapes).
//
// Deliberately NOT mapped: Year 6's algebra, ratio and problem strands. They
// are new this year — there is no Year 5 evidence for them, and a borrowed
// prior would be a guess dressed up as a measurement. They start neutral.
export const Y5_TO_Y6_STRAND = {
  place: ['place'],
  addsub: ['fourops'],
  multdiv: ['fourops'],
  fractions: ['fractions'],
  decimals: ['decimals', 'percentages'], // Y5 u11-percent lives in decimals
  measure: ['measure'],
  geometry: ['position', 'shapes'],
  stats: ['stats'],
};

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
    const y5strand = Y5_TOPIC_STRAND[topicId];
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

// Seed the active Year 6 slice from an imported Year 5 one and mark the
// warm-up check done. Returns true when it actually seeded.
//
// Idempotent by the same guard that makes it safe: any evidence on the y6
// slice — a finished check, a completed topic, a single answered question —
// and the function does nothing at all. It can therefore run on every launch.
export function seedY6FromY5(state) {
  const y5 = state.maths?.y5;
  const y6 = state.maths?.[state.maths?.active ?? 'y6'];
  if (!y5 || !y6) return false;
  if (y6.diagnosticDone || y6.completed.length || y6.attempts.length) return false;

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
  y6.diagnosticDone = true;
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
