// Book 6B — Term 2. Unit 7: Decimals (phase B9, 2026-11-10).
// Follows the official Power Maths Y6 lesson list
// (quality_reports/reference/y6-yearly-overview.md); the topic split is
// quality_reports/reference/y6-topic-spine.md:
//   u07-dec-place — U7 L1–5: × and ÷ by 10, 100, 1,000 (and their multiples),
//                   decimals as fractions, fractions as decimals
//   u07-dec-ops   — U7 L6–9: multiplying and dividing decimals by whole numbers
//
// DECIMAL ANSWERS ARE EXACT. Every decimal value is built as an integer divided
// by a power of ten — dv(345, 2) = 3.45 — never by float arithmetic on decimals
// (0.1 × 3 is 0.30000000000000004 in JavaScript). An integer over a power of
// ten is correctly rounded, so it is the very number parseNumber reads from
// the pad: the checker's exact comparison holds. Every decimal question goes
// through dnum(), which also offers the "." key on the pad — the pad otherwise
// hides it whenever the answer is a whole number, which gives the answer away
// in a unit where half the answers are whole and half are not.
//
// The helpers are exported for the lesson-precise warm-ups (y6b-lessons-u7.js).

import { num, tf, mcFrom, frac, order, fr, fmt, money, scenario, ri, pick, shuffle } from './gen.js';
import { pvChart, hundredSquare, barModel } from './vis.js';

// ------------------------------------------------------------------ helpers

// The decimal int / 10^places, exactly: dv(345, 2) = 3.45.
export const dv = (int, places) => int / 10 ** places;

// (int / 10^places) × 10^k, exactly, for k from −6 to 6: shift(345, 2, 1) = 34.5.
export function shift(int, places, k) {
  const p = places - k;
  return p >= 0 ? int / 10 ** p : int * 10 ** -p;
}

// How many decimal places a value has (as JavaScript prints it).
export function placesOf(v) {
  return (String(v).split('.')[1] ?? '').length;
}

// A decimal for display: thousands commas on the whole part, the decimal
// digits as they are. dec(1234.5) = '1,234.5', dec(0.07) = '0.07'.
export function dec(v) {
  const [ip, fp] = String(v).split('.');
  return Number(ip).toLocaleString('en-GB') + (fp ? '.' + fp : '');
}

// A decimal with exactly `places` digits after the point, for the place-value
// chart and for money-style answers: fixed(3.5, 2) = '3.50'.
export function fixed(v, places) {
  return v.toFixed(places);
}

// A number question whose pad always offers the decimal point.
export function dnum(prompt, answer, opts = {}) {
  const q = num(prompt, answer, { tolerance: 1e-9, ...opts });
  q.allowDecimal = true;
  return q;
}

export const NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Emma', 'Finn', 'Grace', 'Hugo', 'Isla', 'Jack'];

const POW = { 1: '10', 2: '100', 3: '1,000' };
const cols = (k) => (k === 1 ? 'one column' : k === 2 ? 'two columns' : 'three columns');
// '1 tenth', '3 tenths'.
const many = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Fractions with a terminating decimal, as [n, d] in simplest form; d divides 1,000.
const TERMINATING = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 20], [3, 20], [7, 20],
  [9, 20], [11, 20], [1, 25], [3, 25], [6, 25], [1, 8], [3, 8], [5, 8], [7, 8], [1, 50], [7, 50]];
// The same value in thousandths: 3/8 -> 375.
const thousandths = ([n, d]) => n * (1000 / d);

// A random integer with `digits` digits whose last digit is not 0, so the
// decimal built from it really has all its places.
function tail(rng, digits) {
  const n = ri(rng, 10 ** (digits - 1), 10 ** digits - 1);
  return n % 10 === 0 ? n + ri(rng, 1, 9) : n;
}

// The fraction a decimal names before simplifying: 0.35 -> 35/100.
function rawFraction(v) {
  const p = placesOf(v);
  return [Math.round(v * 10 ** p), 10 ** p];
}

// ------------------------------------------------------------------ topics

export const topics6b = [

  // ---------------------------------------------------------------- Unit 7a
  {
    id: 'u07-dec-place', unit: 7, book: '6B', strand: 'decimals', emoji: '🔟',
    title: 'Decimals: place value and fractions', shortTitle: 'Decimals and fractions',
    explanation: {
      segments: [
        {
          text: 'When you multiply by <b>10</b>, every digit moves one column to the LEFT on the <b>place value chart</b>. The decimal point stays where it is. 3.45 × 10 = 34.5. Multiplying by 100 moves the digits two columns, and by 1,000 three columns: 3.45 × 100 = 345.',
          alt: 'Times 10 makes every digit worth ten times more, so each digit moves one place to the left. 10 has one zero: one column. 100 has two zeros: two columns. 1,000 has three zeros: three columns.',
          svg: pvChart(['3.45', '34.5', '345'], { high: 2, tags: ['', '× 10', '× 100'] }),
        },
        {
          text: 'Dividing by 10, 100 or 1,000 moves the digits to the RIGHT. 45 ÷ 100 = 0.45. When the columns between the point and a digit are empty, a 0 is a <b>place holder</b>: 7 ÷ 100 = 0.07. To divide by a <b>multiple</b> of 10, like 40, divide by 10 and then by 4: 2,400 ÷ 40 = 240 ÷ 4 = 60.',
          alt: 'Divide by 10 and every digit becomes ten times smaller, so it moves one place to the right. 40 is 4 × 10, so dividing by 40 is the same as dividing by 10 and then by 4.',
          svg: pvChart(['45', '4.5', '0.45'], { tags: ['', '÷ 10', '÷ 100'] }),
        },
        {
          text: 'Every decimal is a fraction with 10, 100 or 1,000 at the bottom. One decimal place means <b>tenths</b>: 0.7 = ' + fr(7, 10) + '. Two places mean <b>hundredths</b>: 0.23 = ' + fr(23, 100) + '. Three places mean <b>thousandths</b>: 0.009 = ' + fr(9, 1000) + '. Then <b>simplify</b> if you can: 0.25 = ' + fr(25, 100) + ' = ' + fr(1, 4) + '.',
          alt: 'Read the decimal as a fraction: 0.23 is twenty-three hundredths, so write 23 over 100. The number of decimal places tells you the denominator. Then check whether the fraction simplifies.',
          svg: hundredSquare(23),
        },
        {
          text: 'To change a fraction into a decimal, find an <b>equivalent fraction</b> with 10, 100 or 1,000 at the bottom: ' + fr(3, 5) + ' = ' + fr(6, 10) + ' = 0.6 and ' + fr(7, 20) + ' = ' + fr(35, 100) + ' = 0.35. If that does not work, divide the numerator by the denominator with <b>short division</b>: ' + fr(3, 8) + ' = 3 ÷ 8 = 0.375.',
          alt: 'A fraction is a division: ' + fr(3, 8) + ' means 3 ÷ 8. You can make the denominator 10, 100 or 1,000, or you can just do the division.',
        },
      ],
    },
    example: {
      steps: [
        'Write ' + fr(7, 20) + ' as a decimal.',
        'Find an equivalent fraction with 100 at the bottom: 20 × 5 = 100.',
        'Multiply the numerator by 5 too: 7 × 5 = 35, so ' + fr(7, 20) + ' = ' + fr(35, 100) + '.',
        '35 hundredths = <b>0.35</b>.',
      ],
    },
    faqs: [
      { q: 'Does the decimal point move when I multiply by 10?', a: 'No. The digits move one column to the left and the point stays still. Some people say "the point moves" and get the same answer, but really the digits change their value.' },
      { q: 'Why can I not just add a 0 to multiply by 10?', a: 'That only works for whole numbers. 3.4 with a 0 on the end is 3.40, and that is still 3.4. Move the digits instead: 3.4 × 10 = 34.' },
      { q: 'Which fractions make tenths, hundredths or thousandths?', a: 'Look at the denominator. Halves and fifths can be made into tenths. Quarters, twentieths and twenty-fifths can be made into hundredths. Eighths need thousandths: ' + fr(1, 8) + ' = ' + fr(125, 1000) + ' = 0.125.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const shape = ri(rng, 1, 4);
        if (shape === 1) {
          const places = ri(rng, 1, 2), int = tail(rng, 2), k = ri(rng, 1, 2);
          const v = dv(int, places), ans = shift(int, places, k);
          return dnum(`Work out ${dec(v)} × ${POW[k]}`, ans, {
            tier, svg: pvChart([dec(v)], { high: 2 }),
            hint: `× ${POW[k]}: every digit moves ${cols(k)} to the left.`,
            explain: `The digits move ${cols(k)} to the left: ${dec(v)} × ${POW[k]} = ${dec(ans)}.` });
        }
        if (shape === 2) {
          const n = tail(rng, ri(rng, 1, 2)), k = ri(rng, 1, 2), ans = dv(n, k);
          return dnum(`Work out ${n} ÷ ${POW[k]}`, ans, {
            tier, hint: `÷ ${POW[k]}: every digit moves ${cols(k)} to the right.`,
            explain: `The digits move ${cols(k)} to the right: ${n} ÷ ${POW[k]} = ${dec(ans)}.${ans < 0.1 ? ' The 0 in the tenths column is a place holder.' : ''}` });
        }
        if (shape === 3) {
          const n = tail(rng, 2), ans = dv(n, 2);
          return dnum('The whole square is 1. What decimal is shaded?', ans, {
            tier, svg: hundredSquare(n),
            hint: 'A full column is one tenth (0.1). One small square is one hundredth (0.01).',
            explain: `${many(Math.floor(n / 10), 'full column')} and ${many(n % 10, 'more square')}: ${n} hundredths = ${dec(ans)}.` });
        }
        const tenths = rng() < 0.5, n = tenths ? ri(rng, 1, 9) : tail(rng, 2), d = tenths ? 10 : 100;
        const v = dv(n, tenths ? 1 : 2);
        if (rng() < 0.5) {
          return frac(`Write ${dec(v)} as a fraction.`, n, d, {
            tier, hint: 'Count the decimal places: one place means tenths, two places mean hundredths.',
            explain: `${tenths ? 'One decimal place: tenths' : 'Two decimal places: hundredths'}. ${dec(v)} = ${fr(n, d)}.` });
        }
        return dnum(`Write ${fr(n, d)} as a decimal.`, v, {
          tier, hint: tenths ? 'Tenths go in the first column after the point.' : 'Hundredths need two decimal places.',
          explain: `${fr(n, d)} is ${n} ${tenths ? 'tenths' : 'hundredths'}: ${dec(v)}.` });
      }

      if (tier === 2) {
        const shape = ri(rng, 1, 4);
        if (shape === 1) {
          // Missing multiplier: how many columns did the digits move?
          const places = ri(rng, 1, 3), int = tail(rng, places === 1 ? 2 : 3), k = ri(rng, 1, 3);
          const v = dv(int, places), prod = shift(int, places, k);
          return mcFrom(rng, `${dec(v)} × □ = ${dec(prod)}. What is the missing number?`, POW[k],
            ['10', '100', '1,000', '10,000'], {
              tier, hint: 'Find one digit in both numbers. How many columns did it move to the left?',
              explain: `The digits moved ${cols(k)} to the left, so the missing number is ${POW[k]}.` });
        }
        if (shape === 2) {
          const places = ri(rng, 2, 3), int = tail(rng, 3), k = ri(rng, 2, 3);
          const v = dv(int, places), ans = shift(int, places, k);
          return dnum(`Work out ${dec(v)} × ${POW[k]}`, ans, {
            tier, hint: `× ${POW[k]}: every digit moves ${cols(k)} to the left. Do not just add zeros.`,
            explain: `The digits move ${cols(k)} to the left: ${dec(v)} × ${POW[k]} = ${dec(ans)}.` });
        }
        if (shape === 3) {
          // ÷ a multiple of 10 or 100: split it into ÷ d and ÷ 10 or 100.
          const d = ri(rng, 2, 9), k = ri(rng, 1, 2), p = ri(rng, 0, 2), q = ri(rng, 2, 30);
          const m = d * 10 ** k, dividend = shift(q * d, p, k), ans = dv(q, p);
          return dnum(`Work out ${dec(dividend)} ÷ ${fmt(m)}`, ans, {
            tier, hint: `${fmt(m)} = ${d} × ${POW[k]}. Divide by ${d}, then by ${POW[k]}.`,
            explain: `${dec(dividend)} ÷ ${d} = ${dec(shift(q, p, k))}. Then ${dec(shift(q, p, k))} ÷ ${POW[k]} = ${dec(ans)}.` });
        }
        if (rng() < 0.5) {
          const [n, d] = pick(rng, TERMINATING), v = dv(thousandths([n, d]), 3), [rn, rd] = rawFraction(v);
          return frac(`Write ${dec(v)} as a fraction in its simplest form.`, n, d, {
            exact: true, tier, hint: 'Write it over 10, 100 or 1,000 first. Then simplify.',
            explain: `${dec(v)} = ${fr(rn, rd)}. Simplify: ${fr(rn, rd)} = ${fr(n, d)}.` });
        }
        const [n, d] = pick(rng, TERMINATING.filter(([, dd]) => 100 % dd === 0));
        const to10 = 10 % d === 0, base = to10 ? 10 : 100, v = dv(n * (base / d), to10 ? 1 : 2);
        return dnum(`Write ${fr(n, d)} as a decimal.`, v, {
          tier, hint: 'Find an equivalent fraction with 10 or 100 as the denominator.',
          explain: `${d} × ${base / d} = ${base}, so ${fr(n, d)} = ${fr(n * (base / d), base)} = ${dec(v)}.` });
      }

      const stories = [
        (r) => {
          const k = ri(r, 1, 2), count = 10 ** k, total = tail(r, 2), name = pick(r, NAMES);
          const ans = dv(total, k), [item, items] = k === 1 ? ['book', 'books'] : ['sticker', 'stickers'];
          return dnum(`${name} buys ${fmt(count)} ${items} for £${total}. Each ${item} costs the same. How much is one ${item}?`, ans, {
            tier: 3, unit: 'pounds', hint: `Divide £${total} by ${fmt(count)}: the digits move ${cols(k)} to the right.`,
            explain: `${total} ÷ ${fmt(count)} = ${dec(ans)}, so one ${item} costs ${money(ans)}.` });
        },
        (r) => {
          // Two fractions and two decimals, all different values.
          const fracs = shuffle(r, TERMINATING).slice(0, 2);
          const used = new Set(fracs.map(thousandths));
          const decs = [];
          while (decs.length < 2) {
            const t = ri(r, 21, 89) * 10 + (r() < 0.5 ? 0 : 5);
            if (!used.has(t)) { used.add(t); decs.push(t); }
          }
          const items = [...fracs.map((f) => [fr(...f), thousandths(f)]), ...decs.map((t) => [dec(dv(t, 3)), t])];
          const sorted = items.slice().sort((a, b) => a[1] - b[1]);
          return order('Put these numbers in order, <b>smallest first</b>.', r, sorted.map((x) => x[0]), {
            tier: 3, hint: 'Change the fractions into decimals first. Then compare the tenths, then the hundredths.',
            explain: `As decimals: ${sorted.map((x) => `${x[0]} = ${dec(dv(x[1], 3))}`).join(', ')}.` });
        },
        (r) => {
          const name = pick(r, NAMES), places = ri(r, 1, 2), n = places === 1 ? ri(r, 1, 9) : tail(r, 2);
          const truth = r() < 0.5, d = 10 ** places, shown = truth ? d : (places === 1 ? 100 : 10);
          return tf(`${name} says ${dec(dv(n, places))} = ${fr(n, shown)}. Is ${name} right?`, truth, {
            tier: 3, hint: 'One decimal place means tenths. Two decimal places mean hundredths.',
            explain: `${dec(dv(n, places))} has ${places === 1 ? 'one decimal place, so it is tenths' : 'two decimal places, so it is hundredths'}: ${fr(n, d)}.${truth ? '' : ` ${fr(n, shown)} is ${dec(n / shown)}.`}` });
        },
        (r) => {
          const places = ri(r, 1, 2), int = tail(r, 2), k = ri(r, 1, 3);
          const small = dv(int, places + 1), big = shift(int, places + 1, k);
          return dnum(`□ ÷ ${POW[k]} = ${dec(small)}. What is the missing number?`, big, {
            tier: 3, hint: `Undo the division: multiply ${dec(small)} by ${POW[k]}.`,
            explain: `${dec(small)} × ${POW[k]} = ${dec(big)}, and ${dec(big)} ÷ ${POW[k]} = ${dec(small)}.` });
        },
        (r) => {
          const d = ri(r, 2, 6), q = ri(r, 2, 19), pieces = d * 10, len = shift(q * d, 2, 1), ans = dv(q, 2);
          return dnum(`A ribbon is ${dec(len)} m long. It is cut into ${pieces} equal pieces. How long is each piece, in metres?`, ans, {
            tier: 3, unit: 'm', hint: `${pieces} = ${d} × 10. Divide by ${d}, then by 10.`,
            explain: `${dec(len)} ÷ ${d} = ${dec(shift(q, 2, 1))}. Then ÷ 10 = ${dec(ans)} m.` });
        },
      ];
      return scenario(rng, 'u07-dec-place-t3', stories);
    },
  },

  // ---------------------------------------------------------------- Unit 7b
  {
    id: 'u07-dec-ops', unit: 7, book: '6B', strand: 'decimals', emoji: '💰',
    title: 'Multiplying and dividing decimals', shortTitle: 'Decimals × and ÷',
    explanation: {
      segments: [
        {
          text: 'To multiply a decimal by a whole number, use a <b>known fact</b>. 3 × 4 = 12, so 0.3 × 4 = 12 tenths = 1.2. And 0.03 × 4 = 12 hundredths = 0.12.',
          alt: 'Do the times-table fact first. Then think about what you are counting: 12 tenths is 1 whole and 2 tenths, so it is 1.2.',
          svg: barModel(1.2, [3, 3, 3, 3], { partLabels: ['0.3', '0.3', '0.3', '0.3'], wholeLabel: '1.2' }),
        },
        {
          text: 'For bigger numbers use the <b>column method</b>. Line up the digits and multiply each column, starting on the right. When a column makes 10 or more, <b>exchange</b>. 3.46 × 4 = 13.84. The answer has the same number of decimal places as 3.46.',
          alt: 'The column method works just like with whole numbers. Keep the decimal points in a line. Check with an estimate: 3.46 × 4 is about 3 × 4 = 12, so 13.84 makes sense.',
        },
        {
          text: 'To divide a decimal by a whole number, share each column. 6.3 ÷ 3: 6 ones ÷ 3 = 2 ones and 3 tenths ÷ 3 = 1 tenth, so 6.3 ÷ 3 = 2.1. A known fact helps too: 63 ÷ 3 = 21, so 6.3 ÷ 3 = 2.1.',
          alt: 'Share out the ones, then the tenths, then the hundredths. Or divide without the point and put the digits back in the same columns.',
        },
        {
          text: 'With <b>short division</b>, exchange what is left over into the next column. 7.2 ÷ 4: 7 ones ÷ 4 = 1, remainder 3. Exchange the 3 ones for 30 tenths: 32 tenths ÷ 4 = 8 tenths. So 7.2 ÷ 4 = 1.8. If something is left at the end, write a 0 in the next column and keep going: 3.4 ÷ 4 = 0.85.',
          alt: 'A remainder is not the end. Change it into the next smaller column — ones into tenths, tenths into hundredths — and divide again.',
        },
      ],
    },
    example: {
      steps: [
        'Work out 5.16 ÷ 3.',
        '5 ones ÷ 3 = 1, remainder 2. Exchange the 2 ones for 20 tenths: 20 + 1 = 21 tenths.',
        '21 tenths ÷ 3 = 7 tenths. Then 6 hundredths ÷ 3 = 2 hundredths.',
        'So 5.16 ÷ 3 = <b>1.72</b>.',
      ],
    },
    faqs: [
      { q: 'Where does the decimal point go in my answer?', a: 'In the column method, keep the points in a line. Then check with an estimate: 3.46 × 4 is about 3 × 4 = 12, so 13.84 makes sense and 138.4 does not.' },
      { q: 'What do I do with a remainder?', a: 'Exchange it into the next column to the right — ones into tenths, tenths into hundredths — and keep dividing. You may need to write a 0 after the last digit first.' },
      { q: 'Why is 0.3 × 4 not 0.12?', a: '0.3 is 3 tenths. 3 tenths × 4 = 12 tenths, and 12 tenths is 1.2. 0.12 is 12 hundredths, which is ten times too small.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const shape = ri(rng, 1, 3);
        if (shape === 1) {
          const a = ri(rng, 2, 9), b = ri(rng, 2, 9), ans = dv(a * b, 1);
          return dnum(`Work out 0.${a} × ${b}`, ans, {
            tier, hint: `Use the fact ${a} × ${b}. Then count tenths.`,
            explain: `${a} × ${b} = ${a * b}, so ${a} tenths × ${b} = ${a * b} tenths = ${dec(ans)}.` });
        }
        if (shape === 2) {
          const a = ri(rng, 1, 9), b = ri(rng, 2, 9), ans = dv(a * b, 2);
          return dnum(`Work out ${dec(dv(a, 2))} × ${b}`, ans, {
            tier, hint: `Use the fact ${a} × ${b}. Then count hundredths.`,
            explain: `${a} × ${b} = ${a * b}, so ${many(a, 'hundredth')} × ${b} = ${many(a * b, 'hundredth')} = ${dec(ans)}.` });
        }
        // Share each column, no exchange: 6.3 ÷ 3.
        const b = ri(rng, 2, 4), o = ri(rng, 1, Math.floor(9 / b)), t = ri(rng, 1, Math.floor(9 / b));
        const dividend = dv(o * b * 10 + t * b, 1), ans = dv(o * 10 + t, 1);
        return dnum(`Work out ${dec(dividend)} ÷ ${b}`, ans, {
          tier, hint: `Share the ones by ${b}, then the tenths by ${b}.`,
          explain: `${many(o * b, 'one')} ÷ ${b} = ${many(o, 'one')} and ${many(t * b, 'tenth')} ÷ ${b} = ${many(t, 'tenth')}. So the answer is ${dec(ans)}.` });
      }

      if (tier === 2) {
        const shape = ri(rng, 1, 4);
        if (shape === 1) {
          // Column method with exchanges: a 2-dp number × a one-digit number.
          const x = tail(rng, 3), b = ri(rng, 3, 9), ans = dv(x * b, 2);
          return dnum(`Work out ${dec(dv(x, 2))} × ${b}`, ans, {
            tier, hint: 'Use the column method. Start with the hundredths and exchange when a column makes 10 or more.',
            explain: `${x} × ${b} = ${fmt(x * b)}, and the answer keeps two decimal places: ${dec(dv(x, 2))} × ${b} = ${dec(ans)}.` });
        }
        if (shape === 2) {
          // Short division with an exchange: 5.16 ÷ 3 = 1.72.
          const b = ri(rng, 3, 9), q = ri(rng, 101, 399), ans = dv(q, 2), dividend = dv(q * b, 2);
          return dnum(`Work out ${dec(dividend)} ÷ ${b}`, ans, {
            tier, hint: 'Use short division. Exchange a remainder into the next column.',
            explain: `${fixed(dividend, 2)} is ${fmt(q * b)} hundredths. ${fmt(q * b)} ÷ ${b} = ${q}, so the answer is ${q} hundredths = ${dec(ans)}.` });
        }
        if (shape === 3) {
          // A 0 on the end keeps the division going: 3.4 ÷ 4 = 0.85.
          const b = pick(rng, [2, 4, 5, 6, 8]);
          let A = ri(rng, 11, 199);
          while ((A * b) % 10 !== 0 || A % 10 === 0) A += 1;
          const dividend = dv((A * b) / 10, 1), ans = dv(A, 2);
          return dnum(`Work out ${dec(dividend)} ÷ ${b}`, ans, {
            tier, hint: 'When there is a remainder in the tenths, write a 0 in the hundredths and keep dividing.',
            explain: `Write ${dec(dividend)} as ${fixed(dividend, 2)}. ${A * b} hundredths ÷ ${b} = ${A} hundredths, so the answer is ${dec(ans)}.` });
        }
        // Where does the point go? Misconceptions: point lost, too many places,
        // ones and tenths multiplied separately.
        const o = ri(rng, 1, 9), t = ri(rng, 1, 9), b = ri(rng, 3, 9), x = o * 10 + t;
        const right = dv(x * b, 1);
        const apart = `${o * b}.${t * b}`;
        return mcFrom(rng, `Which is the answer to ${o}.${t} × ${b}?`, dec(right), [fmt(x * b), dec(dv(x * b, 2)), apart, dec(dv(x * b + 10, 1))], {
          tier, hint: `Estimate first: ${o}.${t} × ${b} is about ${o} × ${b} = ${o * b}.`,
          explain: `${x} × ${b} = ${x * b}, so ${o}.${t} × ${b} = ${dec(right)}. That is close to the estimate ${o * b}.` });
      }

      const stories = [
        (r) => {
          const name = pick(r, NAMES), p = ri(r, 115, 495), n = ri(r, 3, 6), ans = dv(p * n, 2);
          return dnum(`A notebook costs ${money(dv(p, 2))}. ${name} buys ${n} notebooks. How much does ${name} pay?`, ans, {
            tier: 3, unit: 'pounds', hint: `Work out ${money(dv(p, 2))} × ${n}. You can think in pence: ${p}p × ${n}.`,
            explain: `${p}p × ${n} = ${p * n}p = ${money(ans)}.` });
        },
        (r) => {
          const name = pick(r, NAMES), n = ri(r, 3, 5), each = ri(r, 105, 299), ans = dv(each, 2);
          return dnum(`${name} shares ${money(dv(each * n, 2))} equally between ${n} friends. How much does each friend get?`, ans, {
            tier: 3, unit: 'pounds', hint: `Divide ${money(dv(each * n, 2))} by ${n} with short division.`,
            explain: `${each * n}p ÷ ${n} = ${each}p, so each friend gets ${money(ans)}.` });
        },
        (r) => {
          const ml = pick(r, [125, 175, 225, 250, 375, 450]), n = ri(r, 3, 8), ans = dv(ml * n, 2);
          return dnum(`A bottle holds ${dec(dv(ml, 2))} litres of juice. How many litres do ${n} bottles hold?`, ans, {
            tier: 3, unit: 'litres', hint: `Work out ${dec(dv(ml, 2))} × ${n}.`,
            explain: `${ml} × ${n} = ${fmt(ml * n)}, so ${dec(dv(ml, 2))} × ${n} = ${dec(ans)} litres.` });
        },
        (r) => {
          const name = pick(r, NAMES), x = tail(r, 3), b = ri(r, 3, 9), truth = r() < 0.5;
          const right = dv(x * b, 2), shown = truth ? right : dv(x * b, 1);
          return tf(`${name} says ${dec(dv(x, 2))} × ${b} = ${dec(shown)}. Is ${name} right?`, truth, {
            tier: 3, hint: `Estimate: ${dec(dv(x, 2))} is about ${Math.round(x / 100)}, so the answer is about ${Math.round(x / 100) * b}.`,
            explain: `${dec(dv(x, 2))} × ${b} = ${dec(right)}.${truth ? '' : ` ${dec(shown)} is ten times too big.`}` });
        },
        (r) => {
          const pieces = ri(r, 3, 6), each = ri(r, 12, 95), len = dv(each * pieces, 2), ans = dv(each, 2);
          return dnum(`A plank is ${dec(len)} m long. It is cut into ${pieces} equal pieces. How long is each piece, in metres?`, ans, {
            tier: 3, unit: 'm', hint: `Work out ${dec(len)} ÷ ${pieces} with short division.`,
            explain: `${dec(len)} m is ${each * pieces} hundredths of a metre. ${each * pieces} ÷ ${pieces} = ${each}, so each piece is ${dec(ans)} m.` });
        },
      ];
      return scenario(rng, 'u07-dec-ops-t3', stories);
    },
  },
];
