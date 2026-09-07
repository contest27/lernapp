// The Y6 curriculum register. Topic spine and strand layout:
// quality_reports/reference/y6-topic-spine.md (from the official Pearson
// yearly overview — 15 units, books 6A/6B/6C).
//
// Topics of the same strand MUST stay contiguous in the book arrays; the map's
// region builder derives islands from consecutive runs (Y5 handoff §4.3).
// Pearson's two geometry strands keep two keys (position / shapes) so they
// become two clean islands instead of one torn one.

import { topics6a } from './y6a.js';
import { y5Topics, y5TopicById, y6StrandOfY5 } from './y5.js';

export const STRANDS = {
  place: { title: 'Place value island', icon: '🔢' },
  fourops: { title: 'Four operations bay', icon: '➗' },
  fractions: { title: 'Fraction forest', icon: '🍕' },
  position: { title: 'Coordinate coast', icon: '🧭' },
  decimals: { title: 'Decimal city', icon: '💯' },
  percentages: { title: 'Percentage peaks', icon: '💹' },
  algebra: { title: 'Algebra archipelago', icon: '🔤' },
  measure: { title: 'Measure meadows', icon: '📏' },
  ratio: { title: 'Ratio reef', icon: '⚖️' },
  shapes: { title: 'Shape shores', icon: '📐' },
  problem: { title: 'Puzzle peninsula', icon: '🧩' },
  stats: { title: 'Data harbour', icon: '📊' },
};

// `topics` / `topicOrder` are the Year 6 JOURNEY only: the map, the pacing and
// the progress counts all read them. The Year 5 topics (content/y5.js) are
// review material — resolvable by id, never part of the journey.
export const topics = [...topics6a];
export const topicOrder = topics.map((t) => t.id);
export { y5Topics };

const byId = new Map(topics.map((t) => [t.id, t]));
export function topicById(id) {
  return byId.get(id) ?? y5TopicById(id);
}

export function isY6Topic(id) {
  return byId.has(id);
}

// How many JOURNEY topics a slice has finished. `slice.completed` also carries
// the Year 5 review topics once they are seeded (maths/y5-bridge.js), so a
// bare `completed.length` would read "45/13".
export function completedY6(slice) {
  return (slice.completed ?? []).filter((id) => byId.has(id)).length;
}

// Cross-strand prerequisites. Inside a strand the book order always holds, so
// only cross-strand edges are written down. Edges whose target topic is not
// implemented yet live in the spine doc, not here.
export const PREREQS = {
  'u05-frac-amount': ['u02-divide'], // fraction of an amount: divide, then multiply
};

// Handed to the scheduler so the engine stays free of content imports.
export const journeyMeta = {
  // A Year 5 review topic answers with the Year 6 strand it counts as, so the
  // review block's variety rule sees "fourops" for Y5 column addition too.
  strandOf: (id) => byId.get(id)?.strand ?? y6StrandOfY5(id),
  prereqsOf: (id) => PREREQS[id] ?? [],
};

export { diagnosticItems } from './diagnostic.js';
