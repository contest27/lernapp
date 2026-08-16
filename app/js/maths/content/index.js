// The Y6 curriculum register. B0 state: strands and ONE placeholder topic so
// the engine tests and the generator sweep have something real to run on.
// B1 replaces the topic list with the full spine from the Pearson yearly
// overview (quality_reports/reference/y6-yearly-overview.md — 15 units,
// 6A/6B/6C). Topics of the same strand MUST stay contiguous in the book
// arrays; the map's region builder depends on it (Y5 handoff §4.3).

import { topics6a } from './y6a.js';

export const STRANDS = {
  place: { title: 'Place value island', icon: '🔢' },
  fourops: { title: 'Four operations bay', icon: '➗' },
  fractions: { title: 'Fraction forest', icon: '🍕' },
  decimals: { title: 'Decimal city', icon: '💯' },
  percentages: { title: 'Percentage peaks', icon: '💹' },
  algebra: { title: 'Algebra archipelago', icon: '🔤' },
  ratio: { title: 'Ratio reef', icon: '⚖️' },
  measure: { title: 'Measure meadows', icon: '📏' },
  geometry: { title: 'Shape shores', icon: '📐' },
  stats: { title: 'Data harbour', icon: '📊' },
};

export const topics = [...topics6a];
export const topicOrder = topics.map((t) => t.id);

const byId = new Map(topics.map((t) => [t.id, t]));
export function topicById(id) {
  return byId.get(id);
}

// Cross-strand prerequisites (B1 fills these as the spine lands).
export const PREREQS = {};

// Handed to the scheduler so the engine stays free of content imports.
export const journeyMeta = {
  strandOf: (id) => byId.get(id)?.strand ?? null,
  prereqsOf: (id) => PREREQS[id] ?? [],
};
