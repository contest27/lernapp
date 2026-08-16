// Book 6A — Units 4–5: fractions (simplifying, comparing, adding/subtracting,
// multiplying/dividing, fractions of amounts). Follows the official Power
// Maths Y6 lesson list (quality_reports/reference/y6-yearly-overview.md);
// topic split is quality_reports/reference/y6-topic-spine.md.
//
// Composed into y6a.js alongside units 1–2 (y6a-u3u6.js has units 3+6) so the
// book array keeps unit order and strand contiguity.
//
// Design note: every operand fed to a builder is a proper fraction of some
// whole (a recipe, a ribbon, a class). Results may land on an improper
// fraction (fine — the two-field pad just takes bigger n/d), but no question
// ever needs a mixed-number STRING typed into the pad, which the pad cannot
// represent.

import { num, tf, mc, mcFrom, order, frac, fr, scenario, ri, pick, shuffle, distinctInts } from './gen.js';
import { fracBar, fracCircle, numberLine, barModel } from './vis.js';

const NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Emma', 'Finn', 'Grace', 'Hugo', 'Isla', 'Jack'];

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function simplify(n, d) {
  const g = gcd(n, d);
  return [n / g, d / g];
}
function mixed(w, n, d) {
  return `${w} ${fr(n, d)}`;
}
function twoNames(rng) {
  const a = pick(rng, NAMES);
  return [a, pick(rng, NAMES.filter((x) => x !== a))];
}
// Denominator pairs shared by u04-addsub-frac's tier 2 and tier 3.
const MUL_PAIRS = [[2, 4], [2, 6], [3, 6], [2, 8], [4, 8], [3, 9], [2, 10], [5, 10], [3, 12], [4, 12]], D_PAIRS = [[3, 4], [2, 5], [3, 5], [4, 5], [2, 7], [3, 7], [2, 9], [4, 9]];

export const topics6aFrac = [

  // ---------------------------------------------------------------- Unit 4a
  {
    id: 'u04-simplify', unit: 4, book: '6A', strand: 'fractions', emoji: '✂️',
    title: 'Simplifying fractions', shortTitle: 'Simplify fractions',
    explanation: {
      segments: [
        {
          text: 'A fraction can be written in different ways and still mean the same amount. <b>Simplifying</b> means dividing the <b>numerator</b> and <b>denominator</b> by the same factor to get the smallest possible numbers. ' + fr(6, 8) + ' and ' + fr(3, 4) + ' are exactly the same amount — ' + fr(3, 4) + ' is the simplified form.',
          alt: 'Simplifying is just writing the same amount with smaller numbers. Six eighths and three quarters look different but colour in the same amount of a shape.',
          svg: fracBar(6, 8) + fracBar(3, 4),
        },
        {
          text: 'To simplify, find a number that divides into BOTH the top and the bottom, and divide both by it. Keep going until nothing (except 1) divides into both — that is the <b>simplest form</b>. ' + fr(12, 18) + ': divide by 6 → ' + fr(2, 3) + '. Nothing else divides into 2 and 3, so that is as simple as it gets.',
          alt: 'Look for a number that fits into the top AND the bottom. Divide both by it. Keep checking — when nothing else fits into both, you have finished.',
        },
        {
          text: 'It works backwards too: MULTIPLY top and bottom by the same number to make an <b>equivalent</b> fraction with bigger numbers, and simplifying and multiplying never move the point on a number line. ' + fr(3, 4) + ' × 3 top and bottom → ' + fr(9, 12) + '; both sit at the exact same spot, three-quarters of the way from 0 to 1.',
          alt: 'Simplifying in reverse: multiply top and bottom by the same number instead of dividing. Either way, the fraction marks the same point on the number line.',
          svg: numberLine(0, 1, [{ v: 0.75, label: '¾ = 6/8 = 9/12' }], { step: 0.25 }),
        },
      ],
    },
    example: {
      steps: [
        'Simplify ' + fr(12, 18) + ' to its simplest form.',
        'What number divides into both 12 and 18? Try 6.',
        '12 ÷ 6 = 2, and 18 ÷ 6 = 3.',
        'So ' + fr(12, 18) + ' = <b>' + fr(2, 3) + '</b>. Nothing else divides into 2 and 3, so that is simplest form.',
      ],
    },
    faqs: [
      { q: 'How do I find the right number to divide by?', a: 'Try small numbers first — 2, 3, 5. If both top and bottom are even, start with 2. Keep dividing until nothing works any more.' },
      { q: 'How do I know a fraction is fully simplified?', a: 'Check whether any whole number bigger than 1 divides into BOTH the top and the bottom. If nothing does, it is in simplest form.' },
      { q: 'Does simplifying change the value of the fraction?', a: 'Never! Simplifying only changes how the fraction is WRITTEN. 6/8 and 3/4 are exactly the same amount — just different names for the same point on the number line.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const d = pick(rng, [4, 5, 6, 8]), n = ri(rng, 1, d - 1);
          const circle = rng() < 0.5;
          return frac('What fraction is shaded?', n, d, {
            tier, svg: circle ? fracCircle(n, d) : fracBar(n, d),
            hint: 'Count the shaded parts over the total equal parts.', explain: `${n} out of ${d} parts are shaded: ${fr(n, d)}.` });
        }
        const bases = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [1, 6], [5, 6]];
        const [bn, bd] = pick(rng, bases), [n0, d0] = simplify(bn, bd);
        const k = pick(rng, [2, 3, 4]);
        return frac(`Simplify ${fr(n0 * k, d0 * k)} to its simplest form.`, n0, d0, {
          exact: true, tier,
          hint: `What number divides into both ${n0 * k} and ${d0 * k}?`, explain: `Divide top and bottom by ${k}: ${fr(n0, d0)}.` });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const bases = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [1, 6], [5, 6], [1, 7], [2, 7], [3, 8], [1, 9]];
          const [bn, bd] = pick(rng, bases), [n0, d0] = simplify(bn, bd);
          const k = ri(rng, 4, 8);
          return frac(`Simplify ${fr(n0 * k, d0 * k)} to its simplest form.`, n0, d0, {
            exact: true, tier,
            hint: `Find the biggest number that divides into both ${n0 * k} and ${d0 * k}.`, explain: `${n0 * k} ÷ ${k} = ${n0}, ${d0 * k} ÷ ${k} = ${d0}: ${fr(n0, d0)}.` });
        }
        if (kind === 2) {
          const d0 = pick(rng, [2, 3, 4, 5, 6]), n0 = ri(rng, 1, d0 - 1);
          const k = ri(rng, 2, 6);
          if (rng() < 0.5) {
            return num(`Find the missing number: ${fr(n0, d0)} = ${fr('□', d0 * k)}`, n0 * k, {
              tier, hint: `The bottom was multiplied by ${k} — do the same to the top.`,
              explain: `${n0} × ${k} = ${n0 * k}.` });
          }
          return num(`Find the missing number: ${fr(n0, d0)} = ${fr(n0 * k, '□')}`, d0 * k, {
            tier, hint: `The top was multiplied by ${k} — do the same to the bottom.`,
            explain: `${d0} × ${k} = ${d0 * k}.` });
        }
        const pairs = [[1, 2], [1, 4], [3, 4], [1, 3], [2, 3], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [5, 8], [7, 8]];
        const [n, d] = pick(rng, pairs);
        const wrong1 = fr(n, d + 1), wrong2 = n + 1 <= d - 1 ? fr(n + 1, d) : fr(Math.max(1, n - 1), d);
        const wrong3 = fr(d - n, d);
        return mcFrom(rng, 'Which fraction does the mark on the number line show?', fr(n, d), [wrong1, wrong2, wrong3], {
          tier, svg: numberLine(0, 1, [{ v: n / d, label: '?' }], { step: 0.5 }),
          hint: 'Read across from 0 to 1 — how far along is the mark?', explain: `The mark sits at ${fr(n, d)}.` });
      }
      const stories = [
        (r) => {
          const [name1] = twoNames(r);
          const bases = [[1, 2], [2, 3], [3, 4], [1, 3], [2, 5]];
          const [n0, d0] = pick(r, bases);
          const k = ri(r, 2, 5), truth = r() < 0.5;
          const shown = truth ? [n0 * k, d0 * k] : [n0 * k + 1, d0 * k];
          return tf(`${name1} says ${fr(n0, d0)} of a pizza is the same amount as ${fr(shown[0], shown[1])}. Is ${name1} right?`, truth, {
            tier: 3,
            hint: 'Check: is the second fraction top and bottom multiplied by the same number?',
            explain: truth
              ? `${fr(n0, d0)} × ${k} top and bottom gives ${fr(n0 * k, d0 * k)} — the same amount.`
              : `${d0} × ${k} = ${d0 * k}, but the top should be ${n0 * k}, not ${shown[0]} — not the same amount.`,
          });
        },
        (r) => {
          const target = pick(r, [[1, 2], [2, 3], [3, 4], [1, 3], [3, 5]]);
          const [tn, td] = target;
          const ks = distinctInts(r, 3, 2, 6), equivs = ks.map((k) => fr(tn * k, td * k));
          const k2 = pick(r, ks), wrong = fr(tn * k2 + 1, td * k2);
          return mcFrom(r, `Which fraction does NOT simplify to ${fr(tn, td)}?`, wrong, equivs, {
            tier: 3,
            hint: `Check each option: dividing top and bottom by the same number should give ${fr(tn, td)}.`, explain: `${wrong} does not simplify to ${fr(tn, td)} — the others all do.` });
        },
        (r) => {
          const bases = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]];
          const [bn, bd] = pick(r, bases), [n0, d0] = simplify(bn, bd);
          const k = ri(r, 2, 5), name = pick(r, NAMES);
          return frac(`${name} colours ${n0 * k} out of ${d0 * k} equal parts of a strip. What fraction of the strip is coloured, in its SIMPLEST form?`, n0, d0, {
            exact: true, tier: 3,
            svg: fracBar(n0 * k, d0 * k),
            hint: `${n0 * k} out of ${d0 * k} — what divides into both numbers?`, explain: `${fr(n0 * k, d0 * k)} simplifies to ${fr(n0, d0)}.` });
        },
        (r) => {
          const simplestPool = [[3, 7], [2, 9], [5, 6], [3, 10], [4, 9], [5, 8]], correct = pick(r, simplestPool);
          const others = distinctInts(r, 3, 2, 4).map((k) => {
            const base = pick(r, simplestPool.filter((p) => p !== correct));
            return fr(base[0] * k, base[1] * k);
          });
          return mcFrom(r, 'Which of these fractions is already in its SIMPLEST form?', fr(correct[0], correct[1]), others, {
            tier: 3,
            hint: 'Simplest form means nothing (except 1) divides into both numbers.', explain: `${fr(correct[0], correct[1])} cannot be simplified any further.` });
        },
      ];
      return scenario(rng, 'u04-simplify-t3', stories);
    },
  },

  // ---------------------------------------------------------------- Unit 4b
  {
    id: 'u04-compare', unit: 4, book: '6A', strand: 'fractions', emoji: '⚖️',
    title: 'Comparing and ordering fractions', shortTitle: 'Compare fractions',
    explanation: {
      segments: [
        {
          text: 'When two fractions have the SAME denominator, the pieces are the same size — so just compare the numerators. ' + fr(5, 9) + ' &gt; ' + fr(3, 9) + ' because 5 pieces beat 3 pieces of the same size.',
          alt: 'Same bottom number means same-size pieces. Whichever fraction has the bigger top number is the bigger fraction.',
          svg: fracBar(5, 9) + fracBar(3, 9, { color: '#fca5a5' }),
        },
        {
          text: 'When two fractions have the SAME numerator, look at the denominator instead — a BIGGER denominator means SMALLER pieces, so a smaller fraction. ' + fr(1, 8) + ' is smaller than ' + fr(1, 3) + ', even though 8 is a bigger number than 3.',
          alt: 'Same top number: more pieces to share into means each piece is smaller. The fraction with the bigger bottom number is actually the smaller amount.',
          svg: fracBar(1, 3) + fracBar(1, 8),
        },
        {
          text: 'With different numerators AND denominators, convert to a <b>common denominator</b> first. To compare ' + fr(2, 3) + ' and ' + fr(3, 5) + ', multiply the bottoms: 3 × 5 = 15. ' + fr(2, 3) + ' = ' + fr(10, 15) + ' and ' + fr(3, 5) + ' = ' + fr(9, 15) + ' — now ' + fr(10, 15) + ' is clearly bigger. A shortcut for just two fractions: cross-multiply — 2 × 5 = 10 and 3 × 3 = 9, same answer, no common denominator needed.',
          alt: 'When nothing matches, multiply the two bottoms together to get a shared denominator both fractions can convert into, then compare the new tops. Cross-multiplying is a faster shortcut for comparing exactly two fractions.',
        },
      ],
    },
    example: {
      steps: [
        'Which is bigger, ' + fr(5, 6) + ' or ' + fr(7, 9) + '?',
        'Common denominator: 6 × 9... but 18 works too, since both 6 and 9 divide into it.',
        fr(5, 6) + ' = ' + fr(15, 18) + ' and ' + fr(7, 9) + ' = ' + fr(14, 18) + '.',
        '15 &gt; 14, so <b>' + fr(5, 6) + '</b> is bigger.',
      ],
    },
    faqs: [
      { q: 'Why do the denominators need to match before comparing?', a: 'Because the denominator tells you the SIZE of the pieces. You can only fairly compare "how many" once the pieces are the same size.' },
      { q: 'Is there a shortcut for comparing two fractions?', a: 'Yes — cross-multiply. Multiply the first numerator by the second denominator, and the second numerator by the first denominator. The bigger result tells you the bigger fraction.' },
      { q: 'How do I order more than two fractions?', a: 'Convert every fraction to the same denominator (multiply all the bottoms together if unsure), then simply order the new numerators.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const d = pick(rng, [5, 6, 7, 8, 9]);
          const [n1, n2] = distinctInts(rng, 2, 1, d - 1);
          const bigger = rng() < 0.5;
          const [a, b] = bigger ? [Math.max(n1, n2), Math.min(n1, n2)] : [Math.min(n1, n2), Math.max(n1, n2)];
          return tf(`True or false: ${fr(a, d)} &gt; ${fr(b, d)}`, bigger, {
            tier, hint: 'Same bottom number — compare the tops.',
            explain: `Same-size pieces: more parts means bigger. ${fr(Math.max(n1, n2), d)} is the larger fraction.` });
        }
        const n = ri(rng, 1, 4), d1 = pick(rng, [3, 4, 5, 6, 8]);
        let d2 = d1;
        while (d2 === d1) d2 = pick(rng, [3, 4, 5, 6, 8]);
        if (n >= Math.min(d1, d2)) return this.gen(rng, tier);
        const smallerD = Math.min(d1, d2), biggerD = Math.max(d1, d2);
        return mcFrom(rng, 'Which fraction is BIGGER?', fr(n, smallerD), [fr(n, biggerD)], {
          tier, hint: 'Same top number — fewer, bigger pieces make a bigger fraction.',
          explain: `${fr(n, smallerD)} has bigger pieces than ${fr(n, biggerD)}, so it is bigger.` });
      }
      if (tier === 2) {
        const pairs = [[3, 4], [2, 3], [3, 5], [2, 5], [4, 5], [3, 7], [2, 7], [5, 6], [3, 8], [5, 8]];
        const [d1, d2] = pick(rng, pairs);
        const n1 = ri(rng, 1, d1 - 1), n2 = ri(rng, 1, d2 - 1);
        if (n1 * d2 === n2 * d1) return this.gen(rng, tier);
        const aBigger = n1 * d2 > n2 * d1;
        return mcFrom(rng, `Which fraction is BIGGER: ${fr(n1, d1)} or ${fr(n2, d2)}?`, aBigger ? fr(n1, d1) : fr(n2, d2), [aBigger ? fr(n2, d2) : fr(n1, d1)], {
          tier, hint: `Cross-multiply: ${n1} × ${d2} compared with ${n2} × ${d1}.`,
          explain: `${n1} × ${d2} = ${n1 * d2} and ${n2} × ${d1} = ${n2 * d1}: ${aBigger ? fr(n1, d1) : fr(n2, d2)} is bigger.` });
      }
      const orderSets = [
        [[1, 2], [3, 8], [5, 8]],
        [[2, 3], [1, 2], [5, 6]],
        [[3, 4], [1, 3], [5, 6], [2, 3]],
        [[3, 5], [1, 2], [7, 10]],
        [[2, 9], [1, 3], [5, 9], [7, 9]],
      ];
      const stories = [
        (r) => {
          const set = pick(r, orderSets), vals = set.map(([n, d]) => n / d);
          if (new Set(vals).size !== vals.length) return null;
          const sorted = set.slice().sort((a, b) => a[0] / a[1] - b[0] / b[1]).map(([n, d]) => fr(n, d));
          return order('Order these fractions, <b>smallest first</b>.', r, sorted, {
            tier: 3, hint: 'Change them to a common denominator first, then compare the tops.',
            explain: 'With the same denominator, the fraction with the smaller top is smaller.' });
        },
        (r) => {
          const set = pick(r, orderSets), vals = set.map(([n, d]) => n / d);
          if (new Set(vals).size !== vals.length) return null;
          const sorted = set.slice().sort((a, b) => b[0] / b[1] - a[0] / a[1]).map(([n, d]) => fr(n, d));
          return order('Order these fractions, <b>largest first</b>.', r, sorted, {
            tier: 3, hint: 'This time start from the BIGGEST fraction.',
            explain: 'Convert to a common denominator, then order the tops from biggest to smallest.' });
        },
        (r) => {
          const [name1, name2] = twoNames(r);
          const pairs = [[3, 4], [2, 3], [3, 5], [4, 5], [5, 6], [3, 7], [5, 8]];
          const [d1, d2] = pick(r, pairs);
          const n1 = ri(r, 1, d1 - 1), n2 = ri(r, 1, d2 - 1);
          if (n1 * d2 === n2 * d1) return null;
          const aMore = n1 * d2 > n2 * d1;
          return mcFrom(r, `${name1} ate ${fr(n1, d1)} of a pizza. ${name2} ate ${fr(n2, d2)} of an identical pizza. Who ate MORE?`, aMore ? name1 : name2, [aMore ? name2 : name1], {
            tier: 3, hint: 'Compare with a common denominator.',
            explain: `${n1} × ${d2} = ${n1 * d2}; ${n2} × ${d1} = ${n2 * d1}. ${aMore ? name1 : name2} ate more.` });
        },
        (r) => {
          const d = pick(r, [8, 10, 12]), n1 = ri(r, 1, d - 2), n2 = ri(r, n1 + 1, d - 1);
          const names = twoNames(r);
          return tf(`${names[0]} ran ${fr(n2, d)} of a race. ${names[1]} ran ${fr(n1, d)} of the same race. True or false: ${names[0]} ran FURTHER.`, true, {
            tier: 3, hint: 'Same denominator — the bigger top wins.',
            explain: `${fr(n2, d)} &gt; ${fr(n1, d)}, so ${names[0]} ran further.` });
        },
      ];
      const q = scenario(rng, 'u04-compare-t3', stories);
      return q ?? this.gen(rng, tier);
    },
  },

  // ---------------------------------------------------------------- Unit 4c
  {
    id: 'u04-addsub-frac', unit: 4, book: '6A', strand: 'fractions', emoji: '🧩',
    title: 'Adding and subtracting fractions', shortTitle: 'Add/sub fractions',
    explanation: {
      segments: [
        {
          text: 'Adding or subtracting fractions with the SAME denominator is straightforward: add or subtract the numerators, and keep the denominator the same. ' + fr(4, 9) + ' + ' + fr(2, 9) + ' = ' + fr(6, 9) + '.',
          alt: 'Same bottom number: the pieces already match, so just add or subtract the top numbers and leave the bottom alone.',
          svg: fracBar(4, 9) + fracBar(2, 9, { color: '#fca5a5' }),
        },
        {
          text: 'With DIFFERENT denominators, first change one or both fractions so they share a <b>common denominator</b>. For ' + fr(1, 4) + ' + ' + fr(1, 6) + ', both 4 and 6 divide into 12: ' + fr(1, 4) + ' = ' + fr(3, 12) + ' and ' + fr(1, 6) + ' = ' + fr(2, 12) + ', so the total is ' + fr(5, 12) + '.',
          alt: 'When the bottoms do not match, convert the fractions so they do — multiply top and bottom of each fraction by whatever makes the denominators the same.',
        },
        {
          text: 'Subtraction works the same way: match the denominators first, THEN subtract the tops. ' + fr(5, 6) + ' − ' + fr(1, 4) + ': common denominator 12 → ' + fr(10, 12) + ' − ' + fr(3, 12) + ' = ' + fr(7, 12) + '. Word problems often need TWO fractions added or subtracted, sometimes against a whole (worth 1).',
          alt: 'For story problems, picture the whole as one bar. If a piece of the bar is missing, subtract to find it. If you need the total of several pieces, add them.',
          svg: barModel(1, [0.4, 0.6], { partLabels: ['2/5', '?'], wholeLabel: '1 whole' }),
        },
      ],
    },
    example: {
      steps: [
        'A recipe needs ' + fr(2, 3) + ' cup of flour and ' + fr(1, 6) + ' cup of butter. How much is that altogether?',
        'Common denominator 6: ' + fr(2, 3) + ' = ' + fr(4, 6) + '.',
        fr(4, 6) + ' + ' + fr(1, 6) + ' = ' + fr(5, 6) + '.',
        'Answer: <b>' + fr(5, 6) + ' cup</b>.',
      ],
    },
    faqs: [
      { q: 'Why can\'t I just add the denominators?', a: 'The denominator is the SIZE of the piece, not a count. Adding sizes together makes no sense — only the numerators (the counts) get added, once the pieces match.' },
      { q: 'Which denominator should I convert to?', a: 'Any common multiple of both denominators works — multiplying the two denominators together always gives one, even if it is not the smallest.' },
      { q: 'Do I need to simplify my answer?', a: 'An unsimplified correct answer is still correct. Simplest form is just tidier to read.' },
    ],
    gen(rng, tier) {
      const mulPairs = MUL_PAIRS, dpairs = D_PAIRS;
      if (tier === 1) {
        const d = pick(rng, [6, 7, 8, 9, 10, 12]);
        if (rng() < 0.5) {
          const a = ri(rng, 1, d - 2), b = ri(rng, 1, d - a - 1);
          return frac(`Work out ${fr(a, d)} + ${fr(b, d)}`, a + b, d, {
            tier, hint: 'Same bottom number — add the tops, keep the bottom.',
            explain: `${a} + ${b} = ${a + b}: ${fr(a + b, d)}.` });
        }
        const a = ri(rng, 2, d - 1), b = ri(rng, 1, a - 1);
        return frac(`Work out ${fr(a, d)} − ${fr(b, d)}`, a - b, d, {
          tier, hint: 'Same bottom number — subtract the tops.',
          explain: `${a} − ${b} = ${a - b}: ${fr(a - b, d)}.` });
      }
      if (tier === 2) {
        if (rng() < 0.4) {
          const [d1, d2] = pick(rng, mulPairs);
          const k = d2 / d1, a = ri(rng, 1, d1 - 1), bMax = d2 - a * k - 1;
          if (bMax < 1) return this.gen(rng, tier);
          const b = ri(rng, 1, bMax);
          return frac(`Work out ${fr(a, d1)} + ${fr(b, d2)}`, a * k + b, d2, {
            tier, hint: `Change ${fr(a, d1)} into ${d2}ths first: ${fr(a, d1)} = ${fr(a * k, d2)}.`,
            explain: `${fr(a * k, d2)} + ${fr(b, d2)} = ${fr(a * k + b, d2)}.` });
        }
        const [d1, d2] = pick(rng, dpairs);
        const a = ri(rng, 1, d1 - 1), b = ri(rng, 1, d2 - 1);
        if (rng() < 0.5) {
          return frac(`Work out ${fr(a, d1)} + ${fr(b, d2)}. (An improper answer is fine!)`, a * d2 + b * d1, d1 * d2, {
            tier, hint: `Multiply the bottoms to get a common denominator: ${d1} × ${d2} = ${d1 * d2}.`,
            explain: `${fr(a, d1)} = ${fr(a * d2, d1 * d2)}; ${fr(b, d2)} = ${fr(b * d1, d1 * d2)}; total ${fr(a * d2 + b * d1, d1 * d2)}.` });
        }
        if (a * d2 <= b * d1) return this.gen(rng, tier);
        return frac(`Work out ${fr(a, d1)} − ${fr(b, d2)}`, a * d2 - b * d1, d1 * d2, {
          tier, hint: `Multiply the bottoms to get a common denominator: ${d1} × ${d2} = ${d1 * d2}.`,
          explain: `${fr(a, d1)} = ${fr(a * d2, d1 * d2)}; ${fr(b, d2)} = ${fr(b * d1, d1 * d2)}; ${fr(a * d2, d1 * d2)} − ${fr(b * d1, d1 * d2)} = ${fr(a * d2 - b * d1, d1 * d2)}.` });
      }
      const addParts = (r) => {
        const [d1, d2] = pick(r, mulPairs);
        const k = d2 / d1, a = ri(r, 1, d1 - 1);
        const bMax = d2 - a * k - 1;
        if (bMax < 1) return null;
        return { d1, d2, k, a, b: ri(r, 1, bMax) };
      };
      const stories = [
        (r) => {
          const p = addParts(r);
          if (!p) return null;
          return frac(`A recipe uses ${fr(p.a, p.d1)} kg of flour and ${fr(p.b, p.d2)} kg of sugar. How much do the flour and sugar weigh together?`, p.a * p.k + p.b, p.d2, {
            tier: 3, hint: `Change ${fr(p.a, p.d1)} into ${p.d2}ths first.`,
            explain: `${fr(p.a, p.d1)} = ${fr(p.a * p.k, p.d2)}; + ${fr(p.b, p.d2)} = ${fr(p.a * p.k + p.b, p.d2)} kg.` });
        },
        (r) => {
          const p = addParts(r);
          if (!p) return null;
          const name = pick(r, NAMES), km = ri(r, 3, 12);
          return frac(`${name} walks a ${km} km route. In the morning ${name} covers ${fr(p.a, p.d1)} of it, and in the afternoon ${fr(p.b, p.d2)} of it. What fraction of the route has ${name} covered?`, p.a * p.k + p.b, p.d2, {
            tier: 3, hint: 'The question asks for a FRACTION of the route, not a distance — the km is not needed.',
            explain: `${fr(p.a, p.d1)} = ${fr(p.a * p.k, p.d2)}; + ${fr(p.b, p.d2)} = ${fr(p.a * p.k + p.b, p.d2)} of the route.` });
        },
        (r) => {
          const d = pick(r, [5, 6, 7, 8, 9, 10]), a = ri(r, 1, d - 1);
          const name = pick(r, NAMES);
          return frac(`A water tank was full. ${name} uses ${fr(a, d)} of it to water the garden. What fraction of the tank is LEFT?`, d - a, d, {
            tier: 3, hint: 'A full tank is 1 whole — take away the fraction used.',
            explain: `1 = ${fr(d, d)}; ${fr(d, d)} − ${fr(a, d)} = ${fr(d - a, d)} left.` });
        },
        (r) => {
          const [d1, d2] = pick(r, dpairs);
          const a = ri(r, 1, d1 - 1), b = ri(r, 1, d2 - 1), d = d1 * d2;
          const used = a * d2 + b * d1;
          if (used >= d) return null;
          const name = pick(r, NAMES);
          return frac(`${name} has a whole pizza. ${name} eats ${fr(a, d1)} at lunch and ${fr(b, d2)} at dinner. What fraction of the pizza is LEFT?`, d - used, d, {
            tier: 3, hint: 'Add the two amounts eaten first, then subtract from 1 whole.',
            explain: `${fr(a, d1)} + ${fr(b, d2)} = ${fr(used, d)} eaten; 1 − ${fr(used, d)} = ${fr(d - used, d)} left.` });
        },
        (r) => {
          const [d1, d2] = pick(r, dpairs);
          const a = ri(r, 1, d1 - 1), b = ri(r, 1, d2 - 1);
          if (a * d2 === b * d1) return null;
          const [name1, name2] = twoNames(r);
          const aMore = a * d2 > b * d1, common = d1 * d2;
          const diffN = Math.abs(a * d2 - b * d1);
          return frac(`${name1} has read ${fr(a, d1)} of a book. ${name2} has read ${fr(b, d2)} of the same book. How much MORE has ${aMore ? name1 : name2} read?`, diffN, common, {
            tier: 3, hint: '"How much more" means find the difference between the two fractions.',
            explain: `${fr(a, d1)} = ${fr(a * d2, common)} and ${fr(b, d2)} = ${fr(b * d1, common)}; the difference is ${fr(diffN, common)}.` });
        },
      ];
      const q = scenario(rng, 'u04-addsub-frac-t3', stories);
      return q ?? this.gen(rng, tier);
    },
  },

  // ---------------------------------------------------------------- Unit 5a
  {
    id: 'u05-mult-div-frac', unit: 5, book: '6A', strand: 'fractions', emoji: '🔀',
    title: 'Multiplying and dividing fractions', shortTitle: 'Multiply/divide fractions',
    explanation: {
      segments: [
        {
          text: 'Multiplying a fraction by a whole number is repeated addition: ' + fr(1, 5) + ' × 3 means ' + fr(1, 5) + ' + ' + fr(1, 5) + ' + ' + fr(1, 5) + ' = ' + fr(3, 5) + '. Multiply the numerator by the whole number; the denominator stays the same. "Of" is the key word for multiplying two fractions: ' + fr(1, 2) + ' of ' + fr(1, 3) + ' means ' + fr(1, 2) + ' × ' + fr(1, 3) + '. Multiply the tops together and the bottoms together: 1×1=1, 2×3=6, so the answer is ' + fr(1, 6) + '.',
          alt: 'Whenever you see "of" between two fractions, multiply them. Top times top, bottom times bottom — that is the whole method.',
          svg: fracBar(1, 3) + fracBar(1, 6),
        },
        {
          text: 'Dividing a fraction by a whole number shares it into even smaller pieces: the denominator gets MULTIPLIED. ' + fr(3, 4) + ' ÷ 2 = ' + fr(3, 8) + ' — each quarter is split into 2, making eighths.',
          alt: 'Dividing by a whole number makes the pieces smaller, so the bottom number grows. Multiply the denominator by whatever you are dividing by.',
        },
        {
          text: 'Real problems mix all four fraction skills. Read carefully: "of" or "×" between two fractions means multiply; "shared between" or "÷" by a whole number means divide.',
          alt: 'Story problems test whether you know which operation the words are asking for. "Of" and "times" mean multiply; "shared" and "divided" mean divide.',
        },
      ],
    },
    example: {
      steps: [
        'Work out ' + fr(2, 3) + ' × ' + fr(3, 4) + '.',
        'Multiply the tops: 2 × 3 = 6.',
        'Multiply the bottoms: 3 × 4 = 12.',
        'Answer: ' + fr(6, 12) + ', which simplifies to <b>' + fr(1, 2) + '</b>.',
      ],
    },
    faqs: [
      { q: 'Why does dividing a fraction make the denominator bigger?', a: 'Dividing shares an amount into MORE, SMALLER pieces. More pieces of the same whole means a bigger denominator, even though the total amount shrinks.' },
      { q: 'What does "of" mean between two fractions?', a: '"Of" always means multiply. Half of a third is the same calculation as half times a third.' },
      { q: 'Do I have to simplify my answer?', a: 'An unsimplified correct answer is still marked correct — but simplest form is the tidiest way to write it.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const d = pick(rng, [3, 4, 5, 6, 7, 8]), w = ri(rng, 2, d - 1);
          return frac(`Work out ${fr(1, d)} × ${w}`, w, d, {
            tier, hint: `${fr(1, d)} × ${w} means ${w} lots of ${fr(1, d)}.`,
            explain: `${w} × ${fr(1, d)} = ${fr(w, d)}.` });
        }
        const d1 = pick(rng, [2, 3, 4]), d2 = pick(rng, [2, 3, 4, 5]), n1 = d1 > 2 ? pick(rng, [1, 2]) : 1, n2 = d2 > 2 ? pick(rng, [1, 2]) : 1;
        return frac(`Work out ${fr(n1, d1)} × ${fr(n2, d2)}`, n1 * n2, d1 * d2, {
          tier, hint: '"Of" a fraction: multiply the tops, multiply the bottoms.',
          explain: `${n1} × ${n2} = ${n1 * n2}; ${d1} × ${d2} = ${d1 * d2}: ${fr(n1 * n2, d1 * d2)}.` });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const d = pick(rng, [3, 4, 5, 6]), n = ri(rng, 2, d - 1);
          const w = ri(rng, 2, 4), product = n * w;
          const whole = Math.floor(product / d), rem = product % d;
          if (rem === 0) return this.gen(rng, tier);
          if (whole === 0) {
            return frac(`Work out ${fr(n, d)} × ${w}`, product, d, {
              tier, hint: `${w} lots of ${fr(n, d)}: multiply the top by ${w}.`,
              explain: `${n} × ${w} = ${product}: ${fr(product, d)}.` });
          }
          const correct = mixed(whole, rem, d), cands = [mixed(whole + 1, rem, d), mixed(whole, rem === d - 1 ? rem - 1 : rem + 1, d), mixed(Math.max(1, whole - 1), rem, d)];
          const pool = [correct];
          for (const c of cands) if (!pool.includes(c) && pool.length < 4) pool.push(c);
          const options = shuffle(rng, pool);
          return mc(`Work out ${fr(n, d)} × ${w}, as a mixed number.`, options, options.indexOf(correct), {
            tier, hint: `${n} × ${w} = ${product}; how many whole ${d}ths fit into that?`,
            explain: `${fr(n, d)} × ${w} = ${fr(product, d)} = ${correct}.` });
        }
        if (kind === 2) {
          const d = pick(rng, [3, 4, 5, 6, 7, 8]), n = ri(rng, 1, d - 1);
          const w = ri(rng, 2, 5);
          return frac(`Work out ${fr(n, d)} ÷ ${w}`, n, d * w, {
            tier, hint: `Dividing by ${w} makes each piece ${w} times smaller — multiply the BOTTOM by ${w}.`,
            explain: `${fr(n, d)} ÷ ${w} = ${fr(n, d * w)}.` });
        }
        const d1 = pick(rng, [2, 3, 4, 5]), d2 = pick(rng, [2, 3, 4, 5]), n1 = ri(rng, 1, d1 - 1), n2 = ri(rng, 1, d2 - 1);
        return frac(`Work out ${fr(n1, d1)} × ${fr(n2, d2)}`, n1 * n2, d1 * d2, {
          tier, hint: 'Multiply the tops together, then multiply the bottoms together.',
          explain: `${n1} × ${n2} = ${n1 * n2}; ${d1} × ${d2} = ${d1 * d2}: ${fr(n1 * n2, d1 * d2)}.` });
      }
      const stories = [
        (r) => {
          const bases = [[1, 2], [1, 3], [1, 4], [2, 3]];
          const [n1, d1] = pick(r, bases);
          const [n2, d2] = pick(r, bases);
          const name = pick(r, NAMES);
          return frac(`${fr(n1, d1)} of a cake is left. ${name} eats ${fr(n2, d2)} of what is left. What fraction of the WHOLE cake does ${name} eat?`, n1 * n2, d1 * d2, {
            tier: 3, hint: `"Of" means multiply: ${fr(n1, d1)} × ${fr(n2, d2)}.`,
            explain: `${n1} × ${n2} = ${n1 * n2}; ${d1} × ${d2} = ${d1 * d2}: ${fr(n1 * n2, d1 * d2)} of the whole cake.` });
        },
        (r) => {
          const d = pick(r, [4, 5, 6, 8]), n = ri(r, 2, d - 1);
          const w = ri(r, 2, 4);
          return frac(`${fr(n, d)} of a pizza is shared equally between ${w} friends. What fraction of the WHOLE pizza does each friend get?`, n, d * w, {
            tier: 3, hint: `Sharing ${fr(n, d)} between ${w}: multiply the bottom by ${w}.`,
            explain: `${fr(n, d)} ÷ ${w} = ${fr(n, d * w)} each.` });
        },
        (r) => {
          const build = () => {
            const useDiv = r() < 0.5, n = ri(r, 1, 3), d = pick(r, [3, 4, 5, 6]);
            const w = ri(r, 2, 4);
            if (useDiv) return { text: `${fr(n, d)} ÷ ${w}`, value: n / (d * w) };
            return { text: `${fr(n, d)} × ${fr(1, w)}`, value: n / (d * w) };
          };
          const exprs = [];
          let guard = 0;
          while (exprs.length < 4 && guard++ < 40) {
            const e = build();
            if (!exprs.some((x) => Math.abs(x.value - e.value) < 1e-9)) exprs.push(e);
          }
          if (exprs.length < 4) return null;
          const minIdx = exprs.reduce((best, e, i) => (e.value < exprs[best].value ? i : best), 0), options = exprs.map((e) => e.text);
          return mc('Which calculation gives the SMALLEST answer?', options, minIdx, {
            tier: 3, hint: 'Work out each one, or compare the size of the pieces being made.',
            explain: `${options[minIdx]} gives the smallest amount.` });
        },
        (r) => {
          const [name1, name2] = twoNames(r);
          const bases = [[3, 4], [2, 3], [3, 5], [4, 5]];
          const [n1, d1] = pick(r, bases);
          const [n2, d2] = pick(r, bases);
          const pieces = ri(r, 2, 3), v1 = n1 / (d1 * pieces), v2 = n2 / (d2 * pieces);
          if (Math.abs(v1 - v2) < 1e-9) return null;
          const aMore = v1 > v2;
          return mcFrom(r, `${name1} has ${fr(n1, d1)} m of ribbon and cuts it into ${pieces} equal pieces. ${name2} has ${fr(n2, d2)} m of ribbon and also cuts it into ${pieces} equal pieces. Whose PIECES are longer?`, aMore ? name1 : name2, [aMore ? name2 : name1], {
            tier: 3, hint: 'Work out each piece length as a fraction, then compare.',
            explain: `${name1}'s pieces: ${fr(n1, d1 * pieces)} m. ${name2}'s pieces: ${fr(n2, d2 * pieces)} m. ${aMore ? name1 : name2}'s are longer.` });
        },
      ];
      const q = scenario(rng, 'u05-mult-div-frac-t3', stories);
      return q ?? this.gen(rng, tier);
    },
  },

  // ---------------------------------------------------------------- Unit 5b
  {
    id: 'u05-frac-amount', unit: 5, book: '6A', strand: 'fractions', emoji: '🧮',
    title: 'Fractions of amounts', shortTitle: 'Fractions of amounts',
    explanation: {
      segments: [
        {
          text: 'To find a unit fraction of an amount, DIVIDE by the denominator. ' + fr(1, 5) + ' of 40 means share 40 into 5 equal groups: 40 ÷ 5 = 8.',
          alt: 'A unit fraction like one-fifth means "share into that many equal groups". Divide the amount by the bottom number to find one group.',
          svg: barModel(40, [8, 8, 8, 8, 8]),
        },
        {
          text: 'For a non-unit fraction, divide by the denominator FIRST, then multiply by the numerator. ' + fr(3, 8) + ' of 56: 56 ÷ 8 = 7, then 7 × 3 = 21.',
          alt: 'Two steps for a non-unit fraction: find what ONE part is worth by dividing, then multiply by how many parts you need.',
        },
        {
          text: 'Sometimes you know the PART and must find the WHOLE. If ' + fr(2, 5) + ' of a number is 18, first find one-fifth: 18 ÷ 2 = 9. Then the whole number is 9 × 5 = 45. Watch for questions in disguise, too: if ' + fr(2, 3) + ' of a class are girls, the rest — ' + fr(1, 3) + ' — are boys.',
          alt: 'If a fraction of a group has one label, the REST of the group has the opposite label. Subtract the given fraction from 1 to find it.',
        },
      ],
    },
    example: {
      steps: [
        fr(3, 8) + ' of a class of 24 walk to school. How many children is that?',
        'Find one-eighth first: 24 ÷ 8 = 3.',
        'Then multiply by 3: 3 × 3 = 9.',
        'Answer: <b>9 children</b>.',
      ],
    },
    faqs: [
      { q: 'Why divide by the denominator first?', a: 'Dividing by the denominator finds the value of ONE equal part. Once you know one part, multiplying by the numerator gives you as many parts as you need.' },
      { q: 'How do I work backwards from a part to the whole?', a: 'Divide the known amount by the numerator to find what one part is worth, then multiply by the denominator to rebuild the whole amount.' },
      { q: 'What if the numbers do not divide exactly?', a: 'In Year 6 practice the numbers are chosen to divide exactly — but in real life you might need to round, or use a calculator for a decimal answer.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const d = pick(rng, [2, 3, 4, 5, 6, 8]), m = ri(rng, 4, 15);
        const amount = d * m;
        return num(`What is ${fr(1, d)} of ${amount}?`, m, {
          tier, svg: barModel(amount, Array(d).fill(m)),
          hint: `Sharing into ${d} equal parts — divide by ${d}.`, explain: `${amount} ÷ ${d} = ${m}.` });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const d = pick(rng, [3, 4, 5, 6, 7, 8, 9, 10]), n = ri(rng, 2, d - 1);
          const m = ri(rng, 3, 12), amount = d * m;
          return num(`What is ${fr(n, d)} of ${amount}?`, n * m, {
            tier, hint: `First find ${fr(1, d)} of ${amount} (÷${d}), then × ${n}.`,
            explain: `${amount} ÷ ${d} = ${m}; ${m} × ${n} = ${n * m}.` });
        }
        const d = pick(rng, [3, 4, 5, 6, 7, 8]), n = ri(rng, 2, d - 1);
        const m = ri(rng, 3, 12), x = n * m, amount = d * m;
        return num(`${fr(n, d)} of a number is ${x}. What is the number?`, amount, {
          tier, hint: `${fr(1, d)} of the number is ${x} ÷ ${n}. Then × ${d} for the whole.`,
          explain: `${x} ÷ ${n} = ${m} (that is ${fr(1, d)}); ${m} × ${d} = ${amount}.` });
      }
      const stories = [
        (r) => {
          const d = pick(r, [4, 5, 6, 8]), n = ri(r, 2, d - 1);
          const m = ri(r, 2, 10), amount = d * m;
          const name = pick(r, NAMES);
          return num(`${name} has £${amount}. ${name} spends ${fr(n, d)} of it on a game. How much does ${name} spend?`, n * m, {
            tier: 3, hint: `First find £${amount} ÷ ${d}, then × ${n}.`,
            explain: `£${amount} ÷ ${d} = £${m}; £${m} × ${n} = £${n * m}.` });
        },
        (r) => {
          const d = pick(r, [4, 5, 6, 8]), n = ri(r, 2, Math.max(2, Math.floor(d / 2)));
          const m = ri(r, 6, 20), amount = d * m;
          const spent = n * m, extraMax = amount - spent - 5;
          if (extraMax < 5) return null;
          const extra = ri(r, 5, Math.min(40, extraMax));
          return num(`A school raises £${amount} for charity. They spend ${fr(n, d)} of it on decorations and a further £${extra} on food. How much money is LEFT?`, amount - spent - extra, {
            tier: 3, hint: 'Two steps: find the fraction spent, then subtract that AND the extra amount.',
            explain: `£${amount} ÷ ${d} × ${n} = £${spent}; £${amount} − £${spent} − £${extra} = £${amount - spent - extra}.` });
        },
        (r) => {
          const [name1, name2] = twoNames(r);
          const d1 = pick(r, [4, 5, 6]), n1 = ri(r, 2, d1 - 1), m1 = ri(r, 3, 12), d2 = pick(r, [4, 5, 6]), n2 = ri(r, 2, d2 - 1), m2 = ri(r, 3, 12);
          const amt1 = d1 * m1, amt2 = d2 * m2, save1 = n1 * m1, save2 = n2 * m2;
          if (save1 === save2) return null;
          const aMore = save1 > save2;
          return mcFrom(r, `${name1} saves ${fr(n1, d1)} of £${amt1} pocket money. ${name2} saves ${fr(n2, d2)} of £${amt2} pocket money. Who saves MORE money?`, aMore ? name1 : name2, [aMore ? name2 : name1], {
            tier: 3, hint: 'Work out how much each person actually saves in pounds.',
            explain: `${name1} saves £${save1}; ${name2} saves £${save2}. ${aMore ? name1 : name2} saves more.` });
        },
        (r) => {
          const dozens = pick(r, [1, 2]), amount = dozens * 12;
          const factors = amount === 12 ? [2, 3, 4, 6, 12] : [2, 3, 4, 6, 8, 12, 24], d = pick(r, factors);
          const n = ri(r, 2, d - 1), word = dozens === 1 ? 'a dozen' : 'two dozen';
          const name = pick(r, NAMES);
          return num(`${name} buys ${word} eggs. ${fr(n, d)} of them are brown. How many eggs are brown?`, (amount / d) * n, {
            tier: 3, hint: `${word} means ${amount}. Find ${fr(1, d)} of ${amount} first.`,
            explain: `${word} = ${amount}; ${amount} ÷ ${d} = ${amount / d}; × ${n} = ${(amount / d) * n} brown eggs.` });
        },
        (r) => {
          const d = pick(r, [3, 4, 5, 6, 8]), n = ri(r, 2, d - 1);
          const m = ri(r, 3, 12), total = d * m;
          return num(`In a class of ${total} children, ${fr(n, d)} are girls. How many children are BOYS?`, total - n * m, {
            tier: 3, hint: 'Find how many are girls first, then take that away from the whole class.',
            explain: `${total} ÷ ${d} = ${m}; ${m} × ${n} = ${n * m} girls; ${total} − ${n * m} = ${total - n * m} boys.` });
        },
      ];
      const q = scenario(rng, 'u05-frac-amount-t3', stories);
      return q ?? this.gen(rng, tier);
    },
  },
];
