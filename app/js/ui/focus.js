// Focused practice launched from the treasure map: one topic, no review tail.
// Pure logic only (no DOM, no store, no go) so the session screen and the tests
// share it — same split as map-scene.js vs map.js. session.js owns the
// navigation wrapper (startFocusSession) and the screen views.

import { topicById, topics } from '../maths/content/index.js';
import { NEW_TOPIC_TIERS, reviewTier } from '../engine/scheduler.js';
import {
  completeTopic, rescheduleReviewed, finishSession, applyDiagnostic,
} from '../engine/progress.js';

export const FOCUS_REVIEW_ITEMS = 6;

// The second topic of a catch-up day arrives on top of a full 11-item daily, so
// its ramp is shorter than a map practice: 5 items, still easy -> hard. Only the
// 'today' origin gets it — a station tap from the map is a normal first lesson.
export const CATCHUP_TOPIC_TIERS = [1, 2, 2, 3, 3];

// Build a single-topic session. mode 'new' → explanation + the 7-item ramp;
// mode 'review' → 6 adaptive-tier items, no explanation. Mirrors buildSession's
// prompt-dedupe but never appends a review block. origin decides where Finish
// returns to: 'map' for station taps, 'today' for the catch-up flow.
export function buildFocusSession(state, topicId, mode, today, rng, origin = 'map') {
  const t = topicById(topicId);
  const seen = [];
  const gen = (topic, tier) => {
    let q = topic.gen(rng, tier);
    for (let i = 0; i < 4 && seen.includes(q.prompt); i++) q = topic.gen(rng, tier);
    seen.push(q.prompt);
    if (seen.length > 6) seen.shift();
    return q;
  };

  const items = [];
  if (mode === 'new') {
    const tiers = origin === 'today' ? CATCHUP_TOPIC_TIERS : NEW_TOPIC_TIERS;
    for (const tier of tiers) items.push({ q: gen(t, tier), topicId, part: 'practice' });
  } else {
    const score = state.mastery[topicId]?.score ?? 50;
    for (let i = 0; i < FOCUS_REVIEW_ITEMS; i++) {
      items.push({ q: gen(t, reviewTier(score, rng)), topicId, part: 'review' });
    }
  }

  return {
    day: today,
    kind: mode === 'new' ? 'focus-new' : 'focus-review',
    newTopic: mode === 'new' ? topicId : null,
    focusTopic: topicId,
    focus: true,
    origin,
    phase: mode === 'new' ? 'explain' : 'items',
    items, idx: 0,
    results: [],
    diag: {},
    startedAt: Date.now(),
    segIdx: 0,
  };
}

// End-of-session effects, extracted from session.js endItems so both the daily
// and focus flows share one tested seam. Mutates state, sets s.summary/s.phase.
export function applySessionEnd(state, s, today) {
  const practice = s.results.filter((r) => r.part === 'practice');
  const review = s.results.filter((r) => r.part === 'review');

  if (s.kind === 'diagnostic') {
    applyDiagnostic(state, s.diag, topics, today);
    s.summary = { kind: 'diagnostic' };
  } else {
    let stars = null;
    if (s.newTopic && practice.length) {
      stars = completeTopic(state, s.newTopic, practice.filter((r) => r.ok).length, practice.length, today);
    }
    rescheduleReviewed(state, [...new Set(review.map((r) => r.topicId))], today);
    s.summary = {
      kind: s.kind, stars,
      practice: { ok: practice.filter((r) => r.ok).length, total: practice.length },
      review: { ok: review.filter((r) => r.ok).length, total: review.length },
    };
  }

  const minutes = Math.max(1, Math.round((Date.now() - s.startedAt) / 60000));
  const all = s.results;
  const entry = {
    kind: s.kind, topicId: s.newTopic ?? s.focusTopic ?? null,
    total: all.length, correct: all.filter((r) => r.ok).length, minutes,
  };

  if (s.focus && s.kind === 'focus-review') {
    // Bonus practice: history only. No streak, and the daily lesson in
    // activeSession is left completely untouched.
    state.history.push({ day: today, ...entry });
    state.focusSession = s;
  } else {
    // Daily, diagnostic, and focus-new all finish a "real" session: streak +
    // history, and activeSession is nulled. For focus-new that nulling drops
    // the now-stale same-topic daily lesson (its newTopic just got completed).
    finishSession(state, entry, today);
    if (s.focus) state.focusSession = s;
    else state.activeSession = s; // keep the daily session object for its summary screen
  }
  s.phase = 'summary';
}

// Decide what a station tap does. Pure so it is unit-testable.
export function stationAction(state, topic, status) {
  if (!state.diagnosticDone) {
    return { kind: 'toast', msg: `🎯 ${topic.shortTitle} — let's do the warm-up check first!` };
  }
  if (status === 'locked') {
    return { kind: 'toast', msg: `🔒 ${topic.shortTitle} — sail here later!` };
  }
  // 'open' — a topic the variety rotation stepped over — starts as a new lesson
  // just like 'current' does; only a finished topic opens as review.
  return { kind: 'sheet', mode: status === 'done' ? 'review' : 'new' };
}
