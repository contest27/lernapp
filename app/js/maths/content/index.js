// The Y6 curriculum register. Topic spine and strand layout:
// quality_reports/reference/y6-topic-spine.md (from the official Pearson
// yearly overview — 15 units, books 6A/6B/6C).
//
// Topics of the same strand MUST stay contiguous in the book arrays; the map's
// region builder derives islands from consecutive runs (Y5 handoff §4.3).
// Pearson's two geometry strands keep two keys (position / shapes) so they
// become two clean islands instead of one torn one.

import { topics6a } from './y6a.js';

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

export const topics = [...topics6a];
export const topicOrder = topics.map((t) => t.id);

const byId = new Map(topics.map((t) => [t.id, t]));
export function topicById(id) {
  return byId.get(id);
}

// Cross-strand prerequisites. Inside a strand the book order always holds, so
// only cross-strand edges are written down. Edges whose target topic is not
// implemented yet live in the spine doc, not here.
export const PREREQS = {
  'u05-frac-amount': ['u02-divide'], // fraction of an amount: divide, then multiply
};

// Handed to the scheduler so the engine stays free of content imports.
export const journeyMeta = {
  strandOf: (id) => byId.get(id)?.strand ?? null,
  prereqsOf: (id) => PREREQS[id] ?? [],
};

export { diagnosticItems } from './diagnostic.js';
