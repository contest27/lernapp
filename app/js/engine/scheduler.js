// Synced from powermath-trainer @ 85699c4. Fixes belong upstream first.
//
// DIVERGED 2026-08-16 (the Y5 app is frozen, so there is no upstream to send it
// to): planSession takes an options object. Year 5 was a sprint that only ever
// accelerated; Year 6 must stretch across a school year and stay level with the
// class, so the caller needs to say "no new topic today" (cadence) and "not
// this one" (the child said it has not been taught yet). Both only affect topic
// SELECTION — mastery, review and scoring are untouched.
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

// ONE SITTING IS ONE UNIT OF ABOUT ELEVEN QUESTIONS (2026-08-25).
//
// The parts were sized independently before, and the arithmetic showed: a new
// topic with review behind it came to 11, a review-only day to 10, but a new
// topic with nothing yet due came to 7 — and the very first day of Year 6 is
// exactly that case. Reported from the sofa: a short unit, then a separate
// review unit, and every time an argument about whether the second one still
// counts. A child who has finished something has finished; anything after it is
// negotiable.
//
// So the session length is the constant now, and the parts are derived from it.
// Eleven is the Year 5 number that worked (see the 2026-08-04 note below).
export const SESSION_ITEMS = 11;

// Practice ramp for a brand-new topic, easy -> hard. Shortened from 11 to 7 on
// 2026-08-04 because 18-question dailies (11 + 7 review) were too long for the
// summer pace; the review block behind it brings the day back to SESSION_ITEMS.
export const NEW_TOPIC_TIERS = [1, 1, 2, 2, 2, 3, 3];

// The ramp for a new topic with NO review to follow it — the first day of a
// curriculum, or a topic whose predecessors are not due yet. It carries the
// whole session on its own, so it is the full eleven: the same easy -> hard
// shape, just with more practice at each step.
export const NEW_TOPIC_TIERS_SOLO = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3];

export const REVIEW_ITEMS_DAILY = SESSION_ITEMS - NEW_TOPIC_TIERS.length;  // 4
export const REVIEW_ITEMS_ONLY = SESSION_ITEMS;   // a day with no new topic
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
export function planSession(state, topicOrder, today, rng, meta = null, opts = {}) {
  if (!state.diagnosticDone) return { kind: 'diagnostic' };

  // skip: topics to pass over when choosing (deferred by the child).
  // allowNewTopic: false turns today into a review day (cadence throttle).
  const { skip = [], allowNewTopic = true } = opts;
  let newTopic = allowNewTopic ? nextNewTopic(state, topicOrder, meta, skip) : null;

  // A session must never be empty. At the very start of a curriculum nothing is
  // completed, so there is nothing to review either — and a day the cadence
  // marked review-only opened a session with no questions at all. Starting the
  // next topic is the only useful thing left to do. This can only fire before
  // the first topic is finished; after that the weakest-topics fallback below
  // always has material.
  if (!newTopic && !dueReviewTopics(state, today).length && !state.completed.length) {
    newTopic = nextNewTopic(state, topicOrder, meta, skip);
  }
  // On a catch-up day the plan names the second topic up front, so the home card
  // can promise "2 topics today" instead of hiding it behind a button that only
  // appears once the first session is already over.
  const extraTopic = newTopic && pacing(state, topicOrder, today)?.needTwo
    ? nextNewTopic(state, topicOrder, meta, [...skip, newTopic])
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
    for (let i = 0; i < REVIEW_ITEMS_ONLY && weakest.length; i++) {
      const topicId = weakest[i % weakest.length];
      review.push({ topicId, tier: reviewTier(state.mastery[topicId].score, rng) });
    }
  }

  // The ramp is chosen here, not by the screen, because only the plan knows
  // whether anything follows it. A new topic with no review behind it has to
  // carry the whole sitting; with review behind it, the two add up to
  // SESSION_ITEMS between them.
  const tiers = newTopic ? (review.length ? NEW_TOPIC_TIERS : NEW_TOPIC_TIERS_SOLO) : [];

  return { kind: newTopic ? 'daily' : 'review', newTopic, extraTopic, review, tiers };
}
