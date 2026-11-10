// The class tracker (phase B8, 2026-11-10): the app follows Severin's class
// lesson by lesson and gets him ready for TOMORROW's lesson.
//
// Why: the class does about three practice-book pages a day — roughly one
// Power Maths lesson — and he does not always finish them; the books stay at
// school. So the app asks him at a check-in which lesson the class did, and the
// day's ten minutes go to the NEXT lesson's task type: when it turns up in class
// he has seen it already and does not lose the first minutes working out how it
// goes. This replaces the old guesswork about the class position (a new topic
// every six days, "we have not had this in class yet").
//
// Pure: dates and slices in, decisions out. No DOM, no store.

import { lessonById, lessonIndex, nextLesson, topicsTaughtBy, previewOf } from './content/lessons.js';
import { topicById } from './content/index.js';
import { newMastery, scheduleAfterSession } from '../engine/mastery.js';
import { dueReviewTopics, reviewTier } from '../engine/scheduler.js';
import { addDays } from '../engine/storage.js';
import { BUILD } from '../shell/build.js';

// The daily round (decided 2026-11-10): 4 questions of tomorrow's lesson,
// easy -> medium, and 2 to keep earlier topics fresh. When he reported today's
// pages as not finished, 2 questions of today's lesson come first.
export const PREVIEW_TIERS = [1, 1, 2, 2];
export const CATCHUP_TIERS = [1, 2];
export const PREVIEW_REVIEW_ITEMS = 2;
// A day whose next lesson has no content yet (book 6B/6C before it lands) is a
// review round of the same length as a normal one.
export const REVIEW_DAY_ITEMS = 6;
export const REVIEW_DAY_TOPICS = 3;

// ------------------------------------------------------------------ calendar

// 0 = Sunday … 6 = Saturday, for a 'YYYY-MM-DD' key (local calendar date, so
// no time zone can shift it to the day before).
export function weekday(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function isSchoolDay(day) {
  const w = weekday(day);
  return w >= 1 && w <= 5;
}

// Today on a weekday; the Friday before on a weekend.
export function lastSchoolDay(today) {
  let d = today;
  while (!isSchoolDay(d)) d = addDays(d, -1);
  return d;
}

// ------------------------------------------------------------------ position

export function hasPosition(slice) {
  return !!slice.school?.pos;
}

// Is a check-in owed? On a school day: when there was none today. At the
// weekend: when there was none since Friday — so a Friday he forgot is still
// asked about on Saturday, and a weekend after a Friday check-in asks nothing.
// Holidays look like school days to this rule; "No new lesson today" is one tap.
export function checkinDue(slice, today) {
  const last = slice.school?.lastCheckin;
  if (!last) return true;
  return last < lastSchoolDay(today);
}

// The lesson the class is expected to do next, or null before the first
// check-in (the app does not know where the class is yet) and after the last.
export function predictedLesson(slice) {
  const pos = slice.school?.pos;
  return pos ? nextLesson(pos) : null;
}

// A topic the class has finished in school joins the review pool. Mastery
// earned in the app (previews, map practice) is kept; a topic with none starts
// neutral. Stars are left alone — only practice in the app earns them.
export function markTaught(slice, topicId, today) {
  if (slice.completed.includes(topicId)) return false;
  slice.completed.push(topicId);
  slice.mastery[topicId] ??= newMastery(50);
  scheduleAfterSession(slice.mastery[topicId], today);
  return true;
}

// Record a check-in. `lesson` is a lesson id, or null for "no new lesson
// today"; `finished` is whether he finished those pages (null when not asked).
// One entry per day: a second check-in on the same day is a correction, so it
// first undoes the earlier one (each entry remembers the position before it).
// Jumping several lessons ahead (a check-in he missed) and stepping back both
// work. Topics already marked taught stay taught on a step back.
// Mutates the slice; returns { pos, taught: [topicIds newly in the pool] }.
export function applyCheckin(slice, today, { lesson = null, finished = null } = {}) {
  const s = slice.school;
  if (lesson && !lessonById(lesson)) throw new Error('unknown lesson ' + lesson);
  const prior = s.log.find((e) => e.day === today);
  if (prior) {
    s.pos = prior.before ?? null;
    s.log = s.log.filter((e) => e !== prior);
  }
  const before = s.pos;
  if (lesson) s.pos = lesson;
  s.log.push({ day: today, lesson, finished: lesson ? finished : null, before });
  s.lastCheckin = today;
  const taught = [];
  if (s.pos) {
    for (const id of topicsTaughtBy(s.pos)) if (markTaught(slice, id, today)) taught.push(id);
  }
  return { pos: s.pos, taught };
}

// The lesson whose pages he did NOT finish, when that is what he reported at
// the latest check-in; null otherwise.
export function catchUpLesson(slice) {
  const last = slice.school?.log?.at(-1);
  return last?.lesson && last.finished === false ? last.lesson : null;
}

// ------------------------------------------------------------------ the round

// Review topics for the round: due first (weakest, most overdue), then the
// weakest completed ones, never a topic the round already practises.
function reviewTopics(slice, today, exclude, max) {
  const out = [];
  const add = (id) => {
    if (out.length < max && !exclude.has(id) && !out.includes(id) && topicById(id)) out.push(id);
  };
  for (const id of dueReviewTopics(slice, today)) add(id);
  const weakest = slice.completed
    .filter((id) => slice.mastery[id])
    .sort((a, b) => slice.mastery[a].score - slice.mastery[b].score);
  for (const id of weakest) add(id);
  return out;
}

// What today's round is made of. Pure: the item specs, not the questions.
//   target     — tomorrow's lesson id (null before the first check-in / after the last)
//   hasPreview — false when that lesson has no content yet → a review round
//   catchUp    — the unfinished lesson whose 2 questions open the round, or null
//   introAt    — index of the first preview item (the intro is shown there)
//   items      — [{ part: 'catchup'|'preview'|'review', lessonId, topicId, tier }]
export function planPreview(slice, today, rng) {
  const target = predictedLesson(slice);
  const tp = target ? previewOf(target.id) : null;
  const catchUp = catchUpLesson(slice);
  const cp = catchUp && catchUp !== target?.id ? previewOf(catchUp) : null;

  const items = [];
  if (cp) {
    for (const tier of CATCHUP_TIERS) {
      items.push({ part: 'catchup', lessonId: catchUp, topicId: cp.lesson.topicId, tier });
    }
  }
  const introAt = tp ? items.length : null;
  if (tp) {
    for (const tier of PREVIEW_TIERS) {
      items.push({ part: 'preview', lessonId: target.id, topicId: tp.lesson.topicId, tier });
    }
  }

  const exclude = new Set([tp?.lesson.topicId, cp?.lesson.topicId].filter(Boolean));
  const count = tp ? PREVIEW_REVIEW_ITEMS : REVIEW_DAY_ITEMS;
  const pool = reviewTopics(slice, today, exclude, tp ? PREVIEW_REVIEW_ITEMS : REVIEW_DAY_TOPICS);
  for (let i = 0; i < count && pool.length; i++) {
    const topicId = pool[i % pool.length];
    items.push({ part: 'review', lessonId: null, topicId, tier: reviewTier(slice.mastery[topicId]?.score ?? 50, rng) });
  }

  return {
    target: target?.id ?? null,
    hasPreview: !!tp,
    catchUp: cp ? catchUp : null,
    introAt,
    items,
  };
}

// Build the round as a session object for the shared session screen. The
// questions are generated here and stored finished (see shell/build.js for why
// the BUILD stamp matters). Preview and catch-up items count as 'practice' for
// the summary; `tag` says which one they are for the screen.
export function buildPreviewSession(slice, today, rng) {
  const plan = planPreview(slice, today, rng);
  const seen = [];
  const gen = (fn, tier) => {
    let q = fn(rng, tier);
    for (let i = 0; i < 4 && seen.includes(q.prompt); i++) q = fn(rng, tier);
    seen.push(q.prompt);
    if (seen.length > 6) seen.shift();
    return q;
  };
  const items = plan.items.map((it) => {
    if (it.part === 'review') {
      const t = topicById(it.topicId);
      return { q: gen((r, tier) => t.gen(r, tier), it.tier), topicId: it.topicId, part: 'review', tag: 'review' };
    }
    const p = previewOf(it.lessonId);
    return { q: gen(p.gen, it.tier), topicId: it.topicId, lessonId: it.lessonId, part: 'practice', tag: it.part };
  });
  return {
    day: today,
    build: BUILD,
    kind: 'preview',
    lessonId: plan.target,
    hasPreview: plan.hasPreview,
    catchUpId: plan.catchUp,
    introAt: plan.introAt,
    newTopic: null,
    phase: plan.hasPreview && plan.introAt === 0 ? 'explain' : 'items',
    items, idx: 0,
    results: [],
    diag: {},
    startedAt: Date.now(),
    segIdx: 0,
  };
}

// A topic-shaped view of a lesson's warm-up, so the existing lesson screen
// (explainView, explanationSheet, the tutor) can show it unchanged.
export function previewTopicView(lessonId) {
  const p = previewOf(lessonId);
  if (!p) return null;
  return {
    id: p.topic.id,
    strand: p.topic.strand,
    emoji: p.topic.emoji,
    title: p.lesson.title,
    shortTitle: p.lesson.title,
    explanation: { segments: p.segments },
    example: p.example,
    faqs: p.topic.faqs ?? [],
  };
}

// Where the class is in the book, for the progress line: 1-based lesson count.
export function lessonsDone(slice) {
  const i = lessonIndex(slice.school?.pos);
  return i < 0 ? 0 : i + 1;
}
