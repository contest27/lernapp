// The Year 5 register: the 32 PowerMath-Trainer topics as REVIEW material for
// the Year 6 hub (phase B4, 2026-09-07; handoff §6, way 1).
//
// WHY. Reported from the device two weeks into the year: sessions were almost
// all column addition/subtraction. The review pool held only completed Year 6
// topics — three of them — while a new topic arrives every six days by design.
// A whole year of Year 5 material was sitting in the imported backup as
// scores only. Now the topics themselves are here: never on the map, never a
// "new" topic, just what the review block draws from.
//
// The topic modules are verbatim copies of the Year 5 trainer's c5a/c5b/c5c
// (that app is frozen, so there is no upstream to drift from). Their ids stay
// as they were — they are the keys of the imported y5 slice's mastery — and a
// test pins that no Year 6 id ever collides with them.

import { topics5a } from './y5a.js';
import { topics5b } from './y5b.js';
import { topics5c } from './y5c.js';

export const Y5_STRANDS = {
  place: { title: 'Place value island', icon: '🔢' },
  addsub: { title: 'Addition & subtraction bay', icon: '➕' },
  multdiv: { title: 'Times-table mountains', icon: '✖️' },
  stats: { title: 'Data harbour', icon: '📊' },
  fractions: { title: 'Fraction forest', icon: '🍕' },
  decimals: { title: 'Decimal city', icon: '💯' },
  measure: { title: 'Measure meadows', icon: '📏' },
  geometry: { title: 'Shape shores', icon: '📐' },
};

export const y5Topics = [...topics5a, ...topics5b, ...topics5c];
export const y5TopicOrder = y5Topics.map((t) => t.id);

const byId = new Map(y5Topics.map((t) => [t.id, t]));
export function y5TopicById(id) {
  return byId.get(id);
}

// Year 5 strand -> the Year 6 strands it is evidence for. A list, because the
// mapping is genuinely one-to-many in both directions: Year 5 split arithmetic
// into addsub + multdiv where Year 6 has one fourops strand, and Year 5 kept a
// single geometry strand where Year 6 has two (position, shapes).
//
// Deliberately NOT mapped: Year 6's algebra, ratio and problem strands. They
// are new this year — there is no Year 5 evidence for them, and a borrowed
// prior would be a guess dressed up as a measurement. They start neutral.
//
// Two readers: y5-bridge.js (priors, all targets) and content/index.js (the
// scheduler's variety rule, first target only).
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

// The Year 6 strand a Year 5 topic counts as, for the review block's
// "not five fraction topics in a row" rule. Null for an unknown id.
export function y6StrandOfY5(id) {
  const t = byId.get(id);
  return t ? (Y5_TO_Y6_STRAND[t.strand]?.[0] ?? t.strand) : null;
}
