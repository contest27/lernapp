// Book 6A topics. B0 carries exactly ONE topic — the first lesson block of
// Unit 1 — as the placeholder that keeps the engine tests, the generator sweep
// and the topic contract honest until B2 writes the real content.
//
// The contract every topic must meet (Y5 handoff §4):
// - answers computed, never hardcoded from a second path
// - gen(rng, tier) deterministic for a given rng, for all three tiers
// - story slots via scenario(rng, key, builders), with structure variety

import { num, mcFrom, ri, fmt } from './gen.js';
import { pvGrid } from './vis.js';

export const topics6a = [
  {
    id: 'u01-pv10m',
    unit: 1,
    book: '6A',
    strand: 'place',
    emoji: '🔢',
    title: 'Place value within 10,000,000',
    shortTitle: 'Place value to 10 million',
    explanation: {
      segments: [
        {
          text: 'Numbers can now go all the way to <b>10,000,000</b> — ten million! The places you know keep going: after hundred-thousands come millions. Each place is worth ten times the one to its right.',
          alt: 'Big numbers up to ten million work just like smaller ones. Every step to the left makes a digit worth ten times more.',
          svg: pvGrid(3452801),
        },
        {
          text: 'To read a long number, split it with commas into groups of three: 4,382,506 is "four million, three hundred and eighty-two thousand, five hundred and six".',
          alt: 'Commas cut the number into blocks of three digits. Read each block, then say million or thousand after it.',
        },
      ],
    },
    example: {
      steps: [
        'What is the value of the digit 7 in 2,748,301?',
        'The 7 sits in the hundred-thousands place.',
        'So it is worth 7 × 100,000 = <b>700,000</b>.',
      ],
    },
    faqs: [
      { q: 'Why do the commas matter?', a: 'They cut the number into blocks of three, so you can read millions and thousands without counting digits one by one.' },
      { q: 'What comes after millions?', a: 'Ten millions! Each new place to the left is worth ten times more.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        // Value of a marked digit in a 5-6 digit number.
        const places = [1000, 10000, 100000];
        const p = places[ri(rng, 0, places.length - 1)];
        const d = ri(rng, 1, 9);
        const noise = ri(rng, 100, 999);
        const n = d * p + noise;
        return num(`What is the value of the digit ${d} in ${fmt(n)}?`, d * p, {
          tier: 1,
          hint: `Which place does the ${d} sit in? Count the places from the right.`,
          explain: `The ${d} is in the ${fmt(p)}s place, so it is worth ${d} × ${fmt(p)} = ${fmt(d * p)}.`,
        });
      }
      if (tier === 2) {
        // Compose a number from its parts (millions now involved).
        const m = ri(rng, 1, 9);
        const t = ri(rng, 10, 999);
        const o = ri(rng, 1, 999);
        const n = m * 1000000 + t * 1000 + o;
        return num(`Write as one number: ${m} million + ${fmt(t)} thousand + ${o}`, n, {
          tier: 2,
          hint: 'Millions have six zeros, thousands have three. Line the parts up before adding.',
          explain: `${m},000,000 + ${fmt(t * 1000)} + ${o} = ${fmt(n)}.`,
        });
      }
      // Tier 3: spot the bigger of two numbers that differ in one middle place.
      const base = ri(rng, 1200, 9800) * 1000 + ri(rng, 0, 999);
      const other = base + (ri(rng, 0, 1) ? 90000 : -90000);
      const bigger = Math.max(base, other);
      return mcFrom(rng, 'Which number is bigger?', bigger, [Math.min(base, other)], {
        tier: 3,
        hint: 'Compare place by place from the LEFT. The first place where they differ decides.',
        explain: `${fmt(bigger)} wins at the ten-thousands place.`,
      });
    },
  },
];
