// Copied from powermath-trainer @ aa8bd0b (content/c5a.js) on 2026-09-07 — Year 5
// REVIEW material for the Year 6 hub (phase B4). Not on the map, never a 'new'
// topic: these are what the review block draws from. Only the engine import
// path differs (content lives one level deeper here).
// Book 5A — Term 1: place value, addition & subtraction, statistics,
// multiplication & division (1), area & perimeter.
// Topic structure and vocabulary follow the official Power Maths Y5 lesson list.

import { num, mc, mcFrom, tf, order, nearMisses, fmt, ri, pick, shuffle, distinctInts, scenario, unambiguousDigitPositions } from './gen.js';
import { pvGrid, numberLine, barModel, partWhole, rectGrid, lShape, barChart, lineGraph, dataTable } from './vis.js';

const NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Emma', 'Finn', 'Grace', 'Hugo', 'Isla', 'Jack'];

function toRoman(n) {
  const table = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of table) while (n >= v) { out += s; n -= v; }
  return out;
}

// Build an integer with `digits` digits, never starting with 0.
function makeNum(rng, digits) {
  let s = String(ri(rng, 1, 9));
  for (let i = 1; i < digits; i++) s += String(ri(rng, 0, 9));
  return Number(s);
}

export const topics5a = [

  // ---------------------------------------------------------------- Unit 1
  {
    id: 'u01-pv100k', unit: 1, book: '5A', strand: 'place', emoji: '🔢',
    title: 'Place value to 100,000', shortTitle: 'Place value to 100,000',
    explanation: {
      segments: [
        {
          text: 'Big numbers are built from columns: ones, tens, hundreds, thousands and ten-thousands. The number 34,652 means 3 ten-thousands, 4 thousands, 6 hundreds, 5 tens and 2 ones.',
          alt: 'Think of a number like a tower of blocks. Each column of 34,652 tells you how many blocks of that size you have: 3 blocks of ten thousand, 4 blocks of a thousand, 6 hundreds, 5 tens and 2 ones.',
          svg: pvGrid(34652),
        },
        {
          text: 'The <b>value</b> of a digit depends on its column. In 34,652 the digit 4 is in the thousands column, so its value is 4,000 — not just 4.',
          alt: 'Same digit, different job! A 4 in the thousands column is worth 4,000. A 4 in the tens column would only be worth 40. The column tells you how much the digit is really worth.',
        },
        {
          text: 'To compare numbers, start from the left. 62,300 and 59,900: six ten-thousands beats five ten-thousands, so 62,300 is greater — even though 9 looks bigger than 2!',
          alt: 'Comparing numbers is like a race that starts on the left. The first column where the digits are different decides the winner. 62,300 wins against 59,900 because 6 beats 5 in the ten-thousands.',
        },
        {
          text: 'Rounding finds the nearest "neat" number. To round 47,362 to the nearest 1,000, look at the hundreds digit: it is 3, which is less than 5, so we round DOWN to 47,000.',
          alt: 'Rounding asks: which neat number am I closest to? 47,362 sits between 47,000 and 48,000. The hundreds digit (3) is small, so 47,362 is closer to 47,000.',
          svg: numberLine(47000, 48000, [{ v: 47362, label: '47,362' }], { step: 250 }),
        },
        {
          text: 'The Romans wrote numbers with letters: I=1, V=5, X=10, L=50, C=100, D=500, M=1,000. A smaller letter before a bigger one means subtract: IV is 4, XC is 90.',
          alt: 'Roman numerals are a letter code. Add the letters up — but if a small letter comes before a bigger one, take it away instead. So XV is 10+5=15, but XL is 50−10=40.',
        },
      ],
    },
    example: {
      steps: [
        'Round 68,514 to the nearest 1,000.',
        'Find the two neighbours: 68,000 and 69,000.',
        'Look at the hundreds digit: it is 5.',
        '5 or more means round UP → 68,514 rounds to <b>69,000</b>.',
      ],
    },
    faqs: [
      { q: 'Why is there a comma in big numbers?', a: 'The comma groups the digits in threes so they are easier to read. 34,652 is exactly the same number as 34652 — the comma is just a helpful spacer between the thousands and the hundreds.' },
      { q: 'What if the digit is 5 — round up or down?', a: 'A 5 always rounds up. So 4,500 to the nearest thousand is 5,000. That is simply the rule everyone agrees on, so we all get the same answer.' },
      { q: 'What does the 0 in 40,352 do?', a: 'The 0 is a place holder. It keeps the other digits in their correct columns. Without it, 40,352 would collapse into 4,352 — a totally different number!' },
      { q: 'Why do Roman numerals still matter?', a: 'You still see them on clocks, in film credits and for years — like MMXXVI for 2026. Knowing the code lets you read them anywhere.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const n = makeNum(rng, 5);
          // Same fault the Y6 lesson had (fixed there 2026-08-25): "the digit 5
          // in 55,391" has two answers. Only a digit that occurs once may be
          // named by its face value; the helper also skips zeros.
          const spots = unambiguousDigitPositions(String(n));
          if (!spots.length) return this.gen(rng, tier);
          const pos = pick(rng, spots);
          const digit = Number(String(n)[pos]);
          const value = digit * 10 ** (4 - pos);
          return num(`What is the <b>value</b> of the digit ${digit} in ${fmt(n)}?`, value, {
            tier, svg: pvGrid(n),
            hint: 'Which column is that digit standing in?',
            explain: `The ${digit} is in the ${['ten-thousands', 'thousands', 'hundreds', 'tens', 'ones'][pos]} column, so it is worth ${fmt(value)}.`,
          });
        }
        const tth = ri(rng, 1, 9) * 10000, th = ri(rng, 1, 9) * 1000, hu = ri(rng, 1, 9) * 100, te = ri(rng, 1, 9) * 10, on = ri(rng, 1, 9);
        return num(`What number is ${fmt(tth)} + ${fmt(th)} + ${hu} + ${te} + ${on}?`, tth + th + hu + te + on, {
          tier, hint: 'Drop each part into its own column.',
          explain: 'Each part fills one column: put the digits together column by column.',
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const a = makeNum(rng, 5);
          let b = a;
          while (b === a) b = makeNum(rng, 5);
          const bigger = rng() < 0.5;
          const stmt = `${fmt(a)} ${bigger ? '&gt;' : '&lt;'} ${fmt(b)}`;
          return tf(`True or false: ${stmt}`, bigger ? a > b : a < b, {
            tier, hint: 'Compare from the left, column by column.',
            explain: `Compare the ten-thousands first, then thousands, and so on. ${fmt(Math.max(a, b))} is the bigger number.`,
          });
        }
        if (kind === 2) {
          const base = ri(rng, 10, 89) * 1000;
          const markVal = base + ri(rng, 1, 19) * 50;
          return num('What number is the red dot showing?', markVal, {
            tier, svg: numberLine(base, base + 1000, [markVal], { step: 250 }),
            hint: 'Work out what each small jump on the line is worth.',
            explain: `The line goes from ${fmt(base)} to ${fmt(base + 1000)}, so each labelled step is 250.`,
          });
        }
        const n = makeNum(rng, 5);
        const r = pick(rng, [10, 100, 1000]);
        return num(`Round ${fmt(n)} to the nearest ${fmt(r)}.`, Math.round(n / r) * r, {
          tier, hint: `Find the two nearest multiples of ${fmt(r)} — which is closer?`,
          explain: `Look at the digit to the right of the ${fmt(r)}s place: 5 or more rounds up, less than 5 rounds down.`,
        });
      }
      const kind = ri(rng, 1, 3);
      if (kind === 1) {
        const lead = ri(rng, 2, 8);
        const nums = distinctInts(rng, 4, lead * 10000, lead * 10000 + 9999).map(fmt);
        const sorted = nums.slice().sort((a, b) => Number(a.replace(/,/g, '')) - Number(b.replace(/,/g, '')));
        return order('Put these numbers in order, <b>smallest first</b>.', rng, sorted, {
          tier, hint: 'They all start the same — compare the next column along.',
          explain: 'When the front digits match, the next column decides the order.',
        });
      }
      if (kind === 2) {
        const n = pick(rng, [9, 14, 19, 24, 40, 44, 49, 90, 94, 99, 400, 444, 900, 1000, 1250, 1500, 2026]);
        return mcFrom(rng, `Which number does <b>${toRoman(n)}</b> show?`, n, nearMisses(rng, n), {
          tier, hint: 'A smaller letter before a bigger one means subtract.',
          explain: `${toRoman(n)} = ${fmt(n)}. Remember IV=4, IX=9, XL=40, XC=90, CD=400, CM=900.`,
        });
      }
      const n = makeNum(rng, 5);
      const step = pick(rng, [10, 100, 1000, 10000]);
      const more = rng() < 0.5;
      const ans = more ? n + step : n - step;
      if (ans < 0 || ans > 99999) return this.gen(rng, tier);
      return num(`What is ${fmt(step)} ${more ? 'more' : 'less'} than ${fmt(n)}?`, ans, {
        tier, hint: `Only one column changes — unless a digit crosses a 9 or a 0!`,
        explain: `Add or take away ${fmt(step)}: ${fmt(n)} → ${fmt(ans)}.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 2a
  {
    id: 'u02-pv1m', unit: 2, book: '5A', strand: 'place', emoji: '🚀',
    title: 'Place value to 1,000,000', shortTitle: 'Place value to 1,000,000',
    explanation: {
      segments: [
        {
          text: 'Now we go bigger! A new column joins on the left: hundred-thousands. The number 372,485 has 3 hundred-thousands — that is 300,000.',
          alt: 'Numbers up to a million use six columns. Reading 372,485: three hundred and seventy-two thousand, four hundred and eighty-five. The first three digits count the thousands.',
          svg: pvGrid(372485),
        },
        {
          text: 'A helpful trick: read the digits in front of the comma as their own number, then say "thousand". 372,485 → "372 thousand, 485".',
          alt: 'Split the number at the comma. Say the left part, add the word thousand, then say the right part. That is exactly how we read big numbers out loud.',
        },
        {
          text: 'Comparing and rounding work just like before — only the columns are bigger. To round 649,500 to the nearest 100,000, look at the ten-thousands digit: 4, so round DOWN to 600,000.',
          alt: 'Nothing new to learn — just bigger columns! For rounding to the nearest 100,000, the ten-thousands digit is the decider: 5 or more rounds up, 4 or less rounds down.',
        },
        {
          text: 'Counting in steps of 10,000 or 100,000 only changes one column at a time: 350,000 → 360,000 → 370,000. Watch what happens crossing a boundary: 390,000 → 400,000!',
          alt: 'Counting in big steps is like counting 35, 36, 37 — just with extra zeros. The tricky moment is crossing over: after 390,000 comes 400,000, because 39 + 1 = 40.',
          svg: numberLine(300000, 500000, [{ v: 400000, label: '400,000' }], { step: 50000 }),
        },
      ],
    },
    example: {
      steps: [
        'Compare 435,900 and 439,500.',
        'Hundred-thousands: both 4. Ten-thousands: both 3. Keep going!',
        'Thousands: 5 against 9 — and 9 is bigger.',
        'So <b>439,500 is greater</b> than 435,900.',
      ],
    },
    faqs: [
      { q: 'How do I read 400,035 out loud?', a: 'Split at the comma: "four hundred thousand" then "and thirty-five". The zeros keep the columns safe — there are no thousands besides the 400 thousand, and no hundreds at all.' },
      { q: 'What comes after 999,999?', a: 'One million — 1,000,000! All six columns are full of 9s, so adding just 1 more tips every column over, like a row of dominoes.' },
      { q: 'Is a million a lot?', a: 'A million seconds is about 11 and a half days. A million steps would take you roughly 800 kilometres. So yes — quite a lot!' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const n = makeNum(rng, 6);
          // Only the three leading columns are asked, and only a digit that
          // occurs once in the whole number may be named (see u01 above).
          const spots = unambiguousDigitPositions(String(n), [0, 1, 2]);
          if (!spots.length) return this.gen(rng, tier);
          const pos = pick(rng, spots);
          const digit = Number(String(n)[pos]);
          const value = digit * 10 ** (5 - pos);
          return num(`What is the <b>value</b> of the digit ${digit} in ${fmt(n)}?`, value, {
            tier, svg: pvGrid(n),
            hint: 'Count the columns from the right: ones, tens, hundreds…',
            explain: `That ${digit} sits in the ${['hundred-thousands', 'ten-thousands', 'thousands'][pos]} column, so it is worth ${fmt(value)}.`,
          });
        }
        const hth = ri(rng, 1, 9) * 100000, tth = ri(rng, 1, 9) * 10000, th = ri(rng, 1, 9) * 1000, hu = ri(rng, 1, 9) * 100;
        return num(`What number is ${fmt(hth)} + ${fmt(tth)} + ${fmt(th)} + ${hu}?`, hth + tth + th + hu, {
          tier, hint: 'Fill each column, and use 0 for any empty column.',
          explain: 'Slot every part into its own column — the tens and ones stay 0.',
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const n = makeNum(rng, 6);
          const r = pick(rng, [1000, 10000, 100000]);
          return num(`Round ${fmt(n)} to the nearest ${fmt(r)}.`, Math.round(n / r) * r, {
            tier, hint: 'Find the digit one column to the right of where you are rounding.',
            explain: 'That digit decides: 5 or more rounds up, less than 5 rounds down.',
          });
        }
        if (kind === 2) {
          const a = makeNum(rng, 6);
          let b = a;
          while (b === a) b = makeNum(rng, 6);
          return mc(`Which number is <b>greater</b>?`, [fmt(a), fmt(b)], a > b ? 0 : 1, {
            tier, hint: 'Compare column by column from the left.',
            explain: `${fmt(Math.max(a, b))} wins at the first column where the digits differ.`,
          });
        }
        const base = ri(rng, 1, 8) * 100000;
        const markVal = base + ri(rng, 1, 19) * 5000;
        return num('What number is the red dot showing?', markVal, {
          tier, svg: numberLine(base, base + 100000, [markVal], { step: 25000 }),
          hint: 'The whole line covers 100,000 — how much is each step?',
          explain: `Each labelled step is 25,000, and the small positions between are worth 5,000.`,
        });
      }
      const kind = ri(rng, 1, 2);
      if (kind === 1) {
        const lead = ri(rng, 2, 7);
        const nums = distinctInts(rng, 4, lead * 100000, lead * 100000 + 99999).map(fmt);
        const sorted = nums.slice().sort((a, b) => Number(a.replace(/,/g, '')) - Number(b.replace(/,/g, '')));
        return order('Order these numbers, <b>smallest first</b>.', rng, sorted, {
          tier, hint: 'The front digits match — look further along.',
          explain: 'When leading digits tie, the next column along decides.',
        });
      }
      const n = makeNum(rng, 6);
      const step = pick(rng, [10000, 100000]);
      const more = rng() < 0.5;
      const ans = more ? n + step : n - step;
      if (ans < 0 || ans > 999999) return this.gen(rng, tier);
      return num(`What is ${fmt(step)} ${more ? 'more' : 'less'} than ${fmt(n)}?`, ans, {
        tier, hint: 'Only one column should change — unless it crosses a boundary.',
        explain: `${fmt(n)} → ${fmt(ans)}. Watch the column that crossed over.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 2b
  {
    id: 'u02-negatives', unit: 2, book: '5A', strand: 'place', emoji: '🥶',
    title: 'Negative numbers and sequences', shortTitle: 'Negative numbers',
    explanation: {
      segments: [
        {
          text: 'Numbers do not stop at zero! Below zero live the <b>negative numbers</b>: −1, −2, −3… You meet them on cold thermometers and in lifts going to basement floors.',
          alt: 'Imagine a thermometer. Above zero it is plus degrees, below zero it is minus degrees. Minus 5 is colder than minus 2, because it is further below zero.',
          svg: numberLine(-10, 10, [{ v: -5, label: '−5' }, { v: 3, label: '3' }], { step: 5 }),
        },
        {
          text: 'On a number line, negative numbers sit to the LEFT of zero. The further left, the smaller the number: −8 is smaller than −3.',
          alt: 'Careful — this feels upside down! With negatives, a bigger-looking digit means a smaller number. −8 is less than −3 because −8 is deeper below zero.',
        },
        {
          text: 'To count through zero, just keep stepping. From −3, four steps up: −2, −1, 0, 1. The temperature rose from −3°C to 1°C.',
          alt: 'Crossing zero is like climbing stairs past the ground floor. Count each step one at a time and zero is just one of the steps on the way.',
        },
        {
          text: 'A <b>sequence</b> is a number pattern with a rule. In 2, 5, 8, 11… the rule is "+3". Rules can go down too, even past zero: 6, 4, 2, 0, −2…',
          alt: 'To find a pattern rule, ask: what is the jump between neighbours? Check the jump is the same each time — then you can carry the pattern on as far as you like.',
        },
      ],
    },
    example: {
      steps: [
        'The temperature is −4°C. It rises by 9°C. What is it now?',
        'Start at −4 on the number line.',
        'It takes 4 steps to climb to 0.',
        'That leaves 9 − 4 = 5 more steps: the answer is <b>5°C</b>.',
      ],
      svg: numberLine(-6, 6, [{ v: -4, label: 'start' }, { v: 5, label: 'end' }], { step: 2 }),
    },
    faqs: [
      { q: 'Is −10 bigger than −2?', a: 'No — it is smaller! Negative numbers work in reverse: −10 is further below zero than −2, so −10 is less. On the number line, −10 sits further to the left.' },
      { q: 'Is zero positive or negative?', a: 'Neither! Zero is the meeting point between positive and negative numbers. It is not above zero and not below zero — it IS zero.' },
      { q: 'Where do we use negative numbers in real life?', a: 'Cold temperatures (−7°C), floors below ground (level −1 in a car park), and money you owe. Golf scores use them too — negative is good there!' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const start = -ri(rng, 1, 9);
          const rise = ri(rng, 3, 14);
          return num(`The temperature is ${start}°C. It rises by ${rise}°C. What is the temperature now?`, start + rise, {
            tier, allowMinus: true, svg: numberLine(-10, 10, [start], { step: 5 }),
            hint: 'Climb the number line — count the steps up to zero first.',
            explain: `From ${start}, it takes ${-start} steps to reach 0, then ${rise + start} more.`,
          });
        }
        const v = -ri(rng, 1, 9);
        return num('What number is the red dot showing?', v, {
          tier, allowMinus: true, svg: numberLine(-10, 10, [v], { step: 5 }),
          hint: 'It is to the left of zero, so the answer is negative.',
          explain: `Count back from 0: the dot sits at ${v}.`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const a = -ri(rng, 2, 9), b = ri(rng, 2, 9);
          return num(`What is the difference between ${a}°C and ${b}°C?`, b - a, {
            tier, hint: 'Count from the cold number up to zero, then up to the warm one.',
            explain: `${-a} steps to zero plus ${b} more = ${b - a} degrees apart.`,
          });
        }
        if (kind === 2) {
          const start = ri(rng, 4, 12), step = ri(rng, 2, 4);
          const terms = [start, start - step, start - 2 * step, start - 3 * step];
          return num(`Continue the sequence: ${terms.join(', ')}, … What comes next?`, start - 4 * step, {
            tier, allowMinus: true,
            hint: 'How big is the jump between neighbours?',
            explain: `The rule is −${step} each time, so keep subtracting — even past zero.`,
          });
        }
        const start = ri(rng, 2, 8);
        const fall = start + ri(rng, 2, 9);
        return num(`The temperature is ${start}°C. It falls by ${fall}°C overnight. What is it in the morning?`, start - fall, {
          tier, allowMinus: true,
          hint: 'It falls past zero — keep counting down.',
          explain: `${start} − ${fall} takes you ${fall - start} below zero: ${start - fall}°C.`,
        });
      }
      const kind = ri(rng, 1, 2);
      if (kind === 1) {
        const vals = distinctInts(rng, 4, -9, 9);
        const sorted = vals.sort((a, b) => a - b).map(String);
        return order('Order these temperatures, <b>coldest first</b>.', rng, sorted, {
          tier, hint: 'Coldest means furthest below zero.',
          explain: 'On the number line, further left = colder. Negatives with bigger digits are colder!',
        });
      }
      const step = ri(rng, 2, 5);
      const t1 = ri(rng, 5, 12);
      const seq = [t1, t1 - step, null, t1 - 3 * step];
      return num(`Find the missing number: ${seq.map((v) => v === null ? '□' : v).join(', ')}`, t1 - 2 * step, {
        tier, allowMinus: true,
        hint: 'Work out the rule from the numbers you can see.',
        explain: `The jump is −${step}, so the missing number is ${t1 - step} − ${step} = ${t1 - 2 * step}.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 3a
  {
    id: 'u03-column', unit: 3, book: '5A', strand: 'addsub', emoji: '➕',
    title: 'Column addition and subtraction', shortTitle: 'Column + and −',
    explanation: {
      segments: [
        {
          text: 'The <b>column method</b> lets us add or subtract ANY numbers, however big. Line the numbers up so ones sit under ones, tens under tens — then work column by column, starting from the ones.',
          alt: 'Write one number above the other, keeping the columns tidy like soldiers in rows. Always start on the right with the ones, then move left, one column at a time.',
        },
        {
          text: 'Adding: if a column makes 10 or more, we <b>exchange</b>. 7 + 5 = 12, so write 2 and carry the 1 into the next column — one group of ten moves house!',
          alt: 'When a column overflows past 9, ten of the counters get swapped for a single counter in the next column. Write down the leftover, carry the new one across.',
        },
        {
          text: 'Subtracting: if the top digit is too small, exchange from the next column. To do 42 − 17, the ones say 2 − 7 — impossible! So we take one ten from the 4, turning it into 12 − 7.',
          alt: 'If the top digit cannot pay, it borrows from its neighbour: one ten becomes ten ones. The top number does not change in total — it is just regrouped.',
        },
        {
          text: 'Subtracting from numbers with zeros needs a chain of exchanges. For 30,000 − 12,345, the exchange ripples along the zeros: 3 0 0 0 0 becomes 2 9 9 9 10.',
          alt: 'Zeros have nothing to lend, so the borrow travels left until it finds a digit. Each zero it passes through turns into a 9. It looks like magic, but it is just regrouping.',
        },
      ],
    },
    example: {
      steps: [
        'Work out 4,675 + 2,568 in columns.',
        'Ones: 5 + 8 = 13 → write 3, exchange 1 ten.',
        'Tens: 7 + 6 + 1 = 14 → write 4, exchange 1 hundred.',
        'Hundreds: 6 + 5 + 1 = 12 → write 2, exchange 1 thousand.',
        'Thousands: 4 + 2 + 1 = 7. Answer: <b>7,243</b>.',
      ],
    },
    faqs: [
      { q: 'Why do we start from the ones, not the left?', a: 'Because exchanges flow leftwards. If you started on the left, a carry from the ones could mess up work you had already written. Starting on the right means every column is only touched once.' },
      { q: 'What does "exchange" actually mean?', a: 'Swapping ten of one column for one of the next: ten ones become one ten, ten tens become one hundred. The amount stays the same — it is just regrouped, like swapping ten 1p coins for one 10p coin.' },
      { q: 'How can I check my answer?', a: 'Use the inverse! If you worked out 5,300 − 1,250 = 4,050, check with addition: 4,050 + 1,250 should give back 5,300. Rounding gives a quick sense-check too.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const a = makeNum(rng, 4), b = makeNum(rng, 4);
        if (rng() < 0.5) {
          return num(`Work out ${fmt(a)} + ${fmt(b)}. Use the column method.`, a + b, {
            tier, hint: 'Line up the columns, start from the ones.',
            explain: 'Add each column from the right; exchange whenever a column reaches 10.',
          });
        }
        const [big, small] = a > b ? [a, b] : [b, a];
        return num(`Work out ${fmt(big)} − ${fmt(small)}. Use the column method.`, big - small, {
          tier, hint: 'If a top digit is too small, exchange from the next column.',
          explain: 'Subtract column by column from the ones; exchange a ten when the top digit is smaller.',
        });
      }
      if (tier === 2) {
        const a = makeNum(rng, 5), b = makeNum(rng, rng() < 0.5 ? 4 : 5);
        if (rng() < 0.5) {
          return num(`Work out ${fmt(a)} + ${fmt(b)}.`, a + b, {
            tier, hint: 'Keep the columns straight — ones under ones.',
            explain: 'Work right to left, exchanging where a column passes 9.',
          });
        }
        const [big, small] = a > b ? [a, b] : [b, a];
        return num(`Work out ${fmt(big)} − ${fmt(small)}.`, big - small, {
          tier, hint: 'Watch for columns that need an exchange.',
          explain: 'Column by column; borrow from the neighbour when needed.',
        });
      }
      if (rng() < 0.5) {
        const big = ri(rng, 3, 9) * 10000;
        const small = makeNum(rng, 5);
        if (small >= big) return this.gen(rng, tier);
        return num(`Work out ${fmt(big)} − ${fmt(small)}.`, big - small, {
          tier, hint: 'The zeros pass the exchange along — they each become 9.',
          explain: `Exchanging through the zeros: ${fmt(big)} regroups so every middle zero becomes a 9.`,
        });
      }
      const a = makeNum(rng, 5), b = makeNum(rng, 4), c = makeNum(rng, 4);
      if (a + b - c <= 0) return this.gen(rng, tier);
      return num(`Work out ${fmt(a)} + ${fmt(b)} − ${fmt(c)}.`, a + b - c, {
        tier, hint: 'Do the addition first, then subtract.',
        explain: `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}, then take away ${fmt(c)}.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 3b
  {
    id: 'u03-mental', unit: 3, book: '5A', strand: 'addsub', emoji: '🧠',
    title: 'Rounding, estimating and mental strategies', shortTitle: 'Estimating & mental',
    explanation: {
      segments: [
        {
          text: 'You do not always need columns! Clever <b>mental strategies</b> are often faster. To add 3,999, add 4,000 and take 1 away. To subtract 2,995, subtract 3,000 and give 5 back.',
          alt: 'Numbers close to a round number are gifts. Treat 3,999 as "4,000 minus a tiny bit": do the easy round sum first, then fix the tiny bit at the end.',
        },
        {
          text: '<b>Estimating</b> means rounding first to get a rough answer. 4,876 + 3,105 is roughly 5,000 + 3,000 = 8,000. An estimate tells you what answer to EXPECT.',
          alt: 'Before calculating, make a prediction: round each number to something friendly and combine those instead. If your exact answer lands far from the prediction, something went wrong.',
        },
        {
          text: 'Every calculation has an <b>inverse</b> — an opposite that undoes it. Addition and subtraction undo each other. That gives you a power: you can CHECK any answer.',
          alt: 'Think of addition and subtraction as walking forwards and backwards. If 5,300 − 1,250 lands on 4,050, then walking back — 4,050 + 1,250 — must land on 5,300 again.',
          svg: barModel(5300, [4050, 1250], { partLabels: ['4,050', '1,250'], wholeLabel: '5,300' }),
        },
        {
          text: 'Missing number puzzles use the inverse too. If □ + 2,750 = 6,000, then □ = 6,000 − 2,750. The bar model shows why: the whole minus one part gives the other part.',
          alt: 'Cover-ups are solved by working backwards. Whatever was done to the mystery number, do the opposite to both sides and the mystery is revealed.',
        },
      ],
    },
    example: {
      steps: [
        'Add 6,540 + 2,999 mentally.',
        '2,999 is nearly 3,000 — just 1 less.',
        '6,540 + 3,000 = 9,540.',
        'Give back the 1: 9,540 − 1 = <b>9,539</b>.',
      ],
    },
    faqs: [
      { q: 'Why estimate if I can work out the exact answer?', a: 'An estimate is your safety net. It takes five seconds and tells you roughly where the answer should land. If your exact answer is miles away from the estimate, you know to check your working.' },
      { q: 'Is an estimate "wrong" because it is not exact?', a: 'No — an estimate is not supposed to be exact! Its job is to be quick and close. "About 8,000" is a great answer to an estimating question.' },
      { q: 'Which check should I use, inverse or estimate?', a: 'Both are good friends. The estimate is fast and catches big mistakes; the inverse takes longer but catches small slips too. For important answers, do both.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const a = makeNum(rng, 4);
          const b = pick(rng, [999, 1999, 2999, 3999]);
          return num(`Use a mental trick: ${fmt(a)} + ${fmt(b)}`, a + b, {
            tier, hint: `${fmt(b)} is 1 less than ${fmt(b + 1)}.`,
            explain: `Add ${fmt(b + 1)}, then take 1 away.`,
          });
        }
        const n = makeNum(rng, 4);
        const r = pick(rng, [10, 100, 1000]);
        return num(`Round ${fmt(n)} to the nearest ${fmt(r)}.`, Math.round(n / r) * r, {
          tier, hint: 'Which two neighbours does it sit between?',
          explain: 'The digit one place to the right decides: 5 or more rounds up.',
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const a = makeNum(rng, 4), b = makeNum(rng, 4);
          const est = Math.round(a / 1000) * 1000 + Math.round(b / 1000) * 1000;
          return mcFrom(rng, `<b>Estimate</b> ${fmt(a)} + ${fmt(b)} by rounding each number to the nearest 1,000.`, est,
            [est + 1000, est - 1000, est + 2000], {
            tier, hint: 'Round both numbers first, then add the round versions.',
            explain: `${fmt(a)} ≈ ${fmt(Math.round(a / 1000) * 1000)} and ${fmt(b)} ≈ ${fmt(Math.round(b / 1000) * 1000)}.`,
          });
        }
        const b = makeNum(rng, 4), c = makeNum(rng, 4);
        const a = b + c;
        const options = [`${fmt(c)} + ${fmt(b)}`, `${fmt(a)} + ${fmt(b)}`, `${fmt(c)} − ${fmt(b)}`, `${fmt(b)} − ${fmt(c)}`];
        return mc(`Which calculation <b>checks</b> that ${fmt(a)} − ${fmt(b)} = ${fmt(c)}?`, options, 0, {
          tier, hint: 'The inverse of subtraction is addition.',
          explain: `Adding the answer back: ${fmt(c)} + ${fmt(b)} should return to ${fmt(a)}.`,
        });
      }
      if (rng() < 0.5) {
        const total = ri(rng, 4, 9) * 1000;
        const part = makeNum(rng, 4);
        if (part >= total) return this.gen(rng, tier);
        return num(`Find the missing number: □ + ${fmt(part)} = ${fmt(total)}`, total - part, {
          tier, svg: barModel(total, [total - part, part], { partLabels: ['□', fmt(part)], wholeLabel: fmt(total) }),
          hint: 'Whole minus the part you know.',
          explain: `□ = ${fmt(total)} − ${fmt(part)} = ${fmt(total - part)}.`,
        });
      }
      const a = makeNum(rng, 5);
      const b = pick(rng, [1999, 2999, 3999, 4999]);
      if (a - b <= 0) return this.gen(rng, tier);
      return num(`Use a mental trick: ${fmt(a)} − ${fmt(b)}`, a - b, {
        tier, hint: `Take away ${fmt(b + 1)}, then give 1 back.`,
        explain: `${fmt(a)} − ${fmt(b + 1)} = ${fmt(a - b - 1)}, then + 1 = ${fmt(a - b)}.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 3c
  {
    id: 'u03-problems', unit: 3, book: '5A', strand: 'addsub', emoji: '🧩',
    title: 'Addition and subtraction word problems', shortTitle: '+ and − problems',
    explanation: {
      segments: [
        {
          text: 'Word problems hide a calculation inside a story. Your first job is to find it! Read the story, then ask: what do I know, and what am I looking for?',
          alt: 'Be a maths detective. The story gives you clues (the numbers you know) and a mystery (the number you want). Your job is to work out how the clues connect.',
        },
        {
          text: 'A <b>bar model</b> turns the story into a picture. The whole bar is the total; the parts sit inside it. If you know the whole and one part, subtract to find the other part.',
          alt: 'Draw one long bar for the total, split into pieces for the parts. Then LOOK at the picture: a missing part means whole minus known part. A missing whole means add the parts.',
          svg: barModel(7250, [4800, 2450], { partLabels: ['4,800', '?'], wholeLabel: '7,250' }),
        },
        {
          text: '"More than" and "fewer than" are comparison stories. If Ava has 780 more points than Ben, two bars help: Ava\'s bar is Ben\'s bar plus an extra chunk of 780.',
          alt: 'For comparing, draw two bars, one under the other. The difference is the sticking-out piece. Then you can see whether to add or subtract to answer the question.',
        },
        {
          text: 'Multi-step problems are just several small steps in a row. Solve one step, write down the result, feed it into the next step. Never try to do it all at once!',
          alt: 'Big problems break into small ones. Deal with one sentence of the story at a time, and keep track of each answer — the last step joins them together.',
        },
      ],
    },
    example: {
      steps: [
        'A charity wants to raise £8,000. It has raised £3,450 so far. How much more is needed?',
        'Draw the bar: whole = 8,000, one part = 3,450, other part = ?',
        'Missing part → subtract: 8,000 − 3,450.',
        'Answer: <b>£4,550</b> more is needed.',
      ],
      svg: barModel(8000, [3450, 4550], { partLabels: ['3,450', '?'], wholeLabel: '8,000' }),
    },
    faqs: [
      { q: 'How do I know whether to add or subtract?', a: 'Draw the bar model and look! If the WHOLE is missing, add the parts. If a PART is missing, subtract the known part from the whole. The picture makes the choice for you.' },
      { q: 'What does "difference" mean?', a: 'The gap between two numbers — how much bigger one is than the other. You find it by subtracting the smaller from the larger. The difference between 9,200 and 7,500 is 1,700.' },
      { q: 'The problem says "more than" — so I add, right?', a: 'Careful, that is the classic trap! "Ava has 780 MORE than Ben" tells you about the gap, not the operation. If you already know Ava, you subtract to find Ben. Always model the story first.' },
    ],
    gen(rng, tier) {
      const name = pick(rng, NAMES), name2 = pick(rng, NAMES.filter((n) => n !== name));
      if (tier === 1) {
        const a = ri(rng, 12, 48) * 100, b = ri(rng, 12, 48) * 100;
        if (rng() < 0.5) {
          const thing = pick(rng, ['tokens', 'shells', 'conkers', 'stickers']);
          return num(`${name} collects ${fmt(a)} ${thing} and ${name2} collects ${fmt(b)}. How many ${thing} do they collect altogether?`, a + b, {
            tier, svg: barModel(a + b, [a, b], { partLabels: [fmt(a), fmt(b)], wholeLabel: '?' }),
            hint: 'The whole is missing — add the parts.',
            explain: `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`,
          });
        }
        const whole = a + b;
        const [holder, thing, c1, c2] = pick(rng, [
          ['A jar', 'beads', 'red', 'blue'],
          ['A box', 'marbles', 'green', 'yellow'],
          ['A tin', 'buttons', 'large', 'small'],
        ]);
        return num(`${holder} holds ${fmt(whole)} ${thing}. ${fmt(a)} are ${c1} and the rest are ${c2}. How many are ${c2}?`, b, {
          tier, svg: barModel(whole, [a, b], { partLabels: [fmt(a), '?'], wholeLabel: fmt(whole) }),
          hint: 'A part is missing — subtract the part you know from the whole.',
          explain: `${fmt(whole)} − ${fmt(a)} = ${fmt(b)}.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const bScore = ri(rng, 20, 70) * 100, diff = ri(rng, 4, 19) * 100;
          const aScore = bScore + diff;
          const where = pick(rng, ['in a quiz', 'in a video game', 'in a spelling competition']);
          return num(`${name} scores ${fmt(aScore)} points ${where} — that is ${fmt(diff)} more than ${name2}. How many points does ${name2} score?`, bScore, {
            tier, hint: `${name} has the BIGGER score. Find the smaller one.`,
            explain: `${name2}'s bar is shorter: ${fmt(aScore)} − ${fmt(diff)} = ${fmt(bScore)}.`,
          });
        }
        const start = ri(rng, 50, 95) * 100, s1 = ri(rng, 8, 25) * 100, s2 = ri(rng, 8, 25) * 100;
        const [what, buy1, buy2] = pick(rng, [
          ['coins', 'a shield', 'a map'],
          ['tokens', 'a go on the big wheel', 'the ghost train'],
          ['star points', 'a poster', 'a badge'],
        ]);
        return num(`A game gives ${name} ${fmt(start)} ${what}. ${name.endsWith('a') ? 'She' : 'He'} spends ${fmt(s1)} on ${buy1} and ${fmt(s2)} on ${buy2}. How many ${what} are left?`, start - s1 - s2, {
          tier, hint: 'Two steps: spend once, then spend again.',
          explain: `${fmt(start)} − ${fmt(s1)} = ${fmt(start - s1)}, then − ${fmt(s2)} = ${fmt(start - s1 - s2)}.`,
        });
      }
      const q = scenario(rng, 'u03-problems:t3', [
        (rng) => {
          const mon = ri(rng, 15, 45);
          const total = mon * 3 + ri(rng, 20, 120);
          return num(`A book has ${fmt(total)} pages. ${name} reads ${mon} pages on Monday and twice as many on Tuesday. How many pages are left to read?`, total - mon * 3, {
            tier, hint: 'First find Tuesday, then the total read, then subtract.',
            explain: `Tuesday = ${mon * 2}. Read so far = ${mon} + ${mon * 2} = ${mon * 3}. Left = ${fmt(total)} − ${mon * 3} = ${fmt(total - mon * 3)}.`,
          });
        },
        (rng) => {
          const target = ri(rng, 60, 95) * 100, d1 = ri(rng, 12, 30) * 100, d2 = ri(rng, 12, 30) * 100;
          if (d1 + d2 >= target) return null;
          return num(`A school wants to collect ${fmt(target)} bottle tops. Class A brings ${fmt(d1)} and Class B brings ${fmt(d2)}. How many more tops are needed?`, target - d1 - d2, {
            tier, svg: barModel(target, [d1, d2, target - d1 - d2], { partLabels: [fmt(d1), fmt(d2), '?'], wholeLabel: fmt(target) }),
            hint: 'Add what they have, then compare with the target.',
            explain: `${fmt(d1)} + ${fmt(d2)} = ${fmt(d1 + d2)}; ${fmt(target)} − ${fmt(d1 + d2)} = ${fmt(target - d1 - d2)}.`,
          });
        },
        (rng) => {
          const d1 = ri(rng, 12, 38) * 100, d2 = ri(rng, 12, 38) * 100, runners = ri(rng, 150, 850);
          return num(`A charity fun run raises £${fmt(d1)} on Saturday and £${fmt(d2)} on Sunday. ${fmt(runners)} runners take part. How much money is raised altogether, in pounds?`, d1 + d2, {
            tier, hint: 'Read the question — which numbers does it actually ask about?',
            explain: `£${fmt(d1)} + £${fmt(d2)} = £${fmt(d1 + d2)}. The number of runners was extra information.`,
          });
        },
        (rng) => {
          const x = ri(rng, 12, 45) * 100, y = ri(rng, 4, 18) * 100;
          return num(`${name} collects ${fmt(x)} points. ${name2} collects ${fmt(y)} MORE points than ${name}. How many points do they collect together?`, x + x + y, {
            tier, hint: `Two steps: first find ${name2}'s points, then add both totals.`,
            explain: `${name2}: ${fmt(x)} + ${fmt(y)} = ${fmt(x + y)}. Together: ${fmt(x)} + ${fmt(x + y)} = ${fmt(x + x + y)}.`,
          });
        },
      ]);
      return q ?? this.gen(rng, tier);
    },
  },

  // ---------------------------------------------------------------- Unit 4
  {
    id: 'u04-graphs', unit: 4, book: '5A', strand: 'stats', emoji: '📊',
    title: 'Graphs and tables', shortTitle: 'Graphs & tables',
    explanation: {
      segments: [
        {
          text: 'Tables and graphs are ways of organising information so questions become easy to answer. A <b>table</b> lists exact numbers in rows and columns.',
          alt: 'A table is like a tidy cupboard for numbers: every value has its own shelf. To read one, find the right row, then slide across to the right column.',
          svg: dataTable(['Day', 'Visitors'], [['Mon', '45'], ['Tue', '30'], ['Wed', '60']]),
        },
        {
          text: 'A <b>bar chart</b> shows amounts as bars — taller bar, bigger amount. Always check the scale on the side: one gridline might be worth 5, 10 or even 100!',
          alt: 'Bar charts turn numbers into a skyline you can compare at a glance. But never guess a bar\'s value: follow its top across to the scale and read the number there.',
          svg: barChart(['Mon', 'Tue', 'Wed'], [45, 30, 60]),
        },
        {
          text: 'A <b>line graph</b> shows how something changes over time, like temperature through a day. The line climbing means increasing; falling means decreasing.',
          alt: 'Imagine the line as a mountain path through the day. Going uphill, the amount is rising; downhill, it is falling. Each dot is a real measurement — the line connects the story.',
          svg: lineGraph(['9am', '11am', '1pm', '3pm'], [8, 14, 18, 12], { unit: '°C' }),
        },
        {
          text: 'Graph questions often need TWO reads and a sum: "How many more on Wednesday than Tuesday?" means read both values, then find the difference.',
          alt: 'The tricky questions hide a calculation: read the values you need first, write them down, and then add or subtract them. Reading carefully is half the work.',
        },
      ],
    },
    example: {
      steps: [
        'The bar chart shows visitors: Mon 45, Tue 30, Wed 60. How many more came on Wed than Tue?',
        'Read Wednesday: 60. Read Tuesday: 30.',
        '"How many more" means find the difference: 60 − 30.',
        'Answer: <b>30 more visitors</b>.',
      ],
    },
    faqs: [
      { q: 'What if the line graph has no dot where I need to read?', a: 'Follow the line! Between two dots, the line estimates what happened. Find your spot on the bottom axis, go up to the line, then across to the scale — that height is your best estimate.' },
      { q: 'Why do scales not always go up in 1s?', a: 'Big numbers would need a graph as tall as a house! A scale going up in 10s or 100s squeezes the data onto the page. That is why reading the scale first is the golden rule.' },
      { q: 'What is a two-way table?', a: 'A table that sorts things two ways at once — for example, rows for Year 5 and Year 6, columns for walk, car or bike. Each cell answers both questions: "Year 5 AND walks" lives in one exact cell.' },
    ],
    gen(rng, tier) {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const vals = days.map(() => ri(rng, 4, 19) * 5);
      if (tier === 1) {
        const i = ri(rng, 0, 4);
        if (rng() < 0.5) {
          return num(`The table shows library visitors. How many visited on ${days[i]}?`, vals[i], {
            tier, svg: dataTable(['Day', 'Visitors'], days.map((d, j) => [d, String(vals[j])])),
            hint: 'Find the row, slide across.',
            explain: `Row ${days[i]} shows ${vals[i]}.`,
          });
        }
        return num(`The bar chart shows visitors. How many visited on ${days[i]}?`, vals[i], {
          tier, svg: barChart(days, vals),
          hint: 'Follow the top of the bar across to the scale.',
          explain: `The ${days[i]} bar reaches ${vals[i]}.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const walk5 = ri(rng, 8, 25), car5 = ri(rng, 5, 20), walk6 = ri(rng, 8, 25), car6 = ri(rng, 5, 20);
          const total5 = walk5 + car5;
          return num('The two-way table shows how children travel. What number goes in the ? cell?', car5, {
            tier,
            svg: dataTable(['', 'Walk', 'Car', 'Total'], [
              ['Y5', String(walk5), '?', String(total5)],
              ['Y6', String(walk6), String(car6), String(walk6 + car6)],
            ]),
            hint: 'The row total is the whole; walk is one part.',
            explain: `${total5} in total − ${walk5} walkers = ${car5} by car.`,
          });
        }
        const times = ['9am', '11am', '1pm', '3pm', '5pm'];
        const temps = [ri(rng, 4, 9)];
        for (let i = 1; i < 5; i++) temps.push(Math.max(1, temps[i - 1] + pick(rng, [-4, -2, 2, 3, 4])));
        const i = ri(rng, 0, 4);
        return num(`The line graph shows the temperature. What was it at ${times[i]}?`, temps[i], {
          tier, unit: '°C', svg: lineGraph(times, temps, { unit: '°C' }),
          hint: 'Find the time on the bottom, go up to the dot, then across.',
          explain: `The dot above ${times[i]} sits at ${temps[i]}°C.`,
        });
      }
      const kind = ri(rng, 1, 2);
      if (kind === 1) {
        const max = Math.max(...vals), min = Math.min(...vals);
        return num('Using the chart: how many MORE visitors came on the busiest day than the quietest day?', max - min, {
          tier, svg: barChart(days, vals),
          hint: 'Find the tallest and shortest bars first.',
          explain: `Busiest ${max}, quietest ${min}: difference ${max - min}.`,
        });
      }
      const three = vals.slice(0, 3);
      return num(`The table shows visitors. How many visited on Mon, Tue and Wed altogether?`, three[0] + three[1] + three[2], {
        tier, svg: dataTable(['Day', 'Visitors'], days.map((d, j) => [d, String(vals[j])])),
        hint: 'Read three values, then add them.',
        explain: `${three[0]} + ${three[1]} + ${three[2]} = ${three[0] + three[1] + three[2]}.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 5a
  {
    id: 'u05-factors', unit: 5, book: '5A', strand: 'multdiv', emoji: '🔍',
    title: 'Multiples, factors and primes', shortTitle: 'Multiples & primes',
    explanation: {
      segments: [
        {
          text: 'The <b>multiples</b> of a number are its times table, going on forever: multiples of 6 are 6, 12, 18, 24… To test "is 42 a multiple of 6?", ask: does 6 divide into 42 exactly? 6 × 7 = 42 — yes!',
          alt: 'Multiples are what you say when you count in steps of a number. Counting in 6s you say 6, 12, 18, 24, 30, 36, 42 — so 42 is a multiple of 6.',
        },
        {
          text: '<b>Factors</b> work the other way round: they are the numbers that divide INTO your number exactly. The factors of 12 are 1, 2, 3, 4, 6 and 12. Factors come in pairs: 1×12, 2×6, 3×4.',
          alt: 'Think of factors as the ways to arrange 12 dots into perfect rectangles: 1 row of 12, 2 rows of 6, 3 rows of 4. Each rectangle gives you a factor pair.',
        },
        {
          text: 'A <b>common factor</b> divides two numbers. 6 is a common factor of 12 and 18. A <b>common multiple</b> is in both times tables: 12 is in the 4s and the 6s.',
          alt: 'Common means shared. List the factors of both numbers and circle the ones that appear in both lists — those are the common factors. Same idea works for multiples.',
        },
        {
          text: 'A <b>prime number</b> has exactly TWO factors: 1 and itself. 7 is prime (only 1 × 7). 6 is not — it also has 2 and 3. The primes up to 19: 2, 3, 5, 7, 11, 13, 17, 19. Careful: 1 is NOT prime, and 2 is the only even prime!',
          alt: 'A prime is a number you cannot arrange into a rectangle except one long row. 7 dots only make a 1-by-7 line. Numbers with more rectangle options, like 6, are called composite.',
        },
      ],
    },
    example: {
      steps: [
        'Find all the factors of 24.',
        'Hunt in pairs: 1 × 24, 2 × 12, 3 × 8, 4 × 6.',
        'Does 5 divide 24? No. After that the pairs repeat backwards, so we can stop.',
        'Factors of 24: <b>1, 2, 3, 4, 6, 8, 12, 24</b>.',
      ],
    },
    faqs: [
      { q: 'What is the difference between a factor and a multiple?', a: 'Factors fit INSIDE a number (they divide it exactly, so they are small or equal). Multiples GROW FROM a number (its times table, so they are equal or bigger). 3 is a factor of 12; 24 is a multiple of 12.' },
      { q: 'Why is 1 not a prime number?', a: 'A prime needs exactly two DIFFERENT factors: 1 and itself. The number 1 only has one factor — itself. So it misses the entry rule for the primes club.' },
      { q: 'Is there a quick way to spot multiples?', a: 'Yes — divisibility tricks! Multiples of 2 end in 0, 2, 4, 6 or 8. Multiples of 5 end in 0 or 5. For 3: add the digits — if that sum is in the 3 times table, so is the number.' },
      { q: 'Why do primes matter?', a: 'Primes are the building blocks of all numbers — every whole number is made by multiplying primes. Secret codes protecting the internet are built on giant prime numbers!' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const k = ri(rng, 3, 9);
          const m = k * ri(rng, 3, 9);
          const wrongs = [m + 1, m + 2, m - 1].filter((w) => w % k !== 0);
          return mcFrom(rng, `Which of these is a <b>multiple</b> of ${k}?`, m, wrongs, {
            tier, hint: `Count in ${k}s — or divide each option by ${k}.`,
            explain: `${m} = ${k} × ${m / k}, so it is in the ${k} times table.`,
          });
        }
        const f = ri(rng, 3, 9);
        const n = f * ri(rng, 3, 9);
        const truth = rng() < 0.5;
        const shown = truth ? n : n + ri(rng, 1, f - 1);
        return tf(`True or false: ${f} is a factor of ${shown}.`, shown % f === 0, {
          tier, hint: `Does ${f} divide into ${shown} with nothing left over?`,
          explain: shown % f === 0 ? `${f} × ${shown / f} = ${shown}, so yes.` : `${shown} ÷ ${f} leaves a remainder, so no.`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const pairs = [[12, 18, 6], [16, 24, 8], [15, 20, 5], [18, 27, 9], [20, 30, 10], [14, 21, 7]];
          const [a, b, cf] = pick(rng, pairs);
          const wrongs = [cf + 1, cf + 2, a].filter((w) => a % w !== 0 || b % w !== 0);
          return mcFrom(rng, `Which number is a factor of BOTH ${a} and ${b}?`, cf, wrongs.slice(0, 3), {
            tier, hint: 'Test each option against both numbers.',
            explain: `${a} ÷ ${cf} = ${a / cf} and ${b} ÷ ${cf} = ${b / cf} — both exact.`,
          });
        }
        if (kind === 2) {
          const primes = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
          const p = pick(rng, primes);
          const comps = [p + 1, p + 3, p - 2].map((x) => (isPrime(x) ? x + 1 : x));
          return mcFrom(rng, 'Which of these is a <b>prime</b> number?', p, comps, {
            tier, hint: 'A prime has no factors except 1 and itself.',
            explain: `${p} cannot be divided exactly by anything except 1 and ${p}.`,
          });
        }
        const a = ri(rng, 3, 9), b = ri(rng, 3, 9);
        const prod = a * b;
        const pairsWrong = [`${a} and ${b + 1}`, `${a + 1} and ${b}`, `${a + 1} and ${b + 1}`];
        return mc(`Which pair multiplies to make ${prod}?`, [`${a} and ${b}`, ...pairsWrong], 0, {
          tier, hint: `Try each pair: do they multiply to ${prod}?`,
          explain: `${a} × ${b} = ${prod}, so ${a} and ${b} are a factor pair of ${prod}.`,
        });
      }
      const kind = ri(rng, 1, 3);
      if (kind === 1) {
        const trip = pick(rng, [[4, 6, 12], [3, 5, 15], [6, 8, 24], [4, 10, 20], [3, 7, 21], [6, 9, 18], [8, 12, 24]]);
        return num(`What is the SMALLEST number that is a multiple of both ${trip[0]} and ${trip[1]}?`, trip[2], {
          tier, hint: `List multiples of ${trip[1]} and stop at the first one that is also a multiple of ${trip[0]}.`,
          explain: `${trip[2]} = ${trip[0]} × ${trip[2] / trip[0]} = ${trip[1]} × ${trip[2] / trip[1]}.`,
        });
      }
      if (kind === 2) {
        const ranges = [[24, 30, 29], [32, 38, 37], [48, 54, 53], [14, 18, 17], [20, 24, 23], [44, 48, 47], [60, 66, 61]];
        const [lo, hi, p] = pick(rng, ranges);
        return num(`Find the prime number between ${lo} and ${hi}.`, p, {
          tier, hint: 'Cross out the even numbers and multiples of 3 and 5 first.',
          explain: `${p} has no factors except 1 and itself — every other number in that range does.`,
        });
      }
      const facts = [
        ['1 is a prime number.', false, 'A prime needs exactly two factors; 1 has only one.'],
        ['2 is the only even prime number.', true, 'Every other even number can be divided by 2, so 2 is the only even prime.'],
        ['All odd numbers are prime.', false, '9 is odd but 9 = 3 × 3, so it is not prime.'],
        ['Every number is a multiple of 1.', true, 'Counting in 1s reaches every whole number.'],
      ];
      const [stmt, ans, why] = pick(rng, facts);
      return tf(`True or false: ${stmt}`, ans, { tier, hint: 'Think about the exact definition.', explain: why });
    },
  },

  // ---------------------------------------------------------------- Unit 5b
  {
    id: 'u05-squares', unit: 5, book: '5A', strand: 'multdiv', emoji: '🎲',
    title: 'Squares, cubes and ×/÷ by 10, 100, 1,000', shortTitle: 'Squares & ×10/100',
    explanation: {
      segments: [
        {
          text: 'A <b>square number</b> is a number times itself. We write 6 × 6 as 6², said "six squared". 6² = 36. The square numbers start 1, 4, 9, 16, 25, 36, 49, 64, 81, 100…',
          alt: 'Square numbers make perfect square patterns of dots: 16 dots arrange into a 4-by-4 square, so 16 = 4². The little ² counts how many times the number appears in the multiplication.',
        },
        {
          text: 'A <b>cube number</b> uses the number three times: 4³ = 4 × 4 × 4 = 64, said "four cubed". Cubes grow fast: 2³=8, 3³=27, 4³=64, 5³=125.',
          alt: 'Cube numbers build solid cubes from small blocks: a 3-by-3-by-3 cube uses 27 blocks, so 27 = 3³. The little ³ means the number multiplies itself three times.',
        },
        {
          text: 'Multiplying by 10, 100 or 1,000 shifts every digit up the place value columns: 45 × 100 = 4,500. The digits do not change — they just move to bigger columns.',
          alt: 'Times 10 moves every digit one column to the left; times 100 moves them two columns; times 1,000 moves them three. Empty columns fill up with zeros.',
          svg: pvGrid(4500),
        },
        {
          text: 'Dividing by 10, 100 or 1,000 shifts digits the other way: 7,000 ÷ 100 = 70. And with multiples of ten, split the job: 40 × 700 = 4 × 7 with three zeros = 28,000.',
          alt: 'Dividing by 100 slides digits two columns down. For sums like 40 × 700, do the small fact first (4 × 7 = 28), then hang on the zeros from both numbers (three of them): 28,000.',
        },
      ],
    },
    example: {
      steps: [
        'Work out 30 × 400.',
        'Small fact first: 3 × 4 = 12.',
        'Count the zeros: one from 30, two from 400 — three zeros.',
        'Attach them: <b>12,000</b>.',
      ],
    },
    faqs: [
      { q: 'Is 6² the same as 6 × 2?', a: 'No — that is the most famous mix-up in Year 5! 6² means 6 × 6 = 36, but 6 × 2 = 12. The little 2 means "use the number twice in a multiplication", not "times 2".' },
      { q: 'Why is it called "squared"?', a: 'Because of the shape! 5² = 25 dots arrange into a perfect square, 5 rows of 5. And 5³ = 125 small blocks build a perfect cube. The names come straight from the shapes.' },
      { q: 'Does ×10 just mean "add a zero"?', a: 'Be careful with that shortcut. For whole numbers it looks that way (45 → 450), but the real rule is that digits shift one column left. Later with decimals, 4.5 × 10 = 45 — no extra zero anywhere! The shifting rule always works.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const n = ri(rng, 3, 12);
          return num(`What is ${n}²?`, n * n, {
            tier, hint: `${n}² means ${n} × ${n}.`,
            explain: `${n} × ${n} = ${n * n}. The ² means "times itself".`,
          });
        }
        const m = ri(rng, 3, 10);
        const sq = m * m;
        const wrongs = [sq + 1, sq - 2, sq + 3].filter((w) => !Number.isInteger(Math.sqrt(w)));
        return mcFrom(rng, 'Which of these is a <b>square</b> number?', sq, wrongs, {
          tier, hint: 'Which one is something times itself?',
          explain: `${sq} = ${m} × ${m} = ${m}².`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const n = ri(rng, 2, 5);
          return num(`What is ${n}³?`, n ** 3, {
            tier, hint: `${n}³ means ${n} × ${n} × ${n}.`,
            explain: `${n} × ${n} = ${n * n}, then × ${n} again = ${n ** 3}.`,
          });
        }
        if (kind === 2) {
          const a = makeNum(rng, ri(rng, 2, 3));
          const f = pick(rng, [10, 100, 1000]);
          return num(`Work out ${fmt(a)} × ${fmt(f)}.`, a * f, {
            tier, hint: 'Shift the digits up the columns; fill the gaps with zeros.',
            explain: `Every digit moves ${Math.log10(f)} column${f > 10 ? 's' : ''} left: ${fmt(a * f)}.`,
          });
        }
        const f = pick(rng, [10, 100, 1000]);
        const b = makeNum(rng, 2);
        const a = b * f;
        return num(`Work out ${fmt(a)} ÷ ${fmt(f)}.`, b, {
          tier, hint: 'Digits shift down the columns this time.',
          explain: `${fmt(a)} ÷ ${fmt(f)} slides the digits back: ${fmt(b)}.`,
        });
      }
      const kind = ri(rng, 1, 3);
      if (kind === 1) {
        const a = ri(rng, 2, 9) * 10, b = ri(rng, 2, 9) * 100;
        return num(`Work out ${fmt(a)} × ${fmt(b)}.`, a * b, {
          tier, hint: 'Do the small fact, then count ALL the zeros.',
          explain: `${a / 10} × ${b / 100} = ${(a / 10) * (b / 100)}, plus three zeros: ${fmt(a * b)}.`,
        });
      }
      if (kind === 2) {
        const n = ri(rng, 20, 99);
        const f = pick(rng, [10, 100, 1000]);
        return mcFrom(rng, `How many times bigger is ${fmt(n * f)} than ${n}?`, f, [10, 100, 1000, 10000].filter((x) => x !== f), {
          tier, hint: 'How many columns did the digits shift?',
          explain: `${n} × ${fmt(f)} = ${fmt(n * f)}, so it is ${fmt(f)} times bigger.`,
        });
      }
      const n = ri(rng, 2, 4);
      return num(`Work out ${n}³ × 10.`, n ** 3 * 10, {
        tier, hint: `First find ${n}³, then shift once.`,
        explain: `${n}³ = ${n ** 3}, then × 10 = ${n ** 3 * 10}.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 6a
  {
    id: 'u06-perimeter', unit: 6, book: '5A', strand: 'measure', emoji: '📏',
    title: 'Perimeter', shortTitle: 'Perimeter',
    explanation: {
      segments: [
        {
          text: '<b>Perimeter</b> is the distance all the way around the OUTSIDE of a shape — like walking around a playground fence. Add up every side.',
          alt: 'Imagine an ant marching around the edge of a shape until it gets back to the start. The total distance it walks is the perimeter.',
          svg: rectGrid(8, 5, { showGrid: false }),
        },
        {
          text: 'Rectangles have a shortcut: opposite sides are equal, so perimeter = 2 × (length + width). An 8 cm by 5 cm rectangle: 2 × (8 + 5) = 2 × 13 = 26 cm.',
          alt: 'A rectangle has two lengths and two widths. Instead of adding four numbers, add length and width once — then double it.',
        },
        {
          text: 'You can work backwards too. If the perimeter is 26 cm and one side is 8 cm: half of 26 is 13, and 13 − 8 = 5 cm for the other side.',
          alt: 'Working backwards: halving the perimeter gives one length plus one width. Take away the side you know, and the mystery side appears.',
        },
        {
          text: 'For an L-shape, a magic trick: slide the two cut-in sides outwards in your head and they complete the big rectangle. So many L-shapes have the SAME perimeter as the rectangle they fit inside!',
          alt: 'With rectilinear shapes, imagine pushing the dented sides back out until the shape becomes a full rectangle. The total distance around does not change when you slide sides straight outwards.',
          svg: lShape(9, 6, 4, 3),
        },
      ],
    },
    example: {
      steps: [
        'A rectangular garden is 12 m long and 7 m wide. Find its perimeter.',
        'Length + width: 12 + 7 = 19 m.',
        'Double it: 2 × 19 = <b>38 m</b>.',
      ],
    },
    faqs: [
      { q: 'How do I remember perimeter vs area?', a: 'PeRIMeter has RIM in it — the rim is the edge you walk around. Area is what you would paint inside. Fence = perimeter, grass = area.' },
      { q: 'Why does the L-shape trick work?', a: 'When you slide a side straight outwards, it stays exactly the same length — it just moves position. The two slid sides complete the big rectangle, so the total around the edge is unchanged. (This only works for sides that cut straight in and out.)' },
      { q: 'Do the units matter?', a: 'Hugely! A perimeter in metres and a side in centimetres cannot be added until they speak the same language. Convert first, then add — and always write the unit in your answer.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const w = ri(rng, 4, 12), hgt = ri(rng, 3, 9);
        return num('Find the perimeter of this rectangle.', 2 * (w + hgt), {
          tier, unit: 'cm', svg: rectGrid(w, hgt, { showGrid: false }),
          hint: 'Add the length and width, then double.',
          explain: `2 × (${w} + ${hgt}) = 2 × ${w + hgt} = ${2 * (w + hgt)} cm.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const s = ri(rng, 5, 25);
          return num(`A square has sides of ${s} cm. What is its perimeter?`, 4 * s, {
            tier, unit: 'cm', hint: 'A square has four equal sides.',
            explain: `4 × ${s} = ${4 * s} cm.`,
          });
        }
        const w = ri(rng, 3, 10), hgt = ri(rng, 3, 10);
        const P = 2 * (w + hgt);
        return num(`A rectangle has a perimeter of ${P} cm. One side is ${w} cm. How long is the other side?`, hgt, {
          tier, unit: 'cm', hint: 'Halve the perimeter first.',
          explain: `Half of ${P} is ${P / 2}; ${P / 2} − ${w} = ${hgt} cm.`,
        });
      }
      if (rng() < 0.5) {
        const a = ri(rng, 7, 12), b = ri(rng, 5, 9), c = ri(rng, 2, a - 3), d = ri(rng, 2, b - 3);
        return num(`This L-shape fits exactly inside a ${a} cm by ${b} cm rectangle, with a ${c} cm by ${d} cm corner cut out. What is the L-shape's perimeter?`, 2 * (a + b), {
          tier, unit: 'cm', svg: lShape(a, b, c, d),
          hint: 'Slide the cut-in sides outwards — what rectangle do they complete?',
          explain: `Sliding the cut sides out rebuilds the ${a} × ${b} rectangle: perimeter = 2 × (${a} + ${b}) = ${2 * (a + b)} cm.`,
        });
      }
      const l = ri(rng, 8, 20), w = ri(rng, 5, 12), gap = ri(rng, 1, 3);
      const opts = {
        tier, unit: 'm', hint: 'Find the full perimeter, then remove the opening.',
        explain: `Perimeter 2 × (${l} + ${w}) = ${2 * (l + w)} m, minus the ${gap} m opening = ${2 * (l + w) - gap} m.`,
      };
      return scenario(rng, 'u05-perimeter:t3-fence', [
        (rng) => num(`A rectangular garden is ${l} m by ${w} m. A fence goes all the way round except a ${gap} m gate. How many metres of fence are needed?`, 2 * (l + w) - gap, opts),
        (rng) => num(`A chicken run is a ${l} m by ${w} m rectangle. Wire netting goes round every side except a ${gap} m gate. How many metres of netting are needed?`, 2 * (l + w) - gap, opts),
        (rng) => num(`Fairy lights run all the way round a ${l} m by ${w} m stage, leaving a ${gap} m opening for the steps. How many metres of lights are needed?`, 2 * (l + w) - gap, opts),
      ]);
    },
  },

  // ---------------------------------------------------------------- Unit 6b
  {
    id: 'u06-area', unit: 6, book: '5A', strand: 'measure', emoji: '🟦',
    title: 'Area', shortTitle: 'Area',
    explanation: {
      segments: [
        {
          text: '<b>Area</b> is the amount of flat space INSIDE a shape. We measure it in squares: square centimetres (cm²) or square metres (m²).',
          alt: 'Area answers "how much carpet would cover this floor?" We count how many 1 cm squares fit inside the shape — that count is the area in cm².',
          svg: rectGrid(6, 4),
        },
        {
          text: 'For a rectangle you do not need to count every square — the rows do the work. 4 rows of 6 squares is 4 × 6 = 24 squares. Area of a rectangle = length × width.',
          alt: 'The squares inside a rectangle line up in equal rows, and equal rows means multiply. Six across, four down: 6 × 4 = 24 cm². That is the whole formula!',
        },
        {
          text: 'Work backwards with division: if a rectangle has area 24 cm² and one side is 6 cm, the other side is 24 ÷ 6 = 4 cm.',
          alt: 'Area puzzles run in reverse using the inverse: dividing the area by the side you know reveals the side you do not.',
        },
        {
          text: 'For an L-shape, split it into rectangles and add — or find the big rectangle and SUBTRACT the missing corner. Unlike perimeter, the cut-out corner really does make the area smaller!',
          alt: 'Two ways with compound shapes: chop the L into two rectangles and add their areas, or take the full rectangle and remove the bite. Both give the same answer — pick the easier one.',
          svg: lShape(9, 6, 4, 3),
        },
      ],
    },
    example: {
      steps: [
        'Find the area of an L-shape: a 9 cm × 6 cm rectangle with a 4 cm × 3 cm corner removed.',
        'Full rectangle: 9 × 6 = 54 cm².',
        'The bite: 4 × 3 = 12 cm².',
        'Subtract: 54 − 12 = <b>42 cm²</b>.',
      ],
    },
    faqs: [
      { q: 'Why is area measured in cm² and not just cm?', a: 'Because area counts SQUARES, not lengths. The little ² reminds you each unit is a 1 cm by 1 cm square tile. Length is a line; area is a surface.' },
      { q: 'Can two shapes have the same perimeter but different areas?', a: 'Yes! A 6×4 rectangle and a 7×3 rectangle both have perimeter 20 cm, but their areas are 24 cm² and 21 cm². The chunkier the shape, the more area a perimeter holds.' },
      { q: 'How do I estimate the area of a wiggly shape?', a: 'Lay a squared grid over it. Count the fully-inside squares, then count squares that are half-covered or more as 1 and ignore the rest. You get a fair estimate — that is exactly what Year 5 asks for.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const w = ri(rng, 3, 9), hgt = ri(rng, 2, 6);
        return num('Find the area of this rectangle by counting rows of squares.', w * hgt, {
          tier, unit: 'cm²', svg: rectGrid(w, hgt),
          hint: `${hgt} rows with ${w} squares in each row.`,
          explain: `${w} × ${hgt} = ${w * hgt} cm².`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const w = ri(rng, 6, 15), hgt = ri(rng, 4, 12);
          return num(`A rectangle is ${w} cm long and ${hgt} cm wide. What is its area?`, w * hgt, {
            tier, unit: 'cm²', hint: 'Area of a rectangle = length × width.',
            explain: `${w} × ${hgt} = ${w * hgt} cm².`,
          });
        }
        const s = ri(rng, 4, 12);
        return num(`A square has sides of ${s} m. What is its area?`, s * s, {
          tier, unit: 'm²', hint: 'A square is a rectangle with equal sides.',
          explain: `${s} × ${s} = ${s * s} m². (That is ${s}² — a square number for a square shape!)`,
        });
      }
      const kind = ri(rng, 1, 3);
      if (kind === 1) {
        const w = ri(rng, 4, 9);
        const area = w * ri(rng, 5, 12);
        return num(`A rectangle has an area of ${area} cm². One side is ${w} cm. How long is the other side?`, area / w, {
          tier, unit: 'cm', hint: 'Use the inverse: divide the area by the known side.',
          explain: `${area} ÷ ${w} = ${area / w} cm.`,
        });
      }
      if (kind === 2) {
        const a = ri(rng, 7, 12), b = ri(rng, 5, 9), c = ri(rng, 2, a - 3), d = ri(rng, 2, b - 3);
        return num(`Find the area of this L-shape: a ${a} cm × ${b} cm rectangle with a ${c} cm × ${d} cm corner cut out.`, a * b - c * d, {
          tier, unit: 'cm²', svg: lShape(a, b, c, d),
          hint: 'Big rectangle minus the bite.',
          explain: `${a} × ${b} = ${a * b}, minus ${c} × ${d} = ${c * d}: ${a * b - c * d} cm².`,
        });
      }
      const w1 = ri(rng, 5, 9), h1 = ri(rng, 4, 8);
      const w2 = w1 + pick(rng, [-2, -1, 1, 2]), h2 = h1 + pick(rng, [-2, -1, 1, 2]);
      if (w1 * h1 === w2 * h2) return this.gen(rng, tier);
      const bigger = w1 * h1 > w2 * h2 ? 0 : 1;
      return mc('Which rectangle has the LARGER area?', [`${w1} cm × ${h1} cm`, `${w2} cm × ${h2} cm`], bigger, {
        tier, hint: 'Work out both areas before choosing.',
        explain: `${w1} × ${h1} = ${w1 * h1} cm² and ${w2} × ${h2} = ${w2 * h2} cm².`,
      });
    },
  },
];

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}
