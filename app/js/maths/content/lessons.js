// The lesson register: all 140 Power Maths Year 6 lessons in book order, so the
// app can follow the class lesson by lesson (maths/school.js, phase B8).
//
// Titles are transcribed verbatim from the official Pearson yearly overview
// (quality_reports/reference/y6-yearly-overview.md) — do not rename them: they
// are what Severin sees at the top of his practice-book pages, and the check-in
// asks him to recognise them.
//
// Each lesson belongs to one app topic (the topic spine,
// quality_reports/reference/y6-topic-spine.md). Book 6B/6C lessons carry
// topicId null until their content exists; the tracker still follows them, it
// just has nothing to preview yet.
//
// The preview for "tomorrow's lesson" comes from a lesson-precise entry where
// one exists (units 4–7, y6a-lessons-*.js, y6b-lessons-*.js), otherwise from
// the topic itself:
// its generator at tiers 1–2 and the first part of its explanation.

import { topicById, isY6Topic } from './index.js';
import { lessonPreviewsU4 } from './y6a-lessons-u4.js';
import { lessonPreviewsU5U6 } from './y6a-lessons-u5u6.js';
import { lessonPreviewsU7 } from './y6b-lessons-u7.js';

// [unit, book, unit title, lesson titles, topic ranges [topicId, firstLesson, lastLesson]]
const UNIT_TABLE = [
  [1, '6A', 'Place value within 10,000,000', [
    'Numbers to 1,000,000',
    'Numbers to 10,000,000 (1)',
    'Numbers to 10,000,000 (2)',
    'Number line to 10,000,000',
    'Comparing and ordering numbers to 10,000,000',
    'Rounding numbers',
    'Negative numbers',
  ], [['u01-pv10m', 1, 5], ['u01-round-neg', 6, 7]]],
  [2, '6A', 'Four operations (1)', [
    'Problem solving – using written methods of addition and subtraction (1)',
    'Problem solving – using written methods of addition and subtraction (2)',
    'Multiplying numbers up to 4 digits by a 1-digit number',
    'Multiplying numbers up to 4 digits by a 2-digit number',
    'Dividing numbers up to 4 digits by a 2-digit number (1)',
    'Dividing numbers up to 4 digits by a 2-digit number (2)',
    'Dividing numbers up to 4 digits by a 2-digit number (3)',
    'Dividing numbers up to 4 digits by a 2-digit number (4)',
    'Dividing numbers up to 4 digits by a 2-digit number (5)',
    'Dividing numbers up to 4 digits by a 2-digit number (6)',
  ], [['u02-addsub', 1, 2], ['u02-multiply', 3, 4], ['u02-divide', 5, 10]]],
  [3, '6A', 'Four operations (2)', [
    'Common factors',
    'Common multiples',
    'Recognising prime numbers up to 100',
    'Squares and cubes',
    'Order of operations',
    'Brackets',
    'Mental calculations (1)',
    'Mental calculations (2)',
    'Reasoning from known facts',
  ], [['u03-factors', 1, 3], ['u03-order-ops', 4, 9]]],
  [4, '6A', 'Fractions (1)', [
    'Simplifying fractions (1)',
    'Simplifying fractions (2)',
    'Fractions on a number line',
    'Comparing and ordering fractions (1)',
    'Comparing and ordering fractions (2)',
    'Adding and subtracting fractions (1)',
    'Adding and subtracting fractions (2)',
    'Adding fractions',
    'Subtracting fractions',
    'Problem solving – adding and subtracting fractions (1)',
    'Problem solving – adding and subtracting fractions (2)',
  ], [['u04-simplify', 1, 3], ['u04-compare', 4, 5], ['u04-addsub-frac', 6, 11]]],
  [5, '6A', 'Fractions (2)', [
    'Multiplying a fraction by a whole number',
    'Multiplying a fraction by a fraction (1)',
    'Multiplying a fraction by a fraction (2)',
    'Dividing a fraction by a whole number (1)',
    'Dividing a fraction by a whole number (2)',
    'Dividing a fraction by a whole number (3)',
    'Four rules with fractions',
    'Calculating fractions of amounts',
    'Problem solving – fractions of amounts',
  ], [['u05-mult-div-frac', 1, 7], ['u05-frac-amount', 8, 9]]],
  [6, '6A', 'Geometry – position and direction', [
    'Plotting coordinates in the first quadrant',
    'Plotting coordinates',
    'Plotting translations and reflections',
    'Reasoning about shapes with coordinates',
  ], [['u06-position', 1, 4]]],
  [7, '6B', 'Decimals', [
    'Multiplying by 10, 100 and 1,000',
    'Dividing by multiples of 10, 100 and 1,000',
    'Decimals as fractions',
    'Fractions as decimals (1)',
    'Fractions as decimals (2)',
    'Multiplying decimals (1)',
    'Multiplying decimals (2)',
    'Dividing decimals (1)',
    'Dividing decimals (2)',
  ], [['u07-dec-place', 1, 5], ['u07-dec-ops', 6, 9]]],
  [8, '6B', 'Percentages', [
    'Percentage of (1)',
    'Percentage of (2)',
    'Percentage of (3)',
    'Percentage of (4)',
    'Finding missing values',
    'Converting fractions to percentages',
    'Equivalent fractions, decimals and percentages (1)',
    'Equivalent fractions, decimals and percentages (2)',
    'Mixed problem solving',
  ], []],
  [9, '6B', 'Algebra', [
    'Finding a rule (1)',
    'Finding a rule (2)',
    'Using a rule (1)',
    'Using a rule (2)',
    'Using a rule (3)',
    'Formulae',
    'Solving equations (1)',
    'Solving equations (2)',
    'Solving equations (3)',
    'Solving equations (4)',
    'Solving equations (5)',
  ], []],
  [10, '6B', 'Measure – imperial and metric measures', [
    'Metric measures',
    'Converting metric measures',
    'Problem solving – metric measures',
    'Miles and km',
    'Imperial measures',
  ], []],
  [11, '6B', 'Measure – perimeter, area and volume', [
    'Shapes with the same area',
    'Area and perimeter (1)',
    'Area and perimeter (2)',
    'Area of a parallelogram',
    'Area of a triangle (1)',
    'Area of a triangle (2)',
    'Area of a triangle (3)',
    'Problem solving – area',
    'Problem solving – perimeter',
    'Volume of a cuboid (1)',
    'Volume of a cuboid (2)',
  ], []],
  [12, '6B', 'Ratio and proportion', [
    'Ratio (1)',
    'Ratio (2)',
    'Ratio (3)',
    'Ratio (4)',
    'Scale drawings',
    'Scale factors',
    'Similar shapes',
    'Problem solving – ratio and proportion (1)',
    'Problem solving – ratio and proportion (2)',
  ], []],
  [13, '6C', 'Geometry – properties of shapes', [
    'Measuring with a protractor',
    'Drawing shapes accurately',
    'Angles in triangles (1)',
    'Angles in triangles (2)',
    'Angles in triangles (3)',
    'Angles in polygons (1)',
    'Angles in polygons (2)',
    'Vertically opposite angles',
    'Equal distance',
    'Parts of a circle',
    'Nets (1)',
    'Nets (2)',
  ], []],
  [14, '6C', 'Problem solving', [
    'Problem solving – place value',
    'Problem solving – negative numbers',
    'Problem solving – addition and subtraction',
    'Problem solving – four operations (1)',
    'Problem solving – four operations (2)',
    'Problem solving – fractions',
    'Problem solving – decimals',
    'Problem solving – percentages',
    'Problem solving – ratio and proportion',
    'Problem solving – time (1)',
    'Problem solving – time (2)',
    'Problem solving – position and direction',
    'Problem solving – properties of shapes (1)',
    'Problem solving – properties of shapes (2)',
  ], []],
  [15, '6C', 'Statistics', [
    'The mean (1)',
    'The mean (2)',
    'The mean (3)',
    'Introducing pie charts',
    'Reading and interpreting pie charts',
    'Fractions and pie charts (1)',
    'Fractions and pie charts (2)',
    'Percentages and pie charts',
    'Interpreting line graphs',
    'Constructing line graphs',
  ], []],
];

const pad = (n) => String(n).padStart(2, '0');
export const lessonId = (unit, n) => `u${pad(unit)}-l${pad(n)}`;

export const UNITS = UNIT_TABLE.map(([unit, book, title, titles]) => ({
  unit, book, title, count: titles.length,
}));

export const LESSONS = UNIT_TABLE.flatMap(([unit, book, , titles, ranges]) =>
  titles.map((title, i) => {
    const n = i + 1;
    const range = ranges.find(([, a, b]) => n >= a && n <= b);
    return { id: lessonId(unit, n), book, unit, n, title, topicId: range ? range[0] : null };
  }));

const byId = new Map(LESSONS.map((l, i) => [l.id, { ...l, index: i }]));

export function lessonById(id) {
  return byId.get(id) ?? null;
}

// Position in book order, or -1 for an unknown id.
export function lessonIndex(id) {
  return byId.get(id)?.index ?? -1;
}

// The lesson after `id` in book order; the first lesson for null; null after the last.
export function nextLesson(id) {
  if (id == null) return LESSONS[0];
  const i = lessonIndex(id);
  return i < 0 ? null : LESSONS[i + 1] ?? null;
}

export function lessonsOfUnit(unit) {
  return LESSONS.filter((l) => l.unit === unit);
}

export function unitById(unit) {
  return UNITS.find((u) => u.unit === unit) ?? null;
}

// "U4 · L7" — the short label used on cards and in the parent log.
export function lessonLabel(id) {
  const l = lessonById(id);
  return l ? `U${l.unit} · L${l.n}` : '';
}

// The last lesson of every app topic, in book order. A topic counts as TAUGHT
// once the class has reached its last lesson (school.js → markTaught).
export const TOPIC_LAST_LESSON = (() => {
  const out = {};
  for (const l of LESSONS) if (l.topicId) out[l.topicId] = l.id;
  return out;
})();

// Topics the class has finished in class once it has done `id` (inclusive).
export function topicsTaughtBy(id) {
  const upTo = lessonIndex(id);
  if (upTo < 0) return [];
  return Object.entries(TOPIC_LAST_LESSON)
    .filter(([topicId, last]) => lessonIndex(last) <= upTo && isY6Topic(topicId))
    .map(([topicId]) => topicId);
}

// Lesson-precise previews, keyed by lesson id.
export const LESSON_PREVIEWS = { ...lessonPreviewsU4, ...lessonPreviewsU5U6, ...lessonPreviewsU7 };

// How many explanation parts a topic-level fallback preview borrows. The full
// topic explanation is a whole lesson; tomorrow's warm-up only needs its start.
const FALLBACK_SEGMENTS = 2;

// What the warm-up for lesson `id` is made of, or null when there is nothing to
// show yet (6B/6C before their content lands).
//   gen(rng, tier)  — a question of this lesson's type, tiers 1–2
//   segments        — the intro, in the explanation-segment shape
//   example         — a worked example { steps } or null
//   own             — true for a lesson-precise preview, false for the topic fallback
export function previewOf(id) {
  const l = lessonById(id);
  if (!l || !l.topicId) return null;
  const topic = topicById(l.topicId);
  if (!topic) return null;
  const own = LESSON_PREVIEWS[id];
  if (own) {
    return {
      lesson: l, topic, own: true,
      gen: (rng, tier) => own.gen(rng, tier),
      segments: [own.intro],
      example: own.example ?? null,
    };
  }
  return {
    lesson: l, topic, own: false,
    gen: (rng, tier) => topic.gen(rng, tier),
    segments: (topic.explanation?.segments ?? []).slice(0, FALLBACK_SEGMENTS),
    example: topic.example ?? null,
  };
}
