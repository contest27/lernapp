// Lesson-precise warm-ups for Unit 4 — Fractions (1) (phase B8): one entry per
// lesson of the official Power Maths Y6 list (lessons.js). Each warm-up drills
// the task type of THAT lesson at tiers 1–2, so the type is already familiar
// when it turns up in class the next day. Contract: lessons.js → previewOf.
// House style and vocabulary follow the topic generators in y6a-frac.js.
//
// Rules this file keeps:
//  - Every answer is computed from the generated values (non-negotiable 4).
//  - The fraction pad has a numerator and a denominator field only. A mixed-
//    number answer is therefore a multiple-choice option built with mixed(),
//    an improper fraction the prompt asks for by name, or one part of the
//    mixed number typed with num().
//  - Multiple-choice distractors are misconceptions (added denominators,
//    forgot the exchange, counted the marks instead of the gaps, …) and are
//    dropped when they equal the answer in VALUE, so exactly one option is right.
//  - Only the passed rng is used — no scenario() decks — so the same seed
//    always gives the same question.
//  - Fractions in prompts are written in simplest form where the task allows
//    it. Results stay as the method produces them; the checker accepts any
//    equivalent fraction unless the question asks for the simplest form.

import { num, tf, mc, mcFrom, order, frac, fr, ri, pick, shuffle } from './gen.js';
import { fracBar, barModel } from './vis.js';
import { gcd, simplify, mixed } from './y6a-frac.js';

const NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Emma', 'Finn', 'Grace', 'Hugo', 'Isla', 'Jack'];
const PARTS = {
  2: 'halves', 3: 'thirds', 4: 'quarters', 5: 'fifths', 6: 'sixths', 7: 'sevenths',
  8: 'eighths', 9: 'ninths', 10: 'tenths', 11: 'elevenths', 12: 'twelfths', 14: 'fourteenths',
};
const SIGNS = ['&lt;', '&gt;', '='];
const LETTERS = ['A', 'B', 'C', 'D'];

// Simplest proper fractions that the simplifying warm-ups scale up.
const BASES_SMALL = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6]];
const BASES = [...BASES_SMALL, [1, 7], [2, 7], [3, 7], [3, 8], [5, 8], [7, 8], [2, 9], [4, 9], [3, 10], [7, 10]];
const IMPROPER = [[3, 2], [5, 2], [4, 3], [5, 3], [7, 3], [5, 4], [7, 4], [9, 4], [6, 5], [7, 5], [8, 5], [7, 6]];
// Already in simplest form, but not obviously so.
const TRICKY_SIMPLEST = [[4, 9], [5, 8], [3, 10], [7, 12], [5, 9], [8, 15], [9, 10], [5, 12], [7, 9], [4, 15], [9, 14], [3, 8]];

// Denominator pairs [d1, d2].
//   REL_*:   d2 is a multiple of d1 (lessons 4, 6, 8, 9)
//   UNREL_*: no common factor, so d1 × d2 is the smallest common denominator (lessons 5, 7)
//   SHARED:  not multiples, but with a common factor — the smallest common
//            denominator is less than d1 × d2 (lesson 7)
const REL_SMALL = [[2, 4], [2, 6], [3, 6], [4, 8], [2, 8], [5, 10], [3, 9]];
const REL = [[2, 8], [3, 9], [3, 12], [4, 12], [2, 10], [5, 10], [6, 12], [4, 8], [2, 6], [3, 6]];
const UNREL_SMALL = [[2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [2, 7]];
const UNREL = [[3, 4], [2, 5], [3, 5], [4, 5], [2, 7], [3, 7], [5, 6], [3, 8], [2, 9], [4, 7]];
const SHARED = [[4, 6], [6, 8], [4, 10], [6, 9], [8, 12]];
// For "more or less than a half": neither denominator is a multiple of the other.
const HALF_PAIRS = [[5, 8], [7, 9], [5, 12], [7, 10], [8, 9], [5, 6], [7, 8], [9, 10], [7, 12], [5, 9]];

// ------------------------------------------------------------------ helpers

const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const lcm = (a, b) => (a / gcd(a, b)) * b;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const frA = ([n, d]) => fr(n, d);
const plain = ([n, d]) => `${n}/${d}`;            // SVG labels cannot hold HTML
const factors = (n) => range(1, n).filter((f) => n % f === 0);
const imp = (w, n, d) => w * d + n;                // w n/d as a numerator over d
const sameValue = (a, b) => imp(...a) * b[2] === imp(...b) * a[2];
const less = ([a, b], [c, d]) => a * d < c * b;

function two(rng) {
  const a = pick(rng, NAMES);
  return [a, pick(rng, NAMES.filter((x) => x !== a))];
}

// A numerator in [lo, hi] with no common factor with d, so the fraction shows in
// simplest form. Falls back to any number in the range if none exists.
function numer(rng, lo, hi, d) {
  const ok = range(lo, hi).filter((n) => gcd(n, d) === 1);
  return ok.length ? pick(rng, ok) : ri(rng, lo, hi);
}

// A mixed number as HTML; a proper fraction when there are no wholes, a whole
// number when there is no fraction part.
function mx(w, n, d) {
  if (n === 0) return String(w);
  return w === 0 ? fr(n, d) : mixed(w, n, d);
}

function addF([a, b], [c, d]) { const L = lcm(b, d); return simplify(a * (L / b) + c * (L / d), L); }

// p ± q worked through the common denominator L (a multiple of both), with the
// conversion steps written out for the explanation.
function viaCommon(p, q, L, op) {
  const pn = p[0] * (L / p[1]), qn = q[0] * (L / q[1]);
  const n = op === '+' ? pn + qn : pn - qn;
  const conv = [p, q].filter(([, d]) => d !== L).map(([a, d]) => `${fr(a, d)} = ${fr(a * (L / d), L)}`);
  const text = (conv.length ? conv.join(' and ') + '. ' : '') + `${fr(pn, L)} ${op} ${fr(qn, L)} = ${fr(n, L)}.`;
  return { n, d: L, text };
}

// The tidy forms of a result, as a sentence to add to an explanation.
function tidy(n, d) {
  const [sn, sd] = simplify(n, d);
  if (sd === 1) return ` That is ${sn} whole${sn === 1 ? '' : 's'}.`;
  let s = sd !== d ? ` In its simplest form that is ${fr(sn, sd)}.` : '';
  if (sn > sd) s += ` As a mixed number: ${mx(Math.floor(sn / sd), sn % sd, sd)}.`;
  return s;
}

// "Divide both by 2: 12/16 = 6/8" for every step down to the simplest form.
function simplifySteps(n, d) {
  const steps = [];
  for (let g = gcd(n, d); g > 1; g = gcd(n, d)) {
    let p = 2;
    while (g % p) p++;
    steps.push(`Divide both by ${p}: ${fr(n, d)} = ${fr(n / p, d / p)}`);
    n /= p; d /= p;
  }
  return steps;
}

// Multiple choice between mixed numbers [w, n, d]. Misconception candidates that
// are not a proper mixed number, or equal the answer (or an earlier option) in
// value, are dropped — two options must never both be right.
function mixedChoice(rng, prompt, answer, cands, opts) {
  const kept = [];
  for (const c of cands) {
    const [w, n, d] = c;
    if (w < 0 || n < 1 || n >= d) continue;
    if (sameValue(c, answer) || kept.some((k) => sameValue(k, c))) continue;
    kept.push(c);
  }
  return mcFrom(rng, prompt, mx(...answer), kept.map((c) => mx(...c)), opts);
}

// Fraction number line: `per` equal steps in every whole from lo to hi. Whole
// numbers are labelled — or only the two ends, when the size of a step has to
// be worked out from the whole line. Arrows point at step positions counted
// from lo, with an optional label above them.
function fracLine(lo, hi, per, arrows = [], { endsOnly = false } = {}) {
  const W = 320, H = 76, x0 = 18, x1 = W - 18, y = 44;
  const steps = (hi - lo) * per;
  const X = (s) => x0 + (s / steps) * (x1 - x0);
  let g = `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="#334155" stroke-width="2"/>`;
  for (let s = 0; s <= steps; s++) {
    const end = s === 0 || s === steps;
    const big = end || (!endsOnly && s % per === 0);
    const t = big ? 9 : 6;
    g += `<line x1="${X(s)}" y1="${y - t}" x2="${X(s)}" y2="${y + t}" stroke="#334155" stroke-width="${big ? 2 : 1.5}"/>`;
    if (big) g += `<text x="${X(s)}" y="${y + 26}" text-anchor="middle" font-size="13">${lo + s / per}</text>`;
  }
  for (const a of arrows) {
    const x = X(a.at);
    g += `<line x1="${x}" y1="${y - 27}" x2="${x}" y2="${y - 15}" stroke="#b91c1c" stroke-width="2"/>`
      + `<polygon points="${x - 5},${y - 16} ${x + 5},${y - 16} ${x},${y - 9}" fill="#b91c1c"/>`;
    if (a.label) {
      g += `<text x="${x}" y="${y - 31}" text-anchor="middle" font-size="12" font-weight="700" fill="#b91c1c">${a.label}</text>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

// "Which number is a common factor of n and d?" — the wrong options divide into
// only one of the two numbers (or neither), never both.
function commonFactorQ(rng, tier, n, d) {
  const isCommon = (f) => n % f === 0 && d % f === 0;
  const common = range(2, n).filter(isCommon);
  const f = pick(rng, common);
  const oneSided = range(2, d).filter((g) => (n % g === 0 || d % g === 0) && !isCommon(g));
  const others = range(2, 9).filter((g) => !isCommon(g) && !oneSided.includes(g));
  return mcFrom(rng, `Which number is a common factor of ${n} and ${d}?`, f, [...shuffle(rng, oneSided), ...shuffle(rng, others)], {
    tier, hint: 'A common factor divides into BOTH numbers with nothing left over.',
    explain: `${n} ÷ ${f} = ${n / f} and ${d} ÷ ${f} = ${d / f}, so ${f} is a common factor. The other numbers do not divide into both.` });
}

// "<, > or =" between a/d1 and b/d2, where d2 is a multiple of d1.
function relatedSign(rng, tier, d1, d2, swap) {
  const k = d2 / d1, a = numer(rng, 1, d1 - 1, d1);
  // A b with no common factor with d2 can never equal a × k, so "=" only comes up on purpose.
  const b = rng() < 0.25 ? a * k : numer(rng, 1, d2 - 1, d2);
  const p = [a, d1], q = [b, d2], [L, R] = swap ? [q, p] : [p, q];
  const lhs = L[0] * R[1], rhs = R[0] * L[1];
  const idx = lhs < rhs ? 0 : lhs > rhs ? 1 : 2;
  return mc(`Which sign goes in the box? ${frA(L)} □ ${frA(R)}`, SIGNS, idx, {
    tier, hint: `${d2} is a multiple of ${d1}. Change ${fr(a, d1)} into ${PARTS[d2]} first.`,
    explain: `${fr(a, d1)} = ${fr(a * k, d2)}. Now compare ${fr(a * k, d2)} with ${fr(b, d2)}: ${frA(L)} ${SIGNS[idx]} ${frA(R)}.` });
}

// Two fractions [a, d1] and [b, d2] whose sum is less than 1 whole (tries a few
// draws, then falls back to unit fractions, which always fit).
function twoParts(rng, pairs) {
  let d1 = 2, d2 = 3;
  for (let i = 0; i < 12; i++) {
    [d1, d2] = pick(rng, pairs);
    const p = [numer(rng, 1, d1 - 1, d1), d1], q = [numer(rng, 1, d2 - 1, d2), d2];
    if (less(addF(p, q), [1, 1])) return [p, q];
  }
  return [[1, d1], [1, d2]];
}

// ------------------------------------------------------------------ stories

const LEFT_STORIES = [
  (who, f) => `${who} eats ${f} of a pizza. What fraction of the pizza is left?`,
  (who, f) => `${who} paints ${f} of a fence. What fraction of the fence is not painted yet?`,
  (who, f) => `${who} has read ${f} of a book. What fraction of the book is still to read?`,
];
const TOTAL_STORIES = [
  (who, f, g) => [`${who} walks ${f} km to the park, then ${g} km to the shop. How far does ${who} walk altogether?`, 'km'],
  (who, f, g) => [`${who} pours ${f} litre of water into a jug, then ${g} litre more. How much water is in the jug now?`, 'litre'],
  (who, f, g) => [`A cake needs ${f} kg of flour and ${g} kg of sugar. How much is that altogether?`, 'kg'],
];
const DIFF_STORIES = [
  (A, B, f, g) => [`${A} runs ${f} km. ${B} runs ${g} km. How much further does ${A} run?`, 'km'],
  (A, B, f, g) => [`A red ribbon is ${f} m long. A blue ribbon is ${g} m long. How much longer is the red ribbon?`, 'm'],
  (A, B, f, g) => [`${A}'s jug holds ${f} litre of water. ${B}'s jug holds ${g} litre. How much more water is in ${A}'s jug?`, 'litre'],
];
const PART_STORIES = [
  (who, t, p) => [`Two pieces of ribbon are ${t} m long altogether. One piece is ${p} m long. How long is the other piece?`, 'm'],
  (who, t, p) => [`${who} spends ${t} of an hour on homework. Maths takes ${p} of an hour, and the rest is reading. How long is the reading?`, 'of an hour'],
  (who, t, p) => [`A jug holds ${t} litre of orange juice and water. ${p} litre is orange juice. How much is water?`, 'litre'],
];
const TWO_LEFT_STORIES = [
  (A, B, f, g) => `${A} eats ${f} of a cake. ${B} eats ${g} of it. What fraction of the cake is left?`,
  (A, B, f, g) => `${A} paints ${f} of a wall. ${B} paints ${g} of it. What fraction of the wall is not painted yet?`,
  (A, B, f, g) => `On Monday ${A} reads ${f} of a book. On Tuesday ${A} reads ${g} of it. What fraction of the book is left to read?`,
];
const COMPARE_STORIES = [
  (A, B, f, g, h) => [`${A} drinks ${f} litre of water in the morning and ${g} litre in the afternoon. ${B} drinks ${h} litre in the whole day. How much more does ${B} drink than ${A}?`, 'litre'],
  (A, B, f, g, h) => [`${A} walks ${f} km to school and then ${g} km to the library. ${B} walks ${h} km. How much further does ${B} walk than ${A}?`, 'km'],
];

// ------------------------------------------------------------------ lessons

export const lessonPreviewsU4 = {

  // L1 — divide numerator and denominator by A common factor (bar models).
  'u04-l01': {
    intro: {
      text: 'To <b>simplify</b> a fraction, find a <b>common factor</b>: a number that divides into both the <b>numerator</b> and the <b>denominator</b>. Divide both numbers by it. The new fraction is <b>equivalent</b> — the same amount, with smaller numbers. The bar model shows ' + fr(6, 8) + ' = ' + fr(3, 4) + '.',
      alt: 'Find a number that goes into the top number and the bottom number. Divide both by it. The two bars are shaded to the same length, so ' + fr(6, 8) + ' and ' + fr(3, 4) + ' are the same amount.',
      svg: fracBar(6, 8) + fracBar(3, 4),
    },
    example: {
      steps: [
        'Simplify ' + fr(6, 9) + '.',
        '6 and 9 are both in the 3 times-table, so 3 is a common factor.',
        '6 ÷ 3 = 2 and 9 ÷ 3 = 3.',
        'So ' + fr(6, 9) + ' = <b>' + fr(2, 3) + '</b>.',
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, 3);
      if (tier === 1) {
        const [n0, d0] = pick(rng, BASES_SMALL), k = pick(rng, [2, 3]), n = n0 * k, d = d0 * k;
        if (shape === 1) {
          return frac(`Divide the numerator and the denominator of ${fr(n, d)} by ${k}. What fraction do you get?`, n / k, d / k, {
            exact: true, tier,
            hint: `Work out ${n} ÷ ${k} for the numerator and ${d} ÷ ${k} for the denominator.`,
            explain: `${n} ÷ ${k} = ${n / k} and ${d} ÷ ${k} = ${d / k}, so ${fr(n, d)} = ${fr(n / k, d / k)}.` });
        }
        if (shape === 2) {
          const td = d / k;
          return num(`Use the bar model. Find the missing number: ${fr(n, d)} = ${fr('□', td)}`, n / (d / td), {
            tier, svg: fracBar(n, d) + fracBar(0, td),
            hint: `The second bar has ${td} equal parts. How many of them cover the same length as the shaded part of the first bar?`,
            explain: `${d} ÷ ${k} = ${td}, so divide the numerator by ${k} too: ${n} ÷ ${k} = ${n / k}. ${fr(n, d)} = ${fr(n / k, td)}.` });
        }
        return commonFactorQ(rng, tier, n, d);
      }
      if (shape === 1) {
        // Bigger common factors: simplify in two or three small steps.
        const [n0, d0] = pick(rng, BASES_SMALL), k = pick(rng, [4, 6, 8, 9]), n = n0 * k, d = d0 * k;
        const [sn, sd] = simplify(n, d);
        return frac(`Simplify ${fr(n, d)} to its simplest form. You can divide more than once.`, sn, sd, {
          exact: true, tier,
          hint: 'Start with a common factor you can see, like 2 or 3. Then look again: do the new numbers still have a common factor?',
          explain: `${simplifySteps(n, d).join('. ')}. ${sn} and ${sd} have no common factor except 1, so ${fr(sn, sd)} is the simplest form.` });
      }
      if (shape === 2) {
        // Divide by a common factor that need not be the highest one.
        const [n0, d0] = pick(rng, BASES_SMALL), k = pick(rng, [4, 6]), j = pick(rng, k === 4 ? [2, 4] : [2, 3, 6]);
        const n = n0 * k, d = d0 * k, tn = n / j, td = d / j;
        if (rng() < 0.5) {
          return num(`Find the missing number: ${fr(n, d)} = ${fr('□', td)}`, n / (d / td), {
            tier, hint: `What did you divide ${d} by to get ${td}? Divide ${n} by the same number.`,
            explain: `${d} ÷ ${j} = ${td}, so ${n} ÷ ${j} = ${tn}. ${fr(n, d)} = ${fr(tn, td)}.` });
        }
        return num(`Find the missing number: ${fr(n, d)} = ${fr(tn, '□')}`, d / (n / tn), {
          tier, hint: `What did you divide ${n} by to get ${tn}? Divide ${d} by the same number.`,
          explain: `${n} ÷ ${j} = ${tn}, so ${d} ÷ ${j} = ${td}. ${fr(n, d)} = ${fr(tn, td)}.` });
      }
      const [n0, d0] = pick(rng, BASES_SMALL), k = pick(rng, [2, 3, 4, 6]), n = n0 * k, d = d0 * k;
      const j = pick(rng, range(2, k).filter((f) => k % f === 0)), cn = n / j, cd = d / j, s = n - cn;
      // Misconceptions: take the same number AWAY from top and bottom; divide only one of them.
      const wrong = [[n - s, d - s], [cn, d], [cn, cd + 1], [n, cd], [cn + 1, cd]]
        .filter(([a, b]) => a >= 1 && a < b && a * d !== b * n).map(frA);
      return mcFrom(rng, `Which fraction is equivalent to ${fr(n, d)}?`, fr(cn, cd), wrong, {
        tier, svg: fracBar(n, d),
        hint: 'Equivalent fractions: divide the numerator AND the denominator by the same number.',
        explain: `Divide both by ${j}: ${n} ÷ ${j} = ${cn} and ${d} ÷ ${j} = ${cd}. So ${fr(n, d)} = ${fr(cn, cd)}. The other fractions are different amounts.` });
    },
  },

  // L2 — one step with the highest common factor; is it already in simplest form?; improper fractions.
  'u04-l02': {
    intro: {
      text: 'You can simplify in <b>one step</b> if you divide by the <b>highest common factor</b>: the biggest number that divides into both the numerator and the denominator. For ' + fr(12, 18) + ' the highest common factor is 6, so ' + fr(12, 18) + ' = ' + fr(2, 3) + '. A fraction is in its <b>simplest form</b> when 1 is the only common factor. This works for <b>improper fractions</b> too: ' + fr(10, 4) + ' = ' + fr(5, 2) + '.',
      alt: 'Find the biggest number that goes into the top and the bottom. Divide both by it, and you are finished in one go. If only 1 goes into both numbers, the fraction cannot be simplified any more.',
    },
    example: {
      steps: [
        'Simplify ' + fr(16, 24) + ' in one step.',
        'Factors of 16: 1, 2, 4, 8, 16. Factors of 24: 1, 2, 3, 4, 6, 8, 12, 24.',
        'The highest common factor is 8. 16 ÷ 8 = 2 and 24 ÷ 8 = 3.',
        'So ' + fr(16, 24) + ' = <b>' + fr(2, 3) + '</b>.',
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, 3);
      if (tier === 1) {
        const [n0, d0] = pick(rng, BASES_SMALL), k = pick(rng, [2, 3, 4, 6]), n = n0 * k, d = d0 * k, g = gcd(n, d);
        if (shape === 1) {
          return num(`What is the highest common factor of ${n} and ${d}?`, g, {
            tier, hint: `List the factors of ${n} and the factors of ${d}. Which is the biggest number in both lists?`,
            explain: `Factors of ${n}: ${factors(n).join(', ')}. Factors of ${d}: ${factors(d).join(', ')}. The biggest number in both lists is ${g}.` });
        }
        if (shape === 2) {
          return frac(`Simplify ${fr(n, d)} to its simplest form in one step.`, n / g, d / g, {
            exact: true, tier, hint: `Divide by the highest common factor of ${n} and ${d}.`,
            explain: `The highest common factor of ${n} and ${d} is ${g}. ${n} ÷ ${g} = ${n / g} and ${d} ÷ ${g} = ${d / g}, so ${fr(n, d)} = ${fr(n / g, d / g)}.` });
        }
        const [tn, td] = rng() < 0.5 ? pick(rng, TRICKY_SIMPLEST) : [n, d], tg = gcd(tn, td);
        return tf(`True or false: ${fr(tn, td)} is in its simplest form.`, tg === 1, {
          tier, hint: `Is there a number bigger than 1 that divides into both ${tn} and ${td}?`,
          explain: tg === 1
            ? `Only 1 divides into both ${tn} and ${td}, so ${fr(tn, td)} is already in its simplest form.`
            : `${tg} divides into both ${tn} and ${td}, so ${fr(tn, td)} simplifies to ${fr(tn / tg, td / tg)}. It is not in its simplest form.` });
      }
      if (shape === 1) {
        const [n0, d0] = pick(rng, BASES), k = ri(rng, 4, Math.min(9, Math.floor(60 / d0))), n = n0 * k, d = d0 * k, g = gcd(n, d);
        return frac(`Simplify ${fr(n, d)} to its simplest form in one step.`, n / g, d / g, {
          exact: true, tier, hint: `Find the highest common factor of ${n} and ${d}. Divide both numbers by it.`,
          explain: `The highest common factor of ${n} and ${d} is ${g}. ${n} ÷ ${g} = ${n / g} and ${d} ÷ ${g} = ${d / g}, so ${fr(n, d)} = ${fr(n / g, d / g)}.` });
      }
      if (shape === 2) {
        const [cn, cd] = pick(rng, TRICKY_SIMPLEST);
        const others = [];
        for (let i = 0; i < 40 && others.length < 3; i++) {
          const [a, b] = pick(rng, BASES_SMALL), k = ri(rng, 2, 4);
          if (!others.some((o) => o[0] === a * k && o[1] === b * k) && a * cd !== b * cn) others.push([a * k, b * k]);
        }
        return mcFrom(rng, 'Which fraction is already in its simplest form?', fr(cn, cd), others.map(frA), {
          tier, hint: 'In simplest form, the numerator and the denominator have no common factor except 1.',
          explain: `${cn} and ${cd} have no common factor except 1, so ${fr(cn, cd)} is in its simplest form. The others can be simplified: ${others.map(([a, b]) => `${fr(a, b)} = ${frA(simplify(a, b))}`).join(', ')}.` });
      }
      if (rng() < 0.5) {
        const [n0, d0] = pick(rng, IMPROPER), k = ri(rng, 2, 5), n = n0 * k, d = d0 * k, g = gcd(n, d);
        return frac(`Simplify the improper fraction ${fr(n, d)} to its simplest form.`, n / g, d / g, {
          exact: true, tier,
          hint: 'Divide the numerator and the denominator by their highest common factor. Your answer is still an improper fraction.',
          explain: `The highest common factor of ${n} and ${d} is ${g}. ${n} ÷ ${g} = ${n / g} and ${d} ÷ ${g} = ${d / g}, so ${fr(n, d)} = ${fr(n / g, d / g)}.` });
      }
      const w = ri(rng, 1, 3), [n0, d0] = pick(rng, BASES_SMALL), k = ri(rng, 2, 4), n = n0 * k, d = d0 * k;
      const [sn, sd] = simplify(n, d);
      return mixedChoice(rng, `Simplify the mixed number ${mx(w, n, d)}.`, [w, sn, sd],
        [[w, sn, d], [w, n, sd], [w + 1, sn, sd], [w - 1, sn, sd], [w, sn + 1, sd]], {
          tier, hint: 'The whole number stays the same. Simplify only the fraction part.',
          explain: `${fr(n, d)} = ${fr(sn, sd)} (divide both by ${gcd(n, d)}), so ${mx(w, n, d)} = ${mx(w, sn, sd)}.` });
    },
  },

  // L3 — read fractions and mixed numbers on lines whose step must be worked out.
  'u04-l03': {
    intro: {
      text: 'On a <b>number line</b>, first work out what one small step is worth. Count the equal steps between 0 and 1: if there are 5, each step is ' + fr(1, 5) + '. Then count the steps to the arrow. After 1, the number is a <b>mixed number</b>, like ' + mixed(1, 2, 5) + '.',
      alt: 'Count the gaps between 0 and 1 — that number is the denominator. Then count the gaps from the last whole number to the arrow — that is the numerator.',
      svg: fracLine(0, 2, 5, [{ at: 7, label: '1 2/5' }]),
    },
    example: {
      steps: [
        'The line from 0 to 1 has 8 equal steps. An arrow is 3 steps after 1. What number does it point to?',
        '8 steps make 1 whole, so each step is ' + fr(1, 8) + '.',
        '3 steps after 1 is 1 and ' + fr(3, 8) + '.',
        'So the arrow points to <b>' + mixed(1, 3, 8) + '</b>.',
      ],
    },
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const d = pick(rng, [3, 4, 5, 6, 8, 10]), n = ri(rng, 1, d - 1);
          return frac('What fraction is the arrow pointing to?', n, d, {
            tier, svg: fracLine(0, 1, d, [{ at: n, label: '?' }]),
            hint: 'Count the equal steps between 0 and 1. That number is the denominator.',
            explain: `There are ${d} equal steps between 0 and 1, so each step is ${fr(1, d)}. The arrow is ${n} ${n === 1 ? 'step' : 'steps'} from 0: ${fr(n, d)}.` });
        }
        const d = pick(rng, [4, 5, 6, 8]), n = ri(rng, 1, d - 2);
        // Wrong claims count the marks instead of the gaps.
        const [cn, cd] = rng() < 0.5 ? [n, d] : pick(rng, [[n, d + 1], [n + 1, d]]);
        const right = cn * d === n * cd;
        return tf(`True or false: the arrow is pointing to ${fr(cn, cd)}.`, right, {
          tier, svg: fracLine(0, 1, d, [{ at: n }]),
          hint: 'Count the GAPS between the marks, not the marks themselves.',
          explain: right
            ? `There are ${d} equal steps between 0 and 1, so each step is ${fr(1, d)}. The arrow is ${n} ${n === 1 ? 'step' : 'steps'} along: ${fr(n, d)}.`
            : `There are ${d} equal steps (gaps) between 0 and 1, and the arrow is ${n} ${n === 1 ? 'step' : 'steps'} along. It points to ${fr(n, d)}, not ${fr(cn, cd)}.` });
      }
      const shape = ri(rng, 1, 3);
      if (shape === 1) {
        const W = pick(rng, [2, 3]), d = pick(rng, W === 2 ? [3, 4, 5, 6, 8] : [3, 4, 5]);
        const w = ri(rng, 1, W - 1), n = ri(rng, 1, d - 1);
        // Misconceptions: the whole line as the denominator; forgetting the whole; counting a mark too many/few.
        return mixedChoice(rng, 'What number is the arrow pointing to?', [w, n, d],
          [[0, w * d + n, W * d], [0, n, d], [w, n + 1, d], [w, n - 1, d], [w + 1, n, d]], {
            tier, svg: fracLine(0, W, d, [{ at: w * d + n, label: '?' }]),
            hint: 'First work out one step: how many equal steps are there between 0 and 1?',
            explain: `There are ${d} equal steps in each whole, so each step is ${fr(1, d)}. The arrow is ${n} ${n === 1 ? 'step' : 'steps'} after ${w}: ${mx(w, n, d)}.` });
      }
      if (shape === 2) {
        // A line in tenths asked for fifths (eighths for quarters, twelfths for thirds,
        // quarters or sixths, sixths for thirds). Halves are left out: too easy to spot.
        const [D, bs] = pick(rng, [[10, [5]], [8, [4]], [12, [3, 4, 6]], [6, [3]]]), b = pick(rng, bs);
        const a = pick(rng, range(1, b - 1).filter((x) => gcd(x, b) === 1)), c = (a * D) / b;
        const pos = [c];
        for (const p of [...shuffle(rng, [a, c + 1, c - 1, D - c]), ...shuffle(rng, range(1, D - 1))]) {
          if (pos.length === 4) break;
          if (p >= 1 && p <= D - 1 && !pos.includes(p)) pos.push(p);
        }
        pos.sort((x, y) => x - y);
        const idx = pos.indexOf(c);
        return mc(`Which arrow is pointing to ${fr(a, b)}?`, LETTERS.slice(0, pos.length), idx, {
          tier, svg: fracLine(0, 1, D, pos.map((p, i) => ({ at: p, label: LETTERS[i] }))),
          hint: `Count the steps between 0 and 1 first. How many steps make ${fr(1, b)}?`,
          explain: `There are ${D} steps between 0 and 1, so ${fr(1, b)} is ${D / b} steps. ${fr(a, b)} = ${fr(c, D)}: count ${c} steps from 0 to arrow ${LETTERS[idx]}.` });
      }
      // Only 0 and 2 are labelled: the step must be worked out from the whole line.
      const d = pick(rng, [2, 3, 4, 5, 6]);
      let n = ri(rng, 1, 2 * d - 2);
      if (n >= d) n += 1;                               // never exactly 1 whole
      const improper = n > d;
      return frac(`This number line goes from 0 to 2. What fraction is the arrow pointing to?${improper ? ' Give your answer as an improper fraction.' : ''}`, n, d, {
        tier, svg: fracLine(0, 2, d, [{ at: n, label: '?' }], { endsOnly: true }),
        hint: `There are ${2 * d} equal steps from 0 to 2. How many steps make 1 whole?`,
        explain: `${2 * d} steps make 2 wholes, so ${d} steps make 1 whole and each step is ${fr(1, d)}. The arrow is ${n} ${n === 1 ? 'step' : 'steps'} from 0: ${fr(n, d)}${improper ? ` (that is ${mx(Math.floor(n / d), n % d, d)})` : ''}.` });
    },
  },

  // L4 — compare and order with a common denominator (one denominator a multiple of the other).
  'u04-l04': {
    intro: {
      text: 'To compare two fractions, give them the same denominator first. When one denominator is a <b>multiple</b> of the other, you only need to change one fraction. To compare ' + fr(2, 3) + ' and ' + fr(5, 6) + ': ' + fr(2, 3) + ' = ' + fr(4, 6) + ', and ' + fr(4, 6) + ' &lt; ' + fr(5, 6) + '. So ' + fr(2, 3) + ' &lt; ' + fr(5, 6) + '.',
      alt: 'Make the bottom numbers the same. Then the parts are the same size, so you only need to compare the top numbers. Use the signs &lt;, &gt; and =.',
      svg: fracBar(2, 3) + fracBar(5, 6, { color: '#fca5a5' }),
    },
    example: {
      steps: [
        'Compare ' + fr(3, 4) + ' and ' + fr(5, 8) + '. Use &lt;, &gt; or =.',
        '8 is a multiple of 4, so change quarters into eighths.',
        fr(3, 4) + ' = ' + fr(6, 8) + ' (multiply the numerator and the denominator by 2).',
        fr(6, 8) + ' &gt; ' + fr(5, 8) + ', so <b>' + fr(3, 4) + ' &gt; ' + fr(5, 8) + '</b>.',
      ],
    },
    gen(rng, tier) {
      if (tier === 1) {
        const [d1, d2] = pick(rng, REL_SMALL), k = d2 / d1;
        if (rng() < 0.5) {
          const a = numer(rng, 1, d1 - 1, d1);
          return num(`Change ${fr(a, d1)} into ${PARTS[d2]}: ${fr(a, d1)} = ${fr('□', d2)}`, a * (d2 / d1), {
            tier, hint: `${d1} × ${k} = ${d2}. Multiply the numerator by ${k} too.`,
            explain: `${a} × ${k} = ${a * k}, so ${fr(a, d1)} = ${fr(a * k, d2)}.` });
        }
        return relatedSign(rng, tier, d1, d2, false);
      }
      const shape = ri(rng, 1, 3);
      if (shape === 1) {
        const D = pick(rng, [6, 8, 10, 12]);
        const divs = { 6: [2, 3], 8: [2, 4], 10: [2, 5], 12: [2, 3, 4, 6] }[D];
        // D itself is always one of the denominators, so it is the common denominator.
        // Fractions in simplest form with different denominators are never equal.
        const fs = [D, ...shuffle(rng, divs).slice(0, 2)].map((dd) => [numer(rng, 1, dd - 1, dd), dd]);
        const asc = fs.slice().sort((p, q) => p[0] * q[1] - q[0] * p[1]);
        const big = rng() < 0.5;
        const seq = (big ? asc.slice().reverse() : asc).map(frA);
        return order(`Order these fractions, <b>${big ? 'largest' : 'smallest'} first</b>.`, rng, seq, {
          tier, hint: `Change them all into ${PARTS[D]} first. Then compare the numerators.`,
          explain: `${fs.map(([n, d]) => (d === D ? fr(n, d) : `${fr(n, d)} = ${fr(n * (D / d), D)}`)).join(', ')}. So the order is ${seq.join(', ')}.` });
      }
      if (shape === 2) {
        const [d1, d2] = pick(rng, REL);
        return relatedSign(rng, tier, d1, d2, rng() < 0.5);
      }
      // Exactly one whole number fits between 2a and 2a + 2.
      const d = pick(rng, [3, 5, 7]), a = ri(rng, 1, d - 2), D = 2 * d;
      return num(`Find the missing number: ${fr(a, d)} &lt; ${fr('□', D)} &lt; ${fr(a + 1, d)}`, (a * 2 + (a + 1) * 2) / 2, {
        tier, hint: `Change both fractions into ${PARTS[D]}.`,
        explain: `${fr(a, d)} = ${fr(2 * a, D)} and ${fr(a + 1, d)} = ${fr(2 * a + 2, D)}. The only whole number between ${2 * a} and ${2 * a + 2} is ${2 * a + 1}.` });
    },
  },

  // L5 — same numerators, comparing with a half, unrelated denominators.
  'u04-l05': {
    intro: {
      text: 'You do not always need a common denominator. If the <b>numerators</b> are the same, look at the denominators: a bigger denominator means smaller parts, so ' + fr(3, 8) + ' &lt; ' + fr(3, 5) + '. You can also compare each fraction with ' + fr(1, 2) + ': ' + fr(3, 7) + ' is less than a half, and ' + fr(5, 8) + ' is more than a half.',
      alt: 'Same top number? Then the fraction with the bigger bottom number is smaller, because its parts are smaller. Another trick: ask whether each fraction is more or less than one half.',
      svg: fracBar(3, 5) + fracBar(3, 8, { color: '#fca5a5' }),
    },
    example: {
      steps: [
        'Which is greater, ' + fr(4, 9) + ' or ' + fr(4, 7) + '?',
        'The numerators are the same: 4 parts each.',
        'Sevenths are bigger parts than ninths.',
        'So <b>' + fr(4, 7) + '</b> is greater.',
      ],
    },
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const n = pick(rng, [1, 1, 2, 3]);
          const [da, db] = shuffle(rng, range(n + 1, 10).filter((d) => gcd(n, d) === 1)).slice(0, 2);
          const lo = Math.min(da, db), hi = Math.max(da, db);
          return mcFrom(rng, `Which fraction is greater: ${fr(n, da)} or ${fr(n, db)}?`, fr(n, lo), [fr(n, hi)], {
            tier, hint: 'The numerators are the same. Which fraction has the bigger parts?',
            explain: `Both have ${n} ${n === 1 ? 'part' : 'parts'}. ${cap(PARTS[lo])} are bigger than ${PARTS[hi]}, so ${fr(n, lo)} is greater.` });
        }
        const d = ri(rng, 5, 12), n = pick(rng, range(1, d - 1).filter((x) => 2 * x !== d && gcd(x, d) === 1));
        const more = 2 * n > d, half = d % 2 === 0 ? String(d / 2) : `${(d - 1) / 2} and a half`;
        return mc(`Is ${fr(n, d)} more or less than ${fr(1, 2)}?`, [`More than ${fr(1, 2)}`, `Less than ${fr(1, 2)}`], more ? 0 : 1, {
          tier, hint: `Half of ${d} is ${half}. Is ${n} more or less than that?`,
          explain: `Half of ${d} is ${half}. ${n} is ${more ? 'more' : 'less'} than that, so ${fr(n, d)} is ${more ? 'more' : 'less'} than ${fr(1, 2)}.` });
      }
      const shape = ri(rng, 1, 3);
      if (shape === 1) {
        const n = pick(rng, [2, 3, 4, 5]);
        const dens = shuffle(rng, range(n + 1, 12).filter((d) => gcd(n, d) === 1)).slice(0, 3);
        const big = rng() < 0.5;
        // Same numerator: a bigger denominator means a smaller fraction.
        const asc = dens.slice().sort((x, y) => y - x).map((d) => fr(n, d));
        const seq = big ? asc.slice().reverse() : asc;
        return order(`Order these fractions, <b>${big ? 'largest' : 'smallest'} first</b>.`, rng, seq, {
          tier, hint: `The numerators are all ${n}. The bigger the denominator, the smaller the parts.`,
          explain: `All the numerators are ${n}, so compare the size of the parts: the bigger the denominator, the smaller the fraction. So the order is ${seq.join(', ')}.` });
      }
      if (shape === 2) {
        const [x, y] = pick(rng, HALF_PAIRS), [dl, dh] = rng() < 0.5 ? [x, y] : [y, x];
        const lo = [numer(rng, 1, Math.ceil(dl / 2) - 1, dl), dl];
        const hi = [pick(rng, range(Math.floor(dh / 2) + 1, dh - 1).filter((m) => gcd(m, dh) === 1)), dh];
        const [p, q] = rng() < 0.5 ? [lo, hi] : [hi, lo];
        const bigger = less(p, q) ? q : p, smaller = bigger === p ? q : p;
        return mcFrom(rng, `Which fraction is greater: ${frA(p)} or ${frA(q)}?`, frA(bigger), [frA(smaller)], {
          tier, hint: `Compare each fraction with ${fr(1, 2)}.`,
          explain: `${frA(smaller)} is less than ${fr(1, 2)} and ${frA(bigger)} is more than ${fr(1, 2)}, so ${frA(bigger)} is greater.` });
      }
      const [x, y] = pick(rng, UNREL), [d1, d2] = rng() < 0.5 ? [x, y] : [y, x], D = d1 * d2;
      const n1 = numer(rng, 1, d1 - 1, d1), n2 = numer(rng, 1, d2 - 1, d2);
      const idx = n1 * d2 < n2 * d1 ? 0 : n1 * d2 > n2 * d1 ? 1 : 2;
      return mc(`Which sign goes in the box? ${fr(n1, d1)} □ ${fr(n2, d2)}`, SIGNS, idx, {
        tier, hint: `Neither denominator is a multiple of the other. Use ${d1} × ${d2} = ${D} as the common denominator.`,
        explain: `${fr(n1, d1)} = ${fr(n1 * d2, D)} and ${fr(n2, d2)} = ${fr(n2 * d1, D)}. ${n1 * d2} ${SIGNS[idx]} ${n2 * d1}, so ${fr(n1, d1)} ${SIGNS[idx]} ${fr(n2, d2)}.` });
    },
  },

  // L6 — add and subtract when one denominator is a multiple of the other.
  'u04-l06': {
    intro: {
      text: 'To add or subtract fractions, the denominators must be the same. If one denominator is a <b>multiple</b> of the other, change just one fraction. For ' + fr(1, 4) + ' + ' + fr(3, 8) + ': ' + fr(1, 4) + ' = ' + fr(2, 8) + ', so the answer is ' + fr(2, 8) + ' + ' + fr(3, 8) + ' = ' + fr(5, 8) + '.',
      alt: 'Make the bottom numbers match first: change the fraction with the smaller denominator. Then add or subtract the top numbers only. The denominator stays the same.',
      svg: fracBar(1, 4) + fracBar(2, 8),
    },
    example: {
      steps: [
        'Work out ' + fr(5, 6) + ' − ' + fr(1, 3) + '.',
        '6 is a multiple of 3, so change thirds into sixths: ' + fr(1, 3) + ' = ' + fr(2, 6) + '.',
        fr(5, 6) + ' − ' + fr(2, 6) + ' = ' + fr(3, 6) + '.',
        'In its simplest form, the answer is <b>' + fr(1, 2) + '</b>.',
      ],
    },
    gen(rng, tier) {
      const [d1, d2] = pick(rng, tier === 1 ? REL_SMALL : REL), k = d2 / d1, shape = ri(rng, 1, 3);
      const hint = `${d2} is a multiple of ${d1}. Change the ${PARTS[d1]} into ${PARTS[d2]} first.`;
      if (shape === 1) {
        const a = numer(rng, 1, d1 - 1, d1);
        // Tier 1 keeps the total under 1 whole; tier 2 may cross it.
        const b = numer(rng, 1, tier === 1 ? d2 - a * k - 1 : d2 - 1, d2);
        const [p, q] = rng() < 0.5 ? [[a, d1], [b, d2]] : [[b, d2], [a, d1]];
        const r = viaCommon(p, q, d2, '+'), improper = r.n > r.d;
        return frac(`Work out ${frA(p)} + ${frA(q)}${improper ? '. Your answer can be an improper fraction.' : ''}`, r.n, r.d, {
          tier, hint, explain: r.text + tidy(r.n, r.d) });
      }
      if (shape === 2) {
        let p, q;
        if (rng() < 0.5) {
          const a = numer(rng, 1, d1 - 1, d1);
          [p, q] = [[a, d1], [numer(rng, 1, a * k - 1, d2), d2]];
        } else {
          const b = numer(rng, 1, d1 - 1, d1);
          [p, q] = [[numer(rng, b * k + 1, d2 - 1, d2), d2], [b, d1]];
        }
        const r = viaCommon(p, q, d2, '−');
        return frac(`Work out ${frA(p)} − ${frA(q)}`, r.n, r.d, { tier, hint, explain: r.text + tidy(r.n, r.d) });
      }
      if (tier === 1) {
        const a = numer(rng, 1, d1 - 1, d1), b = numer(rng, 1, d2 - a * k - 1, d2);
        return num(`To work out ${fr(a, d1)} + ${fr(b, d2)}, first change ${fr(a, d1)} into ${PARTS[d2]}: ${fr(a, d1)} = ${fr('□', d2)}`, a * (d2 / d1), {
          tier, hint: `${d1} × ${k} = ${d2}. Multiply the numerator by ${k} too.`,
          explain: `${a} × ${k} = ${a * k}, so ${fr(a, d1)} = ${fr(a * k, d2)}. Then ${fr(a * k, d2)} + ${fr(b, d2)} = ${fr(a * k + b, d2)}.` });
      }
      const x = numer(rng, 1, d1 - 1, d1), a = numer(rng, 1, d2 - 1 - x * k, d2), c = a + x * k;
      return num(`Find the missing number: ${fr(a, d2)} + ${fr('□', d1)} = ${fr(c, d2)}`, (c - a) / k, {
        tier, hint: `${fr('□', d1)} is the same as a number of ${PARTS[d2]}. What do you add to ${fr(a, d2)} to make ${fr(c, d2)}?`,
        explain: `${fr(c, d2)} − ${fr(a, d2)} = ${fr(c - a, d2)}, and ${fr(c - a, d2)} = ${fr((c - a) / k, d1)}. The missing number is ${(c - a) / k}.` });
    },
  },

  // L7 — no multiple relation: find a common denominator (a common multiple) first.
  'u04-l07': {
    intro: {
      text: 'Sometimes neither denominator is a multiple of the other, like in ' + fr(1, 3) + ' + ' + fr(1, 4) + '. Find a <b>common multiple</b> of both denominators: 12 is in the 3 times-table and in the 4 times-table. Change BOTH fractions: ' + fr(1, 3) + ' = ' + fr(4, 12) + ' and ' + fr(1, 4) + ' = ' + fr(3, 12) + '. Then ' + fr(4, 12) + ' + ' + fr(3, 12) + ' = ' + fr(7, 12) + '.',
      alt: 'Find a number that both bottom numbers go into. Change both fractions so they have that denominator. Then add or subtract the top numbers.',
    },
    example: {
      steps: [
        'Work out ' + fr(3, 4) + ' − ' + fr(2, 5) + '.',
        'A common multiple of 4 and 5 is 20.',
        fr(3, 4) + ' = ' + fr(15, 20) + ' and ' + fr(2, 5) + ' = ' + fr(8, 20) + '.',
        fr(15, 20) + ' − ' + fr(8, 20) + ' = <b>' + fr(7, 20) + '</b>.',
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, 3);
      if (tier === 1 && shape === 1) {
        const [d1, d2] = pick(rng, [...UNREL_SMALL, [4, 6], [6, 8]]), L = lcm(d1, d2);
        const list = (d) => range(1, L / d).map((i) => i * d).join(', ');
        return num(`You want to work out ${fr(1, d1)} + ${fr(1, d2)}. What is the smallest common denominator you can use?`, L, {
          tier, hint: `Count in ${d1}s and in ${d2}s. Which number comes first in both lists?`,
          explain: `Counting in ${d1}s: ${list(d1)}. Counting in ${d2}s: ${list(d2)}. ${L} is the first number in both lists.` });
      }
      if (tier === 2 && shape === 3) {
        const [d1, d2] = pick(rng, SHARED), L = lcm(d1, d2), add = rng() < 0.5;
        let p = [numer(rng, 1, d1 - 1, d1), d1], q = [numer(rng, 1, d2 - 1, d2), d2];
        if (!add && less(p, q)) [p, q] = [q, p];
        const r = viaCommon(p, q, L, add ? '+' : '−'), improper = r.n > r.d;
        return frac(`Work out ${frA(p)} ${add ? '+' : '−'} ${frA(q)}${improper ? '. Your answer can be an improper fraction.' : ''}`, r.n, r.d, {
          tier, hint: `You do not need ${d1} × ${d2} = ${d1 * d2}. Find the smallest number that both ${d1} and ${d2} divide into.`,
          explain: `The smallest common denominator is ${L}. ` + r.text + tidy(r.n, r.d) });
      }
      // The remaining shapes: add (tier 1 shape 2, tier 2 shape 1) or subtract.
      const add = tier === 1 ? shape === 2 : shape === 1;
      const [d1, d2] = pick(rng, tier === 1 ? UNREL_SMALL : UNREL), L = d1 * d2;
      let p, q;
      if (add && tier === 1) [p, q] = twoParts(rng, [[d1, d2]]);
      else [p, q] = [[numer(rng, 1, d1 - 1, d1), d1], [numer(rng, 1, d2 - 1, d2), d2]];
      if (!add && less(p, q)) [p, q] = [q, p];
      const r = viaCommon(p, q, L, add ? '+' : '−'), improper = r.n > r.d;
      return frac(`Work out ${frA(p)} ${add ? '+' : '−'} ${frA(q)}${improper ? '. Your answer can be an improper fraction.' : ''}`, r.n, r.d, {
        tier, hint: `Neither denominator is a multiple of the other. Use ${d1} × ${d2} = ${L} as the common denominator.`,
        explain: r.text + tidy(r.n, r.d) });
    },
  },

  // L8 — add mixed numbers: wholes, then fractions; exchange when the fractions make more than 1.
  'u04-l08': {
    intro: {
      text: 'To add <b>mixed numbers</b>, add the whole numbers, then add the fractions. For ' + mixed(1, 1, 4) + ' + ' + mixed(2, 1, 2) + ': the wholes make 3, and ' + fr(1, 4) + ' + ' + fr(2, 4) + ' = ' + fr(3, 4) + ', so the answer is ' + mixed(3, 3, 4) + '. If the fractions make more than 1 whole, <b>exchange</b>: ' + fr(5, 4) + ' = ' + mixed(1, 1, 4) + ', so add 1 more to the wholes.',
      alt: 'Add the whole numbers. Add the fractions (make the denominators the same first). If the fraction answer is bigger than 1, take one whole out of it and add it to the whole numbers.',
    },
    example: {
      steps: [
        'Work out ' + mixed(2, 3, 4) + ' + ' + mixed(1, 3, 8) + '.',
        'Wholes: 2 + 1 = 3.',
        'Fractions: ' + fr(3, 4) + ' = ' + fr(6, 8) + ', and ' + fr(6, 8) + ' + ' + fr(3, 8) + ' = ' + fr(9, 8) + ' = ' + mixed(1, 1, 8) + '.',
        'Exchange: 3 + ' + mixed(1, 1, 8) + ' = <b>' + mixed(4, 1, 8) + '</b>.',
      ],
    },
    gen(rng, tier) {
      if (tier === 1) {
        const w1 = ri(rng, 1, 4), w2 = ri(rng, 1, 3), W = w1 + w2;
        if (rng() < 0.5) {
          const d = pick(rng, [3, 4, 5, 6, 7, 8, 9]), n1 = numer(rng, 1, d - 2, d), n2 = numer(rng, 1, d - 1 - n1, d), N = n1 + n2;
          return mixedChoice(rng, `Work out ${mx(w1, n1, d)} + ${mx(w2, n2, d)}.`, [W, N, d],
            [[W, N, 2 * d], [W + 1, N, d], [W, N + 1, d], [W - 1, N, d]], {
              tier, hint: 'Add the whole numbers first. Then add the fractions.',
              explain: `Wholes: ${w1} + ${w2} = ${W}. Fractions: ${fr(n1, d)} + ${fr(n2, d)} = ${fr(N, d)}. So the answer is ${mx(W, N, d)}.` });
        }
        const [d1, d2] = pick(rng, REL_SMALL), k = d2 / d1;
        const a = numer(rng, 1, d1 - 1, d1), b = numer(rng, 1, d2 - a * k - 1, d2), S = a * k + b;
        const p = [w1, a, d1], q = [w2, b, d2], [L, R] = rng() < 0.5 ? [p, q] : [q, p];
        return mixedChoice(rng, `Work out ${mx(...L)} + ${mx(...R)}.`, [W, S, d2],
          [[W, a + b, d1 + d2], [W, a + b, d2], [W + 1, S, d2], [W, S + 1, d2]], {
            tier, hint: `Add the whole numbers. Then change ${fr(a, d1)} into ${PARTS[d2]} and add the fractions.`,
            explain: `Wholes: ${L[0]} + ${R[0]} = ${W}. Fractions: ${fr(a, d1)} = ${fr(a * k, d2)}, and ${fr(a * k, d2)} + ${fr(b, d2)} = ${fr(S, d2)}. So the answer is ${mx(W, S, d2)}.` });
      }
      // Tier 2: the fractions always make more than 1 whole.
      const [d1, d2] = pick(rng, REL), k = d2 / d1;
      let a = d1 - 1, b = d2 - 1;                       // fallback that always crosses 1
      for (let t = 0; t < 12; t++) {
        const x = numer(rng, 1, d1 - 1, d1), y = numer(rng, 1, d2 - 1, d2);
        if (x * k + y > d2) { a = x; b = y; break; }
      }
      const S = a * k + b, shape = ri(rng, 1, 3), wMax = shape === 2 ? 2 : 3;
      const w1 = ri(rng, 1, wMax), w2 = ri(rng, 1, wMax), W = w1 + w2;
      const p = [w1, a, d1], q = [w2, b, d2], [L, R] = rng() < 0.5 ? [p, q] : [q, p];
      const sum = `${mx(...L)} + ${mx(...R)}`;
      const T = imp(...p) * k + imp(...q);              // the total as a number of d2ths
      const ans = [Math.floor(T / d2), T % d2, d2];
      const steps = `Wholes: ${L[0]} + ${R[0]} = ${W}. Fractions: ${fr(a, d1)} = ${fr(a * k, d2)}, and ${fr(a * k, d2)} + ${fr(b, d2)} = ${fr(S, d2)} = ${mx(1, S - d2, d2)}. Exchange: ${W} + ${mx(1, S - d2, d2)} = ${mx(...ans)}.`;
      if (shape === 1) {
        return mixedChoice(rng, `Work out ${sum}.`, ans,
          [[W, S - d2, d2], [W, a + b, d1 + d2], [ans[0], ans[1] + 1, d2], [ans[0] + 1, ans[1], d2]], {
            tier, hint: 'Add the wholes, then the fractions. If the fractions make more than 1 whole, exchange it and add 1 to the wholes.',
            explain: steps });
      }
      if (shape === 2) {
        return frac(`Work out ${sum}. Give your answer as an improper fraction.`, T, d2, {
          tier, hint: `Add the wholes and the fractions. Then write the answer as an improper fraction in ${PARTS[d2]}.`,
          explain: `${steps} As an improper fraction: ${mx(...ans)} = ${fr(T, d2)}.` });
      }
      return num(`Find the missing number: ${sum} = ${mixed('□', ans[1], d2)}`, ans[0], {
        tier, hint: 'Do the fractions make more than 1 whole? If they do, exchange it and add 1 to the wholes.',
        explain: steps });
    },
  },

  // L9 — subtract mixed numbers, exchanging a whole when the first fraction is too small.
  'u04-l09': {
    intro: {
      text: 'To subtract <b>mixed numbers</b>, subtract the whole numbers, then subtract the fractions. Sometimes the first fraction is too small, like in ' + mixed(3, 1, 4) + ' − ' + mixed(1, 3, 4) + '. Then <b>exchange</b> one whole for quarters: ' + mixed(3, 1, 4) + ' = ' + mixed(2, 5, 4) + '. Now ' + mixed(2, 5, 4) + ' − ' + mixed(1, 3, 4) + ' = ' + mixed(1, 2, 4) + '.',
      alt: 'Take away the wholes, then take away the fractions. If you cannot take the fraction away, break one whole into parts first: one whole is ' + fr(4, 4) + ', so ' + mixed(3, 1, 4) + ' becomes 2 and ' + fr(5, 4) + '.',
    },
    example: {
      steps: [
        'Work out ' + mixed(4, 1, 3) + ' − ' + mixed(1, 2, 3) + '.',
        fr(1, 3) + ' is less than ' + fr(2, 3) + ', so exchange one whole: ' + mixed(4, 1, 3) + ' = ' + mixed(3, 4, 3) + '.',
        'Wholes: 3 − 1 = 2. Fractions: ' + fr(4, 3) + ' − ' + fr(2, 3) + ' = ' + fr(2, 3) + '.',
        'So the answer is <b>' + mixed(2, 2, 3) + '</b>.',
      ],
    },
    gen(rng, tier) {
      const shape = ri(rng, 1, 3);
      if (tier === 1) {
        if (shape === 1) {
          const d = pick(rng, [4, 5, 6, 7, 8, 9]), n2 = numer(rng, 1, d - 2, d), n1 = numer(rng, n2 + 1, d - 1, d);
          const w1 = ri(rng, 3, 5), w2 = ri(rng, 1, w1 - 1), W = w1 - w2, N = n1 - n2;
          return mixedChoice(rng, `Work out ${mx(w1, n1, d)} − ${mx(w2, n2, d)}.`, [W, N, d],
            [[w1 + w2, N, d], [W, n1 + n2, d], [W + 1, N, d], [W, N + 1, d]], {
              tier, hint: 'Subtract the whole numbers first. Then subtract the fractions.',
              explain: `Wholes: ${w1} − ${w2} = ${W}. Fractions: ${fr(n1, d)} − ${fr(n2, d)} = ${fr(N, d)}. So the answer is ${mx(W, N, d)}.` });
        }
        if (shape === 2) {
          const d = pick(rng, [3, 4, 5, 6, 8]), n = numer(rng, 1, d - 1, d), w = ri(rng, 2, 5);
          return num(`Exchange one whole for ${PARTS[d]}: ${mx(w, n, d)} = ${mixed(w - 1, '□', d)}`, d + n, {
            tier, hint: `One whole is ${fr(d, d)}. Add it to ${fr(n, d)}.`,
            explain: `${mx(w, n, d)} = ${w - 1} + ${fr(d, d)} + ${fr(n, d)} = ${mx(w - 1, d + n, d)}. The missing number is ${d + n}.` });
        }
        const [d1, d2] = pick(rng, REL_SMALL), k = d2 / d1, w1 = ri(rng, 2, 5), w2 = ri(rng, 1, w1 - 1), W = w1 - w2;
        let p, q;
        if (rng() < 0.5) {
          const a = numer(rng, 1, d1 - 1, d1);
          [p, q] = [[w1, a, d1], [w2, numer(rng, 1, a * k - 1, d2), d2]];
        } else {
          const b = numer(rng, 1, d1 - 1, d1);
          [p, q] = [[w1, numer(rng, b * k + 1, d2 - 1, d2), d2], [w2, b, d1]];
        }
        const r = viaCommon([p[1], p[2]], [q[1], q[2]], d2, '−'), raw = Math.abs(p[1] - q[1]);
        return mixedChoice(rng, `Work out ${mx(...p)} − ${mx(...q)}.`, [W, r.n, d2],
          [[W, raw, d2], [W, raw, d2 - d1], [W + 1, r.n, d2], [W, r.n + 1, d2]], {
            tier, hint: `Subtract the whole numbers. Change the fractions into ${PARTS[d2]}, then subtract.`,
            explain: `Wholes: ${w1} − ${w2} = ${W}. Fractions: ${r.text} So the answer is ${mx(W, r.n, d2)}.` });
      }
      if (shape === 1) {
        const d = pick(rng, [3, 4, 5, 6, 7, 8, 9]), n1 = numer(rng, 1, d - 2, d), n2 = numer(rng, n1 + 1, d - 1, d);
        const w1 = ri(rng, 3, 6), w2 = ri(rng, 1, w1 - 2);
        const R = imp(w1, n1, d) - imp(w2, n2, d), ans = [Math.floor(R / d), R % d, d];
        // Misconceptions: take the smaller fraction from the bigger one; forget to take away the exchanged whole.
        return mixedChoice(rng, `Work out ${mx(w1, n1, d)} − ${mx(w2, n2, d)}.`, ans,
          [[w1 - w2, n2 - n1, d], [w1 - w2, d + n1 - n2, d], [w1 - w2 - 1, n2 - n1, d], [w1 - w2 + 1, d + n1 - n2, d]], {
            tier, hint: `${fr(n1, d)} is less than ${fr(n2, d)}, so exchange one whole first.`,
            explain: `Exchange one whole: ${mx(w1, n1, d)} = ${mx(w1 - 1, d + n1, d)}. Wholes: ${w1 - 1} − ${w2} = ${w1 - w2 - 1}. Fractions: ${fr(d + n1, d)} − ${fr(n2, d)} = ${fr(d + n1 - n2, d)}. So the answer is ${mx(...ans)}.` });
      }
      if (shape === 2) {
        const [d1, d2] = pick(rng, REL), k = d2 / d1, w1 = ri(rng, 3, 5), w2 = ri(rng, 1, w1 - 2);
        let p, q;
        if (rng() < 0.5) {
          const a = numer(rng, 1, d1 - 1, d1);
          [p, q] = [[w1, a, d1], [w2, numer(rng, a * k + 1, d2 - 1, d2), d2]];
        } else {
          const b = numer(rng, 1, d1 - 1, d1);
          [p, q] = [[w1, numer(rng, 1, b * k - 1, d2), d2], [w2, b, d1]];
        }
        const tN = p[1] * (d2 / p[2]), bN = q[1] * (d2 / q[2]);    // both fraction parts in d2ths, tN < bN
        const R = imp(...p) * (d2 / p[2]) - imp(...q) * (d2 / q[2]), ans = [Math.floor(R / d2), R % d2, d2];
        const conv = [p, q].filter((m) => m[2] !== d2).map((m) => `${fr(m[1], m[2])} = ${fr(m[1] * k, d2)}`).join(' and ');
        return mixedChoice(rng, `Work out ${mx(...p)} − ${mx(...q)}.`, ans,
          [[w1 - w2, bN - tN, d2], [w1 - w2, d2 + tN - bN, d2], [w1 - w2 - 1, bN - tN, d2]], {
            tier, hint: `Change the fractions into ${PARTS[d2]} first. Then check: can you take the second fraction away, or do you need to exchange a whole?`,
            explain: `${conv}. ${fr(tN, d2)} is less than ${fr(bN, d2)}, so exchange one whole: ${mx(w1, tN, d2)} = ${mx(w1 - 1, d2 + tN, d2)}. Wholes: ${w1 - 1} − ${w2} = ${w1 - w2 - 1}. Fractions: ${fr(d2 + tN, d2)} − ${fr(bN, d2)} = ${fr(d2 + tN - bN, d2)}. So the answer is ${mx(...ans)}.` });
      }
      const [d1, d2] = pick(rng, REL), w1 = ri(rng, 2, 3), w2 = ri(rng, 0, 1);
      const [dp, dq] = rng() < 0.5 ? [d1, d2] : [d2, d1];
      const p = [w1, numer(rng, 1, dp - 1, dp), dp], q = [w2, numer(rng, 1, dq - 1, dq), dq];
      const P = imp(...p) * (d2 / dp), Q = imp(...q) * (d2 / dq), R = P - Q;
      const conv = [[p, P], [q, Q]].filter(([m]) => m[0] > 0 || m[2] !== d2).map(([m, v]) => `${mx(...m)} = ${fr(v, d2)}`).join(' and ');
      return frac(`Work out ${mx(...p)} − ${mx(...q)}. Give your answer as an improper fraction.`, R, d2, {
        tier, hint: `Change both numbers into improper fractions in ${PARTS[d2]}. Then subtract the numerators.`,
        explain: `${conv}. ${fr(P, d2)} − ${fr(Q, d2)} = ${fr(R, d2)}.` + tidy(R, d2) });
    },
  },

  // L10 — one-step word problems: total, what is left, difference, missing part (bar models).
  'u04-l10': {
    intro: {
      text: 'In a word problem, draw a <b>bar model</b>. The whole bar is the whole amount. If you know both parts, add them to find the total. If you know the whole and one part, subtract to find the missing part.',
      alt: 'Draw a bar for the whole thing and mark the parts you know. Do you need the total? Add. Is a part missing? Take away.',
      svg: barModel(1, [3, 5], { partLabels: ['3/8', '?'], wholeLabel: '1 whole' }),
    },
    example: {
      steps: [
        'Ava drinks ' + fr(3, 8) + ' of a bottle of juice. What fraction of the bottle is left?',
        'The whole bottle is 1 = ' + fr(8, 8) + '.',
        fr(8, 8) + ' − ' + fr(3, 8) + ' = ' + fr(5, 8) + '.',
        'So <b>' + fr(5, 8) + '</b> of the bottle is left.',
      ],
    },
    gen(rng, tier) {
      if (tier === 1) {
        const who = pick(rng, NAMES);
        if (rng() < 0.5) {
          const d = pick(rng, [4, 5, 6, 8, 9]), n = numer(rng, 1, d - 1, d);
          return frac(pick(rng, LEFT_STORIES)(who, fr(n, d)), d - n, d, {
            tier, svg: barModel(1, [n, d - n], { partLabels: [plain([n, d]), '?'], wholeLabel: '1 whole' }),
            hint: `The whole is 1, and 1 = ${fr(d, d)}. Take away the part that is done.`,
            explain: `1 whole = ${fr(d, d)}. ${fr(d, d)} − ${fr(n, d)} = ${fr(d - n, d)}.` + tidy(d - n, d) });
        }
        const [d1, d2] = pick(rng, REL_SMALL), k = d2 / d1, a = numer(rng, 1, d1 - 1, d1), b = numer(rng, 1, d2 - a * k - 1, d2);
        const [x, y] = rng() < 0.5 ? [[a, d1], [b, d2]] : [[b, d2], [a, d1]];
        const [text, unit] = pick(rng, TOTAL_STORIES)(who, frA(x), frA(y));
        const r = viaCommon(x, y, d2, '+');
        return frac(text, r.n, r.d, {
          tier, svg: barModel(1, [x[0] * y[1], y[0] * x[1]], { partLabels: [plain(x), plain(y)], wholeLabel: '?' }),
          hint: `Add the two amounts. ${d2} is a multiple of ${d1}, so change the ${PARTS[d1]} into ${PARTS[d2]}.`,
          explain: `${r.text} Altogether: ${fr(r.n, r.d)} ${unit}.` + tidy(r.n, r.d) });
      }
      const shape = ri(rng, 1, 3);
      if (shape === 1) {
        // Comparison: how much more / further / longer.
        const [A, B] = two(rng), [d1, d2] = pick(rng, [...REL, ...UNREL_SMALL]), L = lcm(d1, d2);
        let p = [numer(rng, 1, d1 - 1, d1), d1], q = [numer(rng, 1, d2 - 1, d2), d2];
        if (less(p, q)) [p, q] = [q, p];
        const [text, unit] = pick(rng, DIFF_STORIES)(A, B, frA(p), frA(q));
        const r = viaCommon(p, q, L, '−');
        return frac(text, r.n, r.d, {
          tier, svg: barModel(1, [q[0] * p[1], p[0] * q[1] - q[0] * p[1]], { partLabels: [plain(q), '?'], wholeLabel: `${plain(p)} ${unit}` }),
          hint: `"How much more" means find the difference: ${frA(p)} − ${frA(q)}.`,
          explain: `${r.text} The difference is ${fr(r.n, r.d)} ${unit}.` + tidy(r.n, r.d) });
      }
      const who = pick(rng, NAMES);
      if (shape === 2) {
        // Part–whole: the total and one part are known.
        const [p, q] = twoParts(rng, [...REL, ...UNREL_SMALL]), t = addF(p, q);
        const [text, unit] = pick(rng, PART_STORIES)(who, frA(t), frA(p));
        const r = viaCommon(t, p, lcm(t[1], p[1]), '−');
        return frac(text, r.n, r.d, {
          tier, svg: barModel(1, [p[0] * q[1], q[0] * p[1]], { partLabels: [plain(p), '?'], wholeLabel: `${plain(t)} ${unit}` }),
          hint: `You know the total and one part. Take the part away from the total: ${frA(t)} − ${frA(p)}.`,
          explain: `${r.text} The missing part is ${fr(r.n, r.d)} ${unit}.` + tidy(r.n, r.d) });
      }
      // Total with denominators that are not multiples of each other.
      const [x, y] = twoParts(rng, UNREL_SMALL);
      const [text, unit] = pick(rng, TOTAL_STORIES)(who, frA(x), frA(y));
      const r = viaCommon(x, y, lcm(x[1], y[1]), '+');
      return frac(text, r.n, r.d, {
        tier, svg: barModel(1, [x[0] * y[1], y[0] * x[1]], { partLabels: [plain(x), plain(y)], wholeLabel: '?' }),
        hint: `Add the two amounts. Find a common denominator first: ${x[1]} × ${y[1]} = ${x[1] * y[1]}.`,
        explain: `${r.text} Altogether: ${fr(r.n, r.d)} ${unit}.` + tidy(r.n, r.d) });
    },
  },

  // L11 — two-step problems and missing-number problems (□ + 2/5 = 9/10).
  'u04-l11': {
    intro: {
      text: 'Some problems need <b>two steps</b>: for example, first add the parts that are used, then take that away from 1 whole. In a <b>missing-number</b> problem, work backwards: in □ + ' + fr(2, 5) + ' = ' + fr(9, 10) + ', the missing number is ' + fr(9, 10) + ' − ' + fr(2, 5) + ' = ' + fr(9, 10) + ' − ' + fr(4, 10) + ' = ' + fr(5, 10) + ', which is ' + fr(1, 2) + '.',
      alt: 'Break the problem into small steps and do one step at a time. To find a missing number in an addition, take the number you know away from the total.',
      svg: barModel(1, [2, 3, 3], { partLabels: ['1/4', '3/8', '?'], wholeLabel: '1 whole pizza' }),
    },
    example: {
      steps: [
        'Ava eats ' + fr(1, 4) + ' of a pizza and Ben eats ' + fr(3, 8) + ' of it. What fraction is left?',
        'Step 1, eaten: ' + fr(1, 4) + ' + ' + fr(3, 8) + ' = ' + fr(2, 8) + ' + ' + fr(3, 8) + ' = ' + fr(5, 8) + '.',
        'Step 2, left: ' + fr(8, 8) + ' − ' + fr(5, 8) + ' = ' + fr(3, 8) + '.',
        'So <b>' + fr(3, 8) + '</b> of the pizza is left.',
      ],
    },
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const d = pick(rng, [5, 6, 7, 8, 9, 10, 12]), s = ri(rng, 2, d - 1), b = ri(rng, 1, s - 1), form = ri(rng, 1, 3);
          const ask = 'What fraction goes in the box?';
          if (form === 1) {
            return frac(`${ask} □ + ${fr(b, d)} = ${fr(s, d)}`, s - b, d, {
              tier, hint: `Work backwards: take ${fr(b, d)} away from ${fr(s, d)}.`,
              explain: `${fr(s, d)} − ${fr(b, d)} = ${fr(s - b, d)}. Check: ${fr(s - b, d)} + ${fr(b, d)} = ${fr(s, d)}.` });
          }
          if (form === 2) {
            return frac(`${ask} ${fr(s, d)} − □ = ${fr(b, d)}`, s - b, d, {
              tier, hint: `What do you take away from ${fr(s, d)} to leave ${fr(b, d)}? Work out ${fr(s, d)} − ${fr(b, d)}.`,
              explain: `${fr(s, d)} − ${fr(b, d)} = ${fr(s - b, d)}. Check: ${fr(s, d)} − ${fr(s - b, d)} = ${fr(b, d)}.` });
          }
          const c = s - b;
          return frac(`${ask} □ − ${fr(b, d)} = ${fr(c, d)}`, c + b, d, {
            tier, hint: `Work backwards: add ${fr(b, d)} back on to ${fr(c, d)}.`,
            explain: `${fr(c, d)} + ${fr(b, d)} = ${fr(c + b, d)}. Check: ${fr(c + b, d)} − ${fr(b, d)} = ${fr(c, d)}.` });
        }
        const [A, B] = two(rng), d = pick(rng, [5, 6, 7, 8, 9]), a = numer(rng, 1, d - 2, d), b = numer(rng, 1, d - 1 - a, d);
        const used = a + b, left = d - used;
        return frac(pick(rng, TWO_LEFT_STORIES)(A, B, fr(a, d), fr(b, d)), left, d, {
          tier, svg: barModel(1, [a, b, left], { partLabels: [plain([a, d]), plain([b, d]), '?'], wholeLabel: '1 whole' }),
          hint: 'Two steps: first add the two parts. Then take the total away from 1 whole.',
          explain: `Step 1: ${fr(a, d)} + ${fr(b, d)} = ${fr(used, d)}. Step 2: 1 whole = ${fr(d, d)}, and ${fr(d, d)} − ${fr(used, d)} = ${fr(left, d)}.` + tidy(left, d) });
      }
      const shape = ri(rng, 1, 3);
      if (shape === 1) {
        // Missing number with different denominators. x is the hidden fraction, s = x + p.
        const [x, p] = shuffle(rng, twoParts(rng, [...REL, ...UNREL_SMALL])), s = addF(x, p), form = ri(rng, 1, 4);
        const ask = 'What fraction goes in the box?';
        const eq = form === 1 ? `□ + ${frA(p)} = ${frA(s)}`
          : form === 2 ? `${frA(p)} + □ = ${frA(s)}`
            : form === 3 ? `${frA(s)} − □ = ${frA(p)}`
              : `□ − ${frA(p)} = ${frA(x)}`;
        const r = form === 4 ? viaCommon(x, p, lcm(x[1], p[1]), '+') : viaCommon(s, p, lcm(s[1], p[1]), '−');
        return frac(`${ask} ${eq}`, r.n, r.d, {
          tier, hint: form === 4 ? `Work backwards: add ${frA(p)} back on to ${frA(x)}.` : `Work backwards: ${frA(s)} − ${frA(p)}.`,
          explain: `${r.text} The missing fraction is ${fr(r.n, r.d)}.` + tidy(r.n, r.d) });
      }
      const [A, B] = two(rng);
      if (shape === 2) {
        // Two steps: add the parts used, then take them away from 1 whole.
        const [p, q] = twoParts(rng, [...REL, ...UNREL_SMALL]), L = lcm(p[1], q[1]);
        const used = viaCommon(p, q, L, '+'), left = L - used.n;
        return frac(pick(rng, TWO_LEFT_STORIES)(A, B, frA(p), frA(q)), left, L, {
          tier, svg: barModel(1, [p[0] * (L / p[1]), q[0] * (L / q[1]), left], { partLabels: [plain(p), plain(q), '?'], wholeLabel: '1 whole' }),
          hint: 'Two steps: first add the two parts (find a common denominator). Then take the total away from 1 whole.',
          explain: `Step 1: ${used.text} Step 2: 1 whole = ${fr(L, L)}, and ${fr(L, L)} − ${fr(used.n, L)} = ${fr(left, L)}.` + tidy(left, L) });
      }
      // Two steps: add one person's two amounts, then find the difference to the other's total.
      const [d1, d2] = pick(rng, REL), k = d2 / d1;
      const a = numer(rng, 1, Math.floor((d2 - 3) / k), d1), b = numer(rng, 1, d2 - 2 - a * k, d2);
      const J = a * k + b, c = ri(rng, 1, d2 - 1 - J), other = simplify(J + c, d2);
      const [text, unit] = pick(rng, COMPARE_STORIES)(A, B, fr(a, d1), fr(b, d2), frA(other));
      const r = viaCommon(other, [J, d2], d2, '−');
      return frac(text, r.n, r.d, {
        tier, hint: `Two steps: first add ${A}'s two amounts. Then find the difference.`,
        explain: `Step 1, ${A}: ${fr(a, d1)} = ${fr(a * k, d2)}, and ${fr(a * k, d2)} + ${fr(b, d2)} = ${fr(J, d2)} ${unit}. Step 2: ${r.text} The difference is ${fr(r.n, r.d)} ${unit}.` + tidy(r.n, r.d) });
    },
  },
};
