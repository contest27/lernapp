// The difficulty controller.
//
// DESIGN NOTE — why reading time is recorded but never optimised.
// The obvious instrument is "make texts he reads longer". It does not work.
// Dwell time is signless: a long session means engaged OR stuck, and nothing in
// the signal distinguishes them. Worse, a controller told to maximise reading
// volume finds the cheap solution — easier texts. He reads those fast, enjoys
// them, and learns nothing. So difficulty is held inside a band and only
// ENGAGEMENT is optimised within it.
//
// The band is steered by gloss taps per 100 words, which is the one signal here
// that is both volunteered and correctly signed: he taps precisely when he does
// not know a word. The authoring target is ~95–96 % known-word coverage — the
// standard rule of thumb for SUPPORTED reading (independent reading wants ~98 %,
// but this app supplies audio, glosses and follow-up questions). At ~200 words a
// chapter, 95–96 % coverage is about 2–5 gloss taps per 100 words, which is
// where the thresholds below come from.

export const BAND_MIN = 1;
export const BAND_MAX = 10;

export const GLOSS_HIGH = 5;   // above this the text is too hard
export const GLOSS_LOW = 2;    // below this it is too easy
export const TALK_HIGH = 70;   // comprehension must also be solid before moving up
export const CONSECUTIVE = 2;  // chapters that must agree before the band moves
export const DAMPING = 2;      // chapters that must pass after a move before the next

export function wpm(words, seconds) {
  if (!seconds || seconds <= 0) return 0;
  return Math.round((words / seconds) * 60);
}

export function glossPer100(glossTaps, words) {
  if (!words) return 0;
  return Math.round(((glossTaps / words) * 100) * 10) / 10;
}

// One finished (or abandoned) chapter, as the controller sees it.
export function makeEntry({ day, chapterId, band, words, seconds, glossTaps, talkScore, finished }) {
  return {
    day, chapterId, band, words, seconds, glossTaps,
    wpm: wpm(words, seconds),
    glossPer100: glossPer100(glossTaps, words),
    talkScore: talkScore ?? null,
    finished: !!finished,
  };
}

// How many chapters since the band last changed.
//
// This was first derived from the band recorded on each history entry, which
// looked tidier but silently depended on every caller stamping the CURRENT band
// on the entry it passes in. A caller that stamped a stale band defeated the
// damping without any error. `movedAt` — the history length at the last move —
// is recorded explicitly instead, so the guard cannot be broken from outside.
export function chaptersSinceMove(level) {
  const h = level.history ?? [];
  return h.length - (level.movedAt ?? 0);
}

// Pure: returns the band the NEXT chapter should be drawn at, plus why.
// Never moves more than one band, and never twice within DAMPING chapters.
export function decide(level) {
  const h = level.history ?? [];
  const band = level.band;
  const stay = (why) => ({ band, move: 0, why });

  if (h.length < CONSECUTIVE) return stay('not enough evidence yet');
  if (level.movedAt != null && chaptersSinceMove(level) < DAMPING) {
    return stay('damping: band moved too recently');
  }

  const recent = h.slice(-CONSECUTIVE);

  // Abandoned chapters may push the band DOWN but never up. A chapter dropped
  // because it was too hard is exactly the case worth catching; a chapter
  // dropped because dinner was ready says nothing about difficulty, and letting
  // that raise the level would be the worst possible reading of it.
  const tooHard = recent.every((e) => e.glossPer100 > GLOSS_HIGH);
  if (tooHard) {
    return band > BAND_MIN
      ? { band: band - 1, move: -1, why: `gloss rate above ${GLOSS_HIGH} for ${CONSECUTIVE} chapters` }
      : stay('already at the easiest band');
  }

  const allFinished = recent.every((e) => e.finished);
  const tooEasy = allFinished
    && recent.every((e) => e.glossPer100 < GLOSS_LOW)
    && recent.every((e) => e.talkScore != null && e.talkScore >= TALK_HIGH);
  if (tooEasy) {
    return band < BAND_MAX
      ? { band: band + 1, move: +1, why: `gloss rate below ${GLOSS_LOW} with solid comprehension` }
      : stay('already at the hardest band');
  }

  return stay('inside the target band');
}

// Append an entry and apply the decision. Mutates and returns state.level.
export function apply(level, entry) {
  level.history = [...(level.history ?? []), entry];
  const d = decide(level);
  level.band = d.band;
  level.lastDecision = d;
  if (d.move !== 0) level.movedAt = level.history.length;
  return level;
}

// Parent-corner rollup. The child never sees any of this.
export function trend(level, n = 8) {
  const h = (level.history ?? []).slice(-n);
  if (!h.length) return null;
  const mean = (f) => Math.round((h.reduce((s, e) => s + (f(e) ?? 0), 0) / h.length) * 10) / 10;
  return {
    chapters: h.length,
    band: level.band,
    wpm: Math.round(mean((e) => e.wpm)),
    glossPer100: mean((e) => e.glossPer100),
    talkScore: Math.round(mean((e) => e.talkScore)),
    finishedRate: Math.round((h.filter((e) => e.finished).length / h.length) * 100),
  };
}
