// Synced from powermath-trainer @ 85699c4. Fixes belong upstream first.
import { addDays } from './storage.js';

// Mastery is an exponentially weighted moving average in [0, 100].
// Misses on easier tiers move the score more than misses on hard ones,
// so struggling with basics pulls a topic back into review quickly.

export function newMastery(initialScore = 50) {
  return { score: clamp(initialScore), attempts: 0, correct: 0, lastSeen: null, due: null, box: 1 };
}

export function updateMastery(m, tier, ok, opts = {}) {
  const wRight = [0.20, 0.17, 0.14][tier - 1] ?? 0.17;
  const wWrong = [0.30, 0.26, 0.20][tier - 1] ?? 0.26;
  // Answering with buddy help gives half credit: the upward move is halved,
  // so an assisted-correct never lifts the score as much as an independent one.
  // A wrong answer stays fully wrong — help only softens the correct case.
  const w = ok ? (opts.assisted ? wRight / 2 : wRight) : wWrong;
  m.score = clamp(Math.round(m.score * (1 - w) + (ok ? 100 : 0) * w));
  m.attempts += 1;
  if (ok && !opts.assisted) m.correct += 1; // "correct" counts independent successes only
  return m;
}

export function bandOf(score) {
  if (score < 60) return 'struggling';
  if (score <= 85) return 'developing';
  return 'secure';
}

// Leitner-style intervals, keyed off the score band after a session.
export function scheduleAfterSession(m, today) {
  const band = bandOf(m.score);
  const gap = band === 'struggling' ? 1 : band === 'developing' ? 3 : 7;
  m.box = band === 'struggling' ? 1 : band === 'developing' ? 2 : 3;
  m.lastSeen = today;
  m.due = addDays(today, gap);
  return m;
}

// Diagnostic gives a strand-level prior copied onto each topic in the strand.
export function diagnosticScore(fractionCorrect) {
  return clamp(Math.round(40 + 45 * fractionCorrect));
}

function clamp(x) {
  return Math.max(5, Math.min(100, x));
}
