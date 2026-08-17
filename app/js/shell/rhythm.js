// The weekly rhythm: which subject a day belongs to, and how fast new maths
// topics may arrive.
//
// The Year 5 app was a summer sprint — one new topic every single day, driven
// by a finish-by date that only ever ACCELERATED (catch-up days). Year 6 is the
// opposite problem: the material has to last a school year and stay roughly
// level with what the class is teaching, so the app has to hold topics BACK.
//
// Two independent dials, decided 2026-08-16:
//   1. Maths and English alternate by day, so a day has one subject, not two.
//   2. On a maths day a NEW topic is only introduced every `newTopicEveryDays`
//      days; the days between are review.
//
// Pure: dates in, decisions out. No store, no DOM.

import { daysBetween } from '../engine/storage.js';

// The alternation anchor. Any fixed date works — it only sets which parity of
// day is maths; keeping it constant keeps the rhythm stable across devices.
const EPOCH = '2026-01-01';

// ~31 topics over a school year, on maths days only, works out near six days
// per new topic. Parent-editable; 0 or null switches the throttle off.
export const DEFAULT_NEW_TOPIC_EVERY = 6;

// 'maths' on even days from the epoch, 'english' on odd ones. A suggestion the
// home screen shows — never a lock: practising anyway is always allowed.
export function subjectOfDay(today) {
  return daysBetween(EPOCH, today) % 2 === 0 ? 'maths' : 'english';
}

// The last day a NEW topic was started, from the curriculum's own history.
// Review-only sessions and map practice on finished topics do not count.
export function lastNewTopicDay(slice) {
  let last = null;
  for (const e of slice.history ?? []) {
    if (!e.topicId) continue;
    if (e.kind !== 'daily' && e.kind !== 'focus-new') continue;
    if (!last || e.day > last) last = e.day;
  }
  return last;
}

// May a new topic start today? True when the throttle is off, when nothing has
// ever been started, or when enough days have passed. `interval` comes from the
// curriculum's settings so Year 6 and an imported Year 5 can differ.
export function mayStartNewTopic(slice, today, interval = DEFAULT_NEW_TOPIC_EVERY) {
  if (!interval || interval < 1) return true;
  const last = lastNewTopicDay(slice);
  if (!last) return true;
  return daysBetween(last, today) >= interval;
}

// Everything the day screens need, in one call.
//   subject      — whose day it is
// 	 newTopic     — may a new maths topic start today?
//   daysToNext   — 0 if a topic may start, else how many days still to wait
export function dayPlan(slice, today, interval = DEFAULT_NEW_TOPIC_EVERY) {
  const subject = subjectOfDay(today);
  const allowed = mayStartNewTopic(slice, today, interval);
  const last = lastNewTopicDay(slice);
  const waited = last ? daysBetween(last, today) : Infinity;
  return {
    subject,
    newTopic: subject === 'maths' && allowed,
    daysToNext: allowed ? 0 : Math.max(1, (interval || 0) - waited),
  };
}

// ---------------------------------------------------------------- deferrals

// How long a "we have not had this in class yet" stays in force. Long enough
// for the class to catch up, short enough that nothing is lost for good — and
// the parent corner can lift one early.
export const DEFER_DAYS = 21;

// Topic ids still pushed back today. Expired entries are simply not returned;
// they are cleaned out of the store on the next defer (see deferTopic).
export function activeDeferrals(slice, today, days = DEFER_DAYS) {
  const out = [];
  for (const [id, day] of Object.entries(slice.deferred ?? {})) {
    if (daysBetween(day, today) < days) out.push(id);
  }
  return out;
}

// Push a topic back. Mutates the slice; the caller saves.
export function deferTopic(slice, topicId, today, days = DEFER_DAYS) {
  slice.deferred ??= {};
  for (const [id, day] of Object.entries(slice.deferred)) {
    if (daysBetween(day, today) >= days) delete slice.deferred[id];
  }
  slice.deferred[topicId] = today;
  return slice;
}

export function undeferTopic(slice, topicId) {
  if (slice.deferred) delete slice.deferred[topicId];
  return slice;
}
