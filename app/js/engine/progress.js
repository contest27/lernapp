// Synced from powermath-trainer @ 85699c4. Fixes belong upstream first.
import { newMastery, updateMastery, scheduleAfterSession, diagnosticScore } from './mastery.js';
import { daysBetween } from './storage.js';

export function recordAttempt(state, topicId, tier, ok, today, opts = {}) {
  if (!state.mastery[topicId]) state.mastery[topicId] = newMastery();
  updateMastery(state.mastery[topicId], tier, ok, opts);
  state.attempts.push({ d: today, t: topicId, tier, ok: ok ? 1 : 0, ...(opts.assisted ? { a: 1 } : {}) });
}

// Called when the practice block for a new topic ends.
export function completeTopic(state, topicId, correct, total, today) {
  if (!state.completed.includes(topicId)) state.completed.push(topicId);
  const acc = total ? correct / total : 0;
  // "At most one slip" alongside the old 0.85, so the rule reads the same on the
  // 7-item ramp (6/7 = 3 stars, unchanged) and on the short 5-item catch-up ramp,
  // where a flat 0.85 would have demanded a perfect round. The 2-star floor drops
  // to 0.6 for the same reason: on 5 items, 0.7 left no room between 1 and 3.
  const stars = (total && correct >= total - 1) || acc >= 0.85 ? 3 : acc >= 0.6 ? 2 : 1;
  state.stars[topicId] = Math.max(state.stars[topicId] ?? 0, stars);
  scheduleAfterSession(state.mastery[topicId], today);
  return stars;
}

// Reviewed topics get a fresh due date based on their updated score.
export function rescheduleReviewed(state, topicIds, today) {
  for (const id of topicIds) {
    if (state.mastery[id]) scheduleAfterSession(state.mastery[id], today);
  }
}

// How many NEW topics were finished today. Drives the catch-up offer, which
// stops at two so a keen afternoon cannot turn into an endless topic queue.
// Review-only sessions carry a topicId too, hence the kind filter.
export function topicsDoneToday(state, today) {
  return state.history.filter((e) =>
    e.day === today && e.topicId && (e.kind === 'daily' || e.kind === 'focus-new')).length;
}

export function finishSession(state, entry, today) {
  state.history.push({ day: today, ...entry });
  const last = state.streak.lastDay;
  if (last !== today) {
    state.streak.count = last && daysBetween(last, today) === 1 ? state.streak.count + 1 : 1;
    state.streak.lastDay = today;
  }
  state.activeSession = null;
}

// strandResults: { strandId: { correct, total } } from the diagnostic.
export function applyDiagnostic(state, strandResults, topics, today) {
  for (const t of topics) {
    const r = strandResults[t.strand];
    const frac = r && r.total ? r.correct / r.total : 0.5;
    state.mastery[t.id] = newMastery(diagnosticScore(frac));
  }
  state.diagnosticDone = true;
}
