// Synced from powermath-trainer @ 85699c4. Fixes belong upstream first.
import { bandOf } from './mastery.js';
import { daysBetween } from './storage.js';

// The scheduler answers one question: "what should today's session contain?"
// New topics go strictly in curriculum order; review is adaptive.

// How far back the variety rule looks. Two is enough to break up a run — Power
// Maths has six fraction topics and five decimal topics in a row — while still
// letting a strand come back the day after next.
export const VARIETY_LOOKBACK = 2;

// The topics that may legally be started next: the head of every strand's
// remaining queue (so the book order inside a strand is never broken), minus
// anything whose cross-strand prerequisites are not learned yet.
function candidates(state, topicOrder, meta, alsoDone) {
  const done = new Set([...state.completed, ...alsoDone]);
  const heads = new Map();
  for (const id of topicOrder) {
    if (done.has(id)) continue;
    const strand = meta.strandOf(id) ?? id;
    if (!heads.has(strand)) heads.set(strand, id); // insertion order = book order
  }
  const all = [...heads.values()];
  const ready = all.filter((id) => (meta.prereqsOf(id) ?? []).every((p) => done.has(p)));
  return ready.length ? ready : all; // a bad prerequisite edge must never deadlock the journey
}

// The next new topic. Without `meta` this is the old strict curriculum order.
// With it, the choice is adaptive: still the earliest topic in book order, but
// preferring a strand the child has NOT just spent the last two topics on.
// Three days of fractions in a row was the whole reason this exists.
export function nextNewTopic(state, topicOrder, meta = null, alsoDone = []) {
  if (!meta) return topicOrder.find((id) => !state.completed.includes(id)) ?? null;

  const cands = candidates(state, topicOrder, meta, alsoDone);
  if (!cands.length) return null;
  const recent = [...state.completed, ...alsoDone]
    .slice(-VARIETY_LOOKBACK)
    .map((id) => meta.strandOf(id));
  const fresh = cands.filter((id) => !recent.includes(meta.strandOf(id)));
  return (fresh.length ? fresh : cands)[0];
}

// Which due topics make up today's review block. Weakest-first as before, but at
// most ONE of them may share a strand with today's new topic, and never in the
// first slot (the round-robin below gives slot 0 the most items). Without this,
// a day inside the fraction run was fractions from top to bottom.
export function pickReviewTopics(due, newTopic, meta, max = MAX_REVIEW_TOPICS) {
  if (!meta || !newTopic || due.length <= 1) return due.slice(0, max);
  const strand = meta.strandOf(newTopic);
  const same = [], other = [];
  for (const id of due) (meta.strandOf(id) === strand ? same : other).push(id);
  if (!other.length) return due.slice(0, max);
  const out = [other[0]];
  if (same.length) out.push(same[0]); // the topic just learned still deserves its slot
  out.push(...other.slice(1));
  return out.slice(0, max);
}

// Completed topics whose review is due today or overdue, weakest + most overdue first.
export function dueReviewTopics(state, today) {
  return state.completed
    .filter((id) => {
      const m = state.mastery[id];
      return m && m.due && m.due <= today;
    })
    .sort((a, b) => {
      const ma = state.mastery[a], mb = state.mastery[b];
      if (ma.score !== mb.score) return ma.score - mb.score;
      return (ma.due < mb.due) ? -1 : 1;
    });
}

// Tier a review question to the child's current level on that topic.
export function reviewTier(score, rng) {
  const band = bandOf(score);
  if (band === 'struggling') return rng() < 0.6 ? 1 : 2;
  if (band === 'developing') return rng() < 0.5 ? 2 : 3;
  return rng() < 0.35 ? 2 : 3;
}

// Practice ramp for a brand-new topic (7 items, easy -> hard). Shortened from
// 11 on 2026-08-04: 18-question dailies were too long for the summer pace.
export const NEW_TOPIC_TIERS = [1, 1, 2, 2, 2, 3, 3];

export const REVIEW_ITEMS_DAILY = 4;      // review block appended to a new-topic day
export const REVIEW_ITEMS_ONLY = 10;      // once the curriculum is finished
export const MAX_REVIEW_TOPICS = 3;

// Finish-by-target pacing: how many new topics per day are needed to complete
// the journey by settings.targetDate? Null when there is no target, the target
// has passed (no nagging after the holiday), or the journey is finished.
export function pacing(state, topicOrder, today) {
  const target = state.settings?.targetDate;
  if (!target || !state.diagnosticDone) return null;
  const remaining = topicOrder.filter((id) => !state.completed.includes(id)).length;
  if (!remaining) return null;
  const daysLeft = daysBetween(today, target) + 1; // today still counts
  if (daysLeft < 1) return null;
  const perDay = remaining / daysLeft;
  return { remaining, daysLeft, perDay, needTwo: perDay > 1 };
}

// Plan for today's session. Pure: does not mutate state.
export function planSession(state, topicOrder, today, rng, meta = null) {
  if (!state.diagnosticDone) return { kind: 'diagnostic' };

  const newTopic = nextNewTopic(state, topicOrder, meta);
  // On a catch-up day the plan names the second topic up front, so the home card
  // can promise "2 topics today" instead of hiding it behind a button that only
  // appears once the first session is already over.
  const extraTopic = newTopic && pacing(state, topicOrder, today)?.needTwo
    ? nextNewTopic(state, topicOrder, meta, [newTopic])
    : null;
  const due = pickReviewTopics(dueReviewTopics(state, today), newTopic, meta);
  const reviewCount = newTopic ? REVIEW_ITEMS_DAILY : REVIEW_ITEMS_ONLY;

  // Spread review items across the chosen topics, weakest topic gets the most.
  const review = [];
  if (due.length) {
    for (let i = 0; i < reviewCount; i++) {
      const topicId = due[i % due.length];
      review.push({ topicId, tier: reviewTier(state.mastery[topicId].score, rng) });
    }
  }
  if (!newTopic && !review.length) {
    // Nothing due and nothing new: light "keep sharp" mix of the weakest topics.
    const weakest = state.completed
      .slice()
      .sort((a, b) => state.mastery[a].score - state.mastery[b].score)
      .slice(0, MAX_REVIEW_TOPICS);
    for (let i = 0; i < 10 && weakest.length; i++) {
      const topicId = weakest[i % weakest.length];
      review.push({ topicId, tier: reviewTier(state.mastery[topicId].score, rng) });
    }
  }
  return { kind: newTopic ? 'daily' : 'review', newTopic, extraTopic, review };
}
