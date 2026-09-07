// Copied from powermath-trainer @ aa8bd0b (content/c5c.js) on 2026-09-07 — Year 5
// REVIEW material for the Year 6 hub (phase B4). Not on the map, never a 'new'
// topic: these are what the review block draws from. Only the engine import
// path differs (content lives one level deeper here).
// Book 5C — Term 3: decimals, geometry (shapes, position & direction),
// converting units, volume. Follows the official Power Maths Y5 lesson list.

import { num, mc, mcFrom, tf, order, money, fmt, ri, pick, shuffle, scenario } from './gen.js';
import { angleDiagram, coordGrid, rectGrid } from './vis.js';

const NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Emma', 'Finn', 'Grace', 'Hugo', 'Isla', 'Jack'];

// Decimal-safe arithmetic: work in scaled integers, divide once.
const dec1 = (tenths) => tenths / 10;
const dec2 = (hundredths) => hundredths / 100;

export const topics5c = [

  // ---------------------------------------------------------------- Unit 12a
  {
    id: 'u12-addsub-dec', unit: 12, book: '5C', strand: 'decimals', emoji: '🛒',
    title: 'Adding and subtracting decimals', shortTitle: 'Add/sub decimals',
    explanation: {
      segments: [
        {
          text: 'Adding and subtracting decimals uses the SAME column method — with one golden rule: <b>line up the decimal points</b>. Then tenths sit under tenths and everything matches.',
          alt: 'The decimal point is the anchor. Write the numbers so the points sit exactly on top of each other, and every digit automatically lands in its correct column.',
        },
        {
          text: 'Exchanges work as usual: 2.7 + 1.5 → tenths: 7 + 5 = 12 tenths = 1 whole and 2 tenths. Write 2 tenths, carry the 1 whole. Answer: 4.2.',
          alt: 'Ten tenths make one whole, just like ten ones make a ten. When the tenths column overflows, the extra crosses the decimal point into the ones.',
        },
        {
          text: 'If the numbers have different lengths, pad with zeros: 4.6 + 2.75 becomes 4.60 + 2.75. The zero changes nothing but keeps the columns honest. Answer: 7.35.',
          alt: 'Uneven decimals are the biggest trap: never add a tenths digit to a hundredths digit! Give the shorter number extra zeros so both have the same number of decimal places.',
        },
        {
          text: 'Money is decimals in disguise: £6.35 is 6 pounds and 35 hundredths. Change from £10: 10.00 − 6.35 = £3.65. Counting up works nicely too: 6.35 → 6.40 → 7.00 → 10.00 is 5p + 60p + £3.',
          alt: 'For money subtraction, shopkeeper-counting is a lovely check: count up from the price to the amount paid, collecting the jumps. Small jump to the next 10p, jump to the next pound, then whole pounds.',
        },
      ],
    },
    example: {
      steps: [
        'Work out 4.6 + 2.75.',
        'Pad: 4.60 + 2.75, points lined up.',
        'Hundredths: 0 + 5 = 5. Tenths: 6 + 7 = 13 → write 3, carry 1.',
        'Ones: 4 + 2 + 1 = 7. Answer: <b>7.35</b>.',
      ],
    },
    faqs: [
      { q: 'Why must the decimal points line up?', a: 'Because columns must match: tenths under tenths, ones under ones. If you right-align 4.6 and 2.75 like whole numbers, the 6 tenths would sit under the 5 hundredths — and the whole sum collapses.' },
      { q: 'Where does the decimal point go in the answer?', a: 'Straight down! The points are all in one vertical line, including the answer\'s. Write it before you start calculating so it cannot drift.' },
      { q: 'Is 3.65 the same as £3.65?', a: 'The number is the same; the unit gives it meaning. In money, the two decimal places are pence — 65 hundredths of a pound is 65p. That is why money is such good decimals practice.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const a = ri(rng, 12, 89), b = ri(rng, 12, 89);
        if (rng() < 0.5) {
          return num(`Work out ${dec1(a)} + ${dec1(b)}`, dec1(a + b), {
            tier, allowDecimal: true, tolerance: 0.001,
            hint: 'Line up the decimal points first.',
            explain: `${a} tenths + ${b} tenths = ${a + b} tenths = ${dec1(a + b)}.`,
          });
        }
        const [big, small] = a > b ? [a, b] : [b, a];
        return num(`Work out ${dec1(big)} − ${dec1(small)}`, dec1(big - small), {
          tier, allowDecimal: true, tolerance: 0.001,
          hint: 'Points lined up, subtract column by column.',
          explain: `${big} tenths − ${small} tenths = ${big - small} tenths = ${dec1(big - small)}.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const a = ri(rng, 150, 899), b = ri(rng, 150, 899);
          const [it1, it2] = pick(rng, [['a comic', 'a snack'], ['a magazine', 'a carton of juice'], ['a notebook', 'a keyring'], ['a sticker album', 'an ice lolly']]);
          return num(`${pick(rng, NAMES)} buys ${it1} for ${money(dec2(a))} and ${it2} for ${money(dec2(b))}. What is the total? (Just the number, e.g. 4.75)`, dec2(a + b), {
            tier, allowDecimal: true, tolerance: 0.001,
            hint: 'Add the pence, then the pounds — or use columns.',
            explain: `${money(dec2(a))} + ${money(dec2(b))} = ${money(dec2(a + b))}.`,
          });
        }
        const a = ri(rng, 41, 89), b = ri(rng, 115, 385);
        return num(`Work out ${dec1(a)} + ${dec2(b)}`, dec2(a * 10 + b), {
          tier, allowDecimal: true, tolerance: 0.001,
          hint: `Pad the shorter number: ${dec1(a)} = ${(a / 10).toFixed(2)}.`,
          explain: `${(a / 10).toFixed(2)} + ${dec2(b)} = ${dec2(a * 10 + b)}.`,
        });
      }
      return scenario(rng, 'u12-addsub-dec:t3', [
        (rng) => {
          const price = ri(rng, 215, 785);
          return num(`${pick(rng, NAMES)} pays for a ${money(dec2(price))} toy with a £10 note. How much change? (Just the number.)`, dec2(1000 - price), {
            tier, allowDecimal: true, tolerance: 0.001,
            hint: 'Count up: to the next 10p, to the next pound, then to £10.',
            explain: `10.00 − ${dec2(price)} = ${dec2(1000 - price)}.`,
          });
        },
        (rng) => {
          const a = ri(rng, 105, 460), b = ri(rng, 105, 460), c = ri(rng, 105, 460);
          return num(`A relay team runs three legs: ${dec2(a)} km, ${dec2(b)} km and ${dec2(c)} km. How far altogether?`, dec2(a + b + c), {
            tier, allowDecimal: true, tolerance: 0.001, unit: 'km',
            hint: 'Add two first, then add the third.',
            explain: `${dec2(a)} + ${dec2(b)} = ${dec2(a + b)}, then + ${dec2(c)} = ${dec2(a + b + c)} km.`,
          });
        },
        (rng) => {
          const a = ri(rng, 150, 420), b = ri(rng, 150, 420);
          return num(`${pick(rng, NAMES)} buys a sandwich for ${money(dec2(a))} and a smoothie for ${money(dec2(b))}, and pays with a £10 note. How much change? (Just the number.)`, dec2(1000 - a - b), {
            tier, allowDecimal: true, tolerance: 0.001,
            hint: 'Two steps: total the shopping first, then find the change from £10.',
            explain: `${money(dec2(a))} + ${money(dec2(b))} = ${money(dec2(a + b))}; £10 − ${money(dec2(a + b))} = ${money(dec2(1000 - a - b))}.`,
          });
        },
        (rng) => {
          const a = ri(rng, 28, 60), b = ri(rng, 8, 24);
          return num(`A jug holds ${dec1(a)} litres of squash. ${dec1(b)} litres are poured into glasses. How much squash is left?`, dec1(a - b), {
            tier, allowDecimal: true, tolerance: 0.001, unit: 'litres',
            hint: 'Line up the decimal points and subtract.',
            explain: `${dec1(a)} − ${dec1(b)} = ${dec1(a - b)} litres.`,
          });
        },
        (rng) => {
          const a = ri(rng, 105, 285), b = ri(rng, 105, 285);
          return num(`A recipe uses ${dec2(a)} kg of flour and ${dec2(b)} kg of sugar, baked at 180°C. How many kilograms of ingredients are used? (Just the number.)`, dec2(a + b), {
            tier, allowDecimal: true, tolerance: 0.001,
            hint: 'One of the numbers is not a weight at all — leave it out.',
            explain: `${dec2(a)} + ${dec2(b)} = ${dec2(a + b)} kg. The 180°C is the oven temperature, not an amount.`,
          });
        },
      ]);
    },
  },

  // ---------------------------------------------------------------- Unit 12b
  {
    id: 'u12-shift-dec', unit: 12, book: '5C', strand: 'decimals', emoji: '↔️',
    title: 'Multiplying and dividing decimals by 10, 100, 1,000', shortTitle: 'Decimals ×÷ 10/100',
    explanation: {
      segments: [
        {
          text: 'The shifting rule you know still rules: × 10 slides every digit one column LEFT. 3.4 × 10 = 34. The digits do not change; they just move past the decimal point.',
          alt: 'The decimal point never moves — the DIGITS do. Multiplying by 10 promotes every digit to a column ten times bigger, so 3 ones and 4 tenths become 3 tens and 4 ones: 34.',
        },
        {
          text: '× 100 slides two columns, × 1,000 slides three. 0.42 × 100 = 42. Notice: no "adding zeros" trick here — 0.42 × 10 is 4.2, no zero in sight!',
          alt: 'Count the zeros in 10, 100 or 1,000 — that is how many columns the digits jump. The add-a-zero shortcut fails with decimals, but the column-jump rule never does.',
        },
        {
          text: 'Dividing slides the digits RIGHT: 36 ÷ 10 = 3.6, and 4.5 ÷ 10 = 0.45. Digits that fall past the ones column land in the decimal places.',
          alt: 'Division by 10 demotes every digit one column smaller. Whole numbers grow decimal tails: 36 becomes 3 ones and 6 tenths.',
        },
        {
          text: 'Use zeros as parking spaces when digits jump far: 7 ÷ 100 = 0.07. The 7 lands in the hundredths, and a zero holds the empty tenths place open.',
          alt: 'When a digit slides further than the columns it has, zeros fill the gap between the decimal point and the digit. 7 ÷ 100: the 7 travels two places right, so it needs one zero escort.',
        },
      ],
    },
    example: {
      steps: [
        'Work out 4.52 × 100.',
        'Two zeros in 100 → digits jump two columns left.',
        '4.52 → 45.2 → 452.',
        'Answer: <b>452</b>.',
      ],
    },
    faqs: [
      { q: 'Does the decimal point move, or the digits?', a: 'Officially the DIGITS move through the columns — that is the real place value story. Many people picture the point hopping instead, and the answer comes out the same. Just know what is really happening underneath.' },
      { q: 'Why does "add a zero" fail with decimals?', a: 'Try it: 3.4 × 10 with an added zero would be 3.40 — but that equals 3.4, nothing happened! The truth was always column-shifting; adding a zero only LOOKED right for whole numbers.' },
      { q: 'Where does this appear in real life?', a: 'Metric units! Converting metres to centimetres is × 100, kilograms to grams is × 1,000. Master the shifting rule and unit conversions become free.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const t = ri(rng, 11, 99);
        if (rng() < 0.5) {
          return num(`Work out ${dec1(t)} × 10`, t, {
            tier, hint: 'Digits jump one column left.',
            explain: `${dec1(t)} × 10 = ${t}.`,
          });
        }
        const n = ri(rng, 1, 9);
        return num(`Work out 0.${n} × 100`, n * 10, {
          tier, hint: 'Two columns left this time.',
          explain: `0.${n} → ${n} → ${n * 10}.`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const h = ri(rng, 101, 989);
          return num(`Work out ${dec2(h)} × 100`, h, {
            tier, hint: 'Two jumps left.',
            explain: `${dec2(h)} × 100 = ${h}.`,
          });
        }
        if (kind === 2) {
          const n = ri(rng, 11, 99);
          return num(`Work out ${n} ÷ 10`, dec1(n), {
            tier, allowDecimal: true, tolerance: 0.001,
            hint: 'Digits slide one column right.',
            explain: `${n} ÷ 10 = ${dec1(n)}.`,
          });
        }
        const t = ri(rng, 11, 89);
        return num(`Work out ${dec1(t)} ÷ 10`, dec2(t), {
          tier, allowDecimal: true, tolerance: 0.001,
          hint: 'Every digit slides one more column right.',
          explain: `${dec1(t)} ÷ 10 = ${dec2(t)}.`,
        });
      }
      const kind = ri(rng, 1, 3);
      if (kind === 1) {
        const h = ri(rng, 11, 99);
        return num(`Work out ${dec2(h)} × 1,000`, h * 10, {
          tier, hint: 'Three jumps left.',
          explain: `${dec2(h)} × 1,000 = ${h * 10}.`,
        });
      }
      if (kind === 2) {
        const n = ri(rng, 1, 9);
        return num(`Work out ${n} ÷ 100`, dec2(n), {
          tier, allowDecimal: true, tolerance: 0.001,
          hint: 'Two slides right — a zero parks in the empty tenths.',
          explain: `${n} ÷ 100 = ${dec2(n)}.`,
        });
      }
      const n = ri(rng, 12, 96);
      const f = pick(rng, [10, 100]);
      return mcFrom(rng, `${dec1(n)} × □ = ${f === 10 ? n : n * 10}. What is the missing number?`, f, [10, 100, 1000].filter((x) => x !== f).concat([f * 10]), {
        tier, hint: 'How many columns did the digits jump?',
        explain: `${dec1(n)} × ${f} = ${f === 10 ? n : n * 10}.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 13a
  {
    id: 'u13-angle-types', unit: 13, book: '5C', strand: 'geometry', emoji: '📐',
    title: 'Types of angles and measuring', shortTitle: 'Angle types',
    explanation: {
      segments: [
        {
          text: 'An <b>angle</b> measures an amount of TURN, in degrees (°). A full turn is 360°, a half turn is 180°, and a quarter turn — a <b>right angle</b> — is 90°.',
          alt: 'Imagine standing and spinning: all the way round is 360 degrees, facing backwards is 180, and a crisp corner-turn is 90 — the famous right angle, marked with a little square.',
        },
        {
          text: 'Angles have family names. <b>Acute</b>: less than 90° (small and cute). <b>Obtuse</b>: between 90° and 180°. <b>Reflex</b>: more than 180° — the bend-over-backwards angle.',
          alt: 'Sort any angle with two questions: smaller than a right angle? It is acute. Bigger than a right angle but less than a straight line? Obtuse. Past the straight line? Reflex.',
          svg: angleDiagram(60, { label: 'acute' }) + angleDiagram(130, { label: 'obtuse' }),
        },
        {
          text: 'A <b>protractor</b> measures angles. Place its centre spot on the angle\'s point, line the 0° line along one arm, and read where the other arm crosses the scale.',
          alt: 'Protractors have two scales, and picking the wrong one is the classic slip. Start from the 0 that lies on your angle\'s arm and follow that scale round. Sense-check with the angle type: an acute angle must read below 90.',
        },
        {
          text: 'ESTIMATE before you measure. Is it more or less than 90°? Close to 45°? An estimate catches wrong-scale mistakes instantly: if you estimated "about 60°" and read 120°, you used the wrong scale!',
          alt: 'Guessing first is professional, not lazy. Compare the angle to landmarks you know — 45 is half a right angle, 90 a corner, 180 a straight line — then measure and check you are close.',
        },
      ],
    },
    example: {
      steps: [
        'Classify a 137° angle.',
        'Is it less than 90°? No — so not acute.',
        'Is it between 90° and 180°? Yes.',
        'It is an <b>obtuse</b> angle.',
      ],
      svg: angleDiagram(137, { label: '137°' }),
    },
    faqs: [
      { q: 'How do I remember which is acute and which is obtuse?', a: '"A-cute little angle" — acute means small, under 90°. Obtuse is the wide, blunt one between 90° and 180°. And reflex bends past the straight line, more than 180°.' },
      { q: 'Why does a protractor have two scales?', a: 'So you can measure angles opening from either direction without flipping the protractor. Always start reading from the zero that sits on one of your angle\'s arms.' },
      { q: 'Is exactly 90° acute or obtuse?', a: 'Neither — exactly 90° is a right angle, its own category. Same for exactly 180°: that is a straight line, not an obtuse angle.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const type = pick(rng, ['acute', 'right angle', 'obtuse', 'reflex']);
          const deg = type === 'acute' ? ri(rng, 20, 75) : type === 'right angle' ? 90 : type === 'obtuse' ? ri(rng, 105, 165) : ri(rng, 200, 330);
          const options = ['acute', 'right angle', 'obtuse', 'reflex'];
          return mc('What TYPE of angle is shown?', options, options.indexOf(type), {
            tier, svg: angleDiagram(deg),
            hint: 'Compare it with 90° and 180°.',
            explain: `It measures ${deg}°, so it is ${type === 'right angle' ? 'a right angle' : type}.`,
          });
        }
        const facts = [
          ['An acute angle is smaller than 90°.', true, 'Acute means less than a right angle.'],
          ['A full turn is 360°.', true, 'All the way round is 360 degrees.'],
          ['An obtuse angle is smaller than a right angle.', false, 'Obtuse angles are BIGGER than 90° (but less than 180°).'],
          ['A straight line is 180°.', true, 'Half a full turn: 180°.'],
          ['A reflex angle is less than 180°.', false, 'Reflex angles are MORE than 180°.'],
        ];
        const [stmt, ans, why] = pick(rng, facts);
        return tf(`True or false: ${stmt}`, ans, { tier, hint: 'Think of the angle landmarks: 90, 180, 360.', explain: why });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const deg = pick(rng, [30, 45, 60, 120, 135, 150]);
          const wrongs = [deg + 90, Math.max(10, deg - 90), deg + 45].filter((w) => w !== deg && w > 0 && w < 360);
          return mcFrom(rng, 'Which is the best ESTIMATE of this angle?', `${deg}°`, wrongs.map((w) => `${w}°`), {
            tier, svg: angleDiagram(deg),
            hint: 'Compare with 45°, 90° and 180°.',
            explain: `It is ${deg < 90 ? 'less' : 'more'} than a right angle — about ${deg}°.`,
          });
        }
        const turns = [['a quarter turn', 90], ['a half turn', 180], ['a three-quarter turn', 270], ['a full turn', 360]];
        const [name, deg] = pick(rng, turns);
        return num(`How many degrees is ${name}?`, deg, {
          tier, hint: 'A full turn is 360°.',
          explain: `${name} = ${deg}°.`,
        });
      }
      if (rng() < 0.5) {
        const extra = ri(rng, 15, 75);
        return num(`An angle is ${extra}° MORE than a right angle. How many degrees is it?`, 90 + extra, {
          tier, hint: 'Start at 90° and add.',
          explain: `90 + ${extra} = ${90 + extra}°.`,
        });
      }
      const reflex = ri(rng, 195, 340);
      return num(`A reflex angle measures ${reflex}°. How many degrees complete the full turn?`, 360 - reflex, {
        tier, hint: 'The two angles together make 360°.',
        explain: `360 − ${reflex} = ${360 - reflex}°.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 13b
  {
    id: 'u13-missing-angles', unit: 13, book: '5C', strand: 'geometry', emoji: '🕵️',
    title: 'Calculating missing angles', shortTitle: 'Missing angles',
    explanation: {
      segments: [
        {
          text: 'Angles on a <b>straight line</b> add up to 180°. If two angles share a line and one is 110°, the other must be 180 − 110 = 70°. No protractor needed — just subtraction!',
          alt: 'A straight line is half a turn: 180 degrees, shared out between the angles sitting on it. Add the ones you know, subtract from 180, and the missing angle appears.',
        },
        {
          text: 'Angles around a <b>point</b> add up to 360° — a full turn. Three angles meet at a point; two are 150° and 90°. The third: 360 − 150 − 90 = 120°.',
          alt: 'All the angles wrapped around one point complete a full spin: 360 degrees. Total the known angles and find what is left of the 360.',
        },
        {
          text: 'Inside a <b>right angle</b>: parts add to 90°. And rectangles are angle machines: every corner is exactly 90°, which lets you deduce missing angles in diagrams built from rectangles.',
          alt: 'Right angles split into pieces that total 90. Spot the little square marking a right angle — it hands you a free fact to calculate with.',
        },
        {
          text: 'These are your first angle DETECTIVE rules. Write the fact (line = 180°, point = 360°), substitute what you know, subtract. Showing the calculation is the working-out teachers love.',
          alt: 'Missing-angle puzzles are all the same shape: know the total, subtract the known parts. The only skill is choosing the right total — line, point or right angle.',
        },
      ],
    },
    example: {
      steps: [
        'Two angles sit on a straight line. One is 74°. Find the other.',
        'Fact: angles on a straight line total 180°.',
        '180 − 74 = 106.',
        'The missing angle is <b>106°</b>.',
      ],
      svg: angleDiagram(106, { label: '?' }),
    },
    faqs: [
      { q: 'How do I know whether to use 180 or 360?', a: 'Look at what the angles sit on. Spread along a straight LINE: total 180°. Wrapped all the way around a POINT: total 360°. Tucked inside a right angle: total 90°.' },
      { q: 'Can there be more than two angles on a line?', a: 'Yes — three, four, any number! However many there are, they still share the same 180°. Add all the known ones, then subtract from 180.' },
      { q: 'Why is a rectangle\'s corner always 90°?', a: 'That is part of what MAKES it a rectangle — four right angles is the club rule. It is why rectangles are so useful: every corner hands you a guaranteed 90° to reason with.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const a = ri(rng, 35, 145);
        return num(`Two angles make a straight line. One is ${a}°. What is the other?`, 180 - a, {
          tier, svg: angleDiagram(180 - a, { label: '?' }),
          hint: 'Angles on a straight line total 180°.',
          explain: `180 − ${a} = ${180 - a}°.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const a = ri(rng, 15, 70);
          return num(`Two angles fit together to make a right angle. One is ${a}°. What is the other?`, 90 - a, {
            tier, hint: 'A right angle is 90°.',
            explain: `90 − ${a} = ${90 - a}°.`,
          });
        }
        const a = ri(rng, 100, 200), b = ri(rng, 60, Math.min(140, 350 - a));
        return num(`Three angles meet around a point. Two of them are ${a}° and ${b}°. What is the third?`, 360 - a - b, {
          tier, hint: 'Angles around a point total 360°.',
          explain: `360 − ${a} − ${b} = ${360 - a - b}°.`,
        });
      }
      if (rng() < 0.5) {
        const a = ri(rng, 30, 80), b = ri(rng, 30, Math.min(80, 170 - a));
        return num(`Three angles lie on a straight line: ${a}°, ${b}° and one more. Find the missing angle.`, 180 - a - b, {
          tier, hint: 'All three share the 180°.',
          explain: `180 − ${a} − ${b} = ${180 - a - b}°.`,
        });
      }
      const a = ri(rng, 20, 60);
      return num(`A rectangle's corner is split into two angles. One is ${a}°. What is the other?`, 90 - a, {
        tier, hint: 'Every rectangle corner is exactly 90°.',
        explain: `90 − ${a} = ${90 - a}°.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 14
  {
    id: 'u14-shapes', unit: 14, book: '5C', strand: 'geometry', emoji: '🔷',
    title: 'Shapes: 2D properties and 3D solids', shortTitle: '2D & 3D shapes',
    explanation: {
      segments: [
        {
          text: '<b>Parallel</b> lines run side by side forever and never meet, like train tracks — marked with little arrows. <b>Perpendicular</b> lines meet at a perfect right angle, like a wall and floor.',
          alt: 'Two vocabulary superstars: parallel means same direction, never meeting. Perpendicular means crossing at exactly 90 degrees. Railways are parallel; a plus sign is perpendicular.',
        },
        {
          text: 'A polygon is <b>regular</b> when ALL sides are equal AND all angles are equal. A square is a regular quadrilateral. A rectangle is NOT regular — equal angles, but not equal sides.',
          alt: 'Regular is a strict club: every side identical and every corner identical. A 50p coin\'s shape and a honeycomb hexagon qualify; a long thin rectangle does not.',
        },
        {
          text: 'Polygon names count the sides: pentagon 5, hexagon 6, heptagon 7, octagon 8. An octopus has 8 legs; an octagon has 8 sides!',
          alt: 'The Greek prefixes do the counting: penta five, hexa six, hepta seven, octa eight. Spot them in other words — pentathlon, octopus — and the shape names stick.',
        },
        {
          text: '3D solids have <b>faces</b> (flat surfaces), <b>edges</b> (where faces meet) and <b>vertices</b> (corners). A cube: 6 faces, 12 edges, 8 vertices. We often recognise 3D shapes from 2D drawings of them.',
          alt: 'Hold an imaginary dice: the stickers are faces (6), the fold lines are edges (12), the sharp corners are vertices (8). Learning one solid well makes the others easier to count.',
        },
      ],
    },
    example: {
      steps: [
        'Is a rectangle a regular polygon?',
        'Check the angles: all 90° — equal. ✓',
        'Check the sides: two long, two short — NOT all equal. ✗',
        'So a rectangle is <b>not regular</b>. (A square passes both checks!)',
      ],
    },
    faqs: [
      { q: 'What is the difference between an edge and a vertex?', a: 'An edge is a LINE where two faces meet — like the fold on a box. A vertex is a POINT where edges meet — the sharp corner. A cube has 12 edges but only 8 vertices.' },
      { q: 'Is a circle a polygon?', a: 'No — polygons are made of straight sides only. A circle is one perfectly curved line, so it belongs to a different family.' },
      { q: 'Why is a square "a special rectangle"?', a: 'A rectangle needs four right angles — a square has them, plus the bonus of equal sides. So every square is a rectangle, but only the equal-sided ones are squares. Maths families nest inside each other!' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const facts = [
          ['Parallel lines never meet.', true, 'They keep the same distance apart forever — like train tracks.'],
          ['Perpendicular lines meet at a right angle.', true, 'Perpendicular means crossing at exactly 90°.'],
          ['A square is a regular polygon.', true, 'All four sides equal and all four angles equal: fully regular.'],
          ['A rectangle is a regular polygon.', false, 'Its angles are equal but its sides are not all equal.'],
          ['Parallel lines always meet at 90°.', false, 'Parallel lines never meet at all!'],
        ];
        const [stmt, ans, why] = pick(rng, facts);
        if (rng() < 0.6) return tf(`True or false: ${stmt}`, ans, { tier, hint: 'Check the exact definition.', explain: why });
        const q = pick(rng, [
          ['Lines that meet at a right angle are called…', ['perpendicular', 'parallel', 'horizontal', 'diagonal'], 0, 'Perpendicular = meeting at 90°.'],
          ['Lines that never meet are called…', ['parallel', 'perpendicular', 'vertical', 'curved'], 0, 'Parallel lines keep the same gap forever.'],
        ]);
        return mc(q[0], q[1], q[2], { tier, hint: 'Train tracks or plus sign?', explain: q[3] });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const polys = [['pentagon', 5], ['hexagon', 6], ['heptagon', 7], ['octagon', 8], ['quadrilateral', 4]];
          const [nm, sides] = pick(rng, polys);
          return num(`How many sides does a ${nm} have?`, sides, {
            tier, hint: 'The start of the word counts for you: penta, hexa, hepta, octa…',
            explain: `A ${nm} has ${sides} sides.`,
          });
        }
        const qs = [
          ['How many faces does a cube have?', 6, 'Count a dice: top, bottom and four around = 6 faces.'],
          ['How many vertices does a cube have?', 8, 'Four corners on top, four on the bottom: 8.'],
          ['How many edges does a cube have?', 12, 'Four on top, four on the bottom, four uprights: 12.'],
          ['How many faces does a cuboid have?', 6, 'Same as a cube — 6 faces, just not all square.'],
        ];
        const [prompt, ans, why] = pick(rng, qs);
        return num(prompt, ans, { tier, hint: 'Picture a dice or a cereal box.', explain: why });
      }
      const qs = [
        ['Which 3D shape has 6 identical square faces?', ['cube', 'cuboid', 'square-based pyramid', 'triangular prism'], 0, 'Only the cube has all-square faces.'],
        ['A shape has 4 equal sides but NO right angles. What is it?', ['rhombus', 'square', 'rectangle', 'trapezium'], 0, 'Equal sides without right angles makes a rhombus — a pushed-over square.'],
        ['Which shape is a REGULAR polygon?', ['equilateral triangle', 'rectangle', 'right-angled triangle', 'oval'], 0, 'All sides and angles equal: the equilateral triangle qualifies.'],
        ['How many faces does a triangular prism have?', ['5', '4', '6', '3'], 0, 'Two triangle ends + three rectangles around = 5 faces.'],
        ['A square-based pyramid has how many vertices?', ['5', '4', '6', '8'], 0, 'Four base corners + one apex = 5 vertices.'],
      ];
      const [prompt, options, ansIdx, why] = pick(rng, qs);
      return mc(prompt, options, ansIdx, { tier, hint: 'Picture the shape — or sketch it!', explain: why });
    },
  },

  // ---------------------------------------------------------------- Unit 15
  {
    id: 'u15-position', unit: 15, book: '5C', strand: 'geometry', emoji: '🧭',
    title: 'Reflection and translation', shortTitle: 'Reflection & translation',
    explanation: {
      segments: [
        {
          text: 'Coordinates pinpoint positions on a grid: (3, 2) means 3 ALONG, then 2 UP. Along the corridor first, then up the stairs — x before y, always.',
          alt: 'The first number is the x-coordinate (how far right), the second the y-coordinate (how far up). Swap them and you land somewhere else entirely, so the order matters.',
          svg: coordGrid(6, [[3, 2, 'A']]),
        },
        {
          text: '<b>Translation</b> slides a shape without turning it: every point moves the same distance in the same direction. "Right 3, up 2" turns (1, 1) into (4, 3).',
          alt: 'Translating is sliding a sticker across the page — no spinning, no flipping. Add to the x for right, add to the y for up. Every corner of the shape makes the identical move.',
        },
        {
          text: '<b>Reflection</b> flips a shape over a mirror line. Each point jumps to the other side, the SAME distance from the mirror. A point 2 squares left of the line lands 2 squares right of it.',
          alt: 'Imagine folding the paper along the mirror line — where would the point print through? Reflections reverse left-and-right (for a vertical mirror) but keep every distance the same.',
          svg: coordGrid(6, [[1, 3, 'P'], [5, 3, "P'"]], { vline: 3 }),
        },
        {
          text: 'Golden rule: after a translation OR a reflection, the shape itself is unchanged — same size, same side lengths, same angles. Only its position (and maybe its facing) is new.',
          alt: 'Sliding and flipping never stretch or shrink. If the moved shape looks a different size, something went wrong. Check each vertex one at a time.',
        },
      ],
    },
    example: {
      steps: [
        'Translate the point (2, 5) right 3 and down 2.',
        'Right 3: x becomes 2 + 3 = 5.',
        'Down 2: y becomes 5 − 2 = 3.',
        'New position: <b>(5, 3)</b>.',
      ],
    },
    faqs: [
      { q: 'How do I remember which number comes first?', a: '"Along the corridor, then up the stairs" — x (along) before y (up). Some remember "x is a-cross": the letter x is a cross!' },
      { q: 'What changes in a reflection and what stays the same?', a: 'Position flips to the other side of the mirror and left-right swaps (like your reflection waving with the "wrong" hand). Size, lengths and angles stay exactly the same.' },
      { q: 'Is a translation the same as a reflection?', a: 'No — a translation SLIDES (the shape still faces the same way), a reflection FLIPS (the shape becomes its mirror twin). Both keep the shape the same size.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const x = ri(rng, 1, 5), y = ri(rng, 1, 5);
        const correct = `(${x}, ${y})`;
        const opts = shuffle(rng, [correct, `(${y}, ${x})`, `(${x + 1}, ${y})`, `(${x}, ${y + 1})`]);
        const uniq = [...new Set(opts)];
        if (uniq.length < 4) return this.gen(rng, tier);
        return mc('What are the coordinates of point A?', uniq, uniq.indexOf(correct), {
          tier, svg: coordGrid(6, [[x, y, 'A']]),
          hint: 'Along the corridor first, then up the stairs.',
          explain: `${x} along, ${y} up: (${x}, ${y}).`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const x = ri(rng, 0, 3), y = ri(rng, 0, 3);
          const dx = ri(rng, 1, 3), dy = ri(rng, 1, 3);
          const correct = `(${x + dx}, ${y + dy})`;
          const opts = shuffle(rng, [correct, `(${x + dy}, ${y + dx})`, `(${x - dx < 0 ? x : x - dx}, ${y + dy})`, `(${x + dx}, ${y - dy < 0 ? y : y - dy})`]);
          const uniq = [...new Set(opts)];
          if (uniq.length < 3) return this.gen(rng, tier);
          return mc(`The point (${x}, ${y}) is translated RIGHT ${dx} and UP ${dy}. Where does it land?`, uniq, uniq.indexOf(correct), {
            tier, svg: coordGrid(7, [[x, y, 'start']]),
            hint: 'Right changes x; up changes y.',
            explain: `x: ${x} + ${dx} = ${x + dx}; y: ${y} + ${dy} = ${y + dy}.`,
          });
        }
        const mirror = ri(rng, 2, 4);
        const dist = ri(rng, 1, Math.min(2, mirror));
        const x = mirror - dist, y = ri(rng, 1, 5);
        const rx = mirror + dist;
        const correct = `(${rx}, ${y})`;
        const opts = shuffle(rng, [correct, `(${x}, ${y})`, `(${rx + 1}, ${y})`, `(${rx}, ${y + 1})`]);
        const uniq = [...new Set(opts)];
        if (uniq.length < 4) return this.gen(rng, tier);
        return mc(`Point P is reflected in the dashed mirror line. Where does its image land?`, uniq, uniq.indexOf(correct), {
          tier, svg: coordGrid(6, [[x, y, 'P']], { vline: mirror }),
          hint: 'Same distance from the mirror, other side.',
          explain: `P is ${dist} square${dist > 1 ? 's' : ''} left of the line, so its image is ${dist} right: (${rx}, ${y}).`,
        });
      }
      const x1 = ri(rng, 1, 3), y1 = ri(rng, 3, 5);
      const dx = ri(rng, 1, 3), dy = ri(rng, 1, 2);
      const moves = [`right ${dx}, down ${dy}`, `left ${dx}, down ${dy}`, `right ${dx}, up ${dy}`, `down ${dx}, right ${dy}`];
      return mc(`A point moves from (${x1}, ${y1}) to (${x1 + dx}, ${y1 - dy}). Which translation is that?`, moves, 0, {
        tier, svg: coordGrid(7, [[x1, y1, 'start'], [x1 + dx, y1 - dy, 'end']]),
        hint: 'Compare the x-values, then the y-values.',
        explain: `x grew by ${dx} (right ${dx}); y fell by ${dy} (down ${dy}).`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 16a
  {
    id: 'u16-metric', unit: 16, book: '5C', strand: 'measure', emoji: '⚖️',
    title: 'Converting metric units', shortTitle: 'Metric units',
    explanation: {
      segments: [
        {
          text: 'The metric system is built on 10s, 100s and 1,000s — so converting is just your shifting rule! <b>Kilo</b> means 1,000: 1 km = 1,000 m, 1 kg = 1,000 g.',
          alt: 'Kilo is Greek for a thousand. A kilometre is a thousand metres; a kilogram a thousand grams. Spot the prefix and you instantly know the conversion number.',
        },
        {
          text: '<b>Centi</b> means a hundredth and <b>milli</b> a thousandth: 1 m = 100 cm = 1,000 mm, and 1 litre = 1,000 ml. A centimetre is a hundredth of a metre — like a cent is a hundredth of a euro.',
          alt: 'Centi hides in "century" (100 years) and milli in "millennium" (1,000 years). One metre holds 100 centimetres; one litre holds 1,000 millilitres.',
        },
        {
          text: 'BIG unit → small unit: MULTIPLY. 3.5 km = 3.5 × 1,000 = 3,500 m. Small unit → big unit: DIVIDE. 250 cm = 250 ÷ 100 = 2.5 m.',
          alt: 'Going to smaller units, you need more of them — multiply. Going to bigger units, you need fewer — divide. Ask "should my number get bigger or smaller?" before you shift.',
        },
        {
          text: 'To compare or add measurements, convert them to the SAME unit first. Which is longer, 0.4 km or 350 m? Convert: 0.4 km = 400 m. Now it is obvious: 400 m wins.',
          alt: 'Never compare kilometres with metres directly — put both measurements in one unit, then compare or add as normal numbers.',
        },
      ],
    },
    example: {
      steps: [
        'Convert 1,250 ml into litres.',
        'ml → l is small → big: divide by 1,000.',
        '1,250 ÷ 1,000 = 1.25.',
        'Answer: <b>1.25 litres</b>.',
      ],
    },
    faqs: [
      { q: 'How do I remember multiply or divide?', a: 'Think about the answer before converting: 3 km in metres must be a BIG number (multiply); 3,000 g in kilograms must be small (divide). If your answer feels the wrong size, you shifted the wrong way.' },
      { q: 'What do kilo, centi and milli actually mean?', a: 'They are number prefixes: kilo = 1,000, centi = 1/100, milli = 1/1000. They work on any base unit — metres, grams, litres — which is why the metric system is so tidy.' },
      { q: 'Why do we need different units at all?', a: 'To keep numbers friendly. Your journey to school is nicer as 1.2 km than 120,000 cm; a medicine dose is clearer as 5 ml than 0.005 litres. Pick the unit that fits the size of the thing.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const convs = [
          ['km', 'm', 1000], ['m', 'cm', 100], ['cm', 'mm', 10], ['kg', 'g', 1000], ['l', 'ml', 1000],
        ];
        const [from, to, f] = pick(rng, convs);
        const v = ri(rng, 2, 9);
        return num(`Convert ${v} ${from} into ${to}.`, v * f, {
          tier, unit: to, hint: `1 ${from} = ${fmt(f)} ${to}.`,
          explain: `${v} × ${fmt(f)} = ${fmt(v * f)} ${to}.`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 2);
        if (kind === 1) {
          const convs = [['kg', 'g', 1000], ['l', 'ml', 1000], ['km', 'm', 1000], ['m', 'cm', 100]];
          const [from, to, f] = pick(rng, convs);
          const tenths = ri(rng, 11, 89);
          return num(`Convert ${dec1(tenths)} ${from} into ${to}.`, dec1(tenths) * f, {
            tier, unit: to, hint: `Multiply by ${fmt(f)} — shift the digits.`,
            explain: `${dec1(tenths)} × ${fmt(f)} = ${fmt(dec1(tenths) * f)} ${to}.`,
          });
        }
        const convs = [['cm', 'm', 100], ['ml', 'l', 1000], ['m', 'km', 1000], ['g', 'kg', 1000]];
        const [from, to, f] = pick(rng, convs);
        const big = ri(rng, 2, 9) * f + pick(rng, [f / 2, f / 4, (f / 10) * 3]);
        return num(`Convert ${fmt(big)} ${from} into ${to}.`, big / f, {
          tier, unit: to, allowDecimal: true, tolerance: 0.001,
          hint: `Divide by ${fmt(f)} this time — small unit to big unit.`,
          explain: `${fmt(big)} ÷ ${fmt(f)} = ${big / f} ${to}.`,
        });
      }
      const kind = ri(rng, 1, 2);
      if (kind === 1) {
        const mA = ri(rng, 3, 8) * 100 + 50;
        const kmB = dec1(ri(rng, 3, 8));
        const bigger = mA > kmB * 1000 ? 0 : 1;
        return mc('Which distance is LONGER?', [`${mA} m`, `${kmB} km`], bigger, {
          tier, hint: 'Convert both to metres first.',
          explain: `${kmB} km = ${fmt(kmB * 1000)} m — compare with ${mA} m.`,
        });
      }
      return scenario(rng, 'u16-metric:t3-mixed-units', [
        (rng) => {
          const flourTenths = ri(rng, 11, 29);
          const sugarG = ri(rng, 3, 9) * 100;
          return num(`A baker uses ${dec1(flourTenths)} kg of flour and ${sugarG} g of sugar. How many GRAMS is that altogether?`, dec1(flourTenths) * 1000 + sugarG, {
            tier, unit: 'g', hint: 'Convert the kilograms into grams first.',
            explain: `${dec1(flourTenths)} kg = ${fmt(dec1(flourTenths) * 1000)} g; plus ${sugarG} g = ${fmt(dec1(flourTenths) * 1000 + sugarG)} g.`,
          });
        },
        (rng) => {
          const kgTenths = ri(rng, 12, 48);
          const boxG = ri(rng, 2, 8) * 50;
          return num(`A parcel weighs ${dec1(kgTenths)} kg, and its box weighs ${boxG} g. How many GRAMS do they weigh together?`, dec1(kgTenths) * 1000 + boxG, {
            tier, unit: 'g', hint: 'Different units! Make everything grams before adding.',
            explain: `${dec1(kgTenths)} kg = ${fmt(dec1(kgTenths) * 1000)} g; plus ${boxG} g = ${fmt(dec1(kgTenths) * 1000 + boxG)} g.`,
          });
        },
        (rng) => {
          const kmTenths = ri(rng, 12, 38);
          const extraM = ri(rng, 2, 9) * 50;
          return num(`${pick(rng, NAMES)} walks ${dec1(kmTenths)} km to the shop and another ${extraM} m to the park. How many METRES is that altogether?`, dec1(kmTenths) * 1000 + extraM, {
            tier, unit: 'm', hint: 'Turn the kilometres into metres, then add.',
            explain: `${dec1(kmTenths)} km = ${fmt(dec1(kmTenths) * 1000)} m; plus ${extraM} m = ${fmt(dec1(kmTenths) * 1000 + extraM)} m.`,
          });
        },
        (rng) => {
          const lTenths = ri(rng, 12, 30);
          const drinkMl = ri(rng, 2, 8) * 100;
          return num(`A bottle holds ${dec1(lTenths)} litres of water. ${pick(rng, NAMES)} drinks ${drinkMl} ml. How many MILLILITRES are left?`, dec1(lTenths) * 1000 - drinkMl, {
            tier, unit: 'ml', hint: 'Convert litres to millilitres first — then this is a subtraction.',
            explain: `${dec1(lTenths)} litres = ${fmt(dec1(lTenths) * 1000)} ml; minus ${drinkMl} ml = ${fmt(dec1(lTenths) * 1000 - drinkMl)} ml.`,
          });
        },
      ]);
    },
  },

  // ---------------------------------------------------------------- Unit 16b
  {
    id: 'u16-imperial-time', unit: 16, book: '5C', strand: 'measure', emoji: '⏰',
    title: 'Imperial units and time', shortTitle: 'Imperial & time',
    explanation: {
      segments: [
        {
          text: 'Britain still uses some old <b>imperial</b> units. The handy approximations: 1 inch ≈ 2.5 cm, 1 foot = 12 inches, 1 mile ≈ 1.6 km, 1 pound (lb) ≈ 450 g, 1 pint ≈ 570 ml.',
          alt: 'Imperial units pop up on road signs (miles), height (feet and inches) and milk (pints). You only need the rough conversions — the ≈ sign means "approximately".',
        },
        {
          text: 'Convert with the same multiply/divide logic: 4 inches ≈ 4 × 2.5 = 10 cm. 5 miles ≈ 5 × 1.6 = 8 km. Road signs in miles secretly tell you kilometres!',
          alt: 'Treat the conversion fact like a recipe: each inch is worth 2.5 cm, so four inches is four servings of 2.5. Multiply for many, divide to go back.',
        },
        {
          text: 'Time has its own conversion facts — NOT tens! 1 minute = 60 seconds, 1 hour = 60 minutes, 1 day = 24 hours, 1 week = 7 days, 1 year = 12 months = 365 days.',
          alt: 'Time is the rebel: sixties and twenty-fours instead of tens. That is why 1.5 hours is 90 minutes, not 150! Always convert with 60s and 24s.',
        },
        {
          text: 'Mixed time units: 2 hours 25 minutes = 2 × 60 + 25 = 145 minutes. Going back: 200 seconds = 180 + 20 = 3 minutes 20 seconds.',
          alt: 'To flatten hours-and-minutes into minutes, turn the hours into minutes first and add the leftover. To go back, pull out as many whole 60s as you can.',
        },
      ],
    },
    example: {
      steps: [
        'A film lasts 1 hour 48 minutes. How many minutes is that?',
        '1 hour = 60 minutes.',
        '60 + 48 = 108.',
        'The film lasts <b>108 minutes</b>.',
      ],
    },
    faqs: [
      { q: 'Why does the UK mix metric and imperial?', a: 'History! Britain switched to metric for most things, but road signs, pints of milk and people\'s heights kept the old units. So it pays to speak both languages.' },
      { q: 'Why is 1.5 hours not 150 minutes?', a: 'Because an hour has 60 minutes, not 100. Half an hour is 30 minutes, so 1.5 hours = 60 + 30 = 90 minutes. Time refuses to be decimal!' },
      { q: 'Do I need exact imperial conversions?', a: 'No — Year 5 uses the friendly approximations (1 inch ≈ 2.5 cm, 1 mile ≈ 1.6 km). The wavy equals sign ≈ says "roughly". Exact values exist but are not needed yet.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        if (rng() < 0.5) {
          const inches = pick(rng, [2, 4, 6, 8, 10]);
          return num(`1 inch ≈ 2.5 cm. About how many cm is ${inches} inches?`, inches * 2.5, {
            tier, unit: 'cm', allowDecimal: true, tolerance: 0.001,
            hint: `${inches} lots of 2.5.`,
            explain: `${inches} × 2.5 = ${inches * 2.5} cm.`,
          });
        }
        const feet = ri(rng, 2, 6);
        return num(`1 foot = 12 inches. How many inches is ${feet} feet?`, feet * 12, {
          tier, unit: 'inches', hint: 'Multiply by 12.',
          explain: `${feet} × 12 = ${feet * 12} inches.`,
        });
      }
      if (tier === 2) {
        const kind = ri(rng, 1, 3);
        if (kind === 1) {
          const miles = pick(rng, [5, 10, 15, 20, 25, 30]);
          return num(`1 mile ≈ 1.6 km. About how many km is ${miles} miles?`, miles * 1.6, {
            tier, unit: 'km', allowDecimal: true, tolerance: 0.01,
            hint: `${miles} × 1.6 — try (${miles} × 16) ÷ 10.`,
            explain: `${miles} × 1.6 = ${miles * 1.6} km.`,
          });
        }
        if (kind === 2) {
          const mins = ri(rng, 2, 9);
          return num(`How many seconds are in ${mins} minutes?`, mins * 60, {
            tier, unit: 's', hint: '1 minute = 60 seconds.',
            explain: `${mins} × 60 = ${mins * 60} seconds.`,
          });
        }
        const hrs = ri(rng, 2, 5);
        return num(`How many minutes are in ${hrs} hours?`, hrs * 60, {
          tier, unit: 'min', hint: '1 hour = 60 minutes.',
          explain: `${hrs} × 60 = ${hrs * 60} minutes.`,
        });
      }
      const kind = ri(rng, 1, 3);
      if (kind === 1) {
        const h = ri(rng, 1, 3), m = ri(rng, 5, 55);
        return num(`A journey takes ${h} hour${h > 1 ? 's' : ''} ${m} minutes. How many MINUTES is that?`, h * 60 + m, {
          tier, unit: 'min', hint: 'Hours × 60, then add the extra minutes.',
          explain: `${h} × 60 = ${h * 60}; + ${m} = ${h * 60 + m} minutes.`,
        });
      }
      if (kind === 2) {
        const days = ri(rng, 2, 5);
        return num(`How many hours are in ${days} days?`, days * 24, {
          tier, unit: 'h', hint: '1 day = 24 hours.',
          explain: `${days} × 24 = ${days * 24} hours.`,
        });
      }
      const s = pick(rng, [130, 150, 200, 250, 320, 400]);
      const m = Math.floor(s / 60), rem = s % 60;
      const correct = `${m} min ${rem} s`;
      const opts = shuffle(rng, [correct, `${m} min ${rem + 10} s`, `${m + 1} min ${rem} s`, `${m} min ${Math.max(0, rem - 15)} s`]);
      const uniq = [...new Set(opts)];
      if (uniq.length < 4) return this.gen(rng, tier);
      return mc(`Write ${s} seconds in minutes and seconds.`, uniq, uniq.indexOf(correct), {
        tier, hint: 'Pull out whole 60s first.',
        explain: `${s} = ${m} × 60 + ${rem}: ${correct}.`,
      });
    },
  },

  // ---------------------------------------------------------------- Unit 17
  {
    id: 'u17-volume', unit: 17, book: '5C', strand: 'measure', emoji: '🧊',
    title: 'Volume and capacity', shortTitle: 'Volume & capacity',
    explanation: {
      segments: [
        {
          text: '<b>Volume</b> is the amount of 3D space something takes up. We measure it in cubic centimetres (cm³) — each one a little cube, 1 cm on every side.',
          alt: 'Area counted flat squares; volume counts solid CUBES. A shape\'s volume is how many 1 cm sugar-cube-sized blocks would build it.',
        },
        {
          text: 'For a cuboid built of cubes: count one LAYER, then multiply by the number of layers. A layer of 4 × 2 = 8 cubes, stacked 3 high: 8 × 3 = 24 cm³.',
          alt: 'Build the bottom floor first — length times width tells you how many cubes it holds. Then every extra storey repeats that floor. Floors × cubes-per-floor = volume.',
        },
        {
          text: 'That gives the formula: volume of a cuboid = length × width × height. It works in any order — 4 × 2 × 3 = 24 whichever way you multiply.',
          alt: 'Three dimensions, three numbers, one multiplication. Pick the easiest order: 4 × 2 = 8, then × 3 = 24 cubic centimetres.',
        },
        {
          text: '<b>Capacity</b> is how much a container HOLDS, measured in litres and millilitres. A teaspoon holds about 5 ml, a mug about 300 ml, a big water bottle 1 litre, a bath around 80 litres.',
          alt: 'Capacity is liquid volume. Anchor some real sizes in your head — 5 ml teaspoon, 300 ml mug, 1 l bottle — and you can estimate almost any container.',
        },
      ],
    },
    example: {
      steps: [
        'A box is 5 cm long, 3 cm wide and 4 cm tall. Find its volume.',
        'Bottom layer: 5 × 3 = 15 cubes.',
        '4 layers: 15 × 4 = 60.',
        'Volume: <b>60 cm³</b>.',
      ],
    },
    faqs: [
      { q: 'What is the difference between volume and capacity?', a: 'Volume is the space an OBJECT takes up (a brick has volume). Capacity is the space a CONTAINER can hold inside (a jug has capacity). A solid glass cube has volume but no capacity!' },
      { q: 'Why cm³ with a little 3?', a: 'Because three lengths multiply together: length × width × height. The ³ records those three dimensions — just like cm² recorded two for area.' },
      { q: 'Is 1 litre connected to cm³?', a: 'Beautifully: 1 ml is exactly 1 cm³, so 1 litre = 1,000 cm³ — a cube 10 × 10 × 10. Litres and cubic centimetres are the same idea in different clothes.' },
    ],
    gen(rng, tier) {
      if (tier === 1) {
        const l = ri(rng, 2, 5), w = ri(rng, 2, 4), h = ri(rng, 2, 4);
        return num(`A cuboid is built from centimetre cubes: ${l} cubes long, ${w} wide and ${h} tall. How many cubes is that?`, l * w * h, {
          tier, unit: 'cm³', hint: 'Count one layer, then multiply by the layers.',
          explain: `Layer: ${l} × ${w} = ${l * w}; × ${h} layers = ${l * w * h} cm³.`,
        });
      }
      if (tier === 2) {
        if (rng() < 0.5) {
          const l = ri(rng, 3, 9), w = ri(rng, 2, 6), h = ri(rng, 2, 6);
          return num(`A box measures ${l} cm × ${w} cm × ${h} cm. What is its volume?`, l * w * h, {
            tier, unit: 'cm³', hint: 'Length × width × height.',
            explain: `${l} × ${w} = ${l * w}, × ${h} = ${l * w * h} cm³.`,
          });
        }
        const lA = ri(rng, 11, 29);
        const mlB = lA * 100 + pick(rng, [-150, 150, 250, -250]);
        const bigger = lA * 100 > mlB ? 0 : 1;
        return mc('Which container holds MORE?', [`${dec1(lA)} litres`, `${fmt(mlB)} ml`], bigger, {
          tier, hint: 'Convert litres to ml first.',
          explain: `${dec1(lA)} l = ${fmt(lA * 100)} ml — compare with ${fmt(mlB)} ml.`,
        });
      }
      const kind = ri(rng, 1, 3);
      if (kind === 1) {
        const w = ri(rng, 2, 5), h = ri(rng, 2, 5);
        const vol = w * h * ri(rng, 3, 8);
        return num(`A cuboid has volume ${vol} cm³. Its base is ${w} cm × ${h} cm. How TALL is it?`, vol / (w * h), {
          tier, unit: 'cm', hint: 'Volume ÷ (length × width).',
          explain: `Base layer holds ${w * h} cubes; ${vol} ÷ ${w * h} = ${vol / (w * h)} cm tall.`,
        });
      }
      if (kind === 2) {
        const ests = [
          ['a teaspoon of medicine', '5 ml', ['5 ml', '5 litres', '50 ml', '500 ml'], 'A teaspoon holds about 5 ml.'],
          ['a mug of hot chocolate', '300 ml', ['300 ml', '3 ml', '3 litres', '30 litres'], 'A mug holds about 300 ml.'],
          ['a full bath', '80 litres', ['80 litres', '8 litres', '800 ml', '8,000 litres'], 'A bath holds roughly 80 litres.'],
          ['a large water bottle', '1 litre', ['1 litre', '10 ml', '10 litres', '100 litres'], 'A big bottle holds about 1 litre.'],
        ];
        const [thing, correct, options, why] = pick(rng, ests);
        const opts = shuffle(rng, options.slice());
        return mc(`Which is the best estimate of the capacity of ${thing}?`, opts, opts.indexOf(correct), {
          tier, hint: 'Anchor: teaspoon 5 ml, mug 300 ml, bottle 1 l.',
          explain: why,
        });
      }
      const l1 = ri(rng, 3, 6), w1 = ri(rng, 2, 5), h1 = ri(rng, 2, 5);
      const l2 = l1 + pick(rng, [-1, 1]), w2 = w1 + pick(rng, [-1, 1]), h2 = h1 + pick(rng, [1, 2]);
      const v1 = l1 * w1 * h1, v2 = l2 * w2 * h2;
      if (v1 === v2) return this.gen(rng, tier);
      return mc('Which box has the LARGER volume?', [`${l1} × ${w1} × ${h1} cm`, `${l2} × ${w2} × ${h2} cm`], v1 > v2 ? 0 : 1, {
        tier, hint: 'Work out both volumes before deciding.',
        explain: `${v1} cm³ against ${v2} cm³.`,
      });
    },
  },
];
